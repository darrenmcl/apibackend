const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generatePDF(outputPath, replacements = {}) {
  const templatePath = path.join(__dirname, '../templates/report-template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Basic replacements (customize this!)
  html = html.replace('{{user_name}}', replacements.user_name || 'Customer');
  html = html.replace('{{today’s date}}', new Date().toLocaleDateString());

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });

  await browser.close();
  return outputPath;
}

module.exports = generatePDF;
