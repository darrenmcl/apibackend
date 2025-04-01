// /var/projects/backend-api/routes/users.js
// --- PHASE 1 COMPLETE VERSION ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Import your DB connection pool

// --- Database Helper Functions ---
const findUserByEmail = async (email) => {
  try {
    // Explicitly selecting columns needed (including role and name)
    const queryText = 'SELECT id, email, password, role, name, created_at FROM users WHERE email = $1';
    const result = await db.query(queryText, [email]);
    return result.rows[0] || null; // Return user or null if not found
  } catch (err) {
    console.error('Error finding user by email:', err);
    throw err; // Re-throw error to be caught by route handler
  }
};

const createUser = async (userData) => {
  const { name, email, password } = userData; // Password should be hashed already
  const defaultRole = 'user';
  try {
    const queryText = 'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role';
    const result = await db.query(queryText, [name, email, password, defaultRole]);
    return result.rows[0]; // Return the newly created user data
  } catch (err) {
    console.error('Error creating user:', err);
    throw err; // Re-throw error
  }
};

// --- Login Route ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByEmail(email); // Uses DB helper

    if (!user) {
      // Security: Use generic message for non-existent user or wrong password
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password); // Compare with DB password hash

    if (!isMatch) {
      // Security: Use generic message
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload (using user data from DB, including role)
    const payload = {
      userId: user.id,
      email: user.email, // Include fields needed by frontend/middleware
      role: user.role   // Role included from DB
    };
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-default-secret-key', // Ensure JWT_SECRET is set in .env!
        { expiresIn: '1h' } // Or your desired expiration
    );

    // Send token and user info (excluding password)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name, // Name from DB
        email: user.email,
        role: user.role // Role from DB
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// --- Register Route ---
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    // Add password length validation if desired (e.g., >= 6 characters)
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long'});
    }

    const existingUser = await findUserByEmail(email); // Uses DB

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in DB (createUser sets default role 'user')
    const newUser = await createUser({ name, email, password: hashedPassword }); // Uses DB

    // Create JWT payload for the new user
    const payload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role // Role will be 'user'
    };
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-default-secret-key',
        { expiresIn: '1h' }
    );

    // Send token and user info (excluding password)
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

module.exports = router;
