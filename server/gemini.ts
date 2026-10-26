import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { config } from './config.js';

export const toolCapabilities = [
  { name: 'web-search', available: false, description: 'Requires a configured provider such as Google Custom Search or Tavily.' },
  { name: 'notes', available: true, description: 'Stored locally on the server for local development mode.' },
  { name: 'reminders', available: false, description: 'Requires an event scheduler and user auth in production.' },
];

export const validateGeminiKey = async (apiKey: string) => {
  if (!apiKey || !apiKey.startsWith('AIza')) {
    throw new Error('The API key format looks invalid. Gemini keys usually start with "AIza".');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model: GenerativeModel = client.getGenerativeModel({ model: config.model });

  try {
    await model.generateContent('Reply with only the word OK');
    return { ok: true, message: 'Connected successfully' };
  } catch (error: any) {
    const message = error?.message ?? 'The Gemini API rejected the key.';
    if (/quota|limit|429|exceeded/i.test(message)) {
      throw new Error('The Gemini key is valid, but the account has hit a quota or rate limit.');
    }

    if (/permission|forbidden|401|403/i.test(message)) {
      throw new Error('The Gemini key is not authorized for this environment or has been revoked.');
    }

    if (/timeout|network/i.test(message)) {
      throw new Error('The Gemini service timed out or is currently unavailable.');
    }

    throw new Error('The key could not be validated. Please double-check it and try again.');
  }
};

export const createGeminiClient = (apiKey: string) => new GoogleGenerativeAI(apiKey);
