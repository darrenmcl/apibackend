// /var/projects/backend-api/index.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3012;

// Middleware - IMPORTANT: Order matters!
app.use(express.json()); // Make sure this comes BEFORE routes
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cors());
app.use(morgan('dev')); // Logging

// Import routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

// Route mounting
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running! You may make requests' });
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
});

module.exports = app;
