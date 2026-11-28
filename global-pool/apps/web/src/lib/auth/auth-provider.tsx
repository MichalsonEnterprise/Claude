'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { publicEnv } from '@/lib/env';

import { MockAuthProvider } from './mock-auth-provider';
import { AuthSessionLayer } from './session-layer';

/** Privy is only loaded when NEXT_PUBLIC_PRIVY_APP_ID is set (keeps the mock build light and offline). */
const PrivyAuthProvider = dynamic(() => import('./privy-auth-provider'));

/**
 * Player auth. Owner decision #3: Privy (email OTP, social, wallet) driven headlessly by the GLOBAL POOL dialog;
 * DEV MOCK when the app id is unset or NEXT_PUBLIC_PRIVY_MOCK=true, so dev and e2e run offline. The session layer
 * adds the API session, onboarding guard, session expiry, step-up 2FA and wallet dialogs on top of either core.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const layer = <AuthSessionLayer>{children}</AuthSessionLayer>;
  if (publicEnv.privyMock) return <MockAuthProvider>{layer}</MockAuthProvider>;
  return <PrivyAuthProvider>{layer}</PrivyAuthProvider>;
}
