const pool = require('../config/db');

// Get all blog posts
const getAllBlogPosts = async () => {
  const { rows } = await pool.query(
    'SELECT * FROM blog_posts ORDER BY created_at DESC'
  );
  return rows;
};

// Get a single blog post by ID
const getBlogPostById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM blog_posts WHERE id = $1',
    [id]
  );
  return rows[0];
};

// Create a new blog post
const createBlogPost = async ({ title, content, author }) => {
  const { rows } = await pool.query(
    `INSERT INTO blog_posts (title, content, author, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
    [title, content, author]
  );
  return rows[0];
};

// Update an existing blog post
const updateBlogPost = async (id, { title, content, author }) => {
  const { rows } = await pool.query(
    `UPDATE blog_posts
     SET title = $1, content = $2, author = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [title, content, author, id]
  );
  return rows[0];
};

// Delete a blog post
const deleteBlogPost = async (id) => {
  await pool.query(
    'DELETE FROM blog_posts WHERE id = $1',
    [id]
  );
  return true;
};

module.exports = {
  getAllBlogPosts,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost
};
