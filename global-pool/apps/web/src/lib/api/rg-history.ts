'use client';

/**
 * rg-history module API wrappers + TanStack Query hooks: responsible gaming (USR-RG1..RG7) and player history
 * (USR-F1..F6 financial, USR-G1..G7 gaming). Every call goes through the shared `apiRequest` client.
 * Money arrives as decimal strings and is only formatted with @gp/shared/money — never parsed into floats.
 */
import type {
  CoolingOff,
  FavouriteGameView,
  FeeLineView,
  FinanceSummaryView,
  GameRoundView,
  GamesOverviewView,
  HistoryEntriesQuery,
  MyRoundEntriesView,
  Paginated,
  RealityCheckAction,
  RealityCheckUpdate,
  RgHistoryItem,
  RgLimitRef,
  RgLimitUpdate,
  RgQuietHours,
  RgSessionView,
  RgStateView,
  SelfExclusion,
  WinningsView,
} from '@gp/shared/schemas';
import type { TxStatus, TxType } from '@gp/shared/enums';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';

import { apiRequest } from './client';
import { invalidatePlayerFinancials } from './player-cache';
import { usePlayerDataReady } from './player-ready';

// ── types the API returns that are not shared schemas ─────────────────────────────────────────

export interface TxView {
  id: string;
  uuid: string;
  type: TxType;
  status: TxStatus;
  withdrawalStatus?: string;
  direction: 'in' | 'out';
  network: string | null;
  amount: string;
  networkFee: string | null;
  platformFee: string;
  netAmount: string;
  addressDisplay: string | null;
  txHash: string | null;
  txHashDisplay: string | null;
  confirmations: { current: number; required: number } | null;
  description: string;
  statusDetail: string | null;
  roundId: string | null;
  roundNumber?: number | null;
  createdAt: string;
  completedAt: string | null;
  isDemo: boolean;
}

export interface WalletBalancesView {
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
  isDemo?: boolean;
}

export interface HistoryTxFilters {
  types?: TxType[];
  status?: TxStatus;
  network?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface EntriesPage extends Paginated<MyRoundEntriesView> {
  totals: { entries: number; rounds: number; won: number };
}

// ── query keys ────────────────────────────────────────────────────────────────────────────────

export const rgKeys = {
  all: ['rg'] as const,
  state: ['rg', 'state'] as const,
  session: ['rg', 'session'] as const,
  history: (kind: string) => ['rg', 'history', kind] as const,
};

export const historyKeys = {
  all: ['history'] as const,
  summary: ['history', 'summary'] as const,
  balances: ['history', 'balances'] as const,
  transactions: (f: HistoryTxFilters) => ['history', 'transactions', f] as const,
  fees: (page: number) => ['history', 'fees', page] as const,
  entries: (q: Partial<HistoryEntriesQuery>) => ['history', 'entries', q] as const,
  active: ['history', 'rounds', 'active'] as const,
  results: ['history', 'rounds', 'results'] as const,
  winnings: ['history', 'winnings'] as const,
  games: ['history', 'games'] as const,
  gameRounds: (q: { game?: string; page?: number; from?: string; to?: string }) =>
    ['history', 'game-rounds', q] as const,
  favourites: ['history', 'favourites'] as const,
};

function useMemberQuery<T>(
  key: QueryKey,
  fn: () => Promise<T>,
  opts: { refetchMs?: number; keepPrevious?: boolean; beforeOnboarding?: boolean } = {},
) {
  const { status } = useAuth();
  // History and balances need a finished onboarding on the API: they wait for the profile and never fire while the
  // member is about to be sent to /onboarding (Q12). RG tools are open before onboarding (`beforeOnboarding`).
  const ready = usePlayerDataReady();
  return useQuery({
    queryKey: key,
    queryFn: fn,
    enabled: opts.beforeOnboarding ? status === 'member' : ready,
    refetchInterval: opts.refetchMs,
    placeholderData: opts.keepPrevious ? keepPreviousData : undefined,
  });
}

const qs = (f: HistoryTxFilters) => ({
  types: f.types?.length ? f.types.join(',') : undefined,
  status: f.status,
  network: f.network,
  from: f.from,
  to: f.to,
  q: f.q,
  page: f.page,
  pageSize: f.pageSize,
});

// ── responsible gaming ────────────────────────────────────────────────────────────────────────

export const rgApi = {
  state: () => apiRequest<RgStateView>('/responsible-gaming'),
  session: () => apiRequest<RgSessionView>('/responsible-gaming/session'),
  heartbeat: () =>
    apiRequest<RgSessionView>('/responsible-gaming/session/heartbeat', {
      method: 'POST',
      body: {},
    }),
  history: (kind: 'limits' | 'reality_checks' | 'all', limit = 20) =>
    apiRequest<RgHistoryItem[]>('/responsible-gaming/history', { query: { kind, limit } }),
  setLimit: (body: RgLimitUpdate) =>
    apiRequest<RgStateView>('/responsible-gaming/limits', { method: 'PUT', body }),
  removeLimit: (body: RgLimitRef) =>
    apiRequest<RgStateView>('/responsible-gaming/limits/remove', { method: 'POST', body }),
  cancelPending: (body: RgLimitRef) =>
    apiRequest<RgStateView>('/responsible-gaming/limits/cancel-pending', { method: 'POST', body }),
  sessionLimit: (minutes: number | null) =>
    apiRequest<RgStateView>('/responsible-gaming/session-limit', {
      method: 'PUT',
      body: { minutes },
    }),
  quietHours: (body: RgQuietHours) =>
    apiRequest<RgStateView>('/responsible-gaming/quiet-hours', { method: 'PUT', body }),
  cancelSetting: (target: 'session_limit' | 'quiet_hours') =>
    apiRequest<RgStateView>('/responsible-gaming/settings/cancel-pending', {
      method: 'POST',
      body: { target },
    }),
  realityCheck: (body: RealityCheckUpdate) =>
    apiRequest<RgStateView>('/responsible-gaming/reality-check', { method: 'PUT', body }),
  ack: (action: RealityCheckAction) =>
    apiRequest<{ acknowledgedAt: string; action: RealityCheckAction; sessionMinutes: number }>(
      '/responsible-gaming/reality-check/ack',
      { method: 'POST', body: { action } },
    ),
  coolingOff: (body: CoolingOff) =>
    apiRequest<ExclusionResult>('/responsible-gaming/cooling-off', { method: 'POST', body }),
  selfExclude: (body: SelfExclusion) =>
    apiRequest<ExclusionResult>('/responsible-gaming/self-exclusion', { method: 'POST', body }),
  /** After a 6m / 1y / 5y self-exclusion ended: ask to reopen (starts the 24 h cool-down). */
  requestReopen: () =>
    apiRequest<RgStateView>('/responsible-gaming/self-exclusion/reopen', {
      method: 'POST',
      body: {},
    }),
  /** After the cool-down, with a deposit and a loss limit set: reopen the account. */
  confirmReopen: () =>
    apiRequest<RgStateView>('/responsible-gaming/self-exclusion/reopen/confirm', {
      method: 'POST',
      body: {},
    }),
};

export interface ExclusionResult {
  kind: 'cooling_off' | 'self_exclusion';
  duration: string;
  startsAt: string;
  endsAt: string | null;
}

export function useRgState() {
  return useMemberQuery(rgKeys.state, rgApi.state, { refetchMs: 60_000, beforeOnboarding: true });
}

export function useRgHistory(kind: 'limits' | 'reality_checks' | 'all', limit = 10) {
  return useMemberQuery(rgKeys.history(kind), () => rgApi.history(kind, limit), {
    beforeOnboarding: true,
  });
}

/**
 * Any RG mutation refreshes the RG state + logs; returns the fresh state into the cache when it is one. Limits and
 * exclusions are also cached by the pool modal, wallet, dashboard and account gate, so all of those refresh too.
 */
export function useRgMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'limits' in data) qc.setQueryData(rgKeys.state, data);
      void invalidatePlayerFinancials(qc);
    },
  });
}

export function useWalletBalances() {
  return useMemberQuery(historyKeys.balances, () =>
    apiRequest<WalletBalancesView>('/wallet/balances'),
  );
}

// ── history ───────────────────────────────────────────────────────────────────────────────────

export const historyApi = {
  summary: () => apiRequest<FinanceSummaryView>('/history/summary'),
  transactions: (f: HistoryTxFilters) =>
    apiRequest<Paginated<TxView>>('/history/transactions', { query: qs(f) }),
  exportCsv: (
    f: HistoryTxFilters & { format?: 'csv' | 'csv_semicolon'; includeHashes?: boolean },
  ) =>
    apiRequest<string>('/history/transactions/export', {
      query: {
        ...qs(f),
        page: undefined,
        pageSize: undefined,
        format: f.format,
        includeHashes: f.includeHashes,
      },
      headers: { accept: 'text/csv' },
    }),
  fees: (page: number, pageSize = 10) =>
    apiRequest<Paginated<FeeLineView>>('/history/fees', { query: { page, pageSize } }),
  entries: (q: Partial<HistoryEntriesQuery>) =>
    apiRequest<EntriesPage>('/history/entries', {
      query: {
        page: q.page,
        pageSize: q.pageSize,
        status: q.status?.length ? q.status.join(',') : undefined,
        roundFrom: q.roundFrom,
        roundTo: q.roundTo,
        sort: q.sort,
      },
    }),
  active: () => apiRequest<MyRoundEntriesView[]>('/history/rounds/active'),
  results: () => apiRequest<MyRoundEntriesView[]>('/history/rounds/results'),
  winnings: () => apiRequest<WinningsView>('/history/winnings'),
  games: () => apiRequest<GamesOverviewView>('/history/games'),
  gameRounds: (q: {
    game?: string;
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
  }) => apiRequest<Paginated<GameRoundView>>('/history/game-rounds', { query: q }),
  exportGameRounds: (q: { game?: string; from?: string; to?: string }) =>
    apiRequest<string>('/history/game-rounds/export', {
      query: q,
      headers: { accept: 'text/csv' },
    }),
  favourites: () => apiRequest<FavouriteGameView[]>('/history/favourites'),
  addFavourite: (slug: string) =>
    apiRequest<FavouriteGameView[]>(`/history/favourites/${encodeURIComponent(slug)}`, {
      method: 'PUT',
    }),
  removeFavourite: (slug: string) =>
    apiRequest<FavouriteGameView[]>(`/history/favourites/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }),
  claimOwed: (idempotencyKey: string) =>
    apiRequest<{ claimed: string; claimedAt: string }>('/wallet/owed/claim', {
      method: 'POST',
      body: { idempotencyKey },
    }),
};

export const useFinanceSummary = () => useMemberQuery(historyKeys.summary, historyApi.summary);
export const useHistoryTransactions = (f: HistoryTxFilters) =>
  useMemberQuery(historyKeys.transactions(f), () => historyApi.transactions(f), {
    keepPrevious: true,
  });
export const useFeeLines = (page: number) =>
  useMemberQuery(historyKeys.fees(page), () => historyApi.fees(page), { keepPrevious: true });
export const useHistoryEntries = (q: Partial<HistoryEntriesQuery>) =>
  useMemberQuery(historyKeys.entries(q), () => historyApi.entries(q), { keepPrevious: true });
export const useActiveRounds = () =>
  useMemberQuery(historyKeys.active, historyApi.active, { refetchMs: 30_000 });
export const useRoundResults = () => useMemberQuery(historyKeys.results, historyApi.results);
export const useWinnings = () => useMemberQuery(historyKeys.winnings, historyApi.winnings);
export const useGamesOverview = () => useMemberQuery(historyKeys.games, historyApi.games);
export const useGameRounds = (q: { game?: string; page?: number; from?: string; to?: string }) =>
  useMemberQuery(historyKeys.gameRounds(q), () => historyApi.gameRounds({ ...q, pageSize: 20 }), {
    keepPrevious: true,
  });
export const useFavourites = () => useMemberQuery(historyKeys.favourites, historyApi.favourites);

export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, on }: { slug: string; on: boolean }) =>
      on ? historyApi.addFavourite(slug) : historyApi.removeFavourite(slug),
    onSuccess: (data) => {
      qc.setQueryData(historyKeys.favourites, data);
      void qc.invalidateQueries({ queryKey: historyKeys.games });
    },
  });
}

/** Save a CSV string as a file (client only). */
export function saveCsv(csv: string, fileName: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
