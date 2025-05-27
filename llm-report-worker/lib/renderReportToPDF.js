const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { getChartConfig } = require('./chartConfigs');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const width = 900;
const height = 450;
const chartCanvas = new ChartJSNodeCanvas({ width, height });

function findChromiumExecutable() {
  const paths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  return paths.find(p => fs.existsSync(p)) || null;
}

async function fetchBonuses(productId) {
  const result = await db.query(
    `SELECT title, description, access_link
     FROM product_bonuses
     WHERE product_id = $1
     ORDER BY sort_order`,
    [productId]
  );

  return result.rows;
}

async function renderReportToPDF(data = {}) {
  const mappedData = {
    ...data,
    report_title: data.report_title || 'Generated Report',
    report_subtitle: data.report_subtitle || '',
    header_image_url: data.header_image_url || '',
    template_file: data.template_file || 'report-template-enhanced.html',
    chart_key: data.chart_key || 'ecommerce',
    brand: data.brand || 'Performance Marketing Group',
    executive_summary: data.executive_summary || '',
    market_trends: data.market_trends || '',
    regional_differences: data.regional_differences || '',
    pain_points: data.pain_points || '',
    marketing_strategies: data.marketing_strategies || '',
    business_opportunities: data.business_opportunities || '',
    bonus_resources: '', // will be replaced with DB content
  };

  const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
  if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

  let html = fs.readFileSync(templatePath, 'utf-8');

  // Generate chart image
  let chartImgTag = '<div class="text-sm italic text-gray-500">Chart unavailable</div>';
  try {
    const chartConfig = getChartConfig(mappedData.chart_key);
    const chartBuffer = await chartCanvas.renderToBuffer(chartConfig);
    const base64 = chartBuffer.toString('base64');
    chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Market Chart" class="w-full rounded-lg shadow-md" />`;
  } catch (err) {
    console.warn('Chart generation failed', err);
  }
  html = html.replace('{{ chart_url }}', chartImgTag);

  // Replace basic fields
  const directFields = ['report_title', 'report_subtitle', 'header_image_url', 'brand'];
  for (const key of directFields) {
    html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), mappedData[key]);
  }

  // Replace markdown fields
  const markdownSections = [
    'executive_summary',
    'market_trends',
    'regional_differences',
    'pain_points',
    'marketing_strategies',
    'business_opportunities'
  ];

  for (const key of markdownSections) {
    const rawHTML = marked(mappedData[key] || '');
    const safeHTML = sanitizeHtml(rawHTML, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
      allowedAttributes: false
    });
    html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), safeHTML);
  }

  // 🎁 BONUS: Insert bonus list from DB
  const bonuses = await fetchBonuses(data.product_id || 0);
  let bonusHTML = '';

  if (bonuses.length) {
    bonusHTML = '<ul>';
    for (const bonus of bonuses) {
      bonusHTML += `
        <li style="margin-bottom: 1rem;">
          <strong>${sanitizeHtml(bonus.title)}</strong><br/>
          ${sanitizeHtml(bonus.description)}<br/>
          <a href="${bonus.access_link}" style="color: #1976d2;">${bonus.access_link}</a>
        </li>
      `;
    }
    bonusHTML += '</ul>';
  } else {
    bonusHTML = '<p>No bonus resources available at this time.</p>';
  }

  html = html.replace(/{{\s*bonus_resources\s*}}/g, bonusHTML);

  // PDF rendering
  const executablePath = findChromiumExecutable();
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1200, height: 1600 },
    ...(executablePath ? { executablePath } : {})
  };

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  const footerHTML = `
    <div style="width: 100%; font-size: 9px; padding: 5px 20px; text-align: center; color: #6b7280;">
      ${sanitizeHtml(mappedData.brand)} | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`;

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footerHTML,
  });

  await browser.close();
  return pdf;
}

module.exports = renderReportToPDF;
