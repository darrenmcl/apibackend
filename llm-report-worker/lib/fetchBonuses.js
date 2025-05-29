// lib/fetchBonuses.js
const db = require('../config/db');

async function fetchBonuses(productId) {
  if (!productId) return [];

  const result = await db.query(
    `SELECT title, description, access_link
     FROM product_bonuses
     WHERE product_id = $1
     ORDER BY sort_order`,
    [productId]
  );

  return result.rows || [];
}

module.exports = fetchBonuses;
