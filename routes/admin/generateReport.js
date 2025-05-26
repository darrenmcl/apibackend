const express = require('express');
const router = express.Router();
const { getChannel } = require('../../lib/amqp'); // Ensure this is correct

router.post('/generate-report', async (req, res) => {
  const { productId, brand } = req.body;

  if (!productId || !brand) {
    return res.status(400).json({ message: 'Missing productId or brand' });
  }

  const job = {
    productId,
    brand,
    orderId: `manual-${Date.now()}`,
    productName: 'Manual Report',
    userName: 'Admin Trigger',
    targetS3Key: `reports/manual/${productId}-${Date.now()}.pdf`
  };

  try {
    console.log('[generate-report] Connecting to RabbitMQ...');
    const channel = await getChannel();
    console.log('[generate-report] Got channel. Sending job:', job);

    const sent = channel.sendToQueue('llm_report_jobs', Buffer.from(JSON.stringify(job)));
    console.log('[generate-report] sendToQueue result:', sent);

    if (!sent) {
      return res.status(500).json({ message: 'Channel queue send failed' });
    }

    res.status(200).json({ message: 'Job queued successfully', job });
  } catch (err) {
    console.error('[generate-report] Failed to queue job:', err);
    res.status(500).json({ message: 'Failed to queue report generation job' });
  }
});

module.exports = router;
