/**
 * Admin back-office wrappers for Finance (ADM-F1…F9), Global Pool monitoring (ADM-P1…P10) and Compliance
 * (ADM-C1, ADM-C2) over the shared `apiRequest()` client (admin bearer token). Response types mirror
 * apps/api/src/modules/admin-ops/*. Money is always a decimal string — format with @gp/shared/money.
 *
 * Writes: withdrawal approve/reject (existing /admin/withdrawals/:id/*), KYC decisions, CSV exports, the NEW-entries
 * circuit breaker and refund reminders. There is no wrapper that could change results, ledger rows or balances.
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  AdminExportRequest,
  CircuitBreakerDecision,
  CircuitBreakerRequest,
  KycDecision,
  Paginated,
} from '@gp/shared/schemas';

import { apiRequest } from './client';

type Q = Record<string, string | number | boolean | undefined | null>;
const admin = <T>(path: string, query?: Q) => apiRequest<T>(path, { auth: 'admin', query });
const post = <T>(path: string, body: unknown) =>
  apiRequest<T>(path, { auth: 'admin', method: 'POST', body });

// ── shared bits ───────────────────────────────────────────────────────────────────────────────

export interface AdminMe {
  id: string;
  email: string;
  name: string;
  title?: string | null;
  roles: string[];
  permissions: string[];
}

export interface UserRef {
  id: string;
  publicId: string;
  handle: string | null;
}

export interface PostingLine {
  accountType: string;
  account: string;
  handle: string | null;
  amount: string;
  side: 'debit' | 'credit';
}
export interface PostingView {
  id: string;
  kind: string;
  kindLabel: string;
  reference: string | null;
  description: string;
  createdAt: string;
  debits: string;
  credits: string;
  balanced: boolean;
  lines: PostingLine[];
  isDemo: boolean;
}

export interface ImmutablePolicy {
  cannot: string[];
  allowed: string;
}

// ── finance ───────────────────────────────────────────────────────────────────────────────────

export interface DepositRow {
  id: string;
  reference: string;
  user: UserRef;
  network: string;
  networkName: string;
  amount: string;
  confirmations: number;
  requiredConfirmations: number;
  status: 'detected' | 'confirming' | 'credited' | 'rejected';
  txHash: string;
  fromAddress: string | null;
  toAddress: string;
  detectedAt: string;
  creditedAt: string | null;
  amlAlert: { id: string; riskLevel: string; status: string; rule: string } | null;
  isDemo: boolean;
}
export interface DepositsResponse extends Paginated<DepositRow> {
  summary: {
    credited24h: { count: number; amount: string };
    confirming: { count: number; amount: string };
    detected: { count: number; amount: string };
    credited: { count: number; amount: string };
    rejected: { count: number; amount: string };
    heldForCompliance: number;
    unsupported24h: { count: number; amount: string };
  };
  networks: {
    network: string;
    name: string;
    enabled: boolean;
    requiredConfirmations: number;
    watcher: 'running' | 'not_configured' | 'coming_soon';
    lastBlock: string | null;
    confirming: number;
    confirmingAmount: string;
    deposits: number;
    creditedToday: number;
  }[];
  held: {
    id: string;
    reference: string;
    handle: string | null;
    network: string;
    networkName: string;
    amount: string;
    alert: { id: string; rule: string; riskLevel: string } | null;
    isDemo: boolean;
  }[];
  generatedAt: string;
}

export interface WithdrawalRow {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  user: UserRef;
  network: string;
  networkName: string;
  toAddress: string;
  amount: string;
  networkFee: string;
  youReceive: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  riskScore: number;
  riskFlags: unknown;
  flagged: boolean;
  requiresFourEyes: boolean;
  amlAlert: { id: string; rule: string } | null;
  approval: {
    id: string;
    approvals: number;
    of: number;
    requestedBy: string;
    requestedByMe: boolean;
  } | null;
  createdAt: string;
  slaDueAt: string;
  slaMinutesLeft: number | null;
  isDemo: boolean;
}
export type WithdrawalView =
  'queue' | 'awaiting_second' | 'broadcasting' | 'completed' | 'rejected' | 'all';
export interface WithdrawalsResponse extends Paginated<WithdrawalRow> {
  policy: { slaHours: number; fourEyesAmount: string; fourEyesRule: string; immutable: string };
  summary: {
    open: number;
    oldestOpenMinutes: number | null;
    awaitingSecond: number;
    underReview: number;
    onHold: string;
    broadcasting: number;
    completed: number;
    rejected: number;
    withinSlaPercent: number;
    paid24h: { count: number; amount: string };
  };
  slaWatch: {
    id: string;
    reference: string;
    handle: string | null;
    amount: string;
    status: string;
    statusLabel: string;
    riskLevel: string | null;
    requiresFourEyes: boolean;
    slaMinutesLeft: number;
  }[];
  view: WithdrawalView;
  generatedAt: string;
}

export interface WithdrawalDetail {
  id: string;
  reference: string;
  network: string;
  toAddress: string;
  amount: string;
  networkFee: string;
  platformFee: string;
  youReceive: string;
  status: string;
  statusLabel: string;
  flagged: boolean;
  requiresFourEyes: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  txHash: string | null;
  rejectionReason: string | null;
  failureReason: string | null;
  timeline: { status: string; label: string; at: string }[];
  createdAt: string;
  isDemo: boolean;
  user: UserRef & {
    status: string;
    country: string | null;
    kycLevel: string;
    vipTier: string;
    memberSince: string;
    confirmedWithdrawals: number;
    twoFactorEnabled: boolean;
    isDemo: boolean;
  };
  risk: { score: number; level: string; factors: string[] };
  balances: { available: string; locked: string; pending: string; owed: string; total: string };
  destination: {
    address: string;
    network: string;
    networkName: string;
    whitelistedAt: string | null;
    source: string | null;
    previousPayouts: number;
    firstPayout: boolean;
  };
  sla: { hours: number; dueAt: string; minutesLeft: number | null };
  fourEyes: {
    required: boolean;
    approvals: number;
    of: number;
    pendingApprovalId: string | null;
    firstApprover: string | null;
    firstApprovedByMe: boolean;
  };
  canDecide: boolean;
  canApprove: boolean;
  amlAlerts: {
    id: string;
    reference: string;
    riskLevel: string;
    rule: string;
    status: string;
    details: Record<string, unknown>;
    createdAt: string;
    isDemo: boolean;
  }[];
  approvals: {
    id: string;
    status: string;
    requestedBy: string;
    requestReason: string;
    decidedBy: string | null;
    decisionReason: string | null;
    createdAt: string;
    decidedAt: string | null;
  }[];
  audit: {
    seq: string;
    action: string;
    actorLabel: string | null;
    actorType: string;
    reason: string | null;
    outcome: string;
    hash: string;
    createdAt: string;
  }[];
  postings: PostingView[];
  fees: { networkFee: string; platformFee: string; note: string };
}

export interface WithdrawalDecisionResult {
  status: string;
  fourEyes?: { required: boolean; approvals: number; of: number; approvalId?: string };
}

export interface FeesResponse {
  rule: {
    perEntry: string;
    entryPrice: string;
    description: string;
    changePolicy: string;
    cancelledRounds: string;
  };
  totals: {
    allTime: string;
    allTimeEntries: number;
    last30d: string;
    last30dEntries: number;
    last24h: string;
    last24hEntries: number;
    feesAccountBalance: string;
    subLedgerMatchesAccount: boolean;
    cancelledRoundFees: string;
  };
  series: { day: string; amount: string; entries: number }[];
  byRound: {
    roundId: string | null;
    roundNumber: number | null;
    status: string | null;
    amount: string;
    entries: number;
    state: 'accruing' | 'retained_cancelled' | 'earned';
    closesAt: string | null;
    isDemo: boolean;
  }[];
  generatedAt: string;
}

export interface PrizeTierAmountView {
  tier: string;
  label: string;
  sharePercent: string;
  winners: number;
  amountEach: string;
  amountTotal: string;
}
export interface PoolAccountingResponse {
  liabilities: {
    total: string;
    poolEscrow: string;
    owedPrizes: string;
    owedPrizesCount: number;
    refundsOutstanding: string;
    refundsOutstandingCount: number;
    rewardsOwed: string;
  };
  accounts: {
    pool: string;
    prizeLiability: string;
    refundsClearing: string;
    fees: string;
    operatorRevenue: string;
    userOwed: string;
    customerBalances: string;
    custodyMirror: string;
  };
  currentRound: {
    number: number;
    status: string;
    entries: number;
    participants: number;
    entryPrice: string;
    pool: string;
    fees: string;
    closesAt: string;
    waterfall: { pool: string; tiers: PrizeTierAmountView[]; totalPaid: string; remainder: string };
    isDemo: boolean;
  } | null;
  rounds: {
    number: number;
    status: string;
    projection: string;
    ledger: string;
    entriesIn: string;
    refunded: string;
    settledOut: string;
    matches: boolean;
    isDemo: boolean;
  }[];
  policy: string;
  generatedAt: string;
}

export interface JournalPosting extends PostingView {
  journalSeq: number | null;
  prevHash: string | null;
  chainHash: string | null;
}
export interface LedgerResponse extends Paginated<JournalPosting> {
  pageTotals: { debits: string; credits: string; balanced: boolean };
  journal: { postings: number; headHash: string };
}
export interface LedgerIntegrity {
  appendOnly: {
    ok: boolean;
    /** `enabled` = the trigger fires (a disabled trigger is still `present`). */
    triggers: { name: string; table?: string; present: boolean; enabled?: boolean }[];
  };
  balanced: { ok: boolean; ledgerTotal: string; unbalancedPostings: number };
  journal: { postings: number; headHash: string; algorithm: string };
  auditChain: {
    ok: boolean;
    checked: number;
    headHash: string;
    firstBrokenSeq: string | null;
    problem: string | null;
  };
  generatedAt: string;
}

export interface ReconScope {
  key: string;
  scope: string;
  group: 'ledger' | 'sub_ledger' | 'pool' | 'custody' | 'in_flight';
  expected: string;
  actual: string;
  expectedLabel: string;
  actualLabel: string;
  difference: string;
  status: 'match' | 'mismatch' | 'pending';
  note: string;
}
export interface ReconciliationResponse {
  ok: boolean;
  summary: { total: number; match: number; mismatch: number; pending: number };
  scopes: ReconScope[];
  policy: string;
  runAt: string;
}

export interface RefundRound {
  number: number;
  cancelledAt: string;
  closesAt: string;
  reason: string;
  participants: number;
  entries: number;
  minParticipants: number;
  minPool: string;
  stakes: string;
  platformFees: string;
  refundedToOwed: string;
  claimed: string;
  claimedPlayers: number;
  outstanding: string;
  outstandingPlayers: number;
  players: number;
  topOutstanding: {
    userId: string;
    handle: string | null;
    publicId: string;
    amount: string;
    entries: number;
    reference: string;
    since: string;
    isDemo: boolean;
  }[];
  isDemo: boolean;
}
export interface RefundsResponse {
  rounds: RefundRound[];
  totals: { outstanding: string; outstandingPlayers: number; claimed: string };
  notRefunds: {
    reference: string;
    kind: string;
    handle: string | null;
    amount: string;
    status: string;
    reason: string | null;
    at: string;
    isDemo: boolean;
  }[];
  policy: string;
  generatedAt: string;
}

/** GET /admin/pool/refunds (rounds.read): the pool view of the refunds — no finance-only returned withdrawals. */
export type PoolRefundsResponse = Omit<RefundsResponse, 'notRefunds'>;

export interface RevenueResponse {
  period: { days: number; from: string; to: string };
  gross: string;
  rewards: string;
  net: string;
  qualifyingEntries: number;
  networkFeesRecovered: string;
  products: { key: string; name: string; amount: string; share: string }[];
  weekly: { weekStart: string; net: string }[];
  statement: { line: string; source: string; amount: string }[];
  excluded: { line: string; amount: string | null; why: string }[];
  generatedAt: string;
}

export interface ExportResult {
  fileName: string;
  dataset: string;
  rows: number;
  bytes: number;
  sha256: string;
  includePersonalData: boolean;
  generatedAt: string;
  expiresAt: string;
  auditSeq: string;
  contentType: string;
  csv: string;
}

// ── pool ──────────────────────────────────────────────────────────────────────────────────────

export interface AdminRoundView {
  id: string;
  number: number;
  numberLabel: string;
  status: string;
  statusLabel: string;
  opensAt: string;
  openedAt: string;
  closesAt: string;
  closedAt: string | null;
  entryPrice: string;
  platformFeePerEntry: string;
  participants: number;
  entries: number;
  poolBalance: string;
  platformFees: string;
  thresholds: { minParticipants: number; minPool: string; met: boolean | null };
  prizeDistribution: PrizeTierAmountView[];
  draw: {
    provider: string;
    network: string | null;
    requestId: string;
    requestIdDisplay: string;
    requestedAt: string;
    fulfilledAt: string | null;
    confirmations: number | null;
    status: string;
    settledAt: string | null;
  } | null;
  winners: {
    place: number;
    tier: string;
    handle: string | null;
    entryId: string | null;
    entrySeq: number | null;
    amount: string;
  }[];
  cancellation: { reason: string; refundsTo: string } | null;
  settledAt: string | null;
  isDemo: boolean;
}

export interface RoundRow {
  id: string;
  number: number;
  status: string;
  statusLabel: string;
  closesAt: string;
  settledAt: string | null;
  participants: number;
  entries: number;
  pool: string;
  fees: string;
  firstPrize: string | null;
  thresholdsMet: boolean | null;
  vrf: { status: string; provider: string } | null;
  settlement:
    | { winners: number; of: number; credited: number; label: string }
    | { refundsClaimed: number; refundsTotal: number; label: string }
    | null;
  isDemo: boolean;
}

export interface PoolOverviewResponse {
  round: AdminRoundView | null;
  serverNow: string;
  previous: { number: number; pool: string; entries: number } | null;
  kpis: {
    pool: string;
    entries: number;
    participants: number;
    fees: string;
    owedPrizes: string;
    owedPrizesCount: number;
    refundsOutstanding: string;
    refundsOutstandingCount: number;
    entriesLastHour: number;
  };
  pipeline: {
    contract: { address: string | null; network: string; configured: boolean };
    randomness: {
      provider: string;
      timeoutHours: number;
      lastRequest: { status: string; requestedAt: string; fulfilledAt: string | null } | null;
    };
    newEntries: 'open' | 'paused';
    breakerLastChange: BreakerState['lastChange'];
    ledger: { ok: boolean; poolMismatches: number; checkedAt: string };
  };
  recent: RoundRow[];
  policy: ImmutablePolicy;
}

export interface PoolBalanceResponse {
  round: AdminRoundView | null;
  escrow: string;
  poolAccountsTotal: string;
  owedPrizes: string;
  refundsOutstanding: string;
  contractLiabilities: string;
  feesSeparate: string;
  perRound: {
    number: number;
    status: string;
    ledger: string;
    projection: string;
    fees: string;
    matches: boolean;
    isDemo: boolean;
  }[];
  hourly: { hour: string; added: string; entries: number; cumulative: string }[];
  movements: {
    id: string;
    kind: string;
    handle: string | null;
    entries: number;
    amount: string;
    at: string;
  }[];
  generatedAt: string;
}

export interface ActiveRoundResponse {
  round: AdminRoundView | null;
  serverNow: string;
  feed?: {
    id: string;
    handle: string | null;
    entries: number;
    amount: string;
    at: string;
    isDemo: boolean;
  }[];
  topParticipants?: { handle: string | null; entries: number; sharePercent: string }[];
  entriesPerHour?: { hour: string; entries: number }[];
  progress?: { participantsPercent: number; poolPercent: number };
  policy?: ImmutablePolicy;
}

export interface ParticipantRow {
  userId: string;
  handle: string | null;
  publicId: string;
  entries: number;
  stake: string;
  fees: string;
  sharePercent: string;
  firstEntry: string;
  lastEntry: string;
  firstAt: string;
  lastAt: string;
  kycLevel: string;
  country: string | null;
  restricted: boolean;
  isDemo: boolean;
}
export interface ParticipantsResponse extends Paginated<ParticipantRow> {
  round: {
    id: string;
    number: number;
    status: string;
    entries: number;
    participants: number;
    pool: string;
    isDemo: boolean;
  };
  stats: {
    maxEntries: number;
    medianEntries: number;
    singleEntryPlayers: number;
    maxSharePercent: string;
  };
}

export interface PrizesResponse {
  round: AdminRoundView;
  breakdown: { pool: string; tiers: PrizeTierAmountView[]; totalPaid: string; remainder: string };
  winners: (AdminRoundView['winners'][number] & {
    claimStatus: 'owed' | 'claimed' | 'not_materialised' | null;
    claimedAt: string | null;
  })[];
  settlement: {
    status: 'settled' | 'cancelled' | 'awaiting_randomness' | 'not_started';
    prizes: number;
    winnersRecorded: number;
    creditedToOwed: number;
    claimed: number;
    owed: number;
    owedAmount: string;
    postings: {
      id: string;
      kind: string;
      description: string;
      reference: string | null;
      at: string;
    }[];
    note: string;
  };
  policy: ImmutablePolicy;
}

export interface VrfResponse extends Paginated<{
  id: string;
  roundNumber: number;
  roundStatus: string;
  provider: string;
  status: string;
  requestId: string;
  attempt: number;
  requestTxHash: string | null;
  fulfillTxHash: string | null;
  randomWord: string | null;
  confirmations: number | null;
  requestedAt: string;
  fulfilledAt: string | null;
  latencySeconds: number | null;
  failureReason: string | null;
  isDemo: boolean;
}> {
  config: {
    provider: string;
    network: string;
    timeoutHours: number;
    contract: string | null;
    algorithm: string;
  };
  nextDraw: { roundNumber: number; status: string; closesAt: string } | null;
  counts: Record<string, number>;
}

export interface BreakerState {
  flag: string;
  entriesEnabled: boolean;
  state: 'open' | 'paused';
  scope: string;
  lastChange: { at: string; by: string | null; action: string | null; seq: string } | null;
  pending: {
    id: string;
    reference: string;
    action: string;
    requestedBy: string;
    requestedByMe: boolean;
    reason: string;
    reasonCategory: string | null;
    createdAt: string;
    expiresAt: string;
  } | null;
  history: {
    id: string;
    reference: string;
    action: string;
    status: string;
    requestedBy: string;
    decidedBy: string | null;
    reason: string;
    decisionReason: string | null;
    createdAt: string;
    decidedAt: string | null;
  }[];
  rules: {
    roles: string[];
    secondApprover: string;
    reauth: string;
    ttlMinutes: number;
    resume: string;
  };
  policy: ImmutablePolicy;
}

// ── compliance ────────────────────────────────────────────────────────────────────────────────

export interface KycRow {
  id: string;
  reference: string;
  user: UserRef & { country: string | null; currentLevel: string };
  level: string;
  levelLabel: string;
  status: string;
  provider: string;
  submittedAt: string;
  slaDueAt: string;
  slaHoursLeft: number | null;
  riskLevel: string;
  isDemo: boolean;
}
export interface KycQueueResponse extends Paginated<KycRow> {
  summary: {
    open: number;
    pending: number;
    inReview: number;
    resubmission: number;
    verified: number;
    rejected: number;
    decided24h: number;
    slaHours: number;
    slaBreached: number;
    oldestHours: number | null;
    decidedToday: { approved: number; rejected: number; infoRequested: number };
    medianDecisionMinutes7d: number | null;
  };
  recentDecisions: {
    seq: string;
    action: string;
    reference: string | null;
    recordId: string | null;
    handle: string | null;
    level: string | null;
    by: string | null;
    at: string;
  }[];
  generatedAt: string;
}
export interface KycDetail {
  id: string;
  reference: string;
  level: string;
  levelLabel: string;
  status: string;
  provider: string;
  providerRef: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  sla: { hours: number; dueAt: string; hoursLeft: number };
  canDecide: boolean;
  user: UserRef & {
    emailMasked: string | null;
    country: string | null;
    dateOfBirthMasked: string | null;
    memberSince: string;
    status: string;
    currentLevel: string;
    currentLevelLabel: string;
    restrictions: string[];
    isDemo: boolean;
  };
  limits: {
    current: string;
    afterApproval: string;
    byLevel: { level: string; label: string; dailyWithdrawal: string }[];
  };
  checks: { key: string; label: string; ok: boolean; detail: string }[];
  risk: { score: number; level: string; factors: string[] };
  activity: {
    balances: { available: string; locked: string; pending: string; owed: string; total: string };
    deposits: { count: number; amount: string };
    withdrawals: { count: number; amount: string };
  };
  history: {
    id: string;
    reference: string;
    level: string;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    rejectionReason: string | null;
  }[];
  amlAlerts: {
    id: string;
    reference: string;
    riskLevel: string;
    rule: string;
    status: string;
    createdAt: string;
  }[];
  audit: {
    seq: string;
    action: string;
    actorLabel: string | null;
    reason: string | null;
    createdAt: string;
    hash: string;
  }[];
  documentsNote: string;
  isDemo: boolean;
}

export interface AmlRow {
  id: string;
  reference: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  rule: string;
  status: string;
  user: UserRef | null;
  subject: {
    type: 'withdrawal' | 'deposit';
    id: string;
    reference: string;
    amount: string;
    network: string;
    address: string | null;
    status: string;
  } | null;
  reason: string | null;
  decision: string | null;
  provider: string | null;
  checks: unknown;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  ageHours: number;
  isDemo: boolean;
}
export interface AmlResponse extends Paginated<AmlRow> {
  summary: {
    open: number;
    escalated: number;
    highOrCritical: number;
    byRisk: { low: number; medium: number; high: number; critical: number };
    resolved7d: number;
    closed30d: number;
    noIssueRate30d: number | null;
  };
  actions: { allowed: string[]; note: string };
  generatedAt: string;
}

// ── query keys + hooks ────────────────────────────────────────────────────────────────────────

export const adminBKeys = {
  all: ['admin-b'] as const,
  me: () => ['admin-b', 'me'] as const,
  deposits: (q: Q) => ['admin-b', 'deposits', q] as const,
  withdrawals: (q: Q) => ['admin-b', 'withdrawals', q] as const,
  withdrawal: (id: string) => ['admin-b', 'withdrawal', id] as const,
  fees: () => ['admin-b', 'fees'] as const,
  poolAccounting: () => ['admin-b', 'pool-accounting'] as const,
  ledger: (q: Q) => ['admin-b', 'ledger', q] as const,
  ledgerIntegrity: () => ['admin-b', 'ledger-integrity'] as const,
  reconciliation: () => ['admin-b', 'reconciliation'] as const,
  refunds: () => ['admin-b', 'refunds'] as const,
  poolRefunds: () => ['admin-b', 'pool', 'refunds'] as const,
  revenue: (days: number) => ['admin-b', 'revenue', days] as const,
  poolOverview: () => ['admin-b', 'pool', 'overview'] as const,
  poolBalance: () => ['admin-b', 'pool', 'balance'] as const,
  activeRound: () => ['admin-b', 'pool', 'active'] as const,
  rounds: (q: Q) => ['admin-b', 'pool', 'rounds', q] as const,
  participants: (n: number, q: Q) => ['admin-b', 'pool', 'participants', n, q] as const,
  prizes: (n: number) => ['admin-b', 'pool', 'prizes', n] as const,
  vrf: (q: Q) => ['admin-b', 'pool', 'vrf', q] as const,
  breaker: () => ['admin-b', 'pool', 'breaker'] as const,
  kyc: (q: Q) => ['admin-b', 'kyc', q] as const,
  kycDetail: (id: string) => ['admin-b', 'kyc', 'detail', id] as const,
  aml: (q: Q) => ['admin-b', 'aml', q] as const,
};

type Opts<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;
const live = { refetchInterval: 30_000 } as const;

export const useAdminMe = () =>
  useQuery({
    queryKey: adminBKeys.me(),
    queryFn: () => admin<AdminMe>('/admin/auth/me'),
    staleTime: 60_000,
    retry: false,
  });

/** Permission check for UI affordances (the API enforces RBAC again on every call). */
export function useCan(permission: string | readonly string[]): boolean {
  const me = useAdminMe();
  const list = typeof permission === 'string' ? [permission] : permission;
  return Boolean(me.data && list.some((p) => me.data.permissions.includes(p)));
}

export const useDeposits = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.deposits(q),
    queryFn: () => admin<DepositsResponse>('/admin/finance/deposits', q),
    placeholderData: keepPreviousData,
    ...live,
  });
export const useWithdrawalQueue = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.withdrawals(q),
    queryFn: () => admin<WithdrawalsResponse>('/admin/finance/withdrawals', q),
    placeholderData: keepPreviousData,
    ...live,
  });
export const useWithdrawal = (id: string) =>
  useQuery({
    queryKey: adminBKeys.withdrawal(id),
    queryFn: () => admin<WithdrawalDetail>(`/admin/finance/withdrawals/${id}`),
    ...live,
  });
export const useFees = () =>
  useQuery({
    queryKey: adminBKeys.fees(),
    queryFn: () => admin<FeesResponse>('/admin/finance/fees'),
  });
export const usePoolAccounting = () =>
  useQuery({
    queryKey: adminBKeys.poolAccounting(),
    queryFn: () => admin<PoolAccountingResponse>('/admin/finance/pool-accounting'),
    ...live,
  });
export const useLedger = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.ledger(q),
    queryFn: () => admin<LedgerResponse>('/admin/finance/ledger', q),
    placeholderData: keepPreviousData,
  });
export const useLedgerIntegrity = () =>
  useQuery({
    queryKey: adminBKeys.ledgerIntegrity(),
    queryFn: () => admin<LedgerIntegrity>('/admin/finance/ledger/integrity'),
    staleTime: 60_000,
  });
export const useReconciliation = () =>
  useQuery({
    queryKey: adminBKeys.reconciliation(),
    queryFn: () => admin<ReconciliationResponse>('/admin/finance/reconciliation'),
  });
export const useRefunds = () =>
  useQuery({
    queryKey: adminBKeys.refunds(),
    queryFn: () => admin<RefundsResponse>('/admin/finance/refunds'),
  });
/** ADM-P9 for every role that monitors rounds (rounds.read) — the finance view above needs ledger.read (Q08). */
export const usePoolRefunds = () =>
  useQuery({
    queryKey: adminBKeys.poolRefunds(),
    queryFn: () => admin<PoolRefundsResponse>('/admin/pool/refunds'),
  });
export const useRevenue = (days: number) =>
  useQuery({
    queryKey: adminBKeys.revenue(days),
    queryFn: () => admin<RevenueResponse>('/admin/finance/reports', { days }),
    placeholderData: keepPreviousData,
  });

export const usePoolOverview = () =>
  useQuery({
    queryKey: adminBKeys.poolOverview(),
    queryFn: () => admin<PoolOverviewResponse>('/admin/pool/overview'),
    ...live,
  });
export const usePoolBalance = () =>
  useQuery({
    queryKey: adminBKeys.poolBalance(),
    queryFn: () => admin<PoolBalanceResponse>('/admin/pool/balance'),
    ...live,
  });
export const useActiveRound = () =>
  useQuery({
    queryKey: adminBKeys.activeRound(),
    queryFn: () => admin<ActiveRoundResponse>('/admin/pool/active-round'),
    refetchInterval: 15_000,
  });
export const useRoundHistory = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.rounds(q),
    queryFn: () => admin<Paginated<RoundRow>>('/admin/pool/rounds', q),
    placeholderData: keepPreviousData,
  });
export const useParticipants = (n: number | null, q: Q) =>
  useQuery({
    queryKey: adminBKeys.participants(n ?? 0, q),
    queryFn: () => admin<ParticipantsResponse>(`/admin/pool/rounds/${n}/participants`, q),
    enabled: n !== null,
    placeholderData: keepPreviousData,
  });
export const usePrizes = (n: number | null, opts?: Opts<PrizesResponse>) =>
  useQuery({
    queryKey: adminBKeys.prizes(n ?? 0),
    queryFn: () => admin<PrizesResponse>(`/admin/pool/rounds/${n}/prizes`),
    enabled: n !== null,
    ...opts,
  });
export const useVrf = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.vrf(q),
    queryFn: () => admin<VrfResponse>('/admin/pool/vrf', q),
    placeholderData: keepPreviousData,
  });
export const useBreaker = () =>
  useQuery({
    queryKey: adminBKeys.breaker(),
    queryFn: () => admin<BreakerState>('/admin/pool/circuit-breaker'),
    ...live,
  });

export const useKycQueue = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.kyc(q),
    queryFn: () => admin<KycQueueResponse>('/admin/compliance/kyc', q),
    placeholderData: keepPreviousData,
  });
export const useKycDetail = (id: string) =>
  useQuery({
    queryKey: adminBKeys.kycDetail(id),
    queryFn: () => admin<KycDetail>(`/admin/compliance/kyc/${id}`),
  });
export const useAmlAlerts = (q: Q) =>
  useQuery({
    queryKey: adminBKeys.aml(q),
    queryFn: () => admin<AmlResponse>('/admin/compliance/aml', q),
    placeholderData: keepPreviousData,
  });

// ── mutations ─────────────────────────────────────────────────────────────────────────────────

function useInvalidating<TVars, TRes>(fn: (v: TVars) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminBKeys.all }),
  });
}

export const useApproveWithdrawal = (id: string) =>
  useInvalidating((v: { reason: string; mfaCode: string }) =>
    post<WithdrawalDecisionResult>(`/admin/withdrawals/${id}/approve`, v),
  );
export const useRejectWithdrawal = (id: string) =>
  useInvalidating((v: { reason: string; mfaCode: string }) =>
    post<WithdrawalDecisionResult>(`/admin/withdrawals/${id}/reject`, v),
  );
export const useExport = () =>
  useMutation({
    mutationFn: (v: AdminExportRequest) => post<ExportResult>('/admin/finance/exports', v),
  });
export const useRemindRefunds = (round: number) =>
  useInvalidating((v: { reason: string }) =>
    post<{ roundNumber: number; players: number; auditSeq: string }>(
      `/admin/finance/refunds/${round}/remind`,
      v,
    ),
  );
export const useRequestBreaker = () =>
  useInvalidating((v: CircuitBreakerRequest) =>
    post<{ approvalId: string; reference: string; expiresAt: string; auditSeq: string }>(
      '/admin/pool/circuit-breaker',
      v,
    ),
  );
export const useDecideBreaker = (approvalId: string) =>
  useInvalidating((v: CircuitBreakerDecision) =>
    post<{ decision: string; entriesEnabled: boolean; auditSeq: string }>(
      `/admin/pool/circuit-breaker/${approvalId}/decision`,
      v,
    ),
  );
export const useKycDecision = (id: string) =>
  useInvalidating((v: KycDecision) =>
    post<{ id: string; status: string; newLevel: string | null; auditSeq: string }>(
      `/admin/compliance/kyc/${id}/decision`,
      v,
    ),
  );
export const useResolveAml = (id: string) =>
  useInvalidating(
    (v: { resolution: 'resolved' | 'dismissed' | 'escalated'; reason: string; mfaCode: string }) =>
      post<{ id: string; status: string }>(`/admin/aml/alerts/${id}/resolve`, v),
  );
