// /var/projects/backend-api/routes/products.js
// --- REVISED WITH category_slug in GET and category_id in POST/PUT ---

const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your database connection setup
const auth = require('../middlewares/auth'); // Your auth middleware
const isAdmin = require('../middlewares/isAdmin'); // Your admin check middleware
const slugify = require('slugify'); // Slug generation library

// --- Helper Function to Generate Unique Slugs ---
// (Checks DB to ensure slug is unique, appending '-n' if necessary)
async function generateUniqueSlug(name, currentId = null) {
    // Use more specific regex to keep meaningful hyphens if desired
    let baseSlug = slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@#?]/g }); // Keep hyphens
    let slug = baseSlug;
    let counter = 2;
    let slugExists = true;

    // Prevent excessively long slugs in the loop
    const MAX_SLUG_LENGTH = 250; // Adjust based on your DB column limit

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
            // Truncate if slug gets too long during generation attempts
            if (slug.length > MAX_SLUG_LENGTH) {
                 slug = slug.substring(0, MAX_SLUG_LENGTH);
                 // Consider if truncation itself could cause a collision - requires careful thought or stricter base slugging
            }
            counter++;
            if (counter > 50) { // Safety break to prevent infinite loops
                 console.error(`[generateUniqueSlug] Could not generate unique slug for "${name}" after 50 attempts. Last tried: "${slug}"`);
                 throw new Error('Failed to generate a unique slug after multiple attempts.');
            }
        }
    }
    return slug;
}


// *** GET all products (public) - MODIFIED to include category_slug ***
// Modify GET / in routes/products.js

// Add this to your existing products.js route - modify the GET / endpoint

// *** GET all products (public) - MODIFIED to include brand and LLM filtering ***

// In your products.js route, modify the GET / handler
router.get('/', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    // Get query parameters for filtering
    const { categorySlug, brand, requires_llm } = req.query;
    
    console.log(`[${requestStartTime}] [GET /products] Request received. Filters:`, {
        categorySlug: categorySlug || 'none',
        brand: brand || 'none', 
        requires_llm: requires_llm || 'none'
    });

    try {
        console.log(`[${requestStartTime}] [GET /products] Attempting DB query...`);
        const dbQueryStartTime = Date.now();

        // Base query includes joins for category and brand info
        let query = `
            SELECT
                p.id, p.name, p.description, p.short_description, p.price, p.image, p.featured,
                p.created_at, p.updated_at, p.slug,
                p.category_id, p.brand_slug, p.brand_name, p.requires_llm_generation,
                p.report_title, p.report_subtitle,
                c.slug AS "categorySlug"
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
        `;

        const conditions = [];
        const params = [];

        // Filter by category slug if provided
        if (categorySlug) {
            conditions.push(`c.slug = $${params.length + 1}`);
            params.push(categorySlug);
        }

        // Filter by brand slug if provided
        if (brand) {
            conditions.push(`p.brand_slug = $${params.length + 1}`);
            params.push(brand);
        }

        // Filter by LLM requirement if provided
        if (requires_llm === 'true') {
            conditions.push(`p.requires_llm_generation = $${params.length + 1}`);
            params.push(true);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY p.created_at DESC';

        console.log(`Executing query: ${query.replace(/\s+/g, ' ')} with params:`, params);
        const result = await db.query(query, params);
        
        const dbQueryDuration = Date.now() - dbQueryStartTime;
        console.log(`[${requestStartTime}] [GET /products] DB query successful (${dbQueryDuration}ms). Found ${result.rows.length} rows.`);

        const products = result.rows.map(product => ({
            ...product,
            price: (product.price !== null && product.price !== undefined) ? parseFloat(product.price) : null,
            categorySlug: product.categorySlug
        }));

        console.log(`[${requestStartTime}] [GET /products] Sending ${products.length} products in response...`);
        res.status(200).json(products);

    } catch (error) {
        console.error(`[${requestStartTime}] [GET /products] Error during processing:`, error);
        res.status(500).json({ message: 'Server error fetching products.' });
    }
});

// *** GET a single product by SLUG (public) - CORRECTED (Looks Good) ***
router.get('/slug/:slug', async (req, res) => {
    const requestedSlug = req.params.slug;
    const requestStartTime = new Date().toISOString();

    console.log(`[${requestStartTime}] [GET /products/slug/:slug] Request received for slug: ${requestedSlug}`);

    if (!requestedSlug || typeof requestedSlug !== 'string' || requestedSlug.trim() === '') {
        console.log(`[${requestStartTime}] [GET /products/slug/:slug] Invalid slug parameter received.`);
        return res.status(400).json({ message: 'Invalid slug parameter.' });
    }

    try {
        console.log(`[${requestStartTime}] [GET /products/slug/:slug] Attempting DB query for slug: ${requestedSlug}`);
        const dbQueryStartTime = Date.now();

        // Query is correct (includes JOIN and categorySlug)
        const query = `
            SELECT p.id, p.name, p.description, p.short_description, p.price, p.image, p.featured,
                   p.created_at, p.updated_at, p.slug,
                   p.category_id, c.slug AS "categorySlug"
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = $1
            LIMIT 1`;

        const result = await db.query(query, [requestedSlug]);
        const dbQueryDuration = Date.now() - dbQueryStartTime;

        if (result.rows.length === 0) {
            console.log(`[${requestStartTime}] [GET /products/slug/:slug] DB query successful (${dbQueryDuration}ms). Product NOT FOUND for slug: ${requestedSlug}`);
            return res.status(404).json({ message: 'Product not found.' });
        }

        const product = result.rows[0];

        // Parse price and ensure categorySlug is null if not found
        if (product.price !== null && product.price !== undefined) {
            product.price = parseFloat(product.price);
        }
        if (product.categorySlug === undefined) { // Should be null from DB if no match, but safety check
            product.categorySlug = null;
        }

        console.log(`[${requestStartTime}] [GET /products/slug/:slug] DB query successful (${dbQueryDuration}ms). Product FOUND: ID ${product.id}, Category Slug: ${product.categorySlug}`);
        res.status(200).json(product);

    } catch (error) {
        console.error(`[${requestStartTime}] [GET /products/slug/:slug] Error fetching product by slug "${requestedSlug}":`, error);
        res.status(500).json({ message: 'Server error fetching product.' });
    }
});


// *** GET a single product by ID (public) - MODIFIED to include category_slug ***
router.get('/:id(\\d+)', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;
    console.log(`[${requestStartTime}] [GET /products/:id] Request received for ID: ${id}`);

    // ID validation (already good)
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }

    try {
        console.log(`[${requestStartTime}] [GET /products/:id] Attempting DB query for ID: ${id}`);
        const dbQueryStartTime = Date.now();

        // *** MODIFIED QUERY: Added LEFT JOIN and selected category_slug ***
        const query = `
            SELECT
                p.id, p.name, p.description, p.short_description, p.price, p.image, p.featured,
                p.created_at, p.updated_at,
                p.slug,
                p.category_id,
                c.slug AS "categorySlug"
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1`;

        const result = await db.query(query, [id]);
        const dbQueryDuration = Date.now() - dbQueryStartTime;

        if (result.rows.length === 0) {
            console.log(`[${requestStartTime}] [GET /products/:id] DB query successful (${dbQueryDuration}ms). Product NOT FOUND for ID: ${id}`);
            return res.status(404).json({ message: 'Product not found.' });
        }

        const product = result.rows[0];

        // *** ADDED: Parse price and ensure categorySlug is null if not found ***
        if (product.price !== null && product.price !== undefined) {
            product.price = parseFloat(product.price);
        }
        if (product.categorySlug === undefined) { // Safety check
            product.categorySlug = null;
        }

        console.log(`[${requestStartTime}] [GET /products/:id] DB query successful (${dbQueryDuration}ms). Product FOUND: ID ${product.id}, Category Slug: ${product.categorySlug}`);
        res.status(200).json(product);

    } catch (error) {
        console.error(`[${requestStartTime}] [GET /products/:id] Error fetching product ID ${id}:`, error);
        res.status(500).json({ message: 'Server error fetching product.' });
    }
});


// *** POST create a new product (Admin Only) - MODIFIED to include category_id ***
router.post('/', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    console.log(`[${requestStartTime}] [POST /products] Request received.`);
    try {
        // *** ADDED: category_id from body ***
        const { name, description, short_description, price, image, featured, category_id } = req.body;

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

        // *** ADDED: Validate category_id ***
        const categoryIdValue = category_id !== undefined ? parseInt(category_id) : null;
        if (categoryIdValue !== null && isNaN(categoryIdValue)) {
             return res.status(400).json({ message: 'Invalid category_id provided.' });
        }
        // Optional deeper validation: Check if category exists in DB
        if (categoryIdValue !== null) {
            const catCheck = await db.query('SELECT id FROM categories WHERE id = $1', [categoryIdValue]);
            if (catCheck.rows.length === 0) {
               return res.status(400).json({ message: `Category with ID ${categoryIdValue} not found.` });
            }
             console.log(`[${requestStartTime}] [POST /products] Valid category ID ${categoryIdValue} provided.`);
        } else {
             console.log(`[${requestStartTime}] [POST /products] No category ID provided.`);
        }


        // --- Generate unique slug ---
        const slug = await generateUniqueSlug(name);
        console.log(`[${requestStartTime}] [POST /products] Generated slug: ${slug} for name: ${name}`);

        // --- Insert into DB ---
        // *** MODIFIED: Added category_id column and parameter $7 ***
const result = await db.query(
  'INSERT INTO products (name, description, short_description, price, image, featured, slug, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
  [name.trim(), description || null, short_description || null, numericPrice, imageValue, featuredValue, slug, categoryIdValue]
);


        const newProduct = result.rows[0];
         // Parse price in returned object
         if (newProduct.price !== null && newProduct.price !== undefined) {
            newProduct.price = parseFloat(newProduct.price);
        }

        console.log(`[${requestStartTime}] [POST /products] Product created successfully with ID: ${newProduct.id}`);
        res.status(201).json({ message: 'Product created successfully.', product: newProduct }); // Contains category_id, not category_slug

    } catch (error) {
        console.error(`[${requestStartTime}] [POST /products] Error creating product:`, error);
        if (error.code === '23505' && error.constraint === 'products_slug_unique') {
            return res.status(409).json({ message: 'Product slug conflict. Try renaming slightly.' });
        }
        res.status(500).json({ message: 'Server error creating product.' });
    }
});


// *** PUT update an existing product (Admin Only) - MODIFIED to include category_id ***
// REPLACE THE ENTIRE EXISTING router.put('/:id...') with this:
// --- File: /var/projects/backend-api/routes/products.js ---

router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;

    // *** ADDED: Log the raw request body ***
    console.log(`[${requestStartTime}] [PUT /products/:id] Received req.body:`, req.body);
    // ***************************************

     // Get expected fields from body
    const { name, description, short_description, price, image, featured, category_id } = req.body;
    console.log(`[${requestStartTime}] [PUT /products/:id] Request processing for ID: ${id}`);

    // Validate ID
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }

    try {
        // Initialize arrays and parameter index
        const updateFields = []; // Holds "column = $N" parts
        const values = [];       // Holds corresponding values
        let paramIndex = 1;      // Initialize parameter counter

        let slug = null; // To hold regenerated slug if name changes

        // --- Conditionally build update query ---
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ message: 'Product name cannot be empty.' });
            }
            slug = await generateUniqueSlug(name.trim(), id);
            updateFields.push(`name = $${paramIndex++}`);
            values.push(name.trim());
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(slug);
            console.log(`[${requestStartTime}] [PUT /products/:id] Staging name update and regenerating slug to: ${slug}`);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description ?? null); // Use null if description is explicitly null
        }
        if (price !== undefined) {
            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return res.status(400).json({ message: 'Price must be a non-negative number.' });
            }
            updateFields.push(`price = $${paramIndex++}`);
            values.push(numericPrice);
        }

       if (short_description !== undefined) {
       updateFields.push(`short_description = $${paramIndex++}`);
       values.push(short_description ?? null);
       }

       if (image !== undefined) {
            const imageValue = (image && typeof image === 'string' && image.trim() !== '') ? image.trim() : null;
            updateFields.push(`image = $${paramIndex++}`);
            values.push(imageValue);
        }
        if (featured !== undefined) {
             const featuredValue = String(featured).toLowerCase() === 'true'; // Handle potential string 'true'/'false'
             updateFields.push(`featured = $${paramIndex++}`);
             values.push(featuredValue);
        }
        if (category_id !== undefined) {
             const categoryIdValue = category_id === null || category_id === '' ? null : parseInt(category_id); // Allow unsetting category
             if (categoryIdValue !== null && isNaN(categoryIdValue)) {
                 return res.status(400).json({ message: 'Invalid category_id.' });
             }
             // Optional: Check if category exists if not null
             if (categoryIdValue !== null) {
                 const catCheck = await db.query('SELECT id FROM categories WHERE id = $1', [categoryIdValue]);
                 if (catCheck.rows.length === 0) {
                    return res.status(400).json({ message: `Category with ID ${categoryIdValue} not found.` });
                 }
             }
             updateFields.push(`category_id = $${paramIndex++}`);
             values.push(categoryIdValue);
             console.log(`[${requestStartTime}] [PUT /products/:id] Staging category_id update for ID: ${id} to ${categoryIdValue}`);
       }

        // If no valid fields were provided for update
        if (updateFields.length === 0) {
            console.log(`[${requestStartTime}] [PUT /products/:id] No valid fields found in req.body to update for ID: ${id}`);
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        // Add the ID value for the WHERE clause *after* all field values
        values.push(id);
        const idParamIndex = paramIndex; // Capture the index for the ID

        // Construct the SET part
        let setClause = updateFields.join(', ');
        // ALWAYS add updated_at = NOW()
        setClause += (setClause ? ', ' : '') + 'updated_at = NOW()';

        // Construct the final query
        const query = `
            UPDATE products
            SET ${setClause}
            WHERE id = $${idParamIndex}
            RETURNING *`;

        console.log(`[${requestStartTime}] [PUT /products/:id] Executing query: ${query.replace(/\s+/g, ' ')} with values:`, values);

        // Execute the query
        const updateResult = await db.query(query, values);

        if (updateResult.rows.length === 0) {
            // Should not happen if ID validation passed, but good failsafe
            console.log(`[${requestStartTime}] [PUT /products/:id] Product not found for ID: ${id} during update attempt.`);
            return res.status(404).json({ message: 'Product not found.' });
        }

        let updatedProduct = updateResult.rows[0];

        // Fetch category slug to include in response
        let categorySlug = null;
        if (updatedProduct.category_id) {
            try {
                const catResult = await db.query('SELECT slug FROM categories WHERE id = $1', [updatedProduct.category_id]);
                if (catResult.rows.length > 0) {
                    categorySlug = catResult.rows[0].slug;
                }
            } catch (catError) {
                console.error(`[PUT /products/:id] Error fetching category slug for category_id ${updatedProduct.category_id}:`, catError);
            }
        }
        updatedProduct.categorySlug = categorySlug;

        // Parse price before sending
         if (updatedProduct.price !== null && updatedProduct.price !== undefined) {
            updatedProduct.price = parseFloat(updatedProduct.price);
         }

        console.log(`[${requestStartTime}] [PUT /products/:id] Product updated successfully for ID: ${id}`);
        res.status(200).json({ message: 'Product updated successfully.', product: updatedProduct }); // Send object with categorySlug

    } catch (error) {
        console.error(`[${requestStartTime}] [PUT /products/:id] Error updating product ${id}:`, error);
         if (error.code === '23505' && error.constraint === 'products_slug_unique') {
             return res.status(409).json({ message: 'Product name results in a slug conflict. Try a slightly different name.' });
         }
        res.status(500).json({ message: 'Server error updating product.' });
    }
}); // --- END OF router.put ---

// *** DELETE a product (Admin Only) - OK ***
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;
    console.log(`[${requestStartTime}] [DELETE /products/:id] Request received for ID: ${id}`);

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }
    try {
        const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id, name, slug', [id]);
        if (result.rows.length === 0) {
            console.log(`[${requestStartTime}] [DELETE /products/:id] Product not found for ID: ${id}`);
            return res.status(404).json({ message: 'Product not found.' });
        }
        console.log(`[${requestStartTime}] [DELETE /products/:id] Product deleted successfully: ID ${id}, Slug ${result.rows[0].slug}`);
        res.status(200).json({ message: 'Product deleted successfully.', product: result.rows[0] });
    } catch (error) {
        console.error(`[${requestStartTime}] [DELETE /products/:id] Error deleting product ${id}:`, error);
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

module.exports = router;
