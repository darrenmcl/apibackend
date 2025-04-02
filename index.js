// /var/projects/backend-api/index.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables BEFORE creating any services
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3012;

// Middleware - IMPORTANT: Order matters!
app.use(express.json()); // Make sure this comes BEFORE routes
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(morgan('dev')); // Logging
// const cors = require('cors');

// More detailed CORS configuration
const corsOptions = {
  origin: 'https://storefront.performancecorporate.com', // Specify frontend origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies/auth headers if needed across origins (though proxy helps)
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Update the middleware to use corsOptions
app.use(cors(corsOptions));

// Import routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const blogPosts = require('./routes/blogPosts');
const fileRoutes = require('./routes/fileRoutes');
const stripeRoutes = require('./routes/stripe');

// Routes
app.use('/files', fileRoutes); // Now matches /api/files/upload
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/blogposts', blogPosts);
app.use('/', stripeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running! You may make requests' });
});

// Test route specifically for the file routes
app.get('/test-file-routes', (req, res) => {
  res.status(200).json({ 
    message: 'File routes test endpoint', 
    fileRoutesLocation: '/api/files/*',
    uploadEndpoint: '/api/files/upload' 
  });
});

// Debug route to check request body parsing
app.post('/debug/echo', (req, res) => {
  res.json({
    body: req.body,
    query: req.query,
    params: req.params,
    method: req.method,
    contentType: req.get('Content-Type')
  });
});

// Global error handler - Make this more informative for debugging
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

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File upload endpoint available at: http://localhost:${PORT}/api/files/upload`);
});

module.exports = app;
