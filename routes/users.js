// /var/projects/backend-api/routes/users.js
// --- PHASE 1 COMPLETE VERSION ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Import your DB connection pool
const { v4: uuidv4 } = require('uuid');
const auth = require('../middlewares/auth');

// /var/projects/backend-api/routes/users.js

// ... (keep existing requires: express, router, bcrypt, jwt, db) ...

// --- Database Helper Functions ---
// findUserByEmail needs to return role as well now
const findUserByEmail = async (email) => {
  try {
    // *** Ensure you SELECT id, email, password, role, name FROM users ***
    const result = await db.query('SELECT id, email, password, role, name FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (err) { /* ... */ throw err; }
};

// createUser needs role='user' (already added conceptually before)
const createUser = async (userData) => { /* ... keep revised version ... */ };

// --- REVISED Login Route ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 1. Find user and verify password
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Get customer ID from customer table
    let customerId = null;
    try {
      const customerQueryText = 'SELECT id FROM customer WHERE email = $1 AND has_account = true';
      const customerResult = await db.query(customerQueryText, [user.email]);

      if (customerResult.rows.length > 0) {
        customerId = customerResult.rows[0].id;
        console.log(`[Login] Found customer ID: ${customerId}`);
      } else {
        return res.status(403).json({
          message: 'Login successful, but customer account link is missing. Please contact support.',
        });
      }
    } catch (customerError) {
      console.error("[Login] Error fetching customer ID:", customerError);
      return res.status(500).json({ message: 'Server error retrieving customer details.' });
    }

    // 3. Create JWT payload
    const payload = {
      userId: user.id,
      customerId,
      email: user.email,
      role: user.role
    };

    // 4. Sign the token
    const jwtSecret = process.env.JWT_SECRET || 'your-default-secret-key';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

    console.log(`[Login] Token generated for ${user.email} | role: ${user.role} | customer: ${customerId}`);

    // ✅ 5. Set the HttpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // 6. Send response with user info (token not included since it's in the cookie)
    res.json({
      user: {
        id: user.id,
        customerId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[Login] Overall error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});


// GET /profile - Get current user's profile info
router.get('/profile', auth, async (req, res) => {
    try {
        const userId = req.user?.userId; // Get INT userId from token
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        console.log(`[GET /users/profile] Fetching profile for userId: ${userId}`);

        // Fetch from 'users' table
        // *** Verify column names: id, email, name, role ***
        const userResult = await db.query(
            'SELECT id, email, name, role FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            console.warn(`[GET /users/profile] User ${userId} found in token but not in DB!`);
            return res.status(404).json({ message: 'User not found.' });
        }
        const userProfile = userResult.rows[0];

        // Fetch corresponding customer ID (using email as the link)
        let customerId = null;
         // *** Verify 'customer' table column names: id, email, has_account ***
        const customerResult = await db.query(
            'SELECT id FROM customer WHERE email = $1 AND has_account = true',
            [userProfile.email]
        );
        if (customerResult.rows.length > 0) {
            customerId = customerResult.rows[0].id;
        } else {
             console.warn(`[GET /users/profile] No active customer record found for email ${userProfile.email}`);
             // Proceed without customerId for profile, but orders might fail later if this happens
        }

        // Combine info (exclude password!)
        const fullProfile = {
            ...userProfile,
            customerId: customerId
        };

        console.log(`[GET /users/profile] Returning profile for userId: ${userId}`);
        res.status(200).json(fullProfile);

    } catch (error) {
        console.error(`[GET /users/profile] Error fetching profile for userId ${req.user?.userId}:`, error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

// POST /logout - Clears auth_token cookie
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
    });

    console.log('[Logout] auth_token cookie cleared');
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('[Logout] Error clearing cookie:', error);
    res.status(500).json({ message: 'Server error during logout.' });
  }
});



// module.exports = router; // Should be at the end

// --- Keep module.exports ---
module.exports = router;
