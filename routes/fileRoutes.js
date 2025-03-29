// /var/projects/backend-api/routes/fileRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3"); // Import S3 listing command
const dotenv = require('dotenv');

// Load environment variables (best practice to do this early, e.g., in your main app.js, but ensuring it here is safe)
dotenv.config();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Import our S3 upload service
const { uploadFileToS3 } = require('../services/s3Service');

// --- NEW: S3 Client Initialization (needed for listing) ---
// It's often good to initialize clients once. If you have a central place, use that.
// Otherwise, initialize it here for the listing functionality.
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// --- Get necessary environment variables ---
const bucketName = process.env.S3_BUCKET_NAME;
const assetBaseUrl = process.env.ASSET_BASE_URL; // Your CloudFront/custom domain URL
const uploadPrefix = "uploads/"; // Define the prefix where files are stored

// Helper function to check required environment variables
function checkEnvVariables() {
    const missing = [];
    if (!bucketName) missing.push('S3_BUCKET_NAME');
    if (!assetBaseUrl) missing.push('ASSET_BASE_URL');
    if (!process.env.AWS_REGION) missing.push('AWS_REGION');
    // Check credentials if they are expected via env vars (might be handled differently in production, e.g., IAM roles)
    if (!process.env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
    if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');

    if (missing.length > 0) {
        const errorMsg = `Server configuration error: Missing required environment variables: ${missing.join(', ')}`;
        console.error(`FATAL ERROR: ${errorMsg}`);
        return errorMsg; // Return error message
    }
    return null; // No error
}

// --- Test route ---
router.get('/test', (req, res) => {
  res.json({ message: 'File routes are working' });
});

// --- File upload endpoint (MODIFIED) ---
router.post('/upload', upload.single('file'), async (req, res) => {
  // Check configuration first
  const configError = checkEnvVariables();
  if (configError) {
      return res.status(500).json({ message: configError });
  }

  try {
    console.log('File upload request received');

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No file provided' });
    }

    const { buffer, originalname, mimetype } = req.file;
    console.log(`File details: name=${originalname}, type=${mimetype}, size=${buffer.length} bytes`);

    // Generate a unique key for S3 within the defined prefix
    const key = `${uploadPrefix}${Date.now()}-${originalname.replace(/\s/g, '_')}`;

    // Upload to S3 (using the imported service)
    await uploadFileToS3(buffer, key, mimetype); // No need to capture result if just confirming success

    // --- MODIFIED: Construct URL using ASSET_BASE_URL ---
    // Ensure no double slashes
    const fileUrl = `${assetBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;

    // Return success response with the *correct* file URL
    res.status(200).json({
      message: 'File uploaded successfully',
      url: fileUrl, // Use the new CloudFront URL
      key: key,
      name: originalname,
      contentType: mimetype
    });
  } catch (error) {
    console.error('Error in file upload handler:', error);
    res.status(500).json({
      message: 'Error uploading file',
      error: { name: error.name, message: error.message }
    });
  }
});

// --- File listing endpoint (IMPLEMENTED) ---
router.get('/', async (req, res) => {
  // Check configuration first
  const configError = checkEnvVariables();
  if (configError) {
      return res.status(500).json({ message: configError });
  }

  try {
    console.log(`Listing files from bucket: ${bucketName}, prefix: ${uploadPrefix}`);

    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: uploadPrefix // List only objects within the 'uploads/' directory
    });

    const listResponse = await s3Client.send(listCommand);

    const files = listResponse.Contents?.map(object => {
      const key = object.Key;

      // Skip if key is undefined or represents the folder itself (if Prefix query returns it)
      if (!key || key === uploadPrefix) {
          return null; // Will be filtered out
      }

      // --- USE ASSET_BASE_URL for the URL ---
      const url = `${assetBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;

      // Extract a more user-friendly filename (optional, adjust as needed)
      // This example assumes 'prefix/timestamp-filename.ext' and tries to get 'filename.ext'
      const filename = key.split('/').pop()?.split('-').slice(1).join('-') || key.split('/').pop() || key;

      // Note: ListObjectsV2Command doesn't return ContentType.
      // You'd need separate HeadObject calls for each file if ContentType is essential here.
      return {
        key: key,
        url: url, // Use the CloudFront URL
        filename: filename, // User-friendly name
        s3KeyName: key.split('/').pop(), // The actual name in S3
        size: object.Size,
        lastModified: object.LastModified
      };
    }).filter(file => file !== null) || []; // Filter out any null entries (like the prefix folder itself)

    console.log(`Found ${files.length} files.`);
    res.json(files);

  } catch (error) {
    console.error('Error fetching files from S3:', error);
    res.status(500).json({
      message: 'Error fetching files',
      error: { name: error.name, message: error.message }
    });
  }
});

// Make sure to export the router
module.exports = router;
