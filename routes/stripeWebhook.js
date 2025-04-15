const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const logger = require('../lib/logger');
const { publishMessage } = require('../lib/rabbit');
const { v4: uuidv4 } = require('uuid');

// Export a middleware function directly (not a router)
module.exports = async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];

    logger.info({
        headers: {
            'content-type': req.headers['content-type'],
            'stripe-signature': signature ? 'present' : 'missing'
        },
        bodyFormat: {
            isBuffer: Buffer.isBuffer(req.body),
            type: typeof req.body,
            byteLength: req.body ? (Buffer.isBuffer(req.body) ? req.body.length : 'N/A') : 0,
            preview: Buffer.isBuffer(req.body) ? req.body.slice(0, 20).toString('hex') : 'N/A'
        }
    }, "[Stripe Webhook] Request received - full details for debugging");

    if (!webhookSecret || !signature) {
        logger.error("[Stripe Webhook] Missing secret or signature.");
        return res.status(400).send('Webhook Error: Missing signature or secret');
    }

    let event;
    try {
        if (!Buffer.isBuffer(req.body)) {
            logger.error("[Stripe Webhook] Request body is not a Buffer");
            return res.status(400).send('Webhook Error: Body not raw buffer');
        }

        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        logger.info({ eventType: event.type, eventId: event.id }, "[Stripe Webhook] ✅ Event verified");
    } catch (err) {
        logger.error({ err }, "[Stripe Webhook] ❌ Signature verification failed");
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Event-specific logic
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata || {};

            const orderId = metadata.order_id;
            const customerId = metadata.customer_id;
            const userId = metadata.user_id;

            logger.info({ orderId, customerId, userId, paymentIntentId: paymentIntent.id }, "✅ PaymentIntent succeeded");

            try {
                await updateOrderStatus(orderId, 'paid');
                await sendPaymentConfirmation({
                    orderId,
                    customerId,
                    userId,
                    amount: paymentIntent.amount,
                    paymentIntentId: paymentIntent.id
                });
                logger.info({ orderId }, "[Stripe Webhook] Order status updated and message sent.");
            } catch (error) {
                logger.error({ error, orderId }, "[Stripe Webhook] Failed to update order or publish message");
                return res.status(500).send('Server error processing payment');
            }

            break;

        default:
            logger.warn({ eventType: event.type }, "[Stripe Webhook] Unhandled event type");
    }

    res.status(200).json({ received: true });
};

// --- Update Order Status in DB ---
async function updateOrderStatus(orderId, status) {
    const query = `UPDATE "order" SET status = $1 WHERE id = $2`;
    const values = [status, orderId];

    const result = await db.query(query, values);
    if (result.rowCount === 0) {
        throw new Error(`Order ID ${orderId} not found or not updated`);
    }

    logger.info({ orderId, status }, '[DB] Order status updated');
}

// --- Send Payment Confirmation via RabbitMQ ---
async function sendPaymentConfirmation({ orderId, customerId, userId, amount, paymentIntentId }) {
    const message = {
        id: uuidv4(),
        type: 'payment_confirmation',
        timestamp: new Date().toISOString(),
        orderId,
        customerId,
        userId,
        amount,
        paymentIntentId
    };

    await publishMessage('payments', message);
    logger.info({ orderId }, '[RabbitMQ] Payment confirmation published');
}

