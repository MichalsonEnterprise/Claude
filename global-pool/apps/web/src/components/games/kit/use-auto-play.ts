'use client';

import { money } from '@gp/shared/money';
import * as React from 'react';

import {
  autoPlayProblems,
  nextAutoBet,
  type AutoPlayConfig,
  type AutoPlayProgress,
  type AutoStopReason,
} from './autoplay';

export interface AutoPlayState {
  running: boolean;
  config: AutoPlayConfig | null;
  progress: AutoPlayProgress;
  stopped: AutoStopReason | null;
}

/**
 * Drives auto-play with the pure rules in ./autoplay.ts. `placeOne(stake)` places ONE ordinary bet and resolves with
 * its signed net (`payout − stake`), `{ stop: 'reality_check' }` when a reality check is due, or null when the bet was
 * not accepted (limit, balance, error).
 * `gapMs` = pause between rounds (lets the result show; 0 under reduced motion is fine).
 */
export function useAutoPlay(
  placeOne: (stake: string) => Promise<{ net: string } | { stop: AutoStopReason } | null>,
  gapMs = 900,
) {
  const [state, setState] = React.useState<AutoPlayState>({
    running: false,
    config: null,
    progress: { placed: 0, net: '0.00' },
    stopped: null,
  });
  const stopFlag = React.useRef(false);
  const placeRef = React.useRef(placeOne);
  placeRef.current = placeOne;

  const stop = React.useCallback((reason: AutoStopReason = 'stopped') => {
    stopFlag.current = true;
    setState((s) => (s.running ? { ...s, running: false, stopped: reason } : s));
  }, []);

  // Leaving the tab stops auto-play (no unattended play).
  React.useEffect(() => {
    if (!state.running) return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop('hidden');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [state.running, stop]);

  React.useEffect(() => () => void (stopFlag.current = true), []);

  const start = React.useCallback(
    async (config: AutoPlayConfig) => {
      if (autoPlayProblems(config).length) return;
      stopFlag.current = false;
      let progress: AutoPlayProgress = { placed: 0, net: '0.00' };
      setState({ running: true, config, progress, stopped: null });
      for (;;) {
        if (stopFlag.current) return;
        const d = nextAutoBet(config, progress);
        if (!d.go) {
          stopFlag.current = true;
          setState((s) => ({ ...s, running: false, stopped: d.reason, progress }));
          return;
        }
        const res = await placeRef.current(d.stake);
        if (stopFlag.current) return;
        if (!res || 'stop' in res) {
          stopFlag.current = true;
          const reason = res && 'stop' in res ? res.stop : 'error';
          setState((s) => ({ ...s, running: false, stopped: reason, progress }));
          return;
        }
        progress = {
          placed: progress.placed + 1,
          net: money(progress.net).plus(money(res.net)).toFixed(2),
        };
        setState((s) => ({ ...s, progress }));
        if (gapMs > 0) await new Promise((r) => window.setTimeout(r, gapMs));
      }
    },
    [gapMs],
  );

  return { ...state, start, stop };
}
