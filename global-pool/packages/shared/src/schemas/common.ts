import { z } from 'zod';

import { USDT_DECIMALS, gt, isUSDTAmount } from '../money';

// ── primitives ──────────────────────────────────────────────────────────────────────────────────

export const uuidSchema = z.uuid({ error: 'Must be a UUID' });

export const isoDateTimeSchema = z.iso.datetime({
  offset: true,
  error: 'Must be an ISO-8601 date-time',
});

/** Idempotency key for financial writes (client-generated, e.g. a UUID). */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, { error: 'Idempotency key must be at least 8 characters' })
  .max(128, { error: 'Idempotency key must be at most 128 characters' })
  .regex(/^[A-Za-z0-9._:-]+$/, {
    error: 'Idempotency key may contain letters, digits and . _ : - only',
  });

/** A non-negative USDT decimal string with at most 6 decimals ('0', '10', '1234.5', '0.000001'). */
export const usdtAmountStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, { error: 'Enter an amount like 100 or 100.50' })
  .refine(isUSDTAmount, { error: `USDT amounts have at most ${USDT_DECIMALS} decimal places` });

/** A strictly positive USDT amount. */
export const positiveUsdtAmountSchema = usdtAmountStringSchema.refine((v) => gt(v, 0), {
  error: 'Amount must be greater than 0',
});

/** ISO 3166-1 alpha-2 country code (upper case). */
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, { error: 'Use a 2-letter country code' });

// ── pagination ──────────────────────────────────────────────────────────────────────────────────

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/** Offset pagination query (?page=1&pageSize=20) — query strings are coerced to numbers. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Cursor pagination query (?cursor=…&limit=20) for feeds. */
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PageMeta = z.infer<typeof pageMetaSchema>;

/** `paginatedSchema(transactionSchema)` → { items: T[], page, pageSize, total, totalPages } */
export function paginatedSchema<T extends z.ZodType>(item: T) {
  return pageMetaSchema.extend({ items: z.array(item) });
}

export interface Paginated<T> extends PageMeta {
  items: T[];
}

export function pageMeta(total: number, page: number, pageSize: number): PageMeta {
  return { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) };
}

export function paginate<T>(items: T[], total: number, query: PaginationQuery): Paginated<T> {
  return { items, ...pageMeta(total, query.page, query.pageSize) };
}

// ── error envelope ──────────────────────────────────────────────────────────────────────────────

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ROUND_NOT_OPEN: 'ROUND_NOT_OPEN',
  RG_LIMIT_EXCEEDED: 'RG_LIMIT_EXCEEDED',
  SELF_EXCLUDED: 'SELF_EXCLUDED',
  GEO_RESTRICTED: 'GEO_RESTRICTED',
  AGE_RESTRICTED: 'AGE_RESTRICTED',
  ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
  KYC_REQUIRED: 'KYC_REQUIRED',
  STEP_UP_REQUIRED: 'STEP_UP_REQUIRED',
  STEP_UP_LOCKED: 'STEP_UP_LOCKED',
  NETWORK_NOT_AVAILABLE: 'NETWORK_NOT_AVAILABLE',
  ADDRESS_NOT_WHITELISTED: 'ADDRESS_NOT_WHITELISTED',
  REAL_MONEY_DISABLED: 'REAL_MONEY_DISABLED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** HTTP status per error code (the API's exception filter uses this). */
export const ERROR_HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  INSUFFICIENT_FUNDS: 422,
  ROUND_NOT_OPEN: 409,
  RG_LIMIT_EXCEEDED: 422,
  SELF_EXCLUDED: 403,
  GEO_RESTRICTED: 451,
  AGE_RESTRICTED: 403,
  ONBOARDING_REQUIRED: 403,
  KYC_REQUIRED: 403,
  STEP_UP_REQUIRED: 401,
  STEP_UP_LOCKED: 423,
  NETWORK_NOT_AVAILABLE: 422,
  ADDRESS_NOT_WHITELISTED: 422,
  REAL_MONEY_DISABLED: 403,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const errorIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  code: z.string().optional(),
});
export type ErrorIssue = z.infer<typeof errorIssueSchema>;

/** Every API error response: `{ "error": { code, message, statusCode, requestId?, issues?, details? } }`. */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(ErrorCode),
    message: z.string(),
    statusCode: z.number().int().min(100).max(599),
    requestId: z.string().optional(),
    issues: z.array(errorIssueSchema).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Map zod issues to envelope issues (drops symbol path segments). */
export function zodIssues(error: z.ZodError): ErrorIssue[] {
  return error.issues.map((i) => ({
    path: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
    message: i.message,
    code: i.code,
  }));
}

export function makeErrorEnvelope(
  code: ErrorCode,
  message: string,
  extra: {
    requestId?: string;
    issues?: ErrorIssue[];
    details?: Record<string, unknown>;
    statusCode?: number;
  } = {},
): ErrorEnvelope {
  const { statusCode = ERROR_HTTP_STATUS[code], ...rest } = extra;
  return { error: { code, message, statusCode, ...rest } };
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return errorEnvelopeSchema.safeParse(value).success;
}
