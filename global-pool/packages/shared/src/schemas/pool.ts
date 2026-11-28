import { z } from 'zod';

import { MAX_ENTRIES_PER_PURCHASE, MIN_ENTRIES_PER_PURCHASE } from '../fees';
import { idempotencyKeySchema, uuidSchema } from './common';

/** POST /pool/rounds/:roundId/entries — buy entries in an open round, paid from Available. */
export const enterRoundSchema = z.object({
  roundId: uuidSchema,
  entries: z
    .number({ error: 'Enter the number of entries' })
    .int({ error: 'Entries must be a whole number' })
    .min(MIN_ENTRIES_PER_PURCHASE, { error: `At least ${MIN_ENTRIES_PER_PURCHASE} entry` })
    .max(MAX_ENTRIES_PER_PURCHASE, {
      error: `At most ${MAX_ENTRIES_PER_PURCHASE} entries per purchase`,
    }),
  idempotencyKey: idempotencyKeySchema,
});
export type EnterRound = z.infer<typeof enterRoundSchema>;

export const roundIdParamSchema = z.object({ roundId: uuidSchema });

/** Public round number in URLs (/pool/rounds/1248). */
export const roundNumberParamSchema = z.object({
  roundNumber: z.coerce.number().int().min(1),
});
