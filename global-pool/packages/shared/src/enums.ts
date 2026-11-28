/**
 * Shared enums. Each enum is a const object (`TxStatus.COMPLETED`) plus a string-union type of its values
 * (`TxStatus`) and a values tuple (`TX_STATUSES`) for zod (`z.enum(TxStatus)` also works with zod 4).
 * Values are lowercase snake_case — keep Prisma enums in apps/api identical.
 */

type ValuesOf<T> = T[keyof T];
function valuesOf<const T extends Record<string, string>>(o: T): [ValuesOf<T>, ...ValuesOf<T>[]] {
  return Object.values(o) as [ValuesOf<T>, ...ValuesOf<T>[]];
}

// ── Ledger / balances ───────────────────────────────────────────────────────────────────────────

/** User balance buckets (computed from the append-only double-entry ledger). */
export const BalanceBucket = {
  AVAILABLE: 'available',
  LOCKED: 'locked',
  PENDING: 'pending',
  OWED: 'owed',
} as const;
export type BalanceBucket = ValuesOf<typeof BalanceBucket>;
export const BALANCE_BUCKETS = valuesOf(BalanceBucket);

/** Ledger account types: per-user buckets + system accounts. */
export const LedgerAccountType = {
  USER_AVAILABLE: 'user_available',
  USER_LOCKED: 'user_locked',
  USER_PENDING: 'user_pending',
  USER_OWED: 'user_owed',
  POOL: 'pool',
  FEES: 'fees',
  PRIZE_LIABILITY: 'prize_liability',
  REFUNDS: 'refunds',
  OPERATOR_REVENUE: 'operator_revenue',
  CHAIN_CLEARING: 'chain_clearing',
} as const;
export type LedgerAccountType = ValuesOf<typeof LedgerAccountType>;
export const LEDGER_ACCOUNT_TYPES = valuesOf(LedgerAccountType);

// ── Transactions ────────────────────────────────────────────────────────────────────────────────

export const TxType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  ENTRY_PURCHASE: 'entry_purchase',
  PLATFORM_FEE: 'platform_fee',
  PRIZE: 'prize',
  REFUND: 'refund',
  REWARD: 'reward',
  RAKEBACK: 'rakeback',
  CASHBACK: 'cashback',
  REFERRAL_COMMISSION: 'referral_commission',
} as const;
export type TxType = ValuesOf<typeof TxType>;
export const TX_TYPES = valuesOf(TxType);

export const TxStatus = {
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  UNDER_REVIEW: 'under_review',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;
export type TxStatus = ValuesOf<typeof TxStatus>;
export const TX_STATUSES = valuesOf(TxStatus);

export const DepositStatus = {
  DETECTED: 'detected',
  CONFIRMING: 'confirming',
  CREDITED: 'credited',
  REJECTED: 'rejected',
} as const;
export type DepositStatus = ValuesOf<typeof DepositStatus>;
export const DEPOSIT_STATUSES = valuesOf(DepositStatus);

/** requested → risk_check → under_review | queued → broadcast → confirmed | failed; rejected / cancelled. */
export const WithdrawalStatus = {
  REQUESTED: 'requested',
  RISK_CHECK: 'risk_check',
  UNDER_REVIEW: 'under_review',
  QUEUED: 'queued',
  BROADCAST: 'broadcast',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;
export type WithdrawalStatus = ValuesOf<typeof WithdrawalStatus>;
export const WITHDRAWAL_STATUSES = valuesOf(WithdrawalStatus);

/** Allowed withdrawal status transitions (state machine). Terminal states have no outgoing edges. */
export const WITHDRAWAL_TRANSITIONS: Readonly<
  Record<WithdrawalStatus, readonly WithdrawalStatus[]>
> = {
  requested: ['risk_check', 'cancelled'],
  risk_check: ['queued', 'under_review', 'rejected'],
  under_review: ['queued', 'rejected', 'cancelled'],
  queued: ['broadcast', 'cancelled'],
  broadcast: ['confirmed', 'failed'],
  confirmed: [],
  failed: [],
  rejected: [],
  cancelled: [],
};

export function canTransitionWithdrawal(from: WithdrawalStatus, to: WithdrawalStatus): boolean {
  return WITHDRAWAL_TRANSITIONS[from].includes(to);
}

// ── Global Pool ─────────────────────────────────────────────────────────────────────────────────

export const RoundStatus = {
  SCHEDULED: 'scheduled',
  OPEN: 'open',
  /** Entries closed, awaiting the VRF request. */
  CLOSED: 'closed',
  /** VRF requested, awaiting fulfilment. */
  DRAWING: 'drawing',
  SETTLED: 'settled',
  /** Threshold not met or VRF timeout → entries refunded to Owed. */
  CANCELLED: 'cancelled',
} as const;
export type RoundStatus = ValuesOf<typeof RoundStatus>;
export const ROUND_STATUSES = valuesOf(RoundStatus);

export const EntryStatus = {
  ACTIVE: 'active',
  WON: 'won',
  NOT_WON: 'not_won',
  REFUND_OWED: 'refund_owed',
  REFUNDED: 'refunded',
} as const;
export type EntryStatus = ValuesOf<typeof EntryStatus>;
export const ENTRY_STATUSES = valuesOf(EntryStatus);

export const PrizeTier = {
  FIRST: 'first',
  SECOND: 'second',
  THIRD: 'third',
  RUNNER_UP: 'runner_up',
} as const;
export type PrizeTier = ValuesOf<typeof PrizeTier>;
export const PRIZE_TIERS = valuesOf(PrizeTier);

export const RandomnessProvider = {
  CHAINLINK_VRF_V2_5: 'chainlink_vrf_v2_5',
  MOCK: 'mock',
} as const;
export type RandomnessProvider = ValuesOf<typeof RandomnessProvider>;

// ── Compliance ──────────────────────────────────────────────────────────────────────────────────

/** L1 basic, L2 full ID + liveness, L3 enhanced / source of funds. */
export const KycLevel = {
  NONE: 'none',
  LEVEL_1: 'level_1',
  LEVEL_2: 'level_2',
  LEVEL_3: 'level_3',
} as const;
export type KycLevel = ValuesOf<typeof KycLevel>;
export const KYC_LEVELS = valuesOf(KycLevel);
/** Numeric rank for comparisons (`KYC_LEVEL_RANK[user.level] >= KYC_LEVEL_RANK.level_2`). */
export const KYC_LEVEL_RANK: Readonly<Record<KycLevel, number>> = {
  none: 0,
  level_1: 1,
  level_2: 2,
  level_3: 3,
};
export const KYC_LEVEL_LABEL: Readonly<Record<KycLevel, string>> = {
  none: 'Not verified',
  level_1: 'Level 1 — Basic',
  level_2: 'Level 2 — Full ID + liveness',
  level_3: 'Level 3 — Enhanced (source of funds)',
};

export const KycStatus = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  RESUBMISSION_REQUIRED: 'resubmission_required',
} as const;
export type KycStatus = ValuesOf<typeof KycStatus>;
export const KYC_STATUSES = valuesOf(KycStatus);

export const AmlRiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type AmlRiskLevel = ValuesOf<typeof AmlRiskLevel>;
export const AML_RISK_LEVELS = valuesOf(AmlRiskLevel);

/** Responsible-gaming limit types (enforced server-side). */
export const RgLimitType = {
  DEPOSIT: 'deposit',
  PARTICIPATION: 'participation',
  LOSS: 'loss',
  SESSION_TIME: 'session_time',
} as const;
export type RgLimitType = ValuesOf<typeof RgLimitType>;
export const RG_LIMIT_TYPES = valuesOf(RgLimitType);

export const RgPeriod = { DAY: 'day', WEEK: 'week', MONTH: 'month' } as const;
export type RgPeriod = ValuesOf<typeof RgPeriod>;
export const RG_PERIODS = valuesOf(RgPeriod);

export const SelfExclusionDuration = {
  H24: '24h',
  D7: '7d',
  D30: '30d',
  M6: '6m',
  Y1: '1y',
  PERMANENT: 'permanent',
} as const;
export type SelfExclusionDuration = ValuesOf<typeof SelfExclusionDuration>;
export const SELF_EXCLUSION_DURATIONS = valuesOf(SelfExclusionDuration);

/** Actions protected by step-up 2FA (own TOTP + anti-phishing code). */
export const StepUpPurpose = {
  WITHDRAWAL: 'withdrawal',
  WHITELIST_CHANGE: 'whitelist_change',
  SECURITY_SETTINGS: 'security_settings',
} as const;
export type StepUpPurpose = ValuesOf<typeof StepUpPurpose>;
export const STEP_UP_PURPOSES = valuesOf(StepUpPurpose);

// ── Catalogue / promotions ──────────────────────────────────────────────────────────────────────

export const GameCategory = {
  JACKPOT: 'jackpot',
  ORIGINALS: 'originals',
  TABLE: 'table',
  SLOTS: 'slots',
  LIVE: 'live',
  DRAWS: 'draws',
  BINGO: 'bingo',
} as const;
export type GameCategory = ValuesOf<typeof GameCategory>;
export const GAME_CATEGORIES = valuesOf(GameCategory);

export const PromotionType = {
  WELCOME: 'welcome',
  DAILY_REWARDS: 'daily_rewards',
  MISSIONS: 'missions',
  RAKEBACK: 'rakeback',
  CASHBACK: 'cashback',
  TOURNAMENT: 'tournament',
  VIP: 'vip',
} as const;
export type PromotionType = ValuesOf<typeof PromotionType>;
export const PROMOTION_TYPES = valuesOf(PromotionType);

export const VipTier = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
} as const;
export type VipTier = ValuesOf<typeof VipTier>;
export const VIP_TIERS = valuesOf(VipTier);

// ── Admin RBAC ──────────────────────────────────────────────────────────────────────────────────

export const AdminRole = {
  SUPER_ADMIN: 'super_admin',
  FINANCE: 'finance',
  COMPLIANCE: 'compliance',
  SUPPORT: 'support',
  MARKETING: 'marketing',
  READ_ONLY: 'read_only',
} as const;
export type AdminRole = ValuesOf<typeof AdminRole>;
export const ADMIN_ROLES = valuesOf(AdminRole);
export const ADMIN_ROLE_LABEL: Readonly<Record<AdminRole, string>> = {
  super_admin: 'Super Admin',
  finance: 'Finance',
  compliance: 'Compliance',
  support: 'Support',
  marketing: 'Marketing',
  read_only: 'Read-only (auditor)',
};

/**
 * Admin permissions. By design there is NO permission to edit round results, choose winners, pay out
 * arbitrarily, edit ledger rows or silently adjust balances — those capabilities do not exist.
 */
export const Permission = {
  DASHBOARD_READ: 'dashboard.read',
  USERS_READ: 'users.read',
  USERS_PII_READ: 'users.pii.read',
  USERS_RESTRICT: 'users.restrict',
  KYC_READ: 'kyc.read',
  KYC_REVIEW: 'kyc.review',
  AML_READ: 'aml.read',
  AML_RESOLVE: 'aml.resolve',
  RG_READ: 'rg.read',
  GEO_RULES_MANAGE: 'compliance.geo_rules.manage',
  DEPOSITS_READ: 'deposits.read',
  WITHDRAWALS_READ: 'withdrawals.read',
  WITHDRAWALS_APPROVE: 'withdrawals.approve',
  WITHDRAWALS_REJECT: 'withdrawals.reject',
  LEDGER_READ: 'ledger.read',
  RECONCILIATION_READ: 'reconciliation.read',
  ROUNDS_READ: 'rounds.read',
  ROUNDS_SCHEDULE: 'rounds.schedule',
  GAMES_READ: 'games.read',
  GAMES_CONFIGURE: 'games.configure',
  PROMOTIONS_READ: 'marketing.promotions.read',
  PROMOTIONS_MANAGE: 'marketing.promotions.manage',
  PROMOTIONS_REVIEW: 'marketing.promotions.review',
  CMS_MANAGE: 'marketing.cms.manage',
  NOTIFICATIONS_SEND: 'notifications.send',
  AFFILIATES_READ: 'affiliates.read',
  AFFILIATES_MANAGE: 'affiliates.manage',
  AFFILIATE_PAYOUTS_APPROVE: 'affiliates.payouts.approve',
  SUPPORT_TICKETS_MANAGE: 'support.tickets.manage',
  REPORTS_EXPORT: 'reports.export',
  AUDIT_READ: 'audit.read',
  ADMINS_MANAGE: 'admins.manage',
  FEATURE_FLAGS_MANAGE: 'system.feature_flags.manage',
  SYSTEM_READ: 'system.read',
} as const;
export type Permission = ValuesOf<typeof Permission>;
export const PERMISSIONS = valuesOf(Permission);

export interface PermissionPolicy {
  /** A written reason is mandatory. */
  requiresReason: boolean;
  /** Fresh MFA re-authentication (TOTP) is mandatory. */
  requiresMfa: boolean;
  /** 'always' | 'flagged' (only for risk-flagged items) | 'never' — second approver required. */
  fourEyes: 'always' | 'flagged' | 'never';
}

const NONE: PermissionPolicy = { requiresReason: false, requiresMfa: false, fourEyes: 'never' };
const REASON: PermissionPolicy = { requiresReason: true, requiresMfa: false, fourEyes: 'never' };
const REASON_MFA: PermissionPolicy = { requiresReason: true, requiresMfa: true, fourEyes: 'never' };
const REASON_MFA_4EYES: PermissionPolicy = {
  requiresReason: true,
  requiresMfa: true,
  fourEyes: 'always',
};

/** Guard policy per permission. Every use of a sensitive permission must also write an audit_logs row. */
export const PERMISSION_POLICY: Readonly<Record<Permission, PermissionPolicy>> = {
  'dashboard.read': NONE,
  'users.read': NONE,
  'users.pii.read': REASON,
  'users.restrict': REASON_MFA,
  'kyc.read': NONE,
  'kyc.review': REASON,
  'aml.read': NONE,
  'aml.resolve': REASON_MFA,
  'rg.read': NONE,
  'compliance.geo_rules.manage': REASON_MFA_4EYES,
  'deposits.read': NONE,
  'withdrawals.read': NONE,
  'withdrawals.approve': { requiresReason: true, requiresMfa: true, fourEyes: 'flagged' },
  'withdrawals.reject': REASON_MFA,
  'ledger.read': NONE,
  'reconciliation.read': NONE,
  'rounds.read': NONE,
  'rounds.schedule': REASON_MFA,
  'games.read': NONE,
  'games.configure': REASON_MFA,
  'marketing.promotions.read': NONE,
  'marketing.promotions.manage': REASON,
  'marketing.promotions.review': REASON,
  'marketing.cms.manage': REASON,
  'notifications.send': REASON,
  'affiliates.read': NONE,
  'affiliates.manage': REASON,
  'affiliates.payouts.approve': REASON_MFA_4EYES,
  'support.tickets.manage': NONE,
  'reports.export': REASON,
  'audit.read': NONE,
  'admins.manage': REASON_MFA_4EYES,
  'system.feature_flags.manage': REASON_MFA_4EYES,
  'system.read': NONE,
};

const READ_PERMISSIONS = PERMISSIONS.filter((p) => p.endsWith('.read') && p !== 'users.pii.read');

/** Default role → permission mapping (seeded into admin_roles / admin_permissions). */
export const ROLE_PERMISSIONS: Readonly<Record<AdminRole, readonly Permission[]>> = {
  super_admin: PERMISSIONS,
  finance: [
    'dashboard.read',
    'users.read',
    'deposits.read',
    'withdrawals.read',
    'withdrawals.approve',
    'withdrawals.reject',
    'ledger.read',
    'reconciliation.read',
    'rounds.read',
    'affiliates.read',
    'affiliates.payouts.approve',
    'reports.export',
    'audit.read',
  ],
  compliance: [
    'dashboard.read',
    'users.read',
    'users.pii.read',
    'users.restrict',
    'kyc.read',
    'kyc.review',
    'aml.read',
    'aml.resolve',
    'rg.read',
    'compliance.geo_rules.manage',
    'deposits.read',
    'withdrawals.read',
    'withdrawals.approve',
    'withdrawals.reject',
    'rounds.read',
    'marketing.promotions.read',
    'marketing.promotions.review',
    'audit.read',
  ],
  support: [
    'dashboard.read',
    'users.read',
    'kyc.read',
    'rg.read',
    'deposits.read',
    'withdrawals.read',
    'rounds.read',
    'games.read',
    'support.tickets.manage',
  ],
  marketing: [
    'dashboard.read',
    'affiliates.read',
    'affiliates.manage',
    'marketing.promotions.read',
    'marketing.promotions.manage',
    'marketing.cms.manage',
    'notifications.send',
  ],
  read_only: READ_PERMISSIONS,
};

export function roleHasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ── Labels for UI ───────────────────────────────────────────────────────────────────────────────

export const TX_TYPE_LABEL: Readonly<Record<TxType, string>> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  entry_purchase: 'Global Pool entries',
  platform_fee: 'Platform fee',
  prize: 'Prize',
  refund: 'Refund',
  reward: 'Reward',
  rakeback: 'Rakeback',
  cashback: 'Cashback',
  referral_commission: 'Referral commission',
};

export const TX_STATUS_LABEL: Readonly<Record<TxStatus, string>> = {
  pending: 'Pending',
  confirming: 'Confirming',
  under_review: 'Under review',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const WITHDRAWAL_STATUS_LABEL: Readonly<Record<WithdrawalStatus, string>> = {
  requested: 'Requested',
  risk_check: 'Security checks',
  under_review: 'Under review',
  queued: 'Queued',
  broadcast: 'Sent',
  confirmed: 'Completed',
  failed: 'Failed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ROUND_STATUS_LABEL: Readonly<Record<RoundStatus, string>> = {
  scheduled: 'Scheduled',
  open: 'Open',
  closed: 'Closed — awaiting draw',
  drawing: 'Drawing (VRF requested)',
  settled: 'Settled',
  cancelled: 'Cancelled — refunds owed',
};
