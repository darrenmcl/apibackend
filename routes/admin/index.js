const express = require('express');
const router = express.Router();

// Import the generate-report route
const generateReportRouter = require('./generateReport'); // or whatever the file is named

// Mount the generate-report route
router.use('/generate-report', generateReportRouter);

module.exports = router;
