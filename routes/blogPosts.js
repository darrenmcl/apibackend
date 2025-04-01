// /var/projects/backend-api/routes/blogPosts.js
// --- FINAL VERSION with Corrected Column Names ---

const express = require('express');
const router = express.Router();
const pool = require('../db'); // Use correct path to your DB pool config
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// --- CRUD Operations ---

// POST / - Create a new blog post (Admin Only)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { title, content, published } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    const authorId = req.user.userId; // Assumes req.user.userId exists from auth middleware
    if (!authorId) {
        return res.status(401).json({message: 'User ID not found in token.'});
    }

    // Use correct column name: authorid
    const queryText = `
      INSERT INTO blog_posts (title, content, authorid, published)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(queryText, [title, content, authorId, published || false]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ message: 'Error creating blog post', error: error.message });
  }
});

// GET / - Get all PUBLISHED blog posts (Public)
router.get('/', async (req, res) => {
  try {
    // Use correct column names: published, "createdAt", "updatedAt", authorid
    const queryText = `
      SELECT id, title, content, authorid, published, "createdAt", "updatedAt"
      FROM blog_posts
      WHERE published = true
      ORDER BY "createdAt" DESC
    `;
    const result = await pool.query(queryText);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting blog posts:', error);
    res.status(500).json({ message: 'Error getting blog posts', error: error.message });
  }
});

// GET /:id - Get a single blog post by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid Post ID format' });
    }

    // Use correct column names: id, "createdAt", "updatedAt", authorid
    const queryText = `
        SELECT id, title, content, authorid, published, "createdAt", "updatedAt"
        FROM blog_posts
        WHERE id = $1
    `;
    const result = await pool.query(queryText, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Add checks for published status if needed for public access control here

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error getting blog post:', error);
    res.status(500).json({ message: 'Error getting blog post', error: error.message });
  }
});

// PUT /:id - Update a blog post (Owner or Admin Only)
router.put('/:id', auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
     if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    const { title, content, published } = req.body;
     if (title === undefined || content === undefined || published === undefined) {
         return res.status(400).json({ message: 'Title, content, and published status are required for update.' });
     }
     if (typeof published !== 'boolean') {
          return res.status(400).json({ message: 'Published must be true or false.' });
     }

    const userId = req.user.userId;
    const userRole = req.user.role;
    if (!userId) return res.status(401).json({message: 'User ID not found in token.'});

    // Use correct column name: authorid
    const checkResult = await pool.query('SELECT authorid FROM blog_posts WHERE id = $1', [postId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const postAuthorId = checkResult.rows[0].authorid; // Use lowercase from result

    // Check authorization
    if (postAuthorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Unauthorized to update this post' });
    }

    // Use correct column name: "updatedAt" (quoted for case sensitivity)
    const updateQueryText = `
      UPDATE blog_posts
      SET title = $1, content = $2, published = $3, "updatedAt" = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(updateQueryText, [title, content, published, postId]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ message: 'Error updating blog post', error: error.message });
  }
});

// DELETE /:id - Delete a blog post (Owner or Admin Only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
     if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    const userId = req.user.userId;
    const userRole = req.user.role;
     if (!userId) return res.status(401).json({message: 'User ID not found in token.'});

    // Use correct column name: authorid
    const checkResult = await pool.query('SELECT authorid FROM blog_posts WHERE id = $1', [postId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const postAuthorId = checkResult.rows[0].authorid;

    // Check authorization
    if (postAuthorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Unauthorized to delete this post' });
    }

    // User is authorized, proceed with delete
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
    res.status(200).json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ message: 'Error deleting blog post', error: error.message });
  }
});

module.exports = router;
