import type { DashboardConfig } from '../config';
import type { Session } from './types';

export const SESSION_COOKIE = 'finstack_copilot_session';

/** httpOnly (no JavaScript access), Secure in production, ends with the session. */
export function sessionCookieOptions(config: DashboardConfig, session: Session) {
  return {
    httpOnly: true,
    secure: config.secureCookies,
    // Lax: sent when following a link to the dashboard, never on cross-site
    // form posts. Server Actions also check the Origin header.
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
  };
}
