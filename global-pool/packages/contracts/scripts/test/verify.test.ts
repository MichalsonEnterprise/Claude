import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { SimpleMerkleTree } from '@openzeppelin/merkle-tree';
import { hexToString } from 'viem';

import { buildFixture, DEMO_ROUND, entryLabel, entryOwner } from '../lib/demo-round.ts';
import {
  buildTree,
  deriveWinners,
  encodeEntryId,
  entryLeaf,
  splitPool,
  verifyProof,
  WINNERS_DOMAIN,
} from '../lib/verify.ts';

const fixturePath = fileURLToPath(new URL('../../test/fixtures/round-1248.json', import.meta.url));

describe('committed fixture', () => {
  it('is up to date with scripts/lib (run `pnpm --filter @gp/contracts fixture` if this fails)', async () => {
    const committed: unknown = JSON.parse(await readFile(fixturePath, 'utf8'));
    assert.deepEqual(committed, JSON.parse(JSON.stringify(buildFixture())));
  });

  it('matches the DEMO round #1,248 numbers', () => {
    const f = buildFixture();
    assert.equal(f.entries.totalEntries, 18_640);
    assert.equal(f.entries.totalParticipants, 3_412);
    assert.equal(f.entries.poolAmount, '186400000000'); // 186,400.00 USDT
    assert.equal(f.entries.platformFees, '932000000'); // 932.00 USDT, not pooled
    assert.deepEqual(f.settlement.prizeAmounts.slice(0, 4), [
      '93200000000',
      '37280000000',
      '18640000000',
      '3728000000',
    ]);
    assert.equal(f.settlement.totalPaid, f.entries.poolAmount);
    assert.equal(f.draw.winners.length, 13);
  });
});

describe('verify.ts', () => {
  it('uses the contract domain tag', () => {
    // keccak256("GLOBAL_POOL_WINNERS_V1")
    assert.match(WINNERS_DOMAIN, /^0x[0-9a-f]{64}$/);
  });

  it('encodes short entry ids as right-padded ASCII and long ones as a hash', () => {
    const short = encodeEntryId('E-1248-00981');
    assert.equal(hexToString(short, { size: 32 }), 'E-1248-00981');
    const long = encodeEntryId('2f7c4b0e-6a0f-4b55-9a59-3c1f7f0d6e21-extra');
    assert.match(long, /^0x[0-9a-f]{64}$/);
    assert.notEqual(long.slice(2, 10), '32663763');
  });

  it('derives distinct in-range winners deterministically', () => {
    for (let k = 0; k < 50; k++) {
      const word = BigInt(k) * 0x9e3779b97f4a7c15n + 1n;
      const n = BigInt(13 + k * 7);
      const w = deriveWinners(1248n, word, n, 13n);
      assert.equal(new Set(w).size, 13);
      assert.ok(w.every((i) => i >= 0n && i < n));
      assert.deepEqual(deriveWinners(1248n, word, n, 13n), w);
    }
    assert.throws(() => deriveWinners(1n, 1n, 10n, 11n));
    assert.throws(() => deriveWinners(1n, 1n, 10n, 0n));
  });

  it('splits the pool exactly, with rounding dust to 1st prize', () => {
    assert.deepEqual(splitPool(100n, [3334, 3333, 3333]), [34n, 33n, 33n]);
    const amounts = splitPool(186_400_000_000n, DEMO_ROUND.prizeSplitBps);
    assert.equal(
      amounts.reduce((s, a) => s + a, 0n),
      186_400_000_000n,
    );
  });

  it('builds trees whose proofs verify and whose leaf order equals the entry index', () => {
    const leaves = Array.from({ length: 37 }, (_, i) =>
      entryLeaf({
        index: BigInt(i),
        entryId: encodeEntryId(entryLabel(i)),
        userCommitment: encodeEntryId(entryOwner(i)),
      }),
    );
    const tree = buildTree(leaves);
    leaves.forEach((leaf, i) => {
      assert.equal(tree.at(i), leaf);
      assert.ok(verifyProof(tree.root, leaf, tree.getProof(i)));
      assert.ok(SimpleMerkleTree.verify(tree.root, leaf, tree.getProof(i)));
    });
    assert.ok(!verifyProof(tree.root, leaves[0] ?? '0x', tree.getProof(1)));
  });
});
