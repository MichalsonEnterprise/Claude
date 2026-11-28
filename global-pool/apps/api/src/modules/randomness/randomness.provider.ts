import type { ChainKey } from '@gp/shared/chains';
import type { Hex } from 'viem';

export interface RandomnessRoundInfo {
  roundId: string;
  roundNumber: number;
  onchainRoundId: bigint;
  totalEntries: number;
}

export interface RandomnessRequestResult {
  requestId: string;
  network: ChainKey | null;
  requestTxHash: string | null;
  metadata?: Record<string, unknown>;
}

export interface RandomnessFulfillment {
  /** Request that was fulfilled, when it differs from the polled one (a VRF re-request: the first fulfilment wins). */
  requestId?: string;
  randomWord: Hex;
  fulfilledAt: Date;
  fulfillTxHash: string | null;
  blockNumber: bigint | null;
  confirmations: number | null;
}

/** Verifiable randomness source for round draws. Settlement only ever uses a fulfilled word from here. */
export interface RandomnessProvider {
  readonly kind: 'mock' | 'chainlink_vrf_v2_5';
  request(round: RandomnessRoundInfo): Promise<RandomnessRequestResult>;
  /** null while not fulfilled yet. */
  fulfillment(request: {
    requestId: string;
    round: RandomnessRoundInfo;
    requestedAt: Date;
  }): Promise<RandomnessFulfillment | null>;
}

export const RANDOMNESS_PROVIDER = Symbol('RANDOMNESS_PROVIDER');
