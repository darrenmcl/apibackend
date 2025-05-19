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

async function renderReportToPDF(data = {}) {
  const mappedData = {
    ...data,
    report_title: data.report_title || 'Generated Report',
    report_subtitle: data.report_subtitle || '',
    header_image_url: data.header_image_url || 'https://assets.performancecorporate.com/uploads/default-header.jpg',
    template_file: data.template_file || 'report-template-enhanced.html',
    chart_key: data.chart_key || 'ecommerce',
    executive_summary: data.executive_summary || '',
    market_trends: data.market_trends || '',
    regional_differences: data.regional_differences || '',
    pain_points: data.pain_points || '',
    marketing_strategies: data.marketing_strategies || '',
    business_opportunities: data.business_opportunities || '',
    bonus_resources: data.bonus_resources || '',
  };

  console.log('[🧾 Rendered Report Fields]', {
    report_title: mappedData.report_title,
    report_subtitle: mappedData.report_subtitle,
    header_image_url: mappedData.header_image_url
  });

  const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
  let html = fs.readFileSync(templatePath, 'utf8');

  // Chart generation
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

  // Replace plain string fields (no markdown)
  const directReplaceFields = ['report_title', 'report_subtitle', 'header_image_url'];
  directReplaceFields.forEach(key => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(pattern, mappedData[key]);
  });

  // Replace markdown content fields
  const markdownFields = [
    'executive_summary',
    'market_trends',
    'regional_differences',
    'pain_points',
    'marketing_strategies',
    'business_opportunities',
    'bonus_resources'
  ];

  markdownFields.forEach(key => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    if (mappedData[key] && typeof mappedData[key] === 'string') {
      const rawHTML = marked(mappedData[key]);
      const safeHTML = sanitizeHtml(rawHTML, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
        allowedAttributes: false
      });
      html = html.replace(pattern, safeHTML);
    }
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1200, height: 1600 }
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width: 100%; font-size: 9px; padding: 5px 20px; text-align: center; color: #6b7280;">
        Performance Marketing Group | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`
  });

  await browser.close();
  return pdf;
}

module.exports = renderReportToPDF;
