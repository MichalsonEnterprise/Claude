'use client';

/**
 * TanStack Query hooks over ./queries.ts. Components only use these hooks — swapping the data source
 * (NEXT_PUBLIC_DATA_SOURCE) never touches a component.
 */
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  drawRandomnessQuery,
  entriesFeedQuery,
  gamesQuery,
  liveBetsQuery,
  myEntriesQuery,
  networksQuery,
  poolHistoryQuery,
  poolSnapshotQuery,
  recentWinsQuery,
  regionQuery,
  verifierSampleQuery,
  viewerBalanceQuery,
  vipTiersQuery,
} from './queries';
import type { HomeScenario, LiveBetTab } from './types';

export const usePoolSnapshot = (s: HomeScenario) => useQuery(poolSnapshotQuery(s));
export const usePoolHistory = (s: HomeScenario) => useQuery(poolHistoryQuery(s));
export const useEntriesFeed = (roundNumber: number, enabled = true) =>
  useQuery({ ...entriesFeedQuery(roundNumber), enabled });
export const useMyEntries = (roundNumber: number, enabled: boolean) =>
  useQuery({ ...myEntriesQuery(roundNumber), enabled });
export const useViewerBalance = (enabled: boolean) =>
  useQuery({ ...viewerBalanceQuery(), enabled });
export const useGames = () => useQuery(gamesQuery());
export const useRecentWins = (enabled = true) => useQuery({ ...recentWinsQuery(), enabled });
export const useLiveBets = (tab: LiveBetTab, s: HomeScenario, enabled = true) =>
  useQuery({ ...liveBetsQuery(tab, s), enabled });
export const useNetworks = () => useQuery(networksQuery());
export const useVerifierSample = () => useQuery(verifierSampleQuery());
export const useDrawRandomness = (s: HomeScenario) => useQuery(drawRandomnessQuery(s));
export const useVipTiers = () => useQuery(vipTiersQuery());
export const useRegion = (s: HomeScenario) => useQuery(regionQuery(s));

/**
 * Server clock estimate: the snapshot's `serverNow` advanced by the real time elapsed since the response
 * arrived (`dataUpdatedAt`). Re-renders every `tickMs`. Returns epoch ms. Countdowns and "x s ago" labels use
 * this — never a looping or fabricated timer.
 */
export function useServerNow(
  serverNow: string | undefined,
  receivedAt: number,
  tickMs = 1000,
): number | null {
  const base = serverNow ? new Date(serverNow).getTime() : null;
  const compute = React.useCallback(
    () => (base === null ? null : base + Math.max(0, Date.now() - receivedAt)),
    [base, receivedAt],
  );
  const [now, setNow] = React.useState<number | null>(base);
  React.useEffect(() => {
    setNow(compute());
    const id = window.setInterval(() => setNow(compute()), tickMs);
    return () => window.clearInterval(id);
  }, [compute, tickMs]);
  return now;
}
