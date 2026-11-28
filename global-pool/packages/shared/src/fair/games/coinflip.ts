/**
 * Double Side (coinflip). Two outcomes, 50.00 % each, a correct call pays 1.96× (house edge 2.00 % = 1 − 0.5 × 1.96).
 * PF (published in the CF-05 verifier): x = first 4 bytes / 2³²; Heads if x < 0.5, else Tails — computed exactly as
 * `u32 < 2³¹`. The pick never influences the side.
 */
import { creditString, payoutOf } from '../credits';
import { ByteStream, FairError, type SeedInput } from '../stream';

export const COINFLIP_RULES = { houseEdgePercent: '2.00', multiplier: '1.96' } as const;

export type CoinSide = 'heads' | 'tails';
export interface CoinflipParams {
  pick: CoinSide;
}
export interface CoinflipOutcome {
  side: CoinSide;
  pick: CoinSide;
  /** First 4 bytes as an integer (for the verifier's "Scale" step). */
  u32: number;
  multiplier: string;
  win: boolean;
}

export function coinSide(seed: SeedInput): { side: CoinSide; u32: number } {
  const u32 = new ByteStream(seed).nextU32();
  return { side: u32 < 2_147_483_648 ? 'heads' : 'tails', u32 };
}

export function playCoinflip(seed: SeedInput, params: CoinflipParams): CoinflipOutcome {
  if (params.pick !== 'heads' && params.pick !== 'tails') {
    throw new FairError('Pick heads or tails', 'INVALID_PARAMS');
  }
  const { side, u32 } = coinSide(seed);
  return { side, pick: params.pick, u32, multiplier: COINFLIP_RULES.multiplier, win: side === params.pick };
}

export function coinflipPayout(stake: string, outcome: CoinflipOutcome): string {
  return creditString(outcome.win ? payoutOf(stake, outcome.multiplier) : 0);
}
