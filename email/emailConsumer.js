const amqp = require('amqplib');
const AWS = require('aws-sdk');
const logger = require('./lib/logger');
const db = require('./config/db'); // Your PG pool/wrapper

// AWS SES config
const ses = new AWS.SES({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-west-2',
});

// Send email via SES
async function sendEmail({ to, subject, html }) {
  const params = {
    Source: process.env.ALERT_FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  };
  return ses.sendEmail(params).promise();
}

// Log to email_logs
async function logEmail({ to, subject, status, error = null }) {
  try {
    await db.query(
      `INSERT INTO email_logs (to_address, subject, status, error)
       VALUES ($1, $2, $3, $4)`,
      [to, subject, status, error]
    );
    logger.info(`🗒️ Logged email (${status}) for: ${to}`);
  } catch (err) {
    logger.error('❌ Failed to log email to DB:', err.stack || err.message || err);
  }
}

async function startConsumer() {
  try {
    logger.info('📨 Starting email consumer service');
    
    // Add environment variable checks
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error("Missing AWS_ACCESS_KEY_ID");
    }
    if (!process.env.ALERT_FROM_EMAIL) {
      throw new Error("Missing ALERT_FROM_EMAIL");
    }

    const connection = await amqp.connect(process.env.AMQP_URL || 'amqp://admin:PCPLm4hnigq%232025@rabbitmq:5672');
    const channel = await connection.createChannel();
    const queue = process.env.EMAIL_QUEUE || 'email_notifications';
    
    await channel.assertQueue(queue, { durable: true });
    logger.info(`📡 Listening on queue: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        let parsed;
        try {
          parsed = JSON.parse(msg.content.toString());
          logger.info('📦 Message received:', parsed);
        } catch (err) {
          logger.error('❌ Invalid JSON:', err.stack || err.message || err);
          channel.ack(msg);
          return;
        }

        const { to, subject, html } = parsed;
        if (!to || !subject || !html) {
          logger.warn('⚠️ Missing required fields in message:', { to, subject, html });
          await logEmail({ 
            to: to || '(unknown)', 
            subject: subject || '(none)', 
            status: 'skipped', 
            error: 'Missing required fields (to, subject, or html)' 
          });
          channel.ack(msg);
          return;
        }

        try {
          logger.info(`📩 Sending email to ${to} — Subject: "${subject}"`);
          await sendEmail({ to, subject, html });
          logger.info('✅ Email sent successfully');
          await logEmail({ to, subject, status: 'sent' });
        } catch (err) {
          logger.error('❌ Failed to send email:', err.stack || err.message || err);
          await logEmail({ to, subject, status: 'failed', error: err.message });
        } finally {
          channel.ack(msg);
        }
      }
    });

    // Handle connection errors
    connection.on('error', (err) => {
      logger.error('💥 RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('📡 RabbitMQ connection closed');
    });

  } catch (err) {
    console.error("Fatal error during startConsumer:", err);
    logger.error('💥 Consumer startup error:', err.stack || err.message || err);
    process.exit(1);
  }
}

startConsumer();
