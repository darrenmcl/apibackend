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

  // Remove duplicate title block from <header>
  html = html.replace(/<header class=".*?<\/header>/s, '');

  // Insert updated hero section with cover image only once
  const headerVisual = `
    <section class="mb-10 text-center">
      <img src="https://assets.performancecorporate.com/uploads/1745426872792-Telehealth-Cover.svg" alt="Telehealth Header Image" class="mx-auto w-[80%] max-w-2xl h-auto rounded-lg shadow-md mb-4" />
      <h1 class="text-3xl font-bold text-blue-700">HealthShift 2025</h1>
      <p class="text-lg font-medium">Strategic Insights for Small Businesses in Healthcare and Telehealth</p>
    </section>
  `;
  html = html.replace('<body>', `<body>\n${headerVisual}`);

  // Replace each placeholder with provided values
  Object.entries(data).forEach(([key, value]) => {
    const pattern = new RegExp(`{{\s*${key}\s*}}`, 'g');
    const formattedValue = value ? value.split(/\n{2,}/g).map(paragraph => {
      // Convert bullet points to unordered lists
      if (paragraph.trim().startsWith('- ') || paragraph.trim().match(/^\d+\.\s/)) {
        const listItems = paragraph.split(/\n/).map(line => `<li>${line.replace(/^[-\d.\s]+/, '').trim()}</li>`).join('');
        return `<ul class="list-disc pl-6 mb-4">${listItems}</ul>`;
      }
      return `<p class="mb-4">${paragraph.replace(/\n/g, '<br>')}</p>`;
    }).join('\n') : '';
    html = html.replace(pattern, formattedValue);
  });

  // Define clean section header replacements with matching icons
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
