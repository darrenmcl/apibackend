// /var/projects/backend-api/middlewares/auth.js (CORRECTED FOR COOKIES)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Ensure this matches signing secret

function auth(req, res, next) {
    console.log('[Auth Middleware] Running check...');
    // --- Read token from HttpOnly cookie ---
    const token = req.cookies?.auth_token; // Reads cookie named 'auth_token'

    console.log('[Auth Middleware] Token from cookie:', token ? 'Found' : 'MISSING');

    if (!token) {
        console.log('[Auth Middleware] No token found in cookie. Denying.');
        // Changed status to 401 for missing token
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        console.log('[Auth Middleware] Verifying token from cookie...');
        // Verify the token found in the cookie
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[Auth Middleware] Token verified. Decoded Payload:', decoded);

        // Attach the decoded payload to the request object for subsequent handlers
        req.user = decoded;
        next(); // Proceed to the next middleware or route handler

    } catch (error) {
        // Handle errors during verification (invalid signature, expired token etc.)
        console.log('[Auth Middleware] Token verification failed:', error.message);
        // Changed status to 401 for invalid token cases
        res.status(401).json({ message: 'Invalid or expired token.' });
        // Consider clearing the bad cookie? res.clearCookie('auth_token', { path: '/' });
    }
}

module.exports = auth;
