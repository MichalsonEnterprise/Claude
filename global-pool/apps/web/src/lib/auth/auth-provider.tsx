'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { publicEnv } from '@/lib/env';

import { MockAuthProvider } from './mock-auth-provider';

/** Privy is only loaded when NEXT_PUBLIC_PRIVY_APP_ID is set (keeps the mock build light and offline). */
const PrivyAuthProvider = dynamic(() => import('./privy-auth-provider'));

/**
 * Player auth. Owner decision #3: Privy (email OTP, social, wallet). DEV MOCK when the app id is unset or
 * NEXT_PUBLIC_PRIVY_MOCK=true, so dev and e2e run offline.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (publicEnv.privyMock) return <MockAuthProvider>{children}</MockAuthProvider>;
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}
