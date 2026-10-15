import { describe, expect, it, vi } from 'vitest';
import { createRefresher, needsRefresh, REUSE_RESULT_MS } from './refresh';
import type { Session, TokenPair } from './types';

const session = (refreshToken = 'r1'): Session => ({
  user: { id: 'u1', email: 'a@x', firstName: 'A', lastName: 'B', role: 'admin' },
  accessToken: 'a1',
  accessExpiresAt: 0,
  refreshToken,
  expiresAt: Date.now() + 3_600_000,
});

function setup() {
  let clock = 1_000_000;
  let issued = 0;
  const refresh = vi.fn(async (token: string): Promise<TokenPair> => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    issued += 1;
    return { accessToken: `a-${token}-${issued}`, accessTokenExpiresIn: 900, refreshToken: `r-${issued}` };
  });
  const refresher = createRefresher(refresh, () => clock);
  return { refresh, refresher, advance: (ms: number) => (clock += ms) };
}

describe('createRefresher', () => {
  it('makes one FinStack call for concurrent refreshes of one token', async () => {
    const { refresh, refresher } = setup();
    const results = await Promise.all(Array.from({ length: 5 }, () => refresher(session())));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Set(results.map((s) => s.refreshToken))).toEqual(new Set(['r-1']));
    expect(results[0]?.accessExpiresAt).toBe(1_000_000 + 900_000);
  });

  it('gives late requests with the old token the same result, never reusing it', async () => {
    const { refresh, refresher, advance } = setup();
    await refresher(session());
    advance(REUSE_RESULT_MS - 1);
    expect((await refresher(session())).refreshToken).toBe('r-1');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes the new token normally', async () => {
    const { refresh, refresher } = setup();
    const first = await refresher(session());
    await refresher(first);
    expect(refresh).toHaveBeenNthCalledWith(2, 'r-1');
  });

  it('does not remember failures', async () => {
    const refresh = vi
      .fn<(token: string) => Promise<TokenPair>>()
      .mockRejectedValueOnce(new Error('FinStack down'))
      .mockResolvedValueOnce({ accessToken: 'a', accessTokenExpiresIn: 900, refreshToken: 'r2' });
    const refresher = createRefresher(refresh);
    await expect(refresher(session())).rejects.toThrow('FinStack down');
    await expect(refresher(session())).resolves.toMatchObject({ refreshToken: 'r2' });
  });
});

describe('needsRefresh', () => {
  it('refreshes within a minute of expiry', () => {
    const s = { ...session(), accessExpiresAt: 100_000 };
    expect(needsRefresh(s, 30_000)).toBe(false);
    expect(needsRefresh(s, 50_000)).toBe(true);
  });
});
