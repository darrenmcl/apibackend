// /var/projects/backend-api/routes/stripe.js (REVISED)

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Ensure key is set
const auth = require('../middlewares/auth'); // For create-payment-intent
const logger = require('../lib/logger');     // Pino logger

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

// Other Stripe-related routes can be added here

module.exports = router; // Export the router
