// /var/projects/backend-api/routes/blogPosts.js
// --- REVISED with Category Integration & Image Field ---

const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const db = require('../config/db');       // Database pool (renamed from 'pool' for clarity)
const logger = require('../lib/logger');     // Pino logger
const auth = require('../middlewares/auth');   // Auth middleware
const isAdmin = require('../middlewares/isAdmin'); // Admin middleware
// Assuming pool is the exported DB connection pool: const pool = require('../config/db');

// --- Slug Generation Helper (for blog posts) ---
async function generateUniqueBlogSlug(title, currentId = null) {
    let baseSlug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@#?]/g });
    if (!baseSlug) baseSlug = `post-${Date.now()}`;
    let slug = baseSlug;
    let counter = 2;
    let slugExists = true;
    const MAX_SLUG_LENGTH = 250;

    while (slugExists) {
        const query = `SELECT id FROM blog_posts WHERE slug = $1 ${currentId ? 'AND id != $2' : ''} LIMIT 1`;
        const params = currentId ? [slug, currentId] : [slug];
        try {
            const result = await db.query(query, params); // Use 'db'
            if (result.rows.length === 0) {
                slugExists = false;
            } else {
                slug = `${baseSlug}-${counter}`;
                if (slug.length > MAX_SLUG_LENGTH) slug = slug.substring(0, MAX_SLUG_LENGTH);
                counter++;
                if (counter > 50) throw new Error('Could not generate unique blog post slug.');
            }
        } catch (dbError) {
             logger.error({ err: dbError, title, currentId }, "[UniqueBlogPostSlug] DB error.");
             throw dbError;
        }
    }
    return slug;
}

// --- ADMIN ROUTES (Require auth, isAdmin) ---

// POST / - Create a new blog post (Admin Only) - Added Category & Image
router.post('/', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [POST /blogposts] Admin request received.`);
    try {
        // Add blog_category_id and image to destructuring
        const { title, content, published, blog_category_id, image } = req.body;
        if (!title || !content) {
            logger.warn(`[${requestStartTime}] [POST /blogposts] Missing title or content.`);
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const authorId = req.user?.userId;
        if (!authorId) {
             logger.error(`[${requestStartTime}] [POST /blogposts] Missing authorId from token.`);
             return res.status(401).json({ message: 'User ID not found in token.'});
        }

        // Validate category ID (optional)
        const categoryIdValue = blog_category_id ? parseInt(blog_category_id, 10) : null;
        if (blog_category_id && (isNaN(categoryIdValue) || categoryIdValue <= 0)) {
             logger.warn(`[${requestStartTime}] Invalid blog_category_id received: ${blog_category_id}`);
             return res.status(400).json({ message: 'Invalid Blog Category ID provided.' });
        }

        const slug = await generateUniqueBlogSlug(title);
        logger.info(`[${requestStartTime}] Generated slug: ${slug}`);

        // Add image and blog_category_id to INSERT
        const queryText = `
            INSERT INTO blog_posts (title, content, authorid, published, slug, image, blog_category_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`; // Return everything including new fields
        const params = [
            title,
            content,
            authorId,
            published || false,
            slug,
            image || null, // Save image path or null
            categoryIdValue // Save parsed category ID or null
         ];
        const result = await db.query(queryText, params);
        const newPost = result.rows[0];

        logger.info({ postId: newPost.id }, `[${requestStartTime}] Blog post created successfully.`);
        res.status(201).json(newPost);

    } catch (error) {
        logger.error({ err: error }, `[${requestStartTime}] Error creating blog post`);
         if (error.code === '23505') { // Unique constraint violation (slug)
             return res.status(409).json({ message: 'Blog post title results in a slug conflict.' });
         }
         if (error.code === '23503') { // Foreign key violation (blog_category_id)
              logger.warn(`[${requestStartTime}] Invalid blog_category_id provided.`);
              return res.status(400).json({ message: 'Invalid Blog Category ID provided.' });
         }
        res.status(500).json({ message: 'Error creating blog post', error: error.message });
    }
});

// PUT /:id - Update a blog post (Admin Only) - Added Category & Image
router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const postId = parseInt(req.params.id, 10);
    logger.info({ postId }, `[${requestStartTime}] [PUT /blogposts/:id] Admin request received.`);

    if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    try {
        // Add blog_category_id and image to destructuring
        const { title, content, published, blog_category_id, image } = req.body;
        if (title === undefined || content === undefined || published === undefined) {
            return res.status(400).json({ message: 'Title, content, and published status are required.' });
        }
        if (typeof published !== 'boolean') {
             return res.status(400).json({ message: 'Published must be true or false.' });
        }
        // Validate category ID if provided (allow null/undefined/empty string to clear it)
        let categoryIdValue = null;
         if (blog_category_id !== undefined && blog_category_id !== null && blog_category_id !== '') {
             categoryIdValue = parseInt(blog_category_id, 10);
             if (isNaN(categoryIdValue) || categoryIdValue <= 0) {
                 logger.warn(`[${requestStartTime}] Invalid blog_category_id for update: ${blog_category_id}`);
                 return res.status(400).json({ message: 'Invalid Blog Category ID provided.' });
             }
         }

        // Check if post exists and get original title
        const checkResult = await db.query('SELECT id, title FROM blog_posts WHERE id = $1', [postId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        const originalTitle = checkResult.rows[0].title;

        // Build dynamic UPDATE
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        // Always include required fields
        updateFields.push(`title = $${paramIndex++}`); values.push(title);
        updateFields.push(`content = $${paramIndex++}`); values.push(content);
        updateFields.push(`published = $${paramIndex++}`); values.push(published);

        // Conditionally add image if present in request body
        if (image !== undefined) {
             updateFields.push(`image = $${paramIndex++}`);
             values.push(image || null); // Allow setting to null
        }
        // Conditionally add category if present in request body
        if (blog_category_id !== undefined) {
             updateFields.push(`blog_category_id = $${paramIndex++}`);
             values.push(categoryIdValue); // Use parsed int or null
        }
        // Conditionally add slug if title changed
        if (title !== originalTitle) {
            const slug = await generateUniqueBlogSlug(title, postId);
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(slug);
            logger.info(`Regenerating slug to: ${slug}`);
        }
        // Always update timestamp
        updateFields.push(`"updatedAt" = NOW()`); // Use quoted name if needed

        // Add ID for WHERE clause LAST
        values.push(postId);
        const idParamIndex = paramIndex;

        const updateQueryText = `
            UPDATE blog_posts SET ${updateFields.join(', ')}
            WHERE id = $${idParamIndex}
            RETURNING *`; // <<< Return all columns including category ID and image

        logger.debug({ query: updateQueryText.replace(/\s+/g, ' '), params: values }, `Executing update for post ID ${postId}`);
        const result = await db.query(updateQueryText, values);

        logger.info({ postId }, `[${requestStartTime}] Blog post updated successfully.`);
        res.status(200).json(result.rows[0]);

    } catch (error) {
        logger.error({ err: error, postId }, `[${requestStartTime}] Error updating blog post`);
        if (error.code === '23505') { // Unique constraint violation (slug)
             return res.status(409).json({ message: 'Blog post title results in a slug conflict.' });
        }
        if (error.code === '23503') { // Foreign key violation (blog_category_id)
              logger.warn(`[${requestStartTime}] Invalid blog_category_id provided.`);
              return res.status(400).json({ message: 'Invalid Blog Category ID provided.' });
         }
        res.status(500).json({ message: 'Error updating blog post', error: error.message });
    }
});

// DELETE /:id - Delete a blog post (Admin Only) - No changes needed here
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    // ... (Existing delete logic is fine) ...
    const requestStartTime = new Date().toISOString();
    const postId = parseInt(req.params.id, 10);
    logger.info({ postId, userId: req.user?.userId }, `[${requestStartTime}] [DELETE /blogposts/:id] Admin request received.`);
    if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });
    try {
        const result = await db.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id, title', [postId]);
        if (result.rows.length === 0) { return res.status(404).json({ message: 'Blog post not found' }); }
        logger.info({ deletedPost: result.rows[0] }, `[${requestStartTime}] Blog post deleted successfully.`);
        res.status(200).json({ message: 'Blog post deleted successfully', post: result.rows[0] });
    } catch (error) {
        logger.error({ err: error, postId }, `[${requestStartTime}] Error deleting blog post`);
        res.status(500).json({ message: 'Error deleting blog post', error: error.message });
    }
});

// GET /list-admin - Get ALL posts for Admin UI - Added Category & Image
router.get('/list-admin', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts/list-admin] Admin request received.`);
     try {
         // Added bp.image, JOIN bc, selected bc.name and bc.slug
         const queryText = `
             SELECT
                bp.id, bp.title, bp.slug, bp.published, bp."createdAt", bp.authorid, bp.image,
                u.name as "authorName",
                bc.name AS blog_category_name, bc.slug AS blog_category_slug
             FROM blog_posts bp
             LEFT JOIN users u ON bp.authorid = u.id
             LEFT JOIN blog_categories bc ON bp.blog_category_id = bc.id
             ORDER BY bp."createdAt" DESC
         `;
         const result = await db.query(queryText);
         logger.info(`[${requestStartTime}] Fetched ${result.rows.length} total blog posts for admin.`);
         res.status(200).json(result.rows);
     } catch (error) {
         logger.error({err: error}, `[${requestStartTime}] Error fetching all blog posts for admin`);
         res.status(500).json({ message: 'Error fetching posts for admin', error: error.message });
     }
});

// GET /:id - Get single post by ID (Admin only) - Added Category & Image
router.get('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const postId = parseInt(req.params.id, 10);
    logger.info(`[${requestStartTime}] [GET /blogposts/:id] Admin request received for ID: ${postId}`);

    if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    try {
         // Added bp.image, bp.blog_category_id, JOIN bc, selected bc.name and bc.slug
         const queryText = `
             SELECT
                bp.*,
                u.name as "authorName",
                bc.name AS blog_category_name, bc.slug AS blog_category_slug
             FROM blog_posts bp
             LEFT JOIN users u ON bp.authorid = u.id
             LEFT JOIN blog_categories bc ON bp.blog_category_id = bc.id
             WHERE bp.id = $1
         `;
         const result = await db.query(queryText, [postId]);

         if (result.rows.length === 0) {
             return res.status(404).json({ message: 'Blog post not found.' });
         }
        logger.info({ postId }, `[${requestStartTime}] Admin blog post found.`);
        res.status(200).json(result.rows[0]); // Return the single post object

    } catch (error) {
        logger.error({ err: error, postId }, `[${requestStartTime}] Error fetching admin blog post ID ${postId}`);
        res.status(500).json({ message: 'Error getting blog post', error: error.message });
    }
});


// --- PUBLIC ROUTES ---

// GET / - Get all PUBLISHED blog posts (Public) - Added Category & Image
router.get('/', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts] Public request received.`);
    try {
        // Added bp.image, JOIN bc, selected bc.name and bc.slug
        const queryText = `
            SELECT
                bp.id, bp.title, bp.slug, bp.content, bp.authorid, bp.published,
                bp."createdAt", bp."updatedAt", bp.image,
                u.name as "authorName",
                bc.name AS blog_category_name, bc.slug AS blog_category_slug
            FROM blog_posts bp
            LEFT JOIN users u ON bp.authorid = u.id
            LEFT JOIN blog_categories bc ON bp.blog_category_id = bc.id
            WHERE bp.published = true
            ORDER BY bp."createdAt" DESC
        `;
        const result = await db.query(queryText);
        logger.info(`[${requestStartTime}] Found ${result.rows.length} published blog posts.`);
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error({err: error}, `[${requestStartTime}] Error fetching published blog posts`);
        res.status(500).json({ message: 'Error getting blog posts', error: error.message });
    }
});

// GET /slug/:slug - Get a single PUBLISHED post by SLUG (Public) - Added Category & Image
router.get('/slug/:slug', async (req, res) => {
    const requestedSlug = req.params.slug;
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts/slug/:slug] Public request received for slug: ${requestedSlug}`);

    if (!requestedSlug) return res.status(400).json({ message: 'Invalid slug parameter.' });

    try {
        // Added bp.image, JOIN bc, selected bc.name and bc.slug
        const queryText = `
            SELECT
                bp.*,
                u.name as "authorName",
                bc.name AS blog_category_name, bc.slug AS blog_category_slug
            FROM blog_posts bp
            LEFT JOIN users u ON bp.authorid = u.id
            LEFT JOIN blog_categories bc ON bp.blog_category_id = bc.id
            WHERE bp.slug = $1 AND bp.published = true
            LIMIT 1
        `;
        const result = await db.query(queryText, [requestedSlug]);

        if (result.rows.length === 0) {
            logger.warn(`[${requestStartTime}] Public blog post NOT FOUND or not published for slug: ${requestedSlug}`);
            return res.status(404).json({ message: 'Blog post not found or not published.' });
        }
        logger.info({ postId: result.rows[0].id }, `[${requestStartTime}] Public blog post found for slug: ${requestedSlug}`);
        res.status(200).json(result.rows[0]);

    } catch (error) {
        logger.error({ err: error, slug: requestedSlug }, `[${requestStartTime}] Error fetching published blog post by slug`);
        res.status(500).json({ message: 'Error getting blog post', error: error.message });
    }
});

// *** NEW: GET /category/:categorySlug - Get PUBLISHED posts by Category Slug (Public) ***
router.get('/category/:categorySlug', async (req, res) => {
    const { categorySlug } = req.params;
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts/category/:categorySlug] Public request for category slug: ${categorySlug}`);

    if (!categorySlug) return res.status(400).json({ message: 'Category slug required.' });

    try {
        // Find category first to ensure it exists (optional, but good practice)
        const categoryCheck = await db.query('SELECT id, name FROM blog_categories WHERE slug = $1', [categorySlug]);
        if (categoryCheck.rows.length === 0) {
             logger.warn(`[${requestStartTime}] Category slug not found: ${categorySlug}`);
             return res.status(404).json({ message: 'Category not found.' });
        }
        const categoryId = categoryCheck.rows[0].id;
        const categoryName = categoryCheck.rows[0].name; // For potential use in response

        // Fetch published posts matching the category ID
        // Reusing most of the public list query structure
        const queryText = `
            SELECT
                bp.id, bp.title, bp.slug, bp.content, bp.authorid, bp.published,
                bp."createdAt", bp."updatedAt", bp.image,
                u.name as "authorName",
                bc.name AS blog_category_name, bc.slug AS blog_category_slug
            FROM blog_posts bp
            LEFT JOIN users u ON bp.authorid = u.id
            JOIN blog_categories bc ON bp.blog_category_id = bc.id -- INNER JOIN forces category match
            WHERE bc.id = $1 AND bp.published = true -- Filter by category ID and published
            ORDER BY bp."createdAt" DESC
        `;
        const result = await db.query(queryText, [categoryId]);

        logger.info(`[${requestStartTime}] Found ${result.rows.length} published blog posts for category slug "${categorySlug}".`);
        // Return posts, maybe include category name?
        // res.status(200).json({ category: { name: categoryName, slug: categorySlug }, posts: result.rows });
        res.status(200).json(result.rows); // Just return the posts array for simplicity

    } catch (error) {
        logger.error({err: error, categorySlug}, `[${requestStartTime}] Error fetching published blog posts by category slug`);
        res.status(500).json({ message: 'Error getting blog posts for category.', error: error.message });
    }
});


// Keep module.exports
module.exports = router;
