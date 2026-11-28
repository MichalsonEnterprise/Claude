/**
 * Pool Dice (decision #34). Roll 0.00–99.99 (10,000 equally likely values).
 * - Roll over T wins on T … 99.99 → win chance 100 − T %;  roll under T wins on 0.00 … T − 0.01 → win chance T %.
 * - Multiplier = 99 ÷ win chance, truncated to 4 decimals (1.00% house edge; truncation never pays more).
 * - Win chance 0.01 % – 98.00 % (over 2.00 – 99.99, under 0.01 – 98.00); bet 0.10 – 1,000.00.
 * PF: roll = uniformInt(0, 9999) / 100 on the byte stream.
 */
import { money, type Money } from '../../money';
import { creditString, multiplierString, payoutOf } from '../credits';
import { ByteStream, FairError, uniformInt, type SeedInput } from '../stream';

export const DICE_RULES = {
  houseEdgePercent: '1.00',
  minChance: '0.01',
  maxChance: '98.00',
  multiplierDecimals: 4,
} as const;

export type DiceCondition = 'over' | 'under';
export interface DiceParams {
  /** Target with exactly two decimals, e.g. '50.50'. */
  target: string;
  condition: DiceCondition;
}
export interface DiceOutcome {
  roll: string;
  target: string;
  condition: DiceCondition;
  winChance: string;
  multiplier: string;
  win: boolean;
}

const TARGET = /^\d{1,2}\.\d{2}$/;

export function diceWinChance(params: DiceParams): Money {
  if (!TARGET.test(params.target))
    throw new FairError('Target must look like 50.50', 'INVALID_PARAMS');
  const t = money(params.target);
  if (params.condition !== 'over' && params.condition !== 'under') {
    throw new FairError('Condition must be over or under', 'INVALID_PARAMS');
  }
  const chance = params.condition === 'over' ? money(100).minus(t) : t;
  if (chance.lt(DICE_RULES.minChance) || chance.gt(DICE_RULES.maxChance)) {
    throw new FairError('Win chance must be between 0.01% and 98.00%', 'OUT_OF_RANGE');
  }
  return chance;
}

/** 99 ÷ win chance, truncated to 4 decimals ('1.9603' for 50.50 %). */
export function diceMultiplier(params: DiceParams): string {
  return multiplierString(money(99).div(diceWinChance(params)), DICE_RULES.multiplierDecimals);
}

/** Raw roll in hundredths (0 … 9999). */
export function diceRollInt(seed: SeedInput): number {
  return uniformInt(new ByteStream(seed), 0, 9999);
}

export function playDice(seed: SeedInput, params: DiceParams): DiceOutcome {
  const chance = diceWinChance(params);
  const rollInt = diceRollInt(seed);
  const targetInt = money(params.target).times(100).toNumber();
  const win = params.condition === 'over' ? rollInt >= targetInt : rollInt < targetInt;
  return {
    roll: hundredths(rollInt),
    target: params.target,
    condition: params.condition,
    winChance: chance.toFixed(2),
    multiplier: diceMultiplier(params),
    win,
  };
}

/** Integer hundredths → '73.21' (no float formatting). */
export function hundredths(n: number): string {
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
}

export function dicePayout(stake: string, outcome: DiceOutcome): string {
  return creditString(outcome.win ? payoutOf(stake, outcome.multiplier) : 0);
}
