// /var/projects/backend-api/src/services/s3Service.js
// (or wherever your S3 upload logic is located)

import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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
export async function uploadFileToS3(fileBuffer, key, contentType) {
  try {
    console.log(`Starting S3 upload for key: ${key}`);
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Optional: add additional parameters like ACL
        ACL: 'public-read' // Adjust according to your security requirements
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

/**
 * Get a file from S3
 * @param {string} key - The S3 object key
 * @returns {Promise<Object>} - S3 get object response
 */
export async function getFileFromS3(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    });
    
    return await s3Client.send(command);
  } catch (error) {
    console.error(`Error getting file from S3: ${key}`, error);
    throw error;
  }
}

/**
 * Upload a small file directly to S3 (non-multipart)
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} key - The S3 object key
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<Object>} - S3 upload response
 */
export async function uploadSmallFileToS3(fileBuffer, key, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType
    });
    
    return await s3Client.send(command);
  } catch (error) {
    console.error("Error uploading small file to S3:", error);
    throw error;
  }
}
