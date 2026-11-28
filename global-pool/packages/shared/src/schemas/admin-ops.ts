import { z } from 'zod';

import { CHAIN_KEYS } from '../chains';
import { DEPOSIT_STATUSES, KYC_LEVELS, KYC_STATUSES, WITHDRAWAL_STATUSES } from '../enums';
import { totpCodeSchema } from './auth';
import { paginationQuerySchema } from './common';

/**
 * Admin back-office contracts for Finance (ADM-F1…F9), Global Pool monitoring (ADM-P1…P10) and Compliance
 * (ADM-C1, ADM-C2). Read endpoints are aggregates of the append-only ledger; the only writes are reviewed,
 * audited workflow actions (withdrawal decisions, KYC decisions, CSV exports, the NEW-entries circuit breaker).
 * There is deliberately no schema for editing results, winners, ledger rows or balances.
 */

/** Mandatory written reason for sensitive admin actions. */
export const adminReasonSchema = z
  .string()
  .trim()
  .min(5, { error: 'A written reason (min. 5 characters) is required' })
  .max(500, { error: 'Keep the reason under 500 characters' });

/** Reason + fresh authenticator code (MFA re-auth). */
export const adminSensitiveActionSchema = z.object({
  reason: adminReasonSchema,
  mfaCode: totpCodeSchema,
});
export type AdminSensitiveAction = z.infer<typeof adminSensitiveActionSchema>;

/** Reason categories offered by the confirm-with-reason dialogs (the free-text reason is still required). */
export const ADMIN_REASON_CATEGORIES = {
  withdrawal_approve: [
    'Destination verified',
    'AML check cleared',
    'Customer confirmed by support',
    'Other',
  ],
  withdrawal_reject: [
    'Sanctions / AML hit',
    'Destination not controlled by the customer',
    'Suspected account takeover',
    'Other',
  ],
  kyc: ['Documents verified', 'Document unreadable', 'Mismatch with profile', 'Other'],
  circuit_breaker: ['Contract incident', 'Oracle / VRF incident', 'Regulatory instruction', 'Other'],
  export: ['Monthly close', 'Regulatory request', 'Audit request', 'Investigation', 'Other'],
} as const;

const optionalSearch = z.string().trim().min(1).max(64).optional();

// ── Finance ─────────────────────────────────────────────────────────────────────────────────────

export const adminDepositsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(DEPOSIT_STATUSES).optional(),
  network: z.enum(CHAIN_KEYS).optional(),
  q: optionalSearch,
});
export type AdminDepositsQuery = z.infer<typeof adminDepositsQuerySchema>;

export const adminWithdrawalsQuerySchema = paginationQuerySchema.extend({
  /** queue = open states (default), awaiting = four-eyes pending, plus any single status. */
  view: z.enum(['queue', 'awaiting_second', 'broadcasting', 'completed', 'rejected', 'all']).optional(),
  status: z.enum(WITHDRAWAL_STATUSES).optional(),
  q: optionalSearch,
});
export type AdminWithdrawalsQuery = z.infer<typeof adminWithdrawalsQuerySchema>;

export const LEDGER_POSTING_KINDS = [
  'deposit_detected',
  'deposit_credited',
  'withdrawal_lock',
  'withdrawal_release',
  'withdrawal_settle',
  'entry_purchase',
  'round_settlement',
  'prize_award',
  'round_refund',
  'owed_claim',
  'reward',
  'demo_opening_balance',
] as const;
export type LedgerPostingKindValue = (typeof LEDGER_POSTING_KINDS)[number];

export const LEDGER_POSTING_KIND_LABEL: Readonly<Record<LedgerPostingKindValue, string>> = {
  deposit_detected: 'Deposit detected',
  deposit_credited: 'Deposit credited',
  withdrawal_lock: 'Withdrawal lock',
  withdrawal_release: 'Withdrawal release',
  withdrawal_settle: 'Withdrawal settled',
  entry_purchase: 'Entry purchase',
  round_settlement: 'Round settlement',
  prize_award: 'Prize award',
  round_refund: 'Round refund',
  owed_claim: 'Owed claim',
  reward: 'Reward',
  demo_opening_balance: 'DEMO opening balance',
};

export const adminLedgerQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(LEDGER_POSTING_KINDS).optional(),
  /** Business reference (WD-…, DP-…, round:1248) or a player handle. */
  q: optionalSearch,
});
export type AdminLedgerQuery = z.infer<typeof adminLedgerQuerySchema>;

export const ADMIN_EXPORT_DATASETS = [
  'deposits',
  'withdrawals',
  'platform_fees',
  'ledger',
  'refunds',
  'revenue',
  'reconciliation',
  'rounds',
] as const;
export type AdminExportDataset = (typeof ADMIN_EXPORT_DATASETS)[number];

export const ADMIN_EXPORT_DATASET_LABEL: Readonly<Record<AdminExportDataset, string>> = {
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  platform_fees: 'Platform fees',
  ledger: 'Financial ledger',
  refunds: 'Refunds',
  revenue: 'Revenue reports',
  reconciliation: 'Reconciliation',
  rounds: 'Rounds',
};

/** Synchronous exports stop at this many rows (larger ones must be split by date range). */
export const ADMIN_EXPORT_ROW_LIMIT = 500_000;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Use a date like 2026-11-01' });

export const adminExportRequestSchema = z
  .object({
    dataset: z.enum(ADMIN_EXPORT_DATASETS),
    from: isoDay.optional(),
    to: isoDay.optional(),
    /** Personal data (handles, addresses) is excluded unless explicitly requested. */
    includePersonalData: z.boolean().default(false),
    reasonCategory: z.string().trim().max(60).optional(),
    reason: adminReasonSchema,
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    error: 'The start date must be before the end date',
    path: ['to'],
  });
export type AdminExportRequest = z.infer<typeof adminExportRequestSchema>;

// ── Global Pool monitoring ──────────────────────────────────────────────────────────────────────

export const adminParticipantsQuerySchema = paginationQuerySchema.extend({ q: optionalSearch });
export type AdminParticipantsQuery = z.infer<typeof adminParticipantsQuerySchema>;

/** Circuit breaker: the only pool control — pause or resume NEW entries (never results or payouts). */
export const circuitBreakerRequestSchema = adminSensitiveActionSchema.extend({
  action: z.enum(['pause_new_entries', 'resume_new_entries']),
  reasonCategory: z.string().trim().max(60).optional(),
});
export type CircuitBreakerRequest = z.infer<typeof circuitBreakerRequestSchema>;

export const circuitBreakerDecisionSchema = adminSensitiveActionSchema.extend({
  decision: z.enum(['approve', 'decline']),
});
export type CircuitBreakerDecision = z.infer<typeof circuitBreakerDecisionSchema>;

// ── Compliance ──────────────────────────────────────────────────────────────────────────────────

export const adminKycQuerySchema = paginationQuerySchema.extend({
  status: z.enum(KYC_STATUSES).optional(),
  level: z.enum(KYC_LEVELS).optional(),
  q: optionalSearch,
});
export type AdminKycQuery = z.infer<typeof adminKycQuerySchema>;

export const kycDecisionSchema = adminSensitiveActionSchema.extend({
  decision: z.enum(['approve', 'reject', 'request_info']),
  reasonCategory: z.string().trim().max(60).optional(),
});
export type KycDecision = z.infer<typeof kycDecisionSchema>;

export const adminAmlQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['open', 'under_review', 'resolved', 'dismissed', 'escalated']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  q: optionalSearch,
});
export type AdminAmlQuery = z.infer<typeof adminAmlQuerySchema>;
