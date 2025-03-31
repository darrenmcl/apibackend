// /var/projects/backend-api/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Import your DB connection pool

// --- Database Helper Functions ---
const findUserByEmail = async (email) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null; // Return user or null if not found
  } catch (err) {
    console.error('Error finding user by email:', err);
    throw err; // Re-throw error to be caught by route handler
  }
};

// Inside routes/users.js

    const createUser = async (userData) => {
      const { name, email, password } = userData; // <<< CORRECTED THIS LINE
      const defaultRole = 'user';
      try {
        // The rest of the function uses name, email, password correctly now
        const result = await db.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
          [name, email, password, defaultRole]
        );
        return result.rows[0];
      } catch (err) {
        console.error('Error creating user:', err);
        throw err;
      }
    };

// --- REVISED Login Route (using DB helpers) ---
router.post('/login', async (req, res) => {
  try {
    // ... (input validation) ...
    const { email, password } = req.body;
    const user = await findUserByEmail(email); // Uses DB

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password); // Compare with DB password hash

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload (using user data from DB, including role)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role // Role comes from DB
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-default-secret-key', { expiresIn: '1h' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.'});
  }
});

// --- REVISED Register Route (using DB helpers) ---
router.post('/register', async (req, res) => {
  try {
    // ... (input validation) ...
    const { name, email, password } = req.body;
    const existingUser = await findUserByEmail(email); // Uses DB

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in DB (createUser now handles default role)
    const newUser = await createUser({ name, email, password: hashedPassword }); // Uses DB

    // Create JWT payload for the new user
    const payload = { userId: newUser.id, email: newUser.email, role: newUser.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-default-secret-key', { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.'});
  }
});

module.exports = router;
