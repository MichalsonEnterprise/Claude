/**
 * Provably-fair byte stream — the ONE source of randomness for every GLOBAL POOL game (DEMO credits).
 *
 *   block(r) = HMAC-SHA256(key = serverSeed, message = `${clientSeed}:${nonce}:${r}`)   r = 0, 1, 2, …
 *   stream   = block(0) ‖ block(1) ‖ block(2) ‖ …   (32 bytes per block, read left to right)
 *
 * - `serverSeed` is the 64-hex-character secret; the HMAC key is its ASCII text (exactly as revealed).
 * - `clientSeed` is the player's editable seed, `nonce` the bet counter of the seed pair (0, 1, 2, …).
 * - Outcomes are derived with INTEGER maths on these bytes only (no Math.random, no floats): see
 *   {@link uniformInt} (rejection sampling, no modulo bias), {@link scaleU32} (published `floor(f × n)` formulas)
 *   and {@link nextU52} (52-bit integer for multiplier games, BigInt maths).
 *
 * The browser verifier imports this exact module (`@gp/shared/fair`), so the server and the verifier can never
 * disagree on the maths. Pure, synchronous, platform-neutral (@noble/hashes).
 */
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/** Everything that fixes one bet's randomness. */
export interface SeedInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export class FairError extends Error {
  override readonly name = 'FairError';
  constructor(
    message: string,
    /** Stable machine code for API error details. */
    readonly code: string = 'INVALID_BET',
  ) {
    super(message);
  }
}

const TWO_POW_32 = 4_294_967_296;

/** SHA-256 of a UTF-8 string, lowercase hex (commitments: `sha256(serverSeed)`). */
export function sha256Hex(input: string): string {
  return bytesToHex(sha256(utf8ToBytes(input)));
}

/** HMAC-SHA256(key, message) over UTF-8 strings, lowercase hex. */
export function hmacSha256Hex(key: string, message: string): string {
  return bytesToHex(hmac(sha256, utf8ToBytes(key), utf8ToBytes(message)));
}

/** The message of block `cursor` (documented format). */
export function blockMessage(clientSeed: string, nonce: number, cursor: number): string {
  return `${clientSeed}:${nonce}:${cursor}`;
}

/**
 * Lazily generated HMAC byte stream for one bet. `bytesRead` tells the verifier how many bytes an outcome used.
 */
export class ByteStream {
  private readonly keyed: ReturnType<typeof hmac.create>;
  private block: Uint8Array = new Uint8Array(0);
  private cursor = -1;
  private offset = 32;
  /** Total bytes consumed so far. */
  bytesRead = 0;

  constructor(readonly input: SeedInput) {
    assertSeedInput(input);
    this.keyed = hmac.create(sha256, utf8ToBytes(input.serverSeed));
  }

  /** Next byte (0–255). */
  nextByte(): number {
    if (this.offset >= 32) {
      this.cursor += 1;
      this.block = this.keyed
        .clone()
        .update(utf8ToBytes(blockMessage(this.input.clientSeed, this.input.nonce, this.cursor)))
        .digest();
      this.offset = 0;
    }
    this.bytesRead += 1;
    return this.block[this.offset++]!;
  }

  /** Next 4 bytes as an unsigned 32-bit big-endian integer (0 … 2³² − 1). */
  nextU32(): number {
    const b0 = this.nextByte();
    const b1 = this.nextByte();
    const b2 = this.nextByte();
    const b3 = this.nextByte();
    return ((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3;
  }

  /** Next 7 bytes, top 52 bits, as a BigInt (0 … 2⁵² − 1) — used by the crash / limbo formulas. */
  nextU52(): bigint {
    let v = 0n;
    for (let i = 0; i < 7; i++) v = (v << 8n) | BigInt(this.nextByte());
    return v >> 4n;
  }
}

/**
 * Uniform integer in [min, max] (inclusive) WITHOUT modulo bias: draws 32-bit values and rejects the top
 * `2³² mod range` values. The rejection probability is < range / 2³² (≈ 0.0000073 % for 312 cards).
 */
export function uniformInt(stream: ByteStream, min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
    throw new FairError(`Invalid range [${min}, ${max}]`, 'INTERNAL');
  }
  const range = max - min + 1;
  if (range > TWO_POW_32) throw new FairError('Range too large', 'INTERNAL');
  if (range === 1) return min;
  const limit = TWO_POW_32 - (TWO_POW_32 % range);
  for (;;) {
    const u = stream.nextU32();
    if (u < limit) return min + (u % range);
  }
}

/**
 * Published fraction formulas: `floor(f × n)` with `f = u32 / 2³²` computed exactly in integers
 * (`floor(u32 × n / 2³²)`). Exact for n < 2²¹ (the product stays below 2⁵³). The bias of this mapping is below
 * n / 2³² per outcome (Pool Roulette: 37 / 2³² ≈ 8.6 × 10⁻⁹) — documented in docs/GAMES.md.
 */
export function scaleU32(u32: number, n: number): number {
  if (!Number.isInteger(u32) || u32 < 0 || u32 >= TWO_POW_32) {
    throw new FairError('u32 out of range', 'INTERNAL');
  }
  if (!Number.isInteger(n) || n < 1 || n >= 2_097_152) throw new FairError('n out of range', 'INTERNAL');
  return Math.floor((u32 * n) / TWO_POW_32);
}

/** Forward (Durstenfeld) Fisher–Yates: position i is fixed at step i, so prefixes can be computed lazily. */
export function shuffle<T>(stream: ByteStream, items: readonly T[], steps = items.length - 1): T[] {
  const a = [...items];
  const last = Math.min(steps, a.length - 1);
  for (let i = 0; i < last; i++) {
    const j = uniformInt(stream, i, a.length - 1);
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export const SERVER_SEED_PATTERN = /^[0-9a-f]{64}$/;
/** Client seeds: 1–64 characters, letters, digits, dot, dash and underscore (no ':' so messages stay unambiguous). */
export const CLIENT_SEED_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function isValidClientSeed(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_SEED_PATTERN.test(value);
}

export function assertSeedInput(input: SeedInput): void {
  if (typeof input.serverSeed !== 'string' || input.serverSeed.length === 0) {
    throw new FairError('Server seed is required', 'SEED_INVALID');
  }
  if (!isValidClientSeed(input.clientSeed)) {
    throw new FairError(
      'Client seed must be 1–64 characters: letters, digits, dot, dash or underscore',
      'SEED_INVALID',
    );
  }
  if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) {
    throw new FairError('Nonce must be a non-negative integer', 'SEED_INVALID');
  }
}

/** Commitment shown before play: SHA-256 of the server seed text. */
export const commitServerSeed = (serverSeed: string): string => sha256Hex(serverSeed);

/** True when a revealed server seed matches the commitment that was shown before play. */
export function verifyServerSeed(serverSeed: string, commitment: string): boolean {
  return sha256Hex(serverSeed) === commitment.toLowerCase();
}
