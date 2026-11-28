"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectionError = exports.DEFAULT_PRIZE_SPLIT_BPS = exports.BPS_DENOMINATOR = exports.WINNERS_DOMAIN = void 0;
exports.deriveWinnerIndices = deriveWinnerIndices;
exports.validatePrizeSplit = validatePrizeSplit;
exports.splitPool = splitPool;
exports.tierForRank = tierForRank;
exports.selectWinners = selectWinners;
const money_1 = require("@gp/shared/money");
const viem_1 = require("viem");
exports.WINNERS_DOMAIN = (0, viem_1.keccak256)((0, viem_1.stringToHex)('GLOBAL_POOL_WINNERS_V1'));
exports.BPS_DENOMINATOR = 10000n;
/** 1st 50% · 2nd 20% · 3rd 10% · 10 × runner-up 2% (PRIZE_DISTRIBUTION in @gp/shared/pool). */
exports.DEFAULT_PRIZE_SPLIT_BPS = [
    5000,
    2000,
    1000,
    ...Array(10).fill(200),
];
const TWO_256 = 1n << 256n;
class SelectionError extends Error {
    name = 'SelectionError';
}
exports.SelectionError = SelectionError;
function deriveWinnerIndices(roundId, randomWord, totalEntries, count) {
    if (totalEntries <= 0n)
        throw new SelectionError('no entries');
    if (count <= 0n || count > totalEntries)
        throw new SelectionError(`invalid winner count ${count} for ${totalEntries} entries`);
    if (randomWord < 0n || randomWord >= TWO_256)
        throw new SelectionError('random word out of uint256 range');
    const threshold = TWO_256 % totalEntries;
    const winners = [];
    const seen = new Set();
    for (let nonce = 0n; BigInt(winners.length) < count; nonce++) {
        const candidate = (0, viem_1.hexToBigInt)((0, viem_1.keccak256)((0, viem_1.encodeAbiParameters)([{ type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], [exports.WINNERS_DOMAIN, roundId, randomWord, nonce])));
        if (candidate < threshold)
            continue;
        const index = candidate % totalEntries;
        if (seen.has(index))
            continue;
        seen.add(index);
        winners.push(index);
    }
    return winners;
}
function validatePrizeSplit(bps) {
    if (bps.length === 0)
        throw new SelectionError('empty prize split');
    if (bps.some((b) => !Number.isInteger(b) || b <= 0))
        throw new SelectionError('prize split must be positive integers');
    if (bps.reduce((a, b) => a + b, 0) !== Number(exports.BPS_DENOMINATOR))
        throw new SelectionError('prize split must sum to 10000 bps');
}
/** Mirror of DrawMath.splitPool (base units). */
function splitPool(pool, bps) {
    const amounts = bps.map((b, i) => (i === 0 ? 0n : (pool * BigInt(b)) / exports.BPS_DENOMINATOR));
    const rest = amounts.reduce((sum, a) => sum + a, 0n);
    if (amounts.length > 0)
        amounts[0] = pool - rest;
    return amounts;
}
function tierForRank(rank) {
    return rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : 'runner_up';
}
/**
 * Select winners for a round from its VRF word and canonical entry list (must be sorted by seq, seq = 1..N).
 * When a round has fewer entries than prizes, only the first `entries` ranks are drawn and the 1st prize absorbs
 * the undrawn shares (the split is computed over the drawn ranks only).
 */
function selectWinners(input) {
    const bps = input.prizeSplitBps ?? exports.DEFAULT_PRIZE_SPLIT_BPS;
    validatePrizeSplit(bps);
    const n = input.entries.length;
    input.entries.forEach((e, i) => {
        if (e.seq !== i + 1)
            throw new SelectionError(`entry list must be the canonical seq order (index ${i} has seq ${e.seq})`);
    });
    const count = Math.min(bps.length, n);
    const indices = deriveWinnerIndices(input.roundId, (0, viem_1.hexToBigInt)(input.randomWord), BigInt(n), BigInt(count));
    const drawnBps = bps.slice(0, count);
    const missing = bps.slice(count).reduce((a, b) => a + b, 0);
    if (drawnBps.length > 0)
        drawnBps[0] = drawnBps[0] + missing;
    const amounts = splitPool((0, money_1.toBaseUnits)(input.pool), drawnBps);
    return indices.map((idx, i) => {
        const entry = input.entries[Number(idx)];
        return {
            rank: i + 1,
            tier: tierForRank(i + 1),
            entryIndex: Number(idx),
            entrySeq: entry.seq,
            entryId: entry.entryId,
            userId: entry.userId,
            amount: (0, money_1.toUSDTString)((0, money_1.fromBaseUnits)(amounts[i])),
        };
    });
}
//# sourceMappingURL=selection.js.map