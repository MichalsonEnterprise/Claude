import { canonicalJson, sha256Hex } from '../../common/crypto';

export const GENESIS_HASH = '0'.repeat(64);

export interface AuditHashInput {
  prevHash: string;
  actorType: string;
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  outcome: string;
  metadata: unknown;
  createdAt: Date;
}

/** hash = sha256(prevHash + "\n" + canonical JSON of the row content). Changing any field breaks the chain. */
export function auditHash(row: AuditHashInput): string {
  const { prevHash, ...content } = row;
  return sha256Hex(`${prevHash}\n${canonicalJson(content)}`);
}

export interface ChainRow extends AuditHashInput {
  seq: bigint;
  hash: string;
}

export interface ChainVerification {
  ok: boolean;
  checked: number;
  headHash: string;
  firstBrokenSeq: string | null;
  problem: string | null;
}

/** Verify a contiguous, seq-ordered slice of the chain starting from `expectedPrev`. */
export function verifyChain(rows: readonly ChainRow[], expectedPrev = GENESIS_HASH): ChainVerification {
  let prev = expectedPrev;
  for (const row of rows) {
    if (row.prevHash !== prev) {
      return {
        ok: false,
        checked: rows.indexOf(row),
        headHash: prev,
        firstBrokenSeq: row.seq.toString(),
        problem: 'prev_hash does not match the previous row',
      };
    }
    const recomputed = auditHash(row);
    if (recomputed !== row.hash) {
      return {
        ok: false,
        checked: rows.indexOf(row),
        headHash: prev,
        firstBrokenSeq: row.seq.toString(),
        problem: 'row content does not match its hash',
      };
    }
    prev = row.hash;
  }
  return { ok: true, checked: rows.length, headHash: prev, firstBrokenSeq: null, problem: null };
}
