const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

// Define a safe and flexible log path
const logDirectory = path.resolve(__dirname, '..', 'logs');
const logFilePath = path.join(logDirectory, 'log.txt');

// Ensure the log directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ status: 'error', error: 'Invalid log message' });
  }

  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${message}\n`;

  try {
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
    res.json({ status: 'logged' });
  } catch (err) {
    console.error('❌ Log write failed:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
