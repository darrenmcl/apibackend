// /var/projects/backend-api/routes/blogPosts.js
// --- REVISED with Slugs, Admin List, and Logger ---

const express = require('express');
const router = express.Router();
const pool = require('../config/db');       // DB pool config
const auth = require('../middlewares/auth');   // Auth middleware
const isAdmin = require('../middlewares/isAdmin'); // Admin middleware
const slugify = require('slugify');       // Slug library
const logger = require('../lib/logger');     // Pino logger

// --- Slug Generation Helper ---
// Using hyphens, checking blog_posts table
async function generateUniqueBlogSlug(title, currentId = null) {
    let baseSlug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@#?]/g });
    if (!baseSlug) baseSlug = `post-${Date.now()}`; // Fallback if title is only symbols
    let slug = baseSlug;
    let counter = 2;
    let slugExists = true;
    const MAX_SLUG_LENGTH = 250;

    while (slugExists) {
        const query = `SELECT id FROM blog_posts WHERE slug = $1 ${currentId ? 'AND id != $2' : ''} LIMIT 1`;
        const params = currentId ? [slug, currentId] : [slug];
        try {
            const result = await pool.query(query, params);
            if (result.rows.length === 0) {
                slugExists = false;
            } else {
                slug = `${baseSlug}-${counter}`;
                if (slug.length > MAX_SLUG_LENGTH) slug = slug.substring(0, MAX_SLUG_LENGTH);
                counter++;
                if (counter > 50) {
                    logger.error({ title }, `[generateUniqueBlogSlug] Could not generate unique slug after 50 attempts.`);
                    throw new Error('Failed to generate a unique slug.');
                }
            }
        } catch (dbError) {
            logger.error({ err: dbError, title, currentId }, "[generateUniqueBlogSlug] DB error during check.");
            throw dbError;
        }
    }
    return slug;
}
// --- End Slug Helper ---


// === ADMIN ROUTES (Require auth, isAdmin) ===

// POST / - Create a new blog post (Admin Only) - ADDED SLUG
router.post('/', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [POST /blogposts] Admin request received.`);
    try {
        const { title, content, published } = req.body;
        if (!title || !content) {
            logger.warn(`[${requestStartTime}] [POST /blogposts] Missing title or content.`);
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const authorId = req.user.userId; // From auth middleware
        if (!authorId) {
             logger.error(`[${requestStartTime}] [POST /blogposts] Missing authorId from token.`);
             return res.status(401).json({message: 'User ID not found in token.'});
        }

        const slug = await generateUniqueBlogSlug(title); // Generate slug
        logger.info(`[${requestStartTime}] [POST /blogposts] Generated slug: ${slug}`);

        // Added slug column ($5)
        const queryText = `
            INSERT INTO blog_posts (title, content, authorid, published, slug)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, slug, published, authorid, "createdAt", "updatedAt"`; // Return new post data
        const result = await pool.query(queryText, [title, content, authorId, published || false, slug]);
        const newPost = result.rows[0];

        logger.info({ postId: newPost.id }, `[${requestStartTime}] [POST /blogposts] Blog post created successfully.`);
        res.status(201).json(newPost);

    } catch (error) {
        logger.error({ err: error }, `[${requestStartTime}] [POST /blogposts] Error creating blog post`);
         if (error.code === '23505' && error.constraint === 'blog_posts_slug_unique') {
             return res.status(409).json({ message: 'Blog post title results in a slug conflict.' });
         }
        res.status(500).json({ message: 'Error creating blog post', error: error.message });
    }
});

// PUT /:id - Update a blog post (Admin Only) - UPDATED FOR SLUG
router.put('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const postId = parseInt(req.params.id, 10);
    logger.info(`[${requestStartTime}] [PUT /blogposts/:id] Admin request received for ID: ${postId}`);

    if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    try {
        const { title, content, published } = req.body;
        if (title === undefined || content === undefined || published === undefined) {
            return res.status(400).json({ message: 'Title, content, and published status are required.' });
        }
        if (typeof published !== 'boolean') {
             return res.status(400).json({ message: 'Published must be true or false.' });
        }

        // Check if post exists and get original title for slug check
        const checkResult = await pool.query('SELECT id, title FROM blog_posts WHERE id = $1', [postId]);
        if (checkResult.rows.length === 0) {
            logger.warn(`[${requestStartTime}] [PUT /blogposts/:id] Blog post not found for ID: ${postId}`);
            return res.status(404).json({ message: 'Blog post not found' });
        }
        const originalTitle = checkResult.rows[0].title;

        let slug = null;
        const updateFields = [
            `title = $1`,
            `content = $2`,
            `published = $3`,
            `"updatedAt" = NOW()`
        ];
        const values = [title, content, published];
        let paramIndex = 4;

        // Regenerate slug ONLY if title has changed
        if (title !== originalTitle) {
            slug = await generateUniqueBlogSlug(title, postId); // Pass ID to helper
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(slug);
            logger.info(`[${requestStartTime}] [PUT /blogposts/:id] Title changed, regenerating slug to: ${slug}`);
        }

        values.push(postId); // ID for WHERE clause
        const idParamIndex = paramIndex;

        const updateQueryText = `
            UPDATE blog_posts SET ${updateFields.join(', ')}
            WHERE id = $${idParamIndex}
            RETURNING id, title, slug, published, authorid, "createdAt", "updatedAt"`; // Return updated data

        logger.debug({ query: updateQueryText.replace(/\s+/g, ' '), params: values }, `Executing update for post ID ${postId}`);
        const result = await pool.query(updateQueryText, values);

        logger.info({ postId }, `[${requestStartTime}] [PUT /blogposts/:id] Blog post updated successfully.`);
        res.status(200).json(result.rows[0]);

    } catch (error) {
        logger.error({ err: error, postId }, `[${requestStartTime}] [PUT /blogposts/:id] Error updating blog post`);
        if (error.code === '23505' && error.constraint === 'blog_posts_slug_unique') {
             return res.status(409).json({ message: 'Blog post title results in a slug conflict.' });
        }
        res.status(500).json({ message: 'Error updating blog post', error: error.message });
    }
});

// DELETE /:id - Delete a blog post (Admin Only)
router.delete('/:id(\\d+)', auth, isAdmin, async (req, res) => { // Now requires Admin only
    const requestStartTime = new Date().toISOString();
    const postId = parseInt(req.params.id, 10);
    logger.info(`[${requestStartTime}] [DELETE /blogposts/:id] Admin request received for ID: ${postId}`);

    if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    try {
        // Admin doesn't need author check, can delete any post
        const result = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id, title, slug', [postId]);

        if (result.rows.length === 0) {
             logger.warn(`[${requestStartTime}] [DELETE /blogposts/:id] Blog post not found for ID: ${postId}`);
             return res.status(404).json({ message: 'Blog post not found' });
        }

        logger.info({ deletedPost: result.rows[0] }, `[${requestStartTime}] [DELETE /blogposts/:id] Blog post deleted successfully.`);
        res.status(200).json({ message: 'Blog post deleted successfully', post: result.rows[0] });

    } catch (error) {
        logger.error({ err: error, postId }, `[${requestStartTime}] [DELETE /blogposts/:id] Error deleting blog post`);
        res.status(500).json({ message: 'Error deleting blog post', error: error.message });
    }
});

// GET /list-admin - Get ALL posts for Admin UI (Admin Only)
router.get('/list-admin', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts/list-admin] Admin request received.`);
     try {
         logger.debug("Executing admin blog list query (fetching all statuses)");
         // Join users table to get author name, select fields for admin table
         const queryText = `
             SELECT bp.id, bp.title, bp.slug, bp.published, bp."createdAt", bp.authorid, u.name as "authorName"
             FROM blog_posts bp
             LEFT JOIN users u ON bp.authorid = u.id
             ORDER BY bp."createdAt" DESC
         `;
         const result = await pool.query(queryText);
         logger.info(`[${requestStartTime}] [GET /blogposts/list-admin] Fetched ${result.rows.length} total blog posts.`);
         res.status(200).json(result.rows);
     } catch (error) {
         logger.error({err: error}, `[${requestStartTime}] [GET /blogposts/list-admin] Error fetching posts`);
         res.status(500).json({ message: 'Error fetching posts for admin', error: error.message });
     }
});

// GET /:id - Get single post by ID (Admin only - needed for edit form)
// Using same path as public but requiring auth/admin here
router.get('/:id(\\d+)', auth, isAdmin, async (req, res) => {
    const requestStartTime = new Date().toISOString();
    const postId = parseInt(req.params.id, 10);
    logger.info(`[${requestStartTime}] [GET /blogposts/:id] Admin request received for ID: ${postId}`);

    if (isNaN(postId)) return res.status(400).json({ message: 'Invalid Post ID format' });

    try {
         logger.debug(`Attempting admin DB query for blog ID: ${postId}`);
         // Select all needed fields for editing, join for author name
         const queryText = `
             SELECT bp.id, bp.title, bp.slug, bp.content, bp.authorid, bp.published, bp."createdAt", bp."updatedAt", u.name as "authorName"
             FROM blog_posts bp
             LEFT JOIN users u ON bp.authorid = u.id
             WHERE bp.id = $1
         `; // Don't filter by published for admin access by ID
         const result = await pool.query(queryText, [postId]);

         if (result.rows.length === 0) {
             logger.warn(`[${requestStartTime}] Admin blog post NOT FOUND for ID: ${postId}`);
             return res.status(404).json({ message: 'Blog post not found.' });
         }

        const post = result.rows[0];
        logger.info({ postId: post.id }, `[${requestStartTime}] Admin blog post found for ID: ${postId}`);
        res.status(200).json(post);

    } catch (error) {
        logger.error({ err: error, postId }, `[${requestStartTime}] Error fetching admin blog post ID ${postId}`);
        res.status(500).json({ message: 'Error getting blog post', error: error.message });
    }
});


// === PUBLIC ROUTES (No auth required) ===

// GET / - Get all PUBLISHED blog posts (Public) - ADDED SLUG & Author Name
router.get('/', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts] Public request received.`);
    try {
        logger.debug("Executing public blog list query (published only)");
        // Added slug, JOIN to get author name
        const queryText = `
            SELECT bp.id, bp.title, bp.slug, bp.content, bp.authorid, bp.published, bp."createdAt", bp."updatedAt", u.name as "authorName"
            FROM blog_posts bp
            LEFT JOIN users u ON bp.authorid = u.id
            WHERE bp.published = true
            ORDER BY bp."createdAt" DESC
        `;
        const result = await pool.query(queryText);
        logger.info(`[${requestStartTime}] Found ${result.rows.length} published blog posts.`);
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error({err: error}, `[${requestStartTime}] Error fetching published blog posts`);
        res.status(500).json({ message: 'Error getting blog posts', error: error.message });
    }
});

// GET /slug/:slug - Get a single PUBLISHED post by SLUG (Public) - ADDED Author Name
router.get('/slug/:slug', async (req, res) => {
    const requestedSlug = req.params.slug;
    const requestStartTime = new Date().toISOString();
    logger.info(`[${requestStartTime}] [GET /blogposts/slug/:slug] Public request received for slug: ${requestedSlug}`);

    if (!requestedSlug) return res.status(400).json({ message: 'Invalid slug parameter.' });

    try {
        logger.debug(`Attempting public DB query for blog slug: ${requestedSlug}`);
        // Added JOIN to get author name, check published status
        const queryText = `
            SELECT bp.id, bp.title, bp.slug, bp.content, bp.authorid, bp.published, bp."createdAt", bp."updatedAt", u.name as "authorName"
            FROM blog_posts bp
            LEFT JOIN users u ON bp.authorid = u.id
            WHERE bp.slug = $1 AND bp.published = true
            LIMIT 1
        `;
        const result = await pool.query(queryText, [requestedSlug]);

        if (result.rows.length === 0) {
            logger.warn(`[${requestStartTime}] Public blog post NOT FOUND or not published for slug: ${requestedSlug}`);
            return res.status(404).json({ message: 'Blog post not found or not published.' });
        }

        const post = result.rows[0];
        logger.info({ postId: post.id }, `[${requestStartTime}] Public blog post found for slug: ${requestedSlug}`);
        res.status(200).json(post);

    } catch (error) {
        logger.error({ err: error, slug: requestedSlug }, `[${requestStartTime}] Error fetching published blog post by slug`);
        res.status(500).json({ message: 'Error getting blog post', error: error.message });
    }
});

// --- Keep module.exports ---
module.exports = router;
