/**
 * Pool Dice UI maths (decision #34) — integer hundredths + the SAME rule functions the server settles with
 * (`@gp/shared/fair` → dice). Nothing here decides an outcome; it only previews odds for the bet the player sets.
 *
 *  roll 0.00–99.99 (10,000 equally likely values)
 *  over T  wins on T … 99.99        → win chance 100 − T %   (targets 2.00 – 99.99)
 *  under T wins on 0.00 … T − 0.01  → win chance T %         (targets 0.01 – 98.00)
 *  multiplier = 99 ÷ win chance, truncated to 4 dp; win chance 0.01 % – 98.00 %
 */
import { dice, type DiceCondition } from '@gp/shared/fair';
import { MoneyDecimal, money } from '@gp/shared/money';

export const DICE_MIN_CHANCE_H = 1; // 0.01 %
export const DICE_MAX_CHANCE_H = 9800; // 98.00 %
export const DICE_SPACE = 10_000;

/** '50.50' → 5050 (null when malformed). Accepts 0–2 decimals ("50", "50.5"). */
export function toHundredths(v: string): number | null {
  const m = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(v.trim());
  if (!m) return null;
  const n = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(n) ? n : null;
}

/** 5050 → '50.50' (integer formatting, no floats). */
export function fromHundredths(n: number): string {
  return dice.hundredths(n);
}

export function chanceH(targetH: number, condition: DiceCondition): number {
  return condition === 'over' ? DICE_SPACE - targetH : targetH;
}

export function targetFromChanceH(cH: number, condition: DiceCondition): number {
  return condition === 'over' ? DICE_SPACE - cH : cH;
}

/** Valid target range for a condition (hundredths). */
export function targetRange(condition: DiceCondition): { min: number; max: number } {
  return condition === 'over'
    ? { min: DICE_SPACE - DICE_MAX_CHANCE_H, max: DICE_SPACE - DICE_MIN_CHANCE_H } // 2.00 – 99.99
    : { min: DICE_MIN_CHANCE_H, max: DICE_MAX_CHANCE_H }; // 0.01 – 98.00
}

export function clampTargetH(tH: number, condition: DiceCondition): number {
  const r = targetRange(condition);
  return Math.min(r.max, Math.max(r.min, Math.round(tH)));
}

export type DiceProblem = 'malformed' | 'chance_high' | 'chance_low' | null;

export function targetProblem(tH: number | null, condition: DiceCondition): DiceProblem {
  if (tH === null || tH < 0 || tH > 9999) return 'malformed';
  const c = chanceH(tH, condition);
  if (c > DICE_MAX_CHANCE_H) return 'chance_high';
  if (c < DICE_MIN_CHANCE_H) return 'chance_low';
  return null;
}

export function targetProblemMessage(p: DiceProblem, condition: DiceCondition): string | null {
  const r = targetRange(condition);
  switch (p) {
    case null:
      return null;
    case 'malformed':
      return 'Enter a target like 50.50 (0.00 – 99.99).';
    case 'chance_high':
      return `Max win chance is 98.00% (1.0102×). Set the target to ${fromHundredths(condition === 'over' ? r.min : r.max)} or ${condition === 'over' ? 'higher' : 'lower'}.`;
    case 'chance_low':
      return `Min win chance is 0.01% (9,900.0000×). Set the target to ${fromHundredths(condition === 'over' ? r.max : r.min)} or ${condition === 'over' ? 'lower' : 'higher'}.`;
  }
}

/** Published multiplier for a valid target (the server's own function): '1.9603'. */
export function multiplierOf(tH: number, condition: DiceCondition): string {
  return dice.diceMultiplier({ target: fromHundredths(tH), condition });
}

/** Win chance in percent with 2 dp: '49.50'. */
export function chanceString(tH: number, condition: DiceCondition): string {
  return fromHundredths(chanceH(tH, condition));
}

/** Target for a typed win chance ('49.5' → over 50.50). Null when malformed. */
export function targetFromChanceInput(v: string, condition: DiceCondition): number | null {
  const c = toHundredths(v);
  if (c === null) return null;
  return targetFromChanceH(c, condition);
}

/** Target for a typed multiplier: chance = 99 ÷ m rounded half-up to 0.01 %, then clamped to the valid range. */
export function targetFromMultiplierInput(v: string, condition: DiceCondition): number | null {
  const s = v.trim().replace(/×$/, '');
  if (!/^\d{1,4}(\.\d{0,4})?$/.test(s)) return null;
  const m = money(s.endsWith('.') ? s.slice(0, -1) : s);
  if (m.lte(1)) return null;
  const cH = money(9900).div(m).toDecimalPlaces(0, MoneyDecimal.ROUND_HALF_UP).toNumber();
  const clamped = Math.min(DICE_MAX_CHANCE_H, Math.max(DICE_MIN_CHANCE_H, cH));
  return targetFromChanceH(clamped, condition);
}

/** Winning and losing zones (inclusive hundredths) and their sizes. */
export function zones(tH: number, condition: DiceCondition) {
  const win = condition === 'over' ? [tH, 9999] : [0, tH - 1];
  const lose = condition === 'over' ? [0, tH - 1] : [tH, 9999];
  return {
    win: { from: win[0]!, to: win[1]!, count: Math.max(0, win[1]! - win[0]! + 1) },
    lose: { from: lose[0]!, to: lose[1]!, count: Math.max(0, lose[1]! - lose[0]! + 1) },
  };
}

/** Did `rollH` win for this bet? (same rule as the server). */
export function isWin(rollH: number, tH: number, condition: DiceCondition): boolean {
  return condition === 'over' ? rollH >= tH : rollH < tH;
}

/** "Over 50.50" / "Under 25.00" */
export function conditionLabel(condition: DiceCondition, target: string): string {
  return `${condition === 'over' ? 'Over' : 'Under'} ${target}`;
}
