// /var/projects/backend-api/routes/users.js
const express = require('express');
const router = express.Router();

// If you're using these libraries, make sure they're installed
// npm install bcryptjs jsonwebtoken
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// For testing purposes, let's create a simple in-memory user store
// In production, you'd use your database here
const users = [
  {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    // This is "password123" hashed with bcrypt
    password: '$2a$10$CwTycUXWue0Thq9StjUM0uQxTmPwVK/1.MN4iLqbcTL4.0s4ECymK' 
  }
];

// Helper functions (simple implementation for testing)
const findUserByEmail = async (email) => {
  return users.find(user => user.email === email) || null;
};

const createUser = async (userData) => {
  const newUser = {
    id: users.length + 1,
    ...userData
  };
  users.push(newUser);
  return newUser;
};

// Login route with detailed logging
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with body:', req.body);
    
    // Validate input
    if (!req.body || !req.body.email || !req.body.password) {
      console.log('Missing required fields in login request');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const { email, password } = req.body;
    
    // Find user by email
    const user = await findUserByEmail(email);
    console.log(`User found for email ${email}:`, user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-default-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('Login successful for user:', user.email);
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register route with detailed logging
router.post('/register', async (req, res) => {
  try {
    console.log('Register attempt with body:', req.body);
    
    // Validate input
    if (!req.body || !req.body.name || !req.body.email || !req.body.password) {
      console.log('Missing required fields in register request');
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    console.log(`User exists for email ${email}:`, existingUser ? 'Yes' : 'No');
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = await createUser({
      name,
      email,
      password: hashedPassword
    });
    
    console.log('New user created:', newUser.email);
    
    // Create JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || 'your-default-secret-key',
      { expiresIn: '1h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Simple route for testing
router.get('/test', (req, res) => {
  res.json({ message: 'Users routes working!' });
});

module.exports = router;
