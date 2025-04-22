const express = require('express');
const path = require('path');
const generatePDF = require('../scripts/generateReportPDF');

const router = express.Router();

router.post('/generate-healthshift', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../public/reports/healthshift-report.pdf');

    await generatePDF(filePath, {
      user_name: req.body.name || 'Anonymous',
    });

    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to generate report.');
  }
});

module.exports = router;
