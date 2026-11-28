'use client';

import * as React from 'react';

import { holdRealityCheck, requestRealityCheck } from '@/components/rg-history/reality-check';
import { ApiRequestError, newIdempotencyKey } from '@/lib/api/client';
import { classifyGameError, gameKeys, type GameError } from '@/lib/api/games';
import { rgApi } from '@/lib/api/rg-history';
import { useQueryClient } from '@tanstack/react-query';

export type BetPhase = 'idle' | 'placing' | 'reconnecting' | 'settled' | 'failed';

export interface BetRunnerState<B> {
  phase: BetPhase;
  /** Last settled bet. */
  result: B | null;
  error: GameError | null;
  /** Reconnect attempt (1-based) while `phase === 'reconnecting'`. */
  attempt: number;
  maxAttempts: number;
  /** When the server received the stake (first attempt time) — for the connection-lost notice. */
  sentAt: string | null;
}

export interface BetRunner<B> extends BetRunnerState<B> {
  /** Place one bet (one user intent = one idempotency key, reused on every retry). Resolves with the bet or null. */
  run: () => Promise<B | null>;
  /** Retry the held bet now (same key — the server never charges twice). */
  retryNow: () => void;
  reset: () => void;
  busy: boolean;
}

let lastBeat = 0;
/**
 * A settled bet is real play: send the RG activity heartbeat at most once a minute so the RG session (session time,
 * net this session, time limits) starts with the first bet instead of up to a minute later.
 */
function noteActivity(onDone: () => void): void {
  const now = Date.now();
  if (now - lastBeat < 60_000) return;
  lastBeat = now;
  void rgApi.heartbeat().then(onDone, () => undefined);
}

const RETRYABLE = (err: unknown) =>
  !(err instanceof ApiRequestError) || err.status >= 500 || err.status === 408;

/**
 * Generic bet runner for instant games (and the first request of stateful ones):
 * - one idempotency key per intent; network failures retry with the SAME key (DI-07 "Connection lost — roll held on
 *   the server": the bet settles server-side once and a retry replays the stored response);
 * - holds the reality-check reminder while the bet is in flight (reminders only between bets) and asks the RG host
 *   to show it when the server refuses a bet with 409 REALITY_CHECK_DUE;
 * - never retries a refusal (limits, balance, self-exclusion…) — those surface as `error`.
 */
export function useBetRunner<B>(
  send: (idempotencyKey: string) => Promise<B>,
  opts: { maxAttempts?: number; onSettled?: (bet: B) => void; onError?: (e: GameError) => void } = {},
): BetRunner<B> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const [state, setState] = React.useState<BetRunnerState<B>>({
    phase: 'idle',
    result: null,
    error: null,
    attempt: 0,
    maxAttempts,
    sentAt: null,
  });
  const sendRef = React.useRef(send);
  sendRef.current = send;
  const optsRef = React.useRef(opts);
  optsRef.current = opts;
  const wake = React.useRef<(() => void) | null>(null);
  const qc = useQueryClient();
  const inFlight = React.useRef(false);

  const run = React.useCallback(async (): Promise<B | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    const key = newIdempotencyKey();
    const release = holdRealityCheck();
    const sentAt = new Date().toISOString();
    setState((s) => ({ ...s, phase: 'placing', error: null, attempt: 0, sentAt }));
    try {
      for (let attempt = 1; ; attempt += 1) {
        try {
          const bet = await sendRef.current(key);
          setState((s) => ({ ...s, phase: 'settled', result: bet, error: null, attempt: 0 }));
          optsRef.current.onSettled?.(bet);
          noteActivity(() => void qc.invalidateQueries({ queryKey: gameKeys.credits }));
          return bet;
        } catch (err) {
          const ge = classifyGameError(err);
          if (!RETRYABLE(err) || attempt >= maxAttempts) {
            setState((s) => ({ ...s, phase: 'failed', error: ge, attempt: 0 }));
            if (ge.kind === 'reality_check') requestRealityCheck();
            optsRef.current.onError?.(ge);
            return null;
          }
          setState((s) => ({ ...s, phase: 'reconnecting', attempt: attempt + 1, error: ge }));
          await new Promise<void>((resolve) => {
            const t = window.setTimeout(resolve, Math.min(8000, 1000 * 2 ** (attempt - 1)));
            wake.current = () => {
              window.clearTimeout(t);
              resolve();
            };
          });
          wake.current = null;
        }
      }
    } finally {
      release();
      inFlight.current = false;
    }
  }, [maxAttempts, qc]);

  const retryNow = React.useCallback(() => wake.current?.(), []);
  const reset = React.useCallback(
    () => setState((s) => ({ ...s, phase: 'idle', error: null, attempt: 0 })),
    [],
  );

  return {
    ...state,
    run,
    retryNow,
    reset,
    busy: state.phase === 'placing' || state.phase === 'reconnecting',
  };
}
