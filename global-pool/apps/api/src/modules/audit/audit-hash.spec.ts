import { describe, expect, it } from 'vitest';

import { GENESIS_HASH, auditHash, verifyChain, type ChainRow } from './audit-hash';

function chain(n: number): ChainRow[] {
  const rows: ChainRow[] = [];
  let prev = GENESIS_HASH;
  for (let i = 0; i < n; i++) {
    const row = {
      prevHash: prev,
      actorType: 'admin',
      actorId: 'a1',
      actorLabel: 'A. Marin',
      action: 'withdrawal.reject',
      targetType: 'withdrawal',
      targetId: `w${i}`,
      reason: 'sanctions screening',
      outcome: 'success',
      metadata: { amount: '1500.00', nested: { b: 2, a: 1 } },
      createdAt: new Date(Date.UTC(2026, 10, 27, 18, 42, i)),
    };
    const hash = auditHash(row);
    rows.push({ ...row, seq: BigInt(i + 1), hash });
    prev = hash;
  }
  return rows;
}

describe('hash-chained audit log', () => {
  it('verifies an intact chain', () => {
    expect(verifyChain(chain(5))).toMatchObject({ ok: true, checked: 5 });
  });

  it('is independent of JSON key order (canonical JSON)', () => {
    const [row] = chain(1);
    expect(auditHash({ ...row!, metadata: { nested: { a: 1, b: 2 }, amount: '1500.00' } })).toBe(
      row!.hash,
    );
  });

  it('detects edited content and broken links', () => {
    const edited = chain(4);
    edited[2] = { ...edited[2]!, reason: 'changed later' };
    expect(verifyChain(edited)).toMatchObject({
      ok: false,
      firstBrokenSeq: '3',
      problem: 'row content does not match its hash',
    });

    const removed = chain(4);
    removed.splice(1, 1);
    expect(verifyChain(removed)).toMatchObject({
      ok: false,
      firstBrokenSeq: '3',
      problem: 'prev_hash does not match the previous row',
    });
  });
});
