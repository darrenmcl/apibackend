// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Use your PG client wrapper

// GET /admin/email-logs
router.get('/email-logs', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, to_address, subject, status, created_at, sent_at, error
      FROM email_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch email logs:', err);
    res.status(500).json({ error: 'Could not load logs' });
  }
});

module.exports = router;
