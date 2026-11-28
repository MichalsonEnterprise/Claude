/**
 * Account module API wrappers (USR-00/01/02 dashboard + notifications, USR-A1…A10 account & security, AUTH-11…17
 * KYC flow). All calls go through the shared `apiRequest()` client — never fork it. Money stays a decimal string
 * end to end; financial writes carry an idempotency key per user intent.
 */
import type { KycLevel, KycStatus, StepUpPurpose } from '@gp/shared/enums';
import type {
  KycCheck,
  KycDetailsInput,
  KycDocumentSide,
  KycDocumentType,
  KycDocumentUpload,
  KycFlowStep,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferencesUpdate,
  ProfileUpdate,
} from '@gp/shared/schemas';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';

import { apiRequest, newIdempotencyKey } from './client';
import { invalidatePlayerFinancials } from './player-cache';

// ── view types (shapes of the API responses) ───────────────────────────────────────────────────

export interface MeView {
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
  onboardedAt: string | null;
  country: { code: string; name: string | null; permitted: boolean } | null;
  kyc: { level: KycLevel; status: KycStatus; label: string };
  vip: { tier: string; level: number; points: number };
  security: {
    twoFactorEnabled: boolean;
    twoFactorMethod: 'authenticator_app' | null;
    antiPhishingCode: string | null;
  };
  consents: { marketingOptIn: boolean; termsAcceptedAt: string | null };
  isDemo: boolean;
  createdAt: string;
}

export interface AccountStatusView {
  gate: 'ok' | 'onboarding' | 'suspended' | 'self_excluded' | 'region' | 'under_review';
  restrictions: { type: string; since: string; reference: string }[];
  paused: { gaming: boolean; deposits: boolean; withdrawals: boolean };
  selfExclusion: { active: boolean; startsAt: string | null; endsAt: string | null };
  region: {
    current: { code: string; name: string | null; permitted: boolean } | null;
    declared: { code: string; name: string | null; permitted: boolean } | null;
    permitted: boolean;
  };
  isDemo: boolean;
}

export interface BalanceItem {
  label: string;
  amount: string;
  reference: string;
}
export interface BalancesView {
  currency: 'USDT';
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
  breakdown: {
    lockedWithdrawals: string;
    lockedEntries: string;
    locked: BalanceItem[];
    pending: BalanceItem[];
    owed: BalanceItem[];
  };
}

export interface LifetimeView {
  deposits: string;
  withdrawals: string;
  entries: number;
  platformFeesPaid: string;
  rewards: string;
}

export interface RoundView {
  id: string;
  number: number;
  numberLabel: string;
  status: 'scheduled' | 'open' | 'closed' | 'drawing' | 'settled' | 'cancelled';
  opensAt: string | null;
  openedAt: string | null;
  closesAt: string;
  entryPrice: string;
  platformFeePerEntry: string;
  participants: number;
  entries: number;
  poolBalance: string;
  platformFees: string;
  thresholds: { minParticipants: number; minPool: string; met: boolean };
  prizeDistribution: {
    tier: string;
    label: string;
    sharePercent: string;
    winners: number;
    amountEach: string;
    amountTotal: string;
  }[];
  isDemo: boolean;
}

export interface MyEntriesView {
  roundId: string;
  roundNumber: number;
  entries: number;
  firstEntryId: string | null;
  lastEntryId: string | null;
  entryAmount: string;
  platformFee: string;
  purchases: { reference: string; total: string; at: string }[];
  odds: {
    myEntries: number;
    totalEntries: number;
    prizes: number;
    anyPrizePercent: string;
    anyPrizeApproxPercent: string;
    firstPrizePercent: string;
  } | null;
}

export interface TxRow {
  id: string;
  type: string;
  status: string;
  direction: 'in' | 'out';
  network: string | null;
  amount: string;
  networkFee: string | null;
  platformFee: string | null;
  netAmount: string;
  description: string;
  statusDetail: string | null;
  createdAt: string;
  isDemo: boolean;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RgView {
  limits: {
    type: 'deposit' | 'participation' | 'loss' | 'time';
    period: 'day' | 'week' | 'month';
    limit: string | null;
    minutes?: number | null;
    used: string | null;
    remaining: string | null;
    pendingIncrease: { amount: string | null; effectiveAt: string } | null;
  }[];
  selfExclusion: { active: boolean; duration: string | null; endsAt: string | null };
  realityCheckMinutes: number;
}

export interface GameView {
  id: string;
  slug: string;
  name: string;
  category: string;
  mechanic: string;
  houseEdgePercent: string | null;
  edgeLabel: string;
  players: number | null;
  mode: 'pool' | 'simulation';
  isDemo: boolean;
}

export type NotificationCategoryFilter =
  'security' | 'transactions' | 'rounds' | 'promotions' | 'account';
export interface NotificationView {
  id: string;
  type: string;
  category: NotificationCategoryFilter;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  isDemo: boolean;
}
export interface NotificationsPage extends Page<NotificationView> {
  unread: number;
  counts: Record<NotificationCategoryFilter | 'all', number>;
}

export interface TwoFactorView {
  enabled: boolean;
  pending: boolean;
  method: 'authenticator_app' | null;
  backupCodesRemaining: number;
  lockedUntil: string | null;
  antiPhishingCodeSet: boolean;
}

export interface SecurityView {
  score: number;
  max: number;
  status: 'strong' | 'needs_review' | 'at_risk';
  items: { key: string; label: string; points: number; ok: boolean; earned: number }[];
  twoFactor: Omit<TwoFactorView, 'antiPhishingCodeSet'>;
  antiPhishingCode: string | null;
  email: { verified: boolean; masked: string | null };
  whitelist: {
    id: string;
    network: string;
    address: string;
    whitelistedAt: string | null;
    isDemo: boolean;
  }[];
  sessions: { active: number; toReview: number };
  devicesToReview: {
    sessionId: string;
    device: string;
    location: string | null;
    signedInAt: string;
    isDemo: boolean;
  }[];
  events: {
    id: string;
    at: string;
    action: string;
    label: string;
    tone: 'success' | 'warning' | 'info';
  }[];
}

export interface PreferencesView {
  displayName: string | null;
  language: string;
  timeZone: string;
  profileUpdatedAt: string | null;
  marketingOptIn: boolean;
  notifications: {
    categories: {
      key: NotificationCategory;
      group: 'security' | 'wallet' | 'pool' | 'offers' | 'rg';
      locked: boolean;
      channels: Record<NotificationChannel, boolean | null>;
    }[];
    quietHours: { enabled: boolean; from: string; to: string };
    updatedAt: string | null;
  };
  sessions: { idleTimeoutMinutes: number };
}

export interface DeviceView {
  id: string;
  device: string;
  deviceName: string;
  browser: string | null;
  ipMasked: string | null;
  location: string | null;
  current: boolean;
  flagged: boolean;
  flaggedReason: string | null;
  status: 'active' | 'ended';
  endedAt: string | null;
  endedReason: string | null;
  method: string;
  lastSeenAt: string;
  createdAt: string;
  isDemo: boolean;
}

export type LoginFilter = 'all' | 'success' | 'flagged' | 'ended';
export interface LoginHistoryView extends Page<{
  id: string;
  signedInAt: string;
  device: string;
  browser: string | null;
  method: string;
  location: string | null;
  ipMasked: string | null;
  result: 'success' | 'flagged';
  flaggedReason: string | null;
  current: boolean;
  active: boolean;
  endedAt: string | null;
  endedReason: string | null;
  isDemo: boolean;
}> {
  counts: Record<LoginFilter, number>;
  days: number;
}

export interface KycDocumentView {
  id: string;
  documentType: KycDocumentType;
  side: KycDocumentSide;
  issuingCountry: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'accepted' | 'rejected' | 'in_review' | 'approved' | 'replaced';
  issues: KycCheck[];
  uploadedAt: string;
  reviewedAt: string | null;
  extracted: {
    fullName: string;
    dateOfBirth: string;
    documentNumber: string;
    expiresOn: string;
  } | null;
}

export interface KycApplicationView {
  id: string;
  reference: string;
  level: Exclude<KycLevel, 'none'>;
  levelLabel: string;
  status: KycStatus;
  editable: boolean;
  step: KycFlowStep;
  requirements: { details: boolean; document: boolean; liveness: boolean };
  canSubmit: boolean;
  personal: (Omit<KycDetailsInput, 'accuracyConfirmed'> & { savedAt: string }) | null;
  documentType: KycDocumentType | null;
  documents: KycDocumentView[];
  liveness: {
    status: 'passed' | 'failed' | 'manual_review' | null;
    attempts: number;
    lastAttemptAt: string | null;
    issue: string | null;
    maxAttempts: number;
  };
  checks: { check: KycCheck; ok: boolean; message: string; fix: string | null }[];
  failedChecks: KycCheck[];
  submittedAt: string | null;
  expectedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  dailyLimitAfter: string;
  dailyLimitNow: string;
  provider: string;
  createdAt: string;
  isDemo: boolean;
}

export interface KycView {
  currentLevel: KycLevel;
  currentLabel: string;
  dailyLimit: string;
  levels: {
    level: Exclude<KycLevel, 'none'>;
    label: string;
    dailyLimit: string;
    reached: boolean;
  }[];
  application: KycApplicationView | null;
}

export interface KycDocumentsView {
  items: (KycDocumentView & {
    level: KycLevel;
    recordId: string;
    recordStatus: KycStatus;
    isDemo: boolean;
  })[];
  verifiedRecords: {
    recordId: string;
    level: KycLevel;
    reviewedAt: string | null;
    submittedAt: string | null;
    provider: string;
    isDemo: boolean;
  }[];
  counts: { approved: number; inReview: number; rejected: number };
}

export type DepositsPage = Page<{ reference: string; status: string; amount: string }>;

// ── fetchers ───────────────────────────────────────────────────────────────────────────────────

export const accountApi = {
  me: (signal?: AbortSignal) => apiRequest<MeView>('/me', { signal }),
  accountStatus: (signal?: AbortSignal) =>
    apiRequest<AccountStatusView>('/auth/account-status', { signal }),
  balances: (signal?: AbortSignal) => apiRequest<BalancesView>('/wallet/balances', { signal }),
  lifetime: (signal?: AbortSignal) => apiRequest<LifetimeView>('/wallet/lifetime', { signal }),
  claimOwed: (idempotencyKey: string) =>
    apiRequest<{ claimed: string; replayed?: boolean }>('/wallet/owed/claim', {
      method: 'POST',
      body: { idempotencyKey },
    }),
  currentRound: (signal?: AbortSignal) =>
    apiRequest<RoundView>('/pool/rounds/current', { signal, auth: 'none' }),
  myEntries: (roundId: string, signal?: AbortSignal) =>
    apiRequest<MyEntriesView>(`/pool/rounds/${roundId}/my-entries`, { signal }),
  transactions: (query: { pageSize: number; type?: string }, signal?: AbortSignal) =>
    apiRequest<Page<TxRow>>('/transactions', { query, signal }),
  deposits: (signal?: AbortSignal) =>
    apiRequest<DepositsPage>('/deposits', { query: { pageSize: 1 }, signal }),
  rg: (signal?: AbortSignal) => apiRequest<RgView>('/responsible-gaming', { signal }),
  games: (signal?: AbortSignal) => apiRequest<GameView[]>('/games', { signal, auth: 'none' }),
  notifications: (
    query: {
      page?: number;
      pageSize?: number;
      unread?: boolean;
      category?: NotificationCategoryFilter;
    },
    signal?: AbortSignal,
  ) =>
    apiRequest<NotificationsPage>('/notifications', {
      query: { ...query, unread: query.unread ? 'true' : undefined },
      signal,
    }),
  readNotification: (id: string) =>
    apiRequest<{ read: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  readAllNotifications: () =>
    apiRequest<{ updated: number }>('/notifications/read-all', { method: 'POST' }),

  twoFactor: (signal?: AbortSignal) => apiRequest<TwoFactorView>('/auth/2fa', { signal }),
  enroll2fa: () =>
    apiRequest<{ secret: string; otpauthUrl: string; issuer?: string }>('/auth/2fa/enroll', {
      method: 'POST',
    }),
  confirm2fa: (code: string) =>
    apiRequest<{ enabled: true; backupCodes: string[] }>('/auth/2fa/confirm', {
      method: 'POST',
      body: { code },
    }),
  challenge: (purpose: StepUpPurpose, code: string) =>
    apiRequest<{ stepUpToken: string; expiresAt: string }>('/auth/2fa/challenge', {
      method: 'POST',
      body: { purpose, code },
    }),
  disable2fa: (stepUpToken: string) =>
    apiRequest<{ enabled: false }>('/auth/2fa/disable', { method: 'POST', body: {}, stepUpToken }),
  regenerateBackupCodes: (stepUpToken: string) =>
    apiRequest<{ backupCodes: string[] }>('/auth/2fa/backup-codes', {
      method: 'POST',
      body: {},
      stepUpToken,
    }),
  setAntiPhishing: (antiPhishingCode: string, stepUpToken: string) =>
    apiRequest<{ antiPhishingCode: string }>('/auth/anti-phishing', {
      method: 'PUT',
      body: { antiPhishingCode },
      stepUpToken,
    }),

  security: (signal?: AbortSignal) => apiRequest<SecurityView>('/me/security', { signal }),
  preferences: (signal?: AbortSignal) => apiRequest<PreferencesView>('/me/preferences', { signal }),
  updateProfile: (body: ProfileUpdate) =>
    apiRequest<PreferencesView>('/me/profile', { method: 'PATCH', body }),
  updateNotificationPrefs: (body: NotificationPreferencesUpdate) =>
    apiRequest<PreferencesView>('/me/notification-preferences', { method: 'PUT', body }),
  devices: (include: 'active' | 'all', signal?: AbortSignal) =>
    apiRequest<DeviceView[]>('/me/devices', { query: { include }, signal }),
  revokeSession: (id: string) =>
    apiRequest<{ revoked: boolean; current: boolean }>(`/me/sessions/${id}`, { method: 'DELETE' }),
  revokeOtherSessions: () =>
    apiRequest<{ revoked: number }>('/me/sessions/revoke-others', { method: 'POST' }),
  confirmDevice: (sessionId: string) =>
    apiRequest<{ confirmed: true }>(`/auth/new-device-alerts/${sessionId}/confirm`, {
      method: 'POST',
    }),
  secureAccount: (sessionId: string) =>
    apiRequest<{ secured: true; revokedSessions: number }>(
      `/auth/new-device-alerts/${sessionId}/secure`,
      { method: 'POST' },
    ),
  loginHistory: (
    query: { filter: LoginFilter; days: number; page: number; pageSize: number },
    signal?: AbortSignal,
  ) => apiRequest<LoginHistoryView>('/me/login-history', { query, signal }),

  kyc: (signal?: AbortSignal) => apiRequest<KycView>('/kyc/application', { signal }),
  kycStart: (level: Exclude<KycLevel, 'none'>) =>
    apiRequest<KycView>('/kyc/application', { method: 'POST', body: { level } }),
  kycDetails: (body: KycDetailsInput) =>
    apiRequest<KycView>('/kyc/application/details', { method: 'PUT', body }),
  kycDocument: (body: KycDocumentUpload) =>
    apiRequest<KycView & { document: KycDocumentView }>('/kyc/application/documents', {
      method: 'POST',
      body,
    }),
  kycLiveness: (durationMs: number) =>
    apiRequest<KycView>('/kyc/application/liveness', {
      method: 'POST',
      body: { captured: true, durationMs },
    }),
  kycSubmit: () =>
    apiRequest<KycView>('/kyc/application/submit', {
      method: 'POST',
      body: { accuracyConfirmed: true },
    }),
  kycDocuments: (signal?: AbortSignal) =>
    apiRequest<KycDocumentsView>('/kyc/documents', { signal }),
  /** DEMO only: mock-provider decisions (the API refuses these outside DEMO mode). */
  devKycApprove: (level: Exclude<KycLevel, 'none'>) =>
    apiRequest<unknown>('/dev/kyc/approve', { method: 'POST', body: { level } }),
  devKycReject: (level: Exclude<KycLevel, 'none'>, reasons: KycCheck[]) =>
    apiRequest<KycView>('/dev/kyc/reject', { method: 'POST', body: { level, reasons } }),
};

// ── query keys + hooks ─────────────────────────────────────────────────────────────────────────

export const accountKeys = {
  all: ['account'] as const,
  me: () => ['account', 'me'] as const,
  status: () => ['account', 'status'] as const,
  balances: () => ['account', 'balances'] as const,
  lifetime: () => ['account', 'lifetime'] as const,
  round: () => ['account', 'round'] as const,
  myEntries: (roundId: string) => ['account', 'my-entries', roundId] as const,
  transactions: (q: { pageSize: number; type?: string }) => ['account', 'transactions', q] as const,
  deposits: () => ['account', 'deposits'] as const,
  rg: () => ['account', 'rg'] as const,
  games: () => ['account', 'games'] as const,
  notifications: (q: object) => ['account', 'notifications', q] as const,
  twoFactor: () => ['account', '2fa'] as const,
  security: () => ['account', 'security'] as const,
  preferences: () => ['account', 'preferences'] as const,
  devices: (include: string) => ['account', 'devices', include] as const,
  loginHistory: (q: object) => ['account', 'login-history', q] as const,
  kyc: () => ['account', 'kyc'] as const,
  kycDocuments: () => ['account', 'kyc-documents'] as const,
};

type Opts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>;

/** Player queries run only for signed-in members (guests see the sign-in prompt instead). */
export function useIsMember(): boolean {
  return useAuth().status === 'member';
}

function useMemberQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (signal: AbortSignal) => Promise<T>,
  opts: Opts<T> = {},
) {
  const member = useIsMember();
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    ...opts,
    enabled: member && (opts.enabled ?? true),
  });
}

export const useMe = () => useMemberQuery(accountKeys.me(), accountApi.me);
export const useAccountStatus = () =>
  useMemberQuery(accountKeys.status(), accountApi.accountStatus, { staleTime: 60_000 });
export const useBalances = () =>
  useMemberQuery(accountKeys.balances(), accountApi.balances, { refetchInterval: 30_000 });
export const useLifetime = () => useMemberQuery(accountKeys.lifetime(), accountApi.lifetime);
export const useRg = () => useMemberQuery(accountKeys.rg(), accountApi.rg);
export const useTwoFactor = () => useMemberQuery(accountKeys.twoFactor(), accountApi.twoFactor);
export const useSecurity = () => useMemberQuery(accountKeys.security(), accountApi.security);
export const usePreferences = () =>
  useMemberQuery(accountKeys.preferences(), accountApi.preferences);
export const useDeposits = () => useMemberQuery(accountKeys.deposits(), accountApi.deposits);
export const useKyc = () => useMemberQuery(accountKeys.kyc(), accountApi.kyc);
export const useKycDocuments = () =>
  useMemberQuery(accountKeys.kycDocuments(), accountApi.kycDocuments);
export const useDevices = (include: 'active' | 'all' = 'all') =>
  useMemberQuery(accountKeys.devices(include), (s) => accountApi.devices(include, s));

export function useTransactions(q: { pageSize: number; type?: string }) {
  return useMemberQuery(accountKeys.transactions(q), (s) => accountApi.transactions(q, s), {
    placeholderData: keepPreviousData,
  });
}

export function useNotifications(q: {
  page?: number;
  pageSize?: number;
  unread?: boolean;
  category?: NotificationCategoryFilter;
}) {
  return useMemberQuery(accountKeys.notifications(q), (s) => accountApi.notifications(q, s), {
    placeholderData: keepPreviousData,
  });
}

export function useLoginHistory(q: {
  filter: LoginFilter;
  days: number;
  page: number;
  pageSize: number;
}) {
  return useMemberQuery(accountKeys.loginHistory(q), (s) => accountApi.loginHistory(q, s), {
    placeholderData: keepPreviousData,
  });
}

/** Public data (no auth): the current round and the game catalogue. */
export function useCurrentRound() {
  return useQuery({
    queryKey: accountKeys.round(),
    queryFn: ({ signal }) => accountApi.currentRound(signal),
    refetchInterval: 30_000,
  });
}
export function useGames() {
  return useQuery({
    queryKey: accountKeys.games(),
    queryFn: ({ signal }) => accountApi.games(signal),
    staleTime: 5 * 60_000,
  });
}

export function useMyEntries(roundId: string | undefined) {
  return useMemberQuery(
    accountKeys.myEntries(roundId ?? 'none'),
    (s) => accountApi.myEntries(roundId!, s),
    { enabled: Boolean(roundId) },
  );
}

/** Invalidate everything the account pages show (after a security change, KYC step, …). */
export function useInvalidateAccount() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: accountKeys.all });
}

export function useClaimOwed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => accountApi.claimOwed(newIdempotencyKey()),
    // Owed → Available changes every module's balances (pool modal, wallet, history), not only the dashboard.
    onSettled: () => invalidatePlayerFinancials(qc),
  });
}
