/**
 * Auto-play rules (pure, unit-tested). Auto-play is a client feature; every round it places is an ordinary bet that
 * passes all server checks (limits, self-exclusion, a due reality check stops it).
 *
 * Guardrails (owner instruction):
 * - it needs an UNTICKED confirmation and a stop-loss before it can start;
 * - the stake is CONSTANT: auto-play never raises the bet after a loss (no martingale / "recover your losses");
 * - it stops before a bet that could take the run past the stop-loss, at the bet count, at the optional profit target,
 *   on any error, when a reality check is due and when the tab is hidden.
 */
import { money } from '@gp/shared/money';

export const AUTO_PLAY_MAX_BETS = 100;

export interface AutoPlayConfig {
  /** Constant stake for every round (decimal string). */
  stake: string;
  /** Number of bets (1 … AUTO_PLAY_MAX_BETS). */
  bets: number;
  /** Required: stop once the run has lost this much (decimal string > 0). */
  stopLoss: string;
  /** Optional: stop once the run is up by this much. */
  stopProfit: string | null;
}

export interface AutoPlayProgress {
  placed: number;
  /** Signed net of the run so far (returned − staked). */
  net: string;
}

export type AutoStopReason =
  | 'completed'
  | 'stop_loss'
  | 'stop_profit'
  | 'stopped'
  | 'error'
  | 'reality_check'
  | 'hidden';

export type AutoPlayDecision = { go: true; stake: string } | { go: false; reason: AutoStopReason };

const positive = (v: string | null | undefined): boolean => {
  if (!v) return false;
  try {
    return money(v).gt(0);
  } catch {
    return false;
  }
};

/** Problems that block starting auto-play (empty = OK). The confirmation box is checked by the UI. */
export function autoPlayProblems(cfg: Partial<AutoPlayConfig>): string[] {
  const out: string[] = [];
  if (!positive(cfg.stake)) out.push('Set a bet amount first.');
  if (!Number.isInteger(cfg.bets) || (cfg.bets ?? 0) < 1 || (cfg.bets ?? 0) > AUTO_PLAY_MAX_BETS)
    out.push(`Choose 1–${AUTO_PLAY_MAX_BETS} bets.`);
  if (!positive(cfg.stopLoss)) out.push('A stop-loss is required.');
  else if (positive(cfg.stake) && money(cfg.stopLoss!).lt(money(cfg.stake!)))
    out.push('The stop-loss must be at least one bet.');
  if (cfg.stopProfit && !positive(cfg.stopProfit)) out.push('Stop on profit must be above 0.');
  return out;
}

/** What to do before the next round. The stake is always `cfg.stake` — it never grows after a loss. */
export function nextAutoBet(cfg: AutoPlayConfig, progress: AutoPlayProgress): AutoPlayDecision {
  if (progress.placed >= cfg.bets) return { go: false, reason: 'completed' };
  const net = money(progress.net);
  if (cfg.stopProfit && net.gte(money(cfg.stopProfit))) return { go: false, reason: 'stop_profit' };
  // Losing the next stake must not take the run past the stop-loss.
  if (net.negated().plus(money(cfg.stake)).gt(money(cfg.stopLoss)))
    return { go: false, reason: 'stop_loss' };
  return { go: true, stake: cfg.stake };
}

export function autoStopMessage(reason: AutoStopReason): string {
  switch (reason) {
    case 'completed':
      return 'Auto-play finished all bets.';
    case 'stop_loss':
      return 'Auto-play stopped at your stop-loss.';
    case 'stop_profit':
      return 'Auto-play stopped at your profit target.';
    case 'stopped':
      return 'Auto-play stopped.';
    case 'error':
      return 'Auto-play stopped because a bet was not accepted.';
    case 'reality_check':
      return 'Auto-play stopped for your reality check.';
    case 'hidden':
      return 'Auto-play stopped because you left the page.';
  }
}
