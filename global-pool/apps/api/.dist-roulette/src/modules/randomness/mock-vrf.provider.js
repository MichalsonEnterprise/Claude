"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockVrfProvider = void 0;
const viem_1 = require("viem");
const node_crypto_1 = require("node:crypto");
/**
 * DEV ONLY mock VRF: fulfils immediately with word = keccak256("GP_MOCK_VRF:" + requestId). Deterministic and
 * recomputable from the stored request id, clearly labelled `mock` everywhere — never a substitute for Chainlink VRF.
 */
class MockVrfProvider {
    kind = 'mock';
    static wordFor(requestId) {
        return (0, viem_1.keccak256)((0, viem_1.stringToHex)(`GP_MOCK_VRF:${requestId}`));
    }
    request(round) {
        return Promise.resolve({
            requestId: `mock-${round.roundNumber}-${(0, node_crypto_1.randomUUID)()}`,
            network: null,
            requestTxHash: null,
            metadata: { note: 'DEV mock VRF — not verifiable on-chain' },
        });
    }
    fulfillment(request) {
        return Promise.resolve({
            randomWord: MockVrfProvider.wordFor(request.requestId),
            fulfilledAt: new Date(),
            fulfillTxHash: null,
            blockNumber: null,
            confirmations: null,
        });
    }
}
exports.MockVrfProvider = MockVrfProvider;
//# sourceMappingURL=mock-vrf.provider.js.map