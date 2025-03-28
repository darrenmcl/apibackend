const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Configure multer for S3 uploads
const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Define the S3 key (file path)
      const folder = req.body.folder ? `${req.body.folder}/` : '';
      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-').toLowerCase()}`;
      const key = `${folder}${fileName}`;
      
      cb(null, key);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB file size limit
  },
  fileFilter: function (req, file, cb) {
    // Allow only certain file types
    const allowedFileTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDF, Office documents, and text files are allowed.'));
    }
  }
});

// Function to list files in S3 bucket
async function listS3Files(folder = '') {
  const prefix = folder ? `${folder}/` : '';
  
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: prefix
  };
  
  try {
    const data = await s3.listObjectsV2(params).promise();
    
    // Format the response
    const files = data.Contents.map(item => {
      // Extract filename from the key
      const key = item.Key;
      const name = key.split('/').pop();
      
      // Determine the folder from the key
      let itemFolder = null;
      if (key.includes('/')) {
        itemFolder = key.substring(0, key.lastIndexOf('/'));
      }
      
      return {
        id: key,
        key: key,
        name: name,
        url: getS3Url(key),
        size: item.Size,
        lastModified: item.LastModified,
        folder: itemFolder,
        // We don't have content type in the listing, so we'll guess from the extension
        contentType: getContentTypeFromName(name)
      };
    });
    
    return files.filter(file => file.name !== ''); // Filter out directory markers
  } catch (error) {
    console.error('Error listing S3 files:', error);
    throw error;
  }
}

// Function to delete a file from S3 bucket
async function deleteS3File(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };
  
  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting S3 file:', error);
    throw error;
  }
}

// Function to generate a signed URL for an S3 file
async function getS3SignedUrl(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: 60 * 5 // URL valid for 5 minutes
  };
  
  try {
    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

// Function to get the public URL for an S3 file
function getS3Url(key) {
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

// Helper function to guess content type from filename
function getContentTypeFromName(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
  uploadS3,
  listS3Files,
  deleteS3File,
  getS3SignedUrl,
  getS3Url
};
