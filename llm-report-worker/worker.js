require('dotenv').config();

const amqp = require('amqplib');
const logger = require('./lib/logger');
const db = require('./config/db');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const renderReportToPDF = require('./lib/renderReportToPDF');
const fetchPrompts = require('./lib/fetchPrompts');
const callLLM = require('./lib/callLLM');
const { marked } = require('marked');

// --- Environment Variable Checks & Configuration ---
const AMQP_URL = process.env.AMQP_URL;
const WORKER_QUEUE = process.env.WORKER_QUEUE || 'llm_report_jobs';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID_ENV = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY_ENV = process.env.AWS_SECRET_ACCESS_KEY;

if (!AMQP_URL || !S3_BUCKET_NAME || !AWS_REGION || !AWS_ACCESS_KEY_ID_ENV || !AWS_SECRET_ACCESS_KEY_ENV) {
  logger.error('[Worker FATAL] Missing one or more required environment variables. Exiting.');
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
  let connection;
  try {
    connection = await amqp.connect(AMQP_URL);
    logger.info('[Worker] Connected to RabbitMQ successfully.');

    connection.on('error', (err) => { logger.error({ err }, '[Worker RabbitMQ] Connection error.'); });
    connection.on('close', () => {
      logger.warn('[Worker RabbitMQ] Connection closed. Exiting or attempting to reconnect...');
      process.exit(1);
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(WORKER_QUEUE, { durable: true });
    channel.prefetch(1);

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
          if (!jobData.productId || !jobData.orderId || !jobData.targetS3Key) {
            throw new Error('Missing essential fields (productId, orderId, targetS3Key) in job data.');
          }

          const productId = String(jobData.productId);
          const productMetaResult = await db.query(
            `SELECT report_title, report_subtitle, header_image_url, report_template, chart_key, brand, chart_image_url
             FROM products WHERE id = $1`,
            [productId]
          );

          if (!productMetaResult.rows.length) {
            throw new Error(`No metadata found for productId ${productId}`);
          }

          const meta = productMetaResult.rows[0];
          const templateFileName = meta.report_template || 'default_report_template.html';
          
          const context = {
            product_id: productId,
            report_title: meta.report_title,
            report_subtitle: meta.report_subtitle,
            header_image_url: meta.header_image_url,
            chart_key: meta.chart_key || null,
            uploaded_chart_url: meta.chart_image_url || null,
            template_file: templateFileName,
            brand: meta.brand || 'Default Brand Name',
            product_name: jobData.productName || meta.report_title || 'Untitled Report',
            user_name: jobData.userName || 'Valued Client',
            order_id: String(jobData.orderId),
            current_year: new Date().getFullYear(),
          };

          const prompts = await fetchPrompts(productId, context);
          const sectionResults = {};
          
          for (const [section, { text, model, systemMessage }] of Object.entries(prompts)) {
            // NOTE: You can uncomment the line below to skip LLM calls for faster testing
            // sectionResults[section] = `This is mock content for the ${section} section.`;
            
            // Comment out the block below to skip LLM calls during testing
            // -------------------------------------------------------------------
            logger.info(`[Worker] Generating LLM content for section: ${section} using model: ${model}`);
            let llmOutput = await callLLM(text, model, systemMessage);
            if (llmOutput && typeof llmOutput === 'string') {
                // Data cleaning logic here...
            }
            sectionResults[section] = marked.parse(String(llmOutput || ''));
            // -------------------------------------------------------------------
          }
          
          const pdfData = { ...context, ...sectionResults };
          
          const pdfBuffer = await renderReportToPDF(pdfData);
          logger.info('[Worker] PDF report rendered.');

          logger.info(`[Worker] Preparing to upload to S3. Bucket name being used: '${S3_BUCKET_NAME}'`);
          const uploadCommand = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: String(jobData.targetS3Key),
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          });
          await s3Client.send(uploadCommand);
          logger.info(`[Worker] PDF uploaded to S3: s3://${S3_BUCKET_NAME}/${jobData.targetS3Key}`);

          // --- FIX APPLIED HERE ---
          // The database update query is now correctly implemented.
          logger.info(`[Worker] Updating order line item for orderId: ${jobData.orderId}`);
          await db.query(
            `UPDATE order_line_item
             SET metadata = jsonb_set(
                            jsonb_set(COALESCE(metadata, '{}'::jsonb), '{llm_status}', '"completed"', true),
                            '{s3_key}', $1::jsonb, true
                          )
             WHERE product_id = $2::text
               AND id IN (SELECT item_id FROM order_item WHERE order_id = $3::text)`,
            [JSON.stringify(String(jobData.targetS3Key)), String(productId), String(jobData.orderId)]
          );
          logger.info('[Worker] Order line item updated.');

          channel.ack(msg);
          logger.info(`[Worker] ✅ Report for order ${jobData.orderId} (Product ID: ${productId}) processed successfully.`);

        } catch (err) {
          logger.error({
            err: err.message,
            stack: err.stack,
            jobData
          }, '[Worker] ❌ Job failed processing.');
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, '[Worker] Critical failure during setup or RabbitMQ connection.');
    process.exit(1);
  }

  const gracefulShutdown = async (signal) => { /* ... same as before ... */ };
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

runWorker();
