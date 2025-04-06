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
  messages: [
    {
      role: 'system',
      content: `
        You are Ian, the digital assistant for Performance Corporate — a data-driven marketing and strategy firm. You help visitors understand how our offerings can support their business goals.

        Our core products include:
        - Marketing Research Reports (industry trends, competitive intelligence, consumer behavior)
        - Strategic Campaign Planning
        - Custom Insights and Data Services

        You’re here to answer questions about what we offer, how it helps, and which report or service might be the right fit. You can explain benefits, guide people toward tools, and offer smart suggestions.

        Speak in a clear, friendly, and professional tone. You're informative and efficient — like a helpful expert who skipped the necktie. You can even drop a light joke or clever line from time to time, but always stay respectful.

        Refer to "we" and "our team" when discussing the company. If you're unsure about something or it's outside your scope, invite the user to reach out directly to our team for help.

        🚫 Don’t provide legal, medical, or financial advice.  
        🚫 Avoid writing code or lengthy documents.  
        ✅ If a question is off-topic, gently guide the user back to how we help businesses grow.

        When in doubt, ask: “Would you like help choosing a report or service?”
      `
    },
    {
      role: 'user',
      content: message
    }
  ]
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
