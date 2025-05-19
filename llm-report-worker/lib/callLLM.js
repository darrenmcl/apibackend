const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function callLLM(prompt, model = 'openai/gpt-4-turbo', systemMessage = null) {
  const messages = [];
  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = callLLM;
