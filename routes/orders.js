// /var/projects/backend-api/routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth'); // Use shared auth
const isAdmin = require('../middlewares/isAdmin'); // Import isAdmin

// POST create a new order (Authenticated users) - OK as is
router.post('/', auth, async (req, res) => {
  try {
    // Use authenticated user's ID from req.user (ensure 'id' matches JWT payload)
    // JWT payload used 'userId', let's assume auth middleware maps it to req.user.id
    const user_id = req.user.userId; // Or req.user.id depending on your auth middleware
    if (!user_id) {
        return res.status(401).json({message: 'User ID not found in token.'}); // Safeguard
    }
    const { total, status } = req.body; // Consider adding items array etc.

    if (total === undefined || total === null) {
      return res.status(400).json({ message: 'Total is required.' });
    }
     const numericTotal = Number(total);
     if (isNaN(numericTotal) || numericTotal < 0) {
        return res.status(400).json({ message: 'Total must be a non-negative number.' });
    }


    const result = await db.query(
      'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, numericTotal, status || 'pending']
    );

    res.status(201).json({ message: 'Order created successfully.', order: result.rows[0] });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error creating order.' });
  }
});

// GET user's own orders (Authenticated users)
router.get('/my-orders', auth, async (req, res) => {
    try {
        const userId = req.user.userId; // Get ID from authenticated user
         if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}

        const result = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Server error fetching user orders.' });
    }
});


// GET a single order by ID (Owner or Admin only) - REVISED
// Add 'auth' middleware, logic check inside
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // User ID from token
    const userRole = req.user.role; // User role from token

    if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}


    const result = await db.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = result.rows[0];

    // Check if the logged-in user is the owner OR an admin
    if (order.user_id !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to view this order.' });
    }

    // Allow access if owner or admin
    res.status(200).json(order);

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error fetching order.' });
  }
});

// PUT update an existing order (Admin Only)
// Add 'isAdmin' middleware
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { total, status } = req.body; // Add other fields if needed (e.g., tracking_number)

    // Add validation
     if (total === undefined || status === undefined) {
       return res.status(400).json({ message: 'Total and status are required for update.' });
     }
      const numericTotal = Number(total);
      if (isNaN(numericTotal) || numericTotal < 0) {
         return res.status(400).json({ message: 'Total must be a non-negative number.' });
     }
     // Add validation for status values if applicable (e.g., ['pending', 'shipped', 'delivered'])


    const result = await db.query(
      'UPDATE orders SET total = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *', // Use updated_at convention
      [numericTotal, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order updated successfully.', order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error updating order.' });
  }
});

// DELETE an order (Admin Only)
// Add 'isAdmin' middleware
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    res.status(200).json({ message: 'Order deleted successfully.', order: result.rows[0] });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error deleting order.' });
  }
});

// GET ALL orders (Admin Only) - Example new route
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        // Simple query to get all orders, newest first
        const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server error fetching all orders.' });
    }
});


module.exports = router;
