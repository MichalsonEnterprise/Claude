/**
 * Domain types shared by web and api (API response shapes). Money is always a decimal STRING (see ./money),
 * timestamps are ISO-8601 UTC strings.
 */
import type { ChainKey } from './chains';
import type {
  AdminRole,
  EntryStatus,
  GameCategory,
  KycLevel,
  KycStatus,
  PrizeTier,
  PromotionType,
  RandomnessProvider,
  RgLimitType,
  RgPeriod,
  RoundStatus,
  TxStatus,
  TxType,
  VipTier,
  WithdrawalStatus,
} from './enums';
import type { PrizeTierAmount } from './pool';

/** Decimal string in USDT, canonical form from toUSDTString ('351.75'). */
export type USDTAmount = string;
/** ISO-8601 UTC timestamp ('2026-11-27T20:00:00Z'). */
export type ISODateTime = string;

/** Every DEMO object carries this flag so the UI can render the DEMO badge and never present it as real. */
export interface DemoFlag {
  readonly isDemo: true;
}

// ── user ──────────────────────────────────────────────────────────────────────────────────────

export interface UserCountry {
  code: string;
  name: string;
  permitted: boolean;
}

export interface UserProfile {
  id: string;
  /** Public user ID shown in the UI ('GP-48213'). */
  publicId: string;
  /** Handle without '@' ('nova.k'). */
  handle: string;
  /** Handle with '@' ('@nova.k'). */
  displayHandle: string;
  displayName: string;
  email: string;
  emailMasked: string;
  country: UserCountry;
  kyc: { level: KycLevel; status: KycStatus; label: string };
  vip: {
    tier: VipTier;
    /** 1-based tier position (Gold = 3 of 5). */
    tierIndex: number;
    tierCount: number;
    /** e.g. 'Gold III' */
    levelLabel: string;
    level: number;
    levelCount: number;
    /** Rolling 365-day status points. */
    points: number;
    nextTier: VipTier;
    nextTierPoints: number;
    pointsToNextTier: number;
    nextLevelLabel: string;
    nextLevelPoints: number;
    pointsToNextLevel: number;
  };
  security: {
    twoFactorEnabled: boolean;
    twoFactorMethod: 'authenticator_app' | null;
    antiPhishingCode: string;
  };
}

export interface UserWallet {
  id: string;
  network: ChainKey;
  /** Full address (DEMO placeholder — not a real wallet). */
  address: string;
  /** Truncated display form from the designs ('0x12ab…9f3C'). */
  addressDisplay: string;
  isPrimary: boolean;
  status: 'verified' | 'whitelisted' | 'connected';
  statusLabel: string;
  whitelisted: boolean;
  whitelistedAt: ISODateTime | null;
}

export interface UserDevice {
  id: string;
  device: string;
  browser: string;
  location: string;
  current: boolean;
  flagged: boolean;
  flaggedReason: string | null;
  flaggedAt: ISODateTime | null;
}

// ── balances ──────────────────────────────────────────────────────────────────────────────────

export interface BalanceComponent {
  label: string;
  amount: USDTAmount;
  /** Reference such as 'WD-20931', 'DP-77412' or 'round:1248'. */
  reference: string;
}

export interface Balances {
  currency: 'USDT';
  /** available + locked + pending + owed */
  total: USDTAmount;
  available: USDTAmount;
  locked: USDTAmount;
  pending: USDTAmount;
  owed: USDTAmount;
  breakdown: {
    locked: BalanceComponent[];
    pending: BalanceComponent[];
    owed: BalanceComponent[];
  };
}

export interface LifetimeStats {
  deposits: USDTAmount;
  withdrawals: USDTAmount;
  entries: number;
  platformFeesPaid: USDTAmount;
  rewards: USDTAmount;
}

// ── Global Pool ───────────────────────────────────────────────────────────────────────────────

export interface RoundDraw {
  provider: RandomnessProvider;
  network: ChainKey;
  requestId: string;
  requestIdDisplay: string;
  requestedAt: ISODateTime;
  fulfilledAt: ISODateTime | null;
  confirmations: number;
  settledAt: ISODateTime | null;
}

export interface RoundWinner {
  place: number;
  tier: PrizeTier;
  handle: string;
  entryId: string | null;
  amount: USDTAmount;
}

export interface Round {
  id: string;
  number: number;
  status: RoundStatus;
  openedAt: ISODateTime;
  closesAt: ISODateTime;
  entryPrice: USDTAmount;
  platformFeePerEntry: USDTAmount;
  /** null where the design sheet has no value for this round. */
  participants: number | null;
  entries: number | null;
  /** Σ entry amounts (entries × 10.00). */
  poolBalance: USDTAmount | null;
  /** entries × 0.05 — NOT part of the pool. */
  platformFees: USDTAmount | null;
  thresholds: { minParticipants: number; minPool: USDTAmount; met: boolean | null };
  prizeDistribution: PrizeTierAmount[] | null;
  draw: RoundDraw | null;
  winners: RoundWinner[];
  cancellation: { reason: 'threshold_not_met' | 'vrf_timeout'; refundsTo: 'owed' } | null;
}

export interface EntryPurchase {
  roundId: string;
  roundNumber: number;
  entries: number;
  firstEntryId: string;
  lastEntryId: string;
  entryAmount: USDTAmount;
  platformFee: USDTAmount;
  networkFee: USDTAmount;
  total: USDTAmount;
  txHashDisplay: string;
  purchasedAt: ISODateTime;
  status: EntryStatus;
}

export interface FeedEntry {
  id: string;
  /** null = player chose to hide their handle ('Hidden'). */
  handle: string | null;
  roundNumber: number;
  entries: number;
  amount: USDTAmount;
  at: ISODateTime;
}

export interface Winner {
  id: string;
  handle: string;
  roundNumber: number;
  tier: PrizeTier;
  label: string;
  amount: USDTAmount;
  settledAt: ISODateTime | null;
}

export interface OddsExample {
  myEntries: number;
  totalEntries: number;
  prizes: number;
  /** Figure printed in the design sheet ('≈ 2.44%', upper-bound approximation m × 13 / N). */
  anyPrizeApproxPercent: string;
  /** Exact P(at least one prize) without replacement (see oddsDisclosure). */
  anyPrizeExactPercent: string;
  firstPrizePercent: string;
}

// ── transactions ──────────────────────────────────────────────────────────────────────────────

export interface TransactionTimelineStep {
  label: string;
  at: ISODateTime;
}

export interface Transaction {
  /** Public reference ('DP-77412', 'WD-20931', 'EP-1248-35'). */
  id: string;
  type: TxType;
  status: TxStatus;
  /** Withdrawal-specific status (state machine), when type = withdrawal. */
  withdrawalStatus?: WithdrawalStatus;
  direction: 'in' | 'out';
  network: ChainKey | null;
  amount: USDTAmount;
  networkFee: USDTAmount | null;
  platformFee: USDTAmount | null;
  /** What the player receives / pays in total. */
  netAmount: USDTAmount;
  addressDisplay: string | null;
  txHashDisplay: string | null;
  confirmations: { current: number; required: number } | null;
  description: string;
  statusDetail: string | null;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
  timeline: TransactionTimelineStep[];
}

// ── catalogue / promotions / RG / admin ──────────────────────────────────────────────────────

export interface Game {
  id: string;
  slug: string;
  name: string;
  category: GameCategory;
  mechanic: string;
  /** House edge in percent ('1.00'); null where an RTP range applies (slots) or edge is disclosed per draw. */
  houseEdgePercent: string | null;
  /** Disclosure label shown on the tile ('1.00% house edge', 'RTP 96.0–96.7%'). */
  edgeLabel: string;
  icon: string;
  /** DEMO player count; null where the design sheet has none. */
  players: number | null;
  /** Games run as non-monetary simulations until separately approved. */
  mode: 'simulation' | 'pool';
  details: string[];
}

export interface Promotion {
  id: string;
  type: PromotionType;
  title: string;
  summary: string;
  keyTerms: string[];
  termsApply: true;
  startsAt: ISODateTime | null;
  endsAt: ISODateTime | null;
}

export interface RgLimit {
  type: RgLimitType;
  period: RgPeriod;
  limit: USDTAmount;
  used: USDTAmount;
  pendingIncrease: { amount: USDTAmount; effectiveAt: ISODateTime } | null;
}

export interface ResponsibleGamingState {
  limits: RgLimit[];
  realityCheckMinutes: number;
  session: { durationSeconds: number; net: USDTAmount; dailyLossLimit: USDTAmount };
  selfExcluded: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  title: string;
  role: AdminRole;
  email: string;
}
