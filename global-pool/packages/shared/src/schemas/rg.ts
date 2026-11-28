import { z } from 'zod';

import { RG_PERIODS, SELF_EXCLUSION_DURATIONS, type RgLimitType } from '../enums';
import { positiveUsdtAmountSchema } from './common';

/**
 * Set a responsible-gaming limit. Decreases apply immediately; increases take effect after the 24 h cool-down
 * (RG_LIMIT_INCREASE_COOLDOWN_HOURS) — enforced server-side.
 */
export const rgLimitUpdateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['deposit', 'participation', 'loss'] as const satisfies readonly RgLimitType[]),
    period: z.enum(RG_PERIODS),
    amount: positiveUsdtAmountSchema,
  }),
  z.object({
    type: z.literal('session_time'),
    period: z.literal('day'),
    minutes: z
      .number()
      .int()
      .min(15)
      .max(24 * 60),
  }),
]);
export type RgLimitUpdate = z.infer<typeof rgLimitUpdateSchema>;

/** Reality-check reminder interval. */
export const realityCheckSchema = z.object({
  intervalMinutes: z.number().int().min(15).max(240),
});

/** Self-exclusion: always honoured immediately, never obstructed; requires explicit confirmation. */
export const selfExclusionSchema = z.object({
  duration: z.enum(SELF_EXCLUSION_DURATIONS),
  confirm: z.literal(true, { error: 'Confirm that you want to self-exclude' }),
});
export type SelfExclusion = z.infer<typeof selfExclusionSchema>;
