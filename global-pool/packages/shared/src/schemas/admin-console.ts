import { z } from 'zod';

import {
  APPROVAL_STATUSES,
  KYC_LEVELS,
  PERMISSIONS,
  RESTRICTION_TYPES,
  TX_TYPES,
} from '../enums';
import { adminReasonSchema, adminSensitiveActionSchema } from './admin-ops';
import { paginationQuerySchema } from './common';

/**
 * Admin console contracts (admin-a: ADM-00 shell, ADM-U1…U10 user management, ADM-S1…S3 system, ADM-X1 four-eyes).
 * Writes are reviewed, audited workflow actions only (restriction requests/decisions, PII reveal with a logged
 * reason, role-permission change REQUESTS). There is deliberately no schema to edit results, winners, ledger rows or
 * balances.
 */

/** Reason categories of the confirm-with-reason dialogs (the free-text reason stays mandatory). */
export const ADMIN_CONSOLE_REASON_CATEGORIES = {
  restriction_apply: [
    'AML — investigation open',
    'Account takeover suspected',
    'Responsible gaming concern',
    'Regulatory / legal request',
    'Other',
  ],
  restriction_lift: [
    'Investigation closed — no issue',
    'Player verified by support',
    'Regulatory hold ended',
    'Other',
  ],
  approval_decision: [
    'Independent review completed',
    'Evidence insufficient',
    'Policy not met',
    'Other',
  ],
  pii_reveal: ['Support ticket', 'KYC review', 'AML investigation', 'Regulatory request', 'Other'],
  role_change: ['New responsibility', 'Least privilege clean-up', 'Audit finding', 'Other'],
} as const;

const optionalSearch = z.string().trim().min(1).max(64).optional();

/** Player account status (users.status). */
export const ADMIN_USER_STATUSES = ['active', 'suspended', 'closed'] as const;

/** GET /admin/users — U1 filters (all optional, additive to ?q=). */
export const adminUsersQuerySchema = paginationQuerySchema.extend({
  q: optionalSearch,
  status: z.enum(ADMIN_USER_STATUSES).optional(),
  kycLevel: z.enum(KYC_LEVELS).optional(),
  restricted: z.enum(['yes', 'no']).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

/** POST /admin/users/:id/restrictions — the optional category is stored in the audit metadata. */
export const adminRestrictionApplySchema = adminSensitiveActionSchema.extend({
  type: z.enum(RESTRICTION_TYPES),
  reasonCategory: z.string().trim().max(80).optional(),
});
export type AdminRestrictionApply = z.infer<typeof adminRestrictionApplySchema>;

/** POST /admin/users/:id/restrictions/:rid/lift */
export const adminRestrictionLiftSchema = adminSensitiveActionSchema.extend({
  reasonCategory: z.string().trim().max(80).optional(),
});
export type AdminRestrictionLift = z.infer<typeof adminRestrictionLiftSchema>;

/** GET /admin/users/:id/transactions */
export const adminUserTransactionsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(TX_TYPES).optional(),
});
export type AdminUserTransactionsQuery = z.infer<typeof adminUserTransactionsQuerySchema>;

/** Fields an admin with `users.pii.read` may reveal — one at a time, with a logged reason. */
export const ADMIN_PII_FIELDS = ['email', 'date_of_birth', 'last_ip'] as const;
export type AdminPiiField = (typeof ADMIN_PII_FIELDS)[number];
export const ADMIN_PII_FIELD_LABEL: Readonly<Record<AdminPiiField, string>> = {
  email: 'Email address',
  date_of_birth: 'Date of birth',
  last_ip: 'Last sign-in IP',
};

/** POST /admin/users/:id/pii/reveal */
export const adminPiiRevealSchema = z.object({
  field: z.enum(ADMIN_PII_FIELDS),
  reason: adminReasonSchema,
});
export type AdminPiiReveal = z.infer<typeof adminPiiRevealSchema>;

/** GET /admin/approvals — views of the approvals inbox. */
export const ADMIN_APPROVAL_VIEWS = [
  'open',
  'waiting_for_me',
  'created_by_me',
  'decided_today',
  'expired',
] as const;
export type AdminApprovalView = (typeof ADMIN_APPROVAL_VIEWS)[number];
export const adminApprovalsQuerySchema = z.object({
  view: z.enum(ADMIN_APPROVAL_VIEWS).optional(),
  status: z.enum(APPROVAL_STATUSES).optional(),
});
export type AdminApprovalsQuery = z.infer<typeof adminApprovalsQuerySchema>;

/** POST /admin/approvals/:id/approve | /reject — second approver: own reason + fresh 2FA. */
export const adminApprovalDecisionSchema = adminSensitiveActionSchema.extend({
  reasonCategory: z.string().trim().max(80).optional(),
});
export type AdminApprovalDecision = z.infer<typeof adminApprovalDecisionSchema>;

/** POST /admin/approvals/:id/withdraw — the requester withdraws their own request (nothing changes). */
export const adminApprovalWithdrawSchema = z.object({ reason: adminReasonSchema });
export type AdminApprovalWithdraw = z.infer<typeof adminApprovalWithdrawSchema>;

/** POST /admin/roles/:key/change-requests — a REQUEST; applied only after a second admin approves. */
export const adminRoleChangeSchema = adminSensitiveActionSchema
  .extend({
    grant: z.array(z.enum(PERMISSIONS)).max(40).default([]),
    revoke: z.array(z.enum(PERMISSIONS)).max(40).default([]),
    reasonCategory: z.string().trim().max(80).optional(),
  })
  .refine((v) => v.grant.length + v.revoke.length > 0, {
    error: 'Choose at least one permission to grant or revoke',
    path: ['grant'],
  })
  .refine((v) => v.grant.every((p) => !v.revoke.includes(p)), {
    error: 'A permission cannot be granted and revoked at once',
    path: ['revoke'],
  });
export type AdminRoleChange = z.infer<typeof adminRoleChangeSchema>;

/** POST /admin/alerts/:key/ack — acknowledging is logged; it never changes balances, rounds or results. */
export const adminAlertAckSchema = z.object({
  note: z.string().trim().max(200).optional(),
});
export type AdminAlertAck = z.infer<typeof adminAlertAckSchema>;
