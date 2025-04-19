// /var/projects/backend-api/routes/blogCategories.js

const express = require('express');
const router = express.Router();
const slugify = require('slugify'); // For generating URL slugs
const db = require('../config/db'); // Database pool
const logger = require('../lib/logger'); // Logger
const auth = require('../middlewares/auth'); // Auth middleware
const isAdmin = require('../middlewares/isAdmin'); // Admin check middleware

// --- Helper: Generate Unique Slug for Blog Categories ---
async function generateUniqueBlogCategorySlug(name, currentId = null) {
    // Simple slug generation (lowercase, hyphenated)
    let baseSlug = slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@#?]/g });
    if (!baseSlug) baseSlug = `category-${Date.now()}`; // Fallback
    let slug = baseSlug;
    let counter = 2;
    let slugExists = true;
    const MAX_SLUG_LENGTH = 250;

    while (slugExists) {
        // Check if slug exists in the blog_categories table (excluding current ID if updating)
        const query = `SELECT id FROM blog_categories WHERE slug = $1 ${currentId ? 'AND id != $2' : ''} LIMIT 1`;
        const params = currentId ? [slug, currentId] : [slug];
        try {
            const result = await db.query(query, params);
            if (result.rows.length === 0) {
                slugExists = false; // Unique slug found
            } else {
                // Append counter if slug exists
                slug = `<span class="math-inline">\{baseSlug\}\-</span>{counter}`;
                if (slug.length > MAX_SLUG_LENGTH) slug = slug.substring(0, MAX_SLUG_LENGTH); // Truncate
                counter++;
                if (counter > 50) throw new Error('Could not generate unique slug.');
            }
        } catch (dbError) {
             logger.error({ err: dbError, name, currentId }, "[UniqueBlogCatSlug] DB error during check.");
             throw dbError;
        }
    }
    return slug;
}

// --- PUBLIC ROUTES ---

// GET / - Get all blog categories (Publicly accessible for filtering/display)
router.get('/', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blog-categories] Request received.`);
    try {
        // Select fields needed for public display (name, slug, maybe description)
        const result = await db.query('SELECT id, name, slug, description FROM blog_categories ORDER BY name ASC');
        logger.info(`[${requestStartTime}] [GET /blog-categories] Fetched ${result.rows.length} blog categories.`);
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error({ err: error }, `[${requestStartTime}] [GET /blog-categories] Error fetching categories`);
        res.status(500).json({ message: 'Server error fetching blog categories.' });
    }
});

// GET /slug/:slug - Get a single blog category by slug (Public)
router.get('/slug/:slug', async (req, res) => {
     const requestStartTime = new Date().toISOString();
     const { slug } = req.params;
     logger.info({ slug }, `[${requestStartTime}] [GET /blog-categories/slug/:slug] Request received.`);
     try {
         const result = await db.query('SELECT id, name, slug, description FROM blog_categories WHERE slug = $1', [slug]);
         if (result.rows.length === 0) {
             logger.warn({ slug }, `[${requestStartTime}] Blog category not found by slug.`);
             return res.status(404).json({ message: 'Blog category not found.' });
         }
         logger.info({ slug, categoryId: result.rows[0].id }, `[${requestStartTime}] Found blog category by slug.`);
         res.status(200).json(result.rows[0]);
     } catch (error) {
         logger.error({ err: error, slug }, `[${requestStartTime}] Error fetching blog category by slug`);
         res.status(500).json({ message: 'Server error fetching blog category by slug.' });
     }
});


// --- ADMIN ROUTES ---

// GET /admin/:id - Get a single blog category by ID (Admin Only)
// (Used for populating edit form) - Added /admin prefix for clarity
router.get('/admin/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const categoryId = parseInt(req.params.id, 10);
    logger.info({ categoryId, userId: req.user?.userId }, `[${requestStartTime}] [GET /blog-categories/admin/:id] Admin request received.`);
    try {
        const result = await db.query('SELECT * FROM blog_categories WHERE id = $1', [categoryId]);
        if (result.rows.length === 0) {
            logger.warn({ categoryId }, `[${requestStartTime}] Blog category not found for admin fetch.`);
            return res.status(404).json({ message: 'Blog category not found.' });
        }
        logger.info({ categoryId }, `[${requestStartTime}] Found blog category for admin.`);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        logger.error({ err: error, categoryId }, `[${requestStartTime}] Error fetching blog category for admin`);
        res.status(500).json({ message: 'Server error fetching blog category.' });
    }
});


// POST / - Create a new blog category (Admin Only)
router.post('/', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const { name, description } = req.body;
    logger.info({ name, userId: req.user?.userId }, `[${requestStartTime}] [POST /blog-categories] Admin request received.`);

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Category name is required.' });
    }
    const trimmedName = name.trim();

    try {
        const slug = await generateUniqueBlogCategorySlug(trimmedName);
        logger.info({ name: trimmedName, slug }, `Generated unique slug.`);

        const query = `
            INSERT INTO blog_categories (name, slug, description, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *`;
        const params = [trimmedName, slug, description || null];
        const result = await db.query(query, params);

        logger.info({ categoryId: result.rows[0].id, name: result.rows[0].name }, `[${requestStartTime}] Blog category created successfully.`);
        res.status(201).json(result.rows[0]);

    } catch (error) {
        logger.error({ err: error, name }, `[${requestStartTime}] Error creating blog category`);
        // Handle potential unique constraint violation on name/slug
        if (error.code === '23505') { // Unique violation code in PostgreSQL
             return res.status(409).json({ message: 'A blog category with this name or slug already exists.' });
        }
        res.status(500).json({ message: 'Server error creating blog category.', error: error.message });
    }
});

// PUT /:id - Update a blog category (Admin Only)
router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const categoryId = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    logger.info({ categoryId, name, userId: req.user?.userId }, `[${requestStartTime}] [PUT /blog-categories/:id] Admin request received.`);

    if (isNaN(categoryId) || categoryId <= 0) {
         return res.status(400).json({ message: 'Invalid category ID.' });
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Category name is required.' });
    }
    const trimmedName = name.trim();

    let client = null; // For transaction
    try {
        client = await db.connect();
        await client.query('BEGIN');

        // Check if category exists and get original name for slug check
        const checkResult = await client.query('SELECT name FROM blog_categories WHERE id = $1', [categoryId]);
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK'); // No need to proceed
             client.release();
            return res.status(404).json({ message: 'Blog category not found.' });
        }
        const originalName = checkResult.rows[0].name;

        // Prepare update fields
        const updateFields = [`name = $1`, `description = $2`, `updated_at = NOW()`];
        const values = [trimmedName, description || null];
        let paramIndex = 3;

        // Regenerate slug only if name changed
        if (trimmedName !== originalName) {
            const newSlug = await generateUniqueBlogCategorySlug(trimmedName, categoryId);
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(newSlug);
            logger.info({ categoryId, newSlug }, "Regenerating slug due to name change.");
        }

        values.push(categoryId); // Add ID for WHERE clause
        const idParamIndex = paramIndex;

        const updateQuery = `
            UPDATE blog_categories SET ${updateFields.join(', ')}
            WHERE id = $${idParamIndex}
            RETURNING *`;

        const result = await client.query(updateQuery, values);
        await client.query('COMMIT');

        logger.info({ categoryId }, `[${requestStartTime}] Blog category updated successfully.`);
        res.status(200).json(result.rows[0]);

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        logger.error({ err: error, categoryId }, `[${requestStartTime}] Error updating blog category`);
        if (error.code === '23505') {
             return res.status(409).json({ message: 'A blog category with this name or slug already exists.' });
        }
        res.status(500).json({ message: 'Server error updating blog category.', error: error.message });
    } finally {
        if (client) client.release();
    }
});

// DELETE /:id - Delete a blog category (Admin Only)
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const categoryId = parseInt(req.params.id, 10);
    logger.info({ categoryId, userId: req.user?.userId }, `[${requestStartTime}] [DELETE /blog-categories/:id] Admin request received.`);

    if (isNaN(categoryId) || categoryId <= 0) {
        return res.status(400).json({ message: 'Invalid category ID.' });
    }

    try {
        // ON DELETE SET NULL in blog_posts table handles FK references
        const result = await db.query('DELETE FROM blog_categories WHERE id = $1 RETURNING *', [categoryId]);

        if (result.rows.length === 0) {
            logger.warn({ categoryId }, `[${requestStartTime}] Blog category not found for deletion.`);
            return res.status(404).json({ message: 'Blog category not found.' });
        }

        logger.info({ categoryId: result.rows[0].id, name: result.rows[0].name }, `[${requestStartTime}] Blog category deleted successfully.`);
        res.status(200).json({ message: 'Blog category deleted successfully.', category: result.rows[0] });

    } catch (error) {
        logger.error({ err: error, categoryId }, `[${requestStartTime}] Error deleting blog category`);
        res.status(500).json({ message: 'Server error deleting blog category.', error: error.message });
    }
});

module.exports = router;
