// /var/projects/backend-api/lib/rabbit.js (More Robust Publishing)
const amqp = require('amqplib');
require('dotenv').config();
const logger = require('./logger');

let channel = null;
let connection = null;
let isConnecting = false; // Flag to prevent simultaneous connection attempts
const connectRetryInterval = 5000; // ms to wait before retrying connect

// Function to establish connection and channel
async function connectRabbit(isRetry = false) {
    if (channel) return channel; // Already connected
    if (isConnecting && !isRetry) { // Prevent piling up connection attempts
         logger.warn("[RabbitMQ] Connection attempt already in progress. Waiting briefly...");
         await new Promise(resolve => setTimeout(resolve, 1000));
         return channel; // Return current state after wait
    }

    isConnecting = true;
    const url = process.env.RABBITMQ_URL || `amqp://<span class="math-inline">\{process\.env\.RABBITMQ\_USER\}\:</span>{process.env.RABBITMQ_PASS}@<span class="math-inline">\{process\.env\.RABBITMQ\_HOST\}\:</span>{process.env.RABBITMQ_PORT || 5672}`;
    logger.info(`[RabbitMQ] Attempting connection (Retry: ${isRetry})...`); // Mask URL if needed

    try {
        connection = await amqp.connect(url);
        channel = await connection.createChannel();
        logger.info('[RabbitMQ] Connection and channel established successfully.');

        connection.on('error', (err) => {
            logger.error({ err }, '[RabbitMQ] Connection error occurred. Resetting channel/connection.');
            channel = null; connection = null; isConnecting = false;
            // Optional: Schedule a reconnect attempt
            // setTimeout(() => connectRabbit(true), connectRetryInterval);
        });
        connection.on('close', () => {
            logger.warn('[RabbitMQ] Connection closed. Resetting channel/connection.');
            channel = null; connection = null; isConnecting = false;
             // Optional: Schedule a reconnect attempt
             // setTimeout(() => connectRabbit(true), connectRetryInterval);
        });

        isConnecting = false;
        return channel; // Return the newly created channel

    } catch (err) {
        logger.error({ err }, '[RabbitMQ] Connection failed during setup.');
        channel = null; connection = null; isConnecting = false;
        // If called on startup, maybe retry or throw?
        // If called from publishMessage, return null to indicate failure
        return null;
    }
}

// Initial connection attempt on startup
connectRabbit();

/**
 * Publishes a message to a specified RabbitMQ queue.
 * Ensures channel is available, attempting reconnect ONCE if necessary.
 */
async function publishMessage(queueName, messagePayload, persistent = true) {
    let currentChannel = channel; // Get current channel state

    // If channel is missing, try ONE reconnect attempt
    if (!currentChannel) {
         logger.warn(`[RabbitMQ] Channel not available for publishing to ${queueName}. Attempting reconnect...`);
         currentChannel = await connectRabbit(true); // Pass true to indicate it's a retry
    }

    // If channel is STILL not available after attempt, fail the publish
    if (!currentChannel) {
        logger.error(`[RabbitMQ] Cannot publish to ${queueName}, channel unavailable after reconnect attempt.`);
        return false; // Indicate failure
    }

    // Proceed with publishing using the obtained channel reference
    try {
        // Ensure queue exists (durable for persistence)
        await currentChannel.assertQueue(queueName, { durable: true });
        const messageBuffer = Buffer.from(JSON.stringify(messagePayload));

        // Use the potentially newly obtained channel
        const sent = currentChannel.sendToQueue(queueName, messageBuffer, { persistent });

        if (sent) {
            logger.info({ queue: queueName, payload: messagePayload }, `[RabbitMQ] Message sent successfully.`);
        } else {
            logger.warn({ queue: queueName }, `[RabbitMQ] sendToQueue returned false (queue full or channel error?). Resetting channel state.`);
            // Assume channel is bad if sendToQueue returns false
            channel = null; connection = null;
        }
        return sent; // Return success/failure of sendToQueue
    } catch (error) {
        logger.error({ err: error, queue: queueName }, `[RabbitMQ] Error during publish operation (assertQueue or sendToQueue).`);
        // Assume channel is bad if error occurs during publish operations
        channel = null; connection = null;
        return false; // Indicate failure
    }
}

module.exports = {
    // No need to export connectRabbit if publishMessage handles reconnecting
    publishMessage
};
