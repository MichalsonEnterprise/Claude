'use client';

/**
 * Orbit Rush (crash, decision #42) API wrappers + TanStack Query hooks over the shared `apiRequest()` client.
 * Live rounds come over socket.io `/crash` (see components/games/crash/live-client.ts); this file covers the REST
 * side: state snapshot, crashed rounds, statistics, public verification, my bets, and the REST fallbacks for bets
 * and cash-outs (same idempotency keys as the socket).
 *
 * NON-MONETARY SIMULATION: every amount is a DEMO credit decimal string ("DEMO credits · no cash value"). DEMO credits
 * never touch the USDT ledger, wallet, pool or fee ledgers, and crash bets carry no fee ("Fees 0.00").
 */
import { DEMO_CREDITS_CURRENCY } from '@gp/shared/fair';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';

import { apiRequest } from './client';

export const ORBIT_RUSH_SLUG = 'orbit-rush';

// ── types (mirror apps/api/src/modules/games/engine/crash.service.ts) ───────────────────────────

export type CrashRoundStatus = 'betting' | 'running' | 'crashed';

/** Public round view: the crash point and seed stay null until the round has crashed. */
export interface CrashRoundView {
  id: string;
  number: number;
  /** "CR-55102" */
  ref: string;
  status: CrashRoundStatus;
  /** sha256(round seed) — published before betting opens. */
  commitment: string;
  chainIndex: number;
  bettingOpensAt: string;
  /** Betting closes and the multiplier starts at this server time. */
  startedAt: string;
  crashedAt: string | null;
  nextRoundAt: string | null;
  crashPoint: string | null;
  instant: boolean | null;
  seed: string | null;
  isDemo: true;
}

export type CrashBetStatus = 'active' | 'cashed_out' | 'lost';
export type CashOutKind = 'manual' | 'auto' | 'cap';

/** A bet in the live round as everyone sees it (socket `crash:bet` / `crash:cashout`, snapshot `bets`). */
export interface CrashLiveBet {
  id: string;
  ref: string;
  /** "@handle" or the public id. */
  player: string;
  stake: string;
  autoCashOut: string | null;
  status: CrashBetStatus;
  cashOutMultiplier: string | null;
  payout: string;
  cashOutKind: CashOutKind | null;
  currency: 'DEMO';
}

export interface CrashRules {
  houseEdgePercent: string;
  instantCrashOneIn: number;
  maxMultiplier: string;
  minTarget: string;
  maxTarget: string;
  growthPerSecond: string;
  frameMs: number;
  bettingMs: number;
  crashedPauseMs: number;
}

/** GET /games/orbit-rush/state and socket `crash:snapshot`. */
export interface CrashSnapshot {
  round: CrashRoundView | null;
  multiplier: string;
  elapsedMs: number;
  bets: CrashLiveBet[];
  history: { number: number; crashPoint: string }[];
  rules: CrashRules;
  serverTime: string;
  currency: 'DEMO';
  isDemo: true;
}

/** My bet (REST + socket acks). */
export interface CrashMyBet {
  id: string;
  ref: string;
  round: { id: string; number: number; status: CrashRoundStatus };
  stake: string;
  autoCashOut: string | null;
  status: CrashBetStatus;
  cashOutMultiplier: string | null;
  payout: string;
  /** Signed (payout − stake). */
  net: string;
  cashOutKind: CashOutKind | null;
  cashedOutAt: string | null;
  currency: 'DEMO';
  createdAt: string;
  isDemo: true;
  /** DEMO balance after the write (bet / cash-out responses only). */
  balance?: string;
  replayed?: boolean;
}

export interface CrashRoundRow extends CrashRoundView {
  bets: number;
  players: number;
  wagered: string;
  paidOut: string;
}

export interface CrashRoundsPage {
  items: CrashRoundRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  currency: 'DEMO';
  isDemo: true;
}

export type CrashStatsPeriod = '24h' | '7d' | '30d';

export interface CrashStats {
  period: CrashStatsPeriod;
  from: string;
  to: string;
  rounds: number;
  median: string | null;
  expectedMedian: string;
  reach2: { share: string; expected: string };
  highest: { crashPoint: string; number: number; ref: string } | null;
  buckets: {
    label: string;
    min: string;
    max: string | null;
    expected: string;
    count: number;
    share: string;
  }[];
  houseEdgePercent: string;
  isDemo: true;
}

export interface CrashMyBetsPage {
  items: CrashMyBet[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: {
    bets: number;
    wagered: string;
    returned: string;
    net: string;
    wins: number;
    losses: number;
    bestCashOut: string | null;
  };
  currency: 'DEMO';
  isDemo: true;
}

/** GET /games/orbit-rush/rounds/:number/verify (public). */
export interface CrashVerification {
  round: CrashRoundView;
  chain: { commitment: string; salt: string; length: number; index: number };
  formula: string;
  library: string;
  revealed: boolean;
  message?: string;
  seed?: string;
  commitmentValid?: boolean;
  chainValid?: boolean;
  recomputed?: { crashPoint: string; instant: boolean };
  matches?: boolean;
  isDemo: true;
}

export interface CrashBetInput {
  stake: string;
  autoCashOut: string | null;
  idempotencyKey: string;
}

// ── calls ─────────────────────────────────────────────────────────────────────────────────────

const BASE = '/games/orbit-rush';

export const orbitRushApi = {
  state: () => apiRequest<CrashSnapshot>(`${BASE}/state`, { auth: 'none' }),
  rounds: (page = 1, pageSize = 12, filters: { from?: string; search?: string } = {}) =>
    apiRequest<CrashRoundsPage>(`${BASE}/rounds`, {
      auth: 'none',
      query: { page, pageSize, from: filters.from, search: filters.search },
    }),
  round: (n: number) => apiRequest<CrashRoundView>(`${BASE}/rounds/${n}`, { auth: 'none' }),
  verify: (n: number) =>
    apiRequest<CrashVerification>(`${BASE}/rounds/${n}/verify`, { auth: 'none' }),
  stats: (period: CrashStatsPeriod) =>
    apiRequest<CrashStats>(`${BASE}/stats`, { auth: 'none', query: { period } }),
  myBets: (page = 1, pageSize = 20, filters: { from?: string; result?: 'win' | 'lose' } = {}) =>
    apiRequest<CrashMyBetsPage>(`${BASE}/bets`, {
      query: { page, pageSize, from: filters.from, result: filters.result },
    }),
  current: () => apiRequest<{ bet: CrashMyBet | null }>(`${BASE}/bets/current`),
  /** REST fallback of the socket `crash:bet` (always DEMO credits). */
  placeBet: (input: CrashBetInput) =>
    apiRequest<CrashMyBet>(`${BASE}/bets`, {
      method: 'POST',
      body: { ...input, currency: DEMO_CREDITS_CURRENCY },
    }),
  /** REST fallback of the socket `crash:cashout`. */
  cashOut: (betId: string, idempotencyKey: string) =>
    apiRequest<CrashMyBet>(`${BASE}/bets/${encodeURIComponent(betId)}/cashout`, {
      method: 'POST',
      body: { idempotencyKey },
    }),
};

// ── query keys + hooks ────────────────────────────────────────────────────────────────────────

export const orbitRushKeys = {
  all: ['orbit-rush'] as const,
  rounds: (page: number, pageSize: number, from?: string, search?: string) =>
    ['orbit-rush', 'rounds', page, pageSize, from ?? '', search ?? ''] as const,
  verify: (n: number) => ['orbit-rush', 'verify', n] as const,
  stats: (p: CrashStatsPeriod) => ['orbit-rush', 'stats', p] as const,
  /**
   * Player data lives under the kit's 'games-kit' root, so sign-out / account switch removes it with the other player
   * caches (PLAYER_DATA_PREFIXES in player-cache.ts).
   */
  myBets: ['games-kit', 'orbit-rush', 'my-bets'] as const,
  myBetsPage: (page: number, pageSize: number, from?: string, result?: string) =>
    ['games-kit', 'orbit-rush', 'my-bets', page, pageSize, from ?? '', result ?? ''] as const,
};

export function useCrashRounds(
  page: number,
  pageSize: number,
  filters: { from?: string; search?: string } = {},
) {
  return useQuery({
    queryKey: orbitRushKeys.rounds(page, pageSize, filters.from, filters.search),
    queryFn: () => orbitRushApi.rounds(page, pageSize, filters),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

export function useCrashStats(period: CrashStatsPeriod) {
  return useQuery({
    queryKey: orbitRushKeys.stats(period),
    queryFn: () => orbitRushApi.stats(period),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useCrashVerification(n: number | null) {
  return useQuery({
    queryKey: orbitRushKeys.verify(n ?? 0),
    queryFn: () => orbitRushApi.verify(n!),
    enabled: n !== null && n > 0,
  });
}

export function useCrashMyBets(
  page: number,
  pageSize: number,
  filters: { from?: string; result?: 'win' | 'lose' } = {},
  enabled = true,
) {
  const member = useAuth().status === 'member';
  return useQuery({
    queryKey: orbitRushKeys.myBetsPage(page, pageSize, filters.from, filters.result),
    queryFn: () => orbitRushApi.myBets(page, pageSize, filters),
    enabled: member && enabled,
    placeholderData: keepPreviousData,
  });
}
