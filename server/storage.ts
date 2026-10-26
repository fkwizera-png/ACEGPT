import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { decryptText, encryptText } from './crypto.js';

const storePath = path.join(config.dataDir, 'credentials.json');

const ensureFile = async () => {
  await mkdir(path.dirname(storePath), { recursive: true });
  try {
    await access(storePath);
  } catch {
    await writeFile(storePath, JSON.stringify({ apiKey: null }), 'utf8');
  }
};

export const saveCredential = async (apiKey: string) => {
  await ensureFile();
  const encrypted = encryptText(apiKey);
  await writeFile(storePath, JSON.stringify({ apiKey: encrypted }, null, 2), 'utf8');
};

export const readCredential = async () => {
  await ensureFile();
  const text = await readFile(storePath, 'utf8');
  const parsed = JSON.parse(text) as { apiKey?: string | null };
  if (!parsed.apiKey) return null;

  const decrypted = decryptText(parsed.apiKey);
  return decrypted ?? null;
};

export const clearCredential = async () => {
  await ensureFile();
  await writeFile(storePath, JSON.stringify({ apiKey: null }, null, 2), 'utf8');
};
