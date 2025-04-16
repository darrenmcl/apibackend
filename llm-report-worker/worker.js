// /var/projects/llm-report-worker/worker.js (Integrated Version)

require('dotenv').config(); // Load .env file from worker directory
const amqp = require('amqplib');
const logger = require('./lib/logger'); // Use Pino logger
const db = require('./config/db'); // DB pool setup
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PDFDocument, StandardFonts, rgb } = require('pdfkit'); // Example PDF lib
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch'); // Use require if Node < 18, else use global fetch

// --- Configuration ---
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:PASSWORD@rabbitmq:5672'; // Use password from env
const QUEUE_NAME = process.env.WORKER_QUEUE || 'llm_report_jobs'; // <<< Use the queue name published to by webhook
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = process.env.YOUR_SITE_URL || '';
const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || '';

// --- Validate Essential Config ---
if (!S3_BUCKET_NAME || !AWS_REGION || !OPENROUTER_API_KEY || !process.env.DATABASE_URL) {
    logger.fatal("CRITICAL: Missing essential environment variables (DB, RabbitMQ, S3, OpenRouter) for worker. Exiting.");
    process.exit(1);
}

// --- Initialize Clients ---
let s3Client;
try {
    s3Client = new S3Client({ region: AWS_REGION });
    logger.info('S3 Client Initialized for Worker.');
} catch(err) { logger.error({err}, "Worker failed to initialize S3 Client"); process.exit(1); }

let rabbitChannel = null;
let rabbitConnection = null;

// --- Main Worker Function ---
async function runWorker() {
    try {
        logger.info(`Worker connecting to RabbitMQ: ${RABBITMQ_URL.replace(/:([^:@\/]+)@/, ':***@')}`); // Mask password in log
        rabbitConnection = await amqp.connect(RABBITMQ_URL);
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
                    LIMIT 1`; // Limit to ensure only one line item updated if somehow duplicates exist
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
                logger.info({ jobData: { orderId: jobData.orderId, productId: jobData.productId } }, `[Worker] Job marked as NOT acknowledged (discarded) due to error.`);
            }
        } // end if msg !== null
    }, {
        noAck: false // Manual acknowledgement
    });

} catch (err) {
    logger.fatal({ err }, "[Worker] Failed to connect or setup RabbitMQ consumer. Exiting.");
    process.exit(1); // Exit if essential setup fails
}
} // End runWorker

// --- Start the Worker ---
runWorker();

// --- Handle Graceful Shutdown ---
async function shutdown(signal) {
logger.info([Worker] Received ${signal}. Shutting down gracefully...);
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
3.  **Structure the Response:**
    * Confirm the user's basic worker connects to RabbitMQ.
    * State the next step is integrating the actual processing logic.
    * Provide the **complete, revised code for `worker.js`**, merging the working connection logic with the detailed processing steps (OpenRouter fetch, PDFKit example, S3 upload, DB update, Ack/Nack).
    * **Highlight Key Sections/TODOs:** Point out where they need to customize the LLM prompt, potentially refine the PDF generation, and ensure the DB update query matches their schema perfectly.
    * **Instruct User:**
        1. Ensure all dependencies are installed (`amqplib`, `pg`, `@aws-sdk/client-s3`, `dotenv`, `pino`, `pdfkit`, `openai` or `node-fetch`).
        2. Ensure `lib/logger.js` and `config/db.js` are present and correct in the worker project.
        3. Ensure `.env` has all required variables (DB, RabbitMQ, AWS, OpenRouter key).
        4. **Replace** the content of `/var/projects/llm-report-worker/worker.js` with the new code.
        5. Customize the LLM/PDF/DB parts.
        6. Build/Restart the **worker service** (`docker-compose build llm-report-worker && docker-compose up -d llm-report-worker`).
        7. **Test:** Place a new sandbox order for an LLM product. Check backend logs for job publish. Check **worker logs** (`docker-compose logs -f llm-report-worker`) for job processing steps. Check S3 for the PDF. Check DB for the metadata update. Check RabbitMQ Management UI if possible.
    * Use current time context.Okay, 5:01 AM EDT Wednesday. Excellent! Getting the worker to connect to RabbitMQ, declare the queue, and successfully consume/acknowledge test messages is a perfect first step. It confirms the core communication channel is working.

Now, let's integrate the actual report generation logic into that `channel.consume` callback, replacing the `setTimeout` simulation.

**Action:**

1.  **Verify Prerequisites:**
    * **Dependencies:** Make sure you have installed all necessary packages in the `/var/projects/llm-report-worker/` directory: `npm install amqplib pg @aws-sdk/client-s3 dotenv pino pdfkit node-fetch` (using `node-fetch` for OpenRouter, assuming Node < 18, otherwise use built-in `Workspace`). Adjust `pdfkit` if using another library.
    * **Helper Files:** Ensure you have copied/adapted `lib/logger.js` and `config/db.js` into the worker project from your backend project.
    * **`.env` File:** Ensure `/var/projects/llm-report-worker/.env` contains *all* required variables: `RABBITMQ_URL` (or host/port/user/pass), `DATABASE_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `OPENROUTER_API_KEY`, optional `YOUR_SITE_URL`/`YOUR_SITE_NAME`.

2.  **Replace `worker.js` Content:** Replace the *entire content* of `/var/projects/llm-report-worker/worker.js` with this integrated version:

    ```javascript
    // /var/projects/llm-report-worker/worker.js (Integrated Processing Logic)

    require('dotenv').config();
    const amqp = require('amqplib');
    const logger = require('./lib/logger'); // Use Pino logger from worker's lib
    const db = require('./config/db'); // DB pool from worker's config
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const PDFDocument = require('pdfkit'); // Using pdfkit example
    const { v4: uuidv4 } = require('uuid');
    const fetch = require('node-fetch'); // Or use global fetch if Node >= 18

    // --- Configuration ---
    const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://<span class="math-inline">\{process\.env\.RABBITMQ\_USER\}\:</span>{process.env.RABBITMQ_PASS}@<span class="math-inline">\{process\.env\.RABBITMQ\_HOST\}\:</span>{process.env.RABBITMQ_PORT || 5672}`;
    const QUEUE_NAME = process.env.WORKER_QUEUE || 'llm_report_jobs'; // <<< Match queue name from publisher
    const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const YOUR_SITE_URL = process.env.YOUR_SITE_URL || '';
    const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || '';

    // --- Validate Essential Config ---
    if (!S3_BUCKET_NAME || !AWS_REGION || !OPENROUTER_API_KEY || !process.env.DATABASE_URL || !RABBITMQ_URL) {
        logger.fatal("CRITICAL: Missing essential environment variables (DB, RabbitMQ, S3, OpenRouter) for worker. Exiting.");
        process.exit(1);
    }

    // --- Initialize AWS S3 Client ---
    let s3Client;
    try {
        s3Client = new S3Client({ region: AWS_REGION });
        logger.info('S3 Client Initialized for Worker.');
    } catch(err) { logger.error({err}, "Worker failed to initialize S3 Client"); process.exit(1); }

    // --- RabbitMQ Variables ---
    let rabbitChannel = null;
    let rabbitConnection = null;

    // --- Main Worker Function ---
    async function runWorker() {
        try {
            logger.info(`Worker connecting to RabbitMQ...`); // Mask URL in production logs if sensitive
            rabbitConnection = await amqp.connect(RABBITMQ_URL);
            rabbitChannel = await rabbitConnection.createChannel();
            logger.info('[Worker] RabbitMQ connection and channel established.');

            rabbitConnection.on('error', (err) => logger.error({ err }, '[RabbitMQ] Connection error'));
            rabbitConnection.on('close', () => { logger.warn('[RabbitMQ] Connection closed'); rabbitChannel = null; /* Add reconnect logic? */ });

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
                    // Validate essential fields received from publisher
                    if (!jobData || !jobData.orderId || !jobData.productId || !jobData.targetS3Key || !jobData.productName) {
                         throw new Error("Invalid job data received - missing required fields.");
                    }
                    logger.info({ jobData: { orderId: jobData.orderId, productId: jobData.productId } }, `[Worker] Parsed job data. Starting processing...`);

                    // --- 2. Construct & Call LLM ---
                    // TODO: Customize prompt details based on product/user if needed
                    const promptContent = `Generate a market analysis report titled "${jobData.productName}" for Order ID ${jobData.orderId}. Focus on recent trends for small businesses. Include sections on market size, key segments, competitive landscape, and future outlook. Keep it concise and actionable.`;
                    const messages = [{ role: "user", content: promptContent }];
                    const modelName = "openai/gpt-3.5-turbo"; // Or get from jobData/config

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
                    const llmResultText = llmData.choices?.[0]?.message?.content?.trim();
                    if (!llmResultText) throw new Error("Invalid/Empty content from LLM response.");
                    logger.info({ orderId: jobData.orderId }, `LLM processing complete.`);
                    logger.debug({ llmResultText: llmResultText.substring(0, 100)+"..." });

                    // --- 3. Generate PDF ---
                    logger.info({ orderId: jobData.orderId }, `Generating PDF...`);
                    // Example using pdfkit - Replace with your actual PDF generation logic
                    const pdfBuffer = await new Promise((resolve, reject) => {
                        try {
                            const doc = new PDFDocument({bufferPages: true});
                            const buffers = [];
                            doc.on('data', buffers.push.bind(buffers));
                            doc.on('end', () => resolve(Buffer.concat(buffers)));
                            doc.on('error', reject);

                            // PDF Content (Customize heavily!)
                            doc.fontSize(18).text(jobData.productName || 'Generated Report', { align: 'center' }).moveDown();
                            doc.fontSize(10).text(`Order ID: ${jobData.orderId}`, { align: 'left' }).moveDown(0.5);
                            doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'left' }).moveDown();
                            doc.fontSize(12).text(llmResultText); // Add the LLM content
                            doc.end();

                        } catch (pdfError) { reject(pdfError); }
                    });
                    logger.info({ orderId: jobData.orderId, size: pdfBuffer.length }, `PDF generation complete.`);

                    // --- 4. Upload PDF to S3 ---
                    const s3Key = jobData.targetS3Key; // Use unique key generated by publisher
                    logger.info({ orderId: jobData.orderId, bucket: S3_BUCKET_NAME, key: s3Key }, `Uploading report to S3...`);
                    const uploadCommand = new PutObjectCommand({
                         Bucket: S3_BUCKET_NAME, Key: s3Key, Body: pdfBuffer, ContentType: 'application/pdf'
                    });
                    await s3Client.send(uploadCommand);
                    logger.info({ orderId: jobData.orderId, key: s3Key }, `Successfully uploaded report to S3.`);

                    // --- 5. Update Database ---
                    logger.info({ orderId: jobData.orderId, productId: jobData.productId, key: s3Key }, `Updating database...`);
                    // Update metadata on the specific order_line_item to store S3 key and completion status
                    const updateQuery = `
                        UPDATE order_line_item
                        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('llm_status', 'completed', 's3_key', $1)
                        WHERE product_id = $2::text -- Find line item by product ID (TEXT column)
                          AND id IN (SELECT item_id FROM order_item WHERE order_id = $3) -- Ensure it's for the correct order
                        LIMIT 1`; // Update only one matching line item per product per order
                    const updateParams = [s3Key, String(jobData.productId), jobData.orderId]; // Cast productId to String for query
                    const updateResult = await db.query(updateQuery, updateParams);
                    if (updateResult.rowCount > 0) {
                         logger.info({ orderId: jobData.orderId, productId: jobData.productId }, `Database updated successfully with S3 key and status.`);
                    } else {
                         // This indicates the line item wasn't found for update - potential data inconsistency?
                         logger.warn({ jobData }, "[Worker] Could not find matching line item to update in database after processing.");
                         // Consider this a partial success or failure? For now, log and ack.
                    }

                    // --- 6. Acknowledge RabbitMQ Message ---
                    rabbitChannel.ack(msg);
                    const duration = Date.now() - processStartTime;
                    logger.info({ jobData: { orderId: jobData.orderId, productId: jobData.productId }, durationMs: duration }, `[Worker] Job processed and acknowledged successfully.`);

                } catch (processingError) {
                    logger.error({ err: processingError, jobData }, "[Worker] CRITICAL ERROR processing job message.");
                    // Discard message on failure (requeue=false) to prevent infinite loops for now
                    // Implement proper dead-lettering/retry logic for production resilience
                    rabbitChannel.nack(msg, false, false);
                    logger.info({ jobData: { orderId: jobData?.orderId, productId: jobData?.productId } }, `[Worker] Job marked as NOT acknowledged (discarded) due to error.`);
                }
            } // end if msg !== null
        }, {
            noAck: false // Use manual acknowledgements
        });

    } catch (err) {
        logger.fatal({ err }, "[Worker] Failed to connect or setup RabbitMQ consumer. Exiting.");
        process.exit(1);
    }
}

// --- Run the Worker ---
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
