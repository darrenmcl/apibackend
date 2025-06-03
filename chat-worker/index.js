require('dotenv').config();
const amqp = require('amqplib');
const AWS = require('aws-sdk');
const { Pool } = require('pg');
const OpenAI = require('openai');

// --- Environment Setup ---
const amqpUrl = process.env.AMQP_URL;
const awsRegion = process.env.AWS_REGION;
const alertFromEmail = process.env.ALERT_FROM_EMAIL;
const alertToEmail = process.env.ALERT_TO_EMAIL;
const openaiKey = process.env.OPENAI_API_KEY;
const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const model = process.env.OPENROUTER_MODEL || 'text-embedding-ada-002';

if (!amqpUrl || !awsRegion || !alertFromEmail || !alertToEmail || !openaiKey) {
  console.error('[Worker FATAL] Missing required environment variables.');
  console.error('Required: AMQP_URL, AWS_REGION, ALERT_FROM_EMAIL, ALERT_TO_EMAIL, OPENAI_API_KEY');
  process.exit(1);
}

const ses = new AWS.SES({ region: awsRegion });
const pool = new Pool(); // Uses PG env vars

// Configure OpenAI/OpenRouter client
const openai = new OpenAI({ 
  apiKey: openaiKey,
  baseURL: baseUrl
});

console.log(`[Worker] Using API: ${baseUrl}`);
console.log(`[Worker] Using model: ${model}`);

// --- Embedding + Retrieval ---
async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // Most embedding models use this endpoint
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[Worker ERROR] Failed to get embedding:', error.message);
    throw error;
  }
}

async function getContext(userMessage) {
  try {
    const userEmbedding = await getEmbedding(userMessage);
    const result = await pool.query(
      "SELECT content FROM rag_documents ORDER BY embedding <-> $1 LIMIT 5",
      [userEmbedding]
    );
    return result.rows.map(r => r.content).join('\n\n---\n\n');
  } catch (error) {
    console.error('[Worker ERROR] Failed to get context:', error.message);
    return 'No context available due to error.';
  }
}

// --- Chat Completion (using OpenRouter models) ---
async function getChatResponse(userMessage, context) {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Use the following context to answer questions accurately. If the context doesn't contain relevant information, say so.

Context:
${context}`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('[Worker ERROR] Failed to get chat response:', error.message);
    return `Error generating response: ${error.message}`;
  }
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
    console.log('[Worker] Starting chat worker with OpenRouter integration...');
    
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
        
        if (typeof userMessage !== 'string') {
          throw new Error("Missing 'message' field");
        }

        console.log('[Worker] Processing message:', userMessage);

        // Get context from vector database
        const context = await getContext(userMessage);
        
        // Generate AI response using OpenRouter
        const aiResponse = await getChatResponse(userMessage, context);

        // Send email with both context and AI response
        await sendEmailNotification({
          subject: "🤖 Chat Message + AI Response",
          body: `
Original Question:
${userMessage}

Retrieved Context:
${context}

AI Response:
${aiResponse}

---
Generated using ${model} via OpenRouter
          `.trim(),
        });

        console.log('[Worker] Email sent with AI response and context.');
      } catch (err) {
        console.error('[Worker ERROR] Processing message failed:', err);
        
        // Send error notification
        try {
          await sendEmailNotification({
            subject: "❌ Chat Worker Error",
            body: `Failed to process message: ${err.message}\n\nRaw message: ${raw}`
          });
        } catch (emailErr) {
          console.error('[Worker ERROR] Failed to send error email:', emailErr);
        }
      } finally {
        channel.ack(msg);
      }
    });

    // Handle connection events
    connection.on('error', (err) => {
      console.error('[Worker ERROR] RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.warn('[Worker] RabbitMQ connection closed');
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
