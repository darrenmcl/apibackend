// Assuming this file is something like: /var/projects/backend-api/email/emailConsumer.js
// Or for chat-worker: /var/projects/backend-api/chat-worker/index.js

// If you run this script locally for development (outside Docker) and want to use a
// .env file in this script's directory, then dotenv is useful.
// When running in Docker with environment variables injected by Docker Compose,
// dotenv.config() might not be strictly necessary or could override if a .env file
// is present in the container's working directory.
// Consider your execution context. For this example, we'll keep it.
require('dotenv').config();

const amqp = require('amqplib');
const AWS = require('aws-sdk'); // Ensure 'aws-sdk' is in your package.json and installed

// --- Environment Variable Checks & AWS SDK Setup ---
const amqpUrl = process.env.AMQP_URL;
const awsRegion = process.env.AWS_REGION;
const alertFromEmail = process.env.ALERT_FROM_EMAIL;
const alertToEmail = process.env.ALERT_TO_EMAIL;
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID; // For AWS SDK
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY; // For AWS SDK

console.log('[Worker DEBUG] AMQP_URL:', amqpUrl);
console.log('[Worker DEBUG] AWS_REGION:', awsRegion);
console.log('[Worker DEBUG] ALERT_FROM_EMAIL:', alertFromEmail);
console.log('[Worker DEBUG] ALERT_TO_EMAIL:', alertToEmail);
// Avoid logging AWS keys directly, but check if they are present if issues arise
// console.log('[Worker DEBUG] AWS_ACCESS_KEY_ID set:', !!awsAccessKeyId);

if (!amqpUrl || !awsRegion || !alertFromEmail || !alertToEmail || !awsAccessKeyId || !awsSecretAccessKey) {
  console.error('[Worker FATAL] Missing one or more required environment variables (AMQP_URL, AWS_REGION, ALERT_FROM_EMAIL, ALERT_TO_EMAIL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). Exiting.');
  process.exit(1);
}

// Initialize the SES client
// The AWS SDK will use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from process.env
const ses = new AWS.SES({
  region: awsRegion
});

// --- Email Sending Function ---
function sendEmailNotification({ message }) {
  const params = {
    Source: alertFromEmail,
    Destination: {
      ToAddresses: [alertToEmail],
    },
    Message: {
      Subject: {
        Data: "🧠 New Chat Message from Ian", // Customize as needed
      },
      Body: {
        Text: {
          Data: `You received a new message from Ian's chat:\n\n"${message}"\n\nTimestamp: ${new Date().toISOString()}`,
        },
        // HTML: { Data: "Optional HTML body" }
      },
    },
  };

  console.log('[Worker] Attempting to send email notification...');
  return ses.sendEmail(params).promise();
}

// --- RabbitMQ Consumer Logic ---
const QUEUE_NAME = 'chat_notifications'; // Or make this an environment variable if needed

(async () => {
  try {
    const connection = await amqp.connect(amqpUrl);
    console.log('[Worker] Connected to RabbitMQ successfully.');

    connection.on('error', (err) => {
      console.error('[Worker RabbitMQ] Connection error:', err.message);
      // Consider implementing reconnection logic or exiting
    });
    connection.on('close', () => {
      console.warn('[Worker RabbitMQ] Connection closed. Attempting to reconnect or exiting...');
      // Implement reconnection logic or exit gracefully
      process.exit(1); // Simple exit for now
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true }); // Assuming you want durable queues
    console.log(`[Worker] Waiting for messages in queue: ${QUEUE_NAME}. To exit press CTRL+C`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        let content;
        const messageContentString = msg.content.toString();
        console.log(`[Worker] Received raw message from ${QUEUE_NAME}:`, messageContentString);

        try {
          content = JSON.parse(messageContentString);
          console.log('[Worker] Parsed message content:', content);

          if (content && typeof content.message === 'string') {
            await sendEmailNotification({ message: content.message });
            console.log('[Worker] Email alert sent successfully!');
          } else {
            console.error('[Worker] Received message with unexpected or missing content.message field:', content);
            // This message will still be acked. Consider dead-lettering if this is a persistent issue.
          }
        } catch (err) {
          if (err instanceof SyntaxError) { // JSON parsing error
            console.error('[Worker] Failed to parse message content as JSON:', err, '\nRaw content:', messageContentString);
            // Message is malformed, acking to remove it from queue. Consider dead-lettering.
          } else { // Error during sendEmailNotification or other logic
            console.error('[Worker] Error processing message or sending email:', err);
            // Depending on the error, you might not want to ack, or you might want to nack and requeue (with caution)
            // For simplicity here, we still ack to prevent blocking the queue with a poision pill.
            // More sophisticated error handling (e.g., retry with backoff for email, dead-lettering) might be needed.
          }
        } finally {
          channel.ack(msg); // Acknowledge message after processing (success or failure to parse/email)
          console.log('[Worker] Message acknowledged.');
        }
      } else {
        console.warn('[Worker] Received null message. This usually means the consumer was cancelled by RabbitMQ.');
      }
    }, {
      // noAck: false is default, ensuring messages are acknowledged.
    });

  } catch (err) {
    console.error('[Worker] Failed to start worker:', err);
    process.exit(1);
  }
})();

// Graceful shutdown (optional but good practice)
process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down gracefully...');
  // Add cleanup code here, e.g., close RabbitMQ connection
  // if (connection) await connection.close(); // `connection` would need to be in a broader scope
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully...');
  // Add cleanup code here
  process.exit(0);
});
