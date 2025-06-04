cat > lib/rabbit.js << 'EOF'
// /var/projects/backend-api/lib/rabbit.js
const amqp = require('amqplib');
require('dotenv').config();
const logger = require('./logger');

let channel = null;
let connection = null;
let isConnecting = false;
const connectRetryInterval = 5000;

async function connectRabbit(isRetry = false) {
    if (channel) return channel;
    if (isConnecting && !isRetry) {
         logger.warn("[RabbitMQ] Connection attempt already in progress. Waiting briefly...");
         await new Promise(resolve => setTimeout(resolve, 1000));
         return channel;
    }

    isConnecting = true;
    // Use AMQP_URL environment variable
    const url = process.env.AMQP_URL || 'amqp://admin:PCPLm4hnigq%232025@rabbitmq:5672';
    
    logger.info(`[RabbitMQ] Attempting connection (Retry: ${isRetry})...`);
    logger.info(`[RabbitMQ] Using URL: ${url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    try {
        connection = await amqp.connect(url);
        channel = await connection.createChannel();
        logger.info('[RabbitMQ] Connection and channel established successfully.');

        connection.on('error', (err) => {
            logger.error({ err }, '[RabbitMQ] Connection error occurred. Resetting channel/connection.');
            channel = null; connection = null; isConnecting = false;
        });
        connection.on('close', () => {
            logger.warn('[RabbitMQ] Connection closed. Resetting channel/connection.');
            channel = null; connection = null; isConnecting = false;
        });

        isConnecting = false;
        return channel;

    } catch (err) {
        logger.error({ err }, '[RabbitMQ] Connection failed during setup.');
        channel = null; connection = null; isConnecting = false;
        return null;
    }
}

// Initial connection attempt on startup
connectRabbit();

async function publishMessage(queueName, messagePayload, persistent = true) {
    let currentChannel = channel;

    if (!currentChannel) {
         logger.warn(`[RabbitMQ] Channel not available for publishing to ${queueName}. Attempting reconnect...`);
         currentChannel = await connectRabbit(true);
    }

    if (!currentChannel) {
        logger.error(`[RabbitMQ] Cannot publish to ${queueName}, channel unavailable after reconnect attempt.`);
        return false;
    }

    try {
        await currentChannel.assertQueue(queueName, { durable: true });
        const messageBuffer = Buffer.from(JSON.stringify(messagePayload));
        const sent = currentChannel.sendToQueue(queueName, messageBuffer, { persistent });

        if (sent) {
            logger.info({ queue: queueName, payload: messagePayload }, `[RabbitMQ] Message sent successfully.`);
        } else {
            logger.warn({ queue: queueName }, `[RabbitMQ] sendToQueue returned false. Resetting channel state.`);
            channel = null; connection = null;
        }
        return sent;
    } catch (error) {
        logger.error({ err: error, queue: queueName }, `[RabbitMQ] Error during publish operation.`);
        channel = null; connection = null;
        return false;
    }
}

async function publishToChatQueue(data) {
    return await publishMessage('chat_notifications', data);
}

module.exports = {
    publishMessage,
    publishToChatQueue
};
EOF
