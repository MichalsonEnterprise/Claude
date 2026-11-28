'use client';

/**
 * TanStack Query hooks + live socket for the Global Pool screens. Query keys live under ['pool', …] so they never
 * collide with other modules' caches (viewer balance / RG data included).
 */
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { io, type Socket } from 'socket.io-client';

import {
  getBalances,
  getCurrentRound,
  getEntryHistory,
  getMyRoundEntries,
  getRegion,
  getRgState,
  getRound,
  getRoundFeed,
  getVerification,
  listRounds,
  type PoolFeedItem,
  type PoolRoundView,
  type RoundListQuery,
} from '@/lib/api/pool';
import { usePlayerDataReady } from '@/lib/api/player-ready';
import { useAuth } from '@/lib/auth';
import { DATA_SOURCE } from '@/lib/data/source';
import { publicEnv } from '@/lib/env';

export const poolKeys = {
  all: ['pool'] as const,
  current: () => ['pool', 'round', 'current'] as const,
  round: (n: number) => ['pool', 'round', n] as const,
  rounds: (q: RoundListQuery) => ['pool', 'rounds', q] as const,
  feed: (n: number) => ['pool', 'feed', n] as const,
  verify: (n: number) => ['pool', 'verify', n] as const,
  myRound: (roundId: string) => ['pool', 'me', 'round', roundId] as const,
  history: (page: number, pageSize: number) => ['pool', 'me', 'history', page, pageSize] as const,
  balances: () => ['pool', 'me', 'balances'] as const,
  rg: () => ['pool', 'me', 'rg'] as const,
  region: () => ['pool', 'region'] as const,
};

/** Real clock in epoch ms, re-rendered every `tickMs`. null during SSR / the first render (no hydration drift). */
export function useNow(tickMs = 1000): number | null {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

export const useCurrentRound = () =>
  useQuery({ queryKey: poolKeys.current(), queryFn: getCurrentRound, refetchInterval: 30_000 });

export const useRound = (n: number) =>
  useQuery({
    queryKey: poolKeys.round(n),
    queryFn: () => getRound(n),
    enabled: Number.isInteger(n) && n > 0,
    // drawing rounds settle within minutes — poll until final
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'settled' || s === 'cancelled' ? false : 10_000;
    },
  });

export const useRounds = (q: RoundListQuery) =>
  useQuery({
    queryKey: poolKeys.rounds(q),
    queryFn: () => listRounds(q),
    placeholderData: keepPreviousData,
  });

export const useRoundFeed = (n: number | undefined, enabled = true) =>
  useQuery({
    queryKey: poolKeys.feed(n ?? 0),
    queryFn: () => getRoundFeed(n!, 10),
    enabled: enabled && Boolean(n),
    refetchInterval: 30_000,
  });

export const useVerification = (n: number) =>
  useQuery({ queryKey: poolKeys.verify(n), queryFn: () => getVerification(n), staleTime: 60_000 });

export const useRegionStatus = () =>
  useQuery({ queryKey: poolKeys.region(), queryFn: getRegion, staleTime: 5 * 60_000 });

/**
 * `member` drives what the page shows (signed-in vs guest). `ready` gates the player-only QUERIES: a member whose
 * profile is still syncing, or who is about to be sent to /onboarding, would only get 403s back (Q12).
 */
export function useViewer() {
  const auth = useAuth();
  const member = auth.status === 'member';
  const ready = usePlayerDataReady();
  return { auth, member, ready, loading: auth.status === 'loading' };
}

export function useMyRoundEntries(round: PoolRoundView | null | undefined) {
  const { ready } = useViewer();
  return useQuery({
    queryKey: poolKeys.myRound(round?.id ?? 'none'),
    queryFn: () => getMyRoundEntries(round!),
    enabled: ready && Boolean(round),
  });
}

export function useEntryHistory(page: number, pageSize = 10) {
  const { ready } = useViewer();
  return useQuery({
    queryKey: poolKeys.history(page, pageSize),
    queryFn: () => getEntryHistory(page, pageSize),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useViewerBalances() {
  const { ready } = useViewer();
  return useQuery({ queryKey: poolKeys.balances(), queryFn: getBalances, enabled: ready });
}

export function useViewerRg() {
  const { ready } = useViewer();
  return useQuery({ queryKey: poolKeys.rg(), queryFn: getRgState, enabled: ready });
}

// ── live socket (socket.io namespace /pool) ───────────────────────────────────────────────────

interface PoolUpdateEvent {
  type: 'pool.update';
  roundId: string;
  roundNumber: number;
  status: PoolRoundView['status'];
  entries: number;
  participants: number;
  poolBalance: string;
  platformFees: string;
  closesAt: string;
  lastPurchase?: { handle: string | null; entries: number; amount: string; at: string };
  isDemo: boolean;
}

interface RoundStatusEvent {
  type: 'round.status';
  roundId: string;
  roundNumber: number;
  status: PoolRoundView['status'];
  at: string;
}

export type LiveStatus = 'off' | 'connecting' | 'live' | 'offline';

/**
 * Subscribes to the read-only `/pool` namespace: `pool:update` patches the round + feed caches (no refetch storm),
 * `round:status` invalidates round queries. Only in API mode — the DEMO mock has no live stream.
 */
export function useLivePool(enabled = true): LiveStatus {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState<LiveStatus>('off');
  React.useEffect(() => {
    if (!enabled || DATA_SOURCE !== 'api') return;
    setStatus('connecting');
    const socket: Socket = io(`${publicEnv.apiUrl}/pool`, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15_000,
    });
    const patchRound = (r: PoolRoundView | null | undefined, e: PoolUpdateEvent) =>
      r && r.id === e.roundId
        ? {
            ...r,
            status: e.status,
            entries: e.entries,
            participants: e.participants,
            poolBalance: e.poolBalance,
            platformFees: e.platformFees,
            closesAt: e.closesAt,
          }
        : r;
    socket.on('connect', () => setStatus('live'));
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('pool:update', (e: PoolUpdateEvent) => {
      qc.setQueryData<PoolRoundView | null>(poolKeys.current(), (r) => patchRound(r, e));
      qc.setQueryData<PoolRoundView>(poolKeys.round(e.roundNumber), (r) => patchRound(r, e) ?? r);
      if (e.lastPurchase) {
        const p = e.lastPurchase;
        qc.setQueryData<PoolFeedItem[]>(poolKeys.feed(e.roundNumber), (rows) =>
          rows
            ? [
                {
                  id: `live-${p.at}-${p.handle ?? 'hidden'}`,
                  handle: p.handle,
                  entries: p.entries,
                  amount: p.amount,
                  at: p.at,
                  isDemo: e.isDemo,
                },
                ...rows,
              ].slice(0, 10)
            : rows,
        );
      }
    });
    socket.on('round:status', (e: RoundStatusEvent) => {
      void qc.invalidateQueries({ queryKey: poolKeys.current() });
      void qc.invalidateQueries({ queryKey: poolKeys.round(e.roundNumber) });
      void qc.invalidateQueries({ queryKey: ['pool', 'rounds'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [enabled, qc]);
  return status;
}
