const amqp = require('amqplib');
const AWS = require('aws-sdk');
const logger = require('./lib/logger');

// Configure AWS SES
const ses = new AWS.SES({
  accessKeyId: process.env.EMAIL_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.EMAIL_AWS_SECRET_ACCESS_KEY,
  region: process.env.EMAIL_AWS_REGION || 'us-east-1',
});

async function sendEmail({ to, subject, html }) {
  const params = {
    Source: process.env.ALERT_FROM_EMAIL, // verified sender
    Destination: {
      ToAddresses: [to || process.env.ALERT_TO_EMAIL],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
      },
    },
  };

  return ses.sendEmail(params).promise();
}

async function startConsumer() {
  try {
    logger.info('Starting email consumer service');

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

channel.consume(queue, async (msg) => {
  if (msg !== null) {
    try {
      logger.info(`📩 Message received from queue "${queue}": ${msg.content.toString()}`);

      const { to, subject, html } = JSON.parse(msg.content.toString());

      if (!subject || !html) {
        logger.warn('⚠️ Missing required email fields. Skipping message.');
        return channel.ack(msg);
      }

      await sendEmail({ to, subject, html });

      logger.info(`✅ Email sent successfully to ${to || '(default recipient)'} with subject: "${subject}"`);

      channel.ack(msg);
    } catch (err) {
      logger.error('❌ Error processing email message:', err);
      channel.ack(msg); // Or reject/requeue depending on your retry policy
    }
  }
});

  } catch (err) {
    logger.error('Error in email consumer startup:', err);
    process.exit(1);
  }
}

startConsumer();
