// /var/projects/llm-report-worker/worker.js (Updated Version)

require('dotenv').config();
const amqp = require('amqplib');
const logger = require('./lib/logger');
const db = require('./config/db');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const renderReportToPDF = require('./lib/renderReportToPDF');

const fetch = globalThis.fetch || require('node-fetch');

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT || '5672');
const RABBITMQ_USER = process.env.RABBITMQ_USER || 'admin';
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || 'PASSWORD';
const QUEUE_NAME = process.env.WORKER_QUEUE || 'llm_report_jobs';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = process.env.YOUR_SITE_URL || '';
const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || 'PMG Research';

if (!S3_BUCKET_NAME || !AWS_REGION || !OPENROUTER_API_KEY) {
    logger.fatal("Missing required environment variables.");
    process.exit(1);
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function callLLM(prompt) {
  const model = 'openai/gpt-3.5-turbo';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      ...(YOUR_SITE_URL && { 'HTTP-Referer': YOUR_SITE_URL }),
      ...(YOUR_SITE_NAME && { 'X-Title': YOUR_SITE_NAME })
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function runWorker() {
  const connection = await amqp.connect({
    hostname: RABBITMQ_HOST,
    port: RABBITMQ_PORT,
    username: RABBITMQ_USER,
    password: RABBITMQ_PASS
  });
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);

  logger.info(`[Worker] Listening on ${QUEUE_NAME}`);

  channel.consume(QUEUE_NAME, async msg => {
    if (!msg) return;

    const jobData = JSON.parse(msg.content.toString());
    logger.info(`[Worker] Job received: ${JSON.stringify(jobData)}`);

    try {
      const prompts = {
        executive_summary: `Write a concise executive summary for the report titled "${jobData.productName}".`,
        market_trends: `Provide 2025 market trends for telehealth, home care, and mental health services.`,
        regional_differences: `Summarize key regional differences in healthcare regulations and demand in the U.S.`,
        pain_points: `List 5 common patient pain points in accessing healthcare and telehealth.`,
        marketing_strategies: `Give 3 marketing strategies for small healthcare businesses in 2025.`,
        business_opportunities: `List 3 innovative business opportunities in telehealth and healthcare for 2025.`
      };

      const sectionResults = {};
      for (const [key, prompt] of Object.entries(prompts)) {
        logger.info(`[Worker] Fetching section: ${key}`);
        sectionResults[key] = await callLLM(prompt);
      }

      const quickChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
        type: 'line',
        data: {
          labels: ['2023', '2024', '2025'],
          datasets: [{ label: 'Telehealth ($B)', data: [34, 47, 62], borderColor: 'blue', fill: false }]
        }
      }))}`;

      const pdfBuffer = await renderReportToPDF({
        user_name: jobData.userName || 'Valued Client',
        'today’s date': new Date().toLocaleDateString(),
        chart_url: quickChartUrl,
        your_site_name: YOUR_SITE_NAME,
        ...sectionResults
      });

      const uploadCommand = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: jobData.targetS3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf'
      });

      await s3Client.send(uploadCommand);

      const updateQuery = `
        UPDATE order_line_item
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('llm_status', 'completed', 's3_key', $1::text)
        WHERE product_id = $2::text
          AND id IN (SELECT item_id FROM order_item WHERE order_id = $3::text)
        RETURNING id`;

      const updateParams = [jobData.targetS3Key, jobData.productId, jobData.orderId];
      await db.query(updateQuery, updateParams);

      channel.ack(msg);
      logger.info(`[Worker] Report for order ${jobData.orderId} completed and uploaded.`);

    } catch (err) {
      logger.error({ err }, '[Worker] Job failed. Message discarded.');
      channel.nack(msg, false, false);
    }
  }, { noAck: false });
}

runWorker();

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
