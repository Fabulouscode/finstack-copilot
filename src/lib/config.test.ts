import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const secret = Buffer.alloc(32, 7).toString('base64');

describe('loadConfig', () => {
  it('reads a valid setup', () => {
    const config = loadConfig({ FINSTACK_API_URL: 'http://localhost:3000/', SESSION_SECRET: secret, NODE_ENV: 'development' });
    expect(config).toMatchObject({ finstackUrl: 'http://localhost:3000', sessionMaxAgeSeconds: 8 * 3600, secureCookies: false });
  });

  it('refuses unsafe settings', () => {
    expect(() => loadConfig({ SESSION_SECRET: secret, NODE_ENV: 'test' })).toThrow(/FINSTACK_API_URL/);
    expect(() => loadConfig({ FINSTACK_API_URL: 'http://api.example.com', SESSION_SECRET: secret, NODE_ENV: 'production' })).toThrow(/https/);
    expect(() => loadConfig({ FINSTACK_API_URL: 'https://api.example.com', NODE_ENV: 'production' })).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ FINSTACK_API_URL: 'https://api.example.com', SESSION_SECRET: secret, SESSION_MAX_AGE_HOURS: '72', NODE_ENV: 'production' })).toThrow(/SESSION_MAX_AGE_HOURS/);
  });

  it('uses secure cookies in production', () => {
    expect(loadConfig({ FINSTACK_API_URL: 'https://api.example.com', SESSION_SECRET: secret, NODE_ENV: 'production' }).secureCookies).toBe(true);
  });
});
