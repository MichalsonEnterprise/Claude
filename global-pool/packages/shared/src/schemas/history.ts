import { z } from 'zod';

import { CHAIN_KEYS } from '../chains';
import {
  ENTRY_STATUSES,
  TX_STATUSES,
  TX_TYPES,
  type EntryStatus,
  type RoundStatus,
} from '../enums';
import { isoDateTimeSchema, paginationQuerySchema } from './common';

/**
 * Player history (USR-F1..F6 financial history, USR-G1..G7 gaming history). Read-only views — balances always come
 * from the ledger (GET /wallet/balances), never from these lists.
 */

const csvList = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)).max(values.length));

/** GET /history/transactions (and /export): several types at once + free-text search on reference / hash. */
export const historyTransactionsQuerySchema = paginationQuerySchema.extend({
  types: csvList(TX_TYPES).optional(),
  status: z.enum(TX_STATUSES).optional(),
  network: z.enum(CHAIN_KEYS).optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
  q: z.string().trim().max(80).optional(),
});
export type HistoryTransactionsQuery = z.infer<typeof historyTransactionsQuerySchema>;

export const historyExportQuerySchema = historyTransactionsQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({
    format: z.enum(['csv', 'csv_semicolon']).default('csv'),
    includeHashes: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((v) => v === true || v === 'true')
      .default(true),
  });
export type HistoryExportQuery = z.infer<typeof historyExportQuerySchema>;

/** GET /history/entries — My entries (G2), grouped by round. */
export const historyEntriesQuerySchema = paginationQuerySchema.extend({
  status: csvList(ENTRY_STATUSES).optional(),
  roundFrom: z.coerce.number().int().min(1).optional(),
  roundTo: z.coerce.number().int().min(1).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});
export type HistoryEntriesQuery = z.infer<typeof historyEntriesQuerySchema>;

/** GET /history/game-rounds — Game history (G6). */
export const historyGameRoundsQuerySchema = paginationQuerySchema.extend({
  game: z.string().trim().max(64).optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
});
export type HistoryGameRoundsQuery = z.infer<typeof historyGameRoundsQuerySchema>;

export const favouriteSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{2,64}$/);

// ── views ───────────────────────────────────────────────────────────────────────────────────────

export interface FinanceSummaryView {
  deposits: {
    lifetime: string;
    count: number;
    thisWeek: string;
    pending: string;
    pendingCount: number;
  };
  withdrawals: {
    lifetime: string;
    completedCount: number;
    count: number;
    openCount: number;
    open: string;
    dailyLimit: string;
    usedToday: string;
  };
  fees: {
    platformLifetime: string;
    entriesLifetime: number;
    platformLast30d: string;
    entriesLast30d: number;
    networkLifetime: string;
    currentRound: { number: number; entries: number; platformFee: string } | null;
  };
  rewards: { lifetime: string; count: number; owed: string; owedCount: number };
  refunds: { owed: string; owedCount: number; lifetime: string; count: number };
  isDemo: boolean;
}

export interface FeeLineView {
  id: string;
  kind: 'platform_fee' | 'network_fee';
  reference: string;
  title: string;
  detail: string;
  amount: string;
  entries: number | null;
  roundNumber: number | null;
  network: string | null;
  status: string;
  createdAt: string;
  isDemo: boolean;
}

export interface RoundRef {
  id: string;
  number: number;
  status: RoundStatus;
  closesAt: string;
  settledAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  entriesCount: number;
  participantsCount: number;
  poolAmount: string;
  isDemo: boolean;
}

export interface MyRoundEntriesView {
  round: RoundRef;
  entries: number;
  firstCode: string;
  lastCode: string;
  stake: string;
  platformFee: string;
  statusCounts: Partial<Record<EntryStatus, number>>;
  /** Headline result for the round from the player's point of view. */
  result: 'active' | 'won' | 'not_won' | 'refund_owed' | 'refunded';
  prize: string | null;
  bestRank: number | null;
  /** Odds disclosure for open rounds: your entries / all entries (decimal string 0–1). */
  share: string | null;
  purchasedAt: string;
  isDemo: boolean;
}

export interface WinningItemView {
  id: string;
  kind: 'prize' | 'refund' | 'reward';
  reference: string;
  title: string;
  detail: string;
  amount: string;
  /** owed = waiting in Owed; settled = moved to Available (claimed or automatic). */
  settlement: 'owed' | 'settled' | 'processing';
  roundNumber: number | null;
  rank: number | null;
  createdAt: string;
  settledAt: string | null;
  autoSettlesAt: string | null;
  isDemo: boolean;
}

export interface WinningsView {
  owed: { total: string; items: WinningItemView[] };
  settled: { total: string; items: WinningItemView[] };
  lifetimePrizes: string;
  prizesCount: number;
  isDemo: boolean;
}

export interface GameActivityView {
  slug: string;
  name: string;
  category: string;
  edgeLabel: string;
  favourite: boolean;
  sessions: number;
  bets: number;
  wagered: string;
  net: string;
  lastPlayedAt: string | null;
  isSimulation: boolean;
}

export interface GamesOverviewView {
  activeRounds: MyRoundEntriesView[];
  recentGames: GameActivityView[];
  /** Global Pool (ledger) and simulation games are reported separately — never mixed into one total. */
  last30d: {
    poolEntries: number;
    /** Entry amounts + platform fees. */
    poolSpent: string;
    /** Prizes + refunds credited. */
    poolReturned: string;
    /** Signed: returned − spent. */
    poolNet: string;
    gameBets: number;
    /** Simulation stakes (non-monetary until real-money games are approved). */
    simWagered: string;
    simNet: string;
  };
  isDemo: boolean;
}

export interface GameRoundView {
  id: string;
  game: { slug: string; name: string };
  nonce: number;
  stake: string;
  payout: string;
  net: string;
  outcome: Record<string, unknown>;
  serverSeedHash: string;
  serverSeed: string | null;
  clientSeed: string;
  isSimulation: boolean;
  createdAt: string;
}

export interface FavouriteGameView {
  slug: string;
  name: string;
  category: string;
  edgeLabel: string;
  playersDemo: number | null;
  addedAt: string;
}
