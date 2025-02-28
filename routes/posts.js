// routes/posts.js
const express = require('express');
const router = express.Router();
const blogPostController = require('../controllers/blogPostController'); // Adjust the path as necessary
const authMiddleware = require('../middlewares/auth'); // Ensure this matches your actual file structure

// Public routes
router.get('/', blogPostController.getAllBlogPosts);
router.get('/:id', blogPostController.getBlogPostById);

// Protected routes with authentication middleware
router.post('/', authMiddleware, blogPostController.createBlogPost); // Apply the middleware to protected routes
router.put('/:id', authMiddleware, blogPostController.updateBlogPost);
router.delete('/:id', authMiddleware, blogPostController.deleteBlogPost);

module.exports = router;
