/**
 * Global Pool round rules: thresholds, prize distribution and odds disclosure.
 * Outcomes come only from verifiable randomness (Chainlink VRF v2.5); nothing here selects winners.
 */
import type { PrizeTier } from './enums';
import { ENTRY_PRICE, PLATFORM_FEE_PER_ENTRY } from './fees';
import {
  MoneyDecimal,
  gte,
  money,
  mul,
  percentOf,
  roundDown,
  sub,
  sum,
  toUSDTString,
  type MoneyInput,
} from './money';

/** A round only draws when BOTH thresholds are met; otherwise it is cancelled and entries go to Owed. */
export const ROUND_THRESHOLDS = Object.freeze({
  minParticipants: 500,
  minPool: '50000.00',
});

export interface PrizeTierRule {
  tier: PrizeTier;
  label: string;
  /** Share of the pool per winner, in percent. */
  sharePercent: string;
  winners: number;
}

/** 1st 50% · 2nd 20% · 3rd 10% · 10 × runner-up 2% = 100%. */
export const PRIZE_DISTRIBUTION: readonly PrizeTierRule[] = Object.freeze([
  { tier: 'first', label: '1st prize', sharePercent: '50', winners: 1 },
  { tier: 'second', label: '2nd prize', sharePercent: '20', winners: 1 },
  { tier: 'third', label: '3rd prize', sharePercent: '10', winners: 1 },
  { tier: 'runner_up', label: 'Runner-up', sharePercent: '2', winners: 10 },
]);

/** Number of prizes per round (13). */
export const PRIZES_PER_ROUND = PRIZE_DISTRIBUTION.reduce((n, t) => n + t.winners, 0);

export interface PrizeTierAmount extends PrizeTierRule {
  /** Prize per winner (rounded down to 6 dp). */
  amountEach: string;
  /** amountEach × winners. */
  amountTotal: string;
}

export interface PrizeBreakdown {
  pool: string;
  tiers: PrizeTierAmount[];
  /** Σ amountTotal. */
  totalPaid: string;
  /** pool − totalPaid: rounding dust (0 for 2-dp pools). Its destination is a business rule for the API. */
  remainder: string;
}

/** Split a pool balance into prizes. Exact decimal math; per-winner amounts are rounded DOWN to 6 dp. */
export function prizeBreakdown(pool: MoneyInput): PrizeBreakdown {
  const tiers = PRIZE_DISTRIBUTION.map((t) => {
    const each = roundDown(percentOf(pool, t.sharePercent));
    return {
      ...t,
      amountEach: toUSDTString(each),
      amountTotal: toUSDTString(mul(each, t.winners)),
    };
  });
  const totalPaid = sum(tiers.map((t) => t.amountTotal));
  return {
    pool: toUSDTString(pool),
    tiers,
    totalPaid: toUSDTString(totalPaid),
    remainder: toUSDTString(sub(pool, totalPaid)),
  };
}

/** Pool balance for a number of entries (entries × 10.00). */
export const poolForEntries = (entries: number): string => toUSDTString(mul(ENTRY_PRICE, entries));
/** Platform fees for a number of entries (entries × 0.05) — never part of the pool. */
export const feesForEntries = (entries: number): string =>
  toUSDTString(mul(PLATFORM_FEE_PER_ENTRY, entries));

export function meetsThreshold(input: { participants: number; poolBalance: MoneyInput }): boolean {
  return (
    input.participants >= ROUND_THRESHOLDS.minParticipants &&
    gte(input.poolBalance, ROUND_THRESHOLDS.minPool)
  );
}

export interface OddsDisclosure {
  myEntries: number;
  totalEntries: number;
  prizes: number;
  /** P(at least one prize), exact — prizes drawn from distinct entries without replacement. Percent string. */
  anyPrizePercent: string;
  /** Upper-bound approximation myEntries × prizes / totalEntries (the figure used in the design sheet). */
  anyPrizeApproxPercent: string;
  /** P(1st prize) = myEntries / totalEntries. Percent string. */
  firstPrizePercent: string;
}

/**
 * Odds disclosure for a player's entries (percent strings rounded DOWN to `decimals`). Assumes each prize is drawn from a distinct entry, uniformly from the
 * entries remaining (the selection algorithm in apps/api must match this to keep the disclosure honest).
 * @example oddsDisclosure(35, 18640) // anyPrizePercent ≈ '2.41', anyPrizeApproxPercent '2.44', firstPrizePercent '0.187'
 */
export function oddsDisclosure(
  myEntries: number,
  totalEntries: number,
  prizes: number = PRIZES_PER_ROUND,
  decimals = 3,
): OddsDisclosure {
  for (const [name, v] of [
    ['myEntries', myEntries],
    ['totalEntries', totalEntries],
    ['prizes', prizes],
  ] as const) {
    if (!Number.isSafeInteger(v) || v < 0)
      throw new RangeError(`${name} must be a non-negative integer`);
  }
  if (myEntries > totalEntries) throw new RangeError('myEntries cannot exceed totalEntries');
  const n = Math.min(prizes, totalEntries);
  // P(no prize) = Π_{i=0}^{n-1} (N − m − i) / (N − i)
  let pNone = new MoneyDecimal(1);
  for (let i = 0; i < n; i++) {
    const num = totalEntries - myEntries - i;
    if (num <= 0) {
      pNone = new MoneyDecimal(0);
      break;
    }
    pNone = pNone.times(num).div(totalEntries - i);
  }
  // Rounded DOWN: a disclosed chance is never overstated (owner rule). Callers that round again for display
  // should ask for more decimals (e.g. 6) so they never round an already rounded value.
  const pct = (x: MoneyInput) =>
    money(x).times(100).toDecimalPlaces(decimals, MoneyDecimal.ROUND_DOWN).toFixed();
  const total = totalEntries === 0 ? 1 : totalEntries;
  return {
    myEntries,
    totalEntries,
    prizes: n,
    anyPrizePercent: totalEntries === 0 ? '0' : pct(new MoneyDecimal(1).minus(pNone)),
    anyPrizeApproxPercent: pct(
      MoneyDecimal.min(1, new MoneyDecimal(myEntries).times(n).div(total)),
    ),
    firstPrizePercent: pct(new MoneyDecimal(myEntries).div(total)),
  };
}

/**
 * Display rule for a disclosed chance (percent string in, percent digits out — no floats): ROUNDED DOWN, so a shown
 * chance is never overstated, with 2 decimals from 1 %, 3 from 0.1 % and 4 below. Pass the 6-decimal disclosure.
 * @example displayOddsPercent('0.187768') // '0.187' · displayOddsPercent('66.666666') // '66.66'
 */
export function displayOddsPercent(percent: MoneyInput): string {
  const d = money(percent);
  const places = d.gte(1) ? 2 : d.gte('0.1') ? 3 : 4;
  return d.toDecimalPlaces(places, MoneyDecimal.ROUND_DOWN).toFixed(places);
}
