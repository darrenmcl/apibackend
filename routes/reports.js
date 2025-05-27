const express = require('express');
const router = express.Router();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../lib/logger'); // Your logger

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// --- NEW ENDPOINT ---
router.get('/download-url', async (req, res) => {
    const { key } = req.query;

    if (!key) {
        return res.status(400).json({ message: 'Missing S3 key parameter' });
    }

    // !!! IMPORTANT: ADD AUTHORIZATION CHECK HERE !!!
    // You must verify that the currently logged-in user (req.user?)
    // has permission to access this specific S3 key.
    // How you do this depends on your auth setup and data model.
    // Example: const canAccess = await checkPermissions(req.user, key);
    // if (!canAccess) {
    //     return res.status(403).json({ message: 'Forbidden' });
    // }

    const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: String(key),
    });

    try {
        // Set an expiration time (e.g., 300 seconds = 5 minutes)
        const expiresIn = 300;
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

        logger.info(`Generated pre-signed URL for key: ${key}`);
        res.json({ downloadUrl: signedUrl });

    } catch (err) {
        logger.error({ err, key }, 'Failed to generate pre-signed URL');
        if (err.name === 'NoSuchKey') {
             return res.status(404).json({ message: 'Report not found at the specified key.' });
        }
        res.status(500).json({ message: 'Failed to generate download URL' });
    }
});

module.exports = router;
