// /var/projects/backend-api/routes/fileRoutes.js
// --- FULLY REVISED VERSION ---

const express = require('express');
const router = express.Router();
const path = require('path');
const logger = require('../lib/logger');

logger.info('--- fileRoutes.js Loading ---');

// --- Middleware ---
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// --- File Upload Handling (Multer) ---
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- AWS S3 Configuration ---
const { 
    S3Client, 
    PutObjectCommand, 
    ListObjectsV2Command, 
    DeleteObjectCommand 
} = require('@aws-sdk/client-s3');

// Use S3-specific environment variables with fallbacks
const s3Region = process.env.S3_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const s3AccessKey = process.env.S3_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const s3SecretKey = process.env.S3_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const ASSET_BASE_URL = process.env.ASSET_BASE_URL;

// Log S3 config (without sensitive info)
logger.debug({ 
    region: s3Region, 
    bucket: BUCKET_NAME, 
    assetUrl: ASSET_BASE_URL,
    hasCredentials: !!s3AccessKey && !!s3SecretKey
}, 'S3 configuration loaded');

// Initialize S3 client with explicit credentials
const s3Client = new S3Client({
    region: s3Region,
    credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey
    }
});

// --- Helper Functions ---
function checkS3Config(res) {
    if (!BUCKET_NAME || !ASSET_BASE_URL) {
        logger.error('Missing S3 configuration', { bucket: !!BUCKET_NAME, assetUrl: !!ASSET_BASE_URL });
        res.status(500).json({ message: 'Server configuration error: Storage details missing.' });
        return false;
    }
    if (!s3AccessKey || !s3SecretKey) {
        logger.error('Missing S3 credentials');
        res.status(500).json({ message: 'Server configuration error: Storage credentials missing.' });
        return false;
    }
    return true;
}

// --- ROUTES ---

// POST /files/upload (Admin Only)
router.post('/upload', auth, isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        logger.warn('Upload attempt with no file');
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    
    // Validate S3 configuration
    if (!checkS3Config(res)) return;

    try {
        // Create a unique key (filename) for S3
        const fileExtension = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, fileExtension);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const s3Key = `uploads/${Date.now()}-${sanitizedBaseName}${fileExtension}`;

        logger.info({
            bucket: BUCKET_NAME,
            key: s3Key,
            contentType: req.file.mimetype,
            size: req.file.size
        }, 'Uploading file to S3');

        // Prepare the S3 PutObject command
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read'
        });

        // Send the command to S3
        const s3Response = await s3Client.send(command);

        // Check S3 response metadata for success
        if (s3Response.$metadata.httpStatusCode !== 200) {
            logger.error({ response: s3Response }, 'S3 upload failed with non-200 status');
            throw new Error('Failed to upload file to storage service.');
        }

        logger.info({ key: s3Key }, 'File uploaded successfully to S3');

        // Construct the final public URL
        const finalUrl = `${ASSET_BASE_URL}/${s3Key}`;

        // Send success response
        res.status(201).json({
            message: 'File uploaded successfully',
            filename: req.file.originalname,
            key: s3Key,
            url: finalUrl,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        logger.error({ err: error }, 'S3 upload error');
        res.status(500).json({ 
            message: 'Error uploading file to storage.', 
            error: error.message || 'Unknown error' 
        });
    }
});

// GET /files - List files (from S3) - Admin Only
router.get('/', auth, isAdmin, async (req, res) => {
    // Validate S3 configuration
    if (!checkS3Config(res)) return;

    try {
        logger.info({ bucket: BUCKET_NAME }, 'Listing objects in bucket');
        
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'uploads/'
        });

        const s3Response = await s3Client.send(command);
        
        logger.info({ count: s3Response.Contents?.length || 0 }, 'S3 list objects response received');

        // Map over the contents
        const files = (s3Response.Contents || [])
            .map(item => {
                const key = item.Key;
                const filename = key.substring(key.lastIndexOf('/') + 1);

                // Filter out directory placeholders
                if (!filename || key.endsWith('/')) {
                    return null;
                }

                return {
                    key: key,
                    filename: filename,
                    url: `${ASSET_BASE_URL}/${key}`,
                    size: item.Size,
                    lastModified: item.LastModified
                };
            })
            .filter(file => file !== null) // Remove null entries
            .sort((a, b) => b.lastModified - a.lastModified); // Sort by date descending

        logger.info({ count: files.length }, 'Returning processed file items');
        res.status(200).json(files);

    } catch (error) {
        logger.error({ err: error, bucket: BUCKET_NAME }, 'Error listing files from S3');
        
        // Check for specific S3 errors
        if (error.name === 'AccessDenied') {
            return res.status(403).json({ 
                message: 'Access denied while listing files. Check S3 permissions.', 
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: 'Error listing files from storage.', 
            error: error.message 
        });
    }
});

// DELETE /files/:key - Delete file (from S3) - Admin Only
router.delete('/:key(*)', auth, isAdmin, async (req, res) => {
    const fileKey = req.params.key;

    // Validate S3 configuration and file key
    if (!checkS3Config(res)) return;
    
    if (!fileKey) {
        logger.warn('Delete attempt with no file key');
        return res.status(400).json({ message: 'File key is required for deletion.' });
    }

    try {
        logger.info({ bucket: BUCKET_NAME, key: fileKey }, 'Attempting to delete file from S3');
        
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
        });

        await s3Client.send(command);

        logger.info({ key: fileKey }, 'File deleted successfully from S3');
        res.status(200).json({ message: 'File deleted successfully.', key: fileKey });

    } catch (error) {
        logger.error({ err: error, key: fileKey }, 'S3 delete error');
        
        // Handle specific error cases
        if (error.name === 'NoSuchKey') {
            return res.status(404).json({
                message: 'File not found in storage.',
                error: error.message
            });
        }
        
        res.status(500).json({ 
            message: 'Error deleting file from storage.', 
            error: error.message || 'Unknown error' 
        });
    }
});

module.exports = router;
