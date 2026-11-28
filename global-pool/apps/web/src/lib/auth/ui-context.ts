'use client';

import { createContext, useContext } from 'react';

import type { AuthView } from './types';

export interface AuthDialogState {
  view: AuthView;
  /** sign-in vs sign-up copy (Privy runs one flow for both). */
  intent: 'sign-in' | 'sign-up';
  /** Where to go after sign-in (+ onboarding). */
  next?: string;
  /** Route to replace when the dialog is dismissed without signing in (the /sign-in page uses "/"). */
  returnTo?: string;
}

export interface SessionExpiredState {
  reason: 'idle' | 'revoked';
  at: string;
  account: { name: string; detail: string; initials: string; isDemo: boolean } | null;
}

export interface AuthUiValue {
  dialog: AuthDialogState | null;
  openDialog: (state: AuthDialogState) => void;
  setView: (view: AuthView) => void;
  closeDialog: (reason?: 'dismiss' | 'done') => void;
  expired: SessionExpiredState | null;
  /** Preview / QA: show the session-expired modal. */
  showExpired: (state: SessionExpiredState | null) => void;
}

export const AuthUiContext = createContext<AuthUiValue | null>(null);

export function useAuthUi(): AuthUiValue {
  const ctx = useContext(AuthUiContext);
  if (!ctx) throw new Error('useAuthUi must be used inside <AuthProvider>');
  return ctx;
}
