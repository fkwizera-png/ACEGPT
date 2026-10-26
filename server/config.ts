import path from 'node:path';
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  model: process.env.ACEGPT_MODEL ?? 'gemini-1.5-flash',
  secretKey: process.env.ACEGPT_SECRET_KEY ?? 'dev-secret-change-me',
  dataDir: process.env.ACEGPT_DATA_DIR ?? path.resolve(process.cwd(), 'server', 'data'),
};
