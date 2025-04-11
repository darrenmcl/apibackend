const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectRabbit } = require('./lib/rabbit');
const cookieParser = require('cookie-parser'); // Require the package
connectRabbit(); // Call once on startup
dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3012;

// --- Middleware (order matters!) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// Load comma-separated origins from .env
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

// Add development origins when not in production
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:4321'); // Astro default port
  allowedOrigins.push('http://localhost:3012'); // Common dev port
}

// For debugging - log the allowed origins
console.log('[CORS] Allowed origins:', allowedOrigins);

const corsOptionsDelegate = function (req, callback) {
  const requestOrigin = req.header('Origin');
  
  // Check if the origin is in our allowed list or if we should allow all in development
  let corsOptions;
  
  if (!requestOrigin) {
    // If no origin (like server-to-server requests), allow the request
    corsOptions = { origin: false };
  } else if (allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*')) {
    // Specific origin is allowed or we allow all origins
    corsOptions = { 
      origin: requestOrigin,
      credentials: true // CRITICAL for cookies
    };
  } else {
    // Not allowed origin
    console.warn(`[CORS] Rejecting request from origin: ${requestOrigin}`);
    corsOptions = { origin: false };
  }
  
  // Common options for all requests
  corsOptions = {
    ...corsOptions,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Always allow credentials
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'set-cookie'],
    maxAge: 86400 // Cache preflight response for 24 hours
  };
  
  // Log CORS decision for debugging
  console.log(`[CORS] Request from origin: ${requestOrigin} => ${corsOptions.origin ? 'Allowed' : 'Rejected'}`);
  
  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));

// --- PUBLIC ROUTES FIRST (like /chat) ---
const chatRoutes = require('./routes/chatRoutes');
const contactRoutes = require('./routes/contactRoutes');
const logRoutes = require('./routes/log.js');
app.use('/chat', chatRoutes); // ✅ public chatbot route
app.use('/contact', contactRoutes);

// --- PROTECTED ROUTES (e.g. behind auth middleware) ---
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const blogPosts = require('./routes/blogPosts');
const fileRoutes = require('./routes/fileRoutes');
const stripeRoutes = require('./routes/stripe');
const categoryRoutes = require('./routes/categories');

app.use('/log', logRoutes);
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
