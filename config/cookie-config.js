// /var/projects/backend-api/config/cookie-config.js

/**
 * Provides cookie configuration based on environment
 * Usage:
 * const { getCookieConfig } = require('../config/cookie-config');
 * res.cookie('auth_token', token, getCookieConfig());
 * res.clearCookie('auth_token', getCookieConfig());
 */

// Get current environment (development or production)
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Domain configuration
const DOMAIN = process.env.COOKIE_DOMAIN || (isProduction ? '.performancecorporate.com' : undefined);

/**
 * Get appropriate cookie configuration based on current environment
 * @param {Object} options - Override default options
 * @returns {Object} Cookie configuration
 */
function getCookieConfig(options = {}) {
  const config = {
    httpOnly: true,
    secure: isProduction, // Only require HTTPS in production
    sameSite: isProduction ? 'None' : 'Lax', // Different settings for prod vs dev
    path: '/',
    maxAge: 60 * 60 * 1000, // 1 hour default
  };

  // Only set domain in production or if explicitly provided
  if (DOMAIN) {
    config.domain = DOMAIN;
  }

  // Log the configuration (helpful for debugging)
  console.log(`[Cookie Config] Environment: ${NODE_ENV}`);
  console.log(`[Cookie Config] Using config:`, { ...config, ...options });

  // Apply any overrides
  return { ...config, ...options };
}

module.exports = {
  getCookieConfig,
  isProduction
};
