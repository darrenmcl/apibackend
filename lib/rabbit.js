// /var/projects/backend-api/lib/rabbit.js (Revised)
const amqp = require('amqplib');
// const AWS = require('aws-sdk'); // Keep if still used by consumer logic
const AWS = require('aws-sdk');
require('dotenv').config();
const logger = require('./logger'); // Use your Pino logger

// const ses = new AWS.SES({ region: process.env.AWS_REGION }); // Keep if needed

let channel = null; // Keep channel scoped here
let connection = null; // Keep connection reference for potential closing

// Set up SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION
});

async function sendEmailNotification({ message }) {
  const params = {
    Source: process.env.ALERT_FROM_EMAIL,
    Destination: {
      ToAddresses: [process.env.ALERT_TO_EMAIL],
    },
    Message: {
      Subject: {
        Data: "🧠 New Chat Message from Ian",
      },
      Body: {
        Text: {
          Data: `You received a new message from Ian's chat:\n\n"${message}"\n\nTimestamp: ${new Date().toISOString()}`,
        },
      },
    },
  };

  return ses.sendEmail(params).promise();
}

async function connectRabbit() {
    if (channel) { // Prevent reconnecting if already connected
         logger.info('[RabbitMQ] Already connected.');
         return { channel, connection }; // Return existing objects
     }
    try {
        logger.info(`[RabbitMQ] Attempting to connect to: ${process.env.RABBITMQ_URL || 'amqp://localhost'}`);
        connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        channel = await connection.createChannel();
        logger.info('[RabbitMQ] Connection and channel established successfully.');

        connection.on('error', (err) => {
            logger.error({ err }, '[RabbitMQ] Connection error');
            channel = null; // Reset on error
            // Implement reconnection logic if desired
        });
        connection.on('close', () => {
            logger.warn('[RabbitMQ] Connection closed');
            channel = null; // Reset on close
             // Implement reconnection logic if desired
        });

        // --- Optional: Move consumer logic to separate worker files ---
        // It's better practice for the API server *not* to consume messages.
        // Remove the consume logic from here if you have separate worker services.
        /*
        await channel.assertQueue('chat_notifications');
        logger.info('[RabbitMQ] Asserted chat_notifications queue (in API - consider moving)');
        channel.consume('chat_notifications', async (msg) => { ... });
        */
        // --- End Optional ---

        return { channel, connection };

    } catch (err) {
        logger.error({ err }, '[RabbitMQ] Connection failed during initial setup');
        channel = null;
        connection = null;
        // Rethrow or handle startup failure
         throw err;
    }
}


// --- NEW Generic Publish Function ---
/**
 * Publishes a message to a specified RabbitMQ queue.
 * Assumes connectRabbit has been called successfully establishing the channel.
 * @param {string} queueName - The name of the queue to publish to.
 * @param {object} messagePayload - The JavaScript object to send as the message.
 * @param {boolean} persistent - Whether the message should be persistent (default: true).
 * @returns {boolean} - True if sent successfully, false otherwise.
 */
async function publishMessage(queueName, messagePayload, persistent = true) {
    if (!channel) {
        logger.error(`[RabbitMQ] Cannot publish to ${queueName}, channel not available.`);
        // Optionally try to reconnect here? connectRabbit().catch(...)
        return false;
    }
    try {
        // Ensure queue exists (declare it) - durable recommended
        await channel.assertQueue(queueName, { durable: true });
        const messageBuffer = Buffer.from(JSON.stringify(messagePayload));
        const sent = channel.sendToQueue(queueName, messageBuffer, { persistent });

        if (sent) {
            logger.info({ queue: queueName, payload: messagePayload }, `[RabbitMQ] Message sent successfully.`);
        } else {
            logger.warn({ queue: queueName }, `[RabbitMQ] sendToQueue returned false (queue full or channel closed?).`);
        }
        return sent;
    } catch (error) {
        logger.error({ err: error, queue: queueName }, `[RabbitMQ] Error publishing message`);
        return false;
    }
}

function publishToChatQueue(payload) {
  if (!channel) {
    console.warn('[RabbitMQ] Cannot publish, channel not ready.');
    return;
  }

  channel.sendToQueue('chat_notifications', Buffer.from(JSON.stringify(payload)));
}

module.exports = {
    connectRabbit, // Export connection function (called at app start)
    publishToChatQueue,
    publishMessage // Export generic publish function
    // Optionally export channel if really needed elsewhere, but function is safer:
    // getChannel: () => channel
};
