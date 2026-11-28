'use client';

import {
  PrivyProvider,
  useLinkAccount,
  useLinkWithSiwe,
  useLogin,
  useLoginWithEmail,
  useLoginWithOAuth,
  useLoginWithSiwe,
  usePrivy,
} from '@privy-io/react-auth';
import { colors } from '@gp/tokens';
import { useMemo, useRef, type ReactNode } from 'react';
import { defineChain } from 'viem';

import { publicEnv } from '@/lib/env';

import { AuthCoreContext } from './context';
import {
  AuthFlowError,
  initialsFrom,
  type AuthCoreValue,
  type AuthFlowErrorKind,
  type WalletConnection,
} from './types';
import { WALLET_MESSAGE_TTL_MS } from './wallet-message';

/** Arbitrum Sepolia chain id (MVP chain). */
const ARBITRUM_CHAIN_ID = 421614;

function injected(): Eip1193 {
  const eth = (globalThis as { ethereum?: Eip1193 }).ethereum;
  if (!eth) {
    throw new AuthFlowError(
      'no_wallet',
      'No browser wallet found. Use WalletConnect or open this page in your wallet’s browser.',
    );
  }
  return eth;
}

/**
 * Arbitrum Sepolia (421614), defined inline so the bundle doesn't pull viem's whole chain registry.
 * The RPC here is only Privy's default public endpoint; server-side reads use ARBITRUM_SEPOLIA_RPC_URL.
 */
const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] } },
  blockExplorers: { default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' } },
  testnet: true,
});

/** Privy email codes are valid for 10 minutes. */
const EMAIL_CODE_TTL_MS = 10 * 60_000;

/**
 * Privy (owner decision #3) driven HEADLESS: the GLOBAL POOL dialog (components/auth) calls `useLoginWithEmail`,
 * `useLoginWithOAuth` and `useLoginWithSiwe` directly. Privy's own (themed) modal only opens for wallets that need
 * WalletConnect / deep links. MVP chain = Arbitrum Sepolia (421614). The API verifies the access token (ES256).
 */
export default function PrivyAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={publicEnv.privyAppId}
      clientId={publicEnv.privyClientId}
      config={{
        appearance: {
          theme: colors['bg-secondary'],
          accentColor: colors['brand-primary'],
          landingHeader: 'Sign in to GLOBAL POOL',
          loginMessage: '18+ only · permitted jurisdictions · DEMO / testnet',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-and-solana',
        },
        loginMethods: ['email', 'google', 'apple', 'wallet'],
        defaultChain: arbitrumSepolia,
        supportedChains: [arbitrumSepolia],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function mapPrivyError(err: unknown): AuthFlowError {
  if (err instanceof AuthFlowError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  const code = (err as { privyErrorCode?: string } | null)?.privyErrorCode ?? '';
  const text = `${code} ${raw}`.toLowerCase();
  let kind: AuthFlowErrorKind = 'unknown';
  if (/expired/.test(text)) kind = 'expired_code';
  else if (/too_many|too many|rate/.test(text)) kind = 'too_many_attempts';
  else if (/invalid|incorrect|credentials/.test(text)) kind = 'invalid_code';
  else if (/reject|denied|4001|cancel/.test(text)) kind = 'rejected';
  else if (/network|fetch/.test(text)) kind = 'network';
  const message = {
    invalid_code: 'That code isn’t right. Check the email and try again.',
    expired_code: 'This code has expired. Send a new one.',
    too_many_attempts: 'Too many attempts. Wait a few minutes, then request a new code.',
    rate_limited: 'Too many requests. Try again in a few minutes.',
    rejected: 'The request was declined in your wallet. Nothing was signed or sent.',
    no_wallet: 'No browser wallet found.',
    network: 'We couldn’t reach the sign-in service. Check your connection and try again.',
    unknown: 'Something went wrong. Please try again.',
  }[kind];
  return new AuthFlowError(kind, message);
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const email = useLoginWithEmail();
  const oauth = useLoginWithOAuth();
  const siwe = useLoginWithSiwe();
  const { login } = useLogin();
  const linkSiwe = useLinkWithSiwe();
  const { linkWallet } = useLinkAccount();
  const latest = useRef({ email, oauth, siwe, login, linkSiwe, linkWallet });
  latest.current = { email, oauth, siwe, login, linkSiwe, linkWallet };

  const value = useMemo<AuthCoreValue>(() => {
    const mail = user?.email?.address ?? null;
    const wallet = user?.wallet?.address ?? null;
    const displayName =
      mail?.split('@')[0] ?? (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Player');
    return {
      mode: 'privy',
      status: !ready ? 'loading' : authenticated ? 'member' : 'guest',
      user:
        authenticated && user
          ? {
              id: user.id,
              handle: null,
              displayName,
              initials: initialsFrom(displayName),
              email: mail,
              walletAddress: wallet,
              isDemo: false,
            }
          : null,
      signOut: () => logout(),
      getAccessToken: () => getAccessToken(),
      wallet: {
        connect: async (provider) => {
          if (provider !== 'browser') {
            latest.current.linkWallet({
              walletChainType: provider === 'phantom' ? 'solana-only' : 'ethereum-only',
            });
            return { external: true } as const;
          }
          try {
            const eth = injected();
            const [address] = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
            if (!address) throw new AuthFlowError('rejected', 'No account was shared.');
            const chainHex = (await eth.request({ method: 'eth_chainId' })) as string;
            return { address, chainId: Number.parseInt(chainHex, 16), provider };
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        switchToArbitrum: async (conn: WalletConnection) => {
          try {
            await injected().request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${ARBITRUM_CHAIN_ID.toString(16)}` }],
            });
            return { ...conn, chainId: ARBITRUM_CHAIN_ID };
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        prepareSignature: async (conn) => {
          try {
            const message = await latest.current.linkSiwe.generateSiweMessage({
              address: conn.address,
              chainId: `eip155:${conn.chainId}`,
            });
            const nonce = /Nonce: (\S+)/.exec(message)?.[1] ?? '';
            const issued = new Date();
            return {
              message,
              nonce,
              issuedAt: issued.toISOString(),
              expiresAt: new Date(issued.getTime() + WALLET_MESSAGE_TTL_MS).toISOString(),
            };
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        sign: async (conn, request) => {
          try {
            return (await injected().request({
              method: 'personal_sign',
              params: [request.message, conn.address],
            })) as string;
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        link: async (conn, request, signature) => {
          try {
            await latest.current.linkSiwe.linkWithSiwe({
              message: request.message,
              signature,
              chainId: `eip155:${conn.chainId}`,
              connectorType: 'injected',
            });
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
      },
      flow: {
        sendEmailCode: async (address) => {
          try {
            await latest.current.email.sendCode({ email: address });
            return { expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString() };
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        loginWithEmailCode: async (code) => {
          try {
            await latest.current.email.loginWithCode({ code });
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        loginWithOAuth: async (provider) => {
          try {
            await latest.current.oauth.initOAuth({ provider });
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
        loginWithWallet: async (provider) => {
          if (provider !== 'browser') {
            // WalletConnect QR / mobile deep links / Coinbase / Phantom: Privy's themed wallet modal.
            latest.current.login({
              loginMethods: ['wallet'],
              walletChainType: provider === 'phantom' ? 'solana-only' : 'ethereum-only',
            });
            return;
          }
          try {
            const eth = injected();
            const [address] = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
            if (!address) throw new AuthFlowError('rejected', 'No account was shared.');
            const chainHex = (await eth.request({ method: 'eth_chainId' })) as string;
            const message = await latest.current.siwe.generateSiweMessage({
              address,
              chainId: `eip155:${Number.parseInt(chainHex, 16)}`,
            });
            const signature = (await eth.request({
              method: 'personal_sign',
              params: [message, address],
            })) as string;
            await latest.current.siwe.loginWithSiwe({
              message,
              signature,
              connectorType: 'injected',
            });
          } catch (err) {
            throw mapPrivyError(err);
          }
        },
      },
    };
  }, [ready, authenticated, user, logout, getAccessToken]);

  return <AuthCoreContext.Provider value={value}>{children}</AuthCoreContext.Provider>;
}
