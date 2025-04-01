// /var/projects/backend-api/routes/blogPosts.js
const express = require('express');
const router = express.Router();
// Remove local JWT require if not needed elsewhere in this file
// const jwt = require('jsonwebtoken');
const pool = require('../db'); // Import the database pool
const auth = require('../middlewares/auth'); // Use shared auth middleware
const isAdmin = require('../middlewares/isAdmin'); // Import isAdmin

// --- Remove local authenticateToken function ---
// const authenticateToken = (req, res, next) => { ... };

// --- CRUD Operations ---

// Create a new blog post (Admin Only)
// Use shared 'auth' and add 'isAdmin'
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    if (!req.body || !req.body.title || !req.body.content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const { title, content, published } = req.body;
    // Ensure 'userId' from JWT payload matches your auth middleware's setup (req.user.userId or req.user.id)
    const authorId = req.user.userId; // Or req.user.id
     if (!authorId) { return res.status(401).json({message: 'User ID not found in token.'});}


    const result = await pool.query(
      'INSERT INTO blog_posts (title, content, author_id, published) VALUES ($1, $2, $3, $4) RETURNING *', // Assuming author column is author_id
      [title, content, authorId, published || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ message: 'Error creating blog post', error: error.message });
  }
});

// Get all blog posts (public) - OK as is
router.get('/', async (req, res) => { /* ... */ });

// Get a single blog post by ID (public) - OK as is
router.get('/:id', async (req, res) => { /* ... */ });

// Update a blog post (Owner or Admin Only) - REVISED
// Use shared 'auth', logic check inside
router.put('/:id', auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { title, content, published } = req.body;
    const userId = req.user.userId; // Current user's ID
    const userRole = req.user.role; // Current user's role

    if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}


    // Check if post exists and get authorId
    const checkResult = await pool.query('SELECT author_id FROM blog_posts WHERE id = $1', [postId]); // Assuming author column is author_id

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const postAuthorId = checkResult.rows[0].author_id; // Assuming author column is author_id

    // Allow update IF user is the author OR user is an admin
    if (postAuthorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Unauthorized to update this post' });
    }

    // User is authorized, proceed with update
    const result = await pool.query(
      'UPDATE blog_posts SET title = $1, content = $2, published = $3, "updatedAt" = NOW() WHERE id = $4 RETURNING *', // Use updatedAt convention
      [title, content, published, postId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ message: 'Error updating blog post', error: error.message });
  }
});

// Delete a blog post (Owner or Admin Only) - REVISED
// Use shared 'auth', logic check inside
router.delete('/:id', auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
     const userId = req.user.userId; // Current user's ID
    const userRole = req.user.role; // Current user's role

     if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}


    // Check if post exists and get authorId
    const checkResult = await pool.query('SELECT author_id FROM blog_posts WHERE id = $1', [postId]); // Assuming author column is author_id

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

     const postAuthorId = checkResult.rows[0].author_id; // Assuming author column is author_id

    // Allow delete IF user is the author OR user is an admin
    if (postAuthorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Unauthorized to delete this post' });
    }

    // User is authorized, proceed with delete
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
    res.json({ message: 'Blog post deleted' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ message: 'Error deleting blog post', error: error.message });
  }
});

module.exports = router;
