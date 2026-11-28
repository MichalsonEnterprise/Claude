/**
 * Double Side (coinflip) display helpers — pure, unit-tested. The OUTCOME itself always comes from the server (and is
 * re-derived in the browser with @gp/shared/fair); nothing here decides a side. Amounts use decimal.js
 * (@gp/shared/money), never JS floats.
 */
import {
  coinflip,
  fairGame,
  type CoinSide,
  type CoinflipOutcome,
  type CoinflipParams,
} from '@gp/shared/fair';
import { MoneyDecimal, money } from '@gp/shared/money';

import type { GameBetView } from '@/lib/api/games';

export const SLUG = 'double-side';
export const INFO = fairGame(SLUG)!;
/** Published payout multiplier (1.96×) and house edge (2.00 %) — identical for every player and both sides. */
export const MULTIPLIER = coinflip.COINFLIP_RULES.multiplier;
export const HOUSE_EDGE = coinflip.COINFLIP_RULES.houseEdgePercent;
/** 50.00 % for Heads and for Tails. */
export const WIN_CHANCE = '50.00';
/** 2³² — the first 4 HMAC bytes are scaled by it (CF-05 "Scale" step). */
export const TWO_POW_32 = '4294967296';

export type CoinflipBet = GameBetView<
  Record<string, unknown> & CoinflipParams,
  Record<string, unknown> & CoinflipOutcome
>;

export const SIDES: readonly CoinSide[] = ['heads', 'tails'];
export const sideLabel = (s: CoinSide): string => (s === 'heads' ? 'Heads' : 'Tails');
export const other = (s: CoinSide): CoinSide => (s === 'heads' ? 'tails' : 'heads');

/** First 4 bytes as hex, e.g. 0x3a91c0f2. */
export function u32Hex(u32: number): string {
  return `0x${(u32 >>> 0).toString(16).padStart(8, '0')}`;
}

/** x = u32 ÷ 2³², truncated to `dp` decimals (display only — the side is decided by u32 < 2³¹ exactly). */
export function u32Fraction(u32: number, dp = 4): string {
  return money(u32).div(money(TWO_POW_32)).toDecimalPlaces(dp, MoneyDecimal.ROUND_DOWN).toFixed(dp);
}

/** The published mapping: Heads iff u32 < 2³¹ (x < 0.5). */
export function sideOfU32(u32: number): CoinSide {
  return u32 < 2_147_483_648 ? 'heads' : 'tails';
}

/** "0.2288 → below 0.5000 → Heads" */
export function mappingLine(u32: number): string {
  const side = sideOfU32(u32);
  return `${u32Fraction(u32)} → ${side === 'heads' ? 'below' : 'at or above'} 0.5000 → ${sideLabel(side)}`;
}

/** Heads / Tails counts of a list of settled flips (a record, not a pattern). */
export function landedCounts(sides: readonly CoinSide[]): { heads: number; tails: number } {
  let heads = 0;
  for (const s of sides) if (s === 'heads') heads += 1;
  return { heads, tails: sides.length - heads };
}

export type FlipPeriod = 'today' | '7d' | '30d' | 'all';

/** ISO lower bound of a history period (UTC); undefined = all time. */
export function periodFrom(period: FlipPeriod, now: Date = new Date()): string | undefined {
  switch (period) {
    case 'today':
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      ).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 86_400_000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 86_400_000).toISOString();
    case 'all':
      return undefined;
  }
}

/** Accepts "CF-52107", "cf52107", "52107" or a nonce "418" → the API's `search`; null when not a valid query. */
export function normaliseFlipSearch(text: string): string | null {
  const v = text.trim().toUpperCase().replace(/\s+/g, '');
  if (!v) return null;
  const m = /^(?:CF-?)?(\d{1,9})$/.exec(v);
  if (!m) return null;
  return /^CF/.test(v) ? `CF-${m[1]}` : m[1]!;
}

/** Payout on a win for a stake (2 dp, truncated) — e.g. 10.00 → 19.60. */
export function payoutOnWin(stake: string): string {
  return money(stake)
    .times(money(MULTIPLIER))
    .toDecimalPlaces(2, MoneyDecimal.ROUND_DOWN)
    .toFixed(2);
}

/** Short summary of a settled flip: "Picked Heads · landed Tails". */
export function flipSummary(o: Pick<CoinflipOutcome, 'pick' | 'side'>): string {
  return `Picked ${sideLabel(o.pick)} · landed ${sideLabel(o.side)}`;
}

/** Verifier one-liner ("x = 0.2288 → Heads · picked Heads → Win · 1.96×"). */
export function describeFlipOutcome(o: Record<string, unknown>): string {
  const c = o as Partial<CoinflipOutcome>;
  if (typeof c.u32 !== 'number' || (c.side !== 'heads' && c.side !== 'tails'))
    return JSON.stringify(o);
  const pick = c.pick === 'heads' || c.pick === 'tails' ? ` · picked ${sideLabel(c.pick)}` : '';
  const win = typeof c.win === 'boolean' ? ` → ${c.win ? `Win · ${MULTIPLIER}×` : 'Lose'}` : '';
  return `x = ${u32Fraction(c.u32)} → ${sideLabel(c.side)}${pick}${win}`;
}

/**
 * Angle (deg, rotateY) the coin lands on: at least `halfTurns` half-turns past `from` and showing `side`
 * (heads = 0 mod 360, tails = 180 mod 360). The spin length never depends on whether the player won — only on where
 * the coin starts and the side the SERVER settled (no near-miss staging).
 */
export function landingAngle(from: number, side: CoinSide, halfTurns = 6): number {
  const base = from + halfTurns * 180;
  const mod = ((base % 360) + 360) % 360;
  const want = side === 'heads' ? 0 : 180;
  return base + ((want - mod + 360) % 360);
}

/** Nearest angle ≥ `from` that shows `side` (quick turn when the player switches pick). */
export function faceAngle(from: number, side: CoinSide): number {
  const mod = ((from % 360) + 360) % 360;
  const want = side === 'heads' ? 0 : 180;
  return from + ((want - mod + 360) % 360);
}
