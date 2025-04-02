const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const { v4: uuidv4 } = require('uuid');

// GET ALL orders (Admin Only) - Moved to top to avoid route order issues
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        // Changed from 'orders' to '"order"'
        const result = await db.query('SELECT * FROM "order" ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server error fetching all orders.' });
    }
});

// GET user's own orders - Placed before parameterized routes
router.get('/my-orders', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}

        // Changed from 'orders' to '"order"'
        const result = await db.query('SELECT * FROM "order" WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Server error fetching user orders.' });
    }
});

// GET a single order by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}

        // Changed from 'orders' to '"order"'
        const result = await db.query('SELECT * FROM "order" WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const order = result.rows[0];

        // Check if the logged-in user is the owner OR an admin
        if (order.user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view this order.' });
        }

        // Allow access if owner or admin
        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Server error fetching order.' });
    }
});

// POST create a new order
router.post('/', auth, async (req, res) => {
    console.log('[POST /api/orders] req.user received from auth middleware:', req.user);
    // --- >>> VERIFY THESE LINES ARE CORRECT <<< ---
    const customerId = req.user?.customerId; // Gets value from req.user
    const userEmail = req.user?.email;       // Gets value from req.user
    const userIdForLogs = req.user?.userId; // Optional for logging

    // Check if they were successfully retrieved from req.user
    if (!customerId || !userEmail) {
        console.error(`[POST /api/orders] Missing customerId or email from req.user for userId ${userIdForLogs}. req.user:`, req.user);
        return res.status(401).json({ message: 'User customer ID or email could not be determined from token.' });
    }
    // --- >>> END VERIFICATION <<< ---

    const { items } = req.body;
    // ... rest of validation ...

    const client = await db.connect(); // Corrected connect method
    console.log(`[POST /api/orders] Transaction started for Customer ID: ${customerId}`); // Log the defined variable


    try {
        await client.query('BEGIN');

        // Rest of transaction code remains unchanged...
        const productIds = [...new Set(items.map(item => item.productId))];
        const productQueryText = `SELECT id, price, name, image FROM products WHERE id = ANY($1::int[])`;
        const productResult = await client.query(productQueryText, [productIds]);

        const productDetailsMap = new Map();
        productResult.rows.forEach(p => {
            productDetailsMap.set(p.id, {
                price: parseFloat(p.price),
                name: p.name,
                thumbnail: p.image
            });
        });

        let calculatedTotal = 0;
        const lineItemsData = [];

        for (const item of items) {
            const details = productDetailsMap.get(item.productId);
            if (!details || isNaN(details.price)) {
                throw new Error(`Product with ID ${item.productId} not found or has invalid price.`);
            }
            calculatedTotal += details.price * item.quantity;
            lineItemsData.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: details.price,
                title: details.name,
                thumbnail: details.thumbnail
            });
        }
        calculatedTotal = parseFloat(calculatedTotal.toFixed(2));
        console.log(`[POST /api/orders] Calculated total: ${calculatedTotal}`);

// Inside POST / handler, after total calculation

// --- CORRECTED section ---
// 2. Insert into "order" table
const newOrderId = `order_${uuidv4()}`; // <<< DEFINE the new TEXT ID first using uuid
const defaultRegionId = process.env.DEFAULT_REGION_ID || 'reg_default'; // Example default
const defaultCurrencyCode = process.env.DEFAULT_CURRENCY || 'usd'; // Example default

// *** Verify table name "order" and column names ***
// Use correct lowercase column names matching the 'order' table schema
const orderInsertQuery = `
    INSERT INTO "order" (id, customer_id, region_id, email, currency_code, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, created_at 
`; // Removed quotes, corrected case, fixed RETURNING alias
// Now use the defined newOrderId variable as the first parameter ($1)
const orderResult = await client.query(orderInsertQuery, [
    newOrderId,         // <<< Use the variable defined above
    customerId,
    defaultRegionId,
    userEmail,
    defaultCurrencyCode,
    'pending'
]);

// Check if insert worked and RETURNING gave us rows
if (!orderResult.rows || orderResult.rows.length === 0) {
    throw new Error('Failed to retrieve new Order ID after insert into "order" table.');
}
// newOrderId is already defined, just get the timestamp
const orderCreatedAt = orderResult.rows[0].created_at;
console.log(`[POST /api/orders] Inserted into "order" table. New Order ID: ${newOrderId}`);
// --- End CORRECTED section ---

// 3. Insert into 'order_line_item' and 'order_item' tables...
// ... the rest of the loop which USES newOrderId ...


// --- CORRECTED order_line_item insert ---
    // *** VERIFY order_line_item column names (product_id, variant_id, title, thumbnail, unit_price, created_at, updated_at) ***
    const lineItemInsertQuery = `
        INSERT INTO order_line_item (id, product_id, variant_id, title, thumbnail, unit_price, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING id
    `; // Removed quantity, adjusted placeholders ($7,$7 -> $6,$6)

    // ... inside loop ...
     console.log(`[POST /api/orders] Inserting line item for Product ID: ${lineItem.productId}`);
    const lineItemResult = await client.query(lineItemInsertQuery, [
        newLineItemId,      // $1 id
        lineItem.productId, // $2 product_id
        null,               // $3 variant_id (assuming null)
        lineItem.title,     // $4 title
        lineItem.thumbnail, // $5 thumbnail
        lineItem.unitPrice, // $6 unit_price
        orderCreatedAt      // $7 created_at, $7 updated_at (now becomes $6, $6)
    ]);
    const newLineItemId = lineItemResult.rows[0].id; // Get the generated ID
     // --- END CORRECTED ---

    // --- Insert into order_item (This part correctly includes quantity) ---
    const orderItemInsertQuery = `... VALUES ($1, $2, $3, $4, $5, $6, $6) ...`;
    await client.query(orderItemInsertQuery, [
        `item_${uuidv4()}`, // Generate new order_item ID
        newOrderId,
        newLineItemId,      // Link to the order_line_item we just created
        lineItem.quantity,  // <<< CORRECTLY includes quantity here
        'pending',          // generation_status
        null,               // report_s3_key
        orderCreatedAt      // created_at, updated_at
    ]);
    // --- End insert into order_item ---
        console.log(`[POST /api/orders] Inserted ${lineItemsData.length} line items and order items.`);

        await client.query('COMMIT');
        console.log(`[POST /api/orders] Transaction committed for Order ID: ${newOrderId}`);

        res.status(201).json({
            message: 'Order created successfully.',
            order: {
                id: newOrderId,
                total: calculatedTotal,
                status: 'pending',
                created_at: orderCreatedAt
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[POST /api/orders] Transaction rolled back due to error:', error);
        res.status(500).json({ message: 'Server error creating order.', error: error.message });
    } finally {
        client.release();
        console.log(`[POST /api/orders] Database client released.`);
    }
});

// PUT update an existing order (Admin Only)
router.put('/:id', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { total, status } = req.body;

        if (total === undefined || status === undefined) {
            return res.status(400).json({ message: 'Total and status are required for update.' });
        }
        const numericTotal = Number(total);
        if (isNaN(numericTotal) || numericTotal < 0) {
            return res.status(400).json({ message: 'Total must be a non-negative number.' });
        }

        // Changed from 'orders' to '"order"'
        const result = await db.query(
            'UPDATE "order" SET total = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [numericTotal, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        res.status(200).json({ message: 'Order updated successfully.', order: result.rows[0] });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Server error updating order.' });
    }
});

// DELETE an order (Admin Only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Changed from 'orders' to '"order"'
        const result = await db.query('DELETE FROM "order" WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        res.status(200).json({ message: 'Order deleted successfully.', order: result.rows[0] });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Server error deleting order.' });
    }
});

module.exports = router;
