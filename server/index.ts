import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config.js';
import { router } from './routes.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/api', router);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, status: 'healthy' });
});

const startServer = () => {
  app.listen(config.port, () => {
    console.log(`AceGPT server listening on http://localhost:${config.port}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { startServer };
