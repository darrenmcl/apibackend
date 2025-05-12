// /var/projects/backend-api/routes/fileRoutes.js
// --- FULLY REVISED VERSION WITH IMAGE OPTIMIZATION ---

const express = require('express');
const router = express.Router();
const path = require('path');
const logger = require('../lib/logger');
const sharp = require('sharp'); // Add Sharp for image processing

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

// Check if file is an image based on mimetype
function isImage(mimetype) {
    return mimetype && mimetype.startsWith('image/');
}

// Generate file versions and upload to S3
async function processAndUploadImage(fileBuffer, originalKey, mimetype) {
    const results = {
        original: {
            key: originalKey,
            url: `${ASSET_BASE_URL}/${originalKey}`
        }
    };
    
    // Only process images
    if (!isImage(mimetype)) {
        // Just upload the original if not an image
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: originalKey,
            Body: fileBuffer,
            ContentType: mimetype,
            CacheControl: 'public, max-age=31536000' // Cache for 1 year
        }));
        
        return results;
    }
    
    // Extract name parts for creating variant filenames
    const basePath = path.dirname(originalKey);
    const extension = path.extname(originalKey);
    const filename = path.basename(originalKey, extension);
    
    // Create image processor
    const imageProcessor = sharp(fileBuffer);
    
    // Get image metadata
    const metadata = await imageProcessor.metadata();
    logger.debug({ width: metadata.width, height: metadata.height, format: metadata.format }, 'Image metadata');
    
    try {
        // Upload original image
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: originalKey,
            Body: fileBuffer,
            ContentType: mimetype,
            CacheControl: 'public, max-age=31536000' // Cache for 1 year
        }));
        
        // Generate and upload WebP version
        const webpKey = `${basePath}/${filename}.webp`;
        const webpBuffer = await sharp(fileBuffer)
            .webp({ quality: 80 })
            .toBuffer();
        
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: webpKey,
            Body: webpBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000'
        }));
        
        results.webp = {
            key: webpKey,
            url: `${ASSET_BASE_URL}/${webpKey}`
        };
        
        // Generate and upload AVIF version
        try {
            const avifKey = `${basePath}/${filename}.avif`;
            const avifBuffer = await sharp(fileBuffer)
                .avif({ quality: 65 })
                .toBuffer();
            
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: avifKey,
                Body: avifBuffer,
                ContentType: 'image/avif',
                CacheControl: 'public, max-age=31536000'
            }));
            
            results.avif = {
                key: avifKey,
                url: `${ASSET_BASE_URL}/${avifKey}`
            };
        } catch (avifError) {
            // AVIF might not be supported in this Sharp version
            logger.warn({ err: avifError }, 'AVIF conversion failed, skipping');
        }
        
        return results;
    } catch (error) {
        logger.error({ err: error }, 'Image processing error');
        throw error;
    }
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
            size: req.file.size,
            isImage: isImage(req.file.mimetype)
        }, 'Processing and uploading file to S3');

        // Process and upload the file (generating variants if it's an image)
        const uploadResults = await processAndUploadImage(
            req.file.buffer, 
            s3Key, 
            req.file.mimetype
        );

        logger.info({ results: uploadResults }, 'File and variants uploaded successfully to S3');

        // Send success response with all image variants
        res.status(201).json({
            message: 'File uploaded successfully',
            filename: req.file.originalname,
            key: s3Key,
            url: uploadResults.original.url,
            variants: uploadResults,
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

// Rest of the routes remain the same
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

                // Filter out directory placeholders and alternative formats
                if (!filename || key.endsWith('/') || key.endsWith('.webp') || key.endsWith('.avif')) {
                    return null;
                }

                return {
                    key: key,
                    filename: filename,
                    url: `${ASSET_BASE_URL}/${key}`,
                    size: item.Size,
                    lastModified: item.LastModified,
                    variants: {
                        original: `${ASSET_BASE_URL}/${key}`,
                        webp: `${ASSET_BASE_URL}/${key.substring(0, key.lastIndexOf('.'))}.webp`,
                        avif: `${ASSET_BASE_URL}/${key.substring(0, key.lastIndexOf('.'))}.avif`
                    }
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

// In your fileRoutes.js - Enhanced to also delete variant formats
router.delete('/:key(*)', auth, isAdmin, async (req, res) => {
  const fileKey = req.params.key;
  
  if (!BUCKET_NAME) {
    return res.status(500).json({ message: 'Server configuration error: Target bucket not specified.' });
  }
  
  if (!fileKey) {
    return res.status(400).json({ message: 'File key is required for deletion.' });
  }
  
  try {
    // Delete the original file
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }));
    
    // Also try to delete any variant formats
    const basePath = path.dirname(fileKey);
    const extension = path.extname(fileKey);
    const filename = path.basename(fileKey, extension);
    
    // Try to delete WebP version (if exists)
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${basePath}/${filename}.webp`,
      }));
      logger.info(`Deleted WebP version of ${fileKey}`);
    } catch (webpError) {
      logger.debug({ err: webpError }, 'WebP version not found or other error');
    }
    
    // Try to delete AVIF version (if exists)
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${basePath}/${filename}.avif`,
      }));
      logger.info(`Deleted AVIF version of ${fileKey}`);
    } catch (avifError) {
      logger.debug({ err: avifError }, 'AVIF version not found or other error');
    }
    
    return res.status(200).json({ 
      message: 'File and its variants deleted successfully.', 
      key: fileKey 
    });
    
  } catch (error) {
    logger.error({ err: error, key: fileKey }, 'Error deleting file from S3');
    return res.status(500).json({ 
      message: 'Error deleting file from storage.', 
      error: error.message || 'Unknown error' 
    });
  }
});

module.exports = router;
