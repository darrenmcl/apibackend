const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const width = 900;
const height = 450;
const chartCanvas = new ChartJSNodeCanvas({ width, height });

async function renderReportToPDF(data = {}) {
  const mappedData = {
    report_title: data.report_title || 'Generated Report',
    subtitle: data.report_subtitle || '',
    header_image_url: data.header_image_url || 'https://assets.performancecorporate.com/uploads/default-header.jpg',
    template_file: data.template_file || 'report-template-enhanced.html',
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
    const chartConfig = {
      type: 'line',
      data: {
        labels: ['2024', '2025', '2026'],
        datasets: [{
          label: 'E-Commerce Market Size (USD Billions)',
          data: [214, 356, 520],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: 'Projected E-Commerce Market Growth (2024–2026)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
        }
      },
    };

    const chartBuffer = await chartCanvas.renderToBuffer(chartConfig);
    const base64 = chartBuffer.toString('base64');
    chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Market Chart" class="w-full rounded-lg shadow-md" />`;
  } catch (err) {
    console.warn('Chart generation failed', err);
  }

  html = html.replace('{{ chart_url }}', chartImgTag);

  Object.entries(mappedData).forEach(([key, val]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(pattern, val);
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
