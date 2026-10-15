import { sessionKey } from './session/seal';

export interface DashboardConfig {
  /** FinStack's base URL, without /v1. */
  finstackUrl: string;
  sessionKey: Uint8Array;
  /** People are signed out after this long, whatever their activity. */
  sessionMaxAgeSeconds: number;
  secureCookies: boolean;
}

/** Reads and checks the settings, failing loudly on anything unsafe. */
export function loadConfig(env: NodeJS.ProcessEnv): DashboardConfig {
  const url = env.FINSTACK_API_URL ?? '';
  if (!/^https?:\/\/[^/]+/.test(url)) {
    throw new Error('FINSTACK_API_URL must be FinStack\'s URL, e.g. http://localhost:3000');
  }
  const production = env.NODE_ENV === 'production';
  if (production && !url.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
    throw new Error('FINSTACK_API_URL must use https in production');
  }
  const hours = Number(env.SESSION_MAX_AGE_HOURS ?? '8');
  if (!(hours > 0 && hours <= 24)) {
    throw new Error('SESSION_MAX_AGE_HOURS must be between 0 and 24');
  }
  return {
    finstackUrl: url.replace(/\/+$/, ''),
    sessionKey: sessionKey(env.SESSION_SECRET),
    sessionMaxAgeSeconds: Math.round(hours * 3600),
    secureCookies: production,
  };
}

let cached: DashboardConfig | undefined;

export function config(): DashboardConfig {
  cached ??= loadConfig(process.env);
  return cached;
}
