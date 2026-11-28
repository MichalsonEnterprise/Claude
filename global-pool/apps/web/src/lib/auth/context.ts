'use client';

import { createContext, useContext } from 'react';

import type { AuthContextValue, AuthCoreValue } from './types';

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Supplied by the Privy / DEV MOCK provider; consumed by the session layer and the auth dialog only. */
export const AuthCoreContext = createContext<AuthCoreValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Headless login steps (email code, OAuth, wallet) for the GLOBAL POOL auth dialog. */
export function useAuthCore(): AuthCoreValue {
  const ctx = useContext(AuthCoreContext);
  if (!ctx) throw new Error('useAuthCore must be used inside <AuthProvider>');
  return ctx;
}
