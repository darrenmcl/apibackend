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

function renderBonusSection(bonuses) {
  if (!bonuses.length) return '<p>No bonus resources available at this time.</p>';

  let html = '<ul style="list-style: none; padding: 0;">';
  for (const bonus of bonuses) {
    const safeTitle = sanitizeHtml(bonus.title || '');
    const safeDescription = sanitizeHtml(bonus.description || '');
    const safeLink = sanitizeHtml(bonus.access_link || '');

    html += `
      <li style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <strong style="font-size: 1.1rem; color: #111827;">${safeTitle}</strong><br />
        <div style="margin: 0.5rem 0; color: #4b5563;">${safeDescription}</div>
        <a href="${safeLink}" style="color: #2563eb; font-weight: 500;" target="_blank">Access Bonus</a>
      </li>
    `;
  }
  html += '</ul>';
  return html;
}

async function renderReportToPDF(data = {}) {
  try {
    const mappedData = {
      ...data,
      report_title: data.report_title || 'Generated Report',
      report_subtitle: data.report_subtitle || '',
      header_image_url: data.header_image_url || '',
      template_file: data.template_file || 'report_template_performance.html',
      chart_key: data.chart_key || 'ecommerce',
      brand: data.brand || 'Performance Marketing Group',
      executive_summary: data.executive_summary || '',
      market_trends: data.market_trends || '',
      regional_differences: data.regional_differences || '',
      pain_points: data.pain_points || '',
      marketing_strategies: data.marketing_strategies || '',
      business_opportunities: data.business_opportunities || ''
    };

    const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
    if (!fs.existsSync(templatePath)) throw new Error(`Template file not found: ${templatePath}`);

    let html = fs.readFileSync(templatePath, 'utf-8');

    // Chart
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

    // Static replacements
    ['report_title', 'report_subtitle', 'header_image_url', 'brand'].forEach(key => {
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), mappedData[key]);
    });

    // Markdown-based content
    const markdownSections = [
      'executive_summary',
      'market_trends',
      'regional_differences',
      'pain_points',
      'marketing_strategies',
      'business_opportunities'
    ];
    for (const key of markdownSections) {
      const rawHTML = marked(mappedData[key]);
      const safeHTML = sanitizeHtml(rawHTML, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
        allowedAttributes: false
      });
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), safeHTML);
    }

    // Bonus section
    const bonuses = await fetchBonuses(data.product_id || 0);
    const bonusHTML = renderBonusSection(bonuses);
    html = html.replace(/{{\s*bonus_resources\s*}}/g, bonusHTML);

    // Write debug version
    fs.writeFileSync('./debug-report.html', html);

    // Render PDF
    const executablePath = findChromiumExecutable();
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1200, height: 1600 },
      ...(executablePath ? { executablePath } : {})
    });

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
      footerTemplate: footerHTML
    });

    await browser.close();
    return pdf;

  } catch (err) {
    console.error('[renderReportToPDF] ❌ Failed to generate PDF:', err);
    throw err;
  }
}

module.exports = renderReportToPDF;
