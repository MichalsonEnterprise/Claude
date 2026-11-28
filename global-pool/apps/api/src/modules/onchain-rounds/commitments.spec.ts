import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fromBaseUnits, toUSDTString } from '@gp/shared/money';
import { keccak256, stringToHex, type Hex } from 'viem';
import { describe, expect, it } from 'vitest';

import {
  ZERO_ROOT,
  buildEntryCommitments,
  buildPayouts,
  onchainRoundParams,
  rulesHash,
  verifyProof,
} from './commitments';

const fixtureFile = resolve(
  __dirname,
  '../../../../../packages/contracts/test/fixtures/round-1248.json',
);

interface Fixture {
  entries: { totalEntries: number; root: string };
  settlement: {
    payoutsRoot: string;
    payouts: {
      rank: number;
      entryIndex: number;
      entryId: Hex;
      userCommitment: Hex;
      amount: string;
    }[];
  };
}

/** Same synthetic data as packages/contracts/scripts/lib/demo-round.ts (DEMO only). */
const demoOwner = (index: number) =>
  index >= 980 && index < 1015
    ? 'GP-48213'
    : `GP-DEMO-${String((index % 3411) + 1).padStart(5, '0')}`;
const demoSalt = (index: number): Hex =>
  keccak256(stringToHex(`GLOBAL POOL DEMO salt/round 1248/entry ${index}`));

describe('round commitments (mirror of GlobalPoolRounds encodings)', () => {
  it('rebuilds the contract fixture entries root for DEMO round #1,248 (18,640 entries)', () => {
    if (!existsSync(fixtureFile)) return;
    const fixture = JSON.parse(readFileSync(fixtureFile, 'utf8')) as Fixture;
    const entries = Array.from({ length: fixture.entries.totalEntries }, (_, i) => ({
      id: `entry-${i}`,
      seq: i + 1,
      code: `E-1248-${String(i + 1).padStart(5, '0')}`,
      userPublicId: demoOwner(i),
    }));
    const { rows, root } = buildEntryCommitments(entries, demoSalt);
    expect(root).toBe(fixture.entries.root);
    expect(rows[980]).toMatchObject({ index: 980, entryId: 'entry-980' });

    const payouts = buildPayouts(
      1248n,
      fixture.settlement.payouts.map((p) => ({
        rank: p.rank + 1,
        entryIndex: p.entryIndex,
        entryIdBytes32: p.entryId,
        userCommitment: p.userCommitment,
        amount: toUSDTString(fromBaseUnits(p.amount)),
      })),
    );
    expect(payouts.root).toBe(fixture.settlement.payoutsRoot);
    expect(payouts.totalUnits).toBe(186_400_000_000n);
    for (const p of payouts.rows) expect(verifyProof(payouts.root, p.leaf, p.proof)).toBe(true);
  }, 60_000); // 18,640 keccak leaves + tree: ~3 s alone, slower when the suite runs in parallel

  it('uses fresh random salts, rejects a non-canonical order and commits zero entries as the zero root', () => {
    const entries = [1, 2, 3].map((seq) => ({
      id: `e${seq}`,
      seq,
      code: `E-7-${String(seq).padStart(5, '0')}`,
      userPublicId: 'GP-1',
    }));
    const a = buildEntryCommitments(entries);
    const b = buildEntryCommitments(entries);
    expect(a.rows[0]!.salt).not.toBe(b.rows[0]!.salt);
    expect(a.root).not.toBe(b.root);
    expect(() => buildEntryCommitments([entries[1]!, entries[0]!])).toThrow(/canonical seq/);
    expect(buildEntryCommitments([]).root).toBe(ZERO_ROOT);
  });

  it('derives openRound params in base units and a stable rules hash', () => {
    const rules = {
      roundId: 1248n,
      closesAt: new Date('2026-11-27T20:00:00Z'),
      entryPrice: '10.00',
      feePerEntry: '0.05',
      minParticipants: 500,
      minPool: '50000.00',
      prizeSplitBps: [5000, 2000, 1000, ...Array<number>(10).fill(200)],
    };
    const p = onchainRoundParams(rules);
    expect(p).toMatchObject({
      roundId: 1248n,
      closesAt: 1795809600n,
      entryPrice: 10_000_000n,
      feePerEntry: 50_000n,
      minParticipants: 500n,
      minPool: 50_000_000_000n,
    });
    expect(p.rulesHash).toBe(rulesHash(rules));
    expect(rulesHash({ ...rules, minParticipants: 501 })).not.toBe(p.rulesHash);
  });
});
