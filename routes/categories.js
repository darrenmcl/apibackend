// /var/projects/backend-api/routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your database connection setup
const auth = require('../middlewares/auth'); // Your auth middleware
const isAdmin = require('../middlewares/isAdmin'); // Your admin check middleware
const slugify = require('slugify'); // Slug generation library

// --- Slug Generation Helper ---
// NOTE: This uses hyphens to be consistent with your products.js
// Consider moving this to a shared utils file if used in multiple route files.
async function generateUniqueCategorySlug(name, currentId = null) {
    let baseSlug = slugify(name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@#?]/g // Keep hyphens
    });
    let slug = baseSlug;
    let counter = 2;
    let slugExists = true;
    const MAX_SLUG_LENGTH = 250; // Match DB column limit

    while (slugExists) {
        // Check if slug exists for a *different* category ID
        const query = `SELECT id FROM categories WHERE slug = $1 ${currentId ? 'AND id != $2' : ''} LIMIT 1`;
        const params = currentId ? [slug, currentId] : [slug];
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            slugExists = false; // Slug is unique
        } else {
            // Slug exists, append counter and try again
            slug = `${baseSlug}-${counter}`;
            if (slug.length > MAX_SLUG_LENGTH) slug = slug.substring(0, MAX_SLUG_LENGTH);
            counter++;
            if (counter > 50) { // Safety break
                console.error(`[generateUniqueCategorySlug] Could not generate unique slug for "${name}"`);
                throw new Error('Failed to generate a unique category slug.');
            }
        }
    }
    return slug;
}
// --- End Slug Helper ---


// GET all categories (Public)
router.get('/', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    console.log(`[${requestStartTime}] [GET /categories] Request received.`);
    try {
        console.log(`[${requestStartTime}] [GET /categories] Attempting DB query...`);
        const dbQueryStartTime = Date.now();
        const query = `SELECT id, name, slug, description FROM categories ORDER BY name ASC`;
        const result = await db.query(query);
        const dbQueryDuration = Date.now() - dbQueryStartTime;

        console.log(`[${requestStartTime}] [GET /categories] DB query successful (${dbQueryDuration}ms). Found ${result.rows.length} categories.`);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error(`[${requestStartTime}] [GET /categories] Error fetching categories:`, error);
        res.status(500).json({ message: 'Server error fetching categories.' });
    }
});

// GET category details by slug (Public)
router.get('/slug/:slug', async (req, res) => {
    const requestedSlug = req.params.slug;
    const requestStartTime = new Date().toISOString();
    console.log(`[${requestStartTime}] [GET /categories/slug/:slug] Request received for slug: ${requestedSlug}`);

    if (!requestedSlug || typeof requestedSlug !== 'string' || requestedSlug.trim() === '') {
         console.log(`[${requestStartTime}] [GET /categories/slug/:slug] Invalid slug parameter.`);
         return res.status(400).json({ message: 'Invalid slug parameter.' });
    }

    try {
        const query = 'SELECT id, name, slug, description FROM categories WHERE slug = $1 LIMIT 1';
        console.log(`[${requestStartTime}] [GET /categories/slug/:slug] Attempting DB query for slug: ${requestedSlug}`);
        const dbQueryStartTime = Date.now();
        const result = await db.query(query, [requestedSlug]);
        const dbQueryDuration = Date.now() - dbQueryStartTime;

        if (result.rows.length === 0) {
            // CORRECTED Log formatting
            console.log(`[${requestStartTime}] [GET /categories/slug/:slug] DB query successful (${dbQueryDuration}ms). Category NOT FOUND for slug: ${requestedSlug}`);
            return res.status(404).json({ message: 'Category not found.' });
        }

        const category = result.rows[0];
        // CORRECTED Log formatting
        console.log(`[${requestStartTime}] [GET /categories/slug/:slug] DB query successful (${dbQueryDuration}ms). Category FOUND: ID ${category.id}`);
        res.status(200).json(category);

    } catch (error) {
        // CORRECTED Log formatting
        console.error(`[${requestStartTime}] [GET /categories/slug/:slug] Error fetching category by slug "${requestedSlug}":`, error);
        res.status(500).json({ message: 'Server error fetching category.' });
    }
});

// POST create a new category (Admin Only)
router.post('/', auth, isAdmin, async (req, res) => { // Added auth, isAdmin
    const requestStartTime = new Date().toISOString();
    console.log(`[${requestStartTime}] [POST /categories] Admin request received.`);
    try {
        const { name, description } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Category name is required.' });
        }
        const trimmedName = name.trim();

        const slug = await generateUniqueCategorySlug(trimmedName);
        console.log(`[${requestStartTime}] [POST /categories] Generated slug: ${slug} for name: ${trimmedName}`);

        const query = 'INSERT INTO categories (name, description, slug) VALUES ($1, $2, $3) RETURNING *';
        const result = await db.query(query, [trimmedName, description || null, slug]); // Use null if description empty
        const newCategory = result.rows[0];

        console.log(`[${requestStartTime}] [POST /categories] Category created successfully with ID: ${newCategory.id}`);
        res.status(201).json({ message: 'Category created successfully.', category: newCategory });

    } catch (error) {
        console.error(`[${requestStartTime}] [POST /categories] Error creating category:`, error);
         if (error.code === '23505' && error.constraint === 'categories_slug_key') { // Check constraint name from DB schema if different
             return res.status(409).json({ message: 'Category slug conflict. Try a slightly different name.' });
         }
        res.status(500).json({ message: 'Server error creating category.' });
    }
});

// PUT update an existing category (Admin Only)
router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Added auth, isAdmin and ID regex
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;
    const { name, description } = req.body;
    console.log(`[${requestStartTime}] [PUT /categories/:id] Admin request received for ID: ${id}`);

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid category ID.' });
    }

    try {
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        let slug = null;

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                 return res.status(400).json({ message: 'Category name cannot be empty.' });
            }
            const trimmedName = name.trim();
            // Regenerate slug only if name changes
            slug = await generateUniqueCategorySlug(trimmedName, id);
            updateFields.push(`name = $${paramIndex++}`);
            values.push(trimmedName);
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(slug);
            console.log(`[${requestStartTime}] [PUT /categories/:id] Staging name update and regenerating slug to: ${slug}`);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description ?? null); // Allow setting description to null
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update.' });
        }

        values.push(id); // Add id for WHERE clause
        const idParamIndex = paramIndex;

        const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${idParamIndex} RETURNING *`;
        console.log(`[${requestStartTime}] [PUT /categories/:id] Executing query: ${query.replace(/\s+/g, ' ')} with values:`, values);

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
             console.log(`[${requestStartTime}] [PUT /categories/:id] Category not found for ID: ${id}`);
             return res.status(404).json({ message: 'Category not found.' });
        }

        console.log(`[${requestStartTime}] [PUT /categories/:id] Category updated successfully for ID: ${id}`);
        res.status(200).json({ message: 'Category updated successfully.', category: result.rows[0] });

    } catch (error) {
        console.error(`[${requestStartTime}] [PUT /categories/:id] Error updating category ${id}:`, error);
        if (error.code === '23505' && error.constraint === 'categories_slug_key') {
             return res.status(409).json({ message: 'Category name results in a slug conflict. Try a slightly different name.' });
        }
        res.status(500).json({ message: 'Server error updating category.' });
    }
});

// DELETE a category (Admin Only)
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Added auth, isAdmin and ID regex
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;
    console.log(`[${requestStartTime}] [DELETE /categories/:id] Admin request received for ID: ${id}`);

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid category ID.' });
    }

    try {
        // Optional: Check if products are using this category BEFORE deleting
        const productCheck = await db.query('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [id]);
        if (productCheck.rows.length > 0) {
             console.warn(`[${requestStartTime}] [DELETE /categories/:id] Attempt to delete category ID ${id} which is still in use by products.`);
             return res.status(409).json({ message: 'Cannot delete category: it is still assigned to one or more products. Reassign products first.' });
             // Alternatively, you could set products.category_id to NULL here first, if desired.
        }

        // Proceed with deletion
        const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id, name, slug', [id]);
        if (result.rows.length === 0) {
             console.log(`[${requestStartTime}] [DELETE /categories/:id] Category not found for ID: ${id}`);
             return res.status(404).json({ message: 'Category not found.' });
        }

        console.log(`[${requestStartTime}] [DELETE /categories/:id] Category deleted successfully: ID ${id}, Slug ${result.rows[0].slug}`);
        res.status(200).json({ message: 'Category deleted successfully.', category: result.rows[0] });

    } catch (error) {
        console.error(`[${requestStartTime}] [DELETE /categories/:id] Error deleting category ${id}:`, error);
        res.status(500).json({ message: 'Server error deleting category.' });
    }
});

// --- Add this PUT route handler ---
// PUT update an existing category (Admin Only)
router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Added auth, isAdmin and ID regex
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;
    const { name, description } = req.body; // Get potential fields to update
    console.log(`[${requestStartTime}] [PUT /categories/:id] Admin request received for ID: ${id}`);

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid category ID.' });
    }

    try {
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        let slug = null;

        // Conditionally add fields to update
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                 return res.status(400).json({ message: 'Category name cannot be empty.' });
            }
            const trimmedName = name.trim();
            // Regenerate slug only if name changes
            // Pass current ID to allow generateUniqueCategorySlug to ignore self-collision
            slug = await generateUniqueCategorySlug(trimmedName, id);
            updateFields.push(`name = $${paramIndex++}`);
            values.push(trimmedName);
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(slug);
            console.log(`[${requestStartTime}] [PUT /categories/:id] Staging name update and regenerating slug to: ${slug}`);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description ?? null); // Allow setting description to null
        }

        if (updateFields.length === 0) {
            // If nothing was sent to update
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        // Add updated_at (Check if your DB schema auto-updates this; if so, remove this line)
        // updateFields.push(`updated_at = NOW()`);

        values.push(id); // Add id value itself for the WHERE clause
        const idParamIndex = paramIndex; // The placeholder index for the ID in WHERE

        // Construct the query
        const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${idParamIndex} RETURNING *`;
        console.log(`[${requestStartTime}] [PUT /categories/:id] Executing query: ${query.replace(/\s+/g, ' ')} with values:`, values);

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
             // The ID provided in the URL didn't match any category
             console.log(`[${requestStartTime}] [PUT /categories/:id] Category not found for ID: ${id}`);
             return res.status(404).json({ message: 'Category not found.' });
        }

        console.log(`[${requestStartTime}] [PUT /categories/:id] Category updated successfully for ID: ${id}`);
        res.status(200).json({ message: 'Category updated successfully.', category: result.rows[0] });

    } catch (error) {
        console.error(`[${requestStartTime}] [PUT /categories/:id] Error updating category ${id}:`, error);
        // Handle potential unique constraint violation if slug regeneration conflicts
        if (error.code === '23505' && error.constraint === 'categories_slug_key') { // Verify constraint name matches your DB
             return res.status(409).json({ message: 'Category name results in a slug conflict. Try a slightly different name.' });
        }
        res.status(500).json({ message: 'Server error updating category.' });
    }
});

// --- Add this DELETE route handler ---
// DELETE a category (Admin Only)
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Added auth, isAdmin and ID regex
    const requestStartTime = new Date().toISOString();
    const { id } = req.params;
    console.log(`[${requestStartTime}] [DELETE /categories/:id] Admin request received for ID: ${id}`);

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid category ID.' });
    }

    try {
        // *** IMPORTANT: Check if any products are using this category BEFORE deleting ***
        const productCheckQuery = 'SELECT id FROM products WHERE category_id = $1 LIMIT 1';
        console.log(`[${requestStartTime}] [DELETE /categories/:id] Checking product usage for category ID: ${id}`);
        const productCheck = await db.query(productCheckQuery, [id]);

        if (productCheck.rows.length > 0) {
             // If products are found, prevent deletion and inform the user
             console.warn(`[${requestStartTime}] [DELETE /categories/:id] Attempt to delete category ID ${id} which is still in use by product ID ${productCheck.rows[0].id}.`);
             return res.status(409).json({ message: 'Cannot delete category: it is still assigned to one or more products. Please reassign products first.' });
             // Alternative (use with caution): You could add logic here to set products.category_id = NULL for associated products before deleting the category.
        }
        console.log(`[${requestStartTime}] [DELETE /categories/:id] No products found using category ID: ${id}. Proceeding with deletion.`);

        // Proceed with deletion if no products are using it
        const deleteQuery = 'DELETE FROM categories WHERE id = $1 RETURNING id, name, slug';
        const result = await db.query(deleteQuery, [id]);

        if (result.rows.length === 0) {
             // The ID provided in the URL didn't match any category
             console.log(`[${requestStartTime}] [DELETE /categories/:id] Category not found for ID: ${id}`);
             return res.status(404).json({ message: 'Category not found.' });
        }

        console.log(`[${requestStartTime}] [DELETE /categories/:id] Category deleted successfully: ID ${id}, Slug ${result.rows[0].slug}`);
        res.status(200).json({ message: 'Category deleted successfully.', category: result.rows[0] });

    } catch (error) {
        console.error(`[${requestStartTime}] [DELETE /categories/:id] Error deleting category ${id}:`, error);
        res.status(500).json({ message: 'Server error deleting category.' });
    }
});

// Make sure module.exports = router; is still at the very end of the file


module.exports = router; // Ensure this is at the very end
