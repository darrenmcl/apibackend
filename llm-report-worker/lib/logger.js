// lib/logger.js
const pino = require('pino');

// Create a basic logger configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  
  // Only use pretty logging if not in production
  ...(process.env.NODE_ENV !== 'production' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  } : {})
};

const logger = pino(loggerConfig);

module.exports = logger;
