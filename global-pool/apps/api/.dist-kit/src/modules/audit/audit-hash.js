"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENESIS_HASH = void 0;
exports.auditHash = auditHash;
exports.verifyChain = verifyChain;
const crypto_1 = require("../../common/crypto");
exports.GENESIS_HASH = '0'.repeat(64);
/** hash = sha256(prevHash + "\n" + canonical JSON of the row content). Changing any field breaks the chain. */
function auditHash(row) {
    // Pick the hashed fields explicitly: DB rows carry extra columns (id, seq, hash, ip, request id …).
    const content = {
        actorType: row.actorType,
        actorId: row.actorId,
        actorLabel: row.actorLabel,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        outcome: row.outcome,
        metadata: row.metadata,
        createdAt: row.createdAt,
    };
    return (0, crypto_1.sha256Hex)(`${row.prevHash}\n${(0, crypto_1.canonicalJson)(content)}`);
}
/** Verify a contiguous, seq-ordered slice of the chain starting from `expectedPrev`. */
function verifyChain(rows, expectedPrev = exports.GENESIS_HASH) {
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
//# sourceMappingURL=audit-hash.js.map