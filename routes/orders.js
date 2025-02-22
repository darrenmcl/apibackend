const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

// POST create a new order (secured)
router.post('/', auth, async (req, res) => {
  try {
    // Assuming req.user contains the authenticated user's info
    const user_id = req.user.id;
    const { total, status } = req.body;

    if (!total) {
      return res.status(400).json({ message: 'Total is required.' });
    }

    const result = await db.query(
      'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, total, status || 'pending']
    );

    res.status(201).json({ message: 'Order created successfully.', order: result.rows[0] });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error creating order.' });
  }
});


// GET a single order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error fetching order.' });
  }
});

// POST create a new order
router.post('/', async (req, res) => {
  try {
    const { user_id, total, status } = req.body;

    // Basic validation
    if (!user_id || !total) {
      return res.status(400).json({ message: 'User ID and total are required.' });
    }

    const result = await db.query(
      'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, total, status || 'pending']
    );

    res.status(201).json({ message: 'Order created successfully.', order: result.rows[0] });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error creating order.' });
  }
});

// PUT update an existing order (for example, to change status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { total, status } = req.body;

    // Update order; you could expand this as needed
    const result = await db.query(
      'UPDATE orders SET total = $1, status = $2 WHERE id = $3 RETURNING *',
      [total, status, id]
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

// DELETE an order
router.delete('/:id', async (req, res) => {
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

module.exports = router;
