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
const logger = require('../lib/logger');

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
// Replace the existing router.get('/:id', ...) handler in routes/orders.js

// GET /:id - Get full details for a single order (Owner or Admin only)

// Replace the existing router.get('/:id', ...) handler in routes/orders.js

// GET /:id - Get full details for a single order (Owner or Admin only)
router.get('/:id', auth, async (req, res) => { // ID might contain 'order_' prefix
    const requestStartTime = new Date().toISOString();
    const orderId = req.params.id; // TEXT order ID from the URL (e.g., 'order_...')
    const tokenCustomerId = req.user?.customerId; // TEXT customer ID from JWT payload
    const userRole = req.user?.role; // Role from JWT payload
    const userIdForLogs = req.user?.userId; // User ID for logging

    // Use logger (ensure it's required/imported at the top of the file)
    const logger = require('../lib/logger');
    logger.info({ orderId, customerId: tokenCustomerId, userId: userIdForLogs, role: userRole }, `[${requestStartTime}] [GET /orders/:id] Request received.`);

    if (!tokenCustomerId) {
        logger.warn(`[${requestStartTime}] [GET /orders/:id] User ${userIdForLogs} missing customerId in token!`);
        return res.status(401).json({ message: 'Customer identifier missing.' });
    }
     if (!orderId) {
         logger.warn(`[${requestStartTime}] [GET /orders/:id] Missing order ID in request path.`);
         return res.status(400).json({ message: 'Invalid order ID.' });
     }

    try {
        // 1. Fetch the main order record & Verify Ownership/Admin
        logger.debug(`Workspaceing main order record for ID: ${orderId}`);
        // Select desired fields from "order" table
        const orderQueryText = `SELECT id, customer_id, status, email, currency_code, created_at, updated_at, paid_at FROM "order" WHERE id = $1`;
        const orderResult = await db.query(orderQueryText, [orderId]);

        if (orderResult.rows.length === 0) {
            logger.warn(`[${requestStartTime}] [GET /orders/:id] Order not found in DB for ID: ${orderId}`);
            return res.status(404).json({ message: 'Order not found.' });
        }

        const order = orderResult.rows[0];
        const orderCustomerId = order.customer_id;

        logger.debug(`[Auth Check /orders/:id] Comparing Order's CustomerID: "${orderCustomerId}" with Token's CustomerID: "${tokenCustomerId}". Role: "${userRole}"`);
        const isOwner = (orderCustomerId && tokenCustomerId && orderCustomerId === tokenCustomerId);
        const isAdminUser = (userRole === 'admin');

        if (!isOwner && !isAdminUser) {
            logger.warn({ orderId, reqUser: userIdForLogs, reqCust: tokenCustomerId, orderCust: orderCustomerId }, `[${requestStartTime}] [GET /orders/:id] Forbidden Access.`);
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view this order.' });
        }
        logger.info(`[${requestStartTime}] [GET /orders/:id] Access granted for Order ${order.id}.`);

        // 2. Fetch Line Items JOINING Product Details (If Authorized)
        logger.debug(`Workspaceing line items for Order ID: ${orderId}`);
        const itemsQueryText = `
            SELECT
                oi.id as order_item_id,
                oi.quantity,
                oli.id as line_item_id,
                oli.title as line_item_title, -- Title stored at time of order
                oli.thumbnail as line_item_thumbnail,
                oli.unit_price as line_item_unit_price,
                oli.product_id, -- Text product ID from line item
                p.id as product_table_id, -- Integer product ID from products table
                p.name as product_name,   -- Current product name
                p.slug as product_slug,
                p.is_digital,             -- <<< Needed for download button
                p.s3_file_key             -- <<< Needed for download button
            FROM order_item oi
            JOIN order_line_item oli ON oli.id = oi.item_id
            LEFT JOIN products p ON oli.product_id::integer = p.id -- CAST text product_id to INT for join
            WHERE oi.order_id = $1                                -- Filter by the correct order ID
            ORDER BY oli.created_at ASC;                          -- Example ordering
        `;
        const itemsResult = await db.query(itemsQueryText, [orderId]);

        // Map results to a clean structure
        const lineItems = itemsResult.rows.map(item => ({
            order_item_id: item.order_item_id,
            quantity: parseInt(item.quantity, 10),
            title: item.line_item_title || item.product_name || 'Item Not Found',
            thumbnail: item.line_item_thumbnail,
            unit_price: parseFloat(item.unit_price),
            product: item.product_table_id ? { // Check if join succeeded
                id: item.product_table_id,
                slug: item.product_slug,
                is_digital: item.is_digital ?? false,
                s3_file_key: item.s3_file_key
            } : null // Set product to null if product deleted
        }));
        logger.info(`[${requestStartTime}] [GET /orders/:id] Fetched ${lineItems.length} line items for Order ${order.id}.`);

        // 3. Combine order header and line items
        const fullOrderDetails = {
            ...order, // Spread the main order columns
            items: lineItems // Add the processed line items array
        };

        // 4. Return Combined Data
        res.status(200).json(fullOrderDetails);

    } catch (error) {
        logger.error({ err: error, orderId, customerId: tokenCustomerId }, `[${requestStartTime}] [GET /orders/:id] Error fetching order details`);
        res.status(500).json({ message: 'Server error fetching order details.' });
    }
});

// --- Keep other routes (GET /, GET /my-orders, GET /recent, POST /, DELETE /:id, and download link) ---
// --- Keep module.exports = router; at the end ---
// --- Other methods ---
// POST create a new order
// Replace the existing router.post('/', ...) handler in routes/orders.js with this:

// Replace the existing router.post('/', ...) handler in routes/orders.js with this complete version:

router.post('/', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    // Assume logger, db, uuidv4 are required correctly at the top of the file
    // const logger = require('../lib/logger');
    // const { v4: uuidv4 } = require('uuid'); // If using dynamic import, handle differently
    // const db = require('../config/db');

    logger.info(`[${requestStartTime}] [POST /orders] Request received.`);

    const customerId = req.user?.customerId; // TEXT Customer ID from JWT
    const userEmail = req.user?.email; // Email from JWT (used in 'order' table)
    const userIdForLogs = req.user?.userId; // User ID for logging context

    // Validate essential info from token
    if (!customerId || !userEmail) {
        logger.error({ userId: userIdForLogs, customerId, userEmail }, `[${requestStartTime}] [POST /orders] Missing customerId or email from req.user.`);
        return res.status(401).json({ message: 'User customer ID or email could not be determined from token.' });
    }

    const { items } = req.body;

    // Validate incoming items array
    if (!Array.isArray(items) || items.length === 0) {
         logger.warn(`[${requestStartTime}] [POST /orders] Received empty or invalid items array from user ${userIdForLogs}.`);
         return res.status(400).json({ message: 'Order items array is required and cannot be empty.' });
    }
    // Validate structure of each item more carefully
    if (!items.every(item => item && typeof item.productId === 'number' && item.productId > 0 &&
                               typeof item.quantity === 'number' && item.quantity > 0)) {
         logger.warn({ items }, `[${requestStartTime}] [POST /orders] Received invalid items array format from user ${userIdForLogs}.`);
         return res.status(400).json({ message: 'Invalid items array format. Each item needs numeric productId and quantity > 0.' });
    }

    // Use a single client for the transaction
    const client = await db.connect();
    logger.info({ customerId, userId: userIdForLogs }, `[${requestStartTime}] [POST /orders] Transaction started.`);

    try {
        await client.query('BEGIN');

        // 1. Fetch product details from DB for price/info validation
        const productIds = [...new Set(items.map(item => item.productId))]; // Get unique integer IDs
        logger.debug({ productIds }, "Fetching details for product IDs");
        const productQueryText = `SELECT id, price, name, image FROM products WHERE id = ANY($1::int[])`; // Query by integer array
        const productResult = await client.query(productQueryText, [productIds]);

        // Create a map for easy lookup
        const productDetailsMap = new Map();
        productResult.rows.forEach(p => {
            productDetailsMap.set(p.id, {
                price: parseFloat(p.price), // Ensure price is number
                name: p.name,
                thumbnail: p.image
            });
        });
         logger.debug({ count: productDetailsMap.size }, "Product details fetched from DB.");

         // *** Add Validation: Check if all requested product IDs were found ***
         if (productResult.rows.length !== productIds.length) {
             const foundIds = new Set(productResult.rows.map(p => p.id));
             const missingIds = productIds.filter(id => !foundIds.has(id));
             logger.error({ missingProductIds: missingIds }, "One or more products requested in the order were not found in the database.");
             throw new Error(`Invalid order: Product(s) with ID(s) ${missingIds.join(', ')} not found.`);
         }
         // *** End Validation ***

        // 2. Prepare line items data and calculate total
        let calculatedTotal = 0;
        const lineItemsToInsert = []; // Store data needed for subsequent inserts

        for (const item of items) {
            const details = productDetailsMap.get(item.productId);
            // We already confirmed details exist and price is valid above
            calculatedTotal += details.price * item.quantity;
            lineItemsToInsert.push({
                productId: item.productId, // Integer Product ID
                quantity: item.quantity,
                unitPrice: details.price,
                rawUnitPrice: JSON.stringify({ amount: Math.round(details.price * 100), currency_code: process.env.DEFAULT_CURRENCY || 'usd' }),
                title: details.name,
                thumbnail: details.thumbnail
            });
        }
        calculatedTotal = parseFloat(calculatedTotal.toFixed(2));
        logger.info({ total: calculatedTotal, itemCount: lineItemsToInsert.length }, `[${requestStartTime}] Calculated total and prepared line item data.`);

        // 3. Insert into "order" table
        const newOrderId = `order_${uuidv4()}`; // Generate unique TEXT ID using uuid
        const defaultRegionId = process.env.DEFAULT_REGION_ID || 'reg_default';
        const defaultCurrencyCode = process.env.DEFAULT_CURRENCY || 'usd';

        const orderInsertQuery = `
            INSERT INTO "order" (id, customer_id, region_id, email, currency_code, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id, created_at`;
        const orderResult = await client.query(orderInsertQuery, [
            newOrderId, customerId, defaultRegionId, userEmail, defaultCurrencyCode, 'pending'
        ]);

        if (!orderResult.rows?.[0]?.id) {
            throw new Error('Failed to retrieve new Order ID after insert.');
        }
        const orderCreatedAt = orderResult.rows[0].created_at;
        logger.info({ orderId: newOrderId }, `[${requestStartTime}] Inserted into "order" table successfully.`);


        // 4. Insert Line Items and Order Items
        const emptyJsonb = JSON.stringify({}); // Define once before loop
        for (const lineItemData of lineItemsToInsert) {
             logger.debug({ product: lineItemData.productId }, '[LOOP START] Processing lineItem');

             // 4a. Insert into order_line_item (linking to product_id)
             const newLineItemId = `li_${uuidv4()}`;
             const lineItemInsertQuery = `
                 INSERT INTO order_line_item (
                     id, title, thumbnail, unit_price, raw_unit_price,
                     created_at, updated_at, product_id  -- Includes product_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $6, $7) -- 7 values for 8 columns
                 RETURNING id`;
             await client.query(lineItemInsertQuery, [
                 newLineItemId,
                 lineItemData.title,
                 lineItemData.thumbnail,
                 lineItemData.unitPrice,
                 lineItemData.rawUnitPrice,
                 orderCreatedAt,
                 String(lineItemData.productId) // Cast INT productId to TEXT
             ]);
             logger.info({ lineItemId: newLineItemId, productId: lineItemData.productId }, '[LOOP] order_line_item INSERT successful.');


             // 4b. Insert into order_item (linking order and line item)
             const newOrderItemId = `item_${uuidv4()}`;
             // --- CORRECTED QUERY: VALUES clause now has $1 through $28 ---
             const orderItemInsertQuery = `
                 INSERT INTO order_item (
                     id, order_id, version, item_id, quantity, raw_quantity,
                     fulfilled_quantity, raw_fulfilled_quantity, shipped_quantity, raw_shipped_quantity,
                     return_requested_quantity, raw_return_requested_quantity, return_received_quantity, raw_return_received_quantity,
                     return_dismissed_quantity, raw_return_dismissed_quantity, written_off_quantity, raw_written_off_quantity,
                     metadata, created_at, updated_at, deleted_at, delivered_quantity, raw_delivered_quantity,
                     unit_price, raw_unit_price, compare_at_unit_price, raw_compare_at_unit_price
                 ) VALUES (
                     $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
                     $20, $21, $22, $23, $24, $25, $26, $27, $28 -- Now 28 placeholders
                 )`;

             const orderItemParams = [ // 28 values in this array
                  newOrderItemId, newOrderId, 1, newLineItemId,
                  lineItemData.quantity, JSON.stringify({ quantity: lineItemData.quantity }),
                  0, emptyJsonb, 0, emptyJsonb, // fulfilled, shipped
                  0, emptyJsonb, 0, emptyJsonb, // return requested, received
                  0, emptyJsonb, 0, emptyJsonb, // return dismissed, written off
                  null, orderCreatedAt, orderCreatedAt, null, // metadata, timestamps, deleted_at
                  0, emptyJsonb, // delivered
                  lineItemData.unitPrice, lineItemData.rawUnitPrice, // prices
                  null, null // compare_at prices
             ];
             logger.debug(`[LOOP] Parameters count for order_item insert: ${orderItemParams.length}`); // Should log 28
             await client.query(orderItemInsertQuery, orderItemParams); // Execute query
             logger.info({ orderItemId: newOrderItemId, lineItemId: newLineItemId }, '[LOOP] order_item INSERT successful.');
             logger.debug({ product: lineItemData.productId }, '[LOOP END] Finished processing lineItem');
        } // End loop

        logger.info({ orderId: newOrderId, itemsInserted: lineItemsToInsert.length }, `[${requestStartTime}] Inserted all items.`);

        // 5. Commit Transaction
        await client.query('COMMIT');
        logger.info({ orderId: newOrderId }, `[${requestStartTime}] Transaction committed.`);

        // 6. Send Success Response
        res.status(201).json({
            message: 'Order created successfully (pending payment).',
            order: { // Return minimal info confirming creation
                id: newOrderId,
                total: calculatedTotal,
                status: 'pending',
                created_at: orderCreatedAt?.toISOString() || null // Use ISO string format
            }
        });

    } catch (error) {
        // Ensure rollback happens on any error during the try block
        await client.query('ROLLBACK');
        logger.error({ err: error, customerId, userId: userIdForLogs }, `[${requestStartTime}] [POST /orders] Transaction rolled back`);
        // Send back the specific error message if available
        res.status(500).json({ message: 'Server error creating order.', error: error.message || 'Unknown server error' });
    } finally {
        // ALWAYS release the client
        client.release();
        logger.info({ customerId, userId: userIdForLogs }, `[${requestStartTime}] [POST /orders] Database client released.`);
    }
}); // End POST /orders

// PUT update an existing order (Admin Only)
// Replace the existing router.put('/:id', ...) handler in routes/orders.js

// PUT update an existing order status (e.g., after payment confirmation) - Owner only
// NOTE: Removed isAdmin, now only requires user to be logged in (auth)

// Replace the existing GET /:orderId/products/:productId/download-link handler in routes/orders.js

router.get('/:orderId/products/:productId(\\d+)/download-link', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { orderId, productId: productIdParam } = req.params; // orderId is TEXT, productIdParam is String
    const customerId = req.user?.customerId; // TEXT customer ID from JWT
    const userIdForLogs = req.user?.userId; // For logging

    logger.info({ orderId, productId: productIdParam, customerId, userId: userIdForLogs }, `[${requestStartTime}] [GET /download-link] Request received.`);

    // Validate inputs
    const productId = parseInt(productIdParam, 10); // Convert product ID to integer
    if (!customerId || !orderId || !productId || isNaN(productId) || productId <= 0) {
        logger.warn(`[${requestStartTime}] Invalid parameters received. OrderID: ${orderId}, ProductID: ${productIdParam}, CustomerID: ${customerId}`);
        return res.status(400).json({ message: 'Invalid order or product ID specified.' });
    }
    if (!BUCKET_NAME) { // Ensure BUCKET_NAME is available (defined near top of file)
         logger.error(`[${requestStartTime}] S3_BUCKET_NAME env var not set.`);
         return res.status(500).json({ message: 'Server configuration error: Storage details missing.' });
    }

    try {
        // 1. Verify Purchase, Ownership, Status, Digital Product, and Get S3 Key in ONE query
        logger.debug(`Verifying purchase & fetching S3 key: Customer ${customerId}, Order ${orderId}, Product ${productId}`);
        const verificationQuery = `
            SELECT p.s3_file_key
            FROM "order" o
            JOIN order_item oi ON oi.order_id = o.id             -- Text = Text
            JOIN order_line_item oli ON oli.id = oi.item_id        -- Text = Text
            JOIN products p ON oli.product_id::integer = p.id -- Text (cast) = Integer
            WHERE
              o.id = $1            -- orderId (TEXT)
              AND o.customer_id = $2 -- customerId (TEXT from JWT)
              AND o.status = 'paid'  -- Check status
              AND p.id = $3            -- productId (INT matches products.id INT)
              AND p.is_digital = true  -- Ensure product is digital
              AND p.s3_file_key IS NOT NULL AND p.s3_file_key != '' -- Ensure key exists
            LIMIT 1;
        `;
        const verificationResult = await db.query(verificationQuery, [orderId, customerId, productId]);

        if (verificationResult.rows.length === 0) {
            // Could fail due to ownership, status, product not in order, product not digital, or missing key
            logger.warn(`[${requestStartTime}] Verification failed for Customer ${customerId}, Order ${orderId}, Product ${productId}. Check ownership, order status='paid', product inclusion, is_digital=true, and s3_file_key presence.`);
            return res.status(403).json({ message: 'Access denied. Valid, downloadable purchase for this item not found.' });
        }

        const s3FileKey = verificationResult.rows[0].s3_file_key;
        logger.info(`[${requestStartTime}] Purchase verified successfully. Found S3 key: ${s3FileKey}`);

        // 2. Generate Pre-signed URL
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3FileKey });
        const expiresIn = 300; // 5 minutes
        logger.info(`[${requestStartTime}] Generating pre-signed URL for key ${s3FileKey} (expires in ${expiresIn}s)`);
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        logger.info(`[${requestStartTime}] Pre-signed URL generated successfully.`);

        // 3. Return the URL
        res.status(200).json({ downloadUrl: signedUrl });

    } catch (error) {
        logger.error({ err: error, orderId, productId, customerId }, `[${requestStartTime}] Error generating download link`);
        res.status(500).json({ message: 'Server error generating download link.' });
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
