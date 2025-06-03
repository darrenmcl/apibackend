// scripts/embed-rag-docs.js
require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// Separate OpenAI client specifically for embeddings
const embeddingClient = new OpenAI({
  apiKey: process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
});

// Smart configuration: detect if running in Docker or on host
const isDocker = process.env.NODE_ENV === 'docker' || process.env.DOCKER_ENV === 'true';
const dbConfig = {
  host: isDocker ? 'pgvector-db' : 'localhost',
  port: isDocker ? 5432 : 5433, // Internal port vs exposed port
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
};

console.log(`📊 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
console.log(`🤖 Using chat API: ${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}`);
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

async function getContext(userMessage) {
  try {
    const userEmbedding = await getEmbedding(userMessage);
    const result = await pool.query(
      "SELECT content FROM rag_documents ORDER BY embedding <-> $1 LIMIT 10",
      [userEmbedding]
    );

    const context = result.rows.map(r => r.content).join('\n\n---\n\n');
    console.log('[DEBUG] Retrieved Context:\n', context); // ✅ Debug context output
    return context;
  } catch (error) {
    console.error('[Worker ERROR] Failed to get context:', error.message);
    return 'No context available due to error.';
  }
}


async function runEmbedding() {
  try {
    // Test database connection first
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', testResult.rows[0].current_time);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Tip: Make sure PostgreSQL is running and accessible');
    throw err;
  }

  const { rows } = await pool.query(
    //`SELECT id, content FROM rag_documents WHERE embedding IS NULL ORDER BY id`
  `SELECT id, content FROM rag_documents WHERE id = 5`
 );
  
  if (rows.length === 0) {
    console.log('✅ No unembedded documents found.');
    return;
  }
  
  console.log(`🧠 Found ${rows.length} documents needing embeddings.`);
  
  for (const row of rows) {
    try {
      console.log(`🔄 Processing doc #${row.id}...`);
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
  await pool.end();
}

runEmbedding().catch((err) => {
  console.error('[FATAL] Embedding script crashed:', err);
  process.exit(1);
});
