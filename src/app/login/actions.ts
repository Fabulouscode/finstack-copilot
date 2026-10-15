'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '@/lib/config';
import { authApi, FinStackError } from '@/lib/finstack/auth-api';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session/cookie';
import { sealSession, unsealSession } from '@/lib/session/seal';
import type { Session } from '@/lib/session/types';

export interface SignInState {
  error?: string;
  email?: string;
}

export async function signIn(
  _previous: SignInState,
  form: FormData,
): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) {
    return { error: 'Enter your email and password.', email };
  }

  const settings = config();
  const auth = authApi(settings.finstackUrl);
  let result;
  try {
    result = await auth.login(email, password);
  } catch (error) {
    if (error instanceof FinStackError && error.status === 401) {
      return { error: 'That email and password don’t match.', email };
    }
    if (error instanceof FinStackError && error.status === 429) {
      return { error: 'Too many attempts. Wait a minute and try again.', email };
    }
    return { error: 'FinStack is unavailable. Try again shortly.', email };
  }

  const now = Date.now();
  const session: Session = {
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
    },
    accessToken: result.tokens.accessToken,
    accessExpiresAt: now + result.tokens.accessTokenExpiresIn * 1000,
    refreshToken: result.tokens.refreshToken,
    expiresAt: now + settings.sessionMaxAgeSeconds * 1000,
  };
  (await cookies()).set(
    SESSION_COOKIE,
    await sealSession(session, settings.sessionKey),
    sessionCookieOptions(settings, session),
  );
  redirect('/');
}

export async function signOut(): Promise<void> {
  const settings = config();
  const store = await cookies();
  const session = await unsealSession(
    store.get(SESSION_COOKIE)?.value,
    settings.sessionKey,
  );
  if (session) {
    // Revoke at FinStack too, so the refresh token can't be used again.
    await authApi(settings.finstackUrl)
      .logout(session.refreshToken)
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
