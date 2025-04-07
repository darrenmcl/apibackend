const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { askOpenAI } = require('../lib/openai');
const { publishToChatQueue } = require('../lib/rabbit');

const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/sitePrompts.json'), 'utf-8'));

router.post('/', async (req, res) => {
  const { message, domain } = req.body;
  const sanitizedDomain = domain?.replace(/^www\./, '').toLowerCase();
  const systemPrompt = prompts[sanitizedDomain] || 'You are Ian, a general helpful assistant.';

  console.log(`[Chat] Incoming message from ${sanitizedDomain}: ${message}`);

  try {
    const reply = await askOpenAI({ message, systemPrompt });

    if (publishToChatQueue) {
      publishToChatQueue({ message, domain: sanitizedDomain });
    }

    res.json({ reply });
  } catch (err) {
    console.error('[Chat] Error:', err);
    res.status(500).json({ reply: '⚠️ Ian is having technical trouble at the moment.' });
  }
});

module.exports = router;
