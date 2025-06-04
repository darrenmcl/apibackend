// scripts/embed-rag-docs.js
require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

// Separate OpenAI client specifically for embeddings
const embeddingClient = new OpenAI({
  apiKey: process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
});

// Force localhost configuration for running from host, but read from .env
const dbConfig = {
  host: 'localhost',
  port: 5433,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
};

console.log(`📊 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
console.log(`🔗 Using embedding API: ${process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1'}`);

const pool = new Pool(dbConfig);

async function getEmbedding(text) {
  try {
    console.log(`🔄 Getting embedding for text (length: ${text.length} chars)`);
    
    const response = await embeddingClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    
    console.log(`✅ Got embedding vector (${response.data[0].embedding.length} dimensions)`);
    return response.data[0].embedding;
  } catch (error) {
    console.error('[Embed ERROR] Failed to get embedding:', error.message);
    if (error.response?.data) {
      console.error('API Error details:', error.response.data);
    }
    throw error;
  }
}

async function runEmbedding() {
  try {
    // Test database connection first
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', testResult.rows[0].current_time);
  } catch (err) {
    console.error('❌ Cannot connect to PostgreSQL:', err.message);
    console.error('💡 Make sure PostgreSQL container is running: docker-compose up -d pgvector-db');
    throw err;
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const idArg = args.find(arg => arg.startsWith('--id='));
  const specificId = idArg ? parseInt(idArg.split('=')[1]) : null;

  let query = `SELECT id, content FROM rag_documents WHERE embedding IS NULL`;
  let params = [];
  
  if (specificId) {
    query += ` AND id = $1`;
    params = [specificId];
    console.log(`🎯 Processing specific document ID: ${specificId}`);
  }
  
  query += ` ORDER BY id`;

  const { rows } = await pool.query(query, params);
  
  if (rows.length === 0) {
    if (specificId) {
      console.log(`❌ No document found with ID ${specificId} or it already has an embedding.`);
    } else {
      console.log('✅ No unembedded documents found.');
    }
    return;
  }
  
  console.log(`🧠 Found ${rows.length} document(s) needing embeddings.`);
  
  for (const row of rows) {
    try {
      console.log(`🔄 Processing doc #${row.id}...`);
      const embedding = await getEmbedding(row.content);
      
      // Format as PostgreSQL vector - just pass the array directly
      await pool.query(
        `UPDATE rag_documents SET embedding = $1 WHERE id = $2`,
        [`[${embedding.join(',')}]`, row.id]
      );
      console.log(`✅ Embedded doc #${row.id}`);
    } catch (err) {
      console.error(`❌ Failed to embed doc #${row.id}: ${err.message}`);
    }
  }
  
  console.log('🚀 Embedding complete.');
  await pool.end();
}

runEmbedding().catch((err) => {
  console.error('[FATAL] Embedding script crashed:', err);
  process.exit(1);
});
