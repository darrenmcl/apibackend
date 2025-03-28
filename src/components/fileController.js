// /var/projects/backend-api/src/controllers/fileController.js
// (or similar location)

import { uploadFileToS3 } from '../services/s3Service.js';

export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Get file details from multer
    const { buffer, originalname, mimetype } = req.file;
    
    // Generate a unique key for S3
    const key = `uploads/${Date.now()}-${originalname.replace(/\s/g, '_')}`;
    
    // Upload to S3
    const result = await uploadFileToS3(buffer, key, mimetype);
    
    // Return success response with file URL
    return res.status(200).json({
      message: 'File uploaded successfully',
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      key: key,
      name: originalname,
      contentType: mimetype
    });
  } catch (error) {
    console.error('Error in file upload controller:', error);
    return res.status(500).json({ 
      message: 'Something went wrong!', 
      error: { 
        message: error.message,
        stack: error.stack
      } 
    });
  }
}
