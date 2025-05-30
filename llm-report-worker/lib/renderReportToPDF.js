require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
// const db = require('../config/db'); // db is not directly used in this file
// const { ChartJSNodeCanvas } = require('chartjs-node-canvas'); // Commented out as we're using pre-uploaded chart URLs
// const { getChartConfig } = require('./chartConfigs'); // Commented out
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

// Commented out ChartJSNodeCanvas setup
// const width = 900;
// const height = 450;
// const chartCanvas = new ChartJSNodeCanvas({ width, height });

function findChromiumExecutable() {
  const paths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  return paths.find(p => fs.existsSync(p)) || null;
}

function renderBonusSectionFromText(text = '') { // The 'text' argument is still unused by this function
  // Updated HTML content for the bonus resources section
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
</ul>
`;
  return bonusContentHTML;
}

async function renderReportToPDF(data = {}) {
  try {
    const mappedData = {
      ...data,
      report_title: data.report_title || 'Generated Report',
      report_subtitle: data.report_subtitle || '',
      header_image_url: data.header_image_url || '',
      template_file: data.template_file || 'report_template_performance.html', // Ensure this default is correct
      // chart_key is still passed, could be used for alt text or other logic if needed
      chart_key: data.chart_key || 'default_chart',
      uploaded_chart_url: data.uploaded_chart_url || null, // Expecting this from worker.js
      brand: data.brand || 'Performance Marketing Group',
      brand_url: data.brand_url || 'https://performancecorporate.com'
    };

    const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
    if (!fs.existsSync(templatePath)) {
        console.error(`[renderReportToPDF] Template not found: ${templatePath}`);
        throw new Error(`Template not found: ${templatePath}`);
    }

    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace static values (ensure values are strings and sanitize them)
    ['report_title', 'report_subtitle', 'header_image_url', 'brand', 'brand_url'].forEach(key => {
        const value = String(mappedData[key] || '');
        // Sanitize URLs meant for src/href differently if needed, but for simple text replacement this is okay.
        // For header_image_url, ensure it's a valid URL. For now, treating as text to be inserted.
        // If header_image_url is used in an <img src="...">, it should be validated/sanitized appropriately.
        // The current replacement below expects {{ placeholder }} to be where text is inserted, not an attribute value.
        html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }));
    });
    // For header_image_url if it's directly in an <img src="{{header_image_url}}">
    // A specific replacement might be safer:
    if (mappedData.header_image_url) {
        html = html.replace(
            new RegExp(`{{\\s*header_image_url\\s*}}`, 'g'),
            sanitizeHtml(mappedData.header_image_url, {
                allowedTags: [], allowedAttributes: {},
                // For URLs, you might add transformTags to ensure only http/https protocols for `img` `src`
            })
        );
    } else {
        html = html.replace(new RegExp(`{{\\s*header_image_url\\s*}}`, 'g'), ''); // Replace with empty if no URL
    }


    // --- CHART IMAGE HANDLING (Using Pre-Uploaded URL) ---
    let chartDisplayHtml = `<div style="text-align:center; padding:20px; border:1px dashed #ccc; color:#777; font-size:0.9em;">Chart image not available.</div>`;

    if (mappedData.uploaded_chart_url) {
      console.log(`[renderReportToPDF] Using pre-uploaded chart URL: "${mappedData.uploaded_chart_url}"`);
      // Basic sanitization for the URL itself to prevent XSS if it were ever malformed,
      // though it's coming from your database (trusted source).
      const sanitizedUrl = sanitizeHtml(mappedData.uploaded_chart_url, {
          allowedTags: [],
          allowedAttributes: {},
          // To be very safe with URLs in src, you might restrict protocols:
          // allowedSchemes: [ 'http', 'https', 'data' ],
          // allowedSchemesByTag: { img: [ 'http', 'https', 'data' ] }
      });
      chartDisplayHtml = `<img src="${sanitizedUrl}" alt="${sanitizeHtml(mappedData.chart_key || 'Market Chart')}" style="display:block; margin:auto; max-width:100%; height:auto;" class="w-full rounded-lg shadow-md" />`;
    } else {
      console.warn(`[renderReportToPDF] No pre-uploaded chart URL provided for chart key: "${mappedData.chart_key}". Chart will not be displayed.`);
      chartDisplayHtml = `<div style="text-align:center; padding:20px; border:1px dashed #ccc; color:#777; font-size:0.9em;">Chart not available (URL not provided for key: ${sanitizeHtml(mappedData.chart_key)}).</div>`;
    }
    
    // Replace the chart placeholder in the template
    // Ensure your HTML template has a placeholder like {{{ chart_image_tag }}}
    html = html.replace(new RegExp(`{{{\\s*chart_image_tag\\s*}}}`, 'g'), chartDisplayHtml);


    // Replace markdown sections
    const markdownSections = [
      'executive_summary', 'market_outlook', 'market_trends',
      'metal_comparison', 'investing_strategies', 'risks_and_rewards',
      'regional_differences', 'pain_points', 'marketing_strategies',
      'business_opportunities', 'faq', 'report_summary'
    ];

    for (const key of markdownSections) {
      const raw = mappedData[key] || '';
      const parsed = marked(raw);
      const clean = sanitizeHtml(parsed, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td']), // Added table elements
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title', 'style', 'width', 'height'],
          a: ['href', 'name', 'target', 'title', 'style'],
          table: ['style', 'class', 'border', 'cellpadding', 'cellspacing'],
          th: ['style', 'class', 'colspan', 'rowspan'],
          td: ['style', 'class', 'colspan', 'rowspan'],
          '*': ['style', 'class']
        }
      });
      html = html.replace(new RegExp(`{{{\\s*${key}\\s*}}}`, 'g'), clean);
    }

    const bonusHTML = renderBonusSectionFromText(mappedData.bonus_tools || '');
    html = html.replace(/{{{\s*bonus_tools\s*}}}/g, bonusHTML);

    fs.writeFileSync('./debug-report.html', html, 'utf-8'); // Specify encoding
    console.log('[renderReportToPDF] Debug HTML file written to ./debug-report.html');

    const executablePath = findChromiumExecutable();
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
      ...(executablePath ? { executablePath } : {})
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const footerHTML = `
      <div style="width: 100%; font-size: 9px; padding: 5px 20px; text-align: center; color: #6b7280; -webkit-print-color-adjust: exact;">
        ${sanitizeHtml(mappedData.brand)} | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`;

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:1px;"></div>', // Minimal to ensure footer has space
      footerTemplate: footerHTML,
      timeout: 60000
    });

    await browser.close();
    return pdf;
  } catch (err) {
    console.error('[renderReportToPDF] ❌ Error:', err.message, err.stack);
    throw err;
  }
}

module.exports = renderReportToPDF;
