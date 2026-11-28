/**
 * Query definitions (keys + fetchers) for the public lobby / homepage. Server-safe: no React hooks here, so
 * the server page can prefetch the same queries it later hydrates on the client (./hooks.ts).
 *
 * Mock fetchers resolve DEMO data (@gp/shared/demo + ./mock-home.ts). API fetchers call the endpoints listed
 * next to each query; where the API has no endpoint yet the query stays on the mock (`api: not yet`).
 */
import { DEMO_BALANCES, DEMO_GAMES } from '@gp/shared/demo';
import { queryOptions, type QueryClient } from '@tanstack/react-query';

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
  PoolSnapshot,
  RegionStatus,
  RoundView,
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

/** GET /pool/rounds/current (+ the API's Date header as server clock). */
async function fetchPoolSnapshot(scenario: HomeScenario): Promise<PoolSnapshot> {
  if (!api) return mockResolve(mockPoolSnapshot(scenario));
  // The endpoint returns the open round, else the next scheduled one, else the latest.
  const round = await apiGet<RoundView & { opensAt?: string }>('/pool/rounds/current');
  const open = round.status === 'open';
  const scheduled = round.status === 'scheduled';
  const DAY = 24 * 3600_000;
  const plusDay = (iso: string) => new Date(new Date(iso).getTime() + DAY).toISOString();
  return {
    serverNow: new Date().toISOString(),
    current: open ? round : null,
    last: round,
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

// api: GET /pool/rounds/:roundId/my-entries needs the player token — wired by the pool page agent.
export const myEntriesQuery = (roundNumber: number) =>
  queryOptions({
    queryKey: queryKeys.myEntries(roundNumber),
    queryFn: () => mockResolve(mockMyEntries()),
  });

// api: GET /wallet/balances needs the player token — wired with the wallet screens.
export const viewerBalanceQuery = () =>
  queryOptions({
    queryKey: queryKeys.viewerBalance(),
    queryFn: () => mockResolve({ available: DEMO_BALANCES.available, isDemo: true }),
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
