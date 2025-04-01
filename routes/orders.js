// /var/projects/backend-api/routes/orders.js

// --- Existing requires ---
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your DB pool/client
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

// --- REVISED POST / Route ---
router.post('/', auth, async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ message: 'User authentication error.' });
    }

    const { items } = req.body; // Expecting: [{ productId: ..., quantity: ... }, ...]

    // --- Basic Input Validation ---
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order items array is required.' });
    }
    if (!items.every(item => item && Number.isInteger(item.productId) && item.productId > 0 && Number.isInteger(item.quantity) && item.quantity > 0)) {
         return res.status(400).json({ message: 'Invalid items array format. Each item must have productId and quantity as positive integers.' });
    }

    // --- Database Transaction ---
    const client = await db.pool.connect();
    console.log(`[POST /api/orders] Transaction started for user ${userId}`);

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Fetch Product Details & Calculate Total Server-Side
        const productIds = [...new Set(items.map(item => item.productId))];
        // Fetch required details: price, name, image (for thumbnail)
        // *** Verify your product column names ***
        const productQueryText = `SELECT id, price, name, image FROM products WHERE id = ANY($1::int[])`;
        const productResult = await client.query(productQueryText, [productIds]);

        const productDetailsMap = new Map();
        productResult.rows.forEach(p => {
            productDetailsMap.set(p.id, {
                price: parseFloat(p.price), // Ensure numeric
                name: p.name,
                thumbnail: p.image // Use product image as thumbnail? Adjust if different.
            });
        });

        let calculatedTotal = 0;
        const lineItemsData = []; // To store data for both line_item and item tables

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
                title: details.name, // Snapshot title
                thumbnail: details.thumbnail // Snapshot thumbnail path/URL
                // Add other relevant product/variant details if needed
            });
        }
        calculatedTotal = parseFloat(calculatedTotal.toFixed(2));
        console.log(`[POST /api/orders] Calculated total: ${calculatedTotal}`);

        // 2. Insert into 'order' table (assuming table name is 'order')
        // *** Verify table name 'order' and column names user_id, total, status, created_at, updated_at ***
        const orderInsertQuery = `
            INSERT INTO "order" (user_id, total, status, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id, created_at
        `; // Use quotes around "order" if needed
        const orderResult = await client.query(orderInsertQuery, [userId, calculatedTotal, 'pending']);
        const newOrderId = orderResult.rows[0].id;
        const orderCreatedAt = orderResult.rows[0].created_at; // Use consistent timestamp
        console.log(`[POST /api/orders] Inserted into "order" table. New Order ID: ${newOrderId}`);

        // 3. Insert into 'order_line_item' and 'order_item' tables for each item
        // *** Verify all column names for both tables ***
        const lineItemInsertQuery = `
            INSERT INTO order_line_item (product_id, variant_id, title, thumbnail, unit_price, quantity, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
            RETURNING id
        `; // Added quantity here assuming it might belong? Check schema again if needed. If not, remove it.
           // Using same timestamp for created/updated

        const orderItemInsertQuery = `
            INSERT INTO order_item (order_id, item_id, quantity, generation_status, report_s3_key, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
        `; // Added generation_status, report_s3_key. Using same timestamp.
           // Set fulfilled/shipped/etc quantities to 0 by default if NOT NULL constraints require it

        for (const lineItem of lineItemsData) {
            // Insert the line item snapshot
             console.log(`[POST /api/orders] Inserting line item for Product ID: ${lineItem.productId}`);
             // Adjust query/params based on actual order_line_item schema (e.g., variant_id may be null)
            const lineItemResult = await client.query(lineItemInsertQuery, [
                lineItem.productId, // product_id
                null,               // variant_id (assuming null for now)
                lineItem.title,     // title
                lineItem.thumbnail, // thumbnail
                lineItem.unitPrice, // unit_price
                lineItem.quantity,  // <<< If quantity belongs here, otherwise remove
                orderCreatedAt      // created_at, updated_at
            ]);
            const newLineItemId = lineItemResult.rows[0].id;

            // Insert the corresponding order item tracking record
             console.log(`[POST /api/orders] Inserting order item for Line Item ID: ${newLineItemId}`);
            await client.query(orderItemInsertQuery, [
                newOrderId,      // order_id
                newLineItemId,   // item_id (links to order_line_item)
                lineItem.quantity, // quantity
                'pending',       // generation_status (default)
                null,            // report_s3_key (default)
                orderCreatedAt   // created_at, updated_at
            ]);
        }
        console.log(`[POST /api/orders] Inserted ${lineItemsData.length} line items and order items.`);

        // 4. Commit Transaction
        await client.query('COMMIT');
        console.log(`[POST /api/orders] Transaction committed for Order ID: ${newOrderId}`);

        // 5. Send Success Response
        res.status(201).json({
             message: 'Order created successfully.',
             order: { // Return basic order info; client can fetch full details if needed
                 id: newOrderId,
                 total: calculatedTotal,
                 status: 'pending',
                 created_at: orderCreatedAt
             }
        });

    } catch (error) {
        // 6. Rollback Transaction on Error
        await client.query('ROLLBACK');
        console.error('[POST /api/orders] Transaction rolled back due to error:', error);
        res.status(500).json({ message: 'Server error creating order.', error: error.message });
    } finally {
        // 7. Release Client Back to Pool
        client.release();
        console.log(`[POST /api/orders] Database client released.`);
    }
});

// GET user's own orders (Authenticated users)
router.get('/my-orders', auth, async (req, res) => {
    try {
        const userId = req.user.userId; // Get ID from authenticated user
         if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}

        const result = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Server error fetching user orders.' });
    }
});


// GET a single order by ID (Owner or Admin only) - REVISED
// Add 'auth' middleware, logic check inside
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // User ID from token
    const userRole = req.user.role; // User role from token

    if (!userId) { return res.status(401).json({message: 'User ID not found in token.'});}


    const result = await db.query('SELECT * FROM orders WHERE id = $1', [id]);

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

// PUT update an existing order (Admin Only)
// Add 'isAdmin' middleware
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { total, status } = req.body; // Add other fields if needed (e.g., tracking_number)

    // Add validation
     if (total === undefined || status === undefined) {
       return res.status(400).json({ message: 'Total and status are required for update.' });
     }
      const numericTotal = Number(total);
      if (isNaN(numericTotal) || numericTotal < 0) {
         return res.status(400).json({ message: 'Total must be a non-negative number.' });
     }
     // Add validation for status values if applicable (e.g., ['pending', 'shipped', 'delivered'])


    const result = await db.query(
      'UPDATE orders SET total = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *', // Use updated_at convention
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
// Add 'isAdmin' middleware
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    res.status(200).json({ message: 'Order deleted successfully.', order: result.rows[0] });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error deleting order.' });
  }
});

// GET ALL orders (Admin Only) - Example new route
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        // Simple query to get all orders, newest first
        const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server error fetching all orders.' });
    }
});
// --- Keep other route handlers (GET /my-orders, GET /:id, PUT /:id, DELETE /:id, GET /) ---
// Remember they will also need updating to JOIN with order_line_item and order_item
// to show meaningful data.
// ... (rest of your file) ...

module.exports = router;
