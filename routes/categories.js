// /var/projects/backend-api/routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Assuming same db config


// *** ADD THIS ROUTE HANDLER ***
// GET all categories (public)
router.get('/', async (req, res) => {
    const requestStartTime = new Date().toISOString();
    console.log(`[${requestStartTime}] [GET /categories] Request received.`);
    try {
        console.log(`[${requestStartTime}] [GET /categories] Attempting DB query...`);
        const dbQueryStartTime = Date.now();
        // Select necessary fields - add 'image' if your categories table has it
        const query = `
            SELECT id, name, slug, description
            FROM categories
            ORDER BY name ASC`; // Order alphabetically for consistent display
        const result = await db.query(query);
        const dbQueryDuration = Date.now() - dbQueryStartTime;

        console.log(`[${requestStartTime}] [GET /categories] DB query successful (${dbQueryDuration}ms). Found ${result.rows.length} categories.`);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error(`[${requestStartTime}] [GET /categories] Error fetching categories:`, error);
        res.status(500).json({ message: 'Server error fetching categories.' });
    }
});
// *** END OF ADDED ROUTE HANDLER ***



// GET category details by slug (public)
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
            console.log(`[<span class="math-inline">\{requestStartTime\}\] \[GET /categories/slug/\:slug\] DB query successful \(</span>{dbQueryDuration}ms). Category NOT FOUND for slug: ${requestedSlug}`);
            return res.status(404).json({ message: 'Category not found.' });
        }

        const category = result.rows[0];
        console.log(`[<span class="math-inline">\{requestStartTime\}\] \[GET /categories/slug/\:slug\] DB query successful \(</span>{dbQueryDuration}ms). Category FOUND: ID ${category.id}`);
        res.status(200).json(category);

    } catch (error) {
        console.error(`[<span class="math-inline">\{requestStartTime\}\] \[GET /categories/slug/\:slug\] Error fetching category by slug "</span>{requestedSlug}":`, error);
        res.status(500).json({ message: 'Server error fetching category.' });
    }
});

// Optional: Add other category routes if needed (GET all, POST, PUT, DELETE)
// router.get('/', async (req, res) => { ... });
// router.post('/', auth, isAdmin, async (req, res) => { ... }); // Remember auth/isAdmin

module.exports = router;
