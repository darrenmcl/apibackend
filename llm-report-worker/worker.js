require('dotenv').config();
const amqp = require('amqplib');
const logger = require('./lib/logger');
const db = require('./config/db');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const renderReportToPDF = require('./lib/renderReportToPDF');
const fetchPrompts = require('./lib/fetchPrompts');
const callLLM = require('./lib/callLLM');
const { marked } = require('marked');

const QUEUE_NAME = process.env.WORKER_QUEUE || 'llm_report_jobs';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function runWorker() {
  const connection = await amqp.connect({
    hostname: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    username: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASS || 'guest',
  });

  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);

  logger.info(`[Worker] Listening on ${QUEUE_NAME}`);

  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (!msg) return;

      const jobData = JSON.parse(msg.content.toString());
      logger.info('[Worker] Job received:', jobData);

      try {
        const productId = String(jobData.productId);
        const productMeta = await db.query(
          `SELECT report_title, report_subtitle, header_image_url, template_file, chart_key, brand
           FROM products
           WHERE id = $1`,
          [productId]
        );

        if (!productMeta.rows.length) {
          throw new Error(`No metadata found for productId ${productId}`);
        }

        const meta = productMeta.rows[0];
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
          order_id: String(jobData.orderId) || uuidv4(),
        };

        const prompts = await fetchPrompts(productId, context);

        const sectionResults = {};
        for (const [section, { text, model, systemMessage }] of Object.entries(prompts)) {
          logger.info(`[Worker] Fetching section: ${section} using ${model}`);
          const llmOutput = await callLLM(text, model, systemMessage);
          sectionResults[section] = marked.parse(llmOutput);
        }

        const pdfBuffer = await renderReportToPDF({
          ...context,
          ...sectionResults,
        });

        const uploadCommand = new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: String(jobData.targetS3Key),
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        });

        await s3Client.send(uploadCommand);

        logger.info({
          targetS3Key: typeof jobData.targetS3Key + ': ' + String(jobData.targetS3Key),
          productId: typeof productId + ': ' + String(productId),
          orderId: typeof jobData.orderId + ': ' + String(jobData.orderId)
        }, '[Worker] Debug params before query');

        await db.query(
          `UPDATE order_line_item
           SET metadata = jsonb_build_object('llm_status', 'completed', 's3_key', $1::text)
           WHERE product_id = $2::text
             AND id IN (SELECT item_id FROM order_item WHERE order_id = $3::text)`,
          [String(jobData.targetS3Key), String(productId), String(jobData.orderId)]
        );

        channel.ack(msg);
        logger.info(`[Worker] ✅ Report for order ${jobData.orderId} completed.`);
      } catch (err) {
        logger.error({ err }, '[Worker] ❌ Job failed. Message discarded.');
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

runWorker();

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
