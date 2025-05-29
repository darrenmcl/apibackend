// renderReportToPDF.js
require('dotenv').config();
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

function renderBonusSectionFromText(text = '') {
  const items = [
    {
      title: 'Precious Metal ROI Calculator',
      link: 'https://assets.performancecorporate.com/tools/roi-calc.xlsx',
      description: 'Estimate your returns across gold, silver, and platinum.'
    },
    {
      title: 'Allocation Worksheet',
      link: 'https://assets.performancecorporate.com/tools/allocation-worksheet.xlsx',
      description: 'Build a personalized metals strategy.'
    },
    {
      title: 'Red Flag Checklist for Online Buying',
      link: 'https://assets.performancecorporate.com/tools/red-flag-checklist.pdf',
      description: 'Avoid scams and unreliable sellers.'
    }
  ];
  let html = '<ul style="list-style: none; padding: 0;">';
  for (const item of items) {
    html += `
      <li style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <strong style="font-size: 1.1rem; color: #111827;">${item.title}</strong><br />
        <div style="margin: 0.5rem 0; color: #4b5563;">${item.description}</div>
        <a href="${item.link}" style="color: #2563eb; font-weight: 500;" target="_blank">Access Bonus</a>
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
      brand_url: data.brand_url || 'https://performancecorporate.com'
    };

    const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
    if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace static values
    ['report_title', 'report_subtitle', 'header_image_url', 'brand', 'brand_url'].forEach(key => {
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), mappedData[key] || '');
    });

    // Chart generation
    let chartImgTag = '<div class="text-sm italic text-gray-500">Chart unavailable</div>';
    try {
      const chartConfig = getChartConfig(mappedData.chart_key);
      const chartBuffer = await chartCanvas.renderToBuffer(chartConfig);
      const base64 = chartBuffer.toString('base64');
      chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Market Chart" class="w-full rounded-lg shadow-md" />`;
    } catch (err) {
      console.warn('Chart generation failed:', err);
    }
    html = html.replace('{{ chart_url }}', chartImgTag);

    // Replace markdown sections
    const markdownSections = [
      'executive_summary',
      'market_trends',
      'regional_differences',
      'pain_points',
      'marketing_strategies',
      'business_opportunities'
    ];

    for (const key of markdownSections) {
      const raw = mappedData[key] || '';
      const parsed = marked(raw);
      const clean = sanitizeHtml(parsed, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
        allowedAttributes: false
      });
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), clean);
    }

    // Bonus section from prompt
    const bonusHTML = renderBonusSectionFromText(mappedData.bonus_tools || '');
    html = html.replace(/{{\s*bonus_resources\s*}}/g, bonusHTML);

    // Write debug
    fs.writeFileSync('./debug-report.html', html);

    const executablePath = findChromiumExecutable();
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
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
    console.error('[renderReportToPDF] ❌ Error:', err);
    throw err;
  }
}

module.exports = renderReportToPDF;
