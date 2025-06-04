// scripts/test-retrieval.js
require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

const embeddingClient = new OpenAI({
  apiKey: process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
});

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
});

async function getEmbedding(text) {
  const response = await embeddingClient.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

async function testRetrieval(query) {
  console.log(`🔍 Testing retrieval for: "${query}"`);
  console.log('='.repeat(60));
  
  try {
    // Get embedding for the query
    console.log('🔄 Getting embedding for query...');
    const queryEmbedding = await getEmbedding(query);
    console.log('✅ Got query embedding');
    
    // Search for similar documents
    console.log('🔄 Searching for similar documents...');
    const result = await pool.query(`
      SELECT 
        id, 
        content,
        embedding <-> $1 as distance
      FROM rag_documents 
      WHERE embedding IS NOT NULL
      ORDER BY embedding <-> $1 
      LIMIT 5
    `, [JSON.stringify(queryEmbedding)]);
    
    console.log(`\n📋 Found ${result.rows.length} similar documents:`);
    console.log('='.repeat(60));
    
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Document ID: ${row.id}`);
      console.log(`   Similarity Distance: ${parseFloat(row.distance).toFixed(4)} (lower = more similar)`);
      console.log(`   Content Preview:`);
      console.log(`   ${row.content.substring(0, 200)}${row.content.length > 200 ? '...' : ''}`);
      console.log('-'.repeat(40));
    });
    
    // Show the context that would be sent to AI
    const context = result.rows.map(r => r.content).join('\n\n---\n\n');
    console.log(`\n🧠 CONTEXT THAT WOULD BE SENT TO AI:`);
    console.log('='.repeat(60));
    console.log(context);
    console.log('='.repeat(60));
    
    // Check if the context contains phone number
    const hasPhoneNumber = context.toLowerCase().includes('phone') || 
                          context.includes('440') || 
                          context.includes('306-3081');
    
    console.log(`\n📞 Phone number found in context: ${hasPhoneNumber ? '✅ YES' : '❌ NO'}`);
    
    if (hasPhoneNumber) {
      console.log('🎉 SUCCESS: The RAG system should be able to provide the phone number!');
    } else {
      console.log('⚠️  WARNING: Phone number not found in retrieved context');
    }
    
  } catch (err) {
    console.error('❌ Error during retrieval test:', err.message);
    if (err.stack) {
      console.error('Stack trace:', err.stack);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting RAG Retrieval Test');
    console.log(`📊 Database: localhost:5433/postgres`);
    console.log(`🔗 Embedding API: ${process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1'}`);
    console.log('\n');
    
    // Test with the exact query the user asked
    await testRetrieval("What is the phone number for Performance Marketing Group?");
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test with a simpler query
    await testRetrieval("phone number");
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test with company name
    await testRetrieval("Performance Marketing Group contact");
    
    await pool.end();
    console.log('\n✅ Test complete!');
    
  } catch (err) {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  }
}

main();
