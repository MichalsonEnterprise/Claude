'use client';

import { DEMO_USER } from '@gp/shared/demo';
import * as React from 'react';

import { authApi } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/client';

import { AuthCoreContext } from './context';
import {
  AuthFlowError,
  initialsFrom,
  type AuthCoreValue,
  type AuthStatus,
  type AuthUser,
} from './types';
import { WALLET_MESSAGE_TTL_MS, buildWalletMessage } from './wallet-message';

const STORAGE_KEY = 'gp.devMockSession';
/** Seeded DEMO player @nova.k (apps/api prisma seed). */
export const MOCK_DEMO_DID = 'did:privy:demo-nova-k';
/** DEV MOCK email codes expire 10 minutes after they are sent (same as the Figma AUTH-04 copy). */
export const MOCK_CODE_TTL_MS = 10 * 60_000;
/** Entering this code in DEV MOCK simulates a wrong code (lets QA reach the error state). */
export const MOCK_WRONG_CODE = '000000';

interface MockSession {
  did: string;
  email: string | null;
  wallet: string | null;
}

/** Deterministic DEV MOCK DID for an email: the DEMO email maps to @nova.k, any other email is a new player. */
export async function mockDidForEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (normalized === DEMO_USER.email) return MOCK_DEMO_DID;
  const bytes = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `did:privy:mock-${hex.slice(0, 24)}`;
}

const TOKEN_KEY = 'gp.devMockToken';

interface CachedToken {
  did: string;
  wallet: string | null;
  token: string;
  expiresAt: number;
}

/** DEV MOCK tokens are reused across reloads so one browser = one API session (device), like Privy. */
function readToken(): CachedToken | null {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as CachedToken) : null;
  } catch {
    return null;
  }
}

function writeToken(t: CachedToken | null) {
  try {
    if (t) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function readSession(): MockSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === 'member') return { did: MOCK_DEMO_DID, email: DEMO_USER.email, wallet: null };
    const parsed = JSON.parse(raw) as Partial<MockSession>;
    return typeof parsed.did === 'string'
      ? { did: parsed.did, email: parsed.email ?? null, wallet: parsed.wallet ?? null }
      : null;
  } catch {
    return null;
  }
}

function writeSession(s: MockSession | null) {
  try {
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}

function userFor(s: MockSession): AuthUser {
  const demo = s.did === MOCK_DEMO_DID;
  const displayName = demo
    ? DEMO_USER.displayName
    : (s.email?.split('@')[0] ??
      (s.wallet ? `${s.wallet.slice(0, 6)}…${s.wallet.slice(-4)}` : 'Player'));
  return {
    id: s.did,
    handle: demo ? DEMO_USER.handle : null,
    displayName,
    initials: demo ? 'NK' : initialsFrom(displayName),
    email: s.email,
    walletAddress: s.wallet,
    isDemo: true,
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** DEMO wallet used by the DEV MOCK connect flow (AUTH-09/10). Throwaway address, never funded. */
export const MOCK_WALLET_ADDRESS = '0x12aB7c4E90d1F35b6A2c8E07d94F1b3A5c6D9f3C';

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * DEV MOCK auth (owner decision #3): used when NEXT_PUBLIC_PRIVY_APP_ID is unset or NEXT_PUBLIC_PRIVY_MOCK=true.
 * The GLOBAL POOL dialog drives the same steps as Privy (email → 6-digit code, social, wallet). Tokens are real
 * API tokens: `getAccessToken()` exchanges the mock session for a locally signed DEV token via
 * `POST /auth/dev/token` (cached until shortly before it expires). Email `nova.k@example.com`, social and wallet
 * sign in as the seeded DEMO player @nova.k; any other email is a NEW player who must onboard. No email is sent:
 * any 6 digits work (except 000000, which simulates a wrong code).
 */
export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<MockSession | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const pending = React.useRef<{ email: string; sentAt: number } | null>(null);
  const token = React.useRef<CachedToken | null>(null);
  const inflight = React.useRef<Promise<string | null> | null>(null);
  const sessionRef = React.useRef<MockSession | null>(null);

  React.useEffect(() => {
    const s = readSession();
    sessionRef.current = s;
    token.current = s ? readToken() : null;
    setSession(s);
    setStatus(s ? 'member' : 'guest');
  }, []);

  const start = React.useCallback((s: MockSession) => {
    writeSession(s);
    sessionRef.current = s;
    token.current = null;
    writeToken(null);
    setSession(s);
    setStatus('member');
  }, []);

  const getAccessToken = React.useCallback(async (): Promise<string | null> => {
    const s = sessionRef.current;
    if (!s) return null;
    const cached = token.current;
    if (
      cached &&
      cached.did === s.did &&
      cached.wallet === s.wallet &&
      cached.expiresAt - Date.now() > 60_000
    ) {
      return cached.token;
    }
    if (inflight.current) return inflight.current;
    inflight.current = (async () => {
      try {
        const res = await authApi.devToken({
          did: s.did,
          ...(s.email ? { email: s.email } : {}),
          ...(s.wallet ? { wallet: s.wallet } : {}),
          ttlSeconds: 3600,
        });
        token.current = {
          did: s.did,
          wallet: s.wallet,
          token: res.token,
          expiresAt: Date.parse(res.expiresAt),
        };
        writeToken(token.current);
        return res.token;
      } catch (err) {
        // API down / rate-limited / not in mock mode: fail the request instead of sending it unauthenticated
        // (a 401 would look like a revoked session and sign the player out).
        const status = err instanceof ApiRequestError ? ` (${err.status})` : '';
        throw new AuthFlowError(
          'network',
          `Couldn’t reach the sign-in service${status}. Try again.`,
        );
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  }, []);

  const value = React.useMemo<AuthCoreValue>(
    () => ({
      mode: 'mock',
      status,
      user: status === 'member' && session ? userFor(session) : null,
      getAccessToken,
      signOut: () => {
        writeSession(null);
        writeToken(null);
        sessionRef.current = null;
        token.current = null;
        setSession(null);
        setStatus('guest');
        return Promise.resolve();
      },
      wallet: {
        connect: async (provider) => {
          await wait(900);
          return { address: MOCK_WALLET_ADDRESS, chainId: 421614, provider };
        },
        switchToArbitrum: async (conn) => {
          await wait(400);
          return { ...conn, chainId: 421614 };
        },
        prepareSignature: async (conn) => {
          await wait(200);
          const issued = new Date();
          const nonce = randomHex(8);
          return {
            message: buildWalletMessage({ address: conn.address, nonce, issuedAt: issued }),
            nonce,
            issuedAt: issued.toISOString(),
            expiresAt: new Date(issued.getTime() + WALLET_MESSAGE_TTL_MS).toISOString(),
          };
        },
        // The DEMO wallet pop-up (components/auth) is the "wallet" here: Sign resolves, Reject never calls this.
        sign: async () => {
          await wait(250);
          return `0x${randomHex(65)}`;
        },
        link: async (conn) => {
          await wait(150);
          const s = sessionRef.current;
          if (!s) throw new AuthFlowError('unknown', 'Sign in first.');
          start({ ...s, wallet: conn.address });
        },
      },
      flow: {
        sendEmailCode: async (email) => {
          await wait(350);
          const sentAt = Date.now();
          pending.current = { email: email.trim().toLowerCase(), sentAt };
          return { expiresAt: new Date(sentAt + MOCK_CODE_TTL_MS).toISOString() };
        },
        loginWithEmailCode: async (code) => {
          await wait(300);
          const p = pending.current;
          if (!p) throw new AuthFlowError('expired_code', 'Request a new code to continue.');
          if (Date.now() - p.sentAt > MOCK_CODE_TTL_MS) {
            throw new AuthFlowError('expired_code', 'This code has expired. Send a new one.');
          }
          if (!/^\d{6}$/.test(code) || code === MOCK_WRONG_CODE) {
            throw new AuthFlowError(
              'invalid_code',
              'That code isn’t right. Check the email and try again.',
            );
          }
          pending.current = null;
          start({ did: await mockDidForEmail(p.email), email: p.email, wallet: null });
        },
        loginWithOAuth: async () => {
          await wait(400);
          start({ did: MOCK_DEMO_DID, email: DEMO_USER.email, wallet: null });
        },
        loginWithWallet: async () => {
          await wait(900);
          start({ did: MOCK_DEMO_DID, email: DEMO_USER.email, wallet: null });
        },
      },
    }),
    [status, session, getAccessToken, start],
  );

  return <AuthCoreContext.Provider value={value}>{children}</AuthCoreContext.Provider>;
}
