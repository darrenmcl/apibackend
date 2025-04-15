// /var/projects/llm-report-worker/worker.js

require('dotenv').config(); // Load environment variables
const amqp = require('amqplib');
const logger = require('../lib/logger'); // Your Pino logger setup
const db = require('./config/db'); // Your DB pool setup
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { PDFDocument } = require('pdfkit'); // Example PDF lib
// const OpenAI = require('openai'); // Example LLM lib

// --- Configuration ---
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'llm_report_jobs';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
// const LLM_API_KEY = process.env.YOUR_LLM_API_KEY; // Example

// --- Initialize Clients (Ensure proper error handling) ---
let s3Client;
try {
    s3Client = new S3Client({ region: AWS_REGION });
    logger.info('S3 Client Initialized for Worker.');
} catch(err) { logger.error({err}, "Worker failed to initialize S3 Client"); process.exit(1); }

// let llmClient;
// try {
//     llmClient = new OpenAI({ apiKey: LLM_API_KEY }); // Example
//     logger.info('LLM Client Initialized for Worker.');
// } catch(err) { logger.error({err}, "Worker failed to initialize LLM Client"); process.exit(1); }


let rabbitChannel = null;

// --- Main Worker Function ---
async function runWorker() {
    try {
        logger.info(`Worker connecting to RabbitMQ: ${RABBITMQ_URL}`);
        const connection = await amqp.connect(RABBITMQ_URL);
        rabbitChannel = await connection.createChannel();
        logger.info('[Worker] RabbitMQ connection and channel established.');

        // Ensure queue exists and is durable
        await rabbitChannel.assertQueue(QUEUE_NAME, { durable: true });

        // Process only one message at a time from the queue
        rabbitChannel.prefetch(1);

        logger.info(`[Worker] Waiting for messages in queue: ${QUEUE_NAME}. To exit press CTRL+C`);

        rabbitChannel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                let jobData;
                try {
                    const messageContent = msg.content.toString();
                    logger.info(`[Worker] Received job message.`);
                    logger.debug({ messageContent }, "Raw message content");
                    jobData = JSON.parse(messageContent);
                    logger.info({ jobData }, `[Worker] Parsed job data.`);

                    // --- Placeholder for Processing Logic ---
                    logger.info(`[Worker] Starting processing for Order: ${jobData.orderId}, Product: ${jobData.productId}`);

                    // TODO: 1. Fetch any additional needed data (e.g., prompt specifics from DB?)
                    // TODO: 2. Call LLM API (e.g., await llmClient.chat.completions.create(...))
                    const llmResult = { summary: "LLM generation successful (simulated).", reportText: `Report for ${jobData.productName} Order ${jobData.orderId}` }; // Placeholder
                    logger.info(`[Worker] LLM processing complete (simulated).`);

                    // TODO: 3. Generate PDF (e.g., using pdfkit)
                    const pdfBuffer = Buffer.from(`PDF Content: ${llmResult.reportText}`); // Placeholder PDF buffer
                    logger.info(`[Worker] PDF generation complete (simulated).`);

                    // TODO: 4. Upload PDF to S3
                    const s3Key = jobData.targetS3Key || `digital-downloads/reports/fallback_${uuidv4()}.pdf`; // Use target key from message
                    logger.info(`[Worker] Uploading report to S3: Bucket=<span class="math-inline">\{S3\_BUCKET\_NAME\}, Key\=</span>{s3Key}`);
                    const uploadCommand = new PutObjectCommand({
                         Bucket: S3_BUCKET_NAME,
                         Key: s3Key,
                         Body: pdfBuffer,
                         ContentType: 'application/pdf'
                    });
                    await s3Client.send(uploadCommand);
                    logger.info(`[Worker] Successfully uploaded report to S3.`);

                    // TODO: 5. Update Database (e.g., order_line_item metadata)
                    logger.info(`[Worker] Updating database for Order: ${jobData.orderId}, Product: ${jobData.productId}`);
                    const updateQuery = `
                        UPDATE order_line_item
                        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('llm_status', 'completed', 's3_key', $1)
                        WHERE product_id = $2::text
                        AND id IN (SELECT item_id FROM order_item WHERE order_id = $3)
                        LIMIT 1`; // Limit update just in case
                    const updateResult = await db.query(updateQuery, [s3Key, jobData.productId, jobData.orderId]);
                    if (updateResult.rowCount > 0) {
                         logger.info(`[Worker] Database updated successfully with S3 key.`);
                    } else {
                         logger.warn({ jobData }, "[Worker] Could not find matching line item to update in database after processing.");
                         // This might indicate an issue, but we'll still ack the message
                    }

                    // 6. Acknowledge the message (mark as processed)
                    rabbitChannel.ack(msg);
                    logger.info({ jobData }, `[Worker] Job processed and acknowledged successfully.`);

                } catch (processingError) {
                    logger.error({ err: processingError, jobData }, "[Worker] CRITICAL ERROR processing job message.");
                    // Decide how to handle failure: nack(requeue) or nack(discard) or move to dead-letter queue?
                    // For now, discard the message after logging to prevent infinite loops on bad data/permanent errors.
                    rabbitChannel.nack(msg, false, false); // msg, allUpTo, requeue=false
                    logger.info({ jobData }, `[Worker] Job marked as NOT acknowledged (discarded) due to error.`);
                    // TODO: Implement more robust error handling/retries/dead-lettering
                }
            } else {
                 logger.warn("[Worker] Received null message (queue might have been cancelled).");
             }
        }, {
            noAck: false // Ensure we manually acknowledge messages
        });

    } catch (err) {
        logger.error({ err }, "[Worker] Failed to connect or setup RabbitMQ consumer. Exiting.");
        process.exit(1); // Exit if connection fails on startup
    }
}

// --- Run the Worker ---
runWorker();

// Optional: Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info("[Worker] SIGINT received, shutting down gracefully...");
    try {
         if (rabbitChannel) await rabbitChannel.close();
         const connection = rabbitChannel?.connection; // Get connection from channel if possible
         if (connection) await connection.close();
         logger.info("[Worker] RabbitMQ connection closed.");
         await db.end(); // Close database pool
         logger.info("[Worker] Database pool closed.");
    } catch (err) {
         logger.error({ err }, "[Worker] Error during shutdown.");
    }
    process.exit(0);
});
