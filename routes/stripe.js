const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middlewares/auth');

// POST create a payment intent (secured)
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ message: 'Amount and currency are required.' });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,      // amount in the smallest currency unit (e.g., cents)
      currency,    // e.g., 'usd'
      metadata: { integration_check: 'accept_a_payment' },
    });

    res.status(200).json({
      message: 'Payment intent created successfully.',
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Server error creating payment intent.' });
  }
});

module.exports = router;
