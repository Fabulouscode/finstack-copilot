import 'server-only';
import createClient from 'openapi-fetch';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { config } from './config';
import { problemFrom } from './finstack/auth-api';
import type { paths } from './finstack/schema';
import { SESSION_COOKIE } from './session/cookie';
import { unsealSession } from './session/seal';
import type { Session } from './session/types';

/**
 * The data access layer: every page and action reads the session and calls
 * FinStack through here, so authorisation never depends on the proxy alone.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  return unsealSession(sealed, config().sessionKey);
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** Shown instead of the page when your organization role lacks a permission. */
export class ForbiddenError extends Error {
  constructor() {
    super('Your role in this organization does not allow this. Ask its owner if you need access.');
    this.name = 'ForbiddenError';
  }
}

/** A typed FinStack client acting as the signed-in person. */
export async function finstack() {
  const session = await requireSession();
  const client = createClient<paths>({
    baseUrl: config().finstackUrl,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  });
  client.use({
    async onResponse({ response }) {
      if (response.status === 401) redirect('/login?expired=1');
      if (response.status === 403) throw new ForbiddenError();
      if (!response.ok) throw await problemFrom(response.clone());
      return response;
    },
  });
  return client;
}
