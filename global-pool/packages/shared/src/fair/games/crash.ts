/**
 * Orbit Rush (crash, decision #42) and Skyline (limbo). House edge 1.00 %.
 *
 * Orbit Rush crash point (one per round, shared by every player of the round):
 *   - the round seed comes from a SHA-256 HASH CHAIN: seed[i−1] = sha256(seed[i]). The chain's terminal hash
 *     seed[0] is published when the chain is created; round i uses seed[i], whose commitment sha256(seed[i]) =
 *     seed[i−1] is shown before betting opens. Revealing seed[i] after the round proves it was fixed in advance,
 *     and hashing it i times reaches the published terminal hash.
 *   - stream = ByteStream(serverSeed = seed[i], clientSeed = chain salt (public), nonce = 0)
 *   - instant crash: uniformInt(0, 99) = 0  → 1.00× (exactly 1 round in 100: every bet loses)
 *   - otherwise H = next 52 bits, E = 2⁵²: crash = floor(100·E / (E − H)) / 100, capped at 1,000.00×.
 *   → P(crash ≥ m) = 0.99 / m for every target m ≥ 1.01: RTP 99.00 % at every cash-out target.
 *     (≈ 1.98 % of rounds show 1.00×: the 1 % instant crashes plus rounds that bust before 1.01×.)
 *
 * Skyline (limbo): H = first 52 bits; result = floor(99·E / (E − H)) / 100 (minimum 1.00×, display cap
 * 1,000,000.00×); win when result ≥ target, paying stake × target; win chance = 99 ÷ target %.
 *
 * Multiplier curve (server-authoritative, 100 ms frames): m(t) = floor(100 · e^(0.1117 · t)) / 100, t in seconds,
 * computed with decimal.js (no binary floats).
 */
import { MoneyDecimal, money, type Money } from '../../money';
import { creditString, payoutOf, percentString } from '../credits';
import { ByteStream, FairError, sha256Hex, uniformInt, type SeedInput } from '../stream';

const E = 1n << 52n;

export const CRASH_RULES = {
  houseEdgePercent: '1.00',
  instantCrashOneIn: 100,
  maxMultiplier: '1000.00',
  minTarget: '1.01',
  maxTarget: '1000.00',
  /** Growth rate per second of the multiplier curve (Game/Crash Curve). */
  growthPerSecond: '0.1117',
  frameMs: 100,
  bettingMs: 10_000,
  crashedPauseMs: 4_000,
} as const;

export const LIMBO_RULES = {
  houseEdgePercent: '1.00',
  minTarget: '1.01',
  maxTarget: '1000.00',
  resultCap: '1000000.00',
} as const;

/** BigInt hundredths → '3.82' */
function fromHundredths(h: bigint): string {
  const s = h.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

export interface CrashPoint {
  crashPoint: string;
  instant: boolean;
}

/** Crash point of a round seed (see the module comment). */
export function crashPointOf(roundSeed: string, salt: string): CrashPoint {
  const stream = new ByteStream({ serverSeed: roundSeed, clientSeed: salt, nonce: 0 });
  if (uniformInt(stream, 0, CRASH_RULES.instantCrashOneIn - 1) === 0) {
    return { crashPoint: '1.00', instant: true };
  }
  const h = stream.nextU52();
  let hundredths = (100n * E) / (E - h);
  if (hundredths > 100_000n) hundredths = 100_000n;
  return { crashPoint: fromHundredths(hundredths), instant: false };
}

/** Commitment of a round seed (= the previous seed of the chain). */
export const crashCommitment = (roundSeed: string): string => sha256Hex(roundSeed);

/**
 * Build a hash chain of `length` seeds from a secret terminal seed: returns seeds[0..length] where
 * seeds[length] = terminal and seeds[i−1] = sha256(seeds[i]). seeds[0] is the public chain commitment.
 */
export function buildHashChain(terminalSeed: string, length: number): string[] {
  if (!Number.isInteger(length) || length < 1)
    throw new FairError('Chain length must be ≥ 1', 'INTERNAL');
  const out = new Array<string>(length + 1);
  out[length] = terminalSeed;
  for (let i = length; i > 0; i--) out[i - 1] = sha256Hex(out[i]!);
  return out;
}

/** Seed of round `index` (1-based) from the terminal seed — recomputed, nothing extra is stored. */
export function chainSeedAt(terminalSeed: string, length: number, index: number): string {
  if (!Number.isInteger(index) || index < 1 || index > length) {
    throw new FairError('Round index outside the chain', 'INTERNAL');
  }
  let s = terminalSeed;
  for (let i = length; i > index; i--) s = sha256Hex(s);
  return s;
}

/** True when hashing `seed` exactly `index` times reaches the chain commitment. */
export function verifyChainSeed(seed: string, index: number, chainCommitment: string): boolean {
  let s = seed;
  for (let i = 0; i < index; i++) s = sha256Hex(s);
  return s === chainCommitment;
}

/** Multiplier shown at `elapsedMs` after take-off, quantised to 100 ms frames ('1.64'). */
export function multiplierAt(elapsedMs: number): string {
  if (!Number.isInteger(elapsedMs) || elapsedMs < 0) return '1.00';
  const frame = Math.floor(elapsedMs / CRASH_RULES.frameMs);
  const t = new MoneyDecimal(frame).times(CRASH_RULES.frameMs).div(1000);
  const m = t.times(CRASH_RULES.growthPerSecond).exp().times(100).floor();
  const capped = MoneyDecimal.min(m, 100_000);
  return fromHundredths(BigInt(capped.toFixed(0)));
}

/** First frame time (ms after take-off) at which the curve reaches `multiplier`. */
export function timeToReachMs(multiplier: string): number {
  const target = money(multiplier);
  if (target.lte(1)) return 0;
  // invert m(t) = e^(r·t): t = ln(m) / r, then walk frames forward to the first one that shows ≥ target
  const approx = target.ln().div(CRASH_RULES.growthPerSecond).times(1000).floor().toNumber();
  let frame = Math.max(0, Math.floor(approx / CRASH_RULES.frameMs) - 2);
  while (money(multiplierAt(frame * CRASH_RULES.frameMs)).lt(target)) frame += 1;
  return frame * CRASH_RULES.frameMs;
}

export function validateCrashTarget(target: string | null | undefined): string | null {
  if (target === null || target === undefined || target === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(target))
    throw new FairError('Auto cash-out looks like 2.00', 'INVALID_PARAMS');
  const t = money(target);
  if (t.lt(CRASH_RULES.minTarget) || t.gt(CRASH_RULES.maxTarget)) {
    throw new FairError('Auto cash-out must be between 1.01× and 1,000.00×', 'OUT_OF_RANGE');
  }
  return t.toFixed(2);
}

/** Payout of a crash bet that cashed out at `multiplier`. */
export function crashPayout(stake: string, multiplier: string): string {
  return creditString(payoutOf(stake, multiplier));
}

// ── Skyline (limbo) ────────────────────────────────────────────────────────────────────────────

export interface LimboParams {
  target: string;
}
export interface LimboOutcome {
  result: string;
  target: string;
  winChance: string;
  win: boolean;
  multiplier: string;
}

export function limboWinChance(target: string): Money {
  return money(99).div(money(target));
}

export function validateLimboTarget(target: string): string {
  if (typeof target !== 'string' || !/^\d+(\.\d{1,2})?$/.test(target)) {
    throw new FairError('Target looks like 2.00', 'INVALID_PARAMS');
  }
  const t = money(target);
  if (t.lt(LIMBO_RULES.minTarget) || t.gt(LIMBO_RULES.maxTarget)) {
    throw new FairError('Target must be between 1.01× and 1,000.00×', 'OUT_OF_RANGE');
  }
  return t.toFixed(2);
}

export function limboResult(seed: SeedInput): string {
  const h = new ByteStream(seed).nextU52();
  let hundredths = (99n * E) / (E - h);
  if (hundredths < 100n) hundredths = 100n;
  if (hundredths > 100_000_000n) hundredths = 100_000_000n;
  return fromHundredths(hundredths);
}

export function playLimbo(seed: SeedInput, params: LimboParams): LimboOutcome {
  const target = validateLimboTarget(params.target);
  const result = limboResult(seed);
  return {
    result,
    target,
    winChance: percentString(limboWinChance(target)),
    win: money(result).gte(target),
    multiplier: target,
  };
}

export function limboPayout(stake: string, outcome: LimboOutcome): string {
  return creditString(outcome.win ? payoutOf(stake, outcome.target) : 0);
}
