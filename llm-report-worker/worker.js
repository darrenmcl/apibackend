// llm-report-worker/worker.js
require('dotenv').config(); // See previous notes on dotenv in Docker

const amqp = require('amqplib');
const logger = require('./lib/logger'); // Assuming ./lib/logger.js exists
const db = require('./config/db'); // Assuming ./config/db.js exists and reads DB env vars
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'); // Ensure @aws-sdk/client-s3 is in package.json
const { v4: uuidv4 } = require('uuid');
const renderReportToPDF = require('./lib/renderReportToPDF'); // Assuming these libs exist
const fetchPrompts = require('./lib/fetchPrompts');
const callLLM = require('./lib/callLLM');
const { marked } = require('marked'); // Ensure 'marked' is in package.json

// --- Environment Variable Checks & Configuration ---
const AMQP_URL = process.env.AMQP_URL;
const WORKER_QUEUE = process.env.WORKER_QUEUE || 'llm_report_jobs';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION; // Expect this from docker-compose
const AWS_ACCESS_KEY_ID_ENV = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY_ENV = process.env.AWS_SECRET_ACCESS_KEY;

logger.info(`[Worker DEBUG] AMQP_URL: ${AMQP_URL}`);
logger.info(`[Worker DEBUG] WORKER_QUEUE: ${WORKER_QUEUE}`);
logger.info(`[Worker DEBUG] S3_BUCKET_NAME: ${S3_BUCKET_NAME}`);
logger.info(`[Worker DEBUG] AWS_REGION: ${AWS_REGION}`);
// Avoid logging keys, but check for presence during troubleshooting if needed
// logger.info(`[Worker DEBUG] AWS_ACCESS_KEY_ID set: ${!!AWS_ACCESS_KEY_ID_ENV}`);

if (!AMQP_URL || !S3_BUCKET_NAME || !AWS_REGION || !AWS_ACCESS_KEY_ID_ENV || !AWS_SECRET_ACCESS_KEY_ENV) {
  logger.error('[Worker FATAL] Missing one or more required environment variables (AMQP_URL, S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). Exiting.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID_ENV,
    secretAccessKey: AWS_SECRET_ACCESS_KEY_ENV,
  },
});

async function runWorker() {
  let connection; // Define connection here to access it in SIGINT/SIGTERM
  try {
    connection = await amqp.connect(AMQP_URL); // Use AMQP_URL
    logger.info('[Worker] Connected to RabbitMQ successfully.');

    connection.on('error', (err) => {
      logger.error({ err }, '[Worker RabbitMQ] Connection error.');
    });
    connection.on('close', () => {
      logger.warn('[Worker RabbitMQ] Connection closed. Exiting or attempting to reconnect...');
      // Implement robust reconnection or exit
      process.exit(1); // Simple exit
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(WORKER_QUEUE, { durable: true });
    channel.prefetch(1); // Process one message at a time

    logger.info(`[Worker] Listening for jobs on queue: ${WORKER_QUEUE}`);

    channel.consume(
      WORKER_QUEUE,
      async (msg) => {
        if (!msg) {
          logger.warn('[Worker] Received null message (consumer cancelled).');
          return;
        }

        let jobData;
        const messageContentString = msg.content.toString();
        logger.info(`[Worker] Job received (raw): ${messageContentString}`);

        try {
          jobData = JSON.parse(messageContentString);
          logger.info('[Worker] Job data parsed:', jobData);

          // Validate essential jobData fields
          if (!jobData.productId || !jobData.orderId || !jobData.targetS3Key) {
            throw new Error('Missing essential fields (productId, orderId, targetS3Key) in job data.');
          }

          const productId = String(jobData.productId);
          const productMetaResult = await db.query( // Ensure your db module handles connections
            `SELECT report_title, report_subtitle, header_image_url, template_file, chart_key, brand
             FROM products
             WHERE id = $1`,
            [productId]
          );

          if (!productMetaResult.rows.length) {
            throw new Error(`No metadata found for productId ${productId}`);
          }

          const meta = productMetaResult.rows[0];
          const templateFileName = meta.template_file || 'report-template-enhanced.html';
          logger.info(`[Worker] Using template file: ${templateFileName}`);

          const context = {
            product_id: productId,
            report_title: meta.report_title,
            report_subtitle: meta.report_subtitle,
            header_image_url: meta.header_image_url,
            chart_key: meta.chart_key || 'ecommerce',
            template_file: templateFileName,
            brand: meta.brand || 'Performance Marketing Group',
            product_name: jobData.productName || 'Untitled Report',
            user_name: jobData.userName || 'Valued Client',
            order_id: String(jobData.orderId), // Ensure it's a string for DB query
          };

          const prompts = await fetchPrompts(productId, context);
          logger.info('[Worker] Prompts fetched.');

          const sectionResults = {};
          for (const [section, { text, model, systemMessage }] of Object.entries(prompts)) {
            logger.info(`[Worker] Generating LLM content for section: ${section} using model: ${model}`);
            const llmOutput = await callLLM(text, model, systemMessage);
            sectionResults[section] = marked.parse(llmOutput); // Ensure 'marked' is installed
          }
          logger.info('[Worker] All LLM sections generated.');

          const pdfBuffer = await renderReportToPDF({
            ...context,
            ...sectionResults,
          });
          logger.info('[Worker] PDF report rendered.');

          const uploadCommand = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: String(jobData.targetS3Key), // Ensure this is a string
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          });

          await s3Client.send(uploadCommand);
          logger.info(`[Worker] PDF uploaded to S3: s3://${S3_BUCKET_NAME}/${jobData.targetS3Key}`);

          logger.info({
             targetS3Key: String(jobData.targetS3Key),
             productId: String(productId),
             orderId: String(jobData.orderId)
          }, '[Worker] Updating order_line_item...');

          await db.query(
            `UPDATE order_line_item
             SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{llm_status}', '"completed"', true) || 
                          jsonb_set(COALESCE(metadata, '{}'::jsonb), '{s3_key}', $1::jsonb, true)
             WHERE product_id = $2::text 
               AND id IN (SELECT item_id FROM order_item WHERE order_id = $3::text)`,
            [JSON.stringify(String(jobData.targetS3Key)), String(productId), String(jobData.orderId)]
          );
          // Note: Storing s3_key as text, so $1::jsonb should be `to_jsonb($1::text)` or ensure $1 is proper json string.
          // Simpler for text: metadata = jsonb_build_object('llm_status', 'completed', 's3_key', $1::text) if overwriting metadata,
          // or more complex merge if appending.
          // Corrected above assuming you want to add/update specific keys in existing metadata.
          // Using jsonb_set for updating specific keys without overwriting others.
          // Ensure $1 for s3_key is passed as a JSON string if using jsonb_set with a jsonb value, or use to_jsonb($1::text).
          // For simplicity if s3_key is just text:
          // await db.query(
          // `UPDATE order_line_item
          //  SET metadata = COALESCE(metadata, '{}'::jsonb) || 
          //                 jsonb_build_object('llm_status', 'completed', 's3_key', $1::TEXT)
          //  WHERE product_id = $2::TEXT
          //    AND id IN (SELECT item_id FROM order_item WHERE order_id = $3::TEXT)`,
          //  [String(jobData.targetS3Key), String(productId), String(jobData.orderId)]
          // );


          channel.ack(msg);
          logger.info(`[Worker] ✅ Report for order ${jobData.orderId} (Product ID: ${productId}) processed successfully.`);

        } catch (err) {
          logger.error({
            err: err.message,
            stack: err.stack,
            jobData
          }, '[Worker] ❌ Job failed processing.');
          // Nack the message and tell RabbitMQ not to requeue it (false)
          // It will be discarded or sent to a Dead Letter Exchange if configured.
          channel.nack(msg, false, false);
        }
      },
      { noAck: false } // We handle ack/nack manually
    );
  } catch (err) {
    logger.error({ err }, '[Worker] Failed to connect to RabbitMQ or setup channel.');
    process.exit(1);
  }

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`[Worker] ${signal} received, shutting down gracefully...`);
    if (connection) {
      try {
        await connection.close();
        logger.info('[Worker] RabbitMQ connection closed.');
      } catch (closeErr) {
        logger.error({ err: closeErr }, '[Worker] Error closing RabbitMQ connection.');
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

runWorker();
