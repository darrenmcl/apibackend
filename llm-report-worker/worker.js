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
const SYSTEM_PROMPT = {
  role: 'system',
  content:
    'You are a senior-level business analyst or strategist writing high-quality report sections for paying clients. Your writing should be structured, insightful, and easy to follow. Use plain business English, avoid fluff, and match the tone to small business owners, consultants, or startup founders in healthcare-related industries. Stay objective, confident, and useful.'
};



if (!S3_BUCKET_NAME || !AWS_REGION || !OPENROUTER_API_KEY) {
  logger.fatal('Missing required environment variables.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const result = await db.query(
  'SELECT section_key, prompt_text, llm_model, system_message FROM prompts WHERE product_id = $1 AND is_active = true',
  [productId]
);

const prompts = {};
for (const row of result.rows) {
  let prompt = row.prompt_text;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
  }

  prompts[row.section_key] = {
    text: prompt,
    model: row.llm_model || 'openai/gpt-4-turbo',
    systemMessage: row.system_message || null,
  };
}

async function callLLM(prompt, model = 'openai/gpt-4-turbo', systemMessage = null) {
  const messages = [];

  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      ...(YOUR_SITE_URL && { 'HTTP-Referer': YOUR_SITE_URL }),
      ...(YOUR_SITE_NAME && { 'X-Title': YOUR_SITE_NAME }),
    },
    body: JSON.stringify({ model, messages }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}


async function runWorker() {
  const connection = await amqp.connect({
    hostname: RABBITMQ_HOST,
    port: RABBITMQ_PORT,
    username: RABBITMQ_USER,
    password: RABBITMQ_PASS,
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
      logger.info(`[Worker] Job received:`, jobData);

      try {
        const context = {
          product_name: jobData.productName || 'Untitled Report',
          user_name: jobData.userName || 'Valued Client',
          order_id: jobData.orderId || uuidv4(),
          your_site_name: YOUR_SITE_NAME,
        };

        // Fetch dynamic report title and header image
const productMeta = await db.query(
  'SELECT report_title, header_image_url, template_file FROM products WHERE id = $1',
  [jobData.productId]
);

if (productMeta.rows.length > 0) {
  context.report_title = productMeta.rows[0].report_title;
  context.report_subtitle = productMeta.rows[0].report_subtitle || 'Strategic Insights for Growth';
  context.header_image_url = productMeta.rows[0].header_image_url;
  context.template_file = productMeta.rows[0].template_file || 'report-template-default.html';
} else {
  logger.warn(`[Worker] No product metadata found for productId ${jobData.productId}`);
}


        const prompts = await fetchPrompts(jobData.productId, context);

        const sectionResults = {};
	for (const [section, { text, model, systemMessage }] of Object.entries(prompts)) {
  	logger.info(`[Worker] Fetching section: ${section} using ${model}`);
  	sectionResults[section] = await callLLM(text, model, systemMessage);
	}


        const pdfBuffer = await renderReportToPDF({
          ...context,
          product_id: jobData.productId,
          ...sectionResults,
        });

        const uploadCommand = new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: jobData.targetS3Key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        });

        await s3Client.send(uploadCommand);

        await db.query(
          `UPDATE order_line_item
           SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('llm_status', 'completed', 's3_key', $1::text)
           WHERE product_id = $2::text
             AND id IN (SELECT item_id FROM order_item WHERE order_id = $3::text)`,
          [jobData.targetS3Key, jobData.productId, jobData.orderId]
        );

        channel.ack(msg);
        logger.info(`[Worker] Report for order ${jobData.orderId} completed and uploaded.`);
      } catch (err) {
        logger.error({ err }, '[Worker] Job failed. Message discarded.');
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

runWorker();

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
