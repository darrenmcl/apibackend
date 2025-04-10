// /var/projects/backend-api/middlewares/auth.js (using Pino logger)
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger'); // <<< Import the Pino logger
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function auth(req, res, next) {
    logger.info('[Auth Middleware] Running check...'); // <<< Use logger.info
    // Use debug level for potentially sensitive info like all cookies, include as object
    logger.debug({ cookies: req.cookies }, '[Auth Middleware] req.cookies received'); // <<< Log cookies object
    // ---> ADD THIS LINE <---
    logger.debug(`[Auth Middleware Raw] Cookie Header Received: ${req.headers.cookie}`);
    // ---> END ADDED LINE <---
    logger.debug({ cookies: req.cookies }, '[Auth Middleware] req.cookies received (parsed):'); // Keep this too
    // ... rest of the function ...

    let token = null;
    if (req.cookies?.auth_token) {
        token = req.cookies.auth_token;
        logger.info('[Auth Middleware] Token found in cookie.');
    } else {
         logger.warn('[Auth Middleware] Token NOT found in cookie.'); // Use logger.warn
    }

    // ... (Fallback header check logic if you kept it) ...

    logger.info(`[Auth Middleware] Final Token Found: ${token ? 'Yes' : 'No'}`);

    if (!token) {
        logger.warn('[Auth Middleware] No token found. Denying access.'); // Use logger.warn
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        logger.debug('[Auth Middleware] Verifying token...'); // Use logger.debug
        const decoded = jwt.verify(token, JWT_SECRET);
        // Log important parts of payload, avoid logging entire token unless debugging
        logger.info({ userId: decoded.userId, role: decoded.role }, '[Auth Middleware] Token verified.'); // Log structured data
        req.user = decoded;
        next();
    } catch (error) {
        // Log the actual error object for details
        logger.error({ err: error }, `[Auth Middleware] Token verification failed: ${error.message}`); // Use logger.error
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

module.exports = auth;
