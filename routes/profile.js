const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/auth');

// Get the currently authenticated user's profile
router.get('/', authMiddleware, profileController.getProfile);

// Update the currently authenticated user's profile
router.put('/', authMiddleware, profileController.updateProfile);

// Optionally, you might have other profile-related routes here
// e.g., changing password, uploading avatar, etc.

module.exports = router;
