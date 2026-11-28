/**
 * Orbit Rush (crash, decision #42) — pure display helpers, unit-tested. Every rule (crash point, curve, payout,
 * limits) comes from `@gp/shared/fair` (`crash.*`), the very module the API settles with; this file only formats and
 * derives published probabilities. Amounts are DEMO credit decimal strings (decimal.js — never JS floats).
 *
 * Published odds: P(crash ≥ m) = 0.99 ÷ m for every target m ≥ 1.01 (1.00 % house edge at every target; about 1 in
 * 100 rounds crashes instantly at 1.00×). Every round is independent — history never changes the odds.
 */
import { FAIR_GAMES, crash } from '@gp/shared/fair';
import { MoneyDecimal, formatAmount, money, roundDown, type Money } from '@gp/shared/money';

export const SLUG = 'orbit-rush';
export const INFO = FAIR_GAMES['orbit-rush'];
export const RULES = crash.CRASH_RULES;
export const HOUSE_EDGE = INFO.houseEdgePercent;
export const MIN_TARGET = RULES.minTarget;
export const MAX_TARGET = RULES.maxTarget;
export const MAX_MULTIPLIER = RULES.maxMultiplier;
/** Auto-play: max rounds per auto session (decision #42). */
export const AUTO_MAX_ROUNDS = 100;
/** Auto cash-out presets (CR-06). */
export const TARGET_PRESETS = ['1.50', '2.00', '3.00', '5.00', '10.00'] as const;
/** "High rollers" tab of the live bets list (real bets with a stake of at least this many DEMO credits). */
export const HIGH_ROLLER_STAKE = '100.00';

const TARGET_RE = /^\d{0,4}(\.\d{0,2})?$/;

/** Keep only a valid partial multiplier while typing ("2.", "10.5"; letters / 3rd decimal dropped). */
export function sanitizeTargetInput(raw: string): string {
  let v = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = v.indexOf('.');
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
  if (dot !== -1 && v.length - dot - 1 > 2) v = v.slice(0, dot + 3);
  if (/^0\d/.test(v)) v = v.replace(/^0+(?=\d)/, '');
  return TARGET_RE.test(v) ? v : v.slice(0, 7);
}

export type TargetProblem = 'empty' | 'format' | 'below' | 'above' | null;

/** Canonical 2-dp target ("2.00") or null; validation mirrors `crash.validateCrashTarget` on the server. */
export function parseTarget(value: string): string | null {
  const v = value.trim().replace(/\.$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const t = money(v);
  if (t.lt(MIN_TARGET) || t.gt(MAX_TARGET)) return null;
  return t.toFixed(2);
}

export function targetProblem(value: string): TargetProblem {
  const v = value.trim().replace(/\.$/, '');
  if (!v) return 'empty';
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return 'format';
  const t = money(v);
  if (t.lt(MIN_TARGET)) return 'below';
  if (t.gt(MAX_TARGET)) return 'above';
  return null;
}

export function targetProblemMessage(p: TargetProblem): string | null {
  switch (p) {
    case null:
      return null;
    case 'empty':
      return 'Enter a target, e.g. 2.00×.';
    case 'format':
      return 'A target looks like 2.00×.';
    case 'below':
      return `The lowest target is ${MIN_TARGET}×.`;
    case 'above':
      return `The highest target is ${formatAmount(MAX_TARGET)}×.`;
  }
}

/** P(crash ≥ m) as a decimal fraction: 1 for m ≤ 1.00, 0.99 ÷ m above (published, exact). */
export function reachProbability(m: string): Money {
  const x = money(m);
  if (x.lte(1)) return money(1);
  return money('0.99').div(x);
}

/** "49.50" — published win chance for an auto cash-out target (99 ÷ target %, truncated to 2 dp). */
export function winChancePercent(target: string): string {
  return roundDown(reachProbability(target).times(100), 2).toFixed(2);
}

/**
 * Chance that a RUNNING round showing `current` still reaches `target` (82.00 % from 1.64× to 2.00×):
 * P(crash ≥ target) ÷ P(crash ≥ current). Never above 100 %.
 */
export function chanceToReachPercent(current: string, target: string): string {
  const c = money(current);
  const t = money(target);
  if (t.lte(c)) return '100.00';
  // P(≥ t) ÷ P(≥ c) = (0.99 / t) ÷ (0.99 / c) = c / t for c ≥ 1.01; = 0.99 / t while the curve still shows 1.00×
  const p = (c.lt(MIN_TARGET) ? money('0.99') : c).times(100).div(t);
  return roundDown(MoneyDecimal.min(p, 100), 2).toFixed(2);
}

/** stake × multiplier truncated to 2 dp (display; the server truncates to 6 dp). */
export function payoutAt(stake: string, multiplier: string): string {
  return roundDown(money(stake).times(money(multiplier)), 2).toFixed(2);
}

/** payout − stake (2 dp, truncated), signed decimal string. */
export function profitAt(stake: string, multiplier: string): string {
  return money(payoutAt(stake, multiplier)).minus(money(stake)).toFixed(2);
}

/** "3.82×" with thousands separators ("1,000.00×"). */
export function fmtX(m: string | null | undefined): string {
  if (m === null || m === undefined || m === '') return '—';
  return `${formatAmount(m)}×`;
}

/** Median of crash points (decimal strings) — the lower middle for an even count (what the API does). */
export function medianOf(points: readonly string[]): string | null {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => money(a).cmp(money(b)));
  return money(sorted[Math.floor((sorted.length - 1) / 2)]!).toFixed(2);
}

export type PointTone = 'instant' | 'low' | 'mid' | 'high';

/** Pill tone of a crash point: 1.00× (instant) · < 2× · 2–10× · ≥ 10× (never colour alone — the value is the label). */
export function pointTone(m: string): PointTone {
  const x = money(m);
  if (x.lte(1)) return 'instant';
  if (x.lt(2)) return 'low';
  if (x.lt(10)) return 'mid';
  return 'high';
}

/** Short hash "8f3c1e9a…c2d6e813". */
export function shortHash(h: string | null | undefined, head = 8, tail = 8): string {
  if (!h) return '—';
  return h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`;
}

/** Initials for a live-bet avatar ("@orbit_77" → "OR"). */
export function initialsOf(player: string): string {
  const s = player.replace(/^@/, '').replace(/[^A-Za-z0-9]/g, '');
  return (s.slice(0, 2) || '··').toUpperCase();
}

/** Seconds with one decimal ("4.2"), never negative. */
export function secondsLeft(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return (Math.floor(s * 10) / 10).toFixed(1);
}

// ── curve geometry (display only) ─────────────────────────────────────────────────────────────

/** A "nice" axis maximum ≥ value: 2, 4, 6, 8, 10, 15, 20, 30, 50, 100, … (multiplier axis starts at 1.00×). */
export function niceAxisMax(value: number, minimum = 4): number {
  const v = Math.max(minimum, value);
  const steps = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 500) * 500;
}

/** Seconds axis maximum: 12 s, then grows in steps (14, 16, 20, 25, 30, 40, 50, 60, 90, 120 …). */
export function timeAxisMax(elapsedMs: number): number {
  const s = elapsedMs / 1000;
  const steps = [12, 14, 16, 20, 25, 30, 40, 50, 60, 75, 90, 120];
  return steps.find((x) => x >= s * 1.12) ?? Math.ceil((s * 1.12) / 30) * 30;
}

/** Tick values for the time axis (0, 2, 4 … or wider steps on long rounds). */
export function timeTicks(maxS: number): number[] {
  const step = maxS <= 14 ? 2 : maxS <= 30 ? 5 : maxS <= 60 ? 10 : 20;
  const out: number[] = [];
  for (let t = 0; t <= maxS + 1e-9; t += step) out.push(t);
  return out;
}

/** Multiplier ticks: 1.00× plus multiples of a "nice" step up to the axis max (1, 2, 3, 4 · 1, 5, 10, 15 …). */
export function multiplierTicks(maxM: number): number[] {
  const raw = (maxM - 1) / 3;
  const step = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 250, 500].find((s) => s >= raw) ?? 500;
  const out = [1];
  for (let v = Math.ceil(1.0001 / step) * step; v <= maxM + 1e-9; v += step) if (v > 1) out.push(Math.round(v * 100) / 100);
  return out;
}

/**
 * Curve samples (t in ms, multiplier string) from take-off to `elapsedMs`, on the server's own 100 ms frames — only
 * frames the server has already shown, so the drawing never runs ahead of the round.
 */
export function curveSamples(elapsedMs: number, max = 72): { t: number; m: string }[] {
  const frames = Math.max(0, Math.floor(elapsedMs / RULES.frameMs));
  const step = Math.max(1, Math.ceil(frames / max));
  const out: { t: number; m: string }[] = [];
  for (let f = 0; f <= frames; f += step) out.push({ t: f * RULES.frameMs, m: crash.multiplierAt(f * RULES.frameMs) });
  const last = frames * RULES.frameMs;
  if (!out.length || out[out.length - 1]!.t !== last) out.push({ t: last, m: crash.multiplierAt(last) });
  return out;
}

/** Time (ms after take-off) at which the curve first shows `m` (shared maths). */
export const timeAt = (m: string): number => crash.timeToReachMs(m);

// ── browser verification (CR-07) ─────────────────────────────────────────────────────────────

export interface RoundCheck {
  /** sha256(seed) equals the commitment published before betting opened. */
  commitmentOk: boolean;
  /** Hashing the seed `chain.index` times reaches the published chain commitment. */
  chainOk: boolean;
  /** Crash point recomputed with the shared maths (null for an unusable seed). */
  computed: { crashPoint: string; instant: boolean } | null;
  hash: string;
}

/**
 * Re-derive a crashed round in the browser with the exact shared maths the API settles with (`crash.*` from
 * @gp/shared/fair — no duplicated formulas): commitment, hash-chain position and crash point.
 */
export function verifyRoundInBrowser(
  seed: string,
  v: { round: { commitment: string }; chain: { salt: string; index: number; commitment: string } },
): RoundCheck {
  const clean = seed.trim().toLowerCase();
  const hash = crash.crashCommitment(clean);
  let computed: RoundCheck['computed'] = null;
  try {
    computed = clean ? crash.crashPointOf(clean, v.chain.salt) : null;
  } catch {
    computed = null;
  }
  return {
    hash,
    commitmentOk: hash === v.round.commitment,
    chainOk: /^[0-9a-f]{64}$/.test(clean) && crash.verifyChainSeed(clean, v.chain.index, v.chain.commitment),
    computed,
  };
}
