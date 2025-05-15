// renderReportToPDF.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const width = 800;
const height = 400;
const chartCanvas = new ChartJSNodeCanvas({ width, height });

async function renderReportToPDF(data = {}) {
  const templateName = data.template_file || 'report-template-default.html';
  const templatePath = path.join(__dirname, `../templates/${templateName}`);
  let html = fs.readFileSync(templatePath, 'utf8');

  // Insert header block
  const headerHtml = `
  <section class="mb-12 relative w-full h-[300px] overflow-hidden">
    <img src="${data.header_image_url}" alt="Report Banner" class="absolute inset-0 w-full h-full object-cover opacity-80" />
    <div class="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
      <h1 class="text-4xl font-bold drop-shadow-md">${data.report_title}</h1>
      <p class="text-lg mt-2 drop-shadow-sm">${data.subtitle || ''}</p>
    </div>
  </section>
  `;
  html = html.replace('<body>', `<body>\n${headerHtml}`);

  // Generate chart
  let chartImgTag = '<div class="text-sm italic text-gray-500">Chart unavailable</div>';
  try {
    const chartBuffer = await chartCanvas.renderToBuffer({
      type: 'line',
      data: {
        labels: ['2024', '2025', '2026'],
        datasets: [{
          label: 'E-Commerce Market Size (USD Billions)',
          data: [214, 356, 520],
          backgroundColor: 'rgba(59,130,246,0.3)',
          borderColor: 'rgba(59,130,246,1)',
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Projected E-Commerce Market Growth (2024–2026)' },
        },
      },
    });
    const base64 = chartBuffer.toString('base64');
    chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Market Chart" class="w-full my-4 rounded shadow-md" />`;
  } catch (err) {
    console.warn('Chart generation failed', err);
  }

  html = html.replace('{{ chart_url }}', chartImgTag);

  // Replace all variables
  Object.entries(data).forEach(([key, val]) => {
    if (key === 'chart_url') return;
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const stringVal = typeof val === 'string' ? val : String(val ?? '');
    const formattedVal = stringVal.split(/\n{2,}/g).map(p => {
      if (/^[-\d]/.test(p.trim())) {
        const items = p.split(/\n/).map(line => `<li>${line.replace(/^[-\d.\s]+/, '').trim()}</li>`).join('');
        return `<ul class="list-disc pl-6 mb-4">${items}</ul>`;
      }
      return `<p class="mb-4">${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    html = html.replace(pattern, formattedVal);
  });

  // Section icons
  const sectionIcons = {
    'Executive Summary': 'https://assets.performancecorporate.com/uploads/1745428226034-Executive-Summary-Icon.svg',
    'Market Trends': 'https://assets.performancecorporate.com/uploads/1745428212861-Market-Trends-Icon.svg',
    'Regional Differences': 'https://assets.performancecorporate.com/uploads/1747227938050-Regional-Differences.svg',
    'Regional Insights': 'https://assets.performancecorporate.com/uploads/1747227971787-Regional-Insights.svg',
    'Customer Pain Points': 'https://assets.performancecorporate.com/uploads/1745428192092-Customer-Paint-Points.svg',
    'Marketing Strategies': 'https://assets.performancecorporate.com/uploads/1745428180583-Marketing-Strategies-Icon.svg',
    'Business Opportunities': 'https://assets.performancecorporate.com/uploads/1745428168869-Business-Opportunities-Icon.svg',
    'Bonus Resources': 'https://assets.performancecorporate.com/uploads/1747227900260-Bonus-Resources.svg',
  };

  for (const [title, icon] of Object.entries(sectionIcons)) {
    const safeTitle = title.replace(/([.*+?^=!:${}()|[\\]\/])/g, '\\$1');
    const regex = new RegExp(`<h2 class=\\"section-title\\">.*?${safeTitle}.*?<\\/h2>`, 'i');
    const replacement = `
    <h2 class="section-title flex items-center gap-3 text-2xl font-semibold text-blue-800 mb-6 border-b border-gray-200 pb-2">
      <img src="${icon}" alt="${title} Icon" class="w-6 h-6" />
      ${title}
    </h2>
    `;
    html = html.replace(regex, replacement);
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
  await browser.close();

  return pdf;
}

module.exports = renderReportToPDF;
