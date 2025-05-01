const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // Adjust path as needed

// GET all prompts for a given product
router.get('/', async (req, res) => {
  const { product_id } = req.query;
  if (!product_id) return res.status(400).json({ error: 'Missing product_id' });

  try {
    const result = await db.query(
      'SELECT * FROM prompts WHERE product_id = $1 ORDER BY section_key',
      [product_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET prompts error:', err);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// POST new prompt
router.post('/', async (req, res) => {
  const { product_id, section_key, prompt_text } = req.body;
  if (!product_id || !section_key || !prompt_text) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const insertQuery = `
      INSERT INTO prompts (product_id, section_key, prompt_text, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING *`;
    const result = await db.query(insertQuery, [product_id, section_key, prompt_text]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST prompt error:', err);
    res.status(500).json({ error: 'Failed to add prompt' });
  }
});

// PATCH deactivate prompt
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    const updateQuery = `
      UPDATE prompts SET is_active = $1, updated_at = now()
      WHERE id = $2 RETURNING *`;
    const result = await db.query(updateQuery, [is_active, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH prompt error:', err);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

module.exports = router;
