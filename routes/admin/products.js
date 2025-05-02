const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // Adjust path to match your db config location

// GET product metadata
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      'SELECT * FROM product_metadata WHERE product_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product metadata not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET product metadata error:', err);
    res.status(500).json({ error: 'Failed to fetch product metadata' });
  }
});

// CREATE or UPDATE product metadata (UPSERT)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { report_title, header_image_url } = req.body;
  
  try {
    // Check if record exists
    const checkResult = await db.query(
      'SELECT * FROM product_metadata WHERE product_id = $1',
      [id]
    );
    
    let result;
    
    if (checkResult.rows.length === 0) {
      // Insert new record if it doesn't exist
      result = await db.query(
        `INSERT INTO product_metadata 
         (product_id, report_title, header_image_url, created_at, updated_at)
         VALUES ($1, $2, $3, now(), now())
         RETURNING *`,
        [id, report_title, header_image_url]
      );
    } else {
      // Update existing record
      result = await db.query(
        `UPDATE product_metadata 
         SET report_title = $1, header_image_url = $2, updated_at = now()
         WHERE product_id = $3
         RETURNING *`,
        [report_title, header_image_url, id]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH product metadata error:', err);
    res.status(500).json({ error: 'Failed to update product metadata' });
  }
});

module.exports = router;
