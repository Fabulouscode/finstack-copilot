/** The signed-in person, as stored in the sealed session cookie. */
export interface SignedInUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * What Copilot keeps for a signed-in person. Lives only inside
 * an encrypted, httpOnly cookie: browser JavaScript never sees the tokens.
 */
export interface Session {
  user: SignedInUser;
  accessToken: string;
  /** Epoch milliseconds. */
  accessExpiresAt: number;
  refreshToken: string;
  /**
   * Epoch milliseconds when the session ends, whatever the activity: set at
   * sign-in and kept through refreshes.
   */
  expiresAt: number;
}

/** FinStack's token pair (login and refresh responses). */
export interface TokenPair {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}
