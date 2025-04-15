// /var/projects/backend-api/routes/stripeWebhook.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const logger = require('../lib/logger');
const { publishMessage } = require('../lib/rabbit');
const { v4: uuidv4 } = require('uuid');

// Export a middleware function directly (not a router)
module.exports = async (req, res) => {
    // Enhanced debugging for webhook issues
    logger.info({
        headers: {
            'content-type': req.headers['content-type'],
            'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing'
        },
        bodyFormat: {
            isBuffer: Buffer.isBuffer(req.body),
            type: typeof req.body,
            byteLength: req.body ? (Buffer.isBuffer(req.body) ? req.body.length : 'N/A') : 0,
            preview: Buffer.isBuffer(req.body) ? req.body.slice(0, 20).toString('hex') : 'N/A'
        }
    }, "[Stripe Webhook] Request received - full details for debugging");

    // TEST MODE: Simply acknowledge receipt to diagnose body parsing issues
    return res.status(200).json({ 
        received: true,
        debug: {
            bodyIsBuffer: Buffer.isBuffer(req.body),
            bodyLength: req.body ? (Buffer.isBuffer(req.body) ? req.body.length : 'N/A') : 0,
            signaturePresent: !!req.headers['stripe-signature']
        }
    });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        logger.error("[Stripe Webhook] FATAL: STRIPE_WEBHOOK_SECRET env var not set!");
        return res.status(500).send('Server configuration error: Webhook secret missing.');
    }

    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
        logger.error("[Stripe Webhook] No stripe-signature header present");
        return res.status(400).send('Webhook Error: No stripe-signature header');
    }

    let event;

    try {
        // Make sure req.body is a Buffer (express.raw should handle this)
        if (!Buffer.isBuffer(req.body)) {
            logger.error("[Stripe Webhook] req.body is not a Buffer as expected");
            return res.status(400).send('Webhook Error: Request body not received as raw buffer');
        }
        
        // Verify signature using the raw body buffer
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        logger.info({ eventType: event.type, eventId: event.id }, "[Stripe Webhook] Event signature verified.");
    } catch (err) {
        logger.error({ 
            err,
            signature: signature,
            rawBodySample: Buffer.isBuffer(req.body) ? req.body.slice(0, 50).toString() : 'Not a buffer'
        }, `[Stripe Webhook] Webhook signature verification failed.`);
        
        // Return 400 to Stripe if signature is bad
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Rest of your webhook processing code...
    res.status(200).json({ received: true });

};
