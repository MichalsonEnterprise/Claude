/**
 * Request schemas for game play (shared by the API and the web). Amounts are DEMO credit decimal strings.
 */
import { z } from 'zod';

import { DEMO_CREDITS_CURRENCY } from './credits';
import { CLIENT_SEED_PATTERN } from './stream';

const credits = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, 'Amount like 10.00 (DEMO credits)');
/** Optional currency: only DEMO is accepted — anything else hits the REAL_MONEY guard (403). */
const currency = z.string().optional();
const idempotencyKey = z.string().min(8).max(128);

export const diceParamsSchema = z.object({
  target: z.string().regex(/^\d{1,2}\.\d{2}$/),
  condition: z.enum(['over', 'under']),
});
export const coinflipParamsSchema = z.object({ pick: z.enum(['heads', 'tails']) });
export const rouletteBetSchema = z.object({
  type: z.enum([
    'straight',
    'split',
    'street',
    'corner',
    'line',
    'dozen',
    'column',
    'red',
    'black',
    'odd',
    'even',
    'low',
    'high',
  ]),
  numbers: z.array(z.number().int().min(0).max(36)).max(6).optional(),
  amount: credits,
});
export const rouletteParamsSchema = z.object({ bets: z.array(rouletteBetSchema).min(1).max(60) });
export const limboParamsSchema = z.object({ target: z.string().regex(/^\d{1,4}(\.\d{1,2})?$/) });
export const wheelParamsSchema = z.object({
  risk: z.enum(['low', 'medium', 'high']),
  segments: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(40), z.literal(50)]),
});
export const kenoParamsSchema = z.object({
  picks: z.array(z.number().int().min(1).max(40)).min(1).max(10),
  risk: z.enum(['low', 'classic', 'medium', 'high']),
});
export const plinkoParamsSchema = z.object({
  rows: z.number().int().min(8).max(16),
  risk: z.enum(['low', 'medium', 'high']),
});

/** POST /games/:slug/bets — instant games. Roulette takes the stake from `params.bets` (omit `stake`). */
export const placeBetSchema = z.object({
  stake: credits.optional(),
  params: z.record(z.string(), z.unknown()).default({}),
  currency,
  idempotencyKey,
});
export type PlaceBetInput = z.infer<typeof placeBetSchema>;

export const clientSeedSchema = z.object({
  clientSeed: z.string().regex(CLIENT_SEED_PATTERN, '1–64 letters, digits, dot, dash or underscore'),
});

export const startBlackjackSchema = z.object({ stake: credits, currency, idempotencyKey });
export const blackjackActionSchema = z.object({
  action: z.enum(['hit', 'stand', 'double', 'split', 'insurance']),
  /** insurance only: take (true) or decline (false). */
  accept: z.boolean().optional(),
  idempotencyKey,
});

export const startMinesSchema = z.object({
  stake: credits,
  mines: z.number().int().min(1).max(24),
  currency,
  idempotencyKey,
});
export const minesRevealSchema = z.object({ tile: z.number().int().min(0).max(24), idempotencyKey });
export const startHiloSchema = z.object({ stake: credits, currency, idempotencyKey });
export const hiloActionSchema = z.object({
  action: z.enum(['higher_or_same', 'lower_or_same', 'skip']),
  idempotencyKey,
});
export const cashOutSchema = z.object({ idempotencyKey });

export const crashBetSchema = z.object({
  stake: credits,
  autoCashOut: z
    .string()
    .regex(/^\d{1,4}(\.\d{1,2})?$/)
    .nullable()
    .optional(),
  currency,
  idempotencyKey,
});

export const resetCreditsSchema = z.object({ idempotencyKey: idempotencyKey.optional() });

export const gameBetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export { DEMO_CREDITS_CURRENCY };
