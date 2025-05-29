// lib/uploadToS3.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

async function uploadToS3(buffer, key, client = new S3Client()) {
  const mimeType = mime.lookup(key) || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType
    // No ACL: public-read to avoid BlockPublicAcls errors
  });

  await client.send(command);
  return key;
}

module.exports = uploadToS3;
