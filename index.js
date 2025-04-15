// Load env vars FIRST
const dotenv = require('dotenv');
dotenv.config();

// Standard Requires
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const logger = require('./lib/logger');
const { connectRabbit } = require('./lib/rabbit');

const app = express();
const PORT = process.env.PORT || 3012;

// Async RabbitMQ connection
connectRabbit().catch(err =>
  logger.error({ err }, "Initial RabbitMQ connection failed")
);

// --- Import Routes ---
const chatRoutes = require('./routes/chatRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const blogPosts = require('./routes/blogPosts');
const fileRoutes = require('./routes/fileRoutes');
const categoryRoutes = require('./routes/categories');
const stripeRoutes = require('./routes/stripe'); // /stripe routes (not webhook)
const stripeWebhookHandler = require('./routes/stripeWebhook'); // Webhook handler (raw body)

// --- Global Middleware (ORDER MATTERS) ---
// 1. Logging
app.use(morgan('dev'));

// 2. Stripe Webhook Routes (MUST be before body parser) - Handle multiple possible paths
// Using '*/*' type to capture all content types that Stripe might send
app.post('/webhook/stripe', express.raw({ type: '*/*' }), stripeWebhookHandler);
app.post('/webhook', express.raw({ type: '*/*' }), stripeWebhookHandler);  // Backup/alternative path
logger.info('Stripe webhook routes configured at POST /webhook/stripe and POST /webhook');

// 3. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:4321');
  logger.info({ addedDevOrigin: 'http://localhost:4321' }, '[CORS] Added dev origin');
}

const corsOptionsDelegate = function (req, callback) {
  const requestOrigin = req.header('Origin');
  const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
  const corsOptions = {
    origin: isAllowed ? true : false,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
    maxAge: 86400
  };
  logger.debug({ origin: requestOrigin, allowed: isAllowed }, `[CORS] Decision`);
  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));

// 4. Body Parsing (AFTER webhook)
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
logger.info('Mounting API routes...');
app.use('/chat', chatRoutes);
app.use('/contact', contactRoutes);
app.use('/categories', categoryRoutes);
app.use('/files', fileRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/blogposts', blogPosts);
app.use('/stripe', stripeRoutes); // create-payment-intent, etc.
logger.info('Stripe routes mounted under /stripe');

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// --- 404 + Global Error Handling ---
app.use((req, res) => {
  logger.warn({ method: req.method, url: req.originalUrl }, "Route not found");
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  logger.error({ err, url: req.originalUrl }, 'Unhandled Exception');
  const errorResponse = { message: err.message || 'Something went wrong!' };
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  res.status(err.status || 500).json(errorResponse);
});

// --- Start Server ---
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
