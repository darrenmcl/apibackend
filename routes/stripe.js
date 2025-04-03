// /var/projects/backend-api/routes/stripe.js

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middlewares/auth');

// POST create a payment intent (secured)
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    // Expect amount, currency, AND orderId from the frontend request body
    const { amount, currency, orderId } = req.body;
    // Get customerId from the authenticated user's token
    const customerId = req.user?.customerId;

    // Validation
    if (!amount || !currency || !orderId || !customerId) {
      console.error('[Create PI] Missing required data:', { amount, currency, orderId, customerId });
      return res.status(400).json({ message: 'Amount, currency, orderId, and customerId are required.' });
    }
    const numericAmount = Number(amount); // Ensure amount is number
     if (isNaN(numericAmount) || numericAmount <= 0) { // Amount should usually be > 0
        return res.status(400).json({ message: 'Invalid amount specified.' });
    }

    console.log(`[Create PI] Creating Payment Intent for Order ID: ${orderId}, Customer ID: ${customerId}, Amount: ${numericAmount}`);

    // Create a PaymentIntent with amount, currency, and METADATA
    const paymentIntent = await stripe.paymentIntents.create({
      amount: numericAmount, // Ensure amount is in the smallest currency unit (e.g., cents)
      currency: currency,   // e.g., 'usd'
      metadata: {
          // --- Store your internal IDs here ---
          order_id: orderId,         // Your internal TEXT order ID (e.g., order_...)
          customer_id: customerId    // Your internal TEXT customer ID (e.g., cus_...)
          // --- Add any other relevant metadata ---
      },
      // You might need to specify payment_method_types or setup_future_usage depending on your flow
      // payment_method_types: ['card'],
    });

    console.log(`[Create PI] Payment Intent ${paymentIntent.id} created successfully.`);

    // Send back ONLY the client_secret to the frontend
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error('[Create PI] Error creating payment intent:', error);
    res.status(500).json({ message: 'Server error creating payment intent.', error: error.message });
  }
});

// --- Add your Stripe Webhook Handler here later ---
// router.post('/webhook/stripe', express.raw({type: 'application/json'}), (req, res) => { ... });


module.exports = router;
