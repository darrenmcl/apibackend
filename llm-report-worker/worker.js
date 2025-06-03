require('dotenv').config();

const amqp = require('amqplib');
const logger = require('./lib/logger');
const db = require('./config/db');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { v4: uuidv4 } = require('uuid'); // uuidv4 was imported but not used, can be removed if not needed elsewhere
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

logger.info(`[Worker DEBUG] AMQP_URL: ${AMQP_URL}`);
logger.info(`[Worker DEBUG] WORKER_QUEUE: ${WORKER_QUEUE}`);
logger.info(`[Worker DEBUG] S3_BUCKET_NAME: ${S3_BUCKET_NAME}`);
logger.info(`[Worker DEBUG] AWS_REGION: ${AWS_REGION}`);

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

    connection.on('error', (err) => {
      logger.error({ err }, '[Worker RabbitMQ] Connection error.');
    });
    connection.on('close', () => {
      logger.warn('[Worker RabbitMQ] Connection closed. Attempting to reconnect or exiting...');
      process.exit(1); // Consider a robust reconnection strategy for production
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
          logger.info('[Worker] Job data parsed:', jobData);

          if (!jobData.productId || !jobData.orderId || !jobData.targetS3Key) {
            throw new Error('Missing essential fields (productId, orderId, targetS3Key) in job data.');
          }

          const productId = String(jobData.productId);
          const productMetaResult = await db.query(
            `SELECT report_title, report_subtitle, header_image_url, template_file, chart_key, brand, chart_image_url
             FROM products
             WHERE id = $1`,
            [productId]
          );

          if (!productMetaResult.rows.length) {
            throw new Error(`No metadata found for productId ${productId}`);
          }

          const meta = productMetaResult.rows[0];
          const templateFileName = meta.template_file || 'report_template_performance.html'; // Default template
          logger.info(`[Worker] Using template file: ${templateFileName} for product ID: ${productId}`);

          const reportYear = new Date().getFullYear(); // Or get from jobData/context if specific to report
          const context = {
            product_id: productId,
            report_title: meta.report_title,
            report_subtitle: meta.report_subtitle,
            header_image_url: meta.header_image_url,
            chart_key: meta.chart_key || 'ecommerce',
            uploaded_chart_url: meta.chart_image_url || null,
            template_file: templateFileName,
            brand: meta.brand || 'Default Brand Name', // Ensure a sensible default
            product_name: jobData.productName || meta.report_title || 'Untitled Report',
            user_name: jobData.userName || 'Valued Client',
            order_id: String(jobData.orderId),
            current_year: reportYear, // Provide current year for context if LLM needs it
            // Add any other contextual data LLM might need, like specific market (e.g., "US Market")
          };

          if (context.uploaded_chart_url) {
            logger.info(`[Worker] Found pre-generated chart URL for product ${productId}: ${context.uploaded_chart_url}`);
          } else {
            logger.warn(`[Worker] No pre-generated chart URL found for product ${productId}. Chart display relies on dynamic generation or will show 'unavailable'.`);
          }

          const prompts = await fetchPrompts(productId, context); // fetchPrompts interpolates context into prompt_text
          logger.info('[Worker] Prompts fetched. Section keys: ' + Object.keys(prompts).join(', '));

          const sectionResults = {};
          for (const [section, { text, model, systemMessage }] of Object.entries(prompts)) {
            logger.info(`[Worker] Generating LLM content for section: ${section} using model: ${model}`);
            let llmOutput = await callLLM(text, model, systemMessage); // 'text' here is the fully interpolated prompt for the section

            // --- DATA CLEANING STEP for LLM Output ---
            if (llmOutput && typeof llmOutput === 'string') {
              const originalLength = llmOutput.length;
              let cleanedOutput = llmOutput;
              const originalOutputForLogging = llmOutput;

              // Rule 1: Remove specific known problematic HTML/text fragments
              cleanedOutput = cleanedOutput.replace(/}\s*" alt="Market Trend Chart"[^>]+\/>/g, '');
              cleanedOutput = cleanedOutput.replace(/\s*=\s*Metal Comparison/g, '');
              // Add any other report-specific fragments you find

              // Rule 2: Remove common LLM self-referential phrases / knowledge cutoffs
              const llmTellsPatterns = [
                /As of my last knowledge update(?: in [a-zA-Z]+ \d{4})?,?/gi,
                /As of my last update(?: in [a-zA-Z]+ \d{4})?,?/gi,
                /My knowledge cutoff is [a-zA-Z]+ \d{4}\.?/gi,
                /As of [a-zA-Z]+ \d{4}, my knowledge is current up to that point\.?/gi,
                /As an AI language model, I(?: do not| don't) have real-time information\.?/gi,
                /As an AI, I(?: do not| don't) have access to real-time data\.?/gi,
                /I am an AI and(?: do not| don't) have real-time data\.?/gi,
                /Please note that as an AI, my information is based on data up to \d{4}\.?/gi,
                /I cannot provide real-time data or information past my last update in \d{4}\.?/gi,
                /^Keep in mind that this information is based on data available up to \d{4}\.?\s*/gmi, // If it starts a paragraph
                // More generic patterns:
                /My last update was in \d{4}\.?/gi,
                /My knowledge extends to \d{4}\.?/gi,
              ];
              llmTellsPatterns.forEach(pattern => {
                cleanedOutput = cleanedOutput.replace(pattern, '');
              });

              // Rule 3: Remove leading/trailing curly braces from the whole output (if they are LLM artifacts)
              let trimmedOutput = cleanedOutput.trim();
              if (trimmedOutput.startsWith('{') && trimmedOutput.endsWith('}')) {
                // Only remove if it seems to be wrapping the entire content block
                const innerContent = trimmedOutput.substring(1, trimmedOutput.length - 1).trim();
                if (!innerContent.includes('{') && !innerContent.includes('}')) { // Basic check to avoid stripping legitimate JSON-like content
                    logger.info(`[Worker] Removing wrapping curly braces for section's entire output: ${section}`);
                    trimmedOutput = innerContent;
                }
              }
              cleanedOutput = trimmedOutput;

              // Rule 4: Clean up excessive whitespace/newlines possibly left by replacements
              cleanedOutput = cleanedOutput.replace(/^\s*\n+/gm, ''); // Remove leading blank lines (multi-line mode)
              cleanedOutput = cleanedOutput.replace(/\n\s*$/gm, ''); // Remove trailing blank lines (multi-line mode)
              cleanedOutput = cleanedOutput.replace(/\n{3,}/g, '\n\n'); // Reduce 3+ newlines to 2
              cleanedOutput = cleanedOutput.trim(); // Final trim

              if (cleanedOutput.length !== originalLength) {
                logger.info(`[Worker] Cleaned LLM output for section: ${section}. Original length: ${originalLength}, New length: ${cleanedOutput.length}.`);
                // For very detailed debugging:
                // logger.debug(`[Worker] Section ${section} BEFORE all cleaning: [${originalOutputForLogging}]`);
                // logger.debug(`[Worker] Section ${section} AFTER all cleaning: [${cleanedOutput}]`);
              }
              llmOutput = cleanedOutput;
            }
            // --- END DATA CLEANING STEP ---
            
            sectionResults[section] = marked.parse(String(llmOutput || ''));
          }
          logger.info('[Worker] All LLM sections generated. Keys in sectionResults: ' + Object.keys(sectionResults).join(', '));

          const pdfData = {
            ...context,
            ...sectionResults,
          };
          
          const pdfBuffer = await renderReportToPDF(pdfData);
          logger.info('[Worker] PDF report rendered.');

          const uploadCommand = new PutObjectCommand({ /* ... S3 params ... */ });
          await s3Client.send(uploadCommand);
          logger.info(`[Worker] PDF uploaded to S3: s3://${S3_BUCKET_NAME}/${jobData.targetS3Key}`);

          await db.query( /* ... DB update query ... */ );
          logger.info('[Worker] Order line item updated.');

          channel.ack(msg);
          logger.info(`[Worker] ✅ Report for order ${jobData.orderId} (Product ID: ${productId}) processed successfully.`);

        } catch (err) {
          logger.error({ err: err.message, stack: err.stack, jobData }, '[Worker] ❌ Job failed processing.');
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, '[Worker] Critical failure during setup or RabbitMQ connection.');
    process.exit(1);
  }

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
    setTimeout(() => process.exit(0), 500); // Give time for logs to flush
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

runWorker();
