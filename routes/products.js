const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

// GET all products (public)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error fetching products.' });
  }
});

// GET a single product by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error fetching product.' });
  }
});

// POST create a new product (protected)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required.' });
    }
    const result = await db.query(
      'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', price]
    );
    res.status(201).json({ message: 'Product created successfully.', product: result.rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product.' });
  }
});

// PUT update an existing product (protected)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    const result = await db.query(
      'UPDATE products SET name = $1, description = $2, price = $3 WHERE id = $4 RETURNING *',
      [name, description, price, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.status(200).json({ message: 'Product updated successfully.', product: result.rows[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error updating product.' });
  }
});

// DELETE a product (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.status(200).json({ message: 'Product deleted successfully.', product: result.rows[0] });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error deleting product.' });
  }
});

module.exports = router;
