const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const { v4: uuidv4 } = require('uuid');

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
router.get('/my-orders', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!userId) { 
            return res.status(401).json({message: 'User ID not found in token.'});
        }

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

        if (!userId) { 
            return res.status(401).json({message: 'User ID not found in token.'});
        }

        const result = await db.query('SELECT * FROM "order" WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const order = result.rows[0];

        // Check if the logged-in user is the owner OR an admin
        if (order.user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view this order.' });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Server error fetching order.' });
    }
});

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

module.exports = router;
