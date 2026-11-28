import { createHash, createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ByteStream,
  FairError,
  commitServerSeed,
  hmacSha256Hex,
  isValidClientSeed,
  scaleU32,
  sha256Hex,
  shuffle,
  uniformInt,
  verifyServerSeed,
} from '../../src/fair';

const seed = { serverSeed: 'f'.repeat(64), clientSeed: 'nova-k-7f2a91', nonce: 417 };

/** Stream stub returning fixed u32 values (to test rejection sampling). */
function fixedU32(values: number[]): ByteStream {
  let i = 0;
  return { nextU32: () => values[i++]! } as unknown as ByteStream;
}

describe('HMAC-SHA256 byte stream', () => {
  it('equals node:crypto HMAC blocks concatenated (message clientSeed:nonce:cursor)', () => {
    const s = new ByteStream(seed);
    const bytes = Buffer.from(Array.from({ length: 96 }, () => s.nextByte()));
    const expected = Buffer.concat(
      [0, 1, 2].map((c) =>
        createHmac('sha256', seed.serverSeed)
          .update(`${seed.clientSeed}:${seed.nonce}:${c}`)
          .digest(),
      ),
    );
    expect(bytes.equals(expected)).toBe(true);
    expect(s.bytesRead).toBe(96);
  });

  it('reads u32 big-endian and u52 as the top 52 bits of 7 bytes', () => {
    const block = createHmac('sha256', seed.serverSeed)
      .update(`${seed.clientSeed}:${seed.nonce}:0`)
      .digest();
    expect(new ByteStream(seed).nextU32()).toBe(block.readUInt32BE(0));
    const u52 = BigInt(`0x${block.subarray(0, 7).toString('hex')}`) >> 4n;
    expect(new ByteStream(seed).nextU52()).toBe(u52);
  });

  it('hex helpers match node:crypto', () => {
    expect(sha256Hex('abc')).toBe(createHash('sha256').update('abc').digest('hex'));
    expect(hmacSha256Hex('k', 'm')).toBe(createHmac('sha256', 'k').update('m').digest('hex'));
  });

  it('a different client seed or nonce gives an unrelated stream', () => {
    const a = new ByteStream(seed).nextU32();
    expect(new ByteStream({ ...seed, nonce: 418 }).nextU32()).not.toBe(a);
    expect(new ByteStream({ ...seed, clientSeed: 'other' }).nextU32()).not.toBe(a);
  });

  it('rejects invalid seed inputs', () => {
    expect(() => new ByteStream({ ...seed, clientSeed: 'has:colon' })).toThrow(FairError);
    expect(() => new ByteStream({ ...seed, clientSeed: '' })).toThrow(FairError);
    expect(() => new ByteStream({ ...seed, nonce: -1 })).toThrow(FairError);
    expect(() => new ByteStream({ ...seed, nonce: 1.5 })).toThrow(FairError);
    expect(isValidClientSeed('nova-k-7f2a91')).toBe(true);
    expect(isValidClientSeed('x'.repeat(65))).toBe(false);
    expect(isValidClientSeed('white space')).toBe(false);
  });
});

describe('integer helpers', () => {
  it('uniformInt rejects the biased tail (no modulo bias)', () => {
    // range 3: limit = 2^32 − (2^32 mod 3) = 4294967295 → u32 4294967295 is rejected
    expect(uniformInt(fixedU32([4_294_967_295, 7]), 0, 2)).toBe(1);
    expect(uniformInt(fixedU32([4_294_967_294]), 0, 2)).toBe(4_294_967_294 % 3);
    // range 10: limit = 4294967290 → values 4294967290…4294967295 rejected
    expect(uniformInt(fixedU32([4_294_967_290, 4_294_967_295, 25]), 5, 14)).toBe(10);
    expect(uniformInt(fixedU32([]), 3, 3)).toBe(3);
    expect(() => uniformInt(fixedU32([]), 5, 4)).toThrow(FairError);
  });

  it('uniformInt is uniform (chi-square, fixed seeds)', () => {
    const counts = new Array<number>(10).fill(0);
    for (let n = 0; n < 20_000; n++) {
      counts[uniformInt(new ByteStream({ ...seed, nonce: n }), 0, 9)]! += 1;
    }
    const chi = counts.reduce((a, c) => a + (c - 2000) ** 2 / 2000, 0);
    expect(chi).toBeLessThan(27.88); // p = 0.001, 9 degrees of freedom
  });

  it('scaleU32 is the exact floor(u32 × n / 2^32)', () => {
    expect(scaleU32(0, 37)).toBe(0);
    expect(scaleU32(4_294_967_295, 37)).toBe(36);
    // smallest u32 for pocket k is ceil(k × 2^32 / 37)
    for (const k of [1, 19, 36]) {
      const first = Math.ceil((k * 4_294_967_296) / 37);
      expect(scaleU32(first, 37)).toBe(k);
      expect(scaleU32(first - 1, 37)).toBe(k - 1);
    }
    // decision #35 demo: f = 0.528137… → 0.528137 × 37 = 19.54 → 19
    expect(scaleU32(Math.floor(0.528137 * 4_294_967_296), 37)).toBe(19);
  });

  it('forward Fisher–Yates is a permutation and prefix-stable', () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    const full = shuffle(new ByteStream(seed), items);
    expect([...full].sort((a, b) => a - b)).toEqual(items);
    const prefix = shuffle(new ByteStream(seed), items, 5).slice(0, 5);
    expect(prefix).toEqual(full.slice(0, 5));
  });
});

describe('commit–reveal', () => {
  it('commitment = sha256(serverSeed) and verifies only the revealed seed', () => {
    const c = commitServerSeed(seed.serverSeed);
    expect(c).toBe(createHash('sha256').update(seed.serverSeed).digest('hex'));
    expect(verifyServerSeed(seed.serverSeed, c)).toBe(true);
    expect(verifyServerSeed(seed.serverSeed, c.toUpperCase())).toBe(true);
    expect(verifyServerSeed('e'.repeat(64), c)).toBe(false);
    // truncated seed (CF-05 "Verification failed — seed truncated")
    expect(verifyServerSeed(seed.serverSeed.slice(0, 60), c)).toBe(false);
  });
});
