import { NextResponse, type NextRequest } from 'next/server';
import { config as dashboardConfig } from './lib/config';
import { authApi, FinStackError } from './lib/finstack/auth-api';
import { SESSION_COOKIE, sessionCookieOptions } from './lib/session/cookie';
import { createRefresher, needsRefresh } from './lib/session/refresh';
import { sealSession, unsealSession } from './lib/session/seal';

const refresh = createRefresher((token) =>
  authApi(dashboardConfig().finstackUrl).refresh(token),
);

function toLogin(request: NextRequest, expired: boolean): NextResponse {
  const url = new URL('/login', request.url);
  if (expired) url.searchParams.set('expired', '1');
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

/**
 * Before every dashboard page: no session goes to sign-in, and an access
 * token about to expire is refreshed here, the one place the rotated
 * session can be saved before the page renders. Pages still check the
 * session themselves (src/lib/dal.ts).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const settings = dashboardConfig();
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await unsealSession(sealed, settings.sessionKey);
  if (!session) return toLogin(request, Boolean(sealed));
  if (!needsRefresh(session, Date.now())) return NextResponse.next();

  let renewed;
  try {
    renewed = await refresh(session);
  } catch (error) {
    if (error instanceof FinStackError && error.status === 401) {
      return toLogin(request, true); // revoked, expired or reused
    }
    // FinStack unreachable: let the page show it rather than signing out.
    return NextResponse.next();
  }

  const value = await sealSession(renewed, settings.sessionKey);
  // The page rendering this request must see the new tokens too.
  request.cookies.set(SESSION_COOKIE, value);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, value, sessionCookieOptions(settings, renewed));
  return response;
}

export const config = {
  // Everything except sign-in, Next.js assets and static files.
  matcher: [
    '/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)',
  ],
};
