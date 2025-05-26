const amqp = require('amqplib');
let channel;

async function getChannel() {
  if (channel) return channel;

  try {
    console.log('[AMQP] Connecting...');
    const connection = await amqp.connect({
      hostname: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER || 'guest',
      password: process.env.RABBITMQ_PASS || 'guest',
    });

    channel = await connection.createChannel();
    await channel.assertQueue('llm_report_jobs', { durable: true });
    console.log('[AMQP] Channel created and queue asserted.');
    return channel;
  } catch (err) {
    console.error('[AMQP] Failed to connect or assert queue:', err);
    throw err;
  }
}

module.exports = { getChannel };
