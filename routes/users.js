// /var/projects/backend-api/routes/users.js
// --- PHASE 1 COMPLETE VERSION ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Import your DB connection pool

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


// --- Register Route (Needs Modification Too!) ---
router.post('/register', async (req, res) => {
  // --- IMPORTANT ---
  // This handler ALSO needs to be updated to interact with the 'customer' table.
  // It should check if a customer exists with the email.
  // - If exists & has_account=true -> Error "Account already registered"
  // - If exists & has_account=false -> Create user, UPDATE customer SET has_account=true
  // - If not exists -> Create user AND Create customer (with has_account=true)
  // This requires careful handling, possibly within a transaction.
  // We can revise this AFTER confirming login works.
  // --- Keep existing register logic FOR NOW, knowing it's incomplete ---
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long'});

    // IMPORTANT: This only checks 'users' table currently
    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists with this email' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // IMPORTANT: This currently only creates in 'users' table (if using DB)
    // Needs modification to also handle 'customer' table creation/update
    const newUser = await createUser({ name, email, password: hashedPassword });

    // Create JWT - needs customerId similar to login (requires fetching/creating customer first)
    // For now, sign with what we have, but ORDER CREATION WILL FAIL until register is fixed too
     const payload = { userId: newUser.id, email: newUser.email, role: newUser.role }; // Missing customerId
     const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-default-secret-key', { expiresIn: '1h' });

     res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }}); // Missing customerId

  } catch (error) { /* ... */ }
});


// --- Keep module.exports ---
module.exports = router;
