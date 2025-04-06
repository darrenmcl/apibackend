const amqp = require('amqplib');
const AWS = require('aws-sdk');
require('dotenv').config();

let channel;

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
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('chat_notifications');
    console.log('[RabbitMQ] Connected and channel established.');

    channel.consume('chat_notifications', async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        console.log('[Worker] New chat message:', content);

        try {
          await sendEmailNotification({ message: content.message });
          console.log('[Worker] Email alert sent!');
        } catch (err) {
          console.error('[Worker] Failed to send email:', err);
        }

        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('[RabbitMQ] Connection failed:', err);
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
  connectRabbit,
  publishToChatQueue
};
