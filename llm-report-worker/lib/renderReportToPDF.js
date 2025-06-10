require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

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
      uploaded_chart_url: data.uploaded_chart_url || null,
      brand: 'Performance Marketing Group',
      brand_url: 'https://performancecorporate.com'
    };

    const templatePath = path.join(__dirname, `../templates/${mappedData.template_file}`);
    if (!fs.existsSync(templatePath)) {
      console.error(`[renderReportToPDF] Template not found: ${templatePath}`);
      throw new Error(`Template not found: ${templatePath}`);
    }
    let html = fs.readFileSync(templatePath, 'utf-8');
    console.log(`[renderReportToPDF] Loaded template: ${mappedData.template_file}`);

    // --- Chart Image Handling (Only pre-uploaded charts) ---
    let chartDisplayHtml = `<div style="text-align:center; padding:20px; border:1px dashed #ccc; color:#777; font-size:0.9em;">Chart not available.</div>`;

    if (mappedData.uploaded_chart_url) {
      console.log(`[renderReportToPDF] Using pre-uploaded chart URL: "${mappedData.uploaded_chart_url}"`);
      const sanitizedUrl = sanitizeHtml(mappedData.uploaded_chart_url, { 
        allowedTags: [], 
        allowedAttributes: {}, 
        allowedSchemes: ['http', 'https', 'data']
      });
      chartDisplayHtml = `<img src="${sanitizedUrl}" alt="Market Chart" style="display:block; margin:auto; max-width:100%; height:auto;" class="w-full rounded-lg shadow-md" />`;
    } else {
      console.warn('[renderReportToPDF] No pre-uploaded chart URL provided. Chart will not be displayed.');
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
        const chartExists = !!mappedData.uploaded_chart_url;
        contentExists = contentExists || chartExists;
      }
      if (!contentExists) {
        const sectionId = sectionKey.replace(/_/g, '-');
        const regex = new RegExp(`<section id="${sectionId}"[^>]*>[\\s\\S]*?<\\/section>`, 'gmi');
        html = html.replace(regex, '');
        console.log(`[renderReportToPDF] Removed empty section: #${sectionId}`);
      }
    }

    // --- Replace other placeholders ---
    Object.keys(mappedData).forEach(key => {
      if (mappedData[key] !== null && mappedData[key] !== undefined) {
        let content = String(mappedData[key]);
        
        // Process markdown content for specific content sections
        if (key.includes('summary') || key.includes('outlook') || key.includes('trends') || 
            key.includes('comparison') || key.includes('strategies') || key.includes('risks') || 
            key.includes('differences') || key.includes('points') || key.includes('opportunities') || 
            key.includes('faq')) {
          try {
            content = marked(content);
            content = sanitizeHtml(content, {
              allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'blockquote'],
              allowedAttributes: {
                'a': ['href', 'target']
              }
            });
          } catch (err) {
            console.warn(`[renderReportToPDF] Markdown processing failed for ${key}:`, err.message);
          }
        }
        
        // Replace multiple placeholder formats
        const patterns = [
          new RegExp(`{{{\\s*${key}\\s*}}}`, 'g'),      // {{{ key }}}
          new RegExp(`{{\\s*${key}\\s*}}`, 'g'),        // {{ key }}
          new RegExp(`{{{{\\s*${key}\\s*}}}}`, 'g'),    // {{{{ key }}}}
        ];
        
        patterns.forEach(pattern => {
          html = html.replace(pattern, content);
        });
      }
    });

    // Handle brand_url placeholder specifically
    if (mappedData.brand_url) {
      html = html.replace(/\{\{\s*brand_url\s*\}\}/g, mappedData.brand_url);
    }

    // --- Handle bonus section ---
    if (mappedData.bonus_section) {
      const bonusHTML = renderBonusSectionFromText(mappedData.bonus_section);
      html = html.replace(new RegExp(`{{{\\s*bonus_section\\s*}}}`, 'g'), bonusHTML);
    }

    // --- Clean up any remaining placeholders ---
    html = html.replace(/{{{[^}]*}}}/g, '');
    html = html.replace(/{{[^}]*}}/g, '');
    html = html.replace(/{{{{[^}]*}}}}/g, '');
    
    // Clean up comments and malformed placeholders
    html = html.replace(/{\s*\/\*[^*]*\*\/\s*}/g, '');
    html = html.replace(/{{{{[^}]*}}}}/g, '');

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
