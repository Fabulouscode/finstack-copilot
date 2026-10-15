import type { Session, TokenPair } from './types';

/** Refresh this long before the access token expires. */
export const REFRESH_AHEAD_MS = 60_000;
/**
 * How long a refresh's result is kept for requests still carrying the old
 * refresh token (sent by the browser before the new cookie arrived).
 */
export const REUSE_RESULT_MS = 60_000;

export function needsRefresh(session: Session, now: number): boolean {
  return session.accessExpiresAt - now < REFRESH_AHEAD_MS;
}

/**
 * Refreshes sessions without ever using a refresh token twice. FinStack
 * rotates refresh tokens and treats reuse of an old one as theft, ending
 * every session of that user. Browsers send several requests at once, so
 * concurrent refreshes of one token share a single call, and requests that
 * arrive just after with the old token get its result.
 *
 * In memory: correct for one dashboard server. Several servers need sticky
 * sessions or a shared store (see the README).
 */
export function createRefresher(
  refresh: (refreshToken: string) => Promise<TokenPair>,
  now: () => number = Date.now,
): (session: Session) => Promise<Session> {
  const inFlight = new Map<string, Promise<Session>>();
  const recent = new Map<string, { session: Session; at: number }>();

  return (session) => {
    const token = session.refreshToken;
    const done = recent.get(token);
    if (done && now() - done.at < REUSE_RESULT_MS) {
      return Promise.resolve(done.session);
    }
    const pending = inFlight.get(token);
    if (pending) return pending;

    const run = refresh(token)
      .then((pair): Session => {
        const next: Session = {
          ...session,
          accessToken: pair.accessToken,
          accessExpiresAt: now() + pair.accessTokenExpiresIn * 1000,
          refreshToken: pair.refreshToken,
        };
        for (const [key, value] of recent) {
          if (now() - value.at >= REUSE_RESULT_MS) recent.delete(key);
        }
        recent.set(token, { session: next, at: now() });
        return next;
      })
      .finally(() => inFlight.delete(token));
    inFlight.set(token, run);
    return run;
  };
}
