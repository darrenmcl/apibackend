// /var/projects/backend-api/stripeWebhook.js (CORRECTED AND COMPLETE)

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

    // Use concise logging for request received
    logger.info({ path: req.originalUrl }, "[Stripe Webhook] Request received.");
    logger.debug({ isBuffer: Buffer.isBuffer(req.body) }, "[Stripe Webhook] Body buffer check");

    if (!webhookSecret || !signature) {
        logger.error("[Stripe Webhook] Missing secret or signature headers.");
        return res.status(400).send('Webhook Error: Missing signature or secret');
    }

    let event;
    try {
        // Verify signature with raw body from express.raw()
        if (!Buffer.isBuffer(req.body)) {
            throw new Error("Webhook Error: Request body not a Buffer.");
        }
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        logger.info({ eventType: event.type, eventId: event.id }, "[Stripe Webhook] ✅ Event signature verified");
    } catch (err) {
        logger.error({ errMessage: err.message }, "[Stripe Webhook] ❌ Signature verification failed");
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
             // Acknowledge event to Stripe but log error
             return res.status(200).send('Webhook Received (Success - Ignored: Metadata missing)');
        }

        let dbClient = null; // Transaction client
        let jobsPublishedCount = 0; // Counter for LLM jobs

        try {
            dbClient = await db.connect();
            await dbClient.query('BEGIN');
            logger.info({ orderId }, "Webhook: Transaction started.");

            // 1. Verify Order Existence & Ownership, Get Current Status
            const orderCheckQuery = `SELECT status, customer_id FROM "order" WHERE id = $1 ${customerId ? 'AND customer_id = $2' : ''}`;
            const orderCheckParams = customerId ? [orderId, customerId] : [orderId];
            const orderCheckResult = await dbClient.query(orderCheckQuery, orderCheckParams);

            if (orderCheckResult.rows.length === 0) {
                 logger.warn({ orderId, customerId }, `Webhook: Order not found or doesn't belong to expected customer.`);
                 await dbClient.query('COMMIT'); // Commit (nothing changed)
                 return res.status(200).send('Webhook Received (Success - Order not found/verified)');
            }
            const currentStatus = orderCheckResult.rows[0].status;
            const verifiedCustomerId = orderCheckResult.rows[0].customer_id;
            logger.info({ orderId, currentStatus }, "Webhook: Checked current order status.");

            let isPaid = (currentStatus === 'paid'); // Flag if already paid

            // 2. Update status ONLY if it's currently 'pending'
            if (currentStatus === 'pending') {
                // Use the secure helper function (defined below)
                const statusUpdated = await updateOrderStatusSecurely(dbClient, orderId, 'paid', verifiedCustomerId, paymentIntent.id);
                if (statusUpdated) {
                    logger.info({ orderId }, `Webhook: Order status updated to 'paid'.`);
                    isPaid = true; // Now it's definitely paid
                } else {
                    logger.warn({ orderId }, `Webhook: Update status query affected 0 rows.`);
                    // Re-check status in case of race condition? For now assume it might already be paid.
                    const recheckStatusResult = await dbClient.query('SELECT status FROM "order" WHERE id = $1', [orderId]);
                    if (recheckStatusResult.rows?.[0]?.status === 'paid') isPaid = true;
                }
            }

            // --- Proceed ONLY if order IS paid ---
            if (isPaid) {
                // 3. Check items & publish LLM job <<< THIS WAS MISSING >>>
                logger.info({ orderId }, `Webhook: Order is 'paid', checking items for LLM generation...`);
                const itemsQuery = `
                    SELECT oli.product_id, p.name as productName, p.requires_llm_generation
                    FROM order_item oi
                    JOIN order_line_item oli ON oli.id = oi.item_id
                    JOIN products p ON oli.product_id::integer = p.id
                    WHERE oi.order_id = $1`;
                const itemsResult = await dbClient.query(itemsQuery, [orderId]);
                logger.debug({ itemCount: itemsResult.rows.length }, "Webhook: Items query completed.");

                for (const item of itemsResult.rows) {
                    logger.debug({ itemProductId: item.product_id, reqLlm: item.requires_llm_generation }, "Webhook: Checking item...");
                    if (item.requires_llm_generation === true) { // Check the flag
                        const productId = parseInt(item.product_id, 10);
                        logger.info({ orderId, productId }, `Webhook: Product requires LLM generation. Publishing job...`);
                        const targetS3Key = `digital-downloads/reports/${orderId}/prod_${productId}_${uuidv4()}.pdf`; // Unique key
                        const jobMessage = { orderId, customerId: verifiedCustomerId, userId: userId || null, productId, productName: item.productName, targetS3Key };
                        const queueName = 'llm_report_jobs'; // Target LLM queue

                        logger.info({ queue: queueName, job: jobMessage }, `Webhook: Attempting to publish LLM job...`);
                        const published = await publishMessage(queueName, jobMessage, true); // Use generic publisher

                        if (!published) {
                            logger.error({ job: jobMessage }, `Webhook Error: Failed to publish job to ${queueName}!`);
                            throw new Error(`Failed to publish LLM job for order ${orderId}, product ${productId}`);
                        }
                        logger.info({ job: {orderId: jobMessage.orderId, productId: jobMessage.productId} }, `Webhook: Job published successfully to ${queueName}.`);
                        jobsPublishedCount++;
                        // Optional: Update order_line_item metadata
                    }
                } // end for loop

            } else {
                 logger.warn({ orderId, currentStatus }, "Webhook: Order status not 'paid', LLM job check skipped.");
            }

            // 4. Commit Transaction
            await dbClient.query('COMMIT');
            logger.info({ orderId, jobsPublished: jobsPublishedCount }, `Webhook: Transaction committed.`);

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
}; // End module.exports

// --- Helper: Update Order Status Securely ---
// Updates status, paid_at, payment_intent_id ONLY if order belongs to customer (if provided) and status allows update
async function updateOrderStatusSecurely(dbClient, orderId, status, customerId, paymentIntentId = null) {
    const logger = require('./lib/logger'); // Need logger instance here too
    logger.info({ orderId, status, customerId }, '[DB Helper] Attempting secure order status update...');
    const updateFields = [`status = $1`, `updated_at = NOW()`]; // Use quoted "updatedAt" if needed
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
    // Add customerId check to WHERE clause ONLY if customerId is available
    const customerIdClause = customerId ? `AND customer_id = $${paramIndex++}` : '';
    if (customerId) values.push(customerId);

    // Only attempt update if status is currently 'pending'
    const query = `
        UPDATE "order"
        SET ${updateFields.join(', ')}
        WHERE id = $${orderIdParamIndex} ${customerIdClause}
          AND status = 'pending'
        RETURNING id`;

    logger.debug({ query: query.replace(/\s+/g, ' '), params: values }, `Executing secure status update.`);
    const result = await dbClient.query(query, values); // Use passed-in client

    if (result.rowCount > 0) {
        logger.info({ orderId, status }, '[DB Helper] Order status updated successfully.');
        return true; // Indicate success
    } else {
        logger.warn({ orderId, status, customerId }, '[DB Helper] Order status not updated (order not found, customer mismatch, or status not pending).');
        return false; // Indicate no rows updated
    }
}

// Remove the optional sendPaymentConfirmation helper if not needed or handled elsewhere
// async function sendPaymentConfirmation(...) { ... }
