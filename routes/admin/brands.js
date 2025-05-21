const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // Adjust path if needed

router.get('/brands', async (req, res) => {
  try {
    const result = await db.query(`SELECT id, name, slug FROM brands ORDER BY name ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching brands:', err);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

module.exports = router;
