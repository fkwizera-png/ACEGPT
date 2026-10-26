import { Router } from 'express';
import { config } from './config.js';
import { readCredential, clearCredential, saveCredential } from './storage.js';
import { toolCapabilities, validateGeminiKey, createGeminiClient } from './gemini.js';

export const router = Router();

router.get('/status', async (_req, res) => {
  const savedKey = await readCredential();
  res.json({
    configured: Boolean(savedKey),
    model: config.model,
    tooling: toolCapabilities,
  });
});

router.post('/connect', async (req, res) => {
  const { apiKey } = req.body ?? {};
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'A Gemini API key is required.' });
  }

  try {
    const validation = await validateGeminiKey(apiKey.trim());
    await saveCredential(apiKey.trim());
    return res.status(200).json({ ok: true, message: validation.message });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to validate the key.' });
  }
});

router.post('/test-connection', async (req, res) => {
  const { apiKey } = req.body ?? {};
  const keyToCheck = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : await readCredential();

  if (!keyToCheck) {
    return res.status(400).json({ error: 'No Gemini API key was provided or stored.' });
  }

  try {
    const validation = await validateGeminiKey(keyToCheck);
    return res.status(200).json({ ok: true, message: validation.message });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unable to validate the key.' });
  }
});

router.post('/disconnect', async (_req, res) => {
  await clearCredential();
  res.status(200).json({ ok: true, message: 'Disconnected successfully.' });
});

router.post('/chat', async (req, res) => {
  const savedKey = await readCredential();
  if (!savedKey) {
    return res.status(401).json({ error: 'No Gemini API key is connected.' });
  }

  const { messages, model } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'A chat request requires an array of messages.' });
  }

  try {
    const ai = createGeminiClient(savedKey);
    const generationModel = ai.getGenerativeModel({
      model: model || config.model,
      systemInstruction: 'You are AceGPT, a helpful, concise, and safe AI assistant. Answer clearly and do not invent unavailable tools or sources.',
    });

    const payload = messages
      .filter((msg: any) => msg && typeof msg.content === 'string')
      .map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    const result = await generationModel.generateContent({ contents: payload });
    const responseText = result.response.text();
    return res.status(200).json({ ok: true, reply: responseText });
  } catch (error: any) {
    const message = error?.message ?? 'Gemini failed to answer the request.';
    return res.status(502).json({ error: message });
  }
});
