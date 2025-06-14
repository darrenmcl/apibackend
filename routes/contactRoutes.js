const express = require('express');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const router = express.Router();
let connection = null;
let channel = null;
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

// RabbitMQ Connection Handling
async function connectRabbitMQ() {
  try {
    connectionRetryCount++;
    console.log(`[ContactRoutes] Attempting to connect to RabbitMQ (attempt ${connectionRetryCount})...`);
    
    // Fix: Use AMQP_URL instead of RABBITMQ_URL
    const rabbitURL = process.env.AMQP_URL || 'amqp://admin:PCPLm4hnigq%232025@rabbitmq:5672';
    console.log(`[ContactRoutes] Using URL: ${rabbitURL.replace(/:([^:]+)@/, ':*****@')}`);
    
    connection = await amqp.connect(rabbitURL);
    
    connection.on('close', (err) => {
      console.log('[ContactRoutes] RabbitMQ connection closed:', err);
      channel = null;
      setTimeout(connectRabbitMQ, RETRY_INTERVAL);
    });
    
    connection.on('error', (err) => {
      console.error('[ContactRoutes] RabbitMQ connection error:', err);
      if (connection) connection.close();
    });
    
    channel = await connection.createChannel();
    await channel.assertQueue('email_notifications', { durable: true });
    console.log('[ContactRoutes] ✅ Successfully connected to RabbitMQ');
    connectionRetryCount = 0;
    
  } catch (error) {
    console.error('[ContactRoutes] RabbitMQ connection error:', error);
    if (connectionRetryCount < MAX_RETRY_COUNT) {
      const retryDelay = RETRY_INTERVAL * Math.pow(2, connectionRetryCount - 1);
      console.log(`[ContactRoutes] Retrying connection in ${retryDelay}ms...`);
      setTimeout(connectRabbitMQ, retryDelay);
    } else {
      console.error(`[ContactRoutes] ❌ Failed to connect after ${MAX_RETRY_COUNT} attempts. Will retry later.`);
      connectionRetryCount = 0;
      setTimeout(connectRabbitMQ, RETRY_INTERVAL * 10);
    }
  }
}

// Initialize connection
connectRabbitMQ();

async function getChannel() {
  if (!channel) {
    await connectRabbitMQ();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return channel;
}

// Contact Form Endpoint
router.post('/', async (req, res) => {
  try {
    const contactData = req.body;
    console.log('[ContactRoutes] 📥 Contact form data received:', contactData);
    
    const { name, email, phone, subject, message } = contactData;
    const message_id = uuidv4();
    
    const formattedEmail = {
      id: message_id,
      to: process.env.ALERT_TO_EMAIL || 'worker@citep.com',
      subject: `Contact Form: ${subject || '(No subject)'}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Message:</strong><br>${message}</p>
      `
    };
    
    const ch = await getChannel();
    if (!ch) {
      throw new Error('Unable to establish a connection to RabbitMQ');
    }
    
    ch.sendToQueue(
      'email_notifications',
      Buffer.from(JSON.stringify(formattedEmail)),
      { persistent: true }
    );
    
    console.log(`[ContactRoutes] 📨 Message ${message_id} published to RabbitMQ`);
    res.status(200).json({ success: true, message_id });
    
  } catch (error) {
    console.error('[ContactRoutes] ❌ Error processing contact form:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
