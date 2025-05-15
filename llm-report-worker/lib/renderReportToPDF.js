// renderReportToPDF.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Configure chart generation with improved styling
const width = 900;  // Increased size for better resolution
const height = 450;
const chartCanvas = new ChartJSNodeCanvas({ 
  width, 
  height
});

async function renderReportToPDF(data = {}) {
  // Map database fields to template variables
  const mappedData = {
    report_title: data.report_title || 'E-Commerce Report',
    subtitle: data.report_subtitle || '',  // Map report_subtitle from DB to subtitle in template
    header_image_url: data.header_image_url || 'https://assets.performancecorporate.com/uploads/1747228076352-ecommerce-header.jpg',
    template_file: data.template_file || 'report-template-enhanced.html',
    
    // Map other content fields
    executive_summary: data.executive_summary || '',
    market_trends: data.market_trends || '',
    regional_differences: data.regional_differences || '',
    pain_points: data.pain_points || '',
    marketing_strategies: data.marketing_strategies || '',
    business_opportunities: data.business_opportunities || '',
    bonus_resources: data.bonus_resources || '',
    
    // Additional options
    annotate_chart: data.annotate_chart || false
  };
  
  const templateName = mappedData.template_file;
  const templatePath = path.join(__dirname, `../templates/${templateName}`);
  let html = fs.readFileSync(templatePath, 'utf8');
  
  // Generate chart with improved styling
  let chartImgTag = '<div class="text-sm italic text-gray-500">Chart unavailable</div>';
  try {
    const chartConfig = {
      type: 'line',
      data: {
        labels: ['2024', '2025', '2026'],
        datasets: [{
          label: 'E-Commerce Market Size (USD Billions)',
          data: [214, 356, 520],
          backgroundColor: 'rgba(59, 130, 246, 0.2)', // Lighter blue with transparency
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: 'rgba(59, 130, 246, 1)',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.3, // Slightly reduced curve tension
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false, // No animation needed for PDF
        layout: {
          padding: {
            left: 15,
            right: 30,
            top: 25,
            bottom: 15
          }
        },
        scales: {
          y: {
            beginAtZero: true, // Start from zero for better perspective
            grid: {
              color: 'rgba(0, 0, 0, 0.07)', // Slightly darker grid lines
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 13,
                weight: '500'
              },
              padding: 10,
              color: '#4b5563'
            },
            title: {
              display: true,
              text: 'Market Size (USD Billions)',
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#1f2937'
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.07)',
              lineWidth: 1
            },
            ticks: {
              font: {
                size: 13,
                weight: '500'
              },
              padding: 10,
              color: '#4b5563'
            }
          }
        },
        plugins: {
          legend: { 
            position: 'top',
            labels: {
              boxWidth: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: {
                size: 13,
                weight: '600'
              }
            }
          },
          title: { 
            display: true,
            text: 'Projected E-Commerce Market Growth',
            font: {
              size: 16,
              weight: 'bold'
            },
            color: '#1f2937',
            padding: {
              top: 10,
              bottom: 20
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1f2937',
            bodyColor: '#1f2937',
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            borderColor: 'rgba(59, 130, 246, 0.5)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6
          },
          // Configure datalabels plugin
          datalabels: {
            align: 'top',
            anchor: 'end',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 4,
            color: '#1f2937',
            font: {
              weight: 'bold',
              size: 12
            },
            padding: 6,
            formatter: (value) => `${value}B`
          }
        }
      },
    };
    
    // No annotations for now due to plugin issues
    
    const chartBuffer = await chartCanvas.renderToBuffer(chartConfig);
    const base64 = chartBuffer.toString('base64');
    chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Market Chart" class="w-full rounded-lg shadow-md" />`;
  } catch (err) {
    console.warn('Chart generation failed', err);
  }
  
  // Replace chart placeholder
  html = html.replace('{{ chart_url }}', chartImgTag);
  
  // Replace all variables in the template with mapped data
  Object.entries(mappedData).forEach(([key, val]) => {
    if (key === 'chart_url') return;
    
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const stringVal = typeof val === 'string' ? val : String(val ?? '');
    
    // Enhanced content formatting
    let formattedVal = '';
    
    // Split by paragraphs (double newlines)
    const paragraphs = stringVal.split(/\n{2,}/g);
    
    paragraphs.forEach((p, idx) => {
      p = p.trim();
      if (!p) return;
      
      // Format numbered lists
      if (/^\d+\.\s/.test(p)) {
        const items = p.split(/\n/).filter(line => line.trim());
        const listItems = items.map(line => {
          // Extract the number if it exists
          const match = line.match(/^(\d+)\.\s(.*)/);
          if (match) {
            const [, number, content] = match;
            return `<li><span class="point-number">${number}</span>${content.trim()}</li>`;
          }
          return `<li>${line.replace(/^[-•]\s*/, '')}</li>`;
        }).join('');
        
        formattedVal += `<ol class="custom-list mb-4">${listItems}</ol>`;
      }
      // Format bullet lists
      else if (/^[-•]\s/.test(p)) {
        const items = p.split(/\n/).filter(line => line.trim());
        const listItems = items.map(line => 
          `<li>${line.replace(/^[-•]\s*/, '')}</li>`
        ).join('');
        
        formattedVal += `<ul class="list-disc pl-6 mb-4">${listItems}</ul>`;
      }
      // Format section headlines (assuming they contain a colon)
      else if (/:/.test(p) && p.length < 100) {
        const [title, ...rest] = p.split(':');
        const content = rest.join(':').trim();
        
        if (content) {
          // If there's content after the colon, make it a highlight box
          formattedVal += `
            <div class="highlight-box">
              <div class="highlight-title">${title.trim()}:</div>
              <p>${content}</p>
            </div>`;
        } else {
          // If it's just a title with no content, make it a subheading
          formattedVal += `<h3 class="text-xl font-semibold text-primary-dark mb-3 mt-5">${title.trim()}</h3>`;
        }
      }
      // Regular paragraphs
      else {
        // Bold key terms that are likely important (if in quotes or if followed by a colon)
        let enhancedText = p.replace(/("[^"]+")/g, '<span class="bold">$1</span>')
                           .replace(/(\w+):/g, '<span class="bold">$1</span>:');
                           
        formattedVal += `<p class="mb-4">${enhancedText.replace(/\n/g, '<br>')}</p>`;
      }
    });
    
    html = html.replace(pattern, formattedVal);
  });
  
  // Launch browser and generate PDF
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox'],
    defaultViewport: {
      width: 1200,
      height: 1600
    }
  });
  
  const page = await browser.newPage();
  
  // Set content and wait for resources to load
  await page.setContent(html, { 
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  // Check and fix image loading issues
  await page.evaluate(() => {
    // Fix potential image path issues
    const images = Array.from(document.querySelectorAll('img'));
    images.forEach(img => {
      // Make sure images are properly loaded
      img.onerror = function() {
        // Set a fallback for any image that fails to load
        if (img.classList.contains('header-image')) {
          img.src = 'https://assets.performancecorporate.com/uploads/1747228076352-ecommerce-header.jpg';
        } else if (img.classList.contains('section-icon')) {
          // Use a default icon for section icons that fail
          img.src = 'https://assets.performancecorporate.com/uploads/default-section-icon.svg';
          // If icon fails, add a style to compensate for the missing icon
          img.onerror = function() {
            img.style.display = 'none';
            img.parentElement.style.paddingLeft = '0';
          }
        }
      };
      
      // For header image specifically
      if (img.classList.contains('header-image')) {
        // Ensure header image loads properly
        img.style.height = '100%';
        img.style.width = '100%';
        img.style.objectFit = 'cover';
      }
    });
  });
  
  // Wait longer to ensure images load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if images are loaded properly, particularly the header image
  const imageLoadStatus = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    let imagesLoaded = true;
    let errorMessages = [];
    
    // Only check real image elements (not divs or other elements)
    images.forEach(img => {
      // Skip checking elements that aren't actually images
      if (typeof img.src !== 'string') {
        return;
      }
      
      if (!img.complete) {
        imagesLoaded = false;
        errorMessages.push(`Image not loaded: ${img.src}`);
      } else if (img.naturalHeight === 0) {
        imagesLoaded = false;
        errorMessages.push(`Image failed to load: ${img.src}`);
      }
    });
    
    return {
      allImagesLoaded: imagesLoaded,
      errors: errorMessages
    };
  });
  
  // Log any image loading issues
  if (!imageLoadStatus.allImagesLoaded) {
    console.warn('Some images did not load properly:', imageLoadStatus.errors);
    
    // Attempt to fix the header image if it's one of the problematic ones
    await page.evaluate((headerUrl) => {
      const headerImg = document.querySelector('.header-image');
      if (headerImg && (!headerImg.complete || headerImg.naturalHeight === 0)) {
        // Create a fallback URL that's guaranteed to exist
        const fallbackUrl = headerUrl || 'https://assets.performancecorporate.com/uploads/1747228076352-ecommerce-header.jpg';
        
        // Only set the src if it's different to avoid reload loops
        if (headerImg.src !== fallbackUrl) {
          headerImg.src = fallbackUrl;
        }
      }
    }, mappedData.header_image_url);
    
    // Wait again for images to load
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Configure PDF options with improved margins
  const pdfOptions = {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',     // Increased from 10mm
      bottom: '15mm',  // Increased from 10mm
      left: '15mm',    // Increased from 10mm
      right: '15mm'    // Increased from 10mm
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>', // Empty header
    footerTemplate: `
      <div style="width: 100%; font-size: 9px; padding: 5px 20px; text-align: center; color: #6b7280;">
        <span>Performance Marketing Group | Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    preferCSSPageSize: true
  };
  
  // Add custom styles for PDF printing with improved padding
  await page.addStyleTag({
    content: `
      @page {
        size: A4;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .page-container {
        max-width: 100%;
        padding: 20px 30px; /* Increased horizontal padding */
      }
      @media print {
        .header-container {
          page-break-after: avoid;
        }
        section {
          page-break-inside: avoid;
          margin-bottom: 30px; /* Increased spacing between sections */
          padding: 15px;       /* Added padding inside sections */
        }
        p, ul, ol {
          margin-bottom: 10px; /* Consistent spacing for text elements */
        }
      }
    `
  });
  
  // Generate PDF
  const pdf = await page.pdf(pdfOptions);
  await browser.close();
  
  return pdf;
}

module.exports = renderReportToPDF;
