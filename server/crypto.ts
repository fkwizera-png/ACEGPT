import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const algorithm = 'aes-256-gcm';
const secret = process.env.ACEGPT_SECRET_KEY ?? 'dev-secret-change-me';

const deriveKey = (input: string) => createHash('sha256').update(input).digest();

export const encryptText = (value: string) => {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptText = (cipherText: string) => {
  const [ivHex, tagHex, valueHex] = cipherText.split(':');
  if (!ivHex || !tagHex || !valueHex) return null;

  try {
    const key = deriveKey(secret);
    const decipher = createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(valueHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
};
