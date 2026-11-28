/**
 * Global Pool module API wrappers (rounds, entries, verification, entry history) over the shared `apiRequest()`
 * client. Response types mirror apps/api `RoundsService.view()` / `verification()` / `EntryHistoryService`.
 *
 * Data source: `NEXT_PUBLIC_DATA_SOURCE=api` calls the NestJS API. The default `mock` source serves the
 * @gp/shared DEMO records (shifted by whole days — see src/lib/data/demo-clock.ts) so pages render offline;
 * buying entries always needs the API (the mock refuses it with a clear error — no fake purchases).
 */
import {
  DEMO_BALANCES,
  DEMO_CURRENT_ROUND,
  DEMO_ENTRIES_FEED,
  DEMO_MY_ENTRIES,
  DEMO_MY_ENTRY_IDS,
  DEMO_PREVIOUS_ROUNDS,
} from '@gp/shared/demo';
import type { PrizeTier, RoundStatus } from '@gp/shared/enums';
import { formatRoundNumber } from '@gp/shared/format';
import { oddsDisclosure, prizeBreakdown, type PrizeTierAmount } from '@gp/shared/pool';
import type { Round } from '@gp/shared/types';

import { DATA_SOURCE } from '@/lib/data/source';
import { demoShiftDays, shiftIso } from '@/lib/data/demo-clock';

import { ApiRequestError, apiRequest } from './client';

// ── types ─────────────────────────────────────────────────────────────────────────────────────

export interface PoolWinnerView {
  place: number;
  tier: PrizeTier;
  handle: string | null;
  entryId: string | null;
  entrySeq: number | null;
  amount: string;
}

export interface PoolDrawView {
  provider: string;
  network: string;
  requestId: string;
  requestIdDisplay: string;
  requestedAt: string;
  fulfilledAt: string | null;
  confirmations: number;
  status: string;
  settledAt: string | null;
}

/** GET /pool/rounds/current · /pool/rounds/:number · items of GET /pool/rounds */
export interface PoolRoundView {
  id: string;
  number: number;
  numberLabel: string;
  status: RoundStatus;
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
  prizeDistribution: PrizeTierAmount[];
  draw: PoolDrawView | null;
  winners: PoolWinnerView[];
  cancellation: { reason: 'threshold_not_met' | 'vrf_timeout'; refundsTo: 'owed' } | null;
  settledAt: string | null;
  isDemo: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PoolFeedItem {
  id: string;
  handle: string | null;
  entries: number;
  amount: string;
  at: string;
  isDemo: boolean;
}

/** GET /pool/rounds/:number/verify */
export interface PoolVerification {
  round: { id: string; number: number; status: RoundStatus; totalEntries: number; pool: string };
  algorithm: {
    name: string;
    domain: string;
    description: string;
    roundIdUsed: string;
    prizeSplitBps: number[];
    entryOrder: string;
  };
  randomness: {
    provider: string;
    requestId: string;
    randomWord: string | null;
    requestedAt: string;
    fulfilledAt: string | null;
    fulfillTxHash: string | null;
  } | null;
  winners: PoolWinnerView[];
  recomputed: { matchesStoredWinners: boolean | null } | null;
}

/** POST /pool/rounds/:roundId/entries */
export interface EntryPurchaseResult {
  roundId: string;
  roundNumber: number;
  entries: number;
  firstEntryId: string;
  lastEntryId: string;
  entryPrice: string;
  entryAmount: string;
  platformFee: string;
  networkFee: string;
  total: string;
  reference: string;
  transactionId: string;
  postingId: string;
  status: 'active';
  purchasedAt: string;
  replayed: boolean;
}

/** GET /pool/rounds/:roundId/my-entries */
export interface MyRoundEntries {
  roundId: string;
  roundNumber: number;
  entries: number;
  entryIds: string[];
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

export type EntryResultKind =
  | 'in_draw'
  | 'drawing'
  | 'won'
  | 'not_selected'
  | 'refund_owed'
  | 'refunded';

export interface EntryHistoryItem {
  reference: string;
  transactionId: string;
  roundId: string;
  roundNumber: number;
  roundStatus: RoundStatus;
  roundClosesAt: string;
  entries: number;
  firstEntryId: string | null;
  lastEntryId: string | null;
  entryAmount: string;
  platformFee: string;
  networkFee: string;
  total: string;
  purchasedAt: string;
  result: {
    kind: EntryResultKind;
    prize: string | null;
    winningEntryIds: string[];
    refund: string | null;
  };
  isDemo: boolean;
}

export interface EntryHistorySummary {
  purchases: number;
  qualifyingEntries: number;
  activeEntries: number;
  platformFeesPaid: string;
  prizesWon: string;
  refundOwed: string;
}

export type EntryHistory = Page<EntryHistoryItem> & { summary: EntryHistorySummary };

/** Subset of GET /wallet/balances used by the pool screens. */
export interface PoolBalances {
  available: string;
  locked: string;
  owed: string;
  total: string;
  breakdown?: { lockedEntries?: string };
}

export interface RgLimitView {
  type: 'deposit' | 'participation' | 'loss' | 'session_time';
  period: 'day' | 'week' | 'month';
  limit: string | null;
  minutes: number | null;
  used: string | null;
  remaining: string | null;
  pendingIncrease: { amount: string | null; minutes: number | null; effectiveAt: string } | null;
}

/** Subset of GET /responsible-gaming used for the participation-limit check (enforced server-side). */
export interface RgState {
  limits: RgLimitView[];
  selfExclusion: { active: boolean; endsAt: string | null };
}

export interface RegionView {
  country: string | null;
  countryName: string | null;
  permitted: boolean;
}

// ── mock (DEMO, shifted to the real clock) ──────────────────────────────────────────────────────

const api = DATA_SOURCE === 'api';

function mockRound(r: Round, days: number): PoolRoundView {
  const pool = r.poolBalance ?? '0.00';
  return {
    id: r.id,
    number: r.number,
    numberLabel: formatRoundNumber(r.number),
    status: r.status,
    statusLabel: r.status[0]!.toUpperCase() + r.status.slice(1),
    opensAt: shiftIso(r.openedAt, days),
    openedAt: shiftIso(r.openedAt, days),
    closesAt: shiftIso(r.closesAt, days),
    closedAt: r.status === 'open' ? null : shiftIso(r.closesAt, days),
    entryPrice: r.entryPrice,
    platformFeePerEntry: r.platformFeePerEntry,
    participants: r.participants ?? 0,
    entries: r.entries ?? 0,
    poolBalance: r.status === 'cancelled' ? '0.00' : pool,
    platformFees: r.platformFees ?? '0.00',
    thresholds: r.thresholds,
    prizeDistribution: prizeBreakdown(pool).tiers,
    draw: r.draw
      ? {
          ...r.draw,
          status: r.draw.fulfilledAt ? 'fulfilled' : 'requested',
          requestedAt: shiftIso(r.draw.requestedAt, days),
          fulfilledAt: shiftIso(r.draw.fulfilledAt, days),
          settledAt: shiftIso(r.draw.settledAt, days),
        }
      : null,
    winners: r.winners.map((w) => ({ ...w, entrySeq: null })),
    cancellation: r.cancellation,
    settledAt:
      r.status === 'settled'
        ? shiftIso(r.closesAt.replace('T20:00:00Z', 'T20:02:10Z'), days)
        : null,
    isDemo: true,
  };
}

const mockRounds = () => {
  const days = demoShiftDays();
  return [DEMO_CURRENT_ROUND, ...DEMO_PREVIOUS_ROUNDS].map((r) => mockRound(r, days));
};

function mockOnly(path: string): never {
  throw new ApiRequestError(
    503,
    path,
    'Buying entries needs the GLOBAL POOL API (this build uses DEMO mock data).',
    'DEMO_MOCK_SOURCE',
    undefined,
    undefined,
    undefined,
  );
}

const clone = <T>(v: T): Promise<T> => Promise.resolve(structuredClone(v));

// ── public reads ──────────────────────────────────────────────────────────────────────────────

/** Current round (open → next scheduled → latest); null when no round exists yet. */
export async function getCurrentRound(): Promise<PoolRoundView | null> {
  if (!api) return clone(mockRounds()[0]!);
  try {
    return await apiRequest<PoolRoundView>('/pool/rounds/current', { auth: 'none' });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function getRound(number: number): Promise<PoolRoundView> {
  if (!api) {
    const r = mockRounds().find((x) => x.number === number);
    if (!r) mockNotFound(`/pool/rounds/${number}`);
    return clone(r);
  }
  return apiRequest<PoolRoundView>(`/pool/rounds/${number}`, { auth: 'none' });
}

function mockNotFound(path: string): never {
  throw new ApiRequestError(404, path, 'Round not found', 'NOT_FOUND', undefined, undefined, undefined);
}

export interface RoundListQuery {
  page?: number;
  pageSize?: number;
  status?: RoundStatus[];
  number?: number;
}

export async function listRounds(q: RoundListQuery = {}): Promise<Page<PoolRoundView>> {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 10;
  if (!api) {
    const all = mockRounds()
      .filter((r) => r.status !== 'open')
      .filter((r) => !q.status?.length || q.status.includes(r.status))
      .filter((r) => q.number === undefined || r.number === q.number);
    const items = all.slice((page - 1) * pageSize, page * pageSize);
    return clone({
      items,
      page,
      pageSize,
      total: all.length,
      totalPages: Math.ceil(all.length / pageSize),
    });
  }
  return apiRequest<Page<PoolRoundView>>('/pool/rounds', {
    auth: 'none',
    query: { page, pageSize, status: q.status?.join(','), number: q.number },
  });
}

export async function getRoundFeed(number: number, limit = 10): Promise<PoolFeedItem[]> {
  if (!api) {
    const days = demoShiftDays();
    return clone(
      DEMO_ENTRIES_FEED.slice(0, limit).map((e) => ({
        id: e.id,
        handle: e.handle,
        entries: e.entries,
        amount: e.amount,
        at: shiftIso(e.at, days),
        isDemo: true,
      })),
    );
  }
  return apiRequest<PoolFeedItem[]>(`/pool/rounds/${number}/feed`, {
    auth: 'none',
    query: { limit },
  });
}

export async function getVerification(number: number): Promise<PoolVerification> {
  if (!api) {
    const r = mockRounds().find((x) => x.number === number);
    if (!r) mockNotFound(`/pool/rounds/${number}/verify`);
    return clone({
      round: {
        id: r.id,
        number: r.number,
        status: r.status,
        totalEntries: r.entries,
        pool: r.poolBalance,
      },
      algorithm: {
        name: 'GLOBAL_POOL_WINNERS_V1',
        domain: '',
        description: '',
        roundIdUsed: String(r.number),
        prizeSplitBps: [5000, 2000, 1000, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
        entryOrder: 'entries ordered by seq ascending (index = seq − 1)',
      },
      randomness: null,
      winners: r.winners,
      recomputed: null,
    });
  }
  return apiRequest<PoolVerification>(`/pool/rounds/${number}/verify`, { auth: 'none' });
}

export async function getRegion(): Promise<RegionView> {
  if (!api) return { country: 'PT', countryName: 'Portugal', permitted: true };
  return apiRequest<RegionView>('/compliance/region', { auth: 'none' });
}

// ── player reads / writes ─────────────────────────────────────────────────────────────────────

export async function getMyRoundEntries(round: PoolRoundView): Promise<MyRoundEntries> {
  if (!api) {
    const mine = round.number === DEMO_MY_ENTRIES.roundNumber;
    const ids = mine ? [...DEMO_MY_ENTRY_IDS] : [];
    return clone({
      roundId: round.id,
      roundNumber: round.number,
      entries: ids.length,
      entryIds: ids,
      firstEntryId: ids[0] ?? null,
      lastEntryId: ids.at(-1) ?? null,
      entryAmount: mine ? DEMO_MY_ENTRIES.entryAmount : '0.00',
      platformFee: mine ? DEMO_MY_ENTRIES.platformFee : '0.00',
      purchases: mine
        ? [
            {
              reference: 'EP-1248-00981-01015',
              total: DEMO_MY_ENTRIES.total,
              at: shiftIso(DEMO_MY_ENTRIES.purchasedAt, demoShiftDays()),
            },
          ]
        : [],
      odds:
        ids.length && round.entries
          ? oddsDisclosure(ids.length, round.entries, Math.min(13, round.entries))
          : null,
    });
  }
  return apiRequest<MyRoundEntries>(`/pool/rounds/${round.id}/my-entries`);
}

export async function getEntryHistory(page = 1, pageSize = 10): Promise<EntryHistory> {
  if (!api) {
    const days = demoShiftDays();
    const items: EntryHistoryItem[] = [
      {
        reference: 'EP-1248-00981-01015',
        transactionId: 'demo-ep-1248',
        roundId: DEMO_CURRENT_ROUND.id,
        roundNumber: 1248,
        roundStatus: 'open',
        roundClosesAt: shiftIso(DEMO_CURRENT_ROUND.closesAt, days),
        entries: 35,
        firstEntryId: DEMO_MY_ENTRIES.firstEntryId,
        lastEntryId: DEMO_MY_ENTRIES.lastEntryId,
        entryAmount: '350.00',
        platformFee: '1.75',
        networkFee: '0.00',
        total: '351.75',
        purchasedAt: shiftIso(DEMO_MY_ENTRIES.purchasedAt, days),
        result: { kind: 'in_draw', prize: null, winningEntryIds: [], refund: null },
        isDemo: true,
      },
    ];
    return clone({
      summary: {
        purchases: 1,
        qualifyingEntries: 35,
        activeEntries: 35,
        platformFeesPaid: '1.75',
        prizesWon: '0.00',
        refundOwed: '0.00',
      },
      items,
      page,
      pageSize,
      total: items.length,
      totalPages: 1,
    });
  }
  return apiRequest<EntryHistory>('/pool/me/entries', { query: { page, pageSize } });
}

export async function getBalances(): Promise<PoolBalances> {
  if (!api)
    return clone({
      available: DEMO_BALANCES.available,
      locked: DEMO_BALANCES.locked,
      owed: DEMO_BALANCES.owed,
      total: DEMO_BALANCES.total,
    });
  return apiRequest<PoolBalances>('/wallet/balances');
}

export async function getRgState(): Promise<RgState> {
  if (!api)
    return clone({
      limits: [
        {
          type: 'participation',
          period: 'day',
          limit: '500.00',
          minutes: null,
          used: '351.75',
          remaining: '148.25',
          pendingIncrease: null,
        },
      ],
      selfExclusion: { active: false, endsAt: null },
    });
  return apiRequest<RgState>('/responsible-gaming');
}

/**
 * Buy entries (idempotent). The SAME `idempotencyKey` must be reused when retrying the same intent; the API
 * replays the stored response (`replayed: true`). Balance, round window and RG limits are enforced server-side.
 */
export async function enterRound(
  roundId: string,
  entries: number,
  idempotencyKey: string,
): Promise<EntryPurchaseResult> {
  if (!api) mockOnly(`/pool/rounds/${roundId}/entries`);
  return apiRequest<EntryPurchaseResult>(`/pool/rounds/${roundId}/entries`, {
    method: 'POST',
    body: { entries, idempotencyKey },
  });
}
