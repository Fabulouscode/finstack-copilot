import type { SignedInUser, TokenPair } from '../session/types';

/** A FinStack error response (application/problem+json). */
export class FinStackError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'FinStackError';
  }
}

export async function problemFrom(response: Response): Promise<FinStackError> {
  const body = (await response.json().catch(() => ({}))) as {
    code?: string;
    detail?: string;
    title?: string;
  };
  return new FinStackError(
    response.status,
    body.code,
    body.detail ?? body.title ?? `FinStack answered ${response.status}`,
  );
}

/** FinStack's sign-in endpoints (no access token needed). */
export function authApi(baseUrl: string, fetchFn: typeof fetch = fetch) {
  const post = async <T>(path: string, body: object): Promise<T> => {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw await problemFrom(response);
    return (response.status === 204 ? undefined : await response.json()) as T;
  };
  return {
    login: (email: string, password: string) =>
      post<{ user: SignedInUser; tokens: TokenPair }>('/v1/auth/login', {
        email,
        password,
      }),
    refresh: (refreshToken: string) =>
      post<TokenPair>('/v1/auth/refresh', { refreshToken }),
    logout: (refreshToken: string) =>
      post<void>('/v1/auth/logout', { refreshToken }),
  };
}
