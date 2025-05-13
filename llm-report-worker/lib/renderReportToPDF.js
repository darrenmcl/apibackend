const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Renders a business report into a PDF buffer using Puppeteer and HTML template.
 * @param {Object} data - An object containing placeholder keys and values.
 * @returns {Buffer} - PDF buffer ready for upload or saving.
 */
async function renderReportToPDF(data = {}) {
  const templateName = data.template_file || 'report-template-default.html';
  const templatePath = path.join(__dirname, '../templates', templateName);

// Handle fallback if file doesn't exist
if (!fs.existsSync(templatePath)) {
  throw new Error(`Template "${templateName}" not found in /templates`);
}

let html = fs.readFileSync(templatePath, 'utf8');


  html = html.replace(/<header class=".*?<\/header>/s, '');

  const headerVisual = `
  <section class="mb-10 text-center">
    <img src="${data.header_image_url}" alt="Report Banner" class="mx-auto w-[80%] max-w-2xl h-auto rounded-lg shadow-md mb-4" />
    <h1 class="text-3xl font-bold text-blue-700">${data.report_title}</h1>
    <p class="text-lg font-medium">${data.subtitle || ''}</p>
  </section>
  `;
  html = html.replace('<body>', `<body>\n${headerVisual}`);

  // Load prompts from the DB if product_id is passed
  const prompts = {};
  if (data.product_id) {
    const result = await db.query(
      'SELECT section_key, prompt_text FROM prompts WHERE product_id = $1 AND is_active = true',
      [data.product_id]
    );
    for (const row of result.rows) {
      let prompt = row.prompt_text;
      for (const [token, value] of Object.entries(data)) {
        prompt = prompt.replace(new RegExp(`{{\s*${token}\s*}}`, 'g'), value);
      }
      prompts[row.section_key] = prompt;
    }
  }

  // Insert content into placeholders with formatting
Object.entries(data).forEach(([key, value]) => {
  const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');

  const stringValue = typeof value === 'string' ? value : String(value ?? '');

  const formattedValue = stringValue.split(/\n{2,}/g).map(paragraph => {
    if (paragraph.trim().startsWith('- ') || /^\d+\.\s/.test(paragraph.trim())) {
      const listItems = paragraph.split(/\n/).map(line =>
        `<li>${line.replace(/^[-\d.\s]+/, '').trim()}</li>`).join('');
      return `<ul class="list-disc pl-6 mb-4">${listItems}</ul>`;
    }
    return `<p class="mb-4">${paragraph.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  html = html.replace(pattern, formattedValue);
});


  const sectionIcons = {
    'Executive Summary': 'https://assets.performancecorporate.com/uploads/1745428226034-Executive-Summary-Icon.svg',
    'Market Trends': 'https://assets.performancecorporate.com/uploads/1745428212861-Market-Trends-Icon.svg',
    'Regional Differences': 'https://assets.performancecorporate.com/uploads/1745428202452-Regional-Differences.svg',
    'Customer Pain Points': 'https://assets.performancecorporate.com/uploads/1745428192092-Customer-Paint-Points.svg',
    'Marketing Strategies': 'https://assets.performancecorporate.com/uploads/1745428180583-Marketing-Strategies-Icon.svg',
    'Business Opportunities': 'https://assets.performancecorporate.com/uploads/1745428168869-Business-Opportunities-Icon.svg'
  };

  for (const [title, iconUrl] of Object.entries(sectionIcons)) {
    const cleanTitle = title.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
    const regex = new RegExp(`<h2 class=\\"section-title\\">.*?${cleanTitle}.*?<\\/h2>`, 'i');
    const replacement = `
      <h2 class="section-title flex items-center gap-3 mb-4">
        <img src="${iconUrl}" alt="${title} Icon" class="w-8 h-8" />
        ${title}
      </h2>
    `;
    html = html.replace(regex, replacement);
  }

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
