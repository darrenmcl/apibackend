// /var/projects/backend-api/routes/products.js
// --- REVISED WITH SLUG SUPPORT ---

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const slugify = require('slugify'); // <<< Add slugify library

// --- Helper Function to Generate Unique Slugs ---
// Checks DB to ensure slug is unique, appending '-n' if necessary
async function generateUniqueSlug(name, currentId = null) {
    let baseSlug = slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    let slug = baseSlug;
    let counter = 2;
    let slugExists = true;

    while (slugExists) {
        // Check if slug exists for a *different* product ID
        const query = `SELECT id FROM products WHERE slug = $1 ${currentId ? 'AND id != $2' : ''} LIMIT 1`;
        const params = currentId ? [slug, currentId] : [slug];
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            slugExists = false; // Slug is unique
        } else {
            // Slug exists, append counter and try again
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }
    return slug;
}

// Add this back into /var/projects/backend-api/routes/products.js
// Make sure it's placed correctly relative to other routes (e.g., before /:id if needed, although the regex on /:id helps)

// *** CORRECTED: GET a single product by SLUG (public) ***
router.get('/slug/:slug', async (req, res) => {
    // Use a distinct variable name to avoid shadowing
    const requestedSlug = req.params.slug;
    const requestStartTime = new Date().toISOString(); // For consistent logging timestamp per request

    console.log(`[${requestStartTime}] [GET /products/slug/:slug] Request received for slug: ${requestedSlug}`);

    // Validate slug parameter
    if (!requestedSlug || typeof requestedSlug !== 'string' || requestedSlug.trim() === '') {
        console.log(`[${requestStartTime}] [GET /products/slug/:slug] Invalid slug parameter received.`);
        return res.status(400).json({ message: 'Invalid slug parameter.' });
    }

    try {
        console.log(`[${requestStartTime}] [GET /products/slug/:slug] Attempting DB query for slug: ${requestedSlug}`);
        const dbQueryStartTime = Date.now();

        // SQL query joining products and categories to get product details AND category slug
        const query = `
            SELECT p.id, p.name, p.description, p.price, p.image, p.featured,
                   p.created_at, p.updated_at, p.slug,
                   p.category_id, c.slug AS "categorySlug"
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = $1
            LIMIT 1`;

        // Execute the query using the pool imported as 'db'
        const result = await db.query(query, [requestedSlug]);
        const dbQueryDuration = Date.now() - dbQueryStartTime;

        if (result.rows.length === 0) {
            // No product found for this slug
            console.log(`[${requestStartTime}] [GET /products/slug/:slug] DB query successful (${dbQueryDuration}ms). Product NOT FOUND for slug: ${requestedSlug}`);
            // Send 404 Not Found
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Product found
        const product = result.rows[0];

        // Optional but recommended: Convert numeric price from string (pg default) to number
        if (product.price !== null && product.price !== undefined) {
             product.price = parseFloat(product.price);
        }
        // Ensure categorySlug is null if there was no match (LEFT JOIN) instead of potentially undefined
        if (product.categorySlug === undefined) {
             product.categorySlug = null;
        }


        console.log(`[${requestStartTime}] [GET /products/slug/:slug] DB query successful (${dbQueryDuration}ms). Product FOUND: ID ${product.id}, Category Slug: ${product.categorySlug}`);
        // Send 200 OK with the product data (now includes categorySlug)
        res.status(200).json(product);

    } catch (error) {
        // Handle potential database errors during the query
        console.error(`[${requestStartTime}] [GET /products/slug/:slug] Error fetching product by slug "${requestedSlug}":`, error);
        // Send 500 Internal Server Error
        res.status(500).json({ message: 'Server error fetching product.' });
    }
});

// --- Ensure other routes like GET /:id, POST /, PUT /:id, DELETE /:id are also present ---

// module.exports = router; // At the end of the file


// GET all products (public) - Added 'slug' to SELECT
router.get('/', async (req, res) => {
    console.log(`[${new Date().toISOString()}] [GET /products] Request received.`);
    try {
        console.log(`[${new Date().toISOString()}] [GET /products] Attempting DB query...`);
        const startTime = Date.now();
        // --- Added slug ---
        const result = await db.query('SELECT id, name, description, price, image, featured, created_at, updated_at, slug FROM products ORDER BY created_at DESC');
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] [GET /products] DB query successful (${duration}ms). Found ${result.rows.length} rows.`);

        console.log(`[${new Date().toISOString()}] [GET /products] Sending ${result.rows.length} products in response...`);
        res.status(200).json(result.rows);
        console.log(`[${new Date().toISOString()}] [GET /products] Response sent.`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [GET /products] Error during processing:`, error);
        res.status(500).json({ message: 'Server error fetching products.' });
    }
});


// GET a single product by ID (public) - Added 'slug' to SELECT
router.get('/:id(\\d+)', async (req, res) => { // Added regex \\d+ to distinguish from slug route if mounted at same level
    console.log(`[${new Date().toISOString()}] [GET /products/:id] Request received for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
         // Ensure id is a number if needed, though regex helps route correctly
        if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid product ID.' });
        }
        // --- Added slug ---
        const result = await db.query('SELECT id, name, description, price, image, featured, created_at, updated_at, slug FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
             console.log(`[${new Date().toISOString()}] [GET /products/:id] Product not found for ID: ${id}`);
             return res.status(404).json({ message: 'Product not found.' });
        }
         console.log(`[${new Date().toISOString()}] [GET /products/:id] Product found for ID: ${id}`);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [GET /products/:id] Error fetching product: ${req.params.id}`, error);
        res.status(500).json({ message: 'Server error fetching product.' });
    }
});


// POST create a new product (Admin Only) - Added slug generation
router.post('/', auth, isAdmin, async (req, res) => {
    console.log(`[${new Date().toISOString()}] [POST /products] Request received.`);
    try {
        const { name, description, price, image, featured } = req.body;
        // --- Basic validation ---
        if (!name || typeof name !== 'string' || name.trim() === '' || price === undefined || price === null) {
            return res.status(400).json({ message: 'Valid name and price are required.' });
        }
        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ message: 'Price must be a non-negative number.' });
        }
        const imageValue = (image && typeof image === 'string' && image.trim() !== '') ? image.trim() : null;
        const featuredValue = typeof featured === 'boolean' ? featured : false;

        // --- Generate unique slug ---
        const slug = await generateUniqueSlug(name);
        console.log(`[${new Date().toISOString()}] [POST /products] Generated slug: ${slug} for name: ${name}`);

        // --- Insert into DB ---
        const result = await db.query(
            // Added slug column and parameter $6
            'INSERT INTO products (name, description, price, image, featured, slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            // Added slug value
            [name.trim(), description || '', numericPrice, imageValue, featuredValue, slug]
        );
        console.log(`[${new Date().toISOString()}] [POST /products] Product created successfully with ID: ${result.rows[0].id}`);
        res.status(201).json({ message: 'Product created successfully.', product: result.rows[0] });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [POST /products] Error creating product:`, error);
        // Handle potential unique constraint violation for slug (though generateUniqueSlug should prevent it)
        if (error.code === '23505' && error.constraint === 'products_slug_unique') {
             return res.status(409).json({ message: 'Product slug conflict. Try renaming slightly.' });
        }
        res.status(500).json({ message: 'Server error creating product.' });
    }
});


// PUT update an existing product (Admin Only) - Added conditional slug update
router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Added regex \\d+
    console.log(`[${new Date().toISOString()}] [PUT /products/:id] Request received for ID: ${req.params.id}`);
    const { id } = req.params;
    const { name, description, price, image, featured } = req.body;

    // Validate ID
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }

    try {
        let slug = null;
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        // --- Conditionally build update query ---
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ message: 'Product name cannot be empty.'});
            }
            // If name is being updated, generate a new unique slug
            slug = await generateUniqueSlug(name.trim(), id); // Pass current ID to allow self-update
            updateFields.push(`name = $${paramIndex++}`);
            values.push(name.trim());
            updateFields.push(`slug = $${paramIndex++}`); // Add slug update
            values.push(slug);
            console.log(`[${new Date().toISOString()}] [PUT /products/:id] Updating name and regenerating slug to: ${slug}`);
        }
        if (description !== undefined) {
             updateFields.push(`description = $${paramIndex++}`);
             values.push(description);
        }
        if (price !== undefined) {
            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return res.status(400).json({ message: 'Price must be a non-negative number.' });
            }
            updateFields.push(`price = $${paramIndex++}`);
            values.push(numericPrice);
        }
        if (image !== undefined) {
            const imageValue = (image && typeof image === 'string' && image.trim() !== '') ? image.trim() : null;
            updateFields.push(`image = $${paramIndex++}`);
            values.push(imageValue);
        }
        if (featured !== undefined) {
             if (typeof featured !== 'boolean') {
                 return res.status(400).json({ message: 'Featured must be a boolean.' });
             }
            updateFields.push(`featured = $${paramIndex++}`);
            values.push(featured);
        }

        // If no fields are provided for update
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update.' });
        }

        // Add updated_at and WHERE clause
        updateFields.push(`updated_at = NOW()`);
        values.push(id); // Add id for WHERE clause

        // Construct the final query
        const query = `
            UPDATE products
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *`; // Use the final parameter index for id

        // Execute the query
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
             console.log(`[${new Date().toISOString()}] [PUT /products/:id] Product not found for ID: ${id}`);
             return res.status(404).json({ message: 'Product not found.' });
        }
         console.log(`[${new Date().toISOString()}] [PUT /products/:id] Product updated successfully for ID: ${id}`);
        res.status(200).json({ message: 'Product updated successfully.', product: result.rows[0] });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [PUT /products/:id] Error updating product ${id}:`, error);
         // Handle potential unique constraint violation for slug
         if (error.code === '23505' && error.constraint === 'products_slug_unique') {
             return res.status(409).json({ message: 'Product name results in a slug conflict. Try a slightly different name.' });
         }
        res.status(500).json({ message: 'Server error updating product.' });
    }
});

// DELETE a product (Admin Only) - No change needed for slug logic
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Added regex \\d+
    console.log(`[${new Date().toISOString()}] [DELETE /products/:id] Request received for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid product ID.' });
         }
        const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id, name, slug', [id]); // Return slug too for confirmation
        if (result.rows.length === 0) {
             console.log(`[${new Date().toISOString()}] [DELETE /products/:id] Product not found for ID: ${id}`);
             return res.status(404).json({ message: 'Product not found.' });
        }
         console.log(`[${new Date().toISOString()}] [DELETE /products/:id] Product deleted successfully: ID ${id}, Slug ${result.rows[0].slug}`);
        res.status(200).json({ message: 'Product deleted successfully.', product: result.rows[0] });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [DELETE /products/:id] Error deleting product ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

module.exports = router;
