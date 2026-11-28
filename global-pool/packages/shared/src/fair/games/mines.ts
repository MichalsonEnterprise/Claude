/**
 * Vault Sweeper (mines, 5×5). Choose 1–24 mines; reveal tiles one by one; cash out at any time after the first gem.
 * Multiplier after k gems = 0.99 ÷ P(k picks are all gems) = 0.99 × C(25, k) / C(25 − mines, k), truncated to
 * 2 decimals (house edge 1.00 % on every cash-out, e.g. 3 mines: 1 gem 1.12×, 3 gems 1.47×, 5 gems 1.99×).
 * Max payout per bet 100,000.00 (a run that reaches it is cashed out there).
 * PF: mine tiles = the first `mines` positions of a forward Fisher–Yates shuffle of tiles 0…24 on the byte stream
 * (tile = row × 5 + column, top-left = 0). The board is fixed before the first pick.
 */
import { money, type Money } from '../../money';
import { creditString, multiplierString, payoutOf, percentString } from '../credits';
import { ByteStream, FairError, shuffle, type SeedInput } from '../stream';

export const MINES_RULES = {
  houseEdgePercent: '1.00',
  tiles: 25,
  minMines: 1,
  maxMines: 24,
  maxPayout: '100000.00',
  multiplierDecimals: 2,
} as const;

export function validateMines(mines: number): number {
  if (!Number.isInteger(mines) || mines < MINES_RULES.minMines || mines > MINES_RULES.maxMines) {
    throw new FairError('Mines must be between 1 and 24', 'INVALID_PARAMS');
  }
  return mines;
}

/** Mine positions (sorted) for a seed. */
export function minePositions(seed: SeedInput, mines: number): number[] {
  validateMines(mines);
  const tiles = Array.from({ length: MINES_RULES.tiles }, (_, i) => i);
  return shuffle(new ByteStream(seed), tiles, mines)
    .slice(0, mines)
    .sort((a, b) => a - b);
}

/** Exact (untruncated) multiplier after `gems` safe picks. */
export function minesExactMultiplier(mines: number, gems: number): Money {
  validateMines(mines);
  const safe = MINES_RULES.tiles - mines;
  if (!Number.isInteger(gems) || gems < 0 || gems > safe) throw new FairError('Invalid gem count', 'INTERNAL');
  let m = money(99).div(100);
  for (let i = 0; i < gems; i++) m = m.times(MINES_RULES.tiles - i).div(safe - i);
  return m;
}

/** Displayed / paid multiplier ('1.71'). */
export function minesMultiplier(mines: number, gems: number): string {
  if (gems === 0) return '1.00';
  return multiplierString(minesExactMultiplier(mines, gems), MINES_RULES.multiplierDecimals);
}

/** Chance (%) that the next pick is a gem after `gems` gems. */
export function minesNextChance(mines: number, gems: number): string {
  const left = MINES_RULES.tiles - gems;
  const safeLeft = MINES_RULES.tiles - mines - gems;
  return percentString(money(safeLeft).times(100).div(left));
}

export interface MinesState {
  mines: number;
  revealed: number[];
  hitMine: number | null;
  status: 'active' | 'lost' | 'cashed_out';
  multiplier: string;
  payout: string;
}

export function minesStart(mines: number): MinesState {
  validateMines(mines);
  return { mines, revealed: [], hitMine: null, status: 'active', multiplier: '1.00', payout: '0.00' };
}

/** Reveal one tile (mutates). The board comes from the seeds; nothing about the pick changes it. */
export function minesReveal(s: MinesState, board: readonly number[], tile: number, stake: string): MinesState {
  if (s.status !== 'active') throw new FairError('This round is over', 'ROUND_OVER');
  if (!Number.isInteger(tile) || tile < 0 || tile >= MINES_RULES.tiles) {
    throw new FairError('Tile must be 0–24', 'INVALID_PARAMS');
  }
  if (s.revealed.includes(tile)) throw new FairError('Tile already revealed', 'INVALID_PARAMS');
  if (board.includes(tile)) {
    s.hitMine = tile;
    s.status = 'lost';
    s.multiplier = '0.00';
    s.payout = '0.00';
    return s;
  }
  s.revealed.push(tile);
  s.multiplier = minesMultiplier(s.mines, s.revealed.length);
  const capped = payoutOf(stake, s.multiplier).gte(MINES_RULES.maxPayout);
  if (s.revealed.length === MINES_RULES.tiles - s.mines || capped) minesCashOut(s, stake);
  return s;
}

export function minesCashOut(s: MinesState, stake: string): MinesState {
  if (s.status !== 'active') throw new FairError('This round is over', 'ROUND_OVER');
  if (s.revealed.length === 0) throw new FairError('Reveal at least one tile before cashing out', 'ACTION_NOT_ALLOWED');
  s.status = 'cashed_out';
  const p = payoutOf(stake, s.multiplier);
  s.payout = creditString(p.gt(MINES_RULES.maxPayout) ? MINES_RULES.maxPayout : p);
  return s;
}

/** Replay (verifier): picks in order + whether the player cashed out at the end. */
export function replayMines(
  seed: SeedInput,
  mines: number,
  stake: string,
  picks: number[],
  cashedOut: boolean,
): MinesState & { board: number[] } {
  const board = minePositions(seed, mines);
  const s = minesStart(mines);
  for (const t of picks) {
    if (s.status !== 'active') break;
    minesReveal(s, board, t, stake);
  }
  if (cashedOut && s.status === 'active') minesCashOut(s, stake);
  return { ...s, board };
}
