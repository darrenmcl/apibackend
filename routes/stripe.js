// /var/projects/backend-api/routes/stripe.js (REVISED & COMPLETE)

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Ensure key is set
const auth = require('../middlewares/auth'); // For create-payment-intent
const db = require('../config/db');           // Database pool
const logger = require('../lib/logger');       // Pino logger
const { publishMessage } = require('../lib/rabbit'); // Generic RabbitMQ publisher
const { v4: uuidv4 } = require('uuid');       // For generating unique elements like S3 keys

// --- Create Payment Intent Route ---
// Handles requests to POST /stripe/create-payment-intent (mounted at /stripe in server.js)
router.post('/create-payment-intent', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [POST /stripe/create-payment-intent] Request received.`);
    try {
        const { amount, currency, orderId } = req.body;
        const customerId = req.user?.customerId;
        const userId = req.user?.userId; // Pass userId in metadata too if available/useful

        // Validation
        if (!amount || !currency || !orderId || !customerId) {
            logger.error({ amount, currency, orderId, customerId, userId }, '[Create PI] Missing required data');
            return res.status(400).json({ message: 'Amount, currency, orderId, and customerId are required.' });
        }
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            logger.warn({ amount }, '[Create PI] Invalid amount received');
            return res.status(400).json({ message: 'Invalid amount specified (must be > 0).' });
        }

        logger.info({ orderId, customerId, userId, amount: numericAmount }, `[Create PI] Creating Payment Intent.`);

        // Create PaymentIntent with metadata
        const paymentIntent = await stripe.paymentIntents.create({
            amount: numericAmount,
            currency: currency,
            metadata: {
                order_id: orderId,       // Internal TEXT order ID
                customer_id: customerId, // Internal TEXT customer ID
                user_id: String(userId || '') // Optional: user ID (must be string)
            },
            // Add other necessary parameters like payment_method_types if needed
        });

        logger.info({ paymentIntentId: paymentIntent.id, orderId }, `[Create PI] Payment Intent created successfully.`);
        res.status(200).json({ clientSecret: paymentIntent.client_secret });

    } catch (error) {
        logger.error({ err: error }, '[Create PI] Error creating payment intent');
        res.status(500).json({ message: 'Server error creating payment intent.', error: error.message });
    }
});

// --- Stripe Webhook Handler ---
// Handles requests to POST /webhook/stripe (mounted directly with express.raw() in server.js)
router.post('/', async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        logger.error("[Stripe Webhook] FATAL: STRIPE_WEBHOOK_SECRET env var not set!");
        return res.status(500).send('Server configuration error: Webhook secret missing.');
    }

    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // Verify signature using the raw body buffer (provided by express.raw)
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        logger.info({ eventType: event.type, eventId: event.id }, "[Stripe Webhook] Event signature verified.");
    } catch (err) {
        logger.error({ err }, `[Stripe Webhook] Webhook signature verification failed.`);
        // Return 400 to Stripe if signature is bad
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event based on its type
    switch (event.type) {
        case 'payment_intent.succeeded': // <<< Handle this event
            const paymentIntent = event.data.object;
            const orderId = paymentIntent.metadata?.order_id;
            const customerId = paymentIntent.metadata?.customer_id; // Use this for verification if available
            const userId = paymentIntent.metadata?.user_id;

            logger.info({ paymentIntentId: paymentIntent.id, status: paymentIntent.status, orderId, customerId, userId }, `Processing payment_intent.succeeded.`);

            if (!orderId) {
                 logger.error({ metadata: paymentIntent.metadata, paymentIntentId: paymentIntent.id }, "Webhook Error: Missing order_id in payment intent metadata!");
                 // Acknowledge event to Stripe but log error
                 return res.status(200).send('Webhook Received (Success - Ignored: Metadata missing)');
            }

            // --- Process successful payment ---
            let dbClient = null; // Transaction client
            try {
                dbClient = await db.connect();
                await dbClient.query('BEGIN');
                logger.info({ orderId }, "Webhook: Transaction started for paid order processing.");

                // 1. Update order status to 'paid'
                // Include customerId in WHERE clause if available for extra check
                const updateQuery = `
                    UPDATE "order"
                    SET status = 'paid', paid_at = NOW(), payment_intent_id = $1, updated_at = NOW()
                    WHERE id = $2 ${customerId ? 'AND customer_id = $3' : ''} AND status = 'pending'
                    RETURNING id, customer_id`; // Return needed data
                const updateParams = customerId ? [paymentIntent.id, orderId, customerId] : [paymentIntent.id, orderId];
                const updateResult = await dbClient.query(updateQuery, updateParams);

                if (updateResult.rowCount === 0) {
                     logger.warn({ orderId, customerId }, `Webhook: Order status not updated via payment_intent.succeeded. Reason: Order not found for customer, not in 'pending' state, or already processed.`);
                     await dbClient.query('COMMIT'); // Still commit (nothing changed)
                     return res.status(200).send('Webhook Received (Success - Order status not updated)');
                }
                const updatedOrderCustomerId = updateResult.rows[0].customer_id || customerId; // Use verified customer ID
                logger.info({ orderId }, `Webhook: Order status updated to 'paid'.`);

                // 2. Check items for LLM generation & publish job
                logger.info({ orderId }, `Webhook: Checking items for LLM generation...`);
                const itemsQuery = `
                    SELECT oli.product_id, p.name as productName, p.requires_llm_generation
                    FROM order_item oi
                    JOIN order_line_item oli ON oli.id = oi.item_id
                    JOIN products p ON oli.product_id::integer = p.id
                    WHERE oi.order_id = $1`;
                const itemsResult = await dbClient.query(itemsQuery, [orderId]);

                let jobsPublishedCount = 0;
                for (const item of itemsResult.rows) {
                    if (item.requires_llm_generation) { // Check the flag
                        const productId = parseInt(item.product_id, 10);
                        logger.info({ orderId, productId }, `Webhook: Product requires LLM generation. Publishing job...`);
                        const targetS3Key = `digital-downloads/reports/<span class="math-inline">\{orderId\}/prod\_</span>{productId}_${uuidv4()}.pdf`;
                        const jobMessage = {
                            orderId: orderId,
                            customerId: updatedOrderCustomerId, // Use verified/retrieved customerId
                            userId: userId || null,
                            productId: productId,
                            productName: item.productName,
                            targetS3Key: targetS3Key
                        };
                        const queueName = 'llm_report_jobs';
                        const published = await publishMessage(queueName, jobMessage, true); // Use generic publisher
                        if (published) {
                            logger.info({ job: {orderId: jobMessage.orderId, productId: jobMessage.productId} }, `Webhook: Job published successfully to ${queueName}.`);
                            jobsPublishedCount++;
                            // Optional: Update line item metadata
                        } else {
                            logger.error({ job: jobMessage }, `Webhook Error: Failed to publish job to ${queueName}!`);
                            throw new Error(`Failed to publish LLM job for order ${orderId}, product ${productId}`); // Throw to trigger rollback
                        }
                    }
                }
                // 3. Commit Transaction
                await dbClient.query('COMMIT');
                logger.info({ orderId, jobsPublished: jobsPublishedCount }, `Webhook: Transaction committed.`);

            } catch (error) { // Catch errors during DB or RabbitMQ ops
                logger.error({ err: error, orderId }, "Webhook Error: Exception during paid order processing or job publishing.");
                if (dbClient) { // Rollback if client exists
                     try { await dbClient.query('ROLLBACK'); logger.warn({ orderId }, "Webhook: Transaction rolled back due to error."); }
                     catch (rbError) { logger.error({ err: rbError }, "Webhook Error: Failed to rollback transaction."); }
                }
                return res.status(500).send(`Webhook processing error: ${error.message}`); // Send 500 to Stripe for retry attempt
            } finally {
                 if (dbClient) { dbClient.release(); } // Release client in finally block
                 logger.debug({ orderId }, "Webhook: DB client released.");
            }
            break; // End case 'payment_intent.succeeded'

        // Add case 'checkout.session.completed': if using Stripe Checkout sessions elsewhere?

        default:
            logger.warn({ eventType: event.type }, `Webhook: Unhandled event type received.`);
    } // End switch

    // Acknowledge receipt to Stripe
    res.status(200).json({ received: true });
}); // End webhook handler POST '/'

module.exports = router; // Export the router
