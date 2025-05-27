// lib/chartConfigs.js

function getChartConfig(chartType = 'ecommerce') {
  switch (chartType) {

case 'realestate':
  return {
    type: 'bar',
    data: {
      labels: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
      datasets: [{
        label: 'U.S. Residential Real Estate Investment Volume (USD Billions)',
        data: [300, 370, 425, 390, 410, 450, 475],
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgba(22, 163, 74, 1)',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: 'Real Estate Investment Volume Trends (2020–2026)',
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'USD Billions',
            font: { size: 14 }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Year',
            font: { size: 14 }
          }
        }
      }
    }
  };



case 'healthcare':
  return {
    type: 'bar',
    data: {
      labels: ['2023', '2024', '2025', '2026', '2027'],
      datasets: [
        {
          label: 'U.S. Telehealth & Home Healthcare Market (USD Billions)',
          data: [105, 124, 148, 176, 205],  // illustrative values
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: true,
          text: 'U.S. Telehealth & Home Healthcare Market Forecast (2023–2027)',
          font: { size: 16, weight: 'bold' },
          color: '#1f2937'
        },
        legend: {
          position: 'top',
          labels: {
            font: { size: 13, weight: '600' },
            usePointStyle: true
          }
        }
      },
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
      }
    }
  };



case 'sustainability':
  return {
    type: 'line',
    data: {
      labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
      datasets: [{
        label: 'U.S. Renewable Energy Market (USD Billions)',
        data: [92, 108, 125, 144, 168, 190],
        backgroundColor: 'rgba(34,197,94,0.2)',
        borderColor: 'rgba(34,197,94,1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 12 },
            usePointStyle: true
          }
        },
        title: {
          display: true,
          text: 'U.S. Renewable Energy Growth Forecast (2021–2026)',
          font: { size: 16, weight: 'bold' },
          color: '#1f2937'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Market Size (USD Billions)'
          }
        }
      }
    }
  };



case 'cybersecurity':
  return {
    type: 'line',
    data: {
      labels: ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'],
      datasets: [{
        label: 'Cybersecurity Market Size (USD Billions)',
        data: [180, 214, 260, 305, 355, 410, 470, 540],
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: 'rgba(34, 197, 94, 1)',
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
          text: 'Cybersecurity Market Growth Forecast (2023–2030)',
          font: { size: 16, weight: 'bold' },
          color: '#1f2937'
        }
      }
    }
  };




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

case 'ai':
  return {
    type: 'line',
    data: {
      labels: ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'],
      datasets: [{
        label: 'Global AI Market Size (USD Billions)',
        data: [158, 214, 295, 400, 520, 670, 900, 1300],
        backgroundColor: 'rgba(96, 165, 250, 0.2)',     // Sky-400
        borderColor: 'rgba(37, 99, 235, 1)',            // Blue-600
        borderWidth: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: 'rgba(37, 99, 235, 1)',
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
            text: 'USD Billions',
            font: { size: 14, weight: 'bold' },
            color: '#1f2937'
          },
          ticks: {
            font: { size: 12 },
            color: '#4b5563'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: { size: 12 },
            color: '#4b5563'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
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
          text: 'Projected Global AI Market Growth (2023–2030)',
          font: { size: 16, weight: 'bold' },
          color: '#1f2937'
        }
      }
    }
  };



case 'cannabis':
  return {
    type: 'line',
    data: {
      labels: ['2022', '2023', '2024', '2025'],
      datasets: [{
        label: 'U.S. Cannabis Market Size (USD Billions)',
        data: [27, 35, 42, 50], // Based on report narrative
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald 400 with transparency
        borderColor: 'rgba(5, 150, 105, 1)', // Emerald 600
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: 'rgba(5, 150, 105, 1)',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: {
        padding: { top: 25, bottom: 15 }
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
          text: 'Projected U.S. Cannabis Industry Growth (2022–2025)',
          font: { size: 16, weight: 'bold' },
          color: '#1f2937'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'USD Billions',
            font: { size: 14, weight: 'bold' },
            color: '#1f2937'
          },
          ticks: {
            font: { size: 12 }
          }
        },
        x: {
          ticks: {
            font: { size: 12 }
          }
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
