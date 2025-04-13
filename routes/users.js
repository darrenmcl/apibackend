// /var/projects/backend-api/routes/users.js
// --- PHASE 1 COMPLETE VERSION ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Import your DB connection pool
const { v4: uuidv4 } = require('uuid');
const auth = require('../middlewares/auth');
const logger = require('../lib/logger');
const { getCookieConfig } = require('../config/cookie-config');

// --- Database Helper Functions ---
// findUserByEmail needs to return role as well now
const findUserByEmail = async (email) => {
  try {
    // *** Ensure you SELECT id, email, password, role, name FROM users ***
    const result = await db.query('SELECT id, email, password, role, name FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (err) { /* ... */ throw err; }
};

const createUser = async ({ email, password, name, role = 'user' }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (email, password, name, role, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id, email, name, role
  `;
  const values = [email, hashedPassword, name, role];
  const result = await db.query(query, values);
  return result.rows[0];
};


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

    // ✅ 5. Set the HttpOnly cookie using environment-aware config
    res.cookie('auth_token', token, getCookieConfig());

    // 6. Send response with user info (token not included since it's in the cookie)
    res.json({
      user: {
        id: user.id,
        customerId,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token
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

// POST /logout - Logout user and clear cookie
router.post('/logout', (req, res) => {
  try {
    logger.info(`[POST /logout] Clearing cookie 'auth_token'...`);
    
    // Use the same config for clearing cookies
    res.clearCookie('auth_token', getCookieConfig({ maxAge: 0 }));

    logger.info(`[POST /logout] Cookie clear instruction sent.`);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error({ err: error }, `[POST /logout] Error clearing cookie`);
    res.status(500).json({ message: 'Server error during logout.' });
  }
});

// Add this to your routes/users.js file

// Test endpoint for cookie functionality
router.get('/test-cookie', (req, res) => {
  // Log request details
  console.log('[Test Cookie] Request received with:');
  console.log(`- Hostname: ${req.hostname}`);
  console.log(`- Protocol: ${req.protocol}`);
  console.log(`- Original URL: ${req.originalUrl}`);
  console.log('- Headers:', {
    origin: req.headers.origin,
    host: req.headers.host,
    referer: req.headers.referer,
    'user-agent': req.headers['user-agent']
  });
  
  // Check existing cookies
  console.log('[Test Cookie] Existing cookies:', req.cookies);
  
  // Generate a test value with timestamp
  const timestamp = new Date().toISOString();
  const testValue = `test-${timestamp}`;
  
  // Set a test cookie with our cookie config
  const cookieOptions = getCookieConfig({}, req);
  console.log('[Test Cookie] Setting cookie with options:', cookieOptions);
  
  res.cookie('test_auth_cookie', testValue, cookieOptions);
  
  // Also try setting a basic cookie without options
  res.cookie('basic_test_cookie', `basic-${timestamp}`, { path: '/' });
  
  // Return informative response
  res.json({ 
    success: true,
    message: 'Test cookies set. Check your browser cookies to see if they were saved.',
    testValue,
    cookieConfig: cookieOptions,
    requestInfo: {
      timestamp,
      hostname: req.hostname,
      protocol: req.protocol,
      headers: {
        origin: req.headers.origin,
        host: req.headers.host
      },
      cookies: req.cookies
    },
    instructions: "After receiving this response, try refreshing this page or making another request to see if the cookies are included."
  });
});

// Test endpoint to verify cookie receipt
router.get('/check-cookies', (req, res) => {
  // Log the cookies received
  console.log('[Check Cookies] Cookies received:', req.cookies);
  
  // Return a response with the cookies we received
  res.json({
    success: true,
    message: 'Cookie check complete',
    receivedCookies: req.cookies,
    hasCookies: Object.keys(req.cookies).length > 0,
    hasTestCookie: !!req.cookies.test_auth_cookie,
    hasAuthToken: !!req.cookies.auth_token
  });
});

// --- REGISTER ROUTE ---
// POST /register - Register a new user
router.post('/register', async (req, res) => {
  const customerId = uuidv4(); // generate UUID manually
  const timestamp = new Date().toISOString();
  const { name, email, password } = req.body;
  logger.info({ email }, `[${timestamp}] [POST /register] Attempting user registration.`);

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    // 1. Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email.' });
    }

    // 2. Create user (this calls your createUser function!)
    const newUser = await createUser({ email, password, name });
    const customerId = uuidv4();
    // 3. Optionally: create a customer record linked to this email
    const customerResult = await db.query(
     `INSERT INTO customer (id, email, has_account, created_at, updated_at)
      VALUES ($1, $2, true, NOW(), NOW())`,
      [customerId, email]
    );
    const customerId = customerResult.rows[0].id;

    // 4. Create JWT token
    const payload = {
      userId: newUser.id,         // INTEGER
      customerId,                 // UUID
      email: newUser.email,
      role: newUser.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 5. Set HttpOnly cookie
    res.cookie('auth_token', token, getCookieConfig());

    // 6. Return success response
    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        customerId,
        token
      }
    });

  } catch (error) {
    logger.error({ err: error }, `[${timestamp}] Error during registration.`);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});


// --- Keep module.exports ---
module.exports = router;
