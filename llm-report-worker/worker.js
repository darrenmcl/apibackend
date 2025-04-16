const amqp = require('amqplib');
const logger = console;

const {
  RABBITMQ_HOST = 'rabbitmq',
  RABBITMQ_PORT = 5672,
  RABBITMQ_USER = 'admin',
  RABBITMQ_PASS = 'PCPLm4hnigq#2025',
  WORKER_QUEUE = 'llm-tasks'
} = process.env;

async function startWorker() {
  try {
    logger.log('[LLM-WORKER] Starting...');
    logger.log(`[LLM-WORKER] Connecting using:`)
    logger.log(`  Host: ${RABBITMQ_HOST}`);
    logger.log(`  Port: ${RABBITMQ_PORT}`);
    logger.log(`  User: ${RABBITMQ_USER}`);
    logger.log(`  Queue: ${WORKER_QUEUE}`);

    const connection = await amqp.connect({
      protocol: 'amqp',
      hostname: RABBITMQ_HOST,
      port: parseInt(RABBITMQ_PORT),
      username: RABBITMQ_USER,
      password: RABBITMQ_PASS
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(WORKER_QUEUE, { durable: true });

    logger.log(`[LLM-WORKER] Listening for messages in "${WORKER_QUEUE}"`);

    channel.consume(WORKER_QUEUE, msg => {
      if (msg !== null) {
        const content = msg.content.toString();
        logger.log(`[LLM-WORKER] Received message:`, content);

        // Simulated processing
        setTimeout(() => {
          logger.log(`[LLM-WORKER] Processed: ${content}`);
          channel.ack(msg);
        }, 1000);
      }
    }, { noAck: false });

  } catch (err) {
    logger.error('[LLM-WORKER] Error:', err);
    process.exit(1);
  }
}

startWorker();
