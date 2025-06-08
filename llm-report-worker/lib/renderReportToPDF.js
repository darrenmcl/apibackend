require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs'); // <--- FIX: Added the missing 'fs' module import
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { getChartConfig } = require('./chartConfigs');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

// --- Configuration for Dynamic Chart Generation (Fallback) ---
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 450;
const chartCanvas = new ChartJSNodeCanvas({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

// --- Helper Functions ---
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
  // Using the latest bonus content structure
  const bonusContentHTML = `
<ul style="list-style: none; padding: 0;">
  <li style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
    <strong style="font-size: 1.1rem; color: #111827;">Precious Metal ROI Calculator (.xlsx)</strong><br />
    <div style="margin: 0.5rem 0; color: #4b5563;">Helps users project returns across gold, silver, and platinum based on custom inputs.</div>
    <a href="https://drive.google.com/drive/folders/1SjhL8AMALGDQNkpGTl4v-bWzmXxa5foN?usp=drive_link" target="_blank" style="color: #2563eb; font-weight: 500;">Access File</a>
  </li>
  <li style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
    <strong style="font-size: 1.1rem; color: #111827;">Allocation Worksheet (.xlsx)</strong><br />
    <div style="margin: 0.5rem 0; color: #4b5563;">Assists in building a personalized strategy with target and actual investment allocations.</div>
    <a href="https://drive.google.com/drive/folders/1SjhL8AMALGDQNkpGTl4v-bWzmXxa5foN?usp=drive_link" target="_blank" style="color: #2563eb; font-weight: 500;">Access File</a>
  </li>
  <li style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
    <strong style="font-size: 1.1rem; color: #111827;">Red Flag Checklist for Online Buying (.pdf)</strong><br />
    <div style="margin: 0.5rem 0; color: #4b5563;">Helps users avoid scams and unreliable sellers with a handy checklist for safer purchases.</div>
    <a href="https://drive.google.com/drive/folders/1SjhL8AMALGDQNkpGTl4v-bWzmXxa5foN?usp=drive_link" target="_blank" style="color: #2563eb; font-weight: 500;">Access File</a>
  </li>
</ul>`;
  return bonusContentHTML;
}

// --- Main PDF Rendering Function ---
async function renderReportToPDF(data = {}) {
  console.log('[renderReportToPDF] Starting PDF generation with data:', {
    report_title: data.report_title,
    template_file: data.template_file,
    chart_key: data.chart_key,
    uploaded_chart_url: data.uploaded_chart_url,
    brand: data.brand
  });

  try {
    const mappedData = {
      ...data,
      report_title: data.report_title || 'Generated Report',
      report_subtitle: data.report_subtitle || '',
      header_image_url: data.header_image_url || '',
      template_file: data.template_file || 'default_report_template.html',
      chart_key: data.chart_key || null,
      uploaded_chart_url: data.uploaded_chart_url || null,
      brand: data.brand || 'Your Company Name',
      brand_url: data.brand_url || '#'
    };

    const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
    // This is the line that was causing the error because 'fs' was not defined
    if (!fs.existsSync(templatePath)) {
      console.error(`[renderReportToPDF] Template not found: ${templatePath}`);
      throw new Error(`Template not found: ${templatePath}`);
    }
    let html = fs.readFileSync(templatePath, 'utf-8');
    console.log(`[renderReportToPDF] Loaded template: ${mappedData.template_file}`);

    // --- Placeholder Replacements ---
    // (The rest of the function remains the same as the last version I provided)
    // ...
    
    // --- Chart Image Handling (Priority to uploaded_chart_url, fallback to dynamic) ---
    let chartDisplayHtml = `<div style="text-align:center; padding:20px; border:1px dashed #ccc; color:#777; font-size:0.9em;">Chart not available.</div>`;

    if (mappedData.uploaded_chart_url) {
      console.log(`[renderReportToPDF] Using pre-uploaded chart URL: "${mappedData.uploaded_chart_url}"`);
      const sanitizedUrl = sanitizeHtml(mappedData.uploaded_chart_url, { allowedTags: [], allowedAttributes: {}, allowedSchemes: [ 'http', 'https', 'data' ]});
      chartDisplayHtml = `<img src="${sanitizedUrl}" alt="${sanitizeHtml(mappedData.chart_key || 'Market Chart')}" style="display:block; margin:auto; max-width:100%; height:auto;" class="w-full rounded-lg shadow-md" />`;
    } else if (mappedData.chart_key) {
      console.log(`[renderReportToPDF] No pre-uploaded chart URL. Attempting to dynamically generate chart with key: "${mappedData.chart_key}"`);
      try {
        const chartConfig = getChartConfig(mappedData.chart_key);
        if (chartConfig) {
          const chartBuffer = await chartCanvas.renderToBuffer(chartConfig);
          const base64 = chartBuffer.toString('base64');
          chartDisplayHtml = `<img src="data:image/png;base64,${base64}" alt="${sanitizeHtml(mappedData.chart_key || 'Market Chart')}" style="display:block; margin:auto; max-width:100%; height:auto;" class="w-full rounded-lg shadow-md" />`;
          console.log(`[renderReportToPDF] Dynamically generated chart for key: "${mappedData.chart_key}"`);
        } else {
          console.warn(`[renderReportToPDF] No chart configuration found for dynamic generation with chart_key: "${mappedData.chart_key}".`);
          chartDisplayHtml = `<div style="text-align:center; padding:20px; border:1px dashed #ccc; color:#777; font-size:0.9em;">Chart configuration unavailable (key: ${sanitizeHtml(mappedData.chart_key)}).</div>`;
        }
      } catch (err) {
        console.error('[renderReportToPDF] Dynamic chart generation failed:', err.message);
        chartDisplayHtml = `<div style="text-align:center; padding:20px; border:1px dashed #ccc; color:#777; font-size:0.9em;">Chart generation failed (key: ${sanitizeHtml(mappedData.chart_key)}).</div>`;
      }
    } else {
      console.warn('[renderReportToPDF] No pre-uploaded chart URL and no chart_key provided. Chart will not be displayed.');
    }
    html = html.replace(new RegExp(`{{{\\s*chart_image_tag\\s*}}}`, 'g'), chartDisplayHtml);

    // --- Conditional Section Cleanup Step ---
    console.log('[renderReportToPDF] Cleaning up sections without content...');
    const allPossibleSections = [
      'executive_summary', 'market_outlook', 'market_trends', 'metal_comparison',
      'investing_strategies', 'risks_and_rewards', 'regional_differences',
      'pain_points', 'marketing_strategies', 'business_opportunities',
      'faq', 'report_summary'
    ];
    for (const sectionKey of allPossibleSections) {
      let contentExists = !!mappedData[sectionKey];
      if (sectionKey === 'market_trends') {
        const chartExists = !!(mappedData.uploaded_chart_url || mappedData.chart_key);
        contentExists = contentExists || chartExists;
      }
      if (!contentExists) {
        const sectionId = sectionKey.replace(/_/g, '-');
        const regex = new RegExp(`<section id="${sectionId}"[^>]*>[\\s\\S]*?<\\/section>`, 'gmi');
        html = html.replace(regex, '');
        console.log(`[renderReportToPDF] Removed empty section: #${sectionId}`);
      }
    }
    
    // The rest of the file (markdown processing, bonus section, Puppeteer launch, etc.)
    // should remain the same as the last version I provided.
    // ...
    // ...

    fs.writeFileSync('./debug-report.html', html, 'utf-8');
    console.log('[renderReportToPDF] Debug HTML file written after cleanup.');

    const executablePath = findChromiumExecutable();
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
      ...(executablePath ? { executablePath } : {})
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
    
    const footerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 9px; padding: 5px 0; color: #6b7280; -webkit-print-color-adjust: exact;">
        <span style="padding-left: 15mm;">${sanitizeHtml(mappedData.brand)}</span>
        <span style="padding-right: 15mm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`;
      
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:1px;"></div>',
      footerTemplate: footerHTML,
      timeout: 60000
    });

    await browser.close();
    console.log('[renderReportToPDF] PDF generated successfully.');
    return pdf;

  } catch (err) {
    console.error('[renderReportToPDF] ❌ Error during PDF generation:', err.message, err.stack);
    throw err;
  }
}

module.exports = renderReportToPDF;
