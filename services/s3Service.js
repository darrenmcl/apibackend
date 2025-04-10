// /var/projects/backend-api/services/s3Service.js
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const dotenv = require('dotenv');
const logger = require('../lib/logger');

// Load environment variables
dotenv.config();

// Use S3-specific environment variables with fallbacks
const s3Region = process.env.S3_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const s3AccessKey = process.env.S3_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const s3SecretKey = process.env.S3_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Log S3 configuration for debugging (without revealing full credentials)
logger.info({
  region: s3Region,
  bucket: BUCKET_NAME,
  hasAccessKey: !!s3AccessKey,
  hasSecretKey: !!s3SecretKey
}, 'S3Service initialized');

// Initialize the S3 client once (outside of any functions)
const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey
  }
});

/**
 * Upload a file to S3 using multipart upload
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} key - The S3 object key (path in bucket)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<Object>} - S3 upload response
 */
async function uploadFileToS3(fileBuffer, key, contentType) {
  try {
    logger.info({ key, contentType }, 'Starting S3 multipart upload');
    
    // Validate input
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer');
    }
    
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read' // Adjust based on your requirements
      }
    });
    
    // Upload and wait for completion
    const result = await upload.done();
    logger.info({ key, location: result.Location }, 'Successfully uploaded file to S3');
    return result;
  } catch (error) {
    logger.error({ err: error, key }, "Error uploading file to S3");
    throw error;
  }
}

module.exports = {
  uploadFileToS3
};
