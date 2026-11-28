/** Player auth contract shared by the Privy provider and the DEV MOCK provider. */
export type AuthMode = 'privy' | 'mock';
export type AuthStatus = 'loading' | 'guest' | 'member';

export interface AuthUser {
  /** Privy DID (`did:privy:…`) or the mock DID. The API upserts users by this id (`privy_user_id`). */
  id: string;
  /** Public handle once onboarding is done (from the API profile); null before. */
  handle: string | null;
  displayName: string;
  /** Two-letter initials for <Avatar>. */
  initials: string;
  email: string | null;
  walletAddress: string | null;
  /** True for the DEV MOCK user (shows DEMO markers). */
  isDemo: boolean;
}

export interface AuthContextValue {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  /** Opens the sign-in flow (Privy modal, or the mock dialog). */
  signIn: () => void;
  /** Opens the sign-up flow. Privy uses one flow for both; first login runs onboarding (consents, country). */
  signUp: () => void;
  signOut: () => Promise<void>;
  /**
   * Bearer token for the API. Privy: the Privy access token (ES256, verified server-side).
   * Mock: an UNSIGNED `dev-mock.` placeholder — the API's dev-token exchange is defined by the API agent.
   */
  getAccessToken: () => Promise<string | null>;
}

export function initialsFrom(name: string): string {
  const parts = name
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return `${first}${second}`.toUpperCase();
}
