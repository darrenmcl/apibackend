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

    // 1. Find user and verify password (against 'users' table)
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' }); // Use 401
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' }); // Use 401
    }

    // --- 2. ADDED: Find corresponding Customer ID ---
    let customerId = null;
    try {
        console.log(`[Login] Found user ${user.email}, searching for customer record...`);
        // *** Query 'customer' table by email where account exists ***
        // *** Verify table name ('customer') and column names ('email', 'has_account', 'id') ***
        const customerQueryText = 'SELECT id FROM customer WHERE email = $1 AND has_account = true';
        const customerResult = await db.query(customerQueryText, [user.email]);

        if (customerResult.rows.length > 0) {
            customerId = customerResult.rows[0].id; // Get the TEXT customer ID
            console.log(`[Login] Found customer ID: ${customerId}`);
        } else {
            // This case should ideally not happen if registration creates/updates customer record correctly
            console.warn(`[Login] No active customer record found for email ${user.email}`);
            // Return error - user authenticated but lacks customer link needed for orders
            return res.status(403).json({ message: 'Login successful, but customer account link is missing. Please contact support.' });
        }
    } catch(customerError) {
         console.error("[Login] Error fetching customer ID:", customerError);
         return res.status(500).json({ message: 'Server error retrieving customer details.' });
    }
    // --- END Fetch Customer ID ---


    // 3. Create JWT payload - INCLUDING customerId
    const payload = {
      userId: user.id,      // INTEGER ID from 'users' table
      customerId: customerId, // <<< TEXT ID from 'customer' table
      email: user.email,    // Email
      role: user.role       // Role ('user' or 'admin')
      // Add 'name': user.name if needed in token/req.user later
    };

    // 4. Sign Token
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-default-secret-key',
        { expiresIn: '1h' }
    );

    console.log(`[Login] Token generated for user ${user.email}, role ${user.role}, customer ${customerId}`);

    // 5. Return Response
    res.json({
      token,
      user: { // Include data potentially useful for frontend immediately
        id: user.id,
        customerId: customerId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[Login] Overall error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
}); // --- End Login Route ---


router.post('/register', async (req, res) => {
    console.log('[Register] Attempt with body:', req.body);
    const { name, email, password } = req.body;

    // --- Input Validation ---
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
         return res.status(400).json({ message: 'Password must be at least 6 characters long'});
    }
    // Add email format validation if desired

    // --- Use Transaction ---
    const client = await db.connect(); // Get client from pool
    console.log('[Register] Transaction started for email:', email);

    try {
        await client.query('BEGIN');

        // 1. Check existing User AND Customer
        // Check users table
        const existingUserResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUserResult.rows.length > 0) {
            console.log('[Register] User already exists in users table.');
            await client.query('ROLLBACK'); // Abort transaction
            client.release();
            return res.status(400).json({ message: 'Account with this email already registered.' });
        }

        // Check customer table (case-insensitive email check might be better depending on DB setup)
        // *** Verify 'customer' table column names: email, has_account, id ***
        const existingCustomerResult = await client.query('SELECT id, has_account FROM customer WHERE email = $1', [email]);
        const existingCustomer = existingCustomerResult.rows[0];

        let customerId;
        let isNewCustomer = false;

        if (existingCustomer) {
            // Customer exists, check if they already have a linked account
            if (existingCustomer.has_account) {
                console.log('[Register] Customer exists and already has account.');
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ message: 'Account with this email already registered.' });
            } else {
                // Customer exists but doesn't have a linked user account yet. Update it.
                console.log('[Register] Customer exists, updating has_account to true.');
                customerId = existingCustomer.id; // Use existing customer ID
                await client.query('UPDATE customer SET has_account = true, updated_at = NOW() WHERE id = $1', [customerId]);
            }
        } else {
            // Customer does not exist, create a new one
            console.log('[Register] Customer does not exist, creating new customer.');
            isNewCustomer = true;
            customerId = `cus_${uuidv4()}`; // Generate new customer TEXT ID
            const nameParts = name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            // *** Verify 'customer' table column names ***
            await client.query(
                'INSERT INTO customer (id, email, first_name, last_name, has_account, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
                [customerId, email, firstName, lastName, true] // Set has_account to true
            );
            console.log('[Register] New customer created with ID:', customerId);
        }

        // 2. Create User record (now that customer exists/is handled)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // *** Verify 'users' table column names: name, email, password, role ***
        const userInsertQuery = `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role, name`;
        const newUserResult = await client.query(userInsertQuery, [name, email, hashedPassword, 'user']);
        const newUser = newUserResult.rows[0];
        console.log('[Register] New user created in users table:', newUser);


        // 3. Link User and Customer IF NEEDED (e.g., if customer table has user_id FK)
        // If your 'customer' table has a 'user_id' column to link back:
        // await client.query('UPDATE customer SET user_id = $1 WHERE id = $2', [newUser.id, customerId]);
        // console.log('[Register] Linked customer to user.');


        // 4. Create JWT Payload (now includes customerId)
        const payload = {
            userId: newUser.id,
            customerId: customerId,
            email: newUser.email,
            role: newUser.role,
            name: newUser.name // Include name if needed
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-default-secret-key', { expiresIn: '1h' });


        // 5. Commit Transaction
        await client.query('COMMIT');
        console.log('[Register] Transaction committed for:', email);

        // 6. Send Success Response
        res.status(201).json({
            token,
            user: { // Send back useful user info
                id: newUser.id,
                customerId: customerId,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on any error
        console.error('[Register] Transaction rolled back due to error:', error);
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    } finally {
        client.release(); // Release client in all cases
         console.log('[Register] Database client released for:', email);
    }
}); // --- End Register Route ---

// Add near the end of /var/projects/backend-api/routes/users.js

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

// module.exports = router; // Should be at the end

// --- Keep module.exports ---
module.exports = router;
