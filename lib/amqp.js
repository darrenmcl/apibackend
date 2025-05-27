const amqp = require('amqplib');

let channel;

async function getChannel() {
  if (channel) return channel;
  
  try {
    // Use RABBITMQ_URL if available, otherwise fall back to individual vars
    const connectionUrl = process.env.RABBITMQ_URL || process.env.AMQP_URL;
    
    if (connectionUrl) {
      console.log('[AMQP] Connecting using URL...');
      const connection = await amqp.connect(connectionUrl);
      channel = await connection.createChannel();
    } else {
      // Fallback to individual environment variables
      console.log('[AMQP] Using individual config vars...');
      const config = {
        hostname: process.env.RABBITMQ_HOST || 'rabbitmq',
        port: parseInt(process.env.RABBITMQ_PORT || '5672'),
        username: process.env.RABBITMQ_USER || 'admin',
        password: process.env.RABBITMQ_PASS || 'PCPLm4hnigq%232025',
      };
      const connection = await amqp.connect(config);
      channel = await connection.createChannel();
    }
    
    await channel.assertQueue('llm_report_jobs', { durable: true });
    console.log('[AMQP] Channel created and queue asserted.');
    return channel;
  } catch (err) {
    console.error('[AMQP] Failed to connect or assert queue:', err);
    throw err;
  }
}

module.exports = { getChannel };
