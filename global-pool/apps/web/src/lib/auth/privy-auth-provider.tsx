'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { colors } from '@gp/tokens';
import { useMemo, type ReactNode } from 'react';
import { defineChain } from 'viem';

import { publicEnv } from '@/lib/env';

import { AuthContext } from './context';
import { initialsFrom, type AuthContextValue } from './types';

/**
 * Privy (owner decision #3): email OTP, social and wallet login (WalletConnect + embedded wallets), styled to
 * the GLOBAL POOL palette. MVP chain = Arbitrum Sepolia (421614). The API verifies the access token (ES256).
 */
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

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();

  const value = useMemo<AuthContextValue>(() => {
    const email = user?.email?.address ?? null;
    const wallet = user?.wallet?.address ?? null;
    const displayName = email?.split('@')[0] ?? (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Player');
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
              email,
              walletAddress: wallet,
              isDemo: false,
            }
          : null,
      signIn: () => login(),
      signUp: () => login(),
      signOut: () => logout(),
      getAccessToken: () => getAccessToken(),
    };
  }, [ready, authenticated, user, login, logout, getAccessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
