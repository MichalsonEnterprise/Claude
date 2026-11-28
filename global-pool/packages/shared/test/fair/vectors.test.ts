import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ByteStream,
  blackjack,
  coinflip,
  commitServerSeed,
  crash,
  dice,
  hilo,
  keno,
  mines,
  plinko,
  roulette,
  wheel,
} from '../../src/fair';
import vectors from '../../src/fair/vectors.json';

type Case = { serverSeed: string; clientSeed: string; nonce: number };
const seedOf = (c: Case) => ({
  serverSeed: c.serverSeed,
  clientSeed: c.clientSeed,
  nonce: c.nonce,
});

describe('published test vectors (src/fair/vectors.json)', () => {
  it('commitments', () => {
    for (const v of vectors.commitments) expect(commitServerSeed(v.serverSeed)).toBe(v.sha256);
  });

  it('byte stream blocks (also re-checked against node:crypto)', () => {
    for (const v of vectors.stream) {
      const s = new ByteStream(seedOf(v));
      const hex = Buffer.from(Array.from({ length: 64 }, () => s.nextByte())).toString('hex');
      expect(hex).toBe(v.block0 + v.block1);
      expect(
        createHmac('sha256', v.serverSeed).update(`${v.clientSeed}:${v.nonce}:0`).digest('hex'),
      ).toBe(v.block0);
    }
  });

  it('Pool Dice rolls', () => {
    for (const v of vectors.dice) expect(dice.diceRollInt(seedOf(v))).toBe(v.rollHundredths);
  });

  it('Double Side sides', () => {
    for (const v of vectors.coinflip) {
      const r = coinflip.coinSide(seedOf(v));
      expect(r).toEqual({ side: v.side, u32: v.u32 });
      expect(r.side).toBe(v.u32 < 2 ** 31 ? 'heads' : 'tails');
    }
  });

  it('Pool Roulette pockets', () => {
    for (const v of vectors.roulette)
      expect(roulette.roulettePocket(seedOf(v))).toEqual({ pocket: v.pocket, u32: v.u32 });
  });

  it('Skyline results', () => {
    for (const v of vectors.limbo) expect(crash.limboResult(seedOf(v))).toBe(v.result);
  });

  it('Fortune Ring segments', () => {
    for (const v of vectors.wheel) {
      expect(wheel.playWheel(seedOf(v), v.params as wheel.WheelParams).segment).toBe(v.segment);
    }
  });

  it('Pool Keno draws', () => {
    for (const v of vectors.keno) expect(keno.kenoDraw(seedOf(v))).toEqual(v.drawn);
  });

  it('Pinfall paths', () => {
    for (const v of vectors.plinko) {
      expect(plinko.playPlinko(seedOf(v), v.params as plinko.PlinkoParams).path).toEqual(v.path);
    }
  });

  it('Vault Sweeper boards', () => {
    for (const v of vectors.mines) expect(mines.minePositions(seedOf(v), v.mines)).toEqual(v.board);
  });

  it('High Card cards', () => {
    for (const v of vectors.hilo) {
      const deck = new hilo.HiloDeck(seedOf(v));
      expect(Array.from({ length: 6 }, () => deck.next().code)).toEqual(v.cards);
    }
  });

  it('Twenty-One shoe order', () => {
    for (const v of vectors.blackjack) {
      expect(blackjack.shoeOrder(seedOf(v), v.decks).slice(0, 20)).toEqual(v.first20);
      const lazy = new blackjack.Shoe(seedOf(v), v.decks);
      expect(Array.from({ length: 20 }, () => lazy.draw())).toEqual(v.first20);
    }
  });

  it('Orbit Rush hash chain and crash points', () => {
    const c = vectors.crash;
    const chain = crash.buildHashChain(c.terminalSeed, c.chainLength);
    expect(chain[0]).toBe(c.chainCommitment);
    for (const r of c.rounds) {
      expect(chain[r.index]).toBe(r.seed);
      expect(crash.chainSeedAt(c.terminalSeed, c.chainLength, r.index)).toBe(r.seed);
      expect(crash.crashCommitment(r.seed)).toBe(r.commitment);
      expect(crash.verifyChainSeed(r.seed, r.index, c.chainCommitment)).toBe(true);
      expect(crash.crashPointOf(r.seed, c.salt)).toEqual({
        crashPoint: r.crashPoint,
        instant: r.instant,
      });
    }
  });
});
