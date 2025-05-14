const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

/**
 * Renders a Chart.js chart as a PNG buffer and returns base64 data URI.
 * @param {Object} chartConfig - Chart.js configuration object
 * @returns {Promise<string>} - A base64 image string (data URI)
 */
async function renderChartToBase64(chartConfig) {
  const html = `
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body style="margin:0;">
      <canvas id="chart" width="800" height="400"></canvas>
      <script>
        const config = ${JSON.stringify(chartConfig)};
        const ctx = document.getElementById('chart').getContext('2d');
        new Chart(ctx, config);
      </script>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const canvas = await page.$('canvas');
  const imageBuffer = await canvas.screenshot({ type: 'png' });
  await browser.close();

  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

module.exports = renderChartToBase64;
