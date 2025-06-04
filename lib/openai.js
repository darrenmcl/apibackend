const OpenAI = require('openai');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection for RAG
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Separate client for embeddings
const embeddingClient = new OpenAI({
  apiKey: process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
});

async function getEmbedding(text) {
  try {
    const response = await embeddingClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[RAG ERROR] Failed to get embedding:', error.message);
    return null;
  }
}

async function getRAGContext(userMessage) {
  try {
    console.log(`[RAG] Retrieving context for: "${userMessage}"`);
    
    const userEmbedding = await getEmbedding(userMessage);
    if (!userEmbedding) {
      console.log('[RAG] No embedding generated, skipping RAG');
      return '';
    }

    const result = await pool.query(
      `SELECT content, embedding <-> $1 as distance 
       FROM rag_documents 
       WHERE embedding IS NOT NULL
       ORDER BY embedding <-> $1 
       LIMIT 3`,
      [JSON.stringify(userEmbedding)]
    );

    if (result.rows.length === 0) {
      console.log('[RAG] No relevant documents found');
      return '';
    }

    result.rows.forEach((row, index) => {
      console.log(`[RAG] Match ${index + 1}: distance=${row.distance.toFixed(4)}, content="${row.content.substring(0, 100)}..."`);
    });

    const context = result.rows.map(r => r.content).join('\n\n---\n\n');
    console.log(`[RAG] Retrieved ${result.rows.length} documents for context`);
    return context;
    
  } catch (error) {
    console.error('[RAG ERROR] Failed to get context:', error.message);
    return '';
  }
}

async function askOpenAI({ message, systemPrompt, useRAG = true }) {
  let enhancedSystemPrompt = systemPrompt;
  let ragContext = '';
  
  if (useRAG) {
    ragContext = await getRAGContext(message);
    if (ragContext) {
      console.log('[RAG DEBUG] Context being sent to AI:');
      console.log('='.repeat(60));
      console.log(ragContext);
      console.log('='.repeat(60));
      
      enhancedSystemPrompt = `${systemPrompt}

CRITICAL: Use ONLY the phone number (440) 306-3081 from the context below.

CONTEXT:
${ragContext}

STRICT RULES:
- When asked for phone numbers, use ONLY: (440) 306-3081
- DO NOT create fake 1-800 numbers
- Use the exact information from the context above`;
    }
  }

  console.log(`[Chat] Processing message with ${useRAG && ragContext ? 'RAG context' : 'no RAG context'}`);
  console.log('[OpenAI DEBUG] Using direct fetch...');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    console.log('[OpenAI DEBUG] Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[OpenAI DEBUG] SUCCESS with direct fetch');
      return data.choices[0].message.content.trim();
    } else {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('[OpenAI DEBUG] Direct fetch failed:', error.message);
    throw error;
  }
}

module.exports = { askOpenAI };
