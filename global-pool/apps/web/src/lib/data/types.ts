/**
 * View models served by the web data layer. Shapes follow the API views (apps/api …/rounds.service.ts `view()`)
 * and the @gp/shared domain types, so swapping the mock fetchers for API calls does not touch components.
 * Money is always a decimal string (never a JS float). `isDemo` marks DEMO records — the UI shows a DEMO badge.
 */
import type { ChainHealth, ChainKey } from '@gp/shared/chains';
import type { EntryPurchase, FeedEntry, Game, OddsExample, Round } from '@gp/shared/types';

/** Homepage scenario the mock serves (dev preview via ?state=…; ignored by the API source). */
export interface HomeScenario {
  round: 'active' | 'none';
  region: 'permitted' | 'restricted';
}

export const DEFAULT_SCENARIO: HomeScenario = { round: 'active', region: 'permitted' };

export type RoundView = Round & { isDemo?: boolean };

export interface PoolSnapshot {
  /**
   * Server clock at response time (ISO). Countdowns are `closesAt − serverNow`, advanced by the real elapsed
   * time on the client — never a fake timer. In mock mode this is the DEMO snapshot moment.
   */
  serverNow: string;
  /** The open round, or null between rounds. */
  current: RoundView | null;
  /**
   * Most recent past round (closed, drawing, settled or cancelled) — its status drives the copy. Before any round
   * has closed this is the current / scheduled round itself.
   */
  last: RoundView;
  /** Next scheduled round (always present in the daily 08:00–20:00 UTC schedule). */
  next: { number: number; opensAt: string; closesAt: string };
  /** Participants who joined in the last hour (DEMO trend line). */
  participantsLastHour: number | null;
  /** Handles shown in the participants avatar stack (public feed only — Hidden players excluded). */
  recentHandles: string[];
  isDemo: boolean;
}

export interface PoolHistoryPoint {
  roundNumber: number;
  /** Round close (ISO). */
  closesAt: string;
  /** Closing pool (decimal string); live value for the open round. */
  pool: string;
  status: 'open' | 'settled' | 'cancelled';
  isDemo: boolean;
}

export interface PoolHistory {
  points: PoolHistoryPoint[];
  minPool: string;
  isDemo: boolean;
}

export type FeedEntryView = FeedEntry & { isDemo?: boolean };

export type MyEntriesView = EntryPurchase & {
  odds: Pick<OddsExample, 'anyPrizeApproxPercent' | 'firstPrizePercent'>;
  isDemo?: boolean;
};

export type GameView = Game & { isDemo?: boolean };

export interface RecentWin {
  id: string;
  gameSlug: string;
  gameName: string;
  /** null = player opted out of public feeds ("Hidden"). */
  handle: string | null;
  amount: string;
  /** Global Pool prize (gold) vs Originals payout. */
  kind: 'pool' | 'game';
  isDemo: boolean;
}

export type LiveBetTab = 'latest' | 'big' | 'rounds';

export interface LiveBet {
  id: string;
  gameSlug: string;
  gameName: string;
  handle: string | null;
  /** Stake / entry amount / pool (decimal string). */
  amount: string;
  /** e.g. "2.41×" or "Round #1,248 · 35 entries". */
  detail: string;
  /** Payout (decimal string) or a status for pool entries. */
  result:
    | { type: 'payout'; amount: string; win: boolean }
    | { type: 'status'; status: 'awaiting_draw' | 'settled' | 'cancelled'; label: string };
  isDemo: boolean;
}

export interface NetworkView {
  key: ChainKey;
  name: string;
  standard: string;
  confirmationsLabel: string;
  withdrawalNetworkFee: string;
  minDeposit: string;
  /** Live for deposits / withdrawals (MVP: Arbitrum Sepolia only). */
  enabled: boolean;
  statusLabel: string;
  health: ChainHealth;
  healthLabel: string;
  isDemo: boolean;
}

export interface VerifierSample {
  game: string;
  gameSlug: string;
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  /** Recorded result (0–99.99 roll) as stored for the round. */
  recordedRoll: string;
  /** Bet target, e.g. roll over 50.50. */
  target: { over: string };
  isDemo: boolean;
}

export interface VrfStep {
  id: 'requested' | 'awaiting' | 'fulfilled' | 'settled';
  title: string;
  description: string;
  meta: string;
}

export interface DrawRandomnessView {
  roundNumber: number;
  network: string;
  requestIdDisplay: string;
  explorerUrl: string | null;
  steps: VrfStep[];
  status: 'settled' | 'pending';
  isDemo: boolean;
}

export interface VipTierView {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  index: number;
  minPoints: number;
  weeklyRatePercent: string;
  perk: string;
  isDemo: boolean;
}

export interface RegionStatus {
  country: string | null;
  countryName: string | null;
  permitted: boolean;
  isDemo: boolean;
}

export interface ViewerBalance {
  available: string;
  isDemo: boolean;
}
