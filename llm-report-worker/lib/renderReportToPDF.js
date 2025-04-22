const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Renders a business report into a PDF buffer using Puppeteer and HTML template.
 * @param {Object} data - An object containing placeholder keys and values.
 * @returns {Buffer} - PDF buffer ready for upload or saving.
 */
async function renderReportToPDF(data = {}) {
  const templatePath = path.join(__dirname, '../templates/report-template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace each placeholder with provided values
  Object.entries(data).forEach(([key, value]) => {
    const pattern = new RegExp(`{{\s*${key}\s*}}`, 'g');
    const formattedValue = value
      ? value
          .split(/\n{2,}/g) // split paragraphs
          .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`) // wrap in <p> and convert line breaks
          .join('\n')
      : '';
    html = html.replace(pattern, formattedValue);
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = renderReportToPDF;
