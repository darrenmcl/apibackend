// /var/projects/backend-api/routes/fileRoutes.js

// --- Standard Imports ---
const express = require('express');
const router = express.Router();
const path = require('path'); // For handling file extensions

// --- Middleware ---
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// --- File Upload Handling (Multer) ---
const multer = require('multer');
const storage = multer.memoryStorage(); // Use memory storage for S3 upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Example: Limit file size to 10MB
});

// --- AWS S3 Configuration ---
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Include all needed commands

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1', // Ensure region is correct for your bucket
    // Credentials should be loaded automatically from environment variables:
    // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
// Base URL for accessing assets (your CNAME or CloudFront URL)
const ASSET_BASE_URL = process.env.ASSET_BASE_URL; // Ensure this is set in your .env

// --- ROUTES START BELOW ---

// --- *** REVISED POST /upload Route *** ---
router.post('/upload', auth, isAdmin, upload.single('file'), async (req, res) => {
    // upload.single('file') puts the file buffer in req.file
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    if (!BUCKET_NAME) {
         console.error("S3_BUCKET_NAME environment variable not set for upload.");
         return res.status(500).json({ message: 'Server configuration error: Target bucket not specified.' });
    }

    try {
        // Create a unique key (filename) for S3, e.g., using timestamp and original name
        const fileExtension = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, fileExtension);
        // Sanitize baseName - remove characters not safe for URLs/filenames
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const s3Key = `uploads/<span class="math-inline">\{Date\.now\(\)\}\-</span>{sanitizedBaseName}${fileExtension}`; // Example key structure

        console.log(`Attempting to upload to S3: Bucket=<span class="math-inline">\{BUCKET\_NAME\}, Key\=</span>{s3Key}, ContentType=${req.file.mimetype}`);

        // Prepare the command for S3 upload
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,                 // The 'path' and filename in S3
            Body: req.file.buffer,      // The actual file data from memory storage
            ContentType: req.file.mimetype, // Set the correct content type
            // ACL: 'public-read'       // Uncomment if you want files publicly readable via URL (ensure bucket allows this)
        });

        // Send the command to S3
        const s3Response = await s3Client.send(command);

        // Check S3 response (v3 SDK returns $metadata.httpStatusCode)
        if (s3Response.$metadata.httpStatusCode !== 200) {
             console.error("S3 Upload Error Response:", s3Response);
             throw new Error('Failed to upload file to storage.');
        }

        console.log(`File uploaded successfully to S3. Key: ${s3Key}`);

        // Construct the final public URL
        const finalUrl = `<span class="math-inline">\{ASSET\_BASE\_URL\}/</span>{s3Key}`; // Use your CDN base URL

        // Send success response back to frontend
        res.status(201).json({
            message: 'File uploaded successfully',
            filename: req.file.originalname, // Keep original name for reference if needed
            key: s3Key,                  // The key used in S3
            url: finalUrl,               // The final accessible URL
            mimetype: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        console.error("S3 Upload Error:", error);
        // Provide a more specific error if possible, otherwise generic
        res.status(500).json({ message: 'Error uploading file to storage.', error: error.message || 'Unknown error' });
    }
});
// --- *** END OF REVISED POST /upload *** ---


// --- GET /files route (Keep as is from previous fix) ---
router.get('/', auth, isAdmin, async (req, res) => {
   // ... your existing S3 listing logic ...
    if (!BUCKET_NAME) { /* ... */ }
    try {
        console.log(`Listing objects in bucket: ${BUCKET_NAME}`);
        const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
        const s3Response = await s3Client.send(command);
        console.log(`S3 ListObjectsV2 response received. Found ${s3Response.Contents?.length || 0} items.`);
        const files = (s3Response.Contents || [])
            .map(item => { /* ... mapping logic ... */ })
            .filter(file => file !== null)
            .sort((a, b) => b.lastModified - a.lastModified);
        res.status(200).json(files);
    } catch (error) { /* ... */ }
});


// Optional: Add DELETE route here using DeleteObjectCommand


module.exports = router;

// --- *** ADD THIS NEW ROUTE *** ---
// GET /files - List files (from S3) - Admin Only
// --- Corrected GET /files Route ---
// GET /files - List files (from S3) - Admin Only
router.get('/', auth, isAdmin, async (req, res) => {
    // Check if bucket name is configured (good practice)
    if (!BUCKET_NAME) {
        console.error("S3_BUCKET_NAME environment variable not set.");
        return res.status(500).json({ message: 'Server configuration error: Bucket not specified.' });
    }

    try {
        console.log(`Listing objects in bucket: ${BUCKET_NAME}`);
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            // Prefix: 'uploads/' // Uncomment and set if your files are in a specific S3 'folder'
        });

        // --- *** THIS LINE WAS MISSING/INCORRECT *** ---
        // Call S3 to list objects and store the result in s3Response
        const s3Response = await s3Client.send(command);
        // --- *** END OF FIX *** ---

        // Log confirmation after successful call
        console.log(`S3 ListObjectsV2 response received. Found ${s3Response.Contents?.length || 0} items.`);

        // Map over the contents (if any)
        const files = (s3Response.Contents || [])
            .map(item => {
                const key = item.Key;
                // Extract filename (part after last '/')
                const filename = key.substring(key.lastIndexOf('/') + 1);

                // Basic check to filter out S3 pseudo-folders (keys ending in '/')
                if (!filename && key.endsWith('/')) {
                    return null; // Skip this item
                }

                return {
                    key: key,
                    filename: filename || key, // Use key as fallback filename if needed
                    // Correct URL construction using template literal
                    url: `${ASSET_BASE_URL}/${key}`,
                    size: item.Size,
                    lastModified: item.LastModified
                };
            })
            .filter(file => file !== null) // Remove the null entries (skipped folders)
            .sort((a, b) => b.lastModified - a.lastModified); // Sort by date descending (most recent first)

        res.status(200).json(files);

    } catch (error) {
        console.error("Error listing files from S3:", error);
        res.status(500).json({ message: 'Error listing files from storage.', error: error.message });
    }
});
// --- *** END OF CORRECTED ROUTE *** ---

module.exports = router;
