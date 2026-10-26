import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../server/index';

describe('AceGPT health and status endpoints', () => {
  it('exposes a healthy server', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns a status payload with tool information', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('configured');
    expect(res.body).toHaveProperty('tooling');
  });

  it('rejects missing API keys cleanly', async () => {
    const res = await request(app).post('/api/connect').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});
