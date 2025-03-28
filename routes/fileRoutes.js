// /var/projects/backend-api/routes/fileRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Import our S3 service
const { uploadFileToS3 } = require('../services/s3Service');

// Test route to check if file routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'File routes are working' });
});

// File upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('File upload request received');
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No file provided' });
    }

    // Get file details from multer
    const { buffer, originalname, mimetype } = req.file;
    console.log(`File details: name=${originalname}, type=${mimetype}, size=${buffer.length} bytes`);
    
    // Generate a unique key for S3
    const key = `uploads/${Date.now()}-${originalname.replace(/\s/g, '_')}`;
    
    // Upload to S3
    const result = await uploadFileToS3(buffer, key, mimetype);
    
    // Return success response with file URL
    res.status(200).json({
      message: 'File uploaded successfully',
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key: key,
      name: originalname,
      contentType: mimetype
    });
  } catch (error) {
    console.error('Error in file upload handler:', error);
    res.status(500).json({ 
      message: 'Error uploading file', 
      error: {
        name: error.name,
        message: error.message
      } 
    });
  }
});

// /var/projects/backend-api/routes/fileRoutes.js
// Add this endpoint to your existing file

// File listing endpoint
router.get('/', async (req, res) => {
  try {
    // This is where you'd implement file listing
    // For now, return a placeholder response
    const files = [
      // Example files
      {
        id: '1',
        name: 'example-document.pdf',
        contentType: 'application/pdf',
        url: 'https://example.com/files/example-document.pdf',
        createdAt: new Date().toISOString()
      },
      // Add more example files as needed
    ];
    
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ 
      message: 'Error fetching files', 
      error: { name: error.name, message: error.message } 
    });
  }
});

// Restore the rest of your existing code...

// Make sure to export the router
module.exports = router;
