const express = require('express');
const router = express.Router();
const { authenticateJWT, optionalAuth } = require('../middleware/auth');
const { 
  uploadS3, 
  listS3Files, 
  deleteS3File, 
  getS3SignedUrl 
} = require('../utils/s3');

// Get all files (optionally filtered by folder)
// This can be accessed without authentication
router.get('/', optionalAuth, async (req, res) => {
  try {
    const folder = req.query.folder || '';
    
    const files = await listS3Files(folder);
    
    res.status(200).json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ 
      message: 'Failed to fetch files', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Upload a file
router.post('/upload', authenticateJWT, uploadS3.single('file'), (req, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // The file metadata is available in req.file
    // AWS S3 will have generated a URL for the file
    const fileData = {
      id: file.key,
      key: file.key,
      name: file.originalname,
      url: file.location,
      size: file.size,
      contentType: file.mimetype,
      createdAt: new Date().toISOString(),
      folder: req.body.folder || null,
      uploadedBy: req.user.id // Add user ID for tracking
    };

    // In a production system, you would likely save this file metadata to your database
    
    return res.status(200).json(fileData);
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      message: 'Error uploading file', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Delete a file
router.delete('/:fileId', authenticateJWT, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    await deleteS3File(fileId);
    
    // If you're tracking files in a database, remove the record here
    
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      message: 'Failed to delete file', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Get a signed URL for a file
router.get('/view/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    const signedUrl = await getS3SignedUrl(fileId);
    
    // Redirect to the signed URL - this allows secure access
    res.redirect(signedUrl);
  } catch (error) {
    console.error('Error viewing file:', error);
    res.status(500).json({ 
      message: 'Failed to generate file URL', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Error handling for multer errors
router.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB.' 
      });
    }
    return res.status(400).json({ 
      message: `Upload error: ${err.message}` 
    });
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({ 
      message: err.message 
    });
  }
  
  next(err);
});

module.exports = router;
