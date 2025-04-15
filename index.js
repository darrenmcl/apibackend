// /var/projects/backend-api/index.js

// Load env vars FIRST
const dotenv = require('dotenv');
dotenv.config();

// Standard Requires
const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // For HTTP request logging
const cookieParser = require('cookie-parser');
const logger = require('./lib/logger'); // Use Pino logger
const { connectRabbit } = require('./lib/rabbit'); // Import connectRabbit

// Initialize RabbitMQ Connection asynchronously (doesn't block startup)
connectRabbit().catch(err => logger.error({ err }, "Initial RabbitMQ connection failed"));

// --- Import Routers ---
const chatRoutes = require('./routes/chatRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const blogPosts = require('./routes/blogPosts');
const fileRoutes = require('./routes/fileRoutes');
const categoryRoutes = require('./routes/categories');
const stripeWebhookHandler = require('./routes/stripeWebhook'); // Create this new file
const stripeRoutes = require('./routes/stripe'); // Keep regular Stripe routes

// const logRoutes = require('./routes/log.js'); // Removed, use Pino logger

const app = express();
const PORT = process.env.PORT || 3012;

// --- Global Middleware (Order is Crucial!) ---

// 1. HTTP Request Logging (Morgan - runs first)
// Consider replacing with pino-http for fully structured JSON logs if desired
app.use(morgan('dev'));

// 2. Stripe Webhook Route - MUST come BEFORE express.json()
// Use express.raw() to get the raw body buffer for Stripe signature verification
// Mount directly, assumes stripeRoutes handles the POST '/' path for this specific mount

app.post('/webhook/stripe', 
  express.raw({ type: 'application/json', limit: '10mb' }), 
  (req, res, next) => {
    // Simple debug logging to see if the body is making it as a Buffer
    logger.debug({
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyLength: req.body ? req.body.length : 0,
      hasSignature: !!req.headers['stripe-signature']
    }, "Webhook request pre-processing");
    next();
  },
  stripeWebhookHandler
);
logger.info('Stripe webhook route configured with raw body parser at POST /webhook/stripe');

// 3. CORS Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:4321'); // Astro default dev port
    logger.info({ addedDevOrigin: 'http://localhost:4321'}, '[CORS] Added development origin');
}
logger.info({ allowedOrigins }, '[CORS] Allowed origins configured.');

const corsOptionsDelegate = function (req, callback) {
    const requestOrigin = req.header('Origin');
    // Allow requests with no origin OR if origin is in the allowed list
    const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
    const corsOptions = {
        origin: isAllowed ? true : false, // Allow reflection or block
        credentials: true, // Allow cookies/auth headers
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
        maxAge: 86400 // Cache preflight for 1 day
    };
    logger.debug({ origin: requestOrigin, allowed: isAllowed }, `[CORS] Decision processed`);
    callback(null, corsOptions);
};

app.post('/webhook/stripe', express.raw({type: 'application/json'}), stripeWebhookHandler);

app.use(cors(corsOptionsDelegate));

// 4. Cookie Parser (Needed before routes using auth middleware)
app.use(cookieParser());

// 5. Standard JSON & URL-Encoded Body Parsers (AFTER raw webhook)
app.use(express.json());
app.post('/webhook/stripe', express.raw({type: 'application/json'}), stripeWebhookHandler);

// --- API Routes ---
// Mount routes WITHOUT the /api prefix
logger.info('Mounting API routes...');
app.use('/chat', chatRoutes);
app.use('/contact', contactRoutes);
// app.use('/log', logRoutes); // Consider removing, use Pino
app.use('/categories', categoryRoutes);
app.use('/files', fileRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/blogposts', blogPosts);

// Mount OTHER (non-webhook) Stripe routes under /stripe prefix
// The handlers inside stripe.js should use relative paths (e.g., '/create-payment-intent')
app.use('/stripe', stripeRoutes);
logger.info('Other Stripe routes (like create-payment-intent) mounted at /stripe');


// --- Health Check & Dev/Test Routes ---
app.get('/health', (req, res) => res.status(200).json({ status: 'API is running' }));
// Keep other test/debug routes if needed...


// --- Error Handling Middleware (MUST be LAST) ---

// 404 Handler
app.use((req, res, next) => {
    logger.warn({ method: req.method, url: req.originalUrl }, "Route not found");
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error({ err, url: req.originalUrl }, 'Global error handler caught exception');
    // Avoid sending detailed stack in production
    const errorResponse = {
         message: err.message || 'Something went wrong!'
    };
    if (process.env.NODE_ENV !== 'production') {
         errorResponse.stack = err.stack;
    }
    res.status(err.status || 500).json(errorResponse);
});

// --- Start Server ---
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

module.exports = app; // Keep if needed for tests
