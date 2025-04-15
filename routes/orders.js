const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const { v4: uuidv4 } = require('uuid');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getPresignedDownloadUrl } = require('../services/s3Service');
const logger = require('../lib/logger');

// S3 configuration
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const expiresIn = 300; // 5 minutes

// ========== ADMIN ROUTES ==========

// GET ALL orders (Admin Only)
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "order" ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server error fetching all orders.' });
    }
});

// GET recent orders (Admin Only)
router.get('/recent', auth, isAdmin, async (req, res) => {
    const limit = 5; // Number of recent orders to fetch
    try {
        logger.info(`>>> HIT /orders/recent Handler - User: ${req.user?.userId}, Role: ${req.user?.role}`);

        const queryText = `
            SELECT id, customer_id, status, currency_code, created_at, updated_at
            FROM "order"
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await db.query(queryText, [limit]);

        logger.info(`[GET /orders/recent] Found ${result.rows.length} recent orders.`);
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error(`Error fetching recent orders for admin ${req.user?.userId}:`, error);
        res.status(500).json({ message: 'Server error fetching recent orders.' });
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
        logger.error('Error deleting order:', error);
        res.status(500).json({ message: 'Server error deleting order.' });
    }
});

// ========== USER ROUTES ==========

// GET user's own orders
router.get('/my-orders', auth, async (req, res) => {
    try {
        const customerId = req.user?.customerId;
        logger.info(`[GET /my-orders] Attempting fetch for customerId: ${customerId}`);

        if (!customerId) {
            return res.status(401).json({message: 'Customer ID not found in token.'});
        }

        const queryText = `
            SELECT id, status, currency_code, created_at, updated_at
            FROM "order"
            WHERE customer_id = $1
            ORDER BY created_at DESC
        `;
        const result = await db.query(queryText, [customerId]);

        logger.info(`[GET /my-orders] Found ${result.rows.length} orders for customer ${customerId}`);
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error(`Error fetching orders for customer ${req.user?.customerId}:`, error);
        res.status(500).json({ message: 'Server error fetching user orders.' });
    }
});

// GET a single order by ID (Owner or Admin only)
router.get('/:id', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const orderId = req.params.id;
    const tokenCustomerId = req.user?.customerId;
    const userRole = req.user?.role;
    const userIdForLogs = req.user?.userId;

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
        logger.debug(`Fetching main order record for ID: ${orderId}`);
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

        // 2. Fetch Line Items with Product Details
        logger.debug(`Fetching line items for Order ID: ${orderId}`);
        const itemsQueryText = `
            SELECT
                oi.id as order_item_id,
                oi.quantity,
                oli.id as line_item_id,
                oli.title as line_item_title,
                oli.thumbnail as line_item_thumbnail,
                oli.unit_price as line_item_unit_price,
                oli.product_id,
                p.id as product_table_id,
                p.name as product_name,
                p.slug as product_slug,
                p.is_digital,
                p.s3_file_key
            FROM order_item oi
            JOIN order_line_item oli ON oli.id = oi.item_id
            LEFT JOIN products p ON oli.product_id::integer = p.id
            WHERE oi.order_id = $1
            ORDER BY oli.created_at ASC;
        `;
        const itemsResult = await db.query(itemsQueryText, [orderId]);

        // Map results to a clean structure
        const lineItems = itemsResult.rows.map(item => ({
            order_item_id: item.order_item_id,
            quantity: parseInt(item.quantity, 10),
            title: item.line_item_title || item.product_name || 'Item Not Found',
            thumbnail: item.line_item_thumbnail,
            unit_price: parseFloat(item.line_item_unit_price),
            product: item.product_table_id ? {
                id: item.product_table_id,
                slug: item.product_slug,
                is_digital: item.is_digital ?? false,
                s3_file_key: item.s3_file_key
            } : null
        }));
        
        logger.info(`[${requestStartTime}] [GET /orders/:id] Fetched ${lineItems.length} line items for Order ${order.id}.`);

        // 3. Return Combined Data
        const fullOrderDetails = {
            ...order,
            items: lineItems
        };

        res.status(200).json(fullOrderDetails);
    } catch (error) {
        logger.error({ err: error, orderId, customerId: tokenCustomerId }, `[${requestStartTime}] [GET /orders/:id] Error fetching order details`);
        res.status(500).json({ message: 'Server error fetching order details.' });
    }
});

// POST create a new order
router.post('/', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [POST /orders] Request received.`);

    const customerId = req.user?.customerId;
    const userEmail = req.user?.email;
    const userIdForLogs = req.user?.userId;

    if (!customerId || !userEmail) {
        logger.error({ userId: userIdForLogs, customerId, userEmail }, `[${requestStartTime}] [POST /orders] Missing customerId or email from req.user.`);
        return res.status(401).json({ message: 'User customer ID or email could not be determined from token.' });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        logger.warn(`[${requestStartTime}] [POST /orders] Received empty or invalid items array from user ${userIdForLogs}.`);
        return res.status(400).json({ message: 'Order items array is required and cannot be empty.' });
    }
    
    if (!items.every(item => item && typeof item.productId === 'number' && item.productId > 0 &&
                             typeof item.quantity === 'number' && item.quantity > 0)) {
        logger.warn({ items }, `[${requestStartTime}] [POST /orders] Received invalid items array format from user ${userIdForLogs}.`);
        return res.status(400).json({ message: 'Invalid items array format. Each item needs numeric productId and quantity > 0.' });
    }

    const client = await db.connect();
    logger.info({ customerId, userId: userIdForLogs }, `[${requestStartTime}] [POST /orders] Transaction started.`);

    try {
        await client.query('BEGIN');

        // 1. Fetch product details from DB for price/info validation
        const productIds = [...new Set(items.map(item => item.productId))];
        logger.debug({ productIds }, "Fetching details for product IDs");
        const productQueryText = `SELECT id, price, name, image FROM products WHERE id = ANY($1::int[])`;
        const productResult = await client.query(productQueryText, [productIds]);

        // Create a map for easy lookup
        const productDetailsMap = new Map();
        productResult.rows.forEach(p => {
            productDetailsMap.set(p.id, {
                price: parseFloat(p.price),
                name: p.name,
                thumbnail: p.image
            });
        });
        
        logger.debug({ count: productDetailsMap.size }, "Product details fetched from DB.");

        // Validate all products were found
        if (productResult.rows.length !== productIds.length) {
            const foundIds = new Set(productResult.rows.map(p => p.id));
            const missingIds = productIds.filter(id => !foundIds.has(id));
            logger.error({ missingProductIds: missingIds }, "One or more products requested in the order were not found in the database.");
            throw new Error(`Invalid order: Product(s) with ID(s) ${missingIds.join(', ')} not found.`);
        }

        // 2. Prepare line items data and calculate total
        let calculatedTotal = 0;
        const lineItemsToInsert = [];

        for (const item of items) {
            const details = productDetailsMap.get(item.productId);
            calculatedTotal += details.price * item.quantity;
            lineItemsToInsert.push({
                productId: item.productId,
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
        const newOrderId = `order_${uuidv4()}`;
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
        const emptyJsonb = JSON.stringify({});
        for (const lineItemData of lineItemsToInsert) {
            logger.debug({ product: lineItemData.productId }, '[LOOP START] Processing lineItem');

            // 4a. Insert into order_line_item
            const newLineItemId = `li_${uuidv4()}`;
            const lineItemInsertQuery = `
                INSERT INTO order_line_item (
                    id, title, thumbnail, unit_price, raw_unit_price,
                    created_at, updated_at, product_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`;
                
            const lineItemParams = [
                newLineItemId,
                lineItemData.title,
                lineItemData.thumbnail,
                lineItemData.unitPrice,
                lineItemData.rawUnitPrice,
                orderCreatedAt,
                orderCreatedAt,
                String(lineItemData.productId)
            ];
            
            logger.debug(`[LOOP] Parameters count for order_line_item insert: ${lineItemParams.length}`);
            await client.query(lineItemInsertQuery, lineItemParams);
            logger.info({ lineItemId: newLineItemId, productId: lineItemData.productId }, '[LOOP] order_line_item INSERT successful.');

            // 4b. Insert into order_item
            const newOrderItemId = `item_${uuidv4()}`;
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
                    $20, $21, $22, $23, $24, $25, $26, $27, $28
                )`;

            const orderItemParams = [
                newOrderItemId, newOrderId, 1, newLineItemId,
                lineItemData.quantity, JSON.stringify({ quantity: lineItemData.quantity }),
                0, emptyJsonb, 0, emptyJsonb,
                0, emptyJsonb, 0, emptyJsonb,
                0, emptyJsonb, 0, emptyJsonb,
                null, orderCreatedAt, orderCreatedAt, null,
                0, emptyJsonb,
                lineItemData.unitPrice, lineItemData.rawUnitPrice,
                null, null
            ];
            
            logger.debug(`[LOOP] Parameters count for order_item insert: ${orderItemParams.length}`);
            await client.query(orderItemInsertQuery, orderItemParams);
            logger.info({ orderItemId: newOrderItemId, lineItemId: newLineItemId }, '[LOOP] order_item INSERT successful.');
            logger.debug({ product: lineItemData.productId }, '[LOOP END] Finished processing lineItem');
        }

        logger.info({ orderId: newOrderId, itemsInserted: lineItemsToInsert.length }, `[${requestStartTime}] Inserted all items.`);

        // 5. Commit Transaction
        await client.query('COMMIT');
        logger.info({ orderId: newOrderId }, `[${requestStartTime}] Transaction committed.`);

        // 6. Send Success Response
        res.status(201).json({
            message: 'Order created successfully (pending payment).',
            order: {
                id: newOrderId,
                total: calculatedTotal,
                status: 'pending',
                created_at: orderCreatedAt?.toISOString() || null
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error({ err: error, customerId, userId: userIdForLogs }, `[${requestStartTime}] [POST /orders] Transaction rolled back`);
        res.status(500).json({ message: 'Server error creating order.', error: error.message || 'Unknown server error' });
    } finally {
        client.release();
        logger.info({ customerId, userId: userIdForLogs }, `[${requestStartTime}] [POST /orders] Database client released.`);
    }
});

// PUT update order status
router.put('/:id', auth, async (req, res) => {
    const orderId = req.params.id;
    const { status, paymentIntentId } = req.body;
    const userId = req.user?.userId;

    logger.info(`[PUT /orders/${orderId}] User ${userId} updating order to "${status}"`);

    if (!orderId || !status) {
        return res.status(400).json({ success: false, message: 'Order ID and status are required.' });
    }

    try {
        const orderResult = await db.query('SELECT * FROM "order" WHERE id = $1', [orderId]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const paidAtSQL = status === 'paid' ? 'NOW()' : 'NULL';
        const updateQuery = `
            UPDATE "order"
            SET 
                status = $1,
                payment_intent_id = $2,
                paid_at = ${paidAtSQL},
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, status, paid_at
        `;
        const result = await db.query(updateQuery, [status, paymentIntentId || null, orderId]);

        res.status(200).json({
            success: true,
            order: {
                id: result.rows[0].id,
                status: result.rows[0].status,
                paidAt: result.rows[0].paid_at
            }
        });
    } catch (err) {
        logger.error(`[PUT /orders/${orderId}] Error:`, err);
        res.status(500).json({
            success: false,
            message: 'Server error updating order',
            error: err.message
        });
    }
});

// POST update order status (alternative endpoint for client during checkout)
router.post('/update-status', auth, async (req, res) => {
    const { orderId, status, paymentIntentId } = req.body;
    const userIdForLogs = req.user?.userId;

    logger.info(`[POST /orders/update-status] Attempting to update order ${orderId} to status "${status}" with paymentIntentId "${paymentIntentId}"`);

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
    }

    try {
        const orderQuery = 'SELECT * FROM "order" WHERE id = $1';
        const orderResult = await db.query(orderQuery, [orderId]);

        if (orderResult.rows.length === 0) {
            logger.error(`[POST /orders/update-status] Order not found: ${orderId}`);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        if (status === 'paid' && !paymentIntentId) {
            logger.error(`[POST /orders/update-status] Payment Intent ID missing for paid status update`);
            return res.status(400).json({ success: false, message: 'Payment Intent ID is required for paid status' });
        }

        const paidAt = status === 'paid' ? 'NOW()' : null;
        const updateQuery = `
            UPDATE "order"
            SET 
                status = $1,
                payment_intent_id = $2,
                paid_at = ${paidAt},
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, status, paid_at
        `;

        const updateParams = [status, paymentIntentId, orderId];
        const updateResult = await db.query(updateQuery, updateParams);

        if (updateResult.rows.length === 0) {
            logger.error(`[POST /orders/update-status] Failed to update order ${orderId}`);
            return res.status(500).json({ success: false, message: 'Failed to update order status' });
        }

        const updatedOrder = updateResult.rows[0];
        logger.info(`[POST /orders/update-status] Successfully updated order ${orderId} to status "${status}"`);

        res.status(200).json({
            success: true,
            order: {
                id: updatedOrder.id,
                status: updatedOrder.status,
                paidAt: updatedOrder.paid_at
            }
        });
    } catch (error) {
        logger.error(`[POST /orders/update-status] Error updating order status:`, error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating order status',
            error: error.message
        });
    }
});

// GET digital product download link
router.get('/:orderId/products/:productId(\\d+)/download-link', auth, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { orderId, productId: productIdParam } = req.params;
    const customerId = req.user?.customerId;
    const userIdForLogs = req.user?.userId;

    logger.info({ orderId, productId: productIdParam, customerId, userId: userIdForLogs }, `[${requestStartTime}] [GET /download-link] Request received.`);

    // Validate inputs
    const productId = parseInt(productIdParam, 10);
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
        // Verify Purchase, Ownership, Status, Digital Product, and Get S3 Key in ONE query
        logger.debug(`Verifying purchase & fetching S3 key: Customer ${customerId}, Order ${orderId}, Product ${productId}`);
        const verificationQuery = `
            SELECT p.s3_file_key
            FROM "order" o
            JOIN order_item oi ON oi.order_id = o.id
            JOIN order_line_item oli ON oli.id = oi.item_id
            JOIN products p ON oli.product_id::integer = p.id
            WHERE
                o.id = $1
                AND o.customer_id = $2
                AND o.status = 'paid'
                AND p.id = $3
                AND p.is_digital = true
                AND p.s3_file_key IS NOT NULL AND p.s3_file_key != ''
            LIMIT 1;
        `;
        
        const verificationResult = await db.query(verificationQuery, [orderId, customerId, productId]);

        if (verificationResult.rows.length === 0) {
            logger.warn(`[${requestStartTime}] Verification failed for Customer ${customerId}, Order ${orderId}, Product ${productId}.`);
            return res.status(403).json({ message: 'Access denied. Valid, downloadable purchase for this item not found.' });
        }

        const s3FileKey = verificationResult.rows[0].s3_file_key;
        logger.info(`[${requestStartTime}] Purchase verified successfully. Found S3 key: ${s3FileKey}`);

        // Generate Pre-signed URL
        const signedUrl = await getPresignedDownloadUrl(s3FileKey, 300);
        logger.info(`[${requestStartTime}] Pre-signed URL generated successfully.`);

        // Return the URL
        res.status(200).json({ downloadUrl: signedUrl });
    } catch (error) {
        logger.error({ err: error, orderId, productId, customerId }, `[${requestStartTime}] Error generating download link`);
        res.status(500).json({ message: 'Server error generating download link.' });
    }
});

module.exports = router;
