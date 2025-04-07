require('dotenv').config();
const amqp = require('amqplib');
const AWS = require('aws-sdk'); // ✅ You need this to use AWS.SES
console.log('[DEBUG] RABBITMQ_URL:', process.env.RABBITMQ_URL);
// Initialize the SES client
const ses = new AWS.SES({
  region: process.env.AWS_REGION
});

// Define the email sending function
function sendEmailNotification({ message }) {
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

// Start the RabbitMQ consumer
(async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue('chat_notifications');
    console.log('[Worker] Listening for chat notifications...');

    channel.consume('chat_notifications', async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        console.log('[Worker] New chat message:', content);

        try {
          await sendEmailNotification({ message: content.message });
          console.log('[Worker] Email alert sent!');
        } catch (emailErr) {
          console.error('[Worker] Failed to send email:', emailErr);
        }

        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('[Worker] Error:', err);
    process.exit(1);
  }
})();
