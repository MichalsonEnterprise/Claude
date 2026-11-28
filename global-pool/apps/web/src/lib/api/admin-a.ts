/**
 * Admin console API wrappers (admin-a: ADM-00/01/02, U1–U10, S1–S3, X1, MOB-11). Admin auth is separate from Privy
 * (owner decision #3): every call uses `auth: 'admin'`, i.e. the token provider registered by AdminSessionProvider.
 * Money is a decimal string on the wire — format with @gp/shared/money, never parse to a float.
 */
import type {
  AdminApprovalView,
  AdminPiiField,
  AdminRestrictionApply,
  AdminRoleChange,
  AdminUsersQuery,
  Paginated,
} from '@gp/shared/schemas';
import type {
  AdminRole,
  ApprovalStatus,
  FourEyesAction,
  KycLevel,
  Permission,
  PermissionPolicy,
  RestrictionType,
  TxType,
} from '@gp/shared/enums';

import { apiRequest } from './client';

// ── auth ─────────────────────────────────────────────────────────────────────────────────────────

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  title: string | null;
  status: 'active' | 'disabled';
  roles: AdminRole[];
  permissions: Permission[];
  lastLoginAt: string | null;
  isDemo: boolean;
}

export interface AdminTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access-token lifetime in seconds (= idle timeout, 15 min by default). */
  expiresIn: number;
  /** Absolute end of the session family (ADMIN_SESSION_TTL). */
  sessionExpiresAt: string;
}

export const adminLogin = (body: { email: string; password: string; totpCode: string }) =>
  apiRequest<AdminTokens & { admin: AdminProfile }>('/admin/auth/login', {
    method: 'POST',
    body,
    auth: 'none',
  });

export const adminRefresh = (refreshToken: string) =>
  apiRequest<AdminTokens>('/admin/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    auth: 'none',
  });

export const adminLogout = (accessToken: string) =>
  apiRequest<{ signedOut: boolean }>('/admin/auth/logout', {
    method: 'POST',
    auth: 'none',
    headers: { authorization: `Bearer ${accessToken}` },
  });

export const adminMe = () => apiRequest<AdminProfile>('/admin/auth/me', { auth: 'admin' });

// ── overview ─────────────────────────────────────────────────────────────────────────────────────

export interface AdminDashboard {
  windowDays: number;
  totalUsers: number;
  activeUsers: number;
  totalDeposits: string;
  depositsCount: number;
  totalWithdrawals: string;
  withdrawalsCount: number;
  platformFees: string;
  qualifyingEntries: number;
  platformFeesAllTime: string;
  poolLiabilities: string;
  owedPrizes: string;
  owedTotal: string;
  customerLiabilities: string;
  chainClearing: string;
  operatorRevenue: string;
  activeRounds: number;
  pendingWithdrawals: number;
  withdrawalsUnderReview: number;
  kycPending: number;
  amlOpenAlerts: number;
  ledger: LedgerReconciliation;
  generatedAt: string;
}

export interface LedgerReconciliation {
  ok: boolean;
  ledgerTotal: string;
  unbalancedPostings: number;
  poolMismatches: { roundNumber: number; ledger: string; projection: string }[];
}

export interface HealthCheck {
  key: string;
  name: string;
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

export interface SystemHealth {
  status: 'operational' | 'degraded' | 'down';
  environment: string;
  demoMode: boolean;
  realMoneyEnabled: boolean;
  chainEnv: string;
  jobsEnabled: boolean;
  version: string;
  uptimeSeconds: number;
  services: HealthCheck[];
  queues: {
    name: string;
    status: 'up' | 'down';
    counts: Record<string, number> | null;
    error?: string;
  }[];
  randomness: { provider: string; lastFulfilledAt: string | null; pendingRequests: number };
  chains: {
    network: string;
    name: string;
    testnet: string;
    chainId: number;
    enabled: boolean;
    status: string;
    rpcConfigured: boolean;
    tokenConfigured: boolean;
    poolContractConfigured: boolean;
    confirmations: number;
  }[];
  chainCursors: { key: string; lastBlock: string; updatedAt: string }[];
  featureFlags: { key: string; enabled: boolean; description: string | null }[];
  ledger: LedgerReconciliation;
  checkedAt: string;
}

export interface AdminAlert {
  key: string;
  category: 'operations' | 'compliance';
  severity: 'high' | 'warning' | 'info';
  title: string;
  body: string;
  href: string | null;
  permission: Permission | null;
  acknowledged: { by: string | null; at: string } | null;
}

export interface AdminAlerts {
  items: AdminAlert[];
  counts: { total: number; unacknowledged: number; operations: number; compliance: number };
  generatedAt: string;
}

export interface AdminRound {
  id: string;
  number: number;
  status: string;
  opensAt?: string;
  closesAt: string;
  entries?: number;
  entriesCount?: number;
  participants?: number;
  participantsCount?: number;
  poolAmount?: string;
  poolBalance?: string;
  platformFees?: string;
  isDemo?: boolean;
  [key: string]: unknown;
}

export const getDashboard = () => apiRequest<AdminDashboard>('/admin/dashboard', { auth: 'admin' });
export const getSystemHealth = () =>
  apiRequest<SystemHealth>('/admin/system/health', { auth: 'admin' });
export const getAlerts = () => apiRequest<AdminAlerts>('/admin/alerts', { auth: 'admin' });
export const ackAlert = (key: string, note?: string) =>
  apiRequest<{ key: string; acknowledgedAt: string; auditSeq: string }>(
    `/admin/alerts/${encodeURIComponent(key)}/ack`,
    { method: 'POST', auth: 'admin', body: note ? { note } : {} },
  );
export const getAdminRounds = (pageSize = 10) =>
  apiRequest<Paginated<AdminRound>>('/admin/rounds', { auth: 'admin', query: { pageSize } });

// ── four-eyes ────────────────────────────────────────────────────────────────────────────────────

export interface ApprovalItem {
  id: string;
  ref: string;
  action: FourEyesAction | string;
  actionLabel: string;
  module: string;
  targetType: string;
  targetId: string;
  summary: string;
  status: ApprovalStatus;
  requiredPermission: Permission | null;
  requestedBy: { id: string; name: string; title: string | null; roles: AdminRole[] };
  requestReason: string;
  requestCategory: string | null;
  decidedBy: { id: string; name: string; title: string | null } | null;
  decisionReason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
  decidedAt: string | null;
  yourRole: 'can_decide' | 'requester' | 'not_eligible' | 'decided';
}

export interface ApprovalDetail extends ApprovalItem {
  eligibleApprovers: {
    id: string;
    name: string;
    title: string | null;
    roles: AdminRole[];
    lastLoginAt: string | null;
  }[];
  auditTrail: {
    seq: string;
    action: string;
    actor: string | null;
    reason: string | null;
    hash: string;
    createdAt: string;
  }[];
}

export interface ApprovalsInbox {
  view: AdminApprovalView;
  items: ApprovalItem[];
  counts: Record<AdminApprovalView, number>;
  generatedAt: string;
}

export interface PendingApprovalResult {
  status: 'pending_approval';
  approval: { id: string; ref: string; action: string; expiresAt: string; auditSeq: string };
}

export interface DecisionInput {
  reason: string;
  mfaCode: string;
  reasonCategory?: string;
}

export const getApprovalsInbox = (view: AdminApprovalView = 'open') =>
  apiRequest<ApprovalsInbox>('/admin/approvals/inbox', { auth: 'admin', query: { view } });
export const getApproval = (id: string) =>
  apiRequest<ApprovalDetail>(`/admin/approvals/${id}`, { auth: 'admin' });
export const approveRequest = (id: string, body: DecisionInput) =>
  apiRequest<{ status: 'approved'; ref: string; auditSeq?: string; result?: unknown }>(
    `/admin/approvals/${id}/approve`,
    { method: 'POST', auth: 'admin', body },
  );
export const rejectRequest = (id: string, body: DecisionInput) =>
  apiRequest<{ status: 'rejected'; ref: string; auditSeq?: string }>(
    `/admin/approvals/${id}/reject`,
    { method: 'POST', auth: 'admin', body },
  );
export const withdrawRequest = (id: string, reason: string) =>
  apiRequest<{ status: 'cancelled'; ref: string; auditSeq: string }>(
    `/admin/approvals/${id}/withdraw`,
    { method: 'POST', auth: 'admin', body: { reason } },
  );

// ── users ────────────────────────────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  publicId: string;
  handle: string | null;
  emailMasked: string | null;
  country: string | null;
  kycLevel: KycLevel;
  vipTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  status: 'active' | 'suspended' | 'closed';
  onboarded: boolean;
  restrictions: RestrictionType[];
  createdAt: string;
  lastLoginAt: string | null;
  totalBalance?: string;
  amlOpenAlerts?: number;
  amlRiskLevel?: 'low' | 'medium' | 'high' | 'critical' | null;
  isDemo: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers30d: number;
  kycVerified: number;
  newUsers30d: number;
  restrictedAccounts: number;
  nonActiveAccounts: number;
  generatedAt: string;
}

export interface UserBalances {
  currency: 'USDT';
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
  breakdown: {
    lockedWithdrawals: string;
    lockedEntries: string;
    lockedEntriesByRound: { roundId: string; roundNumber: number; amount: string }[];
  };
}

export interface UserRestriction {
  id: string;
  type: RestrictionType;
  reason: string;
  appliedAt: string;
  liftedAt: string | null;
  liftReason: string | null;
}

export interface AdminUserDetail {
  id: string;
  publicId: string;
  handle: string | null;
  emailMasked: string | null;
  status: 'active' | 'suspended' | 'closed';
  country: string | null;
  kycLevel: KycLevel;
  vip: { tier: AdminUserRow['vipTier']; level: number };
  twoFactorEnabled: boolean;
  onboardedAt: string | null;
  balances: UserBalances;
  activeSessions: number;
  restrictions: UserRestriction[];
  kyc: { id: string; level: KycLevel; status: string; provider: string; createdAt: string }[];
  amlAlerts: { id: string; riskLevel: string; rule: string; status: string; createdAt: string }[];
  recentTransactions: {
    reference: string;
    type: TxType;
    status: string;
    amount: string;
    netAmount: string;
    createdAt: string;
  }[];
  isDemo: boolean;
}

export interface UserAccount {
  id: string;
  publicId: string;
  handle: string | null;
  displayName: string | null;
  emailMasked: string | null;
  emailVerified: boolean;
  dateOfBirthMasked: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  onboardedAt: string | null;
  lastLoginAt: string | null;
  consents: {
    ageConfirmedAt: string | null;
    jurisdictionConfirmedAt: string | null;
    termsAcceptedAt: string | null;
    termsVersion: string | null;
    privacyAcceptedAt: string | null;
    privacyVersion: string | null;
    marketingOptIn: boolean;
    marketingOptInAt: string | null;
  };
  security: {
    twoFactor: string;
    twoFactorSince: string | null;
    backupCodesLeft: number;
    antiPhishingCodeSet: boolean;
  };
  sessions: {
    id: string;
    device: string;
    ipMasked: string | null;
    location: string | null;
    flagged: boolean;
    flaggedReason: string | null;
    createdAt: string;
    lastSeenAt: string;
    revokedAt: string | null;
    isDemo: boolean;
  }[];
  canRevealPii: boolean;
  isDemo: boolean;
}

export interface UserWallets {
  wallets: {
    id: string;
    network: string;
    address: string;
    source: string;
    walletClient: string | null;
    label: string | null;
    isPrimary: boolean;
    verifiedAt: string | null;
    whitelistedAt: string | null;
    whitelistAvailableAt: string | null;
    removedAt: string | null;
    status: 'removed' | 'cooldown' | 'whitelisted' | 'linked';
    withdrawalsCount: number;
    lastWithdrawalAt: string | null;
    isDemo: boolean;
  }[];
  depositAddresses: {
    id: string;
    network: string;
    address: string;
    derivationPath: string;
    createdAt: string;
  }[];
  isDemo: boolean;
}

export interface UserKyc {
  level: KycLevel;
  label: string;
  status: string;
  dailyWithdrawalLimit: string;
  provider: string;
  records: {
    id: string;
    level: KycLevel;
    status: string;
    provider: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
  }[];
  limitsByLevel: { level: KycLevel; label: string; dailyWithdrawalLimit: string }[];
}

export interface UserAml {
  score: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: { factor: string; points: number; detail: string }[];
    bands: Record<'low' | 'medium' | 'high' | 'critical', [number, number]>;
  };
  model: string;
  alerts: {
    id: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    rule: string;
    status: string;
    resolution: string | null;
    withdrawalId: string | null;
    depositId: string | null;
    details: unknown;
    createdAt: string;
    resolvedAt: string | null;
    isDemo: boolean;
  }[];
  isDemo: boolean;
}

export interface UserTransaction {
  id: string;
  reference: string;
  type: TxType;
  status: string;
  direction: string;
  amount: string;
  platformFee: string;
  networkFee: string | null;
  netAmount: string;
  network: string | null;
  txHash: string | null;
  description: string;
  createdAt: string;
  completedAt: string | null;
  isDemo: boolean;
}

export interface UserTransactions extends Paginated<UserTransaction> {
  lifetime: {
    type: TxType;
    count: number;
    amount: string;
    platformFees: string;
    networkFees: string;
  }[];
  balances: UserBalances;
}

export interface UserRg {
  limits: {
    type: string;
    period: string;
    limit: string | null;
    minutes: number | null;
    used: string | null;
    remaining: string | null;
    pendingIncrease: { amount: string | null; minutes: number | null; effectiveAt: string } | null;
  }[];
  selfExclusion: { active: boolean; duration: string | null; endsAt: string | null };
  realityCheckMinutes: number;
  exclusionHistory: { id: string; duration: string; startsAt: string; endsAt: string | null }[];
  limitsUpdatedAt: { type: string; period: string; updatedAt: string; isDemo: boolean }[];
  adminCanLoosen: false;
}

export const getUsers = (query: Partial<AdminUsersQuery>) =>
  apiRequest<Paginated<AdminUserRow>>('/admin/users', { auth: 'admin', query });
export const getUserStats = () => apiRequest<UserStats>('/admin/user-stats', { auth: 'admin' });
export const getUser = (id: string) =>
  apiRequest<AdminUserDetail>(`/admin/users/${id}`, { auth: 'admin' });
export const getUserAccount = (id: string) =>
  apiRequest<UserAccount>(`/admin/users/${id}/account`, { auth: 'admin' });
export const revealUserPii = (id: string, field: AdminPiiField, reason: string) =>
  apiRequest<{ field: AdminPiiField; value: string | null; revealedAt: string; auditSeq: string }>(
    `/admin/users/${id}/pii/reveal`,
    { method: 'POST', auth: 'admin', body: { field, reason } },
  );
export const getUserWallets = (id: string) =>
  apiRequest<UserWallets>(`/admin/users/${id}/wallets`, { auth: 'admin' });
export const getUserKyc = (id: string) =>
  apiRequest<UserKyc>(`/admin/users/${id}/kyc`, { auth: 'admin' });
export const getUserAml = (id: string) =>
  apiRequest<UserAml>(`/admin/users/${id}/aml`, { auth: 'admin' });
export const getUserTransactions = (id: string, query: { page?: number; pageSize?: number; type?: TxType }) =>
  apiRequest<UserTransactions>(`/admin/users/${id}/transactions`, { auth: 'admin', query });
export const getUserRg = (id: string) =>
  apiRequest<UserRg>(`/admin/users/${id}/responsible-gaming`, { auth: 'admin' });

export const applyRestriction = (id: string, body: AdminRestrictionApply) =>
  apiRequest<
    | PendingApprovalResult
    | { status: 'active'; id: string; type: RestrictionType; appliedAt: string }
  >(`/admin/users/${id}/restrictions`, { method: 'POST', auth: 'admin', body });
export const liftRestriction = (id: string, restrictionId: string, body: DecisionInput) =>
  apiRequest<{ id: string; type: RestrictionType; liftedAt: string }>(
    `/admin/users/${id}/restrictions/${restrictionId}/lift`,
    { method: 'POST', auth: 'admin', body },
  );

// ── audit ────────────────────────────────────────────────────────────────────────────────────────

export interface AuditRow {
  id: string;
  seq: string;
  actorType: 'admin' | 'user' | 'system';
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  outcome: string;
  ip: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  prevHash: string;
  hash: string;
  createdAt: string;
}

export interface AuditVerification {
  ok: boolean;
  checked: number;
  total: number;
  headHash: string;
  firstBrokenSeq: string | number | null;
  problem: string | null;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
}

export const getAuditLogs = (query: AuditQuery) =>
  apiRequest<Paginated<AuditRow>>('/admin/audit-logs', { auth: 'admin', query: { ...query } });
export const verifyAuditChain = () =>
  apiRequest<AuditVerification>('/admin/audit-logs/verify', { auth: 'admin' });

// ── roles & permissions ──────────────────────────────────────────────────────────────────────────

export interface RoleView {
  key: string;
  name: string;
  label: string;
  description: string | null;
  fixed: boolean;
  permissions: Permission[];
  members: {
    id: string;
    name: string;
    title: string | null;
    status: string;
    lastLoginAt: string | null;
    isDemo: boolean;
  }[];
}

export interface RolesResponse {
  roles: RoleView[];
  pendingChanges: {
    approvalId: string;
    roleKey: string;
    grant: Permission[];
    revoke: Permission[];
    requestedBy: string;
    createdAt: string;
    expiresAt: string | null;
  }[];
}

export interface PermissionView {
  key: Permission;
  label: string;
  group: string;
  policy: PermissionPolicy;
}

export const getRoles = () => apiRequest<RolesResponse>('/admin/roles', { auth: 'admin' });
export const getPermissions = () =>
  apiRequest<PermissionView[]>('/admin/permissions', { auth: 'admin' });
export const requestRoleChange = (key: string, body: AdminRoleChange) =>
  apiRequest<PendingApprovalResult>(`/admin/roles/${key}/change-requests`, {
    method: 'POST',
    auth: 'admin',
    body,
  });
