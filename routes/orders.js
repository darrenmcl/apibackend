const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const { v4: uuidv4 } = require('uuid');
// At the top of routes/orders.js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// Assuming s3Client is configured similarly to fileRoutes.js
// It might be better to configure S3Client once in a shared lib/config file and import it
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// --- Specific GET routes FIRST ---
// GET ALL orders (Admin Only)
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "order" ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server error fetching all orders.' });
    }
});

// GET user's own orders
// Replace the existing GET /my-orders route handler with this corrected version

// GET user's own orders (Authenticated users)
router.get('/my-orders', auth, async (req, res) => {
    try {
        // Use TEXT customerId from token provided by 'auth' middleware
        const customerId = req.user?.customerId;
        console.log(`[GET /my-orders] Attempting fetch for customerId: ${customerId}`);

        // Check if customerId was found in the token payload
        if (!customerId) {
             return res.status(401).json({message: 'Customer ID not found in token.'});
        }

        // Query the "order" table using the correct 'customer_id' column
        // Also use correct timestamp column names ('created_at' or quoted "createdAt")
        // *** VERIFY your exact column names 'customer_id' and 'created_at'/'updated_at' casing ***
        const queryText = `
            SELECT id, status, currency_code, created_at, updated_at
            FROM "order"
            WHERE customer_id = $1  -- <<< Corrected column from user_id
            ORDER BY created_at DESC -- <<< Corrected column name (assuming lowercase, adjust if camelCase)
        `;
        // Use db.query (pool) for simple selects
        const result = await db.query(queryText, [customerId]);

        console.log(`[GET /my-orders] Found ${result.rows.length} orders for customer ${customerId}`);

        // Send back the array of orders found
        res.status(200).json(result.rows);

    } catch (error) {
        // Log any database or other unexpected errors
        console.error(`Error fetching orders for customer ${req.user?.customerId}:`, error);
        res.status(500).json({ message: 'Server error fetching user orders.' });
    }
});

// --- GET /recent Route (Admin Only) ---
router.get('/recent', auth, isAdmin, async (req, res) => {
    const limit = 5; // Number of recent orders to fetch
    try {
        console.log(`>>> HIT /orders/recent Handler - User: ${req.user?.userId}, Role: ${req.user?.role}`); // Debug Log

        // Query latest orders from the "order" table
        // *** Verify column name created_at matches your schema (use quotes "" if needed) ***
        const queryText = `
            SELECT id, customer_id, status, currency_code, created_at, updated_at
            FROM "order"
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await db.query(queryText, [limit]); // Use db.query (pool)

        console.log(`[GET /orders/recent] Found ${result.rows.length} recent orders.`);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error(`Error fetching recent orders for admin ${req.user?.userId}:`, error);
        res.status(500).json({ message: 'Server error fetching recent orders.' });
    }
});


// --- Parameterized GET route AFTER specific ones ---
// GET a single order by ID
// Replace the existing GET /:id route handler with this one

// GET /:id - Get a single order by ID (Owner or Admin only)
router.get('/:id', auth, async (req, res) => {
    try {
        const orderId = req.params.id; // The TEXT order ID from the URL
        const tokenCustomerId = req.user?.customerId; // TEXT customer ID from JWT payload
        const userRole = req.user?.role;        // Role from JWT payload
        const userIdForLogs = req.user?.userId; // User ID for logging

        // Ensure customerId exists in token (should be guaranteed by login fix)
        if (!tokenCustomerId) {
            console.error(`[GET /orders/:id] User ${userIdForLogs} missing customerId in token!`);
            return res.status(401).json({message: 'Customer ID not found in token.'});
        }

        // Fetch the order from the database
        // *** Verify your table name ("order") and ID column name ('id') ***
        const queryText = `SELECT * FROM "order" WHERE id = $1`;
        const result = await db.query(queryText, [orderId]);

        if (result.rows.length === 0) {
            console.log(`[GET /orders/:id] Order not found for ID: ${orderId}`);
            return res.status(404).json({ message: 'Order not found.' });
        }

        const order = result.rows[0];
        // Get the customer ID stored WITH the order record
        // *** CRITICAL: Verify 'customer_id' is the EXACT column name in your "order" table ***
        const orderCustomerId = order.customer_id;

        // --- Detailed Log for Comparison ---
        console.log(`[Auth Check /orders/:id] Comparing Order's CustomerID (DB): "${orderCustomerId}" (Type: ${typeof orderCustomerId})`);
        console.log(`[Auth Check /orders/:id] with Token's CustomerID (JWT): "${tokenCustomerId}" (Type: ${typeof tokenCustomerId})`);
        console.log(`[Auth Check /orders/:id] User Role: "${userRole}"`);
        // --- End Log ---

        // --- Corrected Authorization Check ---
        // Check if the user is an admin OR if the customer IDs match (after trimming just in case)
        const isOwner = (typeof orderCustomerId === 'string' && typeof tokenCustomerId === 'string' && orderCustomerId.trim() === tokenCustomerId.trim());
        const isAdminUser = (userRole === 'admin');

        if (!isOwner && !isAdminUser) {
             // Deny access if they are NOT the owner AND they are NOT an admin
             console.log(`[GET /orders/:id] Forbidden Access: Not owner and not admin.`);
             return res.status(403).json({ message: 'Forbidden: You do not have permission to view this order.' });
        }
        // --- End Corrected Check ---

        // If we reach here, access is granted
        console.log(`[GET /orders/:id] Access granted for Order ${order.id} to Customer ${tokenCustomerId} (Role: ${userRole})`);
        // Remember this only returns order header data currently
        res.status(200).json(order);

    } catch (error) {
        console.error(`[GET /orders/:id] Error fetching order ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error fetching order.'});
    }
});

// --- Other methods ---
// POST create a new order
router.post('/', auth, async (req, res) => {
    console.log('[POST /api/orders] req.user received from auth middleware:', req.user);
    
    const customerId = req.user?.customerId;
    const userEmail = req.user?.email;
    const userIdForLogs = req.user?.userId;

    if (!customerId || !userEmail) {
        console.error(`[POST /api/orders] Missing customerId or email from req.user for userId ${userIdForLogs}. req.user:`, req.user);
        return res.status(401).json({ message: 'User customer ID or email could not be determined from token.' });
    }

    const { items } = req.body;
    
    // Basic validation
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order items array is required.' });
    }
    if (!items.every(item => item && Number.isInteger(item.productId) && item.productId > 0 && 
                          Number.isInteger(item.quantity) && item.quantity > 0)) {
        return res.status(400).json({ message: 'Invalid items array format. Each item must have productId and quantity as positive integers.' });
    }

    const client = await db.connect();
    console.log(`[POST /api/orders] Transaction started for Customer ID: ${customerId}`);

    try {
        await client.query('BEGIN');

        // Fetch products
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
                rawUnitPrice: JSON.stringify({ amount: details.price, currency: "usd" }),
                title: details.name,
                thumbnail: details.thumbnail
            });
        }
        calculatedTotal = parseFloat(calculatedTotal.toFixed(2));
        console.log(`[POST /api/orders] Calculated total: ${calculatedTotal}`);

        // Insert order
        const newOrderId = `order_${uuidv4()}`;
        const defaultRegionId = process.env.DEFAULT_REGION_ID || 'reg_default';
        const defaultCurrencyCode = process.env.DEFAULT_CURRENCY || 'usd';

        const orderInsertQuery = `
            INSERT INTO "order" (id, customer_id, region_id, email, currency_code, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id, created_at 
        `;
        
        const orderResult = await client.query(orderInsertQuery, [
            newOrderId,
            customerId,
            defaultRegionId,
            userEmail,
            defaultCurrencyCode,
            'pending'
        ]);

        if (!orderResult.rows || orderResult.rows.length === 0) {
            throw new Error('Failed to retrieve new Order ID after insert into "order" table.');
        }
        
        const orderCreatedAt = orderResult.rows[0].created_at;
        console.log(`[POST /api/orders] Inserted into "order" table. New Order ID: ${newOrderId}`);

        // First create line items
        for (const lineItem of lineItemsData) {
            console.log('[LOOP START] Processing lineItem:', JSON.stringify(lineItem));
            
            // Create line item first
            const newLineItemId = `li_${uuidv4()}`;
            
            // Simplified line item query - checking schema
            console.log('[LOOP] Getting line_item columns');
            const lineItemColumnsQuery = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'order_line_item'
            `);
            const lineItemColumns = lineItemColumnsQuery.rows.map(row => row.column_name);
            console.log('[LOOP] line_item columns:', lineItemColumns);
            
            const lineItemInsertQuery = `
                INSERT INTO order_line_item (
                    id, title, thumbnail, unit_price, raw_unit_price, 
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $6)
                RETURNING id
            `;
            
            console.log('[LOOP] Attempting line_item INSERT...');
            await client.query(lineItemInsertQuery, [
                newLineItemId,
                lineItem.title,
                lineItem.thumbnail,
                lineItem.unitPrice,
                lineItem.rawUnitPrice,
                orderCreatedAt
            ]);
            console.log('[LOOP] line_item INSERT done.');
            
            // Create order item with exact schema from your table
            const newOrderItemId = `item_${uuidv4()}`;
            const emptyJsonb = JSON.stringify({});
            
            // Create the order item query using the exact schema columns
            const orderItemInsertQuery = `
                INSERT INTO order_item (
                    id, 
                    order_id, 
                    version, 
                    item_id, 
                    quantity, 
                    raw_quantity, 
                    fulfilled_quantity, 
                    raw_fulfilled_quantity, 
                    shipped_quantity, 
                    raw_shipped_quantity, 
                    return_requested_quantity, 
                    raw_return_requested_quantity, 
                    return_received_quantity, 
                    raw_return_received_quantity, 
                    return_dismissed_quantity, 
                    raw_return_dismissed_quantity, 
                    written_off_quantity, 
                    raw_written_off_quantity, 
                    metadata, 
                    created_at, 
                    updated_at, 
                    deleted_at, 
                    delivered_quantity, 
                    raw_delivered_quantity, 
                    unit_price, 
                    raw_unit_price, 
                    compare_at_unit_price, 
                    raw_compare_at_unit_price
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, 
                    $20, $20, $21, $22, $23, $24, $25, $26, $27
                )
            `;
            
            console.log('[LOOP] Attempting order_item INSERT...');
            
            await client.query(orderItemInsertQuery, [
                newOrderItemId,                      // id
                newOrderId,                          // order_id
                1,                                   // version
                newLineItemId,                       // item_id
                lineItem.quantity,                   // quantity
                JSON.stringify({ quantity: lineItem.quantity }), // raw_quantity
                0,                                   // fulfilled_quantity
                emptyJsonb,                          // raw_fulfilled_quantity
                0,                                   // shipped_quantity
                emptyJsonb,                          // raw_shipped_quantity
                0,                                   // return_requested_quantity
                emptyJsonb,                          // raw_return_requested_quantity
                0,                                   // return_received_quantity
                emptyJsonb,                          // raw_return_received_quantity
                0,                                   // return_dismissed_quantity
                emptyJsonb,                          // raw_return_dismissed_quantity
                0,                                   // written_off_quantity
                emptyJsonb,                          // raw_written_off_quantity
                null,                                // metadata (nullable)
                orderCreatedAt,                      // created_at
                // updated_at is $20 again (same as created_at)
                null,                                // deleted_at (nullable)
                0,                                   // delivered_quantity
                emptyJsonb,                          // raw_delivered_quantity
                lineItem.unitPrice,                  // unit_price
                lineItem.rawUnitPrice,               // raw_unit_price
                null,                                // compare_at_unit_price (nullable)
                null                                 // raw_compare_at_unit_price (nullable)
            ]);
            
            console.log('[LOOP] order_item INSERT done.');
            console.log('[LOOP END] Finished processing lineItem for product ID:', lineItem.productId);
        }
        
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

// Add this route handler inside /var/projects/backend-api/routes/orders.js

// Add this inside /var/projects/backend-api/routes/orders.js

// GET /:orderId/products/:productId/download-link - Generate temporary download link
router.get('/:orderId/products/:productId(\\d+)/download-link', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { orderId, productId: productIdParam } = req.params; // orderId is TEXT, productIdParam is String
    const customerId = req.user?.customerId; // TEXT customer ID from JWT
    const userIdForLogs = req.user?.userId; // For logging

    logger.info({ orderId, productId: productIdParam, customerId, userId: userIdForLogs }, `[${requestStartTime}] [GET /download-link] Request received.`);

    // Validate inputs
    const productId = parseInt(productIdParam, 10); // Convert product ID to integer for product table query
    if (!customerId) {
        logger.warn(`[${requestStartTime}] Missing customerId in JWT for user ${userIdForLogs}.`);
        return res.status(401).json({ message: 'Customer identifier missing.' });
    }
    if (!orderId || !productId || isNaN(productId) || productId <= 0) {
        logger.warn(`[${requestStartTime}] Invalid parameters received. OrderID: ${orderId}, ProductID: ${productIdParam}`);
        return res.status(400).json({ message: 'Invalid order or product ID specified.' });
    }
    if (!BUCKET_NAME) {
         logger.error(`[${requestStartTime}] S3_BUCKET_NAME env var not set.`);
         return res.status(500).json({ message: 'Server configuration error: Storage details missing.' });
    }

    try {
        // 1. Verify Purchase Ownership and Status
        logger.debug(`Verifying purchase: Customer ${customerId}, Order ${orderId}, Product ${productId}`);
        const verificationQuery = `
            SELECT 1
            FROM "order" o
            JOIN order_item oi ON oi.order_id = o.id -- Join on text IDs
            JOIN order_line_item oli ON oli.id = oi.item_id
            WHERE
              o.id = $1            -- orderId (param is TEXT, matches column)
              AND o.customer_id = $2 -- customerId (param is TEXT from JWT, matches column)
              AND o.status = 'paid'  -- Check status
              AND oli.product_id = $3::text -- productId (param is INT, cast to TEXT for comparison with oli.product_id)
            LIMIT 1;
        `;
        const verificationResult = await db.query(verificationQuery, [orderId, customerId, productId]);

        if (verificationResult.rows.length === 0) {
            logger.warn(`[${requestStartTime}] Verification failed for Customer ${customerId}, Order ${orderId}, Product ${productId}. Purchase not found, not paid, or product not in order.`);
            // Use 403 Forbidden as the user is authenticated but doesn't have rights to this specific download
            return res.status(403).json({ message: 'Access denied. Valid purchase for this item not found.' });
        }
        logger.info(`[${requestStartTime}] Purchase verified successfully.`);

        // 2. Get Product S3 Key from 'products' table
        logger.debug(`Workspaceing S3 key for product ID ${productId}`);
        // Use integer productId here to query the products table
        const productQuery = 'SELECT s3_file_key, is_digital FROM products WHERE id = $1';
        const productResult = await db.query(productQuery, [productId]);

        if (productResult.rows.length === 0 || !productResult.rows[0].is_digital || !productResult.rows[0].s3_file_key) {
            logger.warn(`[${requestStartTime}] Product ${productId} not found, not digital, or missing S3 key.`);
            return res.status(404).json({ message: 'Product not found or is not available for download.' });
        }
        const s3FileKey = productResult.rows[0].s3_file_key;
        logger.info(`[${requestStartTime}] Found S3 key: ${s3FileKey}`);

        // 3. Generate Pre-signed URL for GetObject
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3FileKey,
            // Optional: Force download with a specific filename for the user
            // ResponseContentDisposition: `attachment; filename="downloaded_filename.pdf"`
        });

        const expiresIn = 300; // URL valid for 300 seconds (5 minutes)
        logger.info(`[${requestStartTime}] Generating pre-signed URL for key ${s3FileKey} (expires in ${expiresIn}s)`);
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        logger.info(`[${requestStartTime}] Pre-signed URL generated successfully.`);

        // 4. Return the URL
        res.status(200).json({ downloadUrl: signedUrl });

    } catch (error) {
        logger.error({ err: error, orderId, productId, customerId }, `[${requestStartTime}] Error generating download link`);
        res.status(500).json({ message: 'Server error generating download link.' });
    }
});

module.exports = router;

