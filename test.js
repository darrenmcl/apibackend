// Test file: test-openai-bypass.js
// Run with: node test-openai-bypass.js

require('dotenv').config();

async function testDirectCall() {
  console.log('Testing direct OpenAI call...');
  console.log('API Key available:', !!process.env.OPENAI_API_KEY);
  console.log('API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
  
  try {
    // Use direct HTTP call instead of OpenAI SDK
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, just testing!' }
        ],
        max_tokens: 10
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS:', data.choices[0].message.content);
    } else {
      const errorText = await response.text();
      console.log('❌ ERROR Response:', errorText);
    }
  } catch (error) {
    console.error('❌ FETCH ERROR:', error.message);
  }
}

testDirectCall();
