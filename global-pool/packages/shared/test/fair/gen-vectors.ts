/**
 * Regenerates src/fair/vectors.json (published test vectors: fixed seeds → outcomes).
 * Run: pnpm --filter @gp/shared exec tsx test/fair/gen-vectors.ts
 * The HMAC blocks are computed with node:crypto (independent of @noble/hashes) so the vectors also pin the stream.
 * Regenerate ONLY when a rules version changes; vectors.test.ts fails on any drift.
 */
import { createHash, createHmac } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  blackjack,
  coinflip,
  crash,
  dice,
  hilo,
  keno,
  mines,
  plinko,
  roulette,
  wheel,
} from '../../src/fair';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const seeds = [0, 1, 2].map((i) => sha(`gp-fair-vector-server-${i}`));
const clientSeed = 'vector-client';
const nonces = [0, 1, 2, 417];
const cases = seeds.flatMap((serverSeed) =>
  nonces.map((nonce) => ({ serverSeed, clientSeed, nonce })),
);

const vectors = {
  description:
    'GLOBAL POOL provably-fair test vectors (DEMO credits). stream: HMAC-SHA256(key = serverSeed ASCII, message = `${clientSeed}:${nonce}:${cursor}`). Regenerate with test/fair/gen-vectors.ts only when a rules version changes.',
  rulesVersions: {
    stream: 'hmac-sha256-stream/1',
    dice: 'pool-dice/1',
    coinflip: 'double-side/1',
    roulette: 'pool-roulette/1',
    limbo: 'skyline/1',
    wheel: 'fortune-ring/1',
    keno: 'pool-keno/1',
    plinko: 'pinfall/1',
    mines: 'vault-sweeper/1',
    hilo: 'high-card/1',
    blackjack: 'twenty-one/1',
    crash: 'orbit-rush/1',
  },
  commitments: seeds.map((serverSeed) => ({ serverSeed, sha256: sha(serverSeed) })),
  stream: cases.map((c) => ({
    ...c,
    block0: createHmac('sha256', c.serverSeed).update(`${c.clientSeed}:${c.nonce}:0`).digest('hex'),
    block1: createHmac('sha256', c.serverSeed).update(`${c.clientSeed}:${c.nonce}:1`).digest('hex'),
  })),
  dice: cases.map((c) => ({ ...c, rollHundredths: dice.diceRollInt(c) })),
  coinflip: cases.map((c) => ({ ...c, ...coinflip.coinSide(c) })),
  roulette: cases.map((c) => ({ ...c, ...roulette.roulettePocket(c) })),
  limbo: cases.map((c) => ({ ...c, result: crash.limboResult(c) })),
  wheel: cases.map((c) => ({
    ...c,
    params: { risk: 'medium', segments: 30 },
    segment: wheel.playWheel(c, { risk: 'medium', segments: 30 }).segment,
  })),
  keno: cases.map((c) => ({ ...c, drawn: keno.kenoDraw(c) })),
  plinko: cases.map((c) => ({
    ...c,
    params: { rows: 16, risk: 'medium' },
    path: plinko.playPlinko(c, { rows: 16, risk: 'medium' }).path,
  })),
  mines: cases.map((c) => ({ ...c, mines: 3, board: mines.minePositions(c, 3) })),
  hilo: cases.map((c) => {
    const deck = new hilo.HiloDeck(c);
    return { ...c, cards: Array.from({ length: 6 }, () => deck.next().code) };
  }),
  blackjack: cases.map((c) => ({
    ...c,
    decks: 6,
    first20: blackjack.shoeOrder(c, 6).slice(0, 20),
  })),
  crash: (() => {
    const terminal = sha('gp-fair-vector-crash-terminal');
    const salt = 'gp-orbit-rush-vector-salt';
    const chain = crash.buildHashChain(terminal, 8);
    return {
      salt,
      chainLength: 8,
      terminalSeed: terminal,
      chainCommitment: chain[0],
      rounds: chain.slice(1).map((seed, i) => ({
        index: i + 1,
        seed,
        commitment: sha(seed),
        ...crash.crashPointOf(seed, salt),
      })),
    };
  })(),
};

const out = join(import.meta.dirname, '../../src/fair/vectors.json');
writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`);
console.info(`wrote ${out}`);
