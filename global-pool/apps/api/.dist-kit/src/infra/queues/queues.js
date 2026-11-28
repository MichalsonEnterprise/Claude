"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOBS = exports.QUEUES = void 0;
/** BullMQ queue names. */
exports.QUEUES = {
    DEPOSITS: 'deposits',
    WITHDRAWALS: 'withdrawals',
    ROUNDS: 'rounds',
    EMAILS: 'emails',
};
exports.JOBS = {
    DEPOSIT_WATCH: 'deposit.watch',
    WITHDRAWAL_RISK_CHECK: 'withdrawal.risk-check',
    WITHDRAWAL_BROADCAST: 'withdrawal.broadcast',
    WITHDRAWAL_TRACK: 'withdrawal.track',
    ROUND_TICK: 'round.tick',
    ROUND_SETTLE: 'round.settle',
    EMAIL_NOTIFICATION: 'email.notification',
};
//# sourceMappingURL=queues.js.map