import { keccak256, stringToHex, type Hex } from 'viem';
import { randomUUID } from 'node:crypto';

import type {
  RandomnessFulfillment,
  RandomnessProvider,
  RandomnessRequestResult,
  RandomnessRoundInfo,
} from './randomness.provider';

/**
 * DEV ONLY mock VRF: fulfils immediately with word = keccak256("GP_MOCK_VRF:" + requestId). Deterministic and
 * recomputable from the stored request id, clearly labelled `mock` everywhere — never a substitute for Chainlink VRF.
 */
export class MockVrfProvider implements RandomnessProvider {
  readonly kind = 'mock' as const;

  static wordFor(requestId: string): Hex {
    return keccak256(stringToHex(`GP_MOCK_VRF:${requestId}`));
  }

  request(round: RandomnessRoundInfo): Promise<RandomnessRequestResult> {
    return Promise.resolve({
      requestId: `mock-${round.roundNumber}-${randomUUID()}`,
      network: null,
      requestTxHash: null,
      metadata: { note: 'DEV mock VRF — not verifiable on-chain' },
    });
  }

  fulfillment(request: { requestId: string }): Promise<RandomnessFulfillment> {
    return Promise.resolve({
      randomWord: MockVrfProvider.wordFor(request.requestId),
      fulfilledAt: new Date(),
      fulfillTxHash: null,
      blockNumber: null,
      confirmations: null,
    });
  }
}
