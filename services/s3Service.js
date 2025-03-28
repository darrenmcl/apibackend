// /var/projects/backend-api/services/s3Service.js

const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Log S3 configuration for debugging
console.log('S3 Configuration:');
console.log(`- Region: ${process.env.AWS_REGION || 'not set'}`);
console.log(`- Bucket: ${process.env.S3_BUCKET_NAME || 'not set'}`);
console.log(`- Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'not set'}`);
console.log(`- Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '******' : 'not set'}`);

// Initialize the S3 client once (outside of any functions)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
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
    console.log(`Starting S3 upload for key: ${key}`);
    
    // Validate input
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer');
    }
    
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read' // Adjust based on your requirements
      }
    });

    // Upload and wait for completion
    const result = await upload.done();
    console.log(`Successfully uploaded file to S3: ${key}`);
    return result;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

module.exports = {
  uploadFileToS3
};
