const db = require('../config/db');

/**
 * Fetch and interpolate prompts for a product.
 */
async function fetchPrompts(productId, context = {}) {
  const result = await db.query(`
    SELECT section_key, prompt_text, llm_model, system_message
    FROM prompts
    WHERE product_id = $1 AND is_active = true
  `, [productId]);

  const prompts = {};
  for (const row of result.rows) {
    let filled = row.prompt_text;
    for (const [key, val] of Object.entries(context)) {
      filled = filled.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), val);
    }
    prompts[row.section_key] = {
      text: filled,
      model: row.llm_model || 'openai/gpt-4-turbo',
      systemMessage: row.system_message || null
    };
  }

  return prompts;
}

module.exports = fetchPrompts;
