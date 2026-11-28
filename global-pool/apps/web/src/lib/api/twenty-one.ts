'use client';

/**
 * Twenty-One (blackjack, key "blackjack") API wrappers + TanStack hooks over the shared `apiRequest()` client —
 * docs/GAMES.md §5. NON-MONETARY SIMULATION: every amount is a DEMO credit decimal string ("DEMO credits · no cash
 * value"); hands never touch USDT, the wallet, the pool or fee ledgers. Fees 0.00. Every write carries an
 * `idempotencyKey` (one per player intent — a deal or one decision — reused on every retry).
 *
 * The hand is held on the server: the dealer's hole card stays `null` in `round` until the hand is settled, and the
 * whole 312-card shoe is fixed by the seed pair + nonce when the hand is dealt (re-created in the verifier).
 */
import type { BjActionType, BjHand, BjResult, BjState } from '@gp/shared/fair';
import { DEMO_CREDITS_CURRENCY } from '@gp/shared/fair';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';

import { apiRequest } from './client';
import { gameKeys, type GameBetView, type GameBetsFilters, type GameBetsPage } from './games';

export const BJ_SLUG = 'twenty-one';

/** A hand of the public round view (`round.hands[]`). */
export interface BjHandView extends BjHand {
  total: number;
  soft: boolean;
}

/** Public state of an open (or just settled) hand — the hole card is `null` until the hand is settled. */
export interface BjRoundView {
  phase: 'insurance' | 'player' | 'settled';
  dealer: { cards: (string | null)[]; total: number; soft: boolean; blackjack: boolean | null };
  hands: BjHandView[];
  active: number;
  allowedActions: BjActionType[];
  insurance: { taken: boolean | null; stake: string; payout: string } | null;
  baseStake: string;
  totalStake: string;
  totalPayout: string;
  cardsDealt: number;
  decks: number;
}

/** Settled outcome as stored (the full state + the player's actions, input of the verifier). */
export type BjOutcome = Partial<BjState> & { actions?: { type: BjActionType; accept?: boolean }[] };

/** Bet view of a hand. Write responses (deal / action / current) add `round` and `balance`. */
export type BjBetView = GameBetView<{ decks?: number }, BjOutcome> & {
  round?: BjRoundView;
  balance?: string;
};

/** Values of the `outcome` filter (GET /games/:slug/bets, additive — see apps/api bets.service). */
export type BjOutcomeFilter = 'win' | 'lose' | 'push' | 'blackjack' | 'bust' | 'split_double';

export interface BjHandsFilters extends GameBetsFilters {
  outcome?: BjOutcomeFilter;
}

export type BjHandsPage = GameBetsPage<BjBetView> & {
  summary: GameBetsPage['summary'] & { outcomes?: { win: number; lose: number; push: number } };
};

export type BjDecision =
  | { action: 'hit' | 'stand' | 'double' | 'split' }
  | { action: 'insurance'; accept: boolean };

export const twentyOneApi = {
  /** GET /games/twenty-one/hands/current — the open hand (reconnect / recovery) or null. */
  current: async (): Promise<BjBetView | null> => {
    const res = await apiRequest<{ active: BjBetView | null } | BjBetView | null>(
      `/games/${BJ_SLUG}/hands/current`,
    );
    if (res && typeof res === 'object' && 'active' in res) return res.active;
    return (res) ?? null;
  },
  /** POST /games/twenty-one/hands — deal a new hand (may settle at once: naturals / dealer blackjack). */
  deal: (stake: string, idempotencyKey: string) =>
    apiRequest<BjBetView>(`/games/${BJ_SLUG}/hands`, {
      method: 'POST',
      body: { stake, currency: DEMO_CREDITS_CURRENCY, idempotencyKey },
    }),
  /** POST /games/twenty-one/hands/:id/action — one decision (legal actions only; the server re-checks). */
  act: (id: string, decision: BjDecision, idempotencyKey: string) =>
    apiRequest<BjBetView>(`/games/${BJ_SLUG}/hands/${encodeURIComponent(id)}/action`, {
      method: 'POST',
      body: { ...decision, idempotencyKey },
    }),
  /** GET /games/twenty-one/bets with the Twenty-One filters. */
  hands: (page: number, pageSize: number, filters?: BjHandsFilters) =>
    apiRequest<BjHandsPage>(`/games/${BJ_SLUG}/bets`, {
      query: { page, pageSize, ...(filters ?? {}) },
    }),
};

export const twentyOneKeys = {
  current: ['games-kit', 'twenty-one', 'current'] as const,
  /** Under `gameKeys.bets(slug)` so every settled hand (applySettledBet) refreshes the history pages too. */
  hands: (page: number, pageSize: number, filters?: BjHandsFilters) =>
    [...gameKeys.bets(BJ_SLUG), 'hands', page, pageSize, filters ?? {}] as const,
};

export function useBjCurrent() {
  const member = useAuth().status === 'member';
  return useQuery({
    queryKey: twentyOneKeys.current,
    queryFn: twentyOneApi.current,
    enabled: member,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useBjHands(page: number, pageSize: number, filters?: BjHandsFilters) {
  const member = useAuth().status === 'member';
  return useQuery({
    queryKey: twentyOneKeys.hands(page, pageSize, filters),
    queryFn: () => twentyOneApi.hands(page, pageSize, filters),
    enabled: member,
    placeholderData: keepPreviousData,
  });
}

export type { BjResult };
