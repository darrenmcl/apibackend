const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined, // Optional
});

// Toggle this flag to true to mock replies without OpenAI
const USE_MOCK_REPLY = false;

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing message input.' });
  }

  // Fallback mock mode (helpful during dev or quota issues)
  if (USE_MOCK_REPLY) {
    const mockReply = `Sure! Here's a joke: Why did the developer go broke? Because he used up all his cache. 💸`;
    return res.json({ reply: mockReply });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'No reply generated.';
    res.json({ reply });

  } catch (error) {
    console.error('[Chat Error]', error);

    const userFriendlyMessage =
      error.code === 'insufficient_quota'
        ? '⚠️ API quota exceeded. Please try again later.'
        : '⚠️ Something went wrong with the AI response.';

    res.status(500).json({ error: userFriendlyMessage });
  }
});

module.exports = router;
