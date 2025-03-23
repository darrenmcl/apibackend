// /var/projects/backend-api/routes/blogPosts.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Import the database pool

// Authentication Middleware (as before)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key');
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// --- CRUD Operations (using PostgreSQL) ---

// Create a new blog post
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.body || !req.body.title || !req.body.content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const { title, content, published } = req.body;
    const authorId = req.user.userId;

    const result = await pool.query(
      'INSERT INTO blog_posts (title, content, authorId, published) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, authorId, published || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ message: 'Error creating blog post', error: error.message });
  }
});

// Get all blog posts (optionally filtered by published status)
router.get('/', async (req, res) => {
  try {
    const publishedOnly = req.query.published === 'true';
    let query = 'SELECT * FROM blog_posts';
    let values = [];

    if (publishedOnly) {
      query += ' WHERE published = $1';
      values.push(true);
    }
    query += ' ORDER BY "createdAt" DESC';
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting blog posts:', error);
    res.status(500).json({ message: 'Error getting blog posts', error: error.message });
  }
});

// Get a single blog post by ID
router.get('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const result = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting blog post:', error);
    res.status(500).json({ message: 'Error getting blog post', error: error.message });
  }
});

// Update a blog post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { title, content, published } = req.body;

     // First, check if the post exists and get the author ID
     const checkResult = await pool.query('SELECT authorId FROM blog_posts WHERE id = $1', [postId]);

     if (checkResult.rows.length === 0) {
       return res.status(404).json({ message: 'Blog post not found' });
     }

     if (checkResult.rows[0].authorid !== req.user.userId) {
       return res.status(403).json({ message: 'Unauthorized to update this post' });
     }

    const result = await pool.query(
      'UPDATE blog_posts SET title = $1, content = $2, published = $3, "updatedAt" = NOW() WHERE id = $4 RETURNING *',
      [title, content, published, postId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ message: 'Error updating blog post', error: error.message });
  }
});

// Delete a blog post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);

    // First, check if the post exists and get the author ID
    const checkResult = await pool.query('SELECT authorId FROM blog_posts WHERE id = $1', [postId]);

    if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: 'Blog post not found' });
    }

    if (checkResult.rows[0].authorid !== req.user.userId) {
        return res.status(403).json({ message: 'Unauthorized to delete this post' });
    }

    await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
    res.json({ message: 'Blog post deleted' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ message: 'Error deleting blog post', error: error.message });
  }
});

module.exports = router;
