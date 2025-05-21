const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // Adjust to your project structure

// GET product metadata by product ID
router.get('/:id(\\d+)', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM product_metadata WHERE product_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product metadata not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[GET /product_metadata/:id] Error:', err);
    res.status(500).json({ error: 'Failed to fetch product metadata' });
  }
});

// UPSERT product metadata for a product ID
router.patch('/:id(\\d+)', async (req, res) => {
  const { id } = req.params;
  const { report_title, header_image_url, report_subtitle } = req.body;

  if (!report_title && !header_image_url && !report_subtitle) {
    return res.status(400).json({ error: 'At least one field must be provided for update' });
  }

  try {
    const checkResult = await db.query(
      'SELECT * FROM product_metadata WHERE product_id = $1',
      [id]
    );

    let result;
    const timestamp = new Date();

    if (checkResult.rows.length === 0) {
      // Insert
      result = await db.query(
        `INSERT INTO product_metadata 
         (product_id, report_title, report_subtitle, header_image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING *`,
        [id, report_title || null, report_subtitle || null, header_image_url || null, timestamp]
      );
    } else {
      // Update only the provided fields
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (report_title !== undefined) {
        updates.push(`report_title = $${paramIndex++}`);
        values.push(report_title);
      }
      if (report_subtitle !== undefined) {
        updates.push(`report_subtitle = $${paramIndex++}`);
        values.push(report_subtitle);
      }
      if (header_image_url !== undefined) {
        updates.push(`header_image_url = $${paramIndex++}`);
        values.push(header_image_url);
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(timestamp);
      values.push(id); // last param is WHERE clause

      result = await db.query(
        `UPDATE product_metadata SET ${updates.join(', ')} WHERE product_id = $${paramIndex} RETURNING *`,
        values
      );
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[PATCH /product_metadata/:id] Error:', err);
    res.status(500).json({ error: 'Failed to update product metadata' });
  }
});

module.exports = router;
