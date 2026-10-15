import { EncryptJWT, jwtDecrypt } from 'jose';
import type { Session } from './types';

/** The 32-byte key, from SESSION_SECRET (base64). */
export function sessionKey(secret: string | undefined): Uint8Array {
  const key = Buffer.from(secret ?? '', 'base64');
  if (key.length !== 32) {
    throw new Error(
      'SESSION_SECRET must be 32 random bytes, base64-encoded (openssl rand -base64 32)',
    );
  }
  return new Uint8Array(key);
}

/**
 * Encrypts the session (JWE: direct key, AES-256-GCM). Encrypted rather
 * than only signed, because it holds FinStack tokens: whoever reads the
 * cookie must not be able to read them.
 */
export async function sealSession(
  session: Session,
  key: Uint8Array,
): Promise<string> {
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    // Seconds since the epoch: the session's absolute end.
    .setExpirationTime(Math.floor(session.expiresAt / 1000))
    .encrypt(key);
}

/** The session, or null when missing, tampered with, foreign or expired. */
export async function unsealSession(
  sealed: string | undefined,
  key: Uint8Array,
): Promise<Session | null> {
  if (!sealed) return null;
  try {
    const { payload } = await jwtDecrypt(sealed, key, {
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
    });
    const session = (payload as { session?: Session }).session;
    return session && typeof session.refreshToken === 'string'
      ? session
      : null;
  } catch {
    return null;
  }
}
