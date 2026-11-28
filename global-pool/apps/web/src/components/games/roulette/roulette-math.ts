/**
 * Pool Roulette (RL-01…RL-09) — pure table helpers for the web: spots, the bet slip, previews and felt geometry.
 * NON-MONETARY SIMULATION: every amount is a DEMO credit decimal string (no cash value). Amounts use decimal.js via
 * @gp/shared/money — never JS floats. What a bet covers and what it pays come from the SAME shared rule module the
 * API settles with (`roulette.coveredNumbers`, `ROULETTE_PAYOUTS`), so the slip can never disagree with the server.
 */
import { roulette, type RouletteBet, type RouletteBetType } from '@gp/shared/fair';
import { MoneyDecimal, formatAmount, money, type Money } from '@gp/shared/money';

const { ROULETTE_PAYOUTS, ROULETTE_RULES, coveredNumbers, pocketColor } = roulette;

export const RULES = ROULETTE_RULES;
export const PAYOUTS = ROULETTE_PAYOUTS;
export const POCKETS = ROULETTE_RULES.pockets;

/** European wheel order, clockwise from 0. */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26,
];

export type PocketColor = 'red' | 'black' | 'green';
export const colorOf = (n: number): PocketColor => pocketColor(n);

// ── chips ──────────────────────────────────────────────────────────────────────────────────────

export interface ChipDef {
  /** Canonical DEMO credit amount (2 dp). */
  value: string;
  /** Face label. */
  label: string;
  tone: 'grey' | 'white' | 'red' | 'sky' | 'green' | 'black' | 'violet';
}

/** Game/Chip denominations (Figma 23:12227): 0.10 · 1 · 5 · 10 · 25 · 100 · 500. */
export const CHIPS: readonly ChipDef[] = [
  { value: '0.10', label: '0.10', tone: 'grey' },
  { value: '1.00', label: '1', tone: 'white' },
  { value: '5.00', label: '5', tone: 'red' },
  { value: '10.00', label: '10', tone: 'sky' },
  { value: '25.00', label: '25', tone: 'green' },
  { value: '100.00', label: '100', tone: 'black' },
  { value: '500.00', label: '500', tone: 'violet' },
];

/** The largest chip whose value is ≤ the amount (for the chip drawn on a spot). */
export function chipFor(amount: string): ChipDef {
  const a = money(amount);
  let best = CHIPS[0]!;
  for (const c of CHIPS) if (money(c.value).lte(a)) best = c;
  return best;
}

/** Compact amount on a chip face: 5 · 12.50 · 1.2k. */
export function chipFace(amount: string): string {
  const a = money(amount);
  if (a.gte(1000)) return `${a.div(1000).toDecimalPlaces(1, 1).toString()}k`;
  return a.isInteger() ? a.toFixed(0) : a.toFixed(2);
}

// ── spots ──────────────────────────────────────────────────────────────────────────────────────

/** A place on the table (a bet without its amount). */
export interface Spot {
  type: RouletteBetType;
  /** Inside bets: covered numbers. Dozen / column: [1 | 2 | 3]. Even-money: omitted. */
  numbers?: number[];
}

export const OUTSIDE_TYPES: ReadonlySet<RouletteBetType> = new Set([
  'dozen',
  'column',
  'red',
  'black',
  'odd',
  'even',
  'low',
  'high',
]);
export const isOutside = (s: Spot) => OUTSIDE_TYPES.has(s.type);

/** Canonical spot key — the same identity the server uses to refuse duplicate spots. */
export function spotKey(s: Spot): string {
  const ns = s.numbers ? [...s.numbers].sort((a, b) => a - b) : [];
  return ns.length ? `${s.type}:${ns.join('-')}` : s.type;
}

/** Valid on the standard layout (checked with the shared rule module). */
export function isValidSpot(s: Spot): boolean {
  try {
    coveredNumbers({ type: s.type, numbers: s.numbers });
    return true;
  } catch {
    return false;
  }
}

export function covers(s: Spot): number[] {
  return coveredNumbers({ type: s.type, numbers: s.numbers });
}

const ORD = ['1st', '2nd', '3rd'] as const;
const sorted = (ns: number[] = []) => [...ns].sort((a, b) => a - b);

/** Human name of a spot: "Straight · 19", "Split · 17 | 20", "Dozen · 13–24", "Red". */
export function spotLabel(s: Spot): string {
  const ns = sorted(s.numbers);
  switch (s.type) {
    case 'straight':
      return `Straight · ${ns[0]}`;
    case 'split':
      return `Split · ${ns.join(' | ')}`;
    case 'street':
      return ns[0] === 0 ? `Trio · ${ns.join(' · ')}` : `Street · ${ns[0]}–${ns[2]}`;
    case 'corner':
      return ns[0] === 0 ? 'First four · 0–3' : `Corner · ${ns.join(' · ')}`;
    case 'line':
      return `Line · ${ns[0]}–${ns[5]}`;
    case 'dozen': {
      const d = ns[0] ?? 1;
      return `Dozen · ${12 * d - 11}–${12 * d}`;
    }
    case 'column':
      return `Column · ${ORD[(ns[0] ?? 1) - 1]}`;
    case 'red':
      return 'Red';
    case 'black':
      return 'Black';
    case 'odd':
      return 'Odd';
    case 'even':
      return 'Even';
    case 'low':
      return '1–18';
    case 'high':
      return '19–36';
  }
}

/** Short name for history rows ("Straight 19", "Red", "2nd dozen"). */
export function spotShort(s: Spot): string {
  const ns = sorted(s.numbers);
  switch (s.type) {
    case 'straight':
      return `Straight ${ns[0]}`;
    case 'split':
      return `Split ${ns.join(' | ')}`;
    case 'street':
      return ns[0] === 0 ? `Trio ${ns.join('-')}` : `Street ${ns[0]}–${ns[2]}`;
    case 'corner':
      return ns[0] === 0 ? 'First four' : `Corner ${ns[0]}–${ns[3]}`;
    case 'line':
      return `Line ${ns[0]}–${ns[5]}`;
    case 'dozen':
      return `${ORD[(ns[0] ?? 1) - 1]} dozen`;
    case 'column':
      return `${ORD[(ns[0] ?? 1) - 1]} column`;
    case 'red':
    case 'black':
    case 'odd':
    case 'even':
    case 'low':
    case 'high':
      return spotLabel(s);
  }
}

/** "35:1" */
export const paysOf = (t: RouletteBetType) => `${ROULETTE_PAYOUTS[t]}:1`;

/** Win chance of a spot in percent (covered ÷ 37). */
export function chanceOf(s: Spot): string {
  return chanceOfCount(covers(s).length);
}

/** covered ÷ 37 in percent, nearest 0.01 (a probability, not an amount): 2 → 5.41, 18 → 48.65. */
export function chanceOfCount(n: number): string {
  return money(n).times(100).div(POCKETS).toDecimalPlaces(2, MoneyDecimal.ROUND_HALF_UP).toFixed(2);
}

/** Returned on a win (stake + winnings) = amount × (pays + 1). */
export function returnsOf(type: RouletteBetType, amount: string): Money {
  return money(amount).times(ROULETTE_PAYOUTS[type] + 1);
}

// ── bet slip ───────────────────────────────────────────────────────────────────────────────────

export interface SlipBet extends Spot {
  key: string;
  /** DEMO credits, 2 dp. */
  amount: string;
}

export type Slip = readonly SlipBet[];

export function toSlipBet(s: Spot, amount: string): SlipBet {
  const numbers = s.numbers ? sorted(s.numbers) : undefined;
  return { type: s.type, ...(numbers ? { numbers } : {}), key: spotKey(s), amount: money(amount).toFixed(2) };
}

export type AddResult = { slip: Slip; error: null } | { slip: Slip; error: 'max_spots' | 'invalid' };

/** Put one chip on a spot (adds to an existing spot). Over-limit amounts are allowed but flagged — never changed. */
export function addChip(slip: Slip, s: Spot, chip: string): AddResult {
  if (!isValidSpot(s)) return { slip, error: 'invalid' };
  const key = spotKey(s);
  const i = slip.findIndex((b) => b.key === key);
  if (i >= 0) {
    const next = slip.slice();
    next[i] = { ...slip[i]!, amount: money(slip[i]!.amount).plus(money(chip)).toFixed(2) };
    return { slip: next, error: null };
  }
  if (slip.length >= ROULETTE_RULES.maxSpots) return { slip, error: 'max_spots' };
  return { slip: [...slip, toSlipBet(s, chip)], error: null };
}

/** Take one chip of `chip` value off a spot (removes the spot when it reaches 0). */
export function removeChip(slip: Slip, key: string, chip: string): Slip {
  const b = slip.find((x) => x.key === key);
  if (!b) return slip;
  const left = money(b.amount).minus(money(chip));
  return left.lte(0)
    ? slip.filter((x) => x.key !== key)
    : slip.map((x) => (x.key === key ? { ...x, amount: left.toFixed(2) } : x));
}

export const removeSpot = (slip: Slip, key: string): Slip => slip.filter((x) => x.key !== key);

export function setSpotAmount(slip: Slip, key: string, amount: string): Slip {
  return slip.map((x) => (x.key === key ? { ...x, amount: money(amount).toFixed(2) } : x));
}

export function slipTotal(slip: Slip): string {
  return slip.reduce((a, b) => a.plus(money(b.amount)), money(0)).toFixed(2);
}

/** API params: `{ bets: [{ type, numbers?, amount }] }` (stake = Σ amounts on the server). */
export function toParams(slip: Slip): { bets: RouletteBet[] } {
  return {
    bets: slip.map((b) => ({ type: b.type, ...(b.numbers ? { numbers: [...b.numbers] } : {}), amount: b.amount })),
  };
}

/** Rebuild a slip from recorded bets (Repeat / "Repeat these bets"). Invalid rows are dropped. */
export function fromBets(bets: readonly { type: string; numbers?: number[]; amount: string }[] | undefined): Slip {
  const out: SlipBet[] = [];
  for (const b of bets ?? []) {
    const s: Spot = { type: b.type as RouletteBetType, ...(b.numbers ? { numbers: b.numbers } : {}) };
    if (!(b.type in ROULETTE_PAYOUTS) || !isValidSpot(s)) continue;
    try {
      out.push(toSlipBet(s, b.amount));
    } catch {
      // malformed amount — skip
    }
  }
  return out;
}

export type SlipProblem =
  | { kind: 'spot_above_max'; key: string; label: string; amount: string; over: string }
  | { kind: 'spot_below_min'; key: string; label: string; amount: string }
  | { kind: 'table_max'; total: string; over: string }
  | { kind: 'max_spots'; count: number }
  | { kind: 'insufficient'; total: string; balance: string; short: string };

/** Client-side pre-checks (the server re-checks everything). Order: spot limits, table max, spots, balance. */
export function slipProblems(slip: Slip, balance: string | null): SlipProblem[] {
  const out: SlipProblem[] = [];
  for (const b of slip) {
    const a = money(b.amount);
    if (a.gt(money(ROULETTE_RULES.maxPerSpot)))
      out.push({
        kind: 'spot_above_max',
        key: b.key,
        label: spotLabel(b),
        amount: b.amount,
        over: a.minus(money(ROULETTE_RULES.maxPerSpot)).toFixed(2),
      });
    else if (a.lt(money(ROULETTE_RULES.minPerSpot)))
      out.push({ kind: 'spot_below_min', key: b.key, label: spotLabel(b), amount: b.amount });
  }
  const total = money(slipTotal(slip));
  if (total.gt(money(ROULETTE_RULES.tableMax)))
    out.push({ kind: 'table_max', total: total.toFixed(2), over: total.minus(money(ROULETTE_RULES.tableMax)).toFixed(2) });
  if (slip.length > ROULETTE_RULES.maxSpots) out.push({ kind: 'max_spots', count: slip.length });
  if (balance !== null && total.gt(money(balance)))
    out.push({ kind: 'insufficient', total: total.toFixed(2), balance, short: total.minus(money(balance)).toFixed(2) });
  return out;
}

// ── previews (pure, from the shared rules) ────────────────────────────────────────────────────

/** What the slip returns if the ball lands on `pocket` (stake + winnings of the winning bets). */
export function returnedOn(slip: Slip, pocket: number): Money {
  let r = money(0);
  for (const b of slip) if (covers(b).includes(pocket)) r = r.plus(returnsOf(b.type, b.amount));
  return r;
}

/** Max potential payout and the pocket(s) that give it. */
export function maxPayout(slip: Slip): { amount: string; pockets: number[] } {
  let best = money(0);
  let pockets: number[] = [];
  for (let p = 0; p < POCKETS; p++) {
    const r = returnedOn(slip, p);
    if (r.gt(best)) {
      best = r;
      pockets = [p];
    } else if (r.eq(best) && best.gt(0)) pockets.push(p);
  }
  return { amount: best.toFixed(2), pockets };
}

/** Expected return = Σ returned ÷ 37 (truncated to 2 dp) — shows the 2.70 % edge on any slip. */
export function expectedReturn(slip: Slip): string {
  let s = money(0);
  for (let p = 0; p < POCKETS; p++) s = s.plus(returnedOn(slip, p));
  // an expectation, not a payout: nearest cent (720 ÷ 37 = 19.459… → 19.46)
  return s.div(POCKETS).toDecimalPlaces(2, MoneyDecimal.ROUND_HALF_UP).toFixed(2);
}

export interface OutcomeGroup {
  pockets: number[];
  /** Net = returned − total stake (signed, 2 dp). */
  net: string;
  returned: string;
}

/** "If the ball lands on…": pockets grouped by the net result, best first. */
export function outcomePreview(slip: Slip): OutcomeGroup[] {
  const total = money(slipTotal(slip));
  const byNet = new Map<string, OutcomeGroup>();
  for (let p = 0; p < POCKETS; p++) {
    const ret = returnedOn(slip, p);
    const net = ret.minus(total).toFixed(2);
    const g = byNet.get(net) ?? { pockets: [], net, returned: ret.toFixed(2) };
    g.pockets.push(p);
    byNet.set(net, g);
  }
  return [...byNet.values()].sort((a, b) => money(b.net).comparedTo(money(a.net)));
}

/** Pockets with any return on the slip. */
export const coveredPockets = (slip: Slip) =>
  Array.from({ length: POCKETS }, (_, p) => p).filter((p) => returnedOn(slip, p).gt(0)).length;

/** Signed amount for display: +195.00 · −20.00 · ±0.00. */
export function signed(v: string): string {
  const d = money(v);
  if (d.isZero()) return '±0.00';
  return formatAmount(v, { sign: 'always' });
}

/** "Red · odd · 2nd dozen (13–24) · 1st column · high (19–36)" — 0: "Zero · green". */
export function pocketFacts(n: number): string {
  if (n === 0) return 'Zero · green · every outside bet loses';
  const d = Math.ceil(n / 12);
  const c = ((n - 1) % 3) + 1;
  return [
    colorOf(n) === 'red' ? 'Red' : 'Black',
    n % 2 ? 'odd' : 'even',
    `${ORD[d - 1]} dozen (${12 * d - 11}–${12 * d})`,
    `${ORD[c - 1]} column`,
    n <= 18 ? 'low (1–18)' : 'high (19–36)',
  ].join(' · ');
}

/** "19 Red" · "0 Green". */
export const pocketName = (n: number) =>
  `${n} ${colorOf(n) === 'red' ? 'Red' : colorOf(n) === 'black' ? 'Black' : 'Green'}`;

// ── bet options for one number (mobile bet-type sheet, keyboard chooser) ──────────────────────

/** Every inside spot that covers `n`, straight first, then splits, streets, corners, lines (valid layout only). */
export function insideOptionsFor(n: number): Spot[] {
  const cand: Spot[] = [{ type: 'straight', numbers: [n] }];
  if (n === 0) {
    cand.push(
      { type: 'split', numbers: [0, 1] },
      { type: 'split', numbers: [0, 2] },
      { type: 'split', numbers: [0, 3] },
      { type: 'street', numbers: [0, 1, 2] },
      { type: 'street', numbers: [0, 2, 3] },
      { type: 'corner', numbers: [0, 1, 2, 3] },
    );
  } else {
    for (const m of [n - 3, n + 3, n - 1, n + 1]) if (m >= 1 && m <= 36) cand.push({ type: 'split', numbers: [n, m] });
    if (n <= 3) cand.push({ type: 'split', numbers: [0, n] });
    const s0 = n - ((n - 1) % 3);
    cand.push({ type: 'street', numbers: [s0, s0 + 1, s0 + 2] });
    if (n === 1 || n === 2) cand.push({ type: 'street', numbers: [0, 1, 2] });
    if (n === 2 || n === 3) cand.push({ type: 'street', numbers: [0, 2, 3] });
    for (const tl of [n, n - 1, n - 3, n - 4]) {
      if (tl >= 1) cand.push({ type: 'corner', numbers: [tl, tl + 1, tl + 3, tl + 4] });
    }
    if (n <= 3) cand.push({ type: 'corner', numbers: [0, 1, 2, 3] });
    for (const l0 of [s0 - 3, s0]) if (l0 >= 1 && l0 + 5 <= 36) cand.push({ type: 'line', numbers: [l0, l0 + 1, l0 + 2, l0 + 3, l0 + 4, l0 + 5] });
  }
  const seen = new Set<string>();
  return cand.filter((s) => {
    if (!isValidSpot(s) || !covers(s).includes(n)) return false;
    const k = spotKey(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── horizontal felt geometry (desktop / tablet) ───────────────────────────────────────────────

/** Number on the horizontal felt: 12 columns × 3 rows, top row 3 · 6 · 9 …, bottom row 1 · 4 · 7 …. */
export const numberAt = (row: number, col: number) => 3 * col + (3 - row);
export const cellOf = (n: number) => ({ col: Math.ceil(n / 3) - 1, row: 2 - ((n - 1) % 3) });

export type ZoneShape = 'v' | 'h' | 'x';

/** A chip target that is NOT a whole cell: split lines, street / line edges, corners and the zero edge. */
export interface FeltZone {
  spot: Spot;
  key: string;
  shape: ZoneShape;
  /** Centre of the target in grid units: x ∈ [0, 12] (columns), y ∈ [0, 3] (rows); x = 0 is the zero edge. */
  x: number;
  y: number;
}

/** All edge / corner targets of the 1–36 grid (and the zero edge), computed from the layout. */
export function feltZones(): FeltZone[] {
  const zones: FeltZone[] = [];
  const push = (spot: Spot, shape: ZoneShape, x: number, y: number) => {
    if (isValidSpot(spot)) zones.push({ spot, key: spotKey(spot), shape, x, y });
  };
  for (let c = 0; c < 12; c++) {
    for (let r = 0; r < 3; r++) {
      const n = numberAt(r, c);
      // split with the right neighbour (n + 3) on the shared vertical line
      if (c < 11) push({ type: 'split', numbers: [n, n + 3] }, 'v', c + 1, r + 0.5);
      // split with the number below (n − 1) on the shared horizontal line
      if (r < 2) push({ type: 'split', numbers: [n - 1, n] }, 'h', c + 0.5, r + 1);
      // corner where four meet
      if (r < 2 && c < 11) push({ type: 'corner', numbers: [n - 1, n, n + 2, n + 3] }, 'x', c + 1, r + 1);
    }
    // street on the bottom (outer) edge of the 3-number column
    push({ type: 'street', numbers: [3 * c + 1, 3 * c + 2, 3 * c + 3] }, 'h', c + 0.5, 3);
    // six line where two streets meet on the outer edge
    if (c < 11) push({ type: 'line', numbers: [3 * c + 1, 3 * c + 2, 3 * c + 3, 3 * c + 4, 3 * c + 5, 3 * c + 6] }, 'x', c + 1, 3);
  }
  // zero edge: splits 0-3 / 0-2 / 0-1, trios on the crossings, first four at the outer corner
  push({ type: 'split', numbers: [0, 3] }, 'v', 0, 0.5);
  push({ type: 'split', numbers: [0, 2] }, 'v', 0, 1.5);
  push({ type: 'split', numbers: [0, 1] }, 'v', 0, 2.5);
  push({ type: 'street', numbers: [0, 2, 3] }, 'x', 0, 1);
  push({ type: 'street', numbers: [0, 1, 2] }, 'x', 0, 2);
  push({ type: 'corner', numbers: [0, 1, 2, 3] }, 'x', 0, 3);
  return zones;
}

/** Where to draw the chip of an inside spot on the horizontal felt (grid units), or null for outside bets. */
export function chipPosition(s: Spot): { x: number; y: number } | null {
  if (isOutside(s)) return null;
  if (s.type === 'straight') {
    const n = s.numbers![0]!;
    if (n === 0) return { x: -0.5, y: 1.5 };
    const { col, row } = cellOf(n);
    return { x: col + 0.5, y: row + 0.5 };
  }
  const z = feltZones().find((q) => q.key === spotKey(s));
  return z ? { x: z.x, y: z.y } : null;
}

/** Outside boxes on the felt. */
export const OUTSIDE_SPOTS: { dozens: Spot[]; columns: Spot[]; even: Spot[] } = {
  dozens: [1, 2, 3].map((d): Spot => ({ type: 'dozen', numbers: [d] })),
  columns: [3, 2, 1].map((c): Spot => ({ type: 'column', numbers: [c] })),
  even: [
    { type: 'low' },
    { type: 'even' },
    { type: 'red' },
    { type: 'black' },
    { type: 'odd' },
    { type: 'high' },
  ],
};
