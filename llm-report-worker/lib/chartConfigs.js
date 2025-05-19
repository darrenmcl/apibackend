// lib/chartConfigs.js

function getChartConfig(chartType = 'ecommerce') {
  switch (chartType) {
    case 'education':
      return {
        type: 'line',
        data: {
          labels: ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'],
          datasets: [{
            label: 'Global Education Market Size (USD Trillions)',
            data: [1.3, 1.42, 1.55, 1.67, 1.8, 1.93, 2.05, 2.18, 2.3, 2.4],
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: 'rgba(139, 92, 246, 1)',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: false,
          layout: { padding: { top: 25, bottom: 15 } },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Market Size (USD Trillions)',
                font: { size: 14, weight: 'bold' },
                color: '#1f2937'
              }
            },
            x: {
              ticks: { font: { size: 12 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { size: 13, weight: '600' },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            title: {
              display: true,
              text: 'Global Education Market Forecast (2023–2032)',
              font: { size: 16, weight: 'bold' },
              color: '#1f2937'
            }
          }
        }
      };

    case 'ecommerce':
    default:
      return {
        type: 'line',
        data: {
          labels: ['2024', '2025', '2026'],
          datasets: [{
            label: 'E-Commerce Market Size (USD Billions)',
            data: [214, 356, 520],
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: 'rgba(59, 130, 246, 1)',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: false,
          layout: { padding: { top: 25, bottom: 15 } },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Market Size (USD Billions)',
                font: { size: 14, weight: 'bold' },
                color: '#1f2937'
              }
            },
            x: {
              ticks: { font: { size: 12 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { size: 13, weight: '600' },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            title: {
              display: true,
              text: 'Projected E-Commerce Market Growth (2024–2026)',
              font: { size: 16, weight: 'bold' },
              color: '#1f2937'
            }
          }
        }
      };
  }
}

module.exports = { getChartConfig };
