// /var/projects/backend-api/src/routes/fileRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../src/controllers/fileController');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// File routes
router.post('/upload', upload.single('file'), fileController.uploadFile);

// IMPORTANT: Export the router as a function
module.exports = router;
