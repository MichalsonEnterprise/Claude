/**
 * Query definitions (keys + fetchers) for the public lobby / homepage. Server-safe: no React hooks here, so
 * the server page can prefetch the same queries it later hydrates on the client (./hooks.ts).
 *
 * Mock fetchers resolve DEMO data (@gp/shared/demo + ./mock-home.ts). API fetchers call the endpoints listed
 * next to each query; where the API has no endpoint yet the query stays on the mock (`api: not yet`).
 */
import { DEMO_BALANCES, DEMO_GAMES } from '@gp/shared/demo';
import { add } from '@gp/shared/money';
import { queryOptions, type QueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api/client';
import { publicEnv } from '@/lib/env';

import {
  mockDrawRandomness,
  mockEntriesFeed,
  mockLiveBets,
  mockMyEntries,
  mockNetworks,
  mockPoolHistory,
  mockPoolSnapshot,
  mockRecentWins,
  mockRegion,
  mockVerifierSample,
  mockVipTiers,
} from './mock-home';
import { DATA_SOURCE, apiGet, mockResolve } from './source';
import type {
  FeedEntryView,
  GameView,
  HomeScenario,
  LiveBetTab,
  MyEntriesView,
  PoolSnapshot,
  RegionStatus,
  RoundView,
  ViewerBalance,
} from './types';

const api = DATA_SOURCE === 'api';

/** Query keys. The scenario is part of mock keys so preview states never share cache entries. */
export const queryKeys = {
  poolSnapshot: (s: HomeScenario) => ['pool', 'snapshot', s.round] as const,
  poolHistory: (s: HomeScenario) => ['pool', 'history', 14, s.round] as const,
  entriesFeed: (roundNumber: number) => ['pool', 'feed', roundNumber] as const,
  myEntries: (roundNumber: number) => ['me', 'entries', roundNumber] as const,
  viewerBalance: () => ['me', 'balance'] as const,
  games: () => ['games'] as const,
  recentWins: () => ['activity', 'recent-wins'] as const,
  liveBets: (tab: LiveBetTab, s: HomeScenario) => ['activity', 'bets', tab, s.round] as const,
  networks: () => ['config', 'networks'] as const,
  verifierSample: () => ['fairness', 'sample'] as const,
  drawRandomness: (s: HomeScenario) => ['fairness', 'draw', 'latest', s.round] as const,
  vipTiers: () => ['vip', 'tiers'] as const,
  region: (s: HomeScenario) => ['compliance', 'region', s.region] as const,
};

// ── fetchers ────────────────────────────────────────────────────────────────────────────────────

/**
 * GET /pool/rounds/current, and between rounds GET /pool/rounds?pageSize=1 for the latest closed / drawing /
 * settled / cancelled round: `last` must be the previous round with its real status, never the next scheduled one
 * (the current endpoint prefers a scheduled round once the daily round has closed).
 */
async function fetchPoolSnapshot(scenario: HomeScenario): Promise<PoolSnapshot> {
  if (!api) return mockResolve(mockPoolSnapshot(scenario));
  // The endpoint returns the open round, else the next scheduled one, else the latest.
  const round = await apiGet<RoundView & { opensAt?: string }>('/pool/rounds/current');
  const serverNow = new Date();
  // A round accepts entries only once `opensAt` has passed (EntriesService.enter, pool logic `not_open_yet`): an
  // `open` status with a future opensAt is still the NEXT round — never "Closes in … / Enter round" (Q03).
  const notOpenYet =
    round.status === 'open' &&
    round.opensAt !== undefined &&
    Date.parse(round.opensAt) > serverNow.getTime();
  const open = round.status === 'open' && !notOpenYet;
  const scheduled = round.status === 'scheduled' || notOpenYet;
  const previous = open
    ? null
    : ((await apiGet<{ items: RoundView[] }>('/pool/rounds?pageSize=1')).items[0] ?? null);
  const DAY = 24 * 3600_000;
  const plusDay = (iso: string) => new Date(new Date(iso).getTime() + DAY).toISOString();
  return {
    serverNow: serverNow.toISOString(),
    current: open ? round : null,
    last: previous ?? round,
    next: scheduled
      ? { number: round.number, opensAt: round.opensAt ?? round.openedAt, closesAt: round.closesAt }
      : {
          number: round.number + 1,
          opensAt: plusDay(round.opensAt ?? round.openedAt),
          closesAt: plusDay(round.closesAt),
        },
    participantsLastHour: null,
    recentHandles: [],
    isDemo: Boolean(round.isDemo),
  };
}

export const poolSnapshotQuery = (scenario: HomeScenario) =>
  queryOptions({
    queryKey: queryKeys.poolSnapshot(scenario),
    queryFn: () => fetchPoolSnapshot(scenario),
    refetchInterval: 30_000,
  });

// api: not yet (no daily pool-history endpoint) — mock only.
export const poolHistoryQuery = (scenario: HomeScenario) =>
  queryOptions({
    queryKey: queryKeys.poolHistory(scenario),
    queryFn: () => mockResolve(mockPoolHistory(scenario)),
  });

/** GET /pool/rounds/:number/feed?limit=5 */
export const entriesFeedQuery = (roundNumber: number) =>
  queryOptions({
    queryKey: queryKeys.entriesFeed(roundNumber),
    queryFn: (): Promise<FeedEntryView[]> =>
      api
        ? apiGet<FeedEntryView[]>(`/pool/rounds/${roundNumber}/feed?limit=5`)
        : mockResolve(mockEntriesFeed()),
    refetchInterval: 15_000,
  });

/** GET /pool/rounds/:roundId/my-entries … `GET` view of the API (player token; client only). */
interface ApiMyRoundEntries {
  roundNumber: number;
  roundId: string;
  entries: number;
  firstEntryId: string | null;
  lastEntryId: string | null;
  entryAmount: string;
  platformFee: string;
  purchases: { reference: string; total: string; at: string }[];
  odds: { anyPrizeApproxPercent: string; firstPrizePercent: string } | null;
}

/** The viewer's entries in the current round (player token; never prefetched on the server). null = none. */
async function fetchMyEntries(roundId: string | undefined): Promise<MyEntriesView | null> {
  if (!api) return mockResolve(mockMyEntries());
  if (!roundId) return null;
  const r = await apiRequest<ApiMyRoundEntries>(`/pool/rounds/${roundId}/my-entries`);
  if (r.entries <= 0 || !r.firstEntryId || !r.lastEntryId) return null;
  return {
    roundId: r.roundId,
    roundNumber: r.roundNumber,
    entries: r.entries,
    firstEntryId: r.firstEntryId,
    lastEntryId: r.lastEntryId,
    entryAmount: r.entryAmount,
    platformFee: r.platformFee,
    networkFee: '0.00',
    total: add(r.entryAmount, r.platformFee).toFixed(2),
    txHashDisplay: '',
    purchasedAt: r.purchases.at(-1)?.at ?? new Date().toISOString(),
    status: 'active',
    odds: {
      anyPrizeApproxPercent: r.odds?.anyPrizeApproxPercent ?? '0',
      firstPrizePercent: r.odds?.firstPrizePercent ?? '0',
    },
    isDemo: publicEnv.demoMode,
  };
}

/** API: GET /pool/rounds/:roundId/my-entries (the viewer's real entries); mock: the DEMO player's 35 entries. */
export const myEntriesQuery = (roundNumber: number, roundId?: string) =>
  queryOptions({
    queryKey: queryKeys.myEntries(roundNumber),
    queryFn: () => fetchMyEntries(roundId),
  });

/** API: GET /wallet/balances (the viewer's real Available); mock: the DEMO player's balance. */
export const viewerBalanceQuery = () =>
  queryOptions({
    queryKey: queryKeys.viewerBalance(),
    queryFn: async (): Promise<ViewerBalance> =>
      api
        ? {
            available: (await apiRequest<{ available: string }>('/wallet/balances')).available,
            isDemo: publicEnv.demoMode,
          }
        : mockResolve({ available: DEMO_BALANCES.available, isDemo: true }),
  });

/** GET /games */
export const gamesQuery = () =>
  queryOptions({
    queryKey: queryKeys.games(),
    queryFn: (): Promise<GameView[]> =>
      api ? apiGet<GameView[]>('/games') : mockResolve(DEMO_GAMES),
    staleTime: 5 * 60_000,
  });

// api: not yet (activity feeds) — mock only.
export const recentWinsQuery = () =>
  queryOptions({
    queryKey: queryKeys.recentWins(),
    queryFn: () => mockResolve(mockRecentWins()),
  });

export const liveBetsQuery = (tab: LiveBetTab, scenario: HomeScenario) =>
  queryOptions({
    queryKey: queryKeys.liveBets(tab, scenario),
    queryFn: () => mockResolve(mockLiveBets(tab, scenario)),
  });

// api: GET /config/chains exists but has no withdrawal-fee/health view yet — mock (shared chain config).
export const networksQuery = () =>
  queryOptions({
    queryKey: queryKeys.networks(),
    queryFn: () => mockResolve(mockNetworks()),
    staleTime: 5 * 60_000,
  });

// api: not yet (Originals verifier sample / latest VRF draw) — mock only.
export const verifierSampleQuery = () =>
  queryOptions({
    queryKey: queryKeys.verifierSample(),
    queryFn: () => mockResolve(mockVerifierSample()),
    staleTime: Infinity,
  });

export const drawRandomnessQuery = (scenario: HomeScenario) =>
  queryOptions({
    queryKey: queryKeys.drawRandomness(scenario),
    queryFn: () => mockResolve(mockDrawRandomness(scenario)),
  });

export const vipTiersQuery = () =>
  queryOptions({
    queryKey: queryKeys.vipTiers(),
    queryFn: () => mockResolve(mockVipTiers()),
    staleTime: Infinity,
  });

/** GET /compliance/region — whether the platform is available from the request location. */
export const regionQuery = (scenario: HomeScenario) =>
  queryOptions({
    queryKey: queryKeys.region(scenario),
    queryFn: async (): Promise<RegionStatus> => {
      if (!api) return mockResolve(mockRegion(scenario));
      const r = await apiGet<{
        country: string | null;
        countryName: string | null;
        permitted: boolean;
      }>('/compliance/region');
      return { ...r, isDemo: false };
    },
    staleTime: 5 * 60_000,
  });

/**
 * Prefetch everything the homepage renders for a guest (server page → HydrationBoundary). Never throws: a
 * failed prefetch just leaves the query to the client (which shows skeletons and retries).
 */
export async function prefetchHome(qc: QueryClient, scenario: HomeScenario): Promise<void> {
  const snapshot = qc.fetchQuery(poolSnapshotQuery(scenario)).catch(() => null);
  await Promise.all([
    snapshot,
    qc.prefetchQuery(poolHistoryQuery(scenario)),
    qc.prefetchQuery(gamesQuery()),
    qc.prefetchQuery(recentWinsQuery()),
    qc.prefetchQuery(liveBetsQuery('latest', scenario)),
    qc.prefetchQuery(networksQuery()),
    qc.prefetchQuery(verifierSampleQuery()),
    qc.prefetchQuery(drawRandomnessQuery(scenario)),
    qc.prefetchQuery(vipTiersQuery()),
    qc.prefetchQuery(regionQuery(scenario)),
  ]);
  const current = (await snapshot)?.current;
  if (current) await qc.prefetchQuery(entriesFeedQuery(current.number));
}
