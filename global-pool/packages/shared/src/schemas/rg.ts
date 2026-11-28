import { z } from 'zod';

import {
  COOLING_OFF_DURATIONS,
  RG_LIMIT_TYPES,
  RG_PERIODS,
  SELF_EXCLUSION_DURATIONS,
  type RgLimitType,
  type RgPeriod,
  type SelfExclusionDuration,
} from '../enums';
import { SELF_EXCLUSION_CONFIRM_PHRASE } from '../limits';
import { totpCodeSchema } from './auth';
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

/** Identifies one limit (remove it — waits 24 h — or cancel its pending increase/removal). */
export const rgLimitRefSchema = z.object({
  type: z.enum(RG_LIMIT_TYPES),
  period: z.enum(RG_PERIODS),
});
export type RgLimitRef = z.infer<typeof rgLimitRefSchema>;

/** Reality-check reminder interval (+ optional behaviour toggles, RG5). */
export const realityCheckSchema = z.object({
  intervalMinutes: z.number().int().min(15).max(240),
  /** Pause the game until the player responds (the round in progress finishes first). */
  pauseGame: z.boolean().optional(),
  /** Also send a push notification when the app is in the background (never default ON). */
  pushNotification: z.boolean().optional(),
});
export type RealityCheckUpdate = z.infer<typeof realityCheckSchema>;

/** Which of the three equal-weight choices the player made on a reality-check reminder. */
export const REALITY_CHECK_ACTIONS = ['continue', 'history', 'break'] as const;
export type RealityCheckAction = (typeof REALITY_CHECK_ACTIONS)[number];
export const realityCheckAckSchema = z.object({
  action: z.enum(REALITY_CHECK_ACTIONS).default('continue'),
});

/** Per-session length limit (RG4). null removes it (removal waits 24 h). */
export const rgSessionLimitSchema = z.object({
  minutes: z
    .number()
    .int()
    .min(15)
    .max(12 * 60)
    .nullable(),
});

/** "HH:MM" (UTC) for quiet hours. */
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Use HH:MM (24 h)' });

/** Quiet hours (RG4): block play between start and end every day (UTC). On = immediate; off waits 24 h. */
export const rgQuietHoursSchema = z
  .object({
    enabled: z.boolean(),
    start: hhmmSchema.default('01:00'),
    end: hhmmSchema.default('07:00'),
  })
  .refine((v) => v.start !== v.end, { error: 'Start and end must differ', path: ['end'] });
export type RgQuietHours = z.infer<typeof rgQuietHoursSchema>;

/**
 * Self-exclusion: always honoured immediately, never obstructed; requires explicit confirmation.
 * Long periods (6m / 1y / 5y / permanent) also need the typed phrase SELF-EXCLUDE and the acknowledgement, plus a
 * step-up TOTP code when the player has 2FA on (Privy players have no password — owner decision #3).
 */
export const selfExclusionSchema = z.object({
  duration: z.enum(SELF_EXCLUSION_DURATIONS),
  confirm: z.literal(true, { error: 'Confirm that you want to self-exclude' }),
  phrase: z.string().trim().max(32).optional(),
  acknowledged: z.boolean().optional(),
  totpCode: totpCodeSchema.optional(),
});
export type SelfExclusion = z.infer<typeof selfExclusionSchema>;

/** Client-side form for RG7 step 3 (the API re-checks every rule). */
export const selfExclusionConfirmFormSchema = z.object({
  phrase: z
    .string()
    .trim()
    .refine((v) => v === SELF_EXCLUSION_CONFIRM_PHRASE, {
      error: `Type ${SELF_EXCLUSION_CONFIRM_PHRASE} exactly`,
    }),
  acknowledged: z.literal(true, { error: 'Tick the box to confirm you understand' }),
  totpCode: z
    .string()
    .regex(/^\d{6}$/, { error: 'Enter the 6-digit code' })
    .optional(),
});
export type SelfExclusionConfirmForm = z.infer<typeof selfExclusionConfirmFormSchema>;

/** Cooling-off break (RG6): 24 hours, 7 days or 30 days. Cannot be shortened once started. */
export const coolingOffSchema = z.object({
  duration: z.enum(COOLING_OFF_DURATIONS),
  confirm: z.literal(true, { error: 'Confirm that you want to start a break' }),
});
export type CoolingOff = z.infer<typeof coolingOffSchema>;

// ── views (GET /responsible-gaming, /responsible-gaming/session) ───────────────────────────────

export interface RgLimitView {
  type: RgLimitType;
  period: RgPeriod;
  /** Effective limit now (amount for money limits, minutes for session_time). */
  limit: string | null;
  minutes: number | null;
  used: string | null;
  /** session_time only: minutes played in the current period. */
  usedMinutes?: number | null;
  remaining: string | null;
  /** When the current period resets (next UTC day / Monday / 1st). */
  resetsAt?: string;
  pendingIncrease: { amount: string | null; minutes: number | null; effectiveAt: string } | null;
  /** A removal waiting for the 24 h cool-down. */
  pendingRemoval?: { effectiveAt: string } | null;
}

export type RgExclusionKind = 'cooling_off' | 'self_exclusion';

export interface RgExclusionView {
  active: boolean;
  kind: RgExclusionKind | null;
  duration: SelfExclusionDuration | null;
  startsAt: string | null;
  /** null while active = permanent. */
  endsAt: string | null;
}

export interface RgSessionView {
  /** Current play session (ends after RG_SESSION_IDLE_MINUTES without activity). null = no session. */
  startedAt: string | null;
  durationSeconds: number;
  lastActivityAt: string | null;
  playedTodaySeconds: number;
  sessionsToday: number;
  /** Net result since the session started (prizes + refunds − entries), signed decimal string. */
  netSession: string;
  /** Net result since 00:00 UTC, signed decimal string. */
  netToday: string;
  realityCheck: {
    intervalMinutes: number;
    nextAt: string | null;
    due: boolean;
  };
  /** Why new play is paused right now, if it is (time limit / session limit / quiet hours / exclusion). */
  blockedReason: 'daily_time_limit' | 'session_limit' | 'quiet_hours' | 'excluded' | null;
}

export interface RgSettingsView {
  realityCheckMinutes: number;
  realityCheckPause: boolean;
  realityCheckPush: boolean;
  sessionLimit: {
    minutes: number | null;
    pending: { minutes: number | null; effectiveAt: string } | null;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    pendingOffAt: string | null;
  };
}

export interface RgHistoryItem {
  at: string;
  action: string;
  label: string;
  detail: string | null;
}

export interface RgStateView {
  limits: RgLimitView[];
  /** Kept for older clients: any active break or self-exclusion. */
  selfExclusion: { active: boolean; duration: string | null; endsAt: string | null };
  exclusion: RgExclusionView;
  realityCheckMinutes: number;
  settings: RgSettingsView;
  session: RgSessionView;
  twoFactorEnabled: boolean;
}

/** Cancel a pending (24 h) change to a setting: a session-length increase/removal or quiet hours turning off. */
export const rgCancelSettingSchema = z.object({
  target: z.enum(['session_limit', 'quiet_hours']),
});
export type RgCancelSetting = z.infer<typeof rgCancelSettingSchema>;

/** GET /responsible-gaming/history?kind=limits|reality_checks|all */
export const rgHistoryQuerySchema = z.object({
  kind: z.enum(['limits', 'reality_checks', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
