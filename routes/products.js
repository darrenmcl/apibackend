// /var/projects/backend-api/routes/products.js
// --- REVISED ---

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth'); // Assuming path is correct
const isAdmin = require('../middlewares/isAdmin'); // <<< Import isAdmin middleware

// GET all products (public) - ADDED DETAILED LOGGING
router.get('/', async (req, res) => {
  console.log(`[${new Date().toISOString()}] [GET /products] Request received.`); // Log entry
  try {
    console.log(`[${new Date().toISOString()}] [GET /products] Attempting DB query...`);
    const startTime = Date.now();
    // Using explicit columns as suggested previously
    const result = await db.query('SELECT id, name, description, price, image, featured, created_at, updated_at FROM products ORDER BY created_at DESC');
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] [GET /products] DB query successful (${duration}ms). Found ${result.rows.length} rows.`); // Log success + timing

    console.log(`[${new Date().toISOString()}] [GET /products] Sending ${result.rows.length} products in response...`);
    res.status(200).json(result.rows);
    console.log(`[${new Date().toISOString()}] [GET /products] Response sent.`); // Log completion

  } catch (error) {
     console.error(`[${new Date().toISOString()}] [GET /products] Error during processing:`, error); // Log error details
     res.status(500).json({ message: 'Server error fetching products.' });
   }
});

// GET a single product by ID (public) - OK as is (assuming SELECT * is acceptable here or change to explicit)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Explicit columns recommended here too
    const result = await db.query('SELECT id, name, description, price, image, featured, created_at, updated_at FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error fetching product.' });
  }
});

// POST create a new product (Admin Only) - ADDED isAdmin
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, price, image, featured } = req.body; // Include image, featured
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ message: 'Name and price are required.' });
    }
     const numericPrice = Number(price);
     if (isNaN(numericPrice) || numericPrice < 0) {
         return res.status(400).json({ message: 'Price must be a non-negative number.' });
     }
     const imageValue = (image && image.trim() !== '') ? image.trim() : null;
     const featuredValue = typeof featured === 'boolean' ? featured : false; // Default featured to false

    const result = await db.query(
      'INSERT INTO products (name, description, price, image, featured) VALUES ($1, $2, $3, $4, $5) RETURNING *', // Added image, featured
      [name, description || '', numericPrice, imageValue, featuredValue] // Added imageValue, featuredValue
    );
    res.status(201).json({ message: 'Product created successfully.', product: result.rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product.' });
  }
});

// PUT update an existing product (Admin Only) - ADDED isAdmin
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image, featured } = req.body; // Include image, featured

    // Add validation as needed...
     if (name === undefined || price === undefined || price === null ) {
       if (!name || price < 0 ) {
          return res.status(400).json({ message: 'Name and a non-negative Price are required.' });
       }
     }
     const numericPrice = Number(price);
      if (isNaN(numericPrice)) {
           return res.status(400).json({ message: 'Price must be a valid number.' });
       }
     if (image !== undefined && image !== null && typeof image !== 'string') {
        return res.status(400).json({ message: 'Invalid image data type.' });
     }
     const imageValue = (image && image.trim() !== '') ? image.trim() : null;
     const featuredValue = typeof featured === 'boolean' ? featured : false; // Handle featured update

    // Assuming your table has an 'updated_at' column managed by DB or triggers
    const query = `
      UPDATE products
      SET name = $1, description = $2, price = $3, image = $4, featured = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *`;

    const values = [name, description, numericPrice, imageValue, featuredValue, id]; // Added featuredValue

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.status(200).json({ message: 'Product updated successfully.', product: result.rows[0] });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error updating product.' });
  }
});

// DELETE a product (Admin Only) - ADDED isAdmin
router.delete('/:id', auth, isAdmin, async (req, res) => {
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
