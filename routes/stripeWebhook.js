// /var/projects/backend-api/stripeWebhook.js (REVISED AND COMPLETE)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10' // Use consistent API version
});
const db = require('../config/db'); // Adjust path if needed
const logger = require('../lib/logger'); // Adjust path if needed
const { publishMessage } = require('../lib/rabbit'); // Adjust path if needed
const { v4: uuidv4 } = require('uuid');

// --- Main Webhook Handler Function ---
// Exported directly for use in server.js with express.raw()
module.exports = async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];
console.log('Raw body (hex preview):', req.body.toString('hex').slice(0, 100));
logger.info({ webhookSecret }, '[DEBUG] Using this Stripe Webhook Secret');
    logger.info({ path: req.originalUrl }, "[Stripe Webhook] Request received.");
    logger.debug({ contentType: req.headers['content-type'], isBuffer: Buffer.isBuffer(req.body) }, "[Stripe Webhook] Body check");

    if (!webhookSecret || !signature) {
        logger.error("[Stripe Webhook] Missing secret or signature headers.");
        return res.status(400).send('Webhook Error: Missing signature or secret');
    }

    let event;
    try {
        // Verify signature with raw body from express.raw()
        if (!Buffer.isBuffer(req.body)) {
            throw new Error("Webhook Error: Request body not a Buffer (express.raw() likely not applied correctly in server.js).");
        }
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        logger.info({ eventType: event.type, eventId: event.id }, "[Stripe Webhook] ✅ Event signature verified");
    } catch (err) {
        logger.error({ err }, "[Stripe Webhook] ❌ Signature verification failed");
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // --- Handle payment_intent.succeeded ---
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.order_id;
        const customerId = paymentIntent.metadata?.customer_id; // For ownership check
        const userId = paymentIntent.metadata?.user_id; // Optional logging

        logger.info({ paymentIntentId: paymentIntent.id, orderId, customerId, userId }, "Processing payment_intent.succeeded.");

        if (!orderId) {
             logger.error({ metadata: paymentIntent.metadata, paymentIntentId: paymentIntent.id }, "Webhook Error: Missing order_id in payment intent metadata!");
             return res.status(200).send('Webhook Received (Success - Ignored: Metadata missing)');
        }

        let dbClient = null; // Transaction client
        try {
            dbClient = await db.connect();
            await dbClient.query('BEGIN');
            logger.info({ orderId }, "Webhook: Transaction started.");

            // 1. Update order status securely (using helper below)
            const statusUpdated = await updateOrderStatusSecurely(
                dbClient,
                orderId,
                'paid',
                customerId, // Pass customerId for ownership check
                paymentIntent.id
            );

            if (statusUpdated) {
                logger.info({ orderId }, `Webhook: Order status updated to 'paid'.`);

                // 2. Check items & publish LLM job
                logger.info({ orderId }, `Webhook: Checking items for LLM generation...`);
                const itemsQuery = `
                    SELECT oli.product_id, p.name as productName, p.requires_llm_generation
                    FROM order_item oi
                    JOIN order_line_item oli ON oli.id = oi.item_id
                    JOIN products p ON oli.product_id::integer = p.id
                    WHERE oi.order_id = $1`;
                const itemsResult = await dbClient.query(itemsQuery, [orderId]);
                logger.debug({ itemCount: itemsResult.rows.length }, "Webhook: Items query completed.");

                let jobsPublishedCount = 0;
                for (const item of itemsResult.rows) {
                    logger.debug({ itemProductId: item.product_id, reqLlm: item.requires_llm_generation }, "Webhook: Checking item...");
                    if (item.requires_llm_generation === true) { // Explicit check
                        const productId = parseInt(item.product_id, 10);
                        logger.info({ orderId, productId }, `Webhook: Product requires LLM generation. Publishing job...`);
                        const targetS3Key = `digital-downloads/reports/${orderId}/prod_${productId}_${uuidv4()}.pdf`;
                        const jobMessage = { orderId, customerId, userId: userId || null, productId, productName: item.productName, targetS3Key };
                        const queueName = 'llm_report_jobs';

                        logger.info({ queue: queueName, job: jobMessage }, `Webhook: Attempting to publish LLM job...`);
                        const published = await publishMessage(queueName, jobMessage, true);

                        if (published) {
                            logger.info({ job: {orderId: jobMessage.orderId, productId: jobMessage.productId} }, `Webhook: Job published successfully to ${queueName}.`);
                            jobsPublishedCount++;
                            // Optionally update order_line_item metadata here if needed
                        } else {
                            logger.error({ job: jobMessage }, `Webhook Error: Failed to publish job to ${queueName}!`);
                            throw new Error(`Failed to publish LLM job for order ${orderId}, product ${productId}`);
                        }
                    } else {
                         logger.debug({ productId: item.product_id }, "Webhook: Product does not require LLM generation.");
                    }
                } // end for loop

                // 3. Optionally publish general payment confirmation (if still needed)
                // await sendPaymentConfirmation(dbClient, { orderId, customerId, userId, amount: paymentIntent.amount, paymentIntentId: paymentIntent.id });


            } else {
                 logger.warn({ orderId, customerId }, `Webhook: Order status was not updated (likely already 'paid' or ownership mismatch). LLM job check skipped.`);
            }

            // Commit transaction regardless of whether jobs were published (status update might have occurred)
            await dbClient.query('COMMIT');
            logger.info({ orderId }, `Webhook: Transaction committed.`);

        } catch (error) { // Catch errors during DB or RabbitMQ ops
            logger.error({ err: error, orderId }, "Webhook Error: Exception during processing.");
            if (dbClient) {
                 try { await dbClient.query('ROLLBACK'); logger.warn({ orderId }, "Webhook: Transaction rolled back."); }
                 catch (rbError) { logger.error({ err: rbError }, "Webhook Error: Failed to rollback."); }
            }
            return res.status(500).send(`Webhook processing error: ${error.message}`);
        } finally {
             if (dbClient) { dbClient.release(); logger.debug({ orderId }, "Webhook: DB client released."); }
        }

    } else { // Handle other event types if needed
        logger.warn({ eventType: event.type }, "[Stripe Webhook] Unhandled event type received.");
    }

    // Acknowledge receipt to Stripe if no error response sent earlier
    res.status(200).json({ received: true });
};

// --- Helper: Update Order Status Securely ---
// Updates status, paid_at, payment_intent_id ONLY if order belongs to customer (if provided) and status allows update
async function updateOrderStatusSecurely(dbClient, orderId, status, customerId, paymentIntentId = null) {
    logger.info({ orderId, status, customerId }, '[DB Helper] Attempting secure order status update...');
    const updateFields = [`status = $1`, `updated_at = NOW()`];
    const values = [status];
    let paramIndex = 2;

    if (status === 'paid') {
        // Use parameterized query for paid_at
        updateFields.push(`paid_at = $${paramIndex++}`);
        values.push(new Date()); // Use current timestamp as value
        if (paymentIntentId) {
            updateFields.push(`payment_intent_id = $${paramIndex++}`);
            values.push(paymentIntentId);
        }
    }

    values.push(orderId);
    const orderIdParamIndex = paramIndex++;
    // Add customerId check to WHERE clause ONLY if customerId is provided
    const customerIdClause = customerId ? `AND customer_id = $${paramIndex++}` : '';
    if (customerId) values.push(customerId);

    const query = `
        UPDATE "order"
        SET ${updateFields.join(', ')}
        WHERE id = $${orderIdParamIndex} ${customerIdClause}
          AND status = 'pending' -- Only update if currently pending
        RETURNING id`;

    logger.debug({ query: query.replace(/\s+/g, ' '), params: values }, `Executing secure status update.`);
    const result = await dbClient.query(query, values);

    if (result.rowCount > 0) {
        logger.info({ orderId, status }, '[DB Helper] Order status updated successfully.');
        return true; // Indicate success
    } else {
        logger.warn({ orderId, status, customerId }, '[DB Helper] Order status not updated (order not found, customer mismatch, or status not pending).');
        return false; // Indicate no rows updated
    }
}

// --- Helper: Send Payment Confirmation (Optional - Keep if needed) ---
// Consider moving this to be triggered by the 'payments' queue consumer if you have one
async function sendPaymentConfirmation(dbClient, { orderId, customerId, userId, amount, paymentIntentId }) {
  const message = { id: uuidv4(), type: 'payment_confirmation', timestamp: new Date().toISOString(), orderId, customerId, userId, amount, paymentIntentId };
  const published = await publishMessage('payments', message, true);
  if (published) {
    logger.info({ orderId }, '[RabbitMQ] Payment confirmation published to payments queue');
  } else {
     logger.error({ orderId }, '[RabbitMQ] Failed to publish payment confirmation to payments queue');
  }
}
