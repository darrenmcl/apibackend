// scripts/embed-rag-docs.js

require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

const pool = new Pool(); // Uses PG env vars

async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002', // Or 'text-embedding-3-small' for OpenAI
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[Embed ERROR] Failed to get embedding:', error.message);
    throw error;
  }
}

async function runEmbedding() {
  const { rows } = await pool.query(
    `SELECT id, content FROM rag_documents WHERE embedding IS NULL ORDER BY id`
  );

  if (rows.length === 0) {
    console.log('✅ No unembedded documents found.');
    return;
  }

  console.log(`🧠 Found ${rows.length} documents needing embeddings.`);

  for (const row of rows) {
    try {
      const embedding = await getEmbedding(row.content);
      await pool.query(
        `UPDATE rag_documents SET embedding = $1 WHERE id = $2`,
        [embedding, row.id]
      );
      console.log(`✅ Embedded doc #${row.id}`);
    } catch (err) {
      console.error(`❌ Failed to embed doc #${row.id}: ${err.message}`);
    }
  }

  console.log('🚀 Embedding complete.');
}

runEmbedding().catch((err) => {
  console.error('[FATAL] Embedding script crashed:', err);
  process.exit(1);
});
