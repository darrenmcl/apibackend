require('dotenv').config();
const amqp = require('amqplib');
const AWS = require('aws-sdk');
const { Pool } = require('pg');
const { Configuration, OpenAIApi } = require('openai');

// --- Environment Setup ---
const amqpUrl = process.env.AMQP_URL;
const awsRegion = process.env.AWS_REGION;
const alertFromEmail = process.env.ALERT_FROM_EMAIL;
const alertToEmail = process.env.ALERT_TO_EMAIL;
const openaiKey = process.env.OPENAI_API_KEY;

if (!amqpUrl || !awsRegion || !alertFromEmail || !alertToEmail || !openaiKey) {
  console.error('[Worker FATAL] Missing required environment variables.');
  process.exit(1);
}

const ses = new AWS.SES({ region: awsRegion });
const pool = new Pool(); // Uses PG env vars
const openai = new OpenAIApi(new Configuration({ apiKey: openaiKey }));

// --- Embedding + Retrieval ---
async function getEmbedding(text) {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data.data[0].embedding;
}

async function getContext(userMessage) {
  const userEmbedding = await getEmbedding(userMessage);
  const result = await pool.query(
    "SELECT content FROM rag_documents ORDER BY embedding <-> $1 LIMIT 5",
    [userEmbedding]
  );
  return result.rows.map(r => r.content).join('\n\n---\n\n');
}

// --- Email Sending ---
function sendEmailNotification({ subject, body }) {
  const params = {
    Source: alertFromEmail,
    Destination: { ToAddresses: [alertToEmail] },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: body } },
    },
  };
  return ses.sendEmail(params).promise();
}

// --- RabbitMQ Worker ---
const QUEUE_NAME = 'chat_notifications';

(async () => {
  try {
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`[Worker] Waiting for messages in ${QUEUE_NAME}...`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      const raw = msg.content.toString();
      console.log('[Worker] Raw message:', raw);

      try {
        const data = JSON.parse(raw);
        const userMessage = data.message;

        if (typeof userMessage !== 'string') throw new Error("Missing 'message' field");

        const context = await getContext(userMessage);
        const finalPrompt = `
Use the following context to answer the question.

Context:
${context}

Question:
${userMessage}

Answer:`.trim();

        await sendEmailNotification({
          subject: "🧠 Chat Message + Retrieved Context",
          body: finalPrompt,
        });

        console.log('[Worker] Email sent with retrieved context.');
      } catch (err) {
        console.error('[Worker ERROR] Processing message failed:', err);
      } finally {
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('[Worker FATAL] Startup failed:', err);
    process.exit(1);
  }
})();

// --- Graceful Exit ---
['SIGINT', 'SIGTERM'].forEach(signal =>
  process.on(signal, () => {
    console.log(`[Worker] ${signal} received. Shutting down...`);
    process.exit(0);
  })
);
