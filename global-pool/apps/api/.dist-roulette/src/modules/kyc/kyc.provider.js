"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockKycProvider = void 0;
const node_crypto_1 = require("node:crypto");
/** Mock provider: creates a pending check; DEMO builds can approve it via POST /dev/kyc/approve. */
class MockKycProvider {
    name = 'mock';
    startVerification() {
        return Promise.resolve({
            provider: this.name,
            providerRef: `mock-kyc-${(0, node_crypto_1.randomUUID)()}`,
            redirectUrl: null,
        });
    }
}
exports.MockKycProvider = MockKycProvider;
//# sourceMappingURL=kyc.provider.js.map