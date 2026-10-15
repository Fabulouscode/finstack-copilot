import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sealSession, sessionKey, unsealSession } from './seal';
import type { Session } from './types';

const key = () => new Uint8Array(randomBytes(32));
const session = (overrides: Partial<Session> = {}): Session => ({
  user: { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'L', role: 'support' },
  accessToken: 'access-token',
  accessExpiresAt: Date.now() + 900_000,
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3_600_000,
  ...overrides,
});

describe('session sealing', () => {
  it('round-trips a session', async () => {
    const k = key();
    const original = session();
    await expect(unsealSession(await sealSession(original, k), k)).resolves.toEqual(original);
  });

  it('keeps the tokens unreadable without the key', async () => {
    const sealed = await sealSession(session(), key());
    const decoded = sealed
      .split('.')
      .map((part) => Buffer.from(part, 'base64url').toString('latin1'))
      .join(' ');
    expect(decoded).not.toContain('refresh-token');
    expect(decoded).not.toContain('access-token');
    expect(decoded).not.toContain('ada@example.com');
  });

  it('rejects another key, tampering, expiry and junk', async () => {
    const k = key();
    const sealed = await sealSession(session(), k);
    await expect(unsealSession(sealed, key())).resolves.toBeNull();

    const parts = sealed.split('.');
    parts[3] = Buffer.from('tampered'.repeat(4)).toString('base64url');
    await expect(unsealSession(parts.join('.'), k)).resolves.toBeNull();

    const expired = await sealSession(session({ expiresAt: Date.now() - 1000 }), k);
    await expect(unsealSession(expired, k)).resolves.toBeNull();

    await expect(unsealSession('not-a-session', k)).resolves.toBeNull();
    await expect(unsealSession(undefined, k)).resolves.toBeNull();
  });

  it('insists on a 32-byte secret', () => {
    expect(() => sessionKey(undefined)).toThrow(/SESSION_SECRET/);
    expect(() => sessionKey(Buffer.alloc(16).toString('base64'))).toThrow(/SESSION_SECRET/);
    expect(sessionKey(Buffer.alloc(32, 1).toString('base64'))).toHaveLength(32);
  });
});
