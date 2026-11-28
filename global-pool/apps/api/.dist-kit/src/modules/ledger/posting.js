"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_BUCKET_TYPES = exports.LedgerError = void 0;
exports.isUserBucket = isUserBucket;
exports.accountCode = accountCode;
exports.normalizePosting = normalizePosting;
exports.sumLines = sumLines;
exports.entryPurchaseLines = entryPurchaseLines;
exports.depositDetectedLines = depositDetectedLines;
exports.depositReversedLines = depositReversedLines;
exports.depositCreditedLines = depositCreditedLines;
exports.withdrawalLockLines = withdrawalLockLines;
exports.withdrawalReleaseLines = withdrawalReleaseLines;
exports.withdrawalSettleLines = withdrawalSettleLines;
exports.roundSettlementLines = roundSettlementLines;
exports.prizeAwardLines = prizeAwardLines;
exports.roundRefundLines = roundRefundLines;
exports.owedClaimLines = owedClaimLines;
const enums_1 = require("@gp/shared/enums");
const money_1 = require("@gp/shared/money");
class LedgerError extends Error {
    code;
    name = 'LedgerError';
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.LedgerError = LedgerError;
exports.USER_BUCKET_TYPES = [
    enums_1.LedgerAccountType.USER_AVAILABLE,
    enums_1.LedgerAccountType.USER_LOCKED,
    enums_1.LedgerAccountType.USER_PENDING,
    enums_1.LedgerAccountType.USER_OWED,
];
function isUserBucket(ref) {
    return exports.USER_BUCKET_TYPES.includes(ref.type);
}
const BUCKET_SUFFIX = {
    user_available: 'available',
    user_locked: 'locked',
    user_pending: 'pending',
    user_owed: 'owed',
};
/** Stable account code: user:<uuid>:available, pool:<round uuid>, fees, chain_clearing:arbitrum … */
function accountCode(ref) {
    if (isUserBucket(ref)) {
        if (!ref.userId)
            throw new LedgerError('INVALID_ACCOUNT', `${ref.type} needs a userId`);
        return `user:${ref.userId}:${BUCKET_SUFFIX[ref.type]}`;
    }
    switch (ref.type) {
        case 'pool':
            if (!ref.roundId)
                throw new LedgerError('INVALID_ACCOUNT', 'pool account needs a roundId');
            return `pool:${ref.roundId}`;
        case 'chain_clearing':
            return `chain_clearing:${ref.network}`;
        case 'fees':
        case 'prize_liability':
        case 'refunds':
        case 'operator_revenue':
            return ref.type;
    }
}
/** Validate + normalise posting lines. Throws LedgerError when the posting is not a valid double entry. */
function normalizePosting(lines) {
    if (lines.length < 2) {
        throw new LedgerError('TOO_FEW_LINES', 'A posting needs at least two lines');
    }
    let total = new money_1.MoneyDecimal(0);
    const out = lines.map((line) => {
        let amount;
        try {
            amount = (0, money_1.parseUSDT)(line.amount);
        }
        catch (err) {
            throw new LedgerError('PRECISION', err.message);
        }
        if (amount.isZero())
            throw new LedgerError('ZERO_LINE', 'Posting lines must be non-zero');
        total = total.plus(amount);
        const owner = line.userId ?? (isUserBucket(line.account) ? line.account.userId : null);
        return {
            account: line.account,
            code: accountCode(line.account),
            amount: (0, money_1.toUSDTString)(amount),
            userId: owner ?? null,
        };
    });
    if (!total.isZero()) {
        throw new LedgerError('UNBALANCED', `Posting is unbalanced by ${total.toFixed()} USDT`);
    }
    return out;
}
/** Σ of signed amounts (for assertions / reconciliation). */
function sumLines(lines) {
    return (0, money_1.toUSDTString)(lines.reduce((acc, l) => acc.plus((0, money_1.parseUSDT)(l.amount)), new money_1.MoneyDecimal(0)));
}
/** Entry purchase: AVAILABLE −(entries + fee) → POOL(round) +entries, FEES +fee (fee never enters the pool). */
function entryPurchaseLines(userId, roundId, q) {
    const entry = (0, money_1.parseUSDT)(q.entryAmount);
    const fee = (0, money_1.parseUSDT)(q.platformFee);
    const lines = [
        { account: { type: 'user_available', userId }, amount: entry.plus(fee).negated() },
        { account: { type: 'pool', roundId }, amount: entry, userId },
    ];
    if (!fee.isZero())
        lines.push({ account: { type: 'fees' }, amount: fee, userId });
    return lines;
}
/** Deposit detected on-chain: CHAIN_CLEARING(network) −amount → PENDING +amount. */
function depositDetectedLines(userId, network, amount) {
    const a = (0, money_1.parseUSDT)(amount);
    return [
        { account: { type: 'chain_clearing', network }, amount: a.negated(), userId },
        { account: { type: 'user_pending', userId }, amount: a },
    ];
}
/**
 * A detected deposit left the canonical chain (re-org) or reverted before it was credited: PENDING −amount →
 * CHAIN_CLEARING +amount — the exact inverse of `depositDetectedLines` (the ledger mirrors the chain).
 */
function depositReversedLines(userId, network, amount) {
    const a = (0, money_1.parseUSDT)(amount);
    return [
        { account: { type: 'user_pending', userId }, amount: a.negated() },
        { account: { type: 'chain_clearing', network }, amount: a, userId },
    ];
}
/** Deposit reached the required confirmations: PENDING −amount → AVAILABLE +amount. */
function depositCreditedLines(userId, amount) {
    const a = (0, money_1.parseUSDT)(amount);
    return [
        { account: { type: 'user_pending', userId }, amount: a.negated() },
        { account: { type: 'user_available', userId }, amount: a },
    ];
}
/** Withdrawal requested: AVAILABLE −amount → LOCKED +amount. */
function withdrawalLockLines(userId, amount) {
    const a = (0, money_1.parseUSDT)(amount);
    return [
        { account: { type: 'user_available', userId }, amount: a.negated() },
        { account: { type: 'user_locked', userId }, amount: a },
    ];
}
/** Withdrawal rejected / failed / cancelled: LOCKED −amount → AVAILABLE +amount (no fee charged). */
function withdrawalReleaseLines(userId, amount) {
    const a = (0, money_1.parseUSDT)(amount);
    return [
        { account: { type: 'user_locked', userId }, amount: a.negated() },
        { account: { type: 'user_available', userId }, amount: a },
    ];
}
/**
 * Withdrawal confirmed on-chain: LOCKED −amount → CHAIN_CLEARING +net (left custody) and OPERATOR_REVENUE
 * +networkFee (recovers the gas the hot wallet paid). Platform withdrawal fee is 0.00.
 */
function withdrawalSettleLines(userId, network, amounts) {
    const amount = (0, money_1.parseUSDT)(amounts.amount);
    const networkFee = (0, money_1.parseUSDT)(amounts.networkFee);
    const platformFee = (0, money_1.parseUSDT)(amounts.platformFee);
    const net = amount.minus(networkFee).minus(platformFee);
    const lines = [
        { account: { type: 'user_locked', userId }, amount: amount.negated() },
    ];
    if (!net.isZero())
        lines.push({ account: { type: 'chain_clearing', network }, amount: net, userId });
    if (!networkFee.isZero())
        lines.push({ account: { type: 'operator_revenue' }, amount: networkFee, userId });
    if (!platformFee.isZero())
        lines.push({ account: { type: 'fees' }, amount: platformFee, userId });
    return lines;
}
/** Move a settled round's pool into PRIZE_LIABILITY (the pool account goes to zero). */
function roundSettlementLines(roundId, pool) {
    const p = (0, money_1.parseUSDT)(pool);
    return [
        { account: { type: 'pool', roundId }, amount: p.negated() },
        { account: { type: 'prize_liability' }, amount: p },
    ];
}
/** Award prizes from PRIZE_LIABILITY to each winner's OWED bucket. */
function prizeAwardLines(awards) {
    const total = awards.reduce((acc, a) => acc.plus((0, money_1.parseUSDT)(a.amount)), new money_1.MoneyDecimal(0));
    return [
        { account: { type: 'prize_liability' }, amount: total.negated() },
        ...awards.map((a) => ({
            account: { type: 'user_owed', userId: a.userId },
            amount: (0, money_1.parseUSDT)(a.amount),
        })),
    ];
}
/** Cancelled round: each player's stake leaves POOL(round) and is owed back (refunds clearing account). */
function roundRefundLines(roundId, refunds) {
    const lines = [];
    for (const r of refunds) {
        const a = (0, money_1.parseUSDT)(r.amount);
        lines.push({ account: { type: 'pool', roundId }, amount: a.negated(), userId: r.userId });
        lines.push({ account: { type: 'refunds' }, amount: a, userId: r.userId });
        lines.push({ account: { type: 'refunds' }, amount: a.negated(), userId: r.userId });
        lines.push({ account: { type: 'user_owed', userId: r.userId }, amount: a });
    }
    return lines;
}
/** Claim everything owed: OWED −amount → AVAILABLE +amount. */
function owedClaimLines(userId, amount) {
    const a = (0, money_1.parseUSDT)(amount);
    return [
        { account: { type: 'user_owed', userId }, amount: a.negated() },
        { account: { type: 'user_available', userId }, amount: a },
    ];
}
//# sourceMappingURL=posting.js.map