const express = require('express');
const amqp = require('amqplib');
const router = express.Router();
require('dotenv').config();

// RabbitMQ connection handling
let connection = null;
let channel = null;
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

async function connectRabbitMQ() {
  try {
    connectionRetryCount++;
    console.log(`Attempting to connect to RabbitMQ (attempt ${connectionRetryCount})...`);
    
    // Create a new connection
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    
    // Handle connection close events to trigger reconnection
    connection.on('close', (err) => {
      console.log('RabbitMQ connection closed:', err);
      channel = null;
      setTimeout(connectRabbitMQ, RETRY_INTERVAL);
    });
    
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      if (connection) connection.close();
    });
    
    // Create a channel
    channel = await connection.createChannel();
    await channel.assertQueue('email_notifications', { durable: true });
    
    console.log('Successfully connected to RabbitMQ');
    connectionRetryCount = 0;
    
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    
    // Implement exponential backoff for retries
    if (connectionRetryCount < MAX_RETRY_COUNT) {
      const retryDelay = RETRY_INTERVAL * Math.pow(2, connectionRetryCount - 1);
      console.log(`Retrying connection in ${retryDelay}ms...`);
      setTimeout(connectRabbitMQ, retryDelay);
    } else {
      console.error(`Failed to connect after ${MAX_RETRY_COUNT} attempts. Giving up.`);
      connectionRetryCount = 0;
      setTimeout(connectRabbitMQ, RETRY_INTERVAL * 10); // Try again after a longer delay
    }
  }
}

// Initial connection
connectRabbitMQ();

// Helper function to ensure we have a valid channel
async function getChannel() {
  if (!channel) {
    await connectRabbitMQ();
    // Wait a bit for the connection to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return channel;
}

// Contact form API endpoint
router.post('/', async (req, res) => {
  try {
    const contactData = req.body;
    console.log('Contact form data received:', contactData);
    
    // Get a valid channel
    const ch = await getChannel();
    
    if (!ch) {
      throw new Error('Unable to establish a connection to RabbitMQ');
    }
    
    // Publish message to RabbitMQ
    ch.sendToQueue(
      'email_notifications', 
      Buffer.from(JSON.stringify({
        type: 'contact_form',
        data: contactData,
        timestamp: new Date()
      })),
      { persistent: true }
    );
    
    console.log('Message published to RabbitMQ');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
