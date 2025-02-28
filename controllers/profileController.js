// Assuming you have a User model for your PostgreSQL database (using pg or similar)
const db = require('../config/db'); // Your database connection

exports.getProfile = async (req, res) => {
  try {
    // Assume the authenticated user's ID is stored in req.user.id (set by authMiddleware)
    const userId = req.user.id;
    const { rows } = await db.query('SELECT id, email, name, bio FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio } = req.body; // Example fields to update
    const { rows } = await db.query(
      'UPDATE users SET name = $1, bio = $2, updated_at = NOW() WHERE id = $3 RETURNING id, email, name, bio',
      [name, bio, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
