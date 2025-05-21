const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

const QUEUE_NAME = process.env.WORKER_QUEUE || 'llm_report_jobs';

router.post('/generate-report', async (req, res) => {
  const { product_id, brand } = req.body;

  if (!product_id || !brand) {
    return res.status(400).json({ error: 'Missing required fields: product_id and brand' });
  }

  try {
    const result = await db.query(`SELECT id, name, slug FROM products WHERE id = $1`, [product_id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    const orderId = `manual_${brand}_${Date.now()}`;
    const slug = product.slug || `product-${product.id}`;
    const targetS3Key = `${brand}/reports/${slug}-${orderId}.pdf`;

    const job = {
      productId: product.id,
      productName: product.name,
      targetS3Key,
      userName: 'Admin Trigger',
      orderId,
    };

    const connection = await amqp.connect({
      hostname: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER || 'guest',
      password: process.env.RABBITMQ_PASS || 'guest',
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(job)), { persistent: true });

    await channel.close();
    await connection.close();

    return res.status(200).json({
      message: 'Report generation job enqueued successfully.',
      job,
    });
  } catch (err) {
    console.error('[Admin Generate Report]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
