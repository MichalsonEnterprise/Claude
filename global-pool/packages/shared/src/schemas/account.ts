/**
 * Account & verification schemas (USR-A1…A10, AUTH-11…17): profile preferences, notification preferences,
 * session settings and the KYC flow (personal details → document → liveness → review).
 *
 * Shared by the web (react-hook-form + zodResolver) and the API (nestjs-zod DTOs) so both validate with the same
 * rules. KYC data is processed by the KYC provider interface (mock in dev); the platform never stores document
 * images in its own database — only document metadata and the provider's check results.
 */
import { z } from 'zod';

import { ageOn, dateOfBirthSchema } from './auth';
import { countryCodeSchema } from './common';
import { MIN_AGE } from '../limits';

// ── profile & preferences ───────────────────────────────────────────────────────────────────────

export const ACCOUNT_LANGUAGES = ['en'] as const;
export type AccountLanguage = (typeof ACCOUNT_LANGUAGES)[number];

/** IANA time zone, e.g. 'Europe/Lisbon' or 'UTC'. */
export const timeZoneSchema = z
  .string()
  .trim()
  .regex(/^(UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2})$/, { error: 'Choose a time zone' })
  .max(64);

/** Display name shown next to the handle (3–24 characters). */
export const displayNameSchema = z
  .string()
  .trim()
  .min(3, { error: 'Use at least 3 characters' })
  .max(24, { error: 'Use at most 24 characters' });

/** A1 — editable profile fields (the handle, email and verified identity are not editable here). */
export const profileUpdateSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    language: z.enum(ACCOUNT_LANGUAGES).optional(),
    timeZone: timeZoneSchema.optional(),
  })
  .strict();
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** Notification channels per category (A9). `null` = channel not offered for this category. */
export const NOTIFICATION_CHANNELS = ['email', 'push', 'inApp'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Notification categories. `locked` categories are always on (security warnings, RG confirmations) — the API
 * ignores attempts to switch them off. Marketing categories default OFF (opt-in only).
 */
export const NOTIFICATION_CATEGORIES = {
  security_signins: {
    group: 'security',
    locked: true,
    channels: { email: true, push: true, inApp: true },
  },
  security_changes: {
    group: 'security',
    locked: true,
    channels: { email: true, push: true, inApp: true },
  },
  wallet_deposits: {
    group: 'wallet',
    locked: false,
    channels: { email: true, push: true, inApp: true },
  },
  wallet_withdrawals: {
    group: 'wallet',
    locked: false,
    channels: { email: true, push: true, inApp: true },
  },
  pool_results: {
    group: 'pool',
    locked: false,
    channels: { email: false, push: true, inApp: true },
  },
  pool_closing_reminder: {
    group: 'pool',
    locked: false,
    channels: { email: false, push: false, inApp: true },
  },
  pool_tournaments: {
    group: 'pool',
    locked: false,
    channels: { email: false, push: false, inApp: true },
  },
  offers_promotions: {
    group: 'offers',
    locked: false,
    channels: { email: false, push: false, inApp: false },
  },
  offers_vip: {
    group: 'offers',
    locked: false,
    channels: { email: false, push: false, inApp: false },
  },
  rg_reality_checks: {
    group: 'rg',
    locked: true,
    channels: { email: null, push: null, inApp: true },
  },
  rg_limit_changes: {
    group: 'rg',
    locked: true,
    channels: { email: true, push: null, inApp: true },
  },
} as const satisfies Record<
  string,
  {
    group: 'security' | 'wallet' | 'pool' | 'offers' | 'rg';
    locked: boolean;
    channels: Record<NotificationChannel, boolean | null>;
  }
>;
export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;
export const NOTIFICATION_CATEGORY_KEYS = Object.keys(
  NOTIFICATION_CATEGORIES,
) as NotificationCategory[];

const channelPrefsSchema = z
  .object({ email: z.boolean(), push: z.boolean(), inApp: z.boolean() })
  .partial()
  .strict();

/** Quiet hours for push, 'HH:MM' 24 h in the player's time zone. */
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Use HH:MM' });

export const notificationPreferencesUpdateSchema = z
  .object({
    categories: z
      .partialRecord(
        z.enum(NOTIFICATION_CATEGORY_KEYS as [NotificationCategory, ...NotificationCategory[]]),
        channelPrefsSchema,
      )
      .optional(),
    quietHours: z
      .object({ enabled: z.boolean(), from: hhmmSchema, to: hhmmSchema })
      .strict()
      .optional(),
  })
  .strict();
export type NotificationPreferencesUpdate = z.infer<typeof notificationPreferencesUpdateSchema>;

// ── sessions / login history ────────────────────────────────────────────────────────────────────

export const sessionsQuerySchema = z.object({
  /** `active` (default) = signed-in sessions; `all` also returns sessions ended in the last 90 days. */
  include: z.enum(['active', 'all']).default('active'),
});

export const LOGIN_HISTORY_FILTERS = ['all', 'success', 'flagged', 'ended'] as const;
export const loginHistoryQuerySchema = z.object({
  filter: z.enum(LOGIN_HISTORY_FILTERS).default('all'),
  days: z.coerce.number().int().min(1).max(365).default(365),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── KYC flow ────────────────────────────────────────────────────────────────────────────────────

export const KYC_FLOW_STEPS = ['intro', 'details', 'document', 'liveness', 'review'] as const;
export type KycFlowStep = (typeof KYC_FLOW_STEPS)[number];

export const KYC_DOCUMENT_TYPES = [
  'passport',
  'id_card',
  'driving_licence',
  'proof_of_address',
] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];
export const KYC_DOCUMENT_SIDES = ['photo_page', 'front', 'back', 'single'] as const;
export type KycDocumentSide = (typeof KYC_DOCUMENT_SIDES)[number];

/** Sides a document type needs (passport = photo page only; ID card / licence = front + back). */
export const KYC_DOCUMENT_REQUIRED_SIDES: Readonly<
  Record<KycDocumentType, readonly KycDocumentSide[]>
> = {
  passport: ['photo_page'],
  id_card: ['front', 'back'],
  driving_licence: ['front', 'back'],
  proof_of_address: ['single'],
};

export const KYC_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export const KYC_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
/** Below this size the mock provider treats a photo as too low-resolution / blurry to read. */
export const KYC_DOCUMENT_MIN_BYTES = 40 * 1024;
export const KYC_LIVENESS_MAX_ATTEMPTS = 3;

/** Postal-code formats we know (others: 2–10 letters/digits/spaces/dashes). */
export const POSTAL_CODE_FORMATS: Readonly<Record<string, { pattern: RegExp; example: string }>> = {
  PT: { pattern: /^\d{4}-\d{3}$/, example: '1100-001' },
  ES: { pattern: /^\d{5}$/, example: '28013' },
  DE: { pattern: /^\d{5}$/, example: '10115' },
  FR: { pattern: /^\d{5}$/, example: '75001' },
  PL: { pattern: /^\d{2}-\d{3}$/, example: '00-001' },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, example: 'SW1A 1AA' },
};

/**
 * Only initials: single letters each followed by a dot and/or separated by spaces — "J.", "J. R.", "J.R.", "J R".
 * Real short names pass: "Li", "Ng", "Wu", "Jo", and a one-letter name with no dot ("O").
 */
const INITIALS_ONLY = /^\p{L}(?:[.\s]+\p{L})*\.?$/u;
export function isInitialsOnly(name: string): boolean {
  const v = name.trim();
  return INITIALS_ONLY.test(v) && !/^\p{L}$/u.test(v);
}

const legalNameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} — enter your full name as shown on your ID` })
    .max(80)
    .refine((v) => !isInitialsOnly(v), {
      error: `${label} — initials aren’t enough, enter it in full`,
    });

/** AUTH-12 — personal details, entered exactly as on the ID document. Nothing is pre-selected. */
export const kycDetailsSchema = z
  .object({
    firstNames: legalNameSchema('First name(s)'),
    lastNames: legalNameSchema('Last name(s)'),
    dateOfBirth: dateOfBirthSchema,
    nationality: countryCodeSchema,
    country: countryCodeSchema,
    addressLine: z
      .string()
      .trim()
      .min(4, { error: 'Enter your street, number and floor' })
      .max(120),
    city: z.string().trim().min(2, { error: 'Enter your city' }).max(60),
    postalCode: z.string().trim().toUpperCase().min(2, { error: 'Enter your postal code' }).max(10),
    occupation: z.string().trim().min(2, { error: 'Enter your occupation' }).max(60),
    pep: z.enum(['not_pep', 'pep'], { error: 'Answer the PEP question' }),
    accuracyConfirmed: z.literal(true, { error: 'Confirm that your details are accurate' }),
  })
  .refine(
    (v) => {
      const fmt = POSTAL_CODE_FORMATS[v.country];
      return fmt ? fmt.pattern.test(v.postalCode) : /^[A-Z0-9 -]{2,10}$/.test(v.postalCode);
    },
    {
      path: ['postalCode'],
      // Run even when other fields fail, so the form shows every problem at once (AUTH-12 Validation).
      when: (payload) => {
        const v = payload.value as { country?: unknown; postalCode?: unknown } | undefined;
        return typeof v?.country === 'string' && typeof v.postalCode === 'string';
      },
      error: (issue) => {
        const v = issue.input as { country?: string } | undefined;
        const fmt = v?.country ? POSTAL_CODE_FORMATS[v.country.toUpperCase()] : undefined;
        return fmt
          ? `Postal code — use the format ${fmt.example.replace(/\d/g, '0')}, e.g. ${fmt.example}`
          : 'Postal code — use letters, digits, spaces or dashes';
      },
    },
  );
export type KycDetails = z.infer<typeof kycDetailsSchema>;
export type KycDetailsInput = z.input<typeof kycDetailsSchema>;

/** True when a YYYY-MM-DD date makes the person at least MIN_AGE today. */
export function isAdult(dateOfBirth: string, now: Date = new Date()): boolean {
  return ageOn(dateOfBirth, now) >= MIN_AGE;
}

export const kycStartSchema = z.object({ level: z.enum(['level_1', 'level_2', 'level_3']) });

/**
 * AUTH-13 / A5 — document metadata. The file itself goes to the KYC provider (mock in dev): the API stores the
 * name, type, size and SHA-256 only, so it can show the document list and detect duplicates.
 */
export const kycDocumentUploadSchema = z
  .object({
    documentType: z.enum(KYC_DOCUMENT_TYPES),
    side: z.enum(KYC_DOCUMENT_SIDES),
    issuingCountry: countryCodeSchema.optional(),
    fileName: z.string().trim().min(1).max(160),
    mimeType: z.enum(KYC_DOCUMENT_MIME_TYPES, { error: 'Use a JPG, PNG or PDF file' }),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(KYC_DOCUMENT_MAX_BYTES, { error: 'Files can be up to 10 MB' }),
    sha256: z.string().regex(/^[a-f0-9]{64}$/, { error: 'Invalid file checksum' }),
  })
  .superRefine((v, ctx) => {
    if (!KYC_DOCUMENT_REQUIRED_SIDES[v.documentType].includes(v.side)) {
      ctx.addIssue({
        code: 'custom',
        path: ['side'],
        message: 'This side does not apply to the document',
      });
    }
  });
export type KycDocumentUpload = z.infer<typeof kycDocumentUploadSchema>;

/** AUTH-14 — liveness capture result from the (mock) camera step. */
export const kycLivenessSchema = z
  .object({
    /** The client captured a short selfie video (mock: no frames leave the browser in DEV). */
    captured: z.literal(true),
    durationMs: z.number().int().min(1000).max(60_000),
  })
  .strict();

/** AUTH-15 submit — the accuracy declaration must be ticked again (never pre-checked). */
export const kycSubmitSchema = z.object({
  accuracyConfirmed: z.literal(true, { error: 'Confirm that your details are accurate' }),
});

/** KYC check categories reported by the provider (AUTH-17 reasons). */
export const KYC_CHECKS = [
  'image_quality',
  'document_type',
  'document_validity',
  'name_match',
  'liveness',
  'screening',
] as const;
export type KycCheck = (typeof KYC_CHECKS)[number];

/** DEMO only: mock-provider rejection with the failing checks (resubmission required). */
export const kycDevRejectSchema = z.object({
  level: z.enum(['level_1', 'level_2', 'level_3']),
  reasons: z.array(z.enum(KYC_CHECKS)).min(1).max(KYC_CHECKS.length),
});
