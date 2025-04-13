const jwt = require('jsonwebtoken');
const logger = require('../lib/logger'); // Use your Pino logger
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function auth(req, res, next) {
  logger.info('[Auth Middleware] Running check...');
  logger.debug({ cookies: req.cookies }, '[Auth Middleware] req.cookies received (parsed)');
  logger.debug(`[Auth Middleware Raw] Cookie Header Received: ${req.headers.cookie}`);

  let token = null;

  // First try to get token from cookie
  if (req.cookies?.auth_token) {
    token = req.cookies.auth_token;
    logger.info('[Auth Middleware] Token found in cookie.');
  } else {
    const authHeader = req.header('Authorization');
    logger.debug(`[Auth Middleware] Checking Authorization header. Value: [${authHeader}]`);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Strip "Bearer " prefix
      logger.info('[Auth Middleware] Token found in Authorization header.');
    } else {
      logger.warn('[Auth Middleware] Token NOT found in cookie or Authorization header.');
    }
  }

  logger.info(`[Auth Middleware] Final Token Found: ${token ? 'Yes' : 'No'}`);

  if (!token) {
    logger.warn('[Auth Middleware] No token found. Denying access.');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    logger.debug('[Auth Middleware] Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info({ userId: decoded.userId, role: decoded.role }, '[Auth Middleware] Token verified.');
    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ err: error }, `[Auth Middleware] Token verification failed: ${error.message}`);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = auth;
