const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3012;

// Import the users routes
const userRoutes = require('./routes/users');

app.use(bodyParser.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  res.status(200).json({ status: 'API is running!' });
});

// Mount the users routes at /users
app.use('/users', userRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
