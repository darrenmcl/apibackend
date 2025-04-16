// /var/projects/llm-report-worker/worker.js (Integrated Version)

require('dotenv').config(); // Load .env file from worker directory
const amqp = require('amqplib');
const logger = require('./lib/logger'); // Use Pino logger
const db = require('./config/db'); // DB pool setup
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const PDFDocument = require('pdfkit'); // PDF library
const { v4: uuidv4 } = require('uuid');

// Use global fetch if available (Node.js 18+), or handle differently for older versions
let fetch;
if (typeof globalThis.fetch === 'function') {
    // Node.js 18+ has built-in fetch
    fetch = globalThis.fetch;
    logger.info('Using built-in fetch');
} else {
    try {
        // Try to dynamically import node-fetch for older Node.js versions
        import('node-fetch').then(module => {
            fetch = module.default;
            logger.info('Using imported node-fetch');
        });
    } catch (err) {
        logger.error('Failed to import node-fetch. Using older version as fallback.');
        // Fallback to older version if available
        fetch = require('node-fetch');
    }
}

// --- Configuration ---
// Using individual RabbitMQ connection parameters
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT || '5672');
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'admin';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'PASSWORD';
const QUEUE_NAME = process.env.WORKER_QUEUE || 'llm_report_jobs';

// S3 and OpenRouter configuration
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = process.env.YOUR_SITE_URL || '';
const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || '';

// --- Validate Essential Config ---
if (!S3_BUCKET_NAME || !AWS_REGION || !OPENROUTER_API_KEY) {
    logger.fatal("CRITICAL: Missing essential environment variables (S3_BUCKET_NAME, AWS_REGION, or OPENROUTER_API_KEY) for worker. Exiting.");
    process.exit(1);
}

// Log the configuration we're using
logger.info({
    rabbitMQHost: RABBITMQ_HOST,
    rabbitMQPort: RABBITMQ_PORT,
    rabbitMQUser: RABBITMQ_USER,
    queue: QUEUE_NAME,
    s3Bucket: S3_BUCKET_NAME,
    awsRegion: AWS_REGION,
    openRouterKey: OPENROUTER_API_KEY ? '***Present***' : '***Missing***'
}, 'Worker configuration');

// --- Initialize Clients ---
let s3Client;
try {
    s3Client = new S3Client({ 
        region: AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    logger.info('S3 Client Initialized for Worker.');
} catch(err) { logger.error({err}, "Worker failed to initialize S3 Client"); process.exit(1); }

let rabbitChannel = null;
let rabbitConnection = null;

// --- Main Worker Function ---
async function runWorker() {
    try {
        logger.info('Worker connecting to RabbitMQ...');
        
        // Connect to RabbitMQ using the same approach as your email-worker
        rabbitConnection = await amqp.connect({
            hostname: process.env.RABBITMQ_HOST || 'rabbitmq',
            port: parseInt(process.env.RABBITMQ_PORT || '5672'),
            username: process.env.RABBITMQ_USER || 'admin',
            password: process.env.RABBITMQ_PASS || 'PASSWORD'
        });
        
        rabbitChannel = await rabbitConnection.createChannel();
        logger.info('[Worker] RabbitMQ connection and channel established.');

        // Ensure queue exists and is durable
        await rabbitChannel.assertQueue(QUEUE_NAME, { durable: true });

        // Process only one message at a time
        rabbitChannel.prefetch(1);

        logger.info(`[Worker] Waiting for messages in queue: ${QUEUE_NAME}. To exit press CTRL+C`);

        // Consume messages
        rabbitChannel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) {
                logger.warn("[Worker] Received null message (queue might have been cancelled).");
                return;
            }

            let jobData;
            const messageContent = msg.content.toString();
            const processStartTime = Date.now();
            logger.info(`[Worker] Received job message.`);
            logger.debug({ messageContent }, "Raw message content");

            try {
                // --- 1. Parse Job Data ---
                jobData = JSON.parse(messageContent);
                // Validate essential job data fields
                if (!jobData || !jobData.orderId || !jobData.productId || !jobData.targetS3Key) {
                     throw new Error("Invalid job data received - missing orderId, productId, or targetS3Key.");
                }
                logger.info({ jobData: { orderId: jobData.orderId, productId: jobData.productId } }, `[Worker] Parsed job data. Starting processing...`);

                // --- 2. Construct & Call LLM ---
                // TODO: Customize prompt based on product/order/user if needed
                const promptContent = `Generate a detailed market analysis report titled "${jobData.productName || 'Market Report'}" suitable for small businesses, focusing on recent trends. Include sections on market size, key segments, competitive landscape, and future outlook.`;
                const messages = [{ role: "user", content: promptContent }];
                const modelName = "openai/gpt-3.5-turbo"; // Choose model (check OpenRouter for options)

                logger.info({ model: modelName, orderId: jobData.orderId }, `Calling OpenRouter LLM...`);
                const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        ...(YOUR_SITE_URL && { "HTTP-Referer": YOUR_SITE_URL }),
                        ...(YOUR_SITE_NAME && { "X-Title": YOUR_SITE_NAME })
                    },
                    body: JSON.stringify({ model: modelName, messages: messages })
                });

                if (!llmResponse.ok) {
                    const errorBody = await llmResponse.text();
                    throw new Error(`OpenRouter API failed: ${llmResponse.status} ${errorBody}`);
                }
                const llmData = await llmResponse.json();
                const llmResultText = llmData.choices?.[0]?.message?.content;
                if (!llmResultText) throw new Error("Invalid/Empty content from LLM response.");
                logger.info({ orderId: jobData.orderId }, `LLM processing complete. Content length: ${llmResultText.length}`);

                // --- 3. Generate PDF ---
                logger.info({ orderId: jobData.orderId }, `Generating PDF...`);
                const pdfBuffer = await new Promise((resolve, reject) => {
                    try {
                        const doc = new PDFDocument();
                        const buffers = [];
                        doc.on('data', buffers.push.bind(buffers));
                        doc.on('end', () => resolve(Buffer.concat(buffers)));
                        doc.on('error', reject);
                        // Simple PDF content - Customize this heavily!
                        doc.fontSize(18).text(jobData.productName || 'Generated Report', { align: 'center' }).moveDown();
                        doc.fontSize(10).text(`Order ID: ${jobData.orderId}`).moveDown();
                        doc.fontSize(12).text(llmResultText);
                        doc.end();
                    } catch (pdfError) { reject(pdfError); }
                });
                logger.info({ orderId: jobData.orderId, size: pdfBuffer.length }, `PDF generation complete.`);

                // --- 4. Upload PDF to S3 ---
                const s3Key = jobData.targetS3Key; // Use key generated by publisher
                logger.info({ orderId: jobData.orderId, bucket: S3_BUCKET_NAME, key: s3Key }, `Uploading report to S3...`);
                const uploadCommand = new PutObjectCommand({
                     Bucket: S3_BUCKET_NAME, Key: s3Key, Body: pdfBuffer, ContentType: 'application/pdf'
                });
                await s3Client.send(uploadCommand);
                logger.info({ orderId: jobData.orderId, key: s3Key }, `Successfully uploaded report to S3.`);

                // --- 5. Update Database ---
                logger.info({ orderId: jobData.orderId, productId: jobData.productId, key: s3Key }, `Updating database...`);
                // Update metadata on the specific order_line_item
                const updateQuery = `
                    UPDATE order_line_item
                    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('llm_status', 'completed', 's3_key', $1)
                    WHERE product_id = $2::text
                      AND id IN (SELECT item_id FROM order_item WHERE order_id = $3)
                    RETURNING id`; // Return the id to confirm the update worked
                const updateParams = [s3Key, jobData.productId, jobData.orderId];
                const updateResult = await db.query(updateQuery, updateParams);
                if (updateResult.rowCount > 0) {
                     logger.info({ orderId: jobData.orderId, productId: jobData.productId }, `Database updated successfully with S3 key.`);
                } else {
                     logger.warn({ jobData }, "[Worker] Could not find matching line item to update in database after processing.");
                     // This indicates a data inconsistency, but job succeeded otherwise
                }

                // --- 6. Acknowledge RabbitMQ Message ---
                rabbitChannel.ack(msg);
                const duration = Date.now() - processStartTime;
                logger.info({ jobData: { orderId: jobData.orderId, productId: jobData.productId }, durationMs: duration }, `[Worker] Job processed and acknowledged successfully.`);

            } catch (processingError) {
                logger.error({ err: processingError, jobData }, "[Worker] CRITICAL ERROR processing job message.");
                // Discard message on failure to prevent infinite loops on bad data/permanent errors
                // Implement dead-letter queue for retries if needed.
                rabbitChannel.nack(msg, false, false); // requeue = false
                logger.info({ jobData: { orderId: jobData?.orderId, productId: jobData?.productId } }, `[Worker] Job marked as NOT acknowledged (discarded) due to error.`);
            }
        }, {
            noAck: false // Manual acknowledgement
        });

    } catch (err) {
        logger.fatal({ err }, "[Worker] Failed to connect or setup RabbitMQ consumer. Exiting.");
        process.exit(1); // Exit if essential setup fails
    }
}

// --- Start the Worker ---
runWorker();

// --- Handle Graceful Shutdown ---
async function shutdown(signal) {
    logger.info(`[Worker] Received ${signal}. Shutting down gracefully...`);
    try {
        if (rabbitChannel) await rabbitChannel.close();
        if (rabbitConnection) await rabbitConnection.close();
        logger.info("[Worker] RabbitMQ connection closed.");
        await db.end(); // Close database pool
        logger.info("[Worker] Database pool closed.");
        process.exit(0);
    } catch (err) {
        logger.error({ err }, "[Worker] Error during shutdown.");
        process.exit(1);
    }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
