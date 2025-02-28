const express = require('express');
const cors = require('cors');
const app = express();

// Allow all origins for testing purposes
app.use(cors());
// Explicitly handle preflight OPTIONS requests for all routes
app.options('*', cors());
app.use(express.json());

const profileRoutes = require('./routes/profile');
const postsRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

// Mount routes
app.use('/profile', profileRoutes);
app.use('/posts', postsRoutes);
app.use('/users', userRoutes);

const port = process.env.PORT || 3013;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
