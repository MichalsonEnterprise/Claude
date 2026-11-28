'use client';

/**
 * Games (P1) API wrappers + TanStack Query hooks over the shared `apiRequest()` client — see docs/GAMES.md.
 *
 * NON-MONETARY SIMULATION: every amount here is a DEMO credit decimal string ("DEMO credits · no cash value").
 * DEMO credits are never bought, withdrawn or converted to / from USDT and never touch the USDT ledger, wallet, pool
 * or fee ledgers. Bets carry no fee ("Fees 0.00"). Every bet write sends an `idempotencyKey` (one per user intent).
 *
 * Catalogue: `GET /games` (public). With the default `mock` data source the DEMO catalogue from @gp/shared/demo is
 * used and the published play block is derived from `@gp/shared/fair` (the same constants the API serves).
 * Member endpoints (credits, seeds, bets, verification) always call the API — there is no simulated play offline.
 */
import { DEMO_GAMES } from '@gp/shared/demo';
import {
  DEMO_CREDITS_CURRENCY,
  DEMO_CREDITS_LABEL,
  GAME_BET_FEE,
  fairGame,
  type FairGameKind,
  type FairGameMode,
} from '@gp/shared/fair';
import type { Game } from '@gp/shared/types';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { DATA_SOURCE, mockResolve } from '@/lib/data/source';

import { ApiRequestError, apiRequest, newIdempotencyKey } from './client';

// ── types (mirror apps/api/src/modules/games) ──────────────────────────────────────────────────

/** Published play block of an engine game (GET /games → `play`). */
export interface GamePlayInfo {
  playable: true;
  kind: FairGameKind;
  mode: FairGameMode;
  currency: typeof DEMO_CREDITS_CURRENCY;
  creditsLabel: string;
  fee: string;
  minBet: string;
  maxBet: string;
  tableMax: string | null;
  maxPayout: string | null;
  houseEdgePercent: string;
  rtpPercent: string;
  rulesVersion: string;
  rules: string[];
  provablyFair: true;
  realMoney: false;
}

export type CatalogueGame = Game & {
  isDemo?: boolean;
  realMoney?: false;
  /** `playable: false` = no engine yet ("Coming soon"). */
  play: GamePlayInfo | { playable: false };
};

export interface DemoPlaySummary {
  bets: number;
  wagered: string;
  returned: string;
  /** Signed decimal string (returned − wagered). */
  net: string;
}

/** GET /games/credits */
export interface DemoCreditsView {
  currency: 'DEMO';
  label: string;
  cashValue: false;
  isDemo: true;
  balance: string;
  startingBalance: string;
  fee: string;
  reset: {
    to: string;
    cooldownMinutes: number;
    lastResetAt: string | null;
    availableAt: string;
    available: boolean;
  };
  session: DemoPlaySummary & {
    startedAt: string | null;
    durationSeconds: number;
    today: DemoPlaySummary;
    realityCheck: { intervalMinutes: number; nextAt: string | null; due: boolean };
    blockedReason: 'daily_time_limit' | 'session_limit' | 'quiet_hours' | 'excluded' | null;
    currency: 'DEMO';
  };
  notice: string;
  /** POST /games/credits/reset only. */
  resetFrom?: string;
}

export interface SeedPairView {
  id: string;
  /** 'active' | 'finished'. */
  status: string;
  serverSeedHash: string;
  /** Revealed only after rotation. */
  serverSeed: string | null;
  clientSeed: string;
  /** Next nonce (= bets made with this pair). */
  nonce: number;
  bets: number;
  startedAt: string;
  endedAt: string | null;
}

/** GET /games/:slug/seeds */
export interface SeedsView {
  game: { slug: string; name: string };
  active: SeedPairView;
  revealed: SeedPairView[];
  howItWorks: string;
  isDemo: true;
}

/** POST /games/:slug/seeds/rotate · /seeds/client */
export interface SeedRotation {
  revealed: SeedPairView;
  active: SeedPairView;
}

/** Bet view (instant and stateful games). */
export interface GameBetView<
  P extends Record<string, unknown> = Record<string, unknown>,
  O extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  ref: string;
  game: { slug: string; name: string };
  status: 'active' | 'settled';
  stake: string;
  payout: string;
  net: string;
  multiplier: string | null;
  win: boolean | null;
  fee: string;
  params: P | null;
  outcome: O;
  fairness: {
    seedPairId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    revealed: boolean;
  };
  rulesVersion: string | null;
  currency: 'DEMO';
  createdAt: string;
  settledAt: string | null;
  isDemo: true;
  /** Balance after the bet (write responses only). */
  balance?: string;
  /** Idempotent replay of an earlier request with the same key. */
  replayed?: boolean;
}

/** GET /games/:slug/bets */
export interface GameBetsPage<B = GameBetView> {
  items: B[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: DemoPlaySummary;
  currency: 'DEMO';
  isDemo: true;
}

/** GET /games/bets/:id/verify */
export interface BetVerification {
  bet: GameBetView;
  verify: {
    game: string;
    rulesVersion: string;
    serverSeedHash: string;
    serverSeed: string | null;
    clientSeed: string;
    nonce: number;
    stake: string;
    params: Record<string, unknown>;
    stream: string;
    library: string;
  };
  revealed: boolean;
  commitmentValid: boolean | null;
  recomputed: Record<string, unknown> | null;
  matches: boolean | null;
  message: string;
  isDemo: true;
}

export interface PlaceBetInput {
  stake?: string;
  params: Record<string, unknown>;
  idempotencyKey: string;
}

// ── play block (mock catalogue) ─────────────────────────────────────────────────────────────────

/** The published play block for an engine game (identical to the API's `play`), or `{ playable: false }`. */
export function playInfoOf(slug: string): GamePlayInfo | { playable: false } {
  const info = fairGame(slug);
  if (!info) return { playable: false };
  return {
    playable: true,
    kind: info.kind,
    mode: info.mode,
    currency: DEMO_CREDITS_CURRENCY,
    creditsLabel: DEMO_CREDITS_LABEL,
    fee: GAME_BET_FEE,
    minBet: info.minBet,
    maxBet: info.maxBet,
    tableMax: info.tableMax ?? null,
    maxPayout: info.maxPayout ?? null,
    houseEdgePercent: info.houseEdgePercent,
    rtpPercent: info.rtpPercent,
    rulesVersion: info.rulesVersion,
    rules: info.rules,
    provablyFair: true,
    realMoney: false,
  };
}

function withPlay(g: Game & { isDemo?: boolean; play?: CatalogueGame['play'] }): CatalogueGame {
  return { ...g, play: g.play ?? playInfoOf(g.slug) };
}

// ── calls ─────────────────────────────────────────────────────────────────────────────────────

const enc = encodeURIComponent;

export const gamesApi = {
  catalogue: async (): Promise<CatalogueGame[]> =>
    DATA_SOURCE === 'api'
      ? (await apiRequest<CatalogueGame[]>('/games', { auth: 'none' })).map(withPlay)
      : (await mockResolve(DEMO_GAMES)).map(withPlay),
  game: async (slug: string): Promise<CatalogueGame | null> => {
    if (DATA_SOURCE !== 'api') {
      const g = DEMO_GAMES.find((x) => x.slug === slug);
      return g ? withPlay(structuredClone(g)) : null;
    }
    try {
      return withPlay(await apiRequest<CatalogueGame>(`/games/${enc(slug)}`, { auth: 'none' }));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) return null;
      throw err;
    }
  },
  credits: () => apiRequest<DemoCreditsView>('/games/credits'),
  resetCredits: (idempotencyKey = newIdempotencyKey()) =>
    apiRequest<DemoCreditsView>('/games/credits/reset', {
      method: 'POST',
      body: { idempotencyKey },
    }),
  seeds: (slug: string) => apiRequest<SeedsView>(`/games/${enc(slug)}/seeds`),
  rotateSeed: (slug: string) =>
    apiRequest<SeedRotation>(`/games/${enc(slug)}/seeds/rotate`, { method: 'POST', body: {} }),
  setClientSeed: (slug: string, clientSeed: string) =>
    apiRequest<SeedRotation>(`/games/${enc(slug)}/seeds/client`, {
      method: 'POST',
      body: { clientSeed },
    }),
  /** Instant bet. Always DEMO credits: the body never names another currency. */
  placeBet: <B extends GameBetView = GameBetView>(slug: string, input: PlaceBetInput) =>
    apiRequest<B>(`/games/${enc(slug)}/bets`, {
      method: 'POST',
      body: { ...input, currency: DEMO_CREDITS_CURRENCY },
    }),
  bets: <B = GameBetView>(slug: string, page = 1, pageSize = 20) =>
    apiRequest<GameBetsPage<B>>(`/games/${enc(slug)}/bets`, { query: { page, pageSize } }),
  bet: (id: string) => apiRequest<GameBetView>(`/games/bets/${enc(id)}`),
  verify: (id: string) => apiRequest<BetVerification>(`/games/bets/${enc(id)}/verify`),
};

// ── query keys ────────────────────────────────────────────────────────────────────────────────

export const gameKeys = {
  all: ['games-kit'] as const,
  catalogue: ['games-kit', 'catalogue'] as const,
  game: (slug: string) => ['games-kit', 'game', slug] as const,
  credits: ['games-kit', 'credits'] as const,
  seeds: (slug: string) => ['games-kit', 'seeds', slug] as const,
  bets: (slug: string) => ['games-kit', 'bets', slug] as const,
  betsPage: (slug: string, page: number, pageSize: number) =>
    ['games-kit', 'bets', slug, page, pageSize] as const,
  verify: (id: string) => ['games-kit', 'verify', id] as const,
};

// ── hooks ─────────────────────────────────────────────────────────────────────────────────────

export const useGameCatalogue = () =>
  useQuery({ queryKey: gameKeys.catalogue, queryFn: gamesApi.catalogue, staleTime: 60_000 });

export const useCatalogueGame = (slug: string) =>
  useQuery({ queryKey: gameKeys.game(slug), queryFn: () => gamesApi.game(slug), staleTime: 60_000 });

function useMember() {
  return useAuth().status === 'member';
}

/** DEMO credit balance + DEMO session summary (refreshed every 30 s while mounted). */
export function useDemoCredits() {
  const member = useMember();
  return useQuery({
    queryKey: gameKeys.credits,
    queryFn: gamesApi.credits,
    enabled: member,
    refetchInterval: 30_000,
  });
}

export function useSeeds(slug: string) {
  const member = useMember();
  return useQuery({ queryKey: gameKeys.seeds(slug), queryFn: () => gamesApi.seeds(slug), enabled: member });
}

export function useGameBets<B = GameBetView>(slug: string, page = 1, pageSize = 20) {
  const member = useMember();
  return useQuery({
    queryKey: gameKeys.betsPage(slug, page, pageSize),
    queryFn: () => gamesApi.bets<B>(slug, page, pageSize),
    enabled: member,
    placeholderData: keepPreviousData,
  });
}

export function useBetVerification(id: string | null) {
  const member = useMember();
  return useQuery({
    queryKey: gameKeys.verify(id ?? ''),
    queryFn: () => gamesApi.verify(id!),
    enabled: member && !!id,
  });
}

/** After any settled bet: patch the balance, bump the nonce, refresh history + session totals. */
export function applySettledBet(qc: QueryClient, slug: string, bet: GameBetView): void {
  if (bet.balance !== undefined) {
    qc.setQueryData<DemoCreditsView>(gameKeys.credits, (c) =>
      c ? { ...c, balance: bet.balance! } : c,
    );
  }
  qc.setQueryData<SeedsView>(gameKeys.seeds(slug), (s) =>
    s && s.active.id === bet.fairness.seedPairId && s.active.nonce <= bet.fairness.nonce
      ? { ...s, active: { ...s.active, nonce: bet.fairness.nonce + 1, bets: bet.fairness.nonce + 1 } }
      : s,
  );
  void qc.invalidateQueries({ queryKey: gameKeys.bets(slug) });
  void qc.invalidateQueries({ queryKey: gameKeys.credits });
}

/** Instant bet mutation (POST /games/:slug/bets). The caller owns the idempotency key (one per user intent). */
export function usePlaceBet<B extends GameBetView = GameBetView>(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceBetInput) => gamesApi.placeBet<B>(slug, input),
    onSuccess: (bet) => applySettledBet(qc, slug, bet),
    onError: (err) => {
      // A rejected bet may still have changed state elsewhere (another tab): resync the balance.
      if (err instanceof ApiRequestError && err.status !== 401) {
        void qc.invalidateQueries({ queryKey: gameKeys.credits });
      }
    },
  });
}

export function useResetCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gamesApi.resetCredits(),
    onSuccess: (view) => {
      qc.setQueryData(gameKeys.credits, view);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: gameKeys.credits }),
  });
}

export function useRotateSeed(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clientSeed?: string) =>
      clientSeed === undefined ? gamesApi.rotateSeed(slug) : gamesApi.setClientSeed(slug, clientSeed),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: gameKeys.seeds(slug) });
      void qc.invalidateQueries({ queryKey: gameKeys.bets(slug) });
      void qc.invalidateQueries({ queryKey: ['games-kit', 'verify'] });
    },
  });
}

// ── errors ────────────────────────────────────────────────────────────────────────────────────

export type GameErrorKind =
  | 'insufficient'
  | 'loss_limit'
  | 'time_limit'
  | 'self_excluded'
  | 'region'
  | 'real_money'
  | 'reality_check'
  | 'rate_limited'
  | 'bet_limits'
  | 'invalid'
  | 'round_in_progress'
  | 'conflict'
  | 'unauthenticated'
  | 'onboarding'
  | 'blocked'
  | 'network'
  | 'unknown';

export interface GameError {
  kind: GameErrorKind;
  message: string;
  details: Record<string, unknown>;
  requestId?: string;
}

/** Classify any error thrown by a games call into the states the kit renders (DI-07 and friends). */
export function classifyGameError(err: unknown): GameError {
  if (!(err instanceof ApiRequestError)) {
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return { kind: 'network', message, details: {} };
  }
  const d = err.details ?? {};
  const reason = typeof d.reason === 'string' ? d.reason : undefined;
  const base = { message: err.message, details: d, requestId: err.requestId };
  switch (err.code) {
    case 'INSUFFICIENT_FUNDS':
      return { kind: 'insufficient', ...base };
    case 'RG_LIMIT_EXCEEDED':
      return { kind: d.type === 'loss' ? 'loss_limit' : 'time_limit', ...base };
    case 'SELF_EXCLUDED':
      return { kind: 'self_excluded', ...base };
    case 'GEO_RESTRICTED':
      return { kind: 'region', ...base };
    case 'REAL_MONEY_DISABLED':
      return { kind: 'real_money', ...base };
    case 'RATE_LIMITED':
      return { kind: 'rate_limited', ...base };
    case 'UNAUTHENTICATED':
      return { kind: 'unauthenticated', ...base };
    case 'ONBOARDING_REQUIRED':
      return { kind: 'onboarding', ...base };
    case 'FORBIDDEN':
    case 'AGE_RESTRICTED':
      return { kind: 'blocked', ...base };
    case 'CONFLICT':
      if (reason === 'REALITY_CHECK_DUE') return { kind: 'reality_check', ...base };
      if (reason === 'ROUND_IN_PROGRESS') return { kind: 'round_in_progress', ...base };
      return { kind: 'conflict', ...base };
    case 'BAD_REQUEST':
    case 'VALIDATION_FAILED':
      if (reason === 'BET_BELOW_MIN' || reason === 'BET_ABOVE_MAX')
        return { kind: 'bet_limits', ...base };
      return { kind: 'invalid', ...base };
    default:
      if (err.status === 451) return { kind: 'region', ...base };
      if (err.status === 401) return { kind: 'unauthenticated', ...base };
      if (err.status >= 500) return { kind: 'network', ...base };
      return { kind: 'unknown', ...base };
  }
}
