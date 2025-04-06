const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectRabbit } = require('./lib/rabbit');
connectRabbit(); // Call once on startup
dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3012;

// --- Middleware (order matters!) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// --- CORS ---
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      'https://performancecorporate.com',
      'https://www.performancecorporate.com',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// --- PUBLIC ROUTES FIRST (like /chat) ---
const chatRoutes = require('./routes/chat');
app.use('/chat', chatRoutes); // ✅ public chatbot route

// --- PROTECTED ROUTES (e.g. behind auth middleware) ---
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const blogPosts = require('./routes/blogPosts');
const fileRoutes = require('./routes/fileRoutes');
const stripeRoutes = require('./routes/stripe');
const categoryRoutes = require('./routes/categories');

app.use('/categories', categoryRoutes);
app.use('/files', fileRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/blogposts', blogPosts);
app.use('/', stripeRoutes);

// --- DEV / TEST ROUTES ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running! You may make requests' });
});

app.get('/test-file-routes', (req, res) => {
  res.status(200).json({ 
    message: 'File routes test endpoint', 
    fileRoutesLocation: '/api/files/*',
    uploadEndpoint: '/api/files/upload' 
  });
});

app.post('/debug/echo', (req, res) => {
  res.json({
    body: req.body,
    query: req.query,
    params: req.params,
    method: req.method,
    contentType: req.get('Content-Type')
  });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : {
      message: err.message,
      stack: err.stack
    }
  });
});

// --- 404 HANDLER ---
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File upload endpoint available at: http://localhost:${PORT}/api/files/upload`);
});

module.exports = app;
