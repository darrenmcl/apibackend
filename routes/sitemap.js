// /routes/sitemap.js

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../lib/logger');

// =======================
// 📦 PUBLIC: Fetch PRODUCTS for Sitemap
// =======================
router.get('/products', async (req, res) => {
  try {
    const query = `
      SELECT slug, updated_at, created_at
      FROM products
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    `;
    const result = await db.query(query);

    const safeProducts = result.rows.map((product) => ({
      slug: product.slug,
      updated_at: product.updated_at || product.created_at || new Date().toISOString(),
    }));

    res.status(200).json(safeProducts);
  } catch (error) {
    logger.error({ err: error }, '[Sitemap] Error fetching products for sitemap');
    res.status(500).json({ message: 'Error fetching products for sitemap' });
  }
});

// =======================
// 📚 PUBLIC: Fetch BLOG POSTS for Sitemap
// =======================
router.get('/blogposts', async (req, res) => {
  try {
    const query = `
      SELECT slug, "updatedAt", "createdAt"
      FROM blog_posts
      WHERE published = true
      ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC
    `;
    const result = await db.query(query);

    const safeBlogPosts = result.rows.map((post) => ({
      slug: post.slug,
      updated_at: post.updatedAt || post.createdAt || new Date().toISOString(),
    }));

    res.status(200).json(safeBlogPosts);
  } catch (error) {
    logger.error({ err: error }, '[Sitemap] Error fetching blog posts for sitemap');
    res.status(500).json({ message: 'Error fetching blog posts for sitemap' });
  }
});

// =======================
// 🗂️ PUBLIC: Fetch CATEGORIES for Sitemap
// =======================
// 📦 PUBLIC: Fetch CATEGORIES for Sitemap
// 📦 PUBLIC: Fetch CATEGORIES for Sitemap
router.get('/categories', async (req, res) => {
  try {
    const query = `
      SELECT slug, created_at
      FROM categories
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);

    const safeCategories = result.rows.map((category) => ({
      slug: category.slug,
      updated_at: category.created_at || new Date().toISOString(), // use created_at
    }));

    res.status(200).json(safeCategories);
  } catch (error) {
    logger.error({ err: error }, '[Sitemap] Error fetching categories for sitemap');
    res.status(500).json({ message: 'Error fetching categories for sitemap' });
  }
});

module.exports = router;
