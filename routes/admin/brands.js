// admin/routes/brands.js
const express = require('express');
const router = express.Router();
const db = require('../../config/db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`SELECT id, name, slug FROM brands ORDER BY name ASC`);
    res.json(result.rows); // <-- Fixed - return just the rows array
  } catch (err) {
    console.error('Error fetching brands:', err);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});
module.exports = router;
