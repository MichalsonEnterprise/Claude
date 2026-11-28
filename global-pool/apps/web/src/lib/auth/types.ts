/** Player auth contract shared by the Privy provider and the DEV MOCK provider. */
import type { MeProfile } from '@/lib/api/auth';

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

/** Social providers offered in the GLOBAL POOL auth dialog (Privy OAuth). */
export type OAuthProvider = 'google' | 'apple';
/** Wallet options in AUTH-02 / AUTH-09 (WalletConnect covers mobile wallets and Ledger Live). */
export type WalletProviderId =
  | 'browser'
  | 'walletconnect'
  | 'coinbase'
  | 'trust'
  | 'phantom'
  | 'ledger';

/** Views of the custom auth dialog (desktop split dialog / mobile bottom sheet). */
export type AuthView = 'sign-in' | 'sign-up' | 'code' | 'wallet' | 'success';

/** Normalised failure of a login step (mapped from Privy errors or the DEV MOCK). */
export type AuthFlowErrorKind =
  | 'invalid_code'
  | 'expired_code'
  | 'too_many_attempts'
  | 'rate_limited'
  | 'rejected'
  | 'no_wallet'
  | 'network'
  | 'unknown';

export class AuthFlowError extends Error {
  constructor(
    readonly kind: AuthFlowErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

/**
 * Headless login steps implemented by each provider (Privy hooks or the DEV MOCK). The GLOBAL POOL dialog
 * (components/auth) drives these — Privy's own modal is only used for WalletConnect-style wallets.
 */
export interface AuthFlowApi {
  /** Send a 6-digit code to the email (Privy `useLoginWithEmail().sendCode`). Resolves with the expiry. */
  sendEmailCode: (email: string) => Promise<{ expiresAt: string }>;
  /** Verify the code and sign in (`loginWithCode`). Rejects with AuthFlowError. */
  loginWithEmailCode: (code: string) => Promise<void>;
  /** Redirect / pop-up OAuth (`useLoginWithOAuth().initOAuth`). */
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
  /** Wallet login: browser wallet via SIWE (headless), other wallets through Privy's wallet modal. */
  loginWithWallet: (provider: WalletProviderId) => Promise<void>;
}

/** A wallet the member connected in AUTH-09 (not yet proven: that's AUTH-10). */
export interface WalletConnection {
  address: string;
  chainId: number;
  provider: WalletProviderId;
}

/** The human-readable message the member signs in AUTH-10 (SIWE / EIP-4361 in Privy mode). */
export interface WalletSignatureRequest {
  message: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

/**
 * Member wallet steps (AUTH-09 connect → AUTH-10 verify ownership with a free signed message).
 * Privy: browser wallets headless (EIP-1193 + `useLinkWithSiwe`); other wallets → Privy's link-wallet modal
 * (`external: true`). DEV MOCK: a simulated DEMO wallet, linked by re-issuing the dev token with its address.
 */
export interface WalletFlowApi {
  /** Resolves with the connection, or `{ external: true }` when Privy's own modal took over. */
  connect: (provider: WalletProviderId) => Promise<WalletConnection | { external: true }>;
  /** Ask the wallet to switch to Arbitrum (Sepolia on testnet). */
  switchToArbitrum: (conn: WalletConnection) => Promise<WalletConnection>;
  prepareSignature: (conn: WalletConnection) => Promise<WalletSignatureRequest>;
  /** Ask the wallet for the signature (mock: resolved by the DEMO wallet pop-up). */
  sign: (conn: WalletConnection, request: WalletSignatureRequest) => Promise<string>;
  /** Link the proven wallet to the account; the caller then re-syncs the API session. */
  link: (conn: WalletConnection, request: WalletSignatureRequest, signature: string) => Promise<void>;
}

/** Internal value each provider (Privy / mock) supplies; the session layer turns it into AuthContextValue. */
export interface AuthCoreValue {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  flow: AuthFlowApi;
  wallet: WalletFlowApi;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export interface AuthContextValue {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  /** Opens the GLOBAL POOL sign-in dialog. */
  signIn: () => void;
  /** Opens the sign-up view. Privy uses one flow for both; first login runs onboarding (consents, country). */
  signUp: () => void;
  signOut: () => Promise<void>;
  /**
   * Bearer token for the API. Privy: the Privy access token (ES256, verified server-side).
   * Mock: a locally signed DEV token from `POST /auth/dev/token` (cached until it expires).
   */
  getAccessToken: () => Promise<string | null>;
  /** Open the auth dialog at a view; `next` = where to go after sign-in (+ onboarding). */
  openAuth?: (view?: 'sign-in' | 'sign-up' | 'wallet', options?: { next?: string }) => void;
  /** API profile (`GET /me`) once the session is synced; null for guests / while loading. */
  profile?: MeProfile | null;
  /** True while the first API session sync (`POST /auth/session`) runs after a login. */
  syncing?: boolean;
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
