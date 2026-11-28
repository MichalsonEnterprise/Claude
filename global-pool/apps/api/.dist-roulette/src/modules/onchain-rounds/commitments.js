"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProof = exports.ZERO_ROOT = exports.randomSalt = void 0;
exports.rulesDocument = rulesDocument;
exports.rulesHash = rulesHash;
exports.onchainRoundParams = onchainRoundParams;
exports.buildEntryCommitments = buildEntryCommitments;
exports.proofsFor = proofsFor;
exports.buildPayouts = buildPayouts;
/**
 * Pure helpers for mirroring a round on GlobalPoolRounds (no I/O): the rules document + hash published with
 * `openRound`, the per-entry commitments and Merkle tree committed with `commitEntries`, and the payouts tree
 * recorded with `recordSettlement`. Encodings come from `@gp/contracts/verify` (the TS mirror of DrawMath.sol that
 * the forge suite proves equal to the contract), so the API cannot drift from what the chain verifies.
 */
const verify_1 = require("@gp/contracts/verify");
Object.defineProperty(exports, "verifyProof", { enumerable: true, get: function () { return verify_1.verifyProof; } });
const money_1 = require("@gp/shared/money");
const viem_1 = require("viem");
const node_crypto_1 = require("node:crypto");
const crypto_1 = require("../../common/crypto");
/** Canonical rules document (sorted-key JSON). Its keccak256 is the on-chain `rulesHash`. */
function rulesDocument(r) {
    return {
        document: 'GLOBAL POOL round rules',
        version: 1,
        demo: true,
        roundId: r.roundId.toString(),
        closesAt: Math.floor(r.closesAt.getTime() / 1000),
        currency: 'USDT (test token, 6 decimals)',
        entryPriceUnits: (0, money_1.toBaseUnits)(r.entryPrice).toString(),
        platformFeePerEntryUnits: (0, money_1.toBaseUnits)(r.feePerEntry).toString(),
        platformFeeNote: 'The platform fee is charged per entry, is never part of the pool and is not refunded.',
        minParticipants: r.minParticipants,
        minPoolUnits: (0, money_1.toBaseUnits)(r.minPool).toString(),
        prizeSplitBps: [...r.prizeSplitBps],
        winnerAlgorithm: 'GLOBAL_POOL_WINNERS_V1 (DrawMath.deriveWinners, Chainlink VRF v2.5 word)',
        entryOrder: 'qualifying entries sorted by purchase sequence; index = seq - 1',
        cancellation: 'thresholds not met: stakes refunded to Owed (fees not refunded)',
    };
}
function rulesHash(r) {
    return (0, viem_1.keccak256)((0, viem_1.stringToHex)((0, crypto_1.canonicalJson)(rulesDocument(r))));
}
/** `openRound` arguments in USDT base units (6 decimals). */
function onchainRoundParams(r) {
    return {
        roundId: r.roundId,
        closesAt: BigInt(Math.floor(r.closesAt.getTime() / 1000)),
        entryPrice: (0, money_1.toBaseUnits)(r.entryPrice),
        feePerEntry: (0, money_1.toBaseUnits)(r.feePerEntry),
        minParticipants: BigInt(r.minParticipants),
        minPool: (0, money_1.toBaseUnits)(r.minPool),
        prizeSplitBps: [...r.prizeSplitBps],
        rulesHash: rulesHash(r),
    };
}
const randomSalt = () => `0x${(0, node_crypto_1.randomBytes)(32).toString('hex')}`;
exports.randomSalt = randomSalt;
/**
 * Commitments for the canonical entry list (sorted by seq; seq must be 1..N). Salts are fresh random 32-byte
 * secrets unless `saltFor` is given (tests / fixtures). Returns the rows and the Merkle root (zero for no entries).
 */
function buildEntryCommitments(entries, saltFor = exports.randomSalt) {
    const rows = entries.map((e, index) => {
        if (e.seq !== index + 1) {
            throw new Error(`entry list must be in canonical seq order (index ${index} has seq ${e.seq})`);
        }
        const salt = saltFor(index);
        const entryIdBytes32 = (0, verify_1.encodeEntryId)(e.code);
        const commitment = (0, verify_1.userCommitment)(e.userPublicId, salt);
        return {
            entryId: e.id,
            index,
            entryIdBytes32,
            salt,
            userCommitment: commitment,
            leaf: (0, verify_1.entryLeaf)({
                index: BigInt(index),
                entryId: entryIdBytes32,
                userCommitment: commitment,
            }),
        };
    });
    const root = rows.length === 0 ? exports.ZERO_ROOT : (0, verify_1.buildTree)(rows.map((r) => r.leaf)).root;
    return { rows, root };
}
exports.ZERO_ROOT = `0x${'0'.repeat(64)}`;
/** Merkle proofs for every leaf of a tree (index order). */
function proofsFor(leaves) {
    const tree = (0, verify_1.buildTree)(leaves);
    return { root: tree.root, proofs: leaves.map((_, i) => tree.getProof(i)) };
}
/** Payouts tree for `recordSettlement` (on-chain rank = rank − 1; amounts in base units). */
function buildPayouts(roundId, payouts) {
    const withLeaves = payouts.map((p) => {
        const amountUnits = (0, money_1.toBaseUnits)(p.amount);
        return {
            ...p,
            amountUnits,
            leaf: (0, verify_1.payoutLeaf)({
                roundId,
                rank: BigInt(p.rank - 1),
                entryIndex: BigInt(p.entryIndex),
                entryId: p.entryIdBytes32,
                userCommitment: p.userCommitment,
                amount: amountUnits,
            }),
        };
    });
    const { root, proofs } = proofsFor(withLeaves.map((p) => p.leaf));
    const rows = withLeaves.map((p, i) => ({ ...p, proof: proofs[i] }));
    return { rows, root, totalUnits: rows.reduce((a, r) => a + r.amountUnits, 0n) };
}
//# sourceMappingURL=commitments.js.map