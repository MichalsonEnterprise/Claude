/**
 * DEMO round #1,248 (design/figma-build/demo-data.md) as a fully deterministic data set:
 * 18,640 entries, 3,412 participants, entry price 10.00 USDT, fee 0.05 USDT, pool 186,400.00 USDT,
 * thresholds 500 participants / 50,000.00 USDT, prizes 50% / 20% / 10% / 10 × 2%.
 * @nova.k (GP-48213) owns entries E-1248-00981 … E-1248-01015 (indices 980 … 1014).
 *
 * Everything here is DEMO: user ids are synthetic, salts are derived from a public string (production salts are random
 * secrets), and the VRF word is a fixed test value — never present any of it as real.
 */
import { hexToBigInt, keccak256, stringToHex, type Hex } from 'viem';

import {
  buildTree,
  deriveWinners,
  encodeEntryId,
  entryLeaf,
  payoutLeaf,
  splitPool,
  userCommitment,
} from './verify.ts';

export const DEMO_ROUND = {
  roundId: 1248n,
  openedAt: 1795766400n, // 27 Nov 2026 08:00 UTC
  closesAt: 1795809600n, // 27 Nov 2026 20:00 UTC
  entryPrice: 10_000_000n, // 10.00 USDT
  feePerEntry: 50_000n, // 0.05 USDT
  minParticipants: 500n,
  minPool: 50_000_000_000n, // 50,000.00 USDT
  prizeSplitBps: [5000, 2000, 1000, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200],
  totalEntries: 18_640,
  totalParticipants: 3_412,
  novaUserId: 'GP-48213',
  novaFirstIndex: 980,
  novaEntries: 35,
} as const;

/** keccak256 of the DEMO rules text (stands in for the hash of the published rules document). */
export const DEMO_RULES_HASH: Hex = keccak256(
  stringToHex('GLOBAL POOL round #1,248 rules v1 (DEMO)'),
);

/** Fixed DEMO VRF word used to fulfil the fixture round through the VRF mock. */
export const DEMO_RANDOM_WORD: bigint = hexToBigInt(
  keccak256(stringToHex('GLOBAL POOL DEMO VRF word, round #1,248')),
);

export interface DemoEntry {
  index: number;
  label: string;
  userId: string;
  entryId: Hex;
  userCommitment: Hex;
  leaf: Hex;
}

/** Entry label for an index, e.g. 980 → `E-1248-00981`. */
export function entryLabel(index: number): string {
  return `E-1248-${String(index + 1).padStart(5, '0')}`;
}

/** Synthetic owner of an entry: @nova.k for indices 980…1014, else one of 3,411 DEMO users. */
export function entryOwner(index: number): string {
  const { novaFirstIndex, novaEntries, totalParticipants, novaUserId } = DEMO_ROUND;
  if (index >= novaFirstIndex && index < novaFirstIndex + novaEntries) return novaUserId;
  return `GP-DEMO-${String((index % (totalParticipants - 1)) + 1).padStart(5, '0')}`;
}

/** DEMO salt (public on purpose). Production salts are random 32-byte secrets kept with the entry. */
export function demoSalt(index: number): Hex {
  return keccak256(stringToHex(`GLOBAL POOL DEMO salt/round 1248/entry ${index}`));
}

export function buildDemoEntries(): DemoEntry[] {
  const entries: DemoEntry[] = [];
  for (let index = 0; index < DEMO_ROUND.totalEntries; index++) {
    const label = entryLabel(index);
    const userId = entryOwner(index);
    const entryId = encodeEntryId(label);
    const commitment = userCommitment(userId, demoSalt(index));
    entries.push({
      index,
      label,
      userId,
      entryId,
      userCommitment: commitment,
      leaf: entryLeaf({ index: BigInt(index), entryId, userCommitment: commitment }),
    });
  }
  return entries;
}

/** Winner-derivation vectors checked against the contract (edge cases + rejection-heavy index spaces). */
export function buildWinnerVectors(): {
  roundId: string;
  randomWord: string;
  totalEntries: string;
  count: string;
  winners: string[];
}[] {
  const cases: [bigint, bigint][] = [
    [1n, 1n],
    [13n, 13n],
    [14n, 13n],
    [100n, 100n],
    [18_640n, 13n],
    [1_000_003n, 50n],
    [(1n << 64n) - 1n, 13n],
    [(1n << 255n) + 1n, 13n], // ~50% of candidates rejected: exercises the bias-removal path
  ];
  return cases.map(([totalEntries, count], k) => {
    const randomWord = hexToBigInt(keccak256(stringToHex(`GLOBAL POOL DEMO winner vector ${k}`)));
    const roundId = BigInt(1000 + k);
    return {
      roundId: roundId.toString(),
      randomWord: randomWord.toString(),
      totalEntries: totalEntries.toString(),
      count: count.toString(),
      winners: deriveWinners(roundId, randomWord, totalEntries, count).map(String),
    };
  });
}

/** Builds the complete JSON fixture consumed by `test/MerkleFixture.t.sol`. */
export function buildFixture() {
  const r = DEMO_ROUND;
  const entries = buildDemoEntries();
  const tree = buildTree(entries.map((e) => e.leaf));
  const poolAmount = BigInt(r.totalEntries) * r.entryPrice;
  const winners = deriveWinners(
    r.roundId,
    DEMO_RANDOM_WORD,
    BigInt(r.totalEntries),
    BigInt(r.prizeSplitBps.length),
  );
  const amounts = splitPool(poolAmount, r.prizeSplitBps);

  const payoutInputs = winners.map((entryIndex, rank) => {
    const e = entries[Number(entryIndex)];
    if (!e) throw new Error(`winner index ${entryIndex} out of range`);
    const amount = amounts[rank];
    if (amount === undefined) throw new Error(`missing amount for rank ${rank}`);
    return { e, rank, amount };
  });
  const payoutLeaves = payoutInputs.map(({ e, rank, amount }) =>
    payoutLeaf({
      roundId: r.roundId,
      rank: BigInt(rank),
      entryIndex: BigInt(e.index),
      entryId: e.entryId,
      userCommitment: e.userCommitment,
      amount,
    }),
  );
  const payoutTree = buildTree(payoutLeaves);

  const sampleIndices = [
    0,
    ...Array.from({ length: r.novaEntries }, (_, i) => r.novaFirstIndex + i),
    9_320,
    r.totalEntries - 1,
  ];
  const sample = (e: DemoEntry) => ({
    index: e.index,
    label: e.label,
    userId: e.userId,
    entryId: e.entryId,
    userCommitment: e.userCommitment,
    leaf: e.leaf,
    proof: tree.getProof(e.index),
  });

  return {
    notice:
      'DEMO DATA — synthetic GLOBAL POOL round #1,248 for tests. Not real users, salts, randomness or funds. Generated by scripts/build-fixture.ts; do not edit by hand.',
    round: {
      roundId: Number(r.roundId),
      openedAt: Number(r.openedAt),
      closesAt: Number(r.closesAt),
      entryPrice: r.entryPrice.toString(),
      feePerEntry: r.feePerEntry.toString(),
      minParticipants: Number(r.minParticipants),
      minPool: r.minPool.toString(),
      prizeSplitBps: [...r.prizeSplitBps],
      rulesHash: DEMO_RULES_HASH,
    },
    entries: {
      totalEntries: r.totalEntries,
      totalParticipants: new Set(entries.map((e) => e.userId)).size,
      poolAmount: poolAmount.toString(),
      platformFees: (BigInt(r.totalEntries) * r.feePerEntry).toString(),
      root: tree.root,
      sampleIndices,
      samples: sampleIndices.map((i) => {
        const e = entries[i];
        if (!e) throw new Error(`sample index ${i} out of range`);
        return sample(e);
      }),
    },
    draw: {
      randomWord: DEMO_RANDOM_WORD.toString(),
      winners: winners.map(Number),
    },
    settlement: {
      prizeAmounts: amounts.map(String),
      totalPaid: amounts.reduce((s, a) => s + a, 0n).toString(),
      payoutsRoot: payoutTree.root,
      payouts: payoutInputs.map(({ e, rank, amount }, i) => ({
        rank,
        entryIndex: e.index,
        label: e.label,
        entryId: e.entryId,
        userCommitment: e.userCommitment,
        amount: amount.toString(),
        payoutProof: payoutTree.getProof(i),
        entryProof: tree.getProof(e.index),
      })),
    },
    winnerVectors: buildWinnerVectors(),
  };
}

export type Fixture = ReturnType<typeof buildFixture>;
