/**
 * Deterministic, verifiable winner selection — a bit-for-bit mirror of `DrawMath.deriveWinners` /
 * `DrawMath.splitPool` in packages/contracts (GlobalPoolRounds v1) and `@gp/contracts/verify`.
 *
 *   candidate_k = uint256(keccak256(abi.encode(WINNERS_DOMAIN, roundId, randomWord, k)))   k = 0, 1, 2, …
 *   reject candidate_k < 2^256 mod totalEntries (removes modulo bias)
 *   index = candidate_k mod totalEntries; skip indices already drawn (distinct entries)
 *
 * The i-th distinct index wins rank i + 1 (1st, 2nd, 3rd, then 10 runner-ups). `index` is the 0-based position in
 * the round's canonical entry list (entries ordered by `seq`, so index = seq − 1). Anyone holding the VRF word and
 * the entry list can recompute the result; no input other than those two exists.
 *
 * Prize amounts (USDT base units, 6 dp): amount_r = floor(pool × bps_r / 10 000) for ranks ≥ 2 and the 1st prize
 * takes the remainder, so prizes always sum to exactly the pool (same as DrawMath.splitPool).
 */
import type { PrizeTier } from '@gp/shared/enums';
import { fromBaseUnits, toBaseUnits, toUSDTString } from '@gp/shared/money';
import { encodeAbiParameters, hexToBigInt, keccak256, stringToHex, type Hex } from 'viem';

export const WINNERS_DOMAIN: Hex = keccak256(stringToHex('GLOBAL_POOL_WINNERS_V1'));
export const BPS_DENOMINATOR = 10_000n;
/** 1st 50% · 2nd 20% · 3rd 10% · 10 × runner-up 2% (PRIZE_DISTRIBUTION in @gp/shared/pool). */
export const DEFAULT_PRIZE_SPLIT_BPS: readonly number[] = [5000, 2000, 1000, ...Array<number>(10).fill(200)];

const TWO_256 = 1n << 256n;

export class SelectionError extends Error {
  override readonly name = 'SelectionError';
}

export function deriveWinnerIndices(roundId: bigint, randomWord: bigint, totalEntries: bigint, count: bigint): bigint[] {
  if (totalEntries <= 0n) throw new SelectionError('no entries');
  if (count <= 0n || count > totalEntries) throw new SelectionError(`invalid winner count ${count} for ${totalEntries} entries`);
  if (randomWord < 0n || randomWord >= TWO_256) throw new SelectionError('random word out of uint256 range');
  const threshold = TWO_256 % totalEntries;
  const winners: bigint[] = [];
  const seen = new Set<bigint>();
  for (let nonce = 0n; BigInt(winners.length) < count; nonce++) {
    const candidate = hexToBigInt(
      keccak256(
        encodeAbiParameters(
          [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
          [WINNERS_DOMAIN, roundId, randomWord, nonce],
        ),
      ),
    );
    if (candidate < threshold) continue;
    const index = candidate % totalEntries;
    if (seen.has(index)) continue;
    seen.add(index);
    winners.push(index);
  }
  return winners;
}

export function validatePrizeSplit(bps: readonly number[]): void {
  if (bps.length === 0) throw new SelectionError('empty prize split');
  if (bps.some((b) => !Number.isInteger(b) || b <= 0)) throw new SelectionError('prize split must be positive integers');
  if (bps.reduce((a, b) => a + b, 0) !== Number(BPS_DENOMINATOR)) throw new SelectionError('prize split must sum to 10000 bps');
}

/** Mirror of DrawMath.splitPool (base units). */
export function splitPool(pool: bigint, bps: readonly number[]): bigint[] {
  const amounts = bps.map((b, i) => (i === 0 ? 0n : (pool * BigInt(b)) / BPS_DENOMINATOR));
  const rest = amounts.reduce((sum, a) => sum + a, 0n);
  if (amounts.length > 0) amounts[0] = pool - rest;
  return amounts;
}

export function tierForRank(rank: number): PrizeTier {
  return rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : 'runner_up';
}

export interface SelectionEntry {
  seq: number;
  entryId: string;
  userId: string;
}

export interface SelectedWinner {
  rank: number;
  tier: PrizeTier;
  /** 0-based index into the canonical entry list. */
  entryIndex: number;
  entrySeq: number;
  entryId: string;
  userId: string;
  /** USDT decimal string. */
  amount: string;
}

/**
 * Select winners for a round from its VRF word and canonical entry list (must be sorted by seq, seq = 1..N).
 * When a round has fewer entries than prizes, only the first `entries` ranks are drawn and the 1st prize absorbs
 * the undrawn shares (the split is computed over the drawn ranks only).
 */
export function selectWinners(input: {
  roundId: bigint;
  randomWord: Hex;
  entries: readonly SelectionEntry[];
  pool: string;
  prizeSplitBps?: readonly number[];
}): SelectedWinner[] {
  const bps = input.prizeSplitBps ?? DEFAULT_PRIZE_SPLIT_BPS;
  validatePrizeSplit(bps);
  const n = input.entries.length;
  input.entries.forEach((e, i) => {
    if (e.seq !== i + 1) throw new SelectionError(`entry list must be the canonical seq order (index ${i} has seq ${e.seq})`);
  });
  const count = Math.min(bps.length, n);
  const indices = deriveWinnerIndices(input.roundId, hexToBigInt(input.randomWord), BigInt(n), BigInt(count));
  const drawnBps = bps.slice(0, count);
  const missing = bps.slice(count).reduce((a, b) => a + b, 0);
  if (drawnBps.length > 0) drawnBps[0] = drawnBps[0]! + missing;
  const amounts = splitPool(toBaseUnits(input.pool), drawnBps);
  return indices.map((idx, i) => {
    const entry = input.entries[Number(idx)]!;
    return {
      rank: i + 1,
      tier: tierForRank(i + 1),
      entryIndex: Number(idx),
      entrySeq: entry.seq,
      entryId: entry.entryId,
      userId: entry.userId,
      amount: toUSDTString(fromBaseUnits(amounts[i]!)),
    };
  });
}
