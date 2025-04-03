// /var/projects/backend-api/config/rabbitmq.js
const amqp = require('amqplib');
require('dotenv').config(); // Make sure .env variables are loaded

const AMQP_URL = process.env.AMQP_URL; // Read from .env (amqp://guest:guest@localhost:5672)
let connection = null; // Variable to hold the connection persistently
let channel = null;    // Variable to hold the channel persistently

// Async function to establish connection and channel
async function connectRabbitMQ() {
    // If connection and channel already exist, reuse them (simple singleton)
    if (connection && channel) {
        console.log('[RabbitMQ] Reusing existing connection and channel.');
        return { connection, channel };
    }

    if (!AMQP_URL) {
        console.error('[RabbitMQ] FATAL ERROR: AMQP_URL environment variable is not set.');
        // In a real app, you might want to exit or implement retry logic here
        throw new Error('RabbitMQ connection URL is not configured.');
    }

    try {
        // Log connection attempt (mask password)
        console.log(`[RabbitMQ] Attempting connection to: ${AMQP_URL.replace(/:([^:]+)@/, ':*****@')}`);
        connection = await amqp.connect(AMQP_URL);
        console.log('[RabbitMQ] Connection established successfully.');

        // --- Add Event Listeners for resilience ---
        connection.on('error', (err) => {
            console.error('[RabbitMQ] Connection error:', err.message);
            connection = null; // Reset state on error
            channel = null;
            // TODO: Implement reconnection logic if desired
        });
        connection.on('close', () => {
            console.warn('[RabbitMQ] Connection closed.');
            connection = null; // Reset state on close
            channel = null;
            // TODO: Implement reconnection logic if desired
        });
        // --- End Event Listeners ---

        // Create a channel
        channel = await connection.createChannel();
        console.log('[RabbitMQ] Channel created successfully.');

        // --- Add Channel Event Listeners ---
         channel.on('error', (err) => {
            console.error('[RabbitMQ] Channel error:', err.message);
            channel = null; // Reset channel state
        });
        channel.on('close', () => {
            console.warn('[RabbitMQ] Channel closed.');
            channel = null; // Reset channel state
        });
        // --- End Channel Listeners ---

        return { connection, channel }; // Return both for potential advanced use

    } catch (error) {
        console.error('[RabbitMQ] Failed to connect or create channel:', error);
        connection = null; // Ensure reset on initial failure
        channel = null;
        throw error; // Re-throw to signal failure to caller
    }
}

/**
 * Gets a RabbitMQ channel, establishing connection if needed.
 * Recommended function to use for publishing/consuming.
 * @returns {Promise<amqp.Channel>} A promise that resolves with an amqplib channel.
 */
async function getRabbitMQChannel() {
    // If channel doesn't exist or connection lost, attempt to reconnect
    if (!channel || !connection) {
        console.log('[RabbitMQ] Channel/Connection unavailable, attempting connectRabbitMQ()...');
        await connectRabbitMQ(); // Re-establish connection and channel
    }
    // If channel is still null after attempting connection, throw error
    if (!channel) {
         throw new Error("Failed to establish RabbitMQ channel after connection attempt.");
    }
    // Return the active channel
    return channel;
}

// Optional: Function to gracefully close connection on application shutdown
async function closeRabbitMQConnection() {
    if (channel) {
        try { await channel.close(); } catch (e) { console.error("Error closing RabbitMQ channel:", e); }
        channel = null;
    }
    if (connection) {
         try { await connection.close(); } catch (e) { console.error("Error closing RabbitMQ connection:", e); }
         connection = null;
    }
    console.log('[RabbitMQ] Connection/Channel closed gracefully.');
}

// Export the function needed by other modules
module.exports = {
    getRabbitMQChannel,
    closeRabbitMQConnection // Export close for potential use in app shutdown hooks
};
