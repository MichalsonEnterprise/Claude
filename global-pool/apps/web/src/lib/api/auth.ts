/**
 * Auth module API wrappers (player auth, onboarding, 2FA / step-up, account gate, new-device alerts).
 * All calls go through the shared `apiRequest()` client — never fork it.
 */
import type { StepUpPurpose } from '@gp/shared/enums';
import type { OnboardingInput } from '@gp/shared/schemas';

import { ApiRequestError, apiRequest } from './client';

// ── types (mirror apps/api responses) ─────────────────────────────────────────────────────────

export interface MeProfile {
  id: string;
  publicId: string;
  handle: string | null;
  displayHandle: string | null;
  displayName: string | null;
  email: string | null;
  emailMasked: string | null;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'closed';
  onboarded: boolean;
  onboardingRequired: boolean;
  onboardedAt: string | null;
  country: { code: string; name: string | null; permitted: boolean } | null;
  kyc: { level: string; status: string; label: string };
  vip: { tier: string; level: number; points: number };
  security: {
    twoFactorEnabled: boolean;
    twoFactorMethod: 'authenticator_app' | null;
    antiPhishingCode: string | null;
  };
  consents: {
    ageConfirmedAt: string | null;
    jurisdictionConfirmedAt: string | null;
    termsAcceptedAt: string | null;
    termsVersion: string | null;
    privacyAcceptedAt: string | null;
    privacyVersion: string | null;
    marketingOptIn: boolean;
  };
  isDemo: boolean;
  createdAt: string;
}

export interface SessionSync {
  created: boolean;
  onboardingRequired: boolean;
  sessionId: string;
  user: MeProfile;
}

export interface AuthConfig {
  mode: 'privy' | 'mock' | 'disabled';
  privyAppId: string | null;
  devTokenEndpoint: string | null;
}

export interface DevToken {
  token: string;
  did: string;
  sessionId: string;
  expiresAt: string;
}

export interface RegionStatus {
  country: string | null;
  countryName: string | null;
  permitted: boolean;
  source: 'header' | 'dev_override' | 'declared' | 'unknown';
  minAge: number;
}

export interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
  method: 'authenticator_app' | null;
  backupCodesRemaining: number;
  lockedUntil: string | null;
  antiPhishingCodeSet: boolean;
}

export interface TotpEnrollment {
  secret: string;
  otpauthUrl: string;
  issuer: string;
}

export interface StepUpToken {
  stepUpToken: string;
  purpose: StepUpPurpose;
  method: 'totp' | 'backup_code' | null;
  expiresAt: string;
}

export type AccountGate = 'ok' | 'onboarding' | 'suspended' | 'self_excluded' | 'region' | 'under_review';

export interface AccountStatus {
  gate: AccountGate;
  onboarded: boolean;
  status: 'active' | 'suspended' | 'closed';
  restrictions: {
    type: 'account_suspended' | 'gaming_blocked' | 'deposits_blocked' | 'withdrawals_frozen';
    since: string;
    reference: string;
  }[];
  paused: { gaming: boolean; deposits: boolean; withdrawals: boolean };
  selfExclusion: { active: boolean; startsAt: string | null; endsAt: string | null };
  region: {
    current: { code: string; name: string | null; permitted: boolean } | null;
    declared: { code: string; name: string | null; permitted: boolean } | null;
    permitted: boolean;
  };
  isDemo: boolean;
}

export interface NewDeviceAlert {
  sessionId: string;
  device: string;
  location: string | null;
  ipMasked: string | null;
  signedInAt: string;
  isDemo: boolean;
}

export interface WalletBalances {
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
  currency?: string;
  isDemo?: boolean;
}

// ── query keys ────────────────────────────────────────────────────────────────────────────────

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
  twoFactor: ['auth', '2fa'] as const,
  accountStatus: ['auth', 'account-status'] as const,
  newDeviceAlerts: ['auth', 'new-device-alerts'] as const,
  region: ['auth', 'region'] as const,
  balances: ['auth', 'balances'] as const,
};

// ── calls ─────────────────────────────────────────────────────────────────────────────────────

export const authApi = {
  config: () => apiRequest<AuthConfig>('/auth/config', { auth: 'none' }),
  /** DEV MOCK only: locally signed player token (the API refuses this route outside mock mode). */
  devToken: (body: { did: string; email?: string; wallet?: string; ttlSeconds?: number }) =>
    apiRequest<DevToken>('/auth/dev/token', { method: 'POST', body, auth: 'none' }),
  /** Upsert the user after a Privy login (syncs linked email + wallets). */
  session: () => apiRequest<SessionSync>('/auth/session', { method: 'POST' }),
  logout: () => apiRequest<unknown>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<MeProfile>('/me'),
  onboarding: (body: OnboardingInput) =>
    apiRequest<MeProfile>('/auth/onboarding', { method: 'POST', body }),
  region: () => apiRequest<RegionStatus>('/compliance/region', { auth: 'none' }),
  accountStatus: () => apiRequest<AccountStatus>('/auth/account-status'),
  balances: () => apiRequest<WalletBalances>('/wallet/balances'),

  twoFactorStatus: () => apiRequest<TwoFactorStatus>('/auth/2fa'),
  enroll2fa: () => apiRequest<TotpEnrollment>('/auth/2fa/enroll', { method: 'POST' }),
  confirm2fa: (code: string) =>
    apiRequest<{ enabled: true; backupCodes: string[] }>('/auth/2fa/confirm', {
      method: 'POST',
      body: { code },
    }),
  challenge: (purpose: StepUpPurpose, code: string) =>
    apiRequest<StepUpToken>('/auth/2fa/challenge', { method: 'POST', body: { purpose, code } }),
  regenerateBackupCodes: (stepUpToken: string) =>
    apiRequest<{ backupCodes: string[] }>('/auth/2fa/backup-codes', {
      method: 'POST',
      body: {},
      stepUpToken,
    }),

  newDeviceAlerts: () => apiRequest<NewDeviceAlert[]>('/auth/new-device-alerts'),
  confirmNewDevice: (sessionId: string) =>
    apiRequest<{ confirmed: true }>(`/auth/new-device-alerts/${sessionId}/confirm`, {
      method: 'POST',
    }),
  secureAccount: (sessionId: string) =>
    apiRequest<{ secured: true; revokedSessions: number }>(
      `/auth/new-device-alerts/${sessionId}/secure`,
      { method: 'POST' },
    ),
};

// ── error helpers ─────────────────────────────────────────────────────────────────────────────

export function apiErrorCode(err: unknown): string | null {
  return err instanceof ApiRequestError ? err.code : null;
}

export function isUnauthenticated(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 401 && err.code === 'UNAUTHENTICATED';
}

/**
 * Where a blocked gaming / financial call should send the player (AUTH-18 pages), or null when the error is not
 * an account restriction. Use it in mutation `onError` handlers: `const to = restrictedRouteFor(err)`.
 */
export function restrictedRouteFor(err: unknown): string | null {
  if (!(err instanceof ApiRequestError)) return null;
  switch (err.code) {
    case 'ONBOARDING_REQUIRED':
      return '/onboarding';
    case 'SELF_EXCLUDED':
      return '/restricted/self-excluded';
    case 'GEO_RESTRICTED':
      return '/restricted/region';
    case 'FORBIDDEN': {
      const r = err.details?.restriction;
      if (r === 'account_suspended') return '/restricted/suspended';
      if (r === 'gaming_blocked' || r === 'deposits_blocked') return '/restricted/under-review';
      return null;
    }
    default:
      return null;
  }
}

/** Route for an account gate (null = no restriction page). */
export function routeForGate(gate: AccountGate): string | null {
  return {
    ok: null,
    onboarding: '/onboarding',
    suspended: '/restricted/suspended',
    self_excluded: '/restricted/self-excluded',
    region: '/restricted/region',
    under_review: '/restricted/under-review',
  }[gate];
}
