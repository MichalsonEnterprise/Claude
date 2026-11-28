"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAmlProvider = exports.LARGE_WITHDRAWAL_REVIEW = exports.DEMO_SANCTIONED_ADDRESSES = void 0;
const money_1 = require("@gp/shared/money");
/** DEMO sanctions list — obviously fake addresses used to exercise the rejection path. */
exports.DEMO_SANCTIONED_ADDRESSES = new Set([
    '0x000000000000000000000000000000000000dead',
    '0xa41c00000000000000000000000000000000d2e0',
]);
exports.LARGE_WITHDRAWAL_REVIEW = '10000.00';
/**
 * Deterministic mock screening (6 checks, like the WD-20931 design): sanctions list, address format, destination
 * history, velocity, amount threshold, account age.
 */
class MockAmlProvider {
    name = 'mock';
    screenWithdrawal(input) {
        const sanctioned = exports.DEMO_SANCTIONED_ADDRESSES.has(input.address.toLowerCase());
        const large = (0, money_1.gte)(input.amount, exports.LARGE_WITHDRAWAL_REVIEW);
        const velocity = input.withdrawalsLast24h >= 5;
        const youngAccount = input.accountAgeDays < 1;
        const checks = [
            { name: 'sanctions_screening', passed: !sanctioned },
            { name: 'address_format', passed: true },
            {
                name: 'destination_history',
                passed: !input.newDestination,
                detail: input.whitelisted ? 'whitelisted' : 'not whitelisted',
            },
            { name: 'velocity', passed: !velocity },
            { name: 'amount_threshold', passed: !large },
            { name: 'account_age', passed: !youngAccount },
        ];
        const flags = checks.filter((c) => !c.passed).map((c) => c.name);
        if (sanctioned) {
            return Promise.resolve({
                provider: this.name,
                riskLevel: 'critical',
                decision: 'reject',
                flags,
                checks,
                reason: 'Destination flagged by sanctions screening',
            });
        }
        const review = input.newDestination || large || velocity;
        return Promise.resolve({
            provider: this.name,
            riskLevel: large || velocity ? 'high' : review ? 'medium' : 'low',
            decision: review ? 'review' : 'approve',
            flags,
            checks,
            reason: review
                ? input.newDestination
                    ? 'Routine AML screening for new destinations — usually under 4 h'
                    : 'Manual review required'
                : null,
        });
    }
}
exports.MockAmlProvider = MockAmlProvider;
//# sourceMappingURL=aml.provider.js.map