// emailConsumer.js
// Fix import paths - consider one of these approaches:

// Option 1: Remove dependency on auth middleware if not needed for consumer
// Replace line 12 that's importing auth with appropriate code

// Option 2: Copy the auth middleware into your email service directory
// const auth = require('./middlewares/auth'); // Keep as is if you copy the file

// Option 3: Use relative path to parent directory if your Docker volume setup allows it
// const auth = require('../middlewares/auth');

// Rest of your email consumer code
const express = require('express');
const amqp = require('amqplib');
const logger = require('./lib/logger');

// Example of basic consumer that doesn't need auth middleware
async function startConsumer() {
  try {
    logger.info('Starting email consumer service');
    
    // Connect to RabbitMQ
    const connection = await amqp.connect({
      hostname: process.env.RABBITMQ_HOST || 'rabbitmq',
      port: process.env.RABBITMQ_PORT || 5672,
      username: process.env.RABBITMQ_USER || 'admin',
      password: process.env.RABBITMQ_PASS || 'PCPLm4hnigq#2025'
    });
    
    const channel = await connection.createChannel();
    const queue = process.env.EMAIL_QUEUE || 'email_queue';
    
    await channel.assertQueue(queue, { durable: true });
    logger.info(`Waiting for messages in ${queue}`);
    
    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        logger.info(`Processing email: ${content.to}`);
        
        // Email processing logic here
        
        channel.ack(msg);
      }
    });
  } catch (error) {
    logger.error('Error in email consumer:', error);
    process.exit(1);
  }
}

startConsumer();
