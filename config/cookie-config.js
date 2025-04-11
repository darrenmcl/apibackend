// /var/projects/backend-api/config/cookie-config.js

/**
 * Provides cookie configuration based on environment and request
 * Usage:
 * const { getCookieConfig } = require('../config/cookie-config');
 * res.cookie('auth_token', token, getCookieConfig({}, req));
 * res.clearCookie('auth_token', getCookieConfig({ maxAge: 0 }, req));
 */

// Get current environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Get cookie domain from environment variable if set
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/**
 * Get appropriate cookie configuration based on current environment and request
 * @param {Object} options - Override default options
 * @param {Object} req - Express request object (optional)
 * @returns {Object} Cookie configuration
 */
function getCookieConfig(options = {}, req = null) {
  // Check if it's a development environment
  const isDev = !isProduction || 
                (req && (req.hostname.includes('localhost') || 
                         req.hostname.includes('127.0.0.1')));
  
  // Log the request information
  if (req) {
    console.log(`[Cookie Config] Request hostname: ${req.hostname}`);
    console.log(`[Cookie Config] Request headers:`, {
      origin: req.headers.origin,
      host: req.headers.host,
      referer: req.headers.referer
    });
  }
  
  // Default cookie config
  const config = {
    httpOnly: true,
    secure: !isDev, // Only require HTTPS in production
    sameSite: isDev ? 'Lax' : 'None', // Critical for cross-origin in production
    path: '/',
    maxAge: options.maxAge !== undefined ? options.maxAge : 60 * 60 * 1000 // 1 hour default unless specified
  };

  // Determine the domain value
  let domain = COOKIE_DOMAIN;
  
  // If no env var and we have a request, calculate domain
  if (!domain && req && req.hostname && !isDev) {
    domain = req.hostname;
    
    // If hostname has www or other subdomain, extract base domain
    const domainParts = domain.split('.');
    if (domainParts.length > 2) {
      // Get the base domain (e.g., example.com from www.example.com)
      domain = domainParts.slice(-2).join('.');
    }
    
    // Add leading dot for subdomain support
    domain = `.${domain}`;
    
    console.log(`[Cookie Config] Calculated domain from hostname: ${domain}`);
  }
  
  // Add domain to config if we have one and we're not in development
  if (domain && !isDev) {
    config.domain = domain;
  }

  // Log the configuration
  console.log(`[Cookie Config] Environment: ${NODE_ENV}, isDev: ${isDev}`);
  console.log(`[Cookie Config] Using config:`, { ...config, ...options });

  // Apply any overrides and return
  return { ...config, ...options };
}

module.exports = {
  getCookieConfig,
  isProduction
};
