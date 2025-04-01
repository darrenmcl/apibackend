// /var/projects/backend-api/routes/fileRoutes.js
// --- FINAL CLEANED VERSION ---

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

// POST /files/upload (Admin Only)
router.post('/upload', auth, isAdmin, upload.single('file'), async (req, res) => {
    // upload.single('file') puts the file buffer in req.file
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    // Check essential S3 config variables
    if (!BUCKET_NAME || !ASSET_BASE_URL) {
         console.error("S3_BUCKET_NAME or ASSET_BASE_URL environment variable not set.");
         return res.status(500).json({ message: 'Server configuration error: Storage details missing.' });
    }

    try {
        // Create a unique key (filename) for S3
        const fileExtension = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, fileExtension);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_'); // Sanitize
        // Define S3 key structure (e.g., within an 'uploads' prefix)
        const s3Key = `uploads/${Date.now()}-${sanitizedBaseName}${fileExtension}`;

        console.log(`Attempting to upload to S3: Bucket=${BUCKET_NAME}, Key=${s3Key}, ContentType=${req.file.mimetype}`);

        // Prepare the S3 PutObject command
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,                 // The 'path'/filename in S3
            Body: req.file.buffer,      // File data from memory storage
            ContentType: req.file.mimetype, // Set correct MIME type
            ACL: 'public-read'       // Uncomment ONLY if files need direct public access via S3 URL AND bucket is configured for it
        });

        // Send the command to S3
        const s3Response = await s3Client.send(command);

        // Check S3 response metadata for success (usually 200 OK)
        if (s3Response.$metadata.httpStatusCode !== 200) {
             console.error("S3 Upload Error Response:", s3Response);
             throw new Error('Failed to upload file to storage service.');
        }

        console.log(`File uploaded successfully to S3. Key: ${s3Key}`);

        // Construct the final public URL using your ASSET_BASE_URL (CDN/CNAME)
        const finalUrl = `${ASSET_BASE_URL}/${s3Key}`; // Use correct template literal

        // Send success response
        res.status(201).json({
            message: 'File uploaded successfully',
            filename: req.file.originalname, // Original filename for reference
            key: s3Key,                  // The key/path used in S3
            url: finalUrl,               // The final accessible URL via CDN/CNAME
            mimetype: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        console.error("S3 Upload Error:", error);
        res.status(500).json({ message: 'Error uploading file to storage.', error: error.message || 'Unknown error' });
    }
});


// GET /files - List files (from S3) - Admin Only
router.get('/', auth, isAdmin, async (req, res) => {
    // Check essential S3 config variables
    if (!BUCKET_NAME || !ASSET_BASE_URL) {
        console.error("S3_BUCKET_NAME or ASSET_BASE_URL environment variable not set.");
        return res.status(500).json({ message: 'Server configuration error: Storage details missing.' });
    }

    try {
        console.log(`Listing objects in bucket: ${BUCKET_NAME}`);
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'uploads/' // Optional: Only list files within the 'uploads/' prefix/folder
        });

        const s3Response = await s3Client.send(command);
        console.log(`S3 ListObjectsV2 response received. Found ${s3Response.Contents?.length || 0} raw items.`);

        // Map over the contents (if any)
        const files = (s3Response.Contents || [])
            .map(item => {
                const key = item.Key;
                const filename = key.substring(key.lastIndexOf('/') + 1);

                // Filter out directory placeholders returned by ListObjectsV2 if using Prefix
                if (!filename || key.endsWith('/')) {
                    return null;
                }

                return {
                    key: key,
                    filename: filename,
                    url: `${ASSET_BASE_URL}/${key}`, // Use correct template literal
                    size: item.Size,
                    lastModified: item.LastModified
                };
            })
            .filter(file => file !== null) // Remove null entries (skipped folders)
            .sort((a, b) => b.lastModified - a.lastModified); // Sort by date descending

        console.log(`Returning ${files.length} processed file items.`);
        res.status(200).json(files);

    } catch (error) {
        console.error("Error listing files from S3:", error);
        res.status(500).json({ message: 'Error listing files from storage.', error: error.message });
    }
});


// Optional: DELETE /files/:key - Delete file (from S3) - Admin Only
// Note: The key needs to be URL encoded/decoded properly if passed in path
// Using req.params.key might require middleware to decode if key contains slashes
// Alternatively, pass key in request body or query string for DELETE
router.delete('/:key(*)', auth, isAdmin, async (req, res) => { // (*) allows slashes in key
    const fileKey = req.params.key; // Key from URL path (e.g., uploads/timestamp-name.jpg)

    if (!BUCKET_NAME) {
        console.error("S3_BUCKET_NAME environment variable not set for delete.");
        return res.status(500).json({ message: 'Server configuration error: Target bucket not specified.' });
    }
     if (!fileKey) {
        return res.status(400).json({ message: 'File key is required for deletion.' });
    }

    try {
        console.log(`Attempting to delete from S3: Bucket=${BUCKET_NAME}, Key=${fileKey}`);
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
        });

        await s3Client.send(command); // Send delete command

        console.log(`File deleted successfully from S3. Key: ${fileKey}`);
        res.status(200).json({ message: 'File deleted successfully.', key: fileKey }); // Use 200 OK or 204 No Content

    } catch (error) {
        console.error("S3 Delete Error:", error);
        // Handle specific errors like NoSuchKey if needed
        res.status(500).json({ message: 'Error deleting file from storage.', error: error.message || 'Unknown error' });
    }
});


module.exports = router;
