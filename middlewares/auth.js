const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function auth(req, res, next) {
  // Expecting token in the Authorization header, e.g., "Bearer <token>"
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // Remove "Bearer " if present
  const token = authHeader.replace(/^Bearer\s+/, '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach the decoded payload (id, email, etc.) to the request
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
}

module.exports = auth;
