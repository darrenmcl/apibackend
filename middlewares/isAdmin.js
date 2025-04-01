// /var/projects/backend-api/middlewares/isAdmin.js

function isAdmin(req, res, next) {
  /**
   * This middleware assumes that a preceding middleware (like your 'auth' middleware)
   * has already verified the JWT and attached the decoded payload (including the role)
   * to the `req.user` object.
   */

  // Check if req.user exists and has a role property
  if (!req.user || typeof req.user.role === 'undefined') {
    // This shouldn't happen if 'auth' middleware ran correctly, but good to check.
    console.error('isAdmin middleware error: req.user or req.user.role is missing/undefined.');
    // Return 403 Forbidden as we cannot determine the role.
    return res.status(403).json({ message: 'Forbidden: User role information unavailable.' });
  }

  // Check if the user's role is specifically 'admin'
  if (req.user.role === 'admin') {
    // Role is 'admin', allow the request to proceed to the next handler
    next();
  } else {
    // Role is not 'admin', deny access with 403 Forbidden
    res.status(403).json({ message: 'Forbidden: Admin privileges required.' });
  }
}

module.exports = isAdmin;
