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

// Function to find Chrome/Chromium executable
function findChromiumExecutable() {
  const possiblePaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  
  for (const browserPath of possiblePaths) {
    if (fs.existsSync(browserPath)) {
      console.log(`Found browser at: ${browserPath}`);
      return browserPath;
    }
  }
  
  console.log('No suitable browser found. Falling back to default behavior.');
  return null; // Let Puppeteer try to find it
}

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

  const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
  let html = fs.readFileSync(templatePath, 'utf8');

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

  const directReplaceFields = ['report_title', 'report_subtitle', 'header_image_url'];
  directReplaceFields.forEach(key => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(pattern, mappedData[key]);
  });

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
    const blockRegex = new RegExp(`<!-- START: ${key} -->[\\s\\S]*?<!-- END: ${key} -->`, 'gi');
    if (mappedData[key] && typeof mappedData[key] === 'string' && mappedData[key].trim() !== '') {
      const rawHTML = marked(mappedData[key]);
      const safeHTML = sanitizeHtml(rawHTML, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
        allowedAttributes: false
      });
      html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), safeHTML);
    } else {
      html = html.replace(blockRegex, '');
    }
  });

  // Find the browser executable
  const executablePath = findChromiumExecutable();
  
  // Configure the browser launch options
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1200, height: 1600 }
  };
  
  // Add executablePath only if we found a browser
  if (executablePath) {
    launchOptions.executablePath = executablePath;
    console.log(`Launching browser with executable path: ${executablePath}`);
  } else {
    console.log('No browser path found. Relying on Puppeteer defaults.');
  }

  // Launch the browser with the configured options
  const browser = await puppeteer.launch(launchOptions);
  
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
