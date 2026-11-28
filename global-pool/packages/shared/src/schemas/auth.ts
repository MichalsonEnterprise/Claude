/**
 * Auth schemas.
 *
 * PLAYERS authenticate with Privy (email OTP, social, wallet) — no player passwords (owner decision 28 Nov 2026).
 * "Register" for a player is the first-login ONBOARDING step: consents (never pre-checked) + country + handle.
 * ADMINS use a separate login: email + password (argon2id) + mandatory TOTP.
 */
import { z } from 'zod';

import { STEP_UP_PURPOSES } from '../enums';
import { MIN_AGE } from '../limits';
import { countryCodeSchema } from './common';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: 'Email is too long' })
  .pipe(z.email({ error: 'Enter a valid email address' }));

/** 6-digit one-time code (email verification / TOTP). */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'Enter the 6-digit code' });

export const totpCodeSchema = otpCodeSchema;

/** Backup code, e.g. 'K7Q2-9XMA' (case-insensitive, dash optional). */
export const backupCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/, { error: 'Enter a backup code like ABCD-1234' });

/** Anti-phishing code shown in every email, e.g. 'AURORA-27'. */
export const antiPhishingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, { error: '4–20 letters, digits or dashes' });

/** Public handle without '@': 3–24 chars, lowercase letters, digits, '.' and '_', starting/ending alphanumeric. */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9._]{1,22})[a-z0-9]$/, {
    error: '3–24 characters: letters, digits, dots and underscores',
  });

/** Admin password policy (length over composition, per NIST 800-63B). */
export const passwordSchema = z
  .string()
  .min(12, { error: 'Use at least 12 characters' })
  .max(128, { error: 'Use at most 128 characters' });

/** Years between a YYYY-MM-DD birth date and `now` (UTC). */
export function ageOn(dateOfBirth: string, now: Date = new Date()): number {
  const [y, m, d] = dateOfBirth.split('-').map(Number) as [number, number, number];
  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export const dateOfBirthSchema = z.iso
  .date({ error: 'Use the format YYYY-MM-DD' })
  .refine((v) => ageOn(v) >= MIN_AGE, { error: `You must be ${MIN_AGE} or older` });

/**
 * Onboarding consents. Every required consent must be explicitly `true` (checkboxes are never pre-checked);
 * marketing opt-in is separate and optional.
 */
export const consentsSchema = z.object({
  ageConfirmed: z.literal(true, { error: `Confirm that you are ${MIN_AGE} or older` }),
  jurisdictionConfirmed: z.literal(true, {
    error: 'Confirm that online gaming is permitted where you live',
  }),
  termsAccepted: z.literal(true, { error: 'Accept the Terms of Service' }),
  privacyAccepted: z.literal(true, { error: 'Accept the Privacy Policy' }),
  marketingOptIn: z.boolean().default(false),
});
export type Consents = z.infer<typeof consentsSchema>;

/** First-login onboarding (the player "register" step after Privy authentication). */
export const onboardingSchema = z.object({
  handle: handleSchema,
  country: countryCodeSchema,
  dateOfBirth: dateOfBirthSchema.optional(),
  consents: consentsSchema,
});
export type OnboardingInput = z.input<typeof onboardingSchema>;
export type Onboarding = z.infer<typeof onboardingSchema>;

/** Alias: players register through Privy + onboarding; there is no password registration. */
export const registerSchema = onboardingSchema;
export type RegisterInput = OnboardingInput;

/** Admin login: email + password + mandatory TOTP (one step, so failures never reveal which factor failed). */
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password' }).max(128),
  totpCode: totpCodeSchema,
});
export type AdminLogin = z.infer<typeof adminLoginSchema>;

/** Alias of adminLoginSchema — the only password login on the platform. */
export const loginSchema = adminLoginSchema;

/** Email verification (6-digit code), e.g. admin invites or a changed contact email. */
export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;

/** Confirm TOTP enrolment with the first code from the authenticator app. */
export const totpEnrollConfirmSchema = z.object({
  code: totpCodeSchema,
});

/** Step-up challenge for withdrawals, whitelist changes and security settings. */
export const totpChallengeSchema = z.object({
  purpose: z.enum(STEP_UP_PURPOSES),
  code: z.union([totpCodeSchema, backupCodeSchema]),
});
export type TotpChallenge = z.infer<typeof totpChallengeSchema>;

/** Alias used by the task brief. */
export const totpSchema = totpChallengeSchema;
