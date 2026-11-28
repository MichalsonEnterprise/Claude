'use client';

/**
 * ADM-X1 — one pattern for every sensitive admin action:
 *  • ConfirmWithReasonDialog (requester / single admin): reason category + written reason + FRESH 2FA code (re-auth),
 *    four-eyes notice when a second admin is required, audit notice. States: default (submit disabled), ready, error
 *    (inline, code errors on the code field), submitted (AR reference + audit entry) or done.
 *  • ApprovalReviewDialog (second approver): the request card + the decision column (own reason + fresh 2FA,
 *    Approve / Reject). The requester sees the self-approval-blocked state (eligible approvers, withdraw request);
 *    decided / expired requests show the decision trail. Nothing changes until a different admin decides.
 * Codes are single-use (replay-protected): after a wrong code, wait for the next one in the authenticator app.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ADMIN_ROLE_LABEL,
  PERMISSION_LABEL,
  RESTRICTION_IMPACT,
  RESTRICTION_LABEL,
  type AdminRole,
  type Permission,
  type RestrictionType,
} from '@gp/shared/enums';
import { formatDateTimeUTC, formatHandle, formatTimeUTC } from '@gp/shared/format';
import {
  ADMIN_CONSOLE_REASON_CATEGORIES,
  adminReasonSchema,
  totpCodeSchema,
} from '@gp/shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CircleCheck,
  CircleX,
  Clock,
  Eye,
  History,
  Hourglass,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';

import { Avatar } from '@/components/ui/avatar';
import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  approveRequest,
  rejectRequest,
  withdrawRequest,
  type ApprovalDetail,
  type ApprovalItem,
} from '@/lib/api/admin-a';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { useApproval } from './hooks';
import { initialsOf, QueryErrorPanel, RoleChip } from './primitives';
import { useAdminSession } from './session';

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────

export type SensitiveValues = { reasonCategory: string; reason: string; mfaCode: string };

export type SubmitOutcome =
  | { kind: 'pending'; ref: string; expiresAt: string; auditSeq?: string; note?: string }
  | { kind: 'done'; title: string; body?: string; auditSeq?: string };

/** Map an API error to field / form messages. */
export function actionErrorMessage(err: unknown): {
  field?: 'mfaCode' | 'reason';
  message: string;
} {
  if (err instanceof ApiRequestError) {
    if (err.code === 'STEP_UP_REQUIRED') {
      const left = err.details?.attemptsRemaining;
      return {
        field: 'mfaCode',
        message: `That code didn't work. Wait for the next code in your app${typeof left === 'number' ? ` · ${left} attempts left` : ''}.`,
      };
    }
    if (err.code === 'STEP_UP_LOCKED') {
      const until = err.details?.lockedUntil as string | undefined;
      return {
        field: 'mfaCode',
        message: `Too many incorrect codes — sensitive actions are paused${until ? ` until ${formatTimeUTC(until)}` : ''}. IT security was alerted.`,
      };
    }
    if (err.code === 'VALIDATION_FAILED' && err.details?.field === 'reason') {
      return { field: 'reason', message: err.message };
    }
    if (err.code === 'FORBIDDEN') {
      const missing = err.details?.missingPermissions as Permission[] | undefined;
      return {
        message: missing?.length
          ? `Your role is missing: ${missing.map((p) => PERMISSION_LABEL[p] ?? p).join(', ')}.`
          : err.message,
      };
    }
    return { message: `${err.message}${err.requestId ? ` (ref ${err.requestId})` : ''}` };
  }
  return { message: err instanceof Error ? err.message : 'Something went wrong' };
}

function Tile({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: 'brand' | 'danger' | 'success' | 'warning';
}) {
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md',
        tone === 'brand' && 'bg-brand-tint text-icon-brand',
        tone === 'danger' && 'bg-status-danger-tint text-text-danger',
        tone === 'success' && 'bg-status-success-tint text-text-success',
        tone === 'warning' && 'bg-status-warning-tint text-text-warning',
      )}
    >
      <Icon aria-hidden className="size-5" />
    </span>
  );
}

function Line({
  icon: Icon,
  children,
  muted = false,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2.5',
        muted ? 'text-caption text-text-tertiary' : 'text-body-s text-text-secondary',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
      <span>{children}</span>
    </p>
  );
}

function Note({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'danger' | 'success' | 'info' | 'brand';
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-md px-3.5 py-3',
        tone === 'danger' && 'bg-status-danger-tint',
        tone === 'success' && 'bg-status-success-tint',
        tone === 'info' && 'bg-status-info-tint',
        tone === 'brand' && 'bg-brand-tint-subtle',
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-[18px] shrink-0',
          tone === 'danger' && 'text-text-danger',
          tone === 'success' && 'text-text-success',
          tone === 'info' && 'text-text-info',
          tone === 'brand' && 'text-icon-brand',
        )}
      />
      <div className="flex flex-col gap-1">
        <p className="text-label-m text-text-primary">{title}</p>
        {children && <div className="text-body-s text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}

function ReasonFields({
  categories,
  control,
  register,
  errors,
  watchReason,
  requireMfa,
  reasonLabel = 'Reason (required)',
  reasonHelper = 'Stored in the audit log next to your name. Never share passwords, seed phrases or 2FA codes.',
  codeLabel = 'Fresh 2FA code',
  codeHelper = 'Needed for every sensitive decision, even inside an active session.',
  idPrefix,
}: {
  categories: readonly string[];
  control: Control<SensitiveValues>;
  register: UseFormRegister<SensitiveValues>;
  errors: FieldErrors<SensitiveValues>;
  watchReason: string;
  requireMfa: boolean;
  reasonLabel?: string;
  reasonHelper?: string;
  codeLabel?: string;
  codeHelper?: string;
  idPrefix: string;
}) {
  return (
    <>
      <Controller
        control={control}
        name="reasonCategory"
        render={({ field }) => (
          <Field
            label="Reason category"
            error={errors.reasonCategory?.message}
            id={`${idPrefix}-cat`}
          >
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <Field
        label={reasonLabel}
        labelAside={
          <span className="text-caption tabular-nums text-text-tertiary">
            {watchReason.length} / 500
          </span>
        }
        helper={reasonHelper}
        error={errors.reason?.message}
        id={`${idPrefix}-reason`}
      >
        <Textarea
          rows={3}
          maxLength={500}
          placeholder="What did you check, and why is this needed?"
          {...register('reason')}
        />
      </Field>
      {requireMfa && (
        <Controller
          control={control}
          name="mfaCode"
          render={({ field }) => (
            <Field
              label={codeLabel}
              helper={codeHelper}
              error={errors.mfaCode?.message}
              id={`${idPrefix}-code`}
            >
              <OtpInput value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
      )}
    </>
  );
}

function makeSchema(requireMfa: boolean) {
  return z.object({
    reasonCategory: z.string().min(1, { error: 'Choose a reason category' }),
    reason: adminReasonSchema,
    mfaCode: requireMfa ? totpCodeSchema : z.string(),
  });
}

// ── ConfirmWithReasonDialog ─────────────────────────────────────────────────────────────────────

export interface ConfirmWithReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'brand' | 'danger';
  categories: readonly string[];
  /** A second admin must approve before anything changes. */
  fourEyes?: boolean;
  requireMfa?: boolean;
  submitLabel: string;
  submitVariant?: 'primary' | 'danger';
  /** Extra controls above the reason (e.g. restriction type, impact). */
  children?: React.ReactNode;
  /** Disable submit while extra fields are incomplete. */
  extraValid?: boolean;
  onSubmit: (values: SensitiveValues) => Promise<SubmitOutcome>;
  testId?: string;
  /** Second header line (e.g. "@nova.k · GP-48213"); `description` then renders under the header. */
  subtitle?: React.ReactNode;
  /** Four-eyes notice body (who must approve). */
  fourEyesText?: React.ReactNode;
  /** Audit notice body. */
  auditText?: React.ReactNode;
  reasonLabel?: string;
  reasonHelper?: string;
  codeLabel?: string;
  codeHelper?: string;
  /** Footer caption left of the buttons. */
  footerNote?: React.ReactNode;
}

export function ConfirmWithReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  icon = ShieldCheck,
  tone = 'brand',
  categories,
  fourEyes = false,
  requireMfa = true,
  submitLabel,
  submitVariant = 'primary',
  children,
  extraValid = true,
  onSubmit,
  testId = 'confirm-with-reason',
  subtitle,
  fourEyesText,
  auditText,
  reasonLabel,
  reasonHelper,
  codeLabel,
  codeHelper,
  footerNote,
}: ConfirmWithReasonDialogProps) {
  const schema = React.useMemo(() => makeSchema(requireMfa), [requireMfa]);
  const form = useForm<SensitiveValues>({
    resolver: zodResolver(schema),
    defaultValues: { reasonCategory: '', reason: '', mfaCode: '' },
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<SubmitOutcome | null>(null);
  const idPrefix = React.useId();

  React.useEffect(() => {
    if (!open) {
      form.reset({ reasonCategory: '', reason: '', mfaCode: '' });
      setFormError(null);
      setOutcome(null);
    }
  }, [open, form]);

  const values = form.watch();
  const ready =
    extraValid &&
    values.reasonCategory.length > 0 &&
    values.reason.trim().length >= 5 &&
    (!requireMfa || values.mfaCode.length === 6);

  const submit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      setOutcome(await onSubmit(v));
    } catch (err) {
      const e = actionErrorMessage(err);
      form.setValue('mfaCode', '');
      if (e.field) form.setError(e.field, { message: e.message });
      else setFormError(e.message);
    }
  });

  const Icon = icon;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="m" data-testid={testId} className="max-w-[560px]">
        <div className="flex items-start gap-3.5 border-b border-border-subtle px-6 pt-5 pb-5 pr-16">
          <Tile
            icon={outcome ? (outcome.kind === 'pending' ? Hourglass : CircleCheck) : Icon}
            tone={outcome ? 'success' : tone}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>
              {outcome ? (outcome.kind === 'pending' ? 'Request submitted' : outcome.title) : title}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              {outcome
                ? outcome.kind === 'pending'
                  ? 'Waiting for a second admin. Nothing has changed yet.'
                  : (outcome.body ?? 'Done.')
                : (subtitle ?? description)}
            </DialogDescription>
          </div>
          <DemoBadge size="s" className="ml-auto shrink-0" />
        </div>
        {outcome ? (
          <>
            <div className="flex flex-col gap-4 px-6 py-5">
              {outcome.kind === 'pending' ? (
                <>
                  <Note
                    tone="brand"
                    icon={Users}
                    title={`${outcome.ref} · awaiting second approver`}
                  >
                    Expires {formatDateTimeUTC(outcome.expiresAt)} — if nobody decides by then the
                    request closes and nothing changes. {outcome.note}
                  </Note>
                  <Line icon={History}>
                    Your request is in the audit log
                    {outcome.auditSeq
                      ? ` (entry #${Number(outcome.auditSeq).toLocaleString('en-US')})`
                      : ''}
                    . You can follow or withdraw it in Approvals.
                  </Line>
                </>
              ) : (
                <Note tone="success" icon={CircleCheck} title={outcome.title}>
                  {outcome.auditSeq
                    ? `Audit entry #${Number(outcome.auditSeq).toLocaleString('en-US')} · hash-chained.`
                    : 'Recorded in the audit log.'}
                </Note>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form noValidate onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
              {subtitle && description && (
                <p className="text-body-s text-text-secondary">{description}</p>
              )}
              {children}
              <ReasonFields
                categories={categories}
                control={form.control}
                register={form.register}
                errors={form.formState.errors}
                watchReason={values.reason}
                requireMfa={requireMfa}
                idPrefix={idPrefix}
                reasonLabel={reasonLabel}
                reasonHelper={reasonHelper}
                codeLabel={codeLabel}
                codeHelper={codeHelper}
              />
              {fourEyes && (
                <Note tone="info" icon={Users} title="A second admin must approve">
                  {fourEyesText ??
                    'Submitting creates a four-eyes request. A different admin with the right role reviews it with their own reason and 2FA. The request expires in 4 h if nobody acts.'}
                </Note>
              )}
              <div className="flex items-start gap-2.5 rounded-md border border-border-subtle bg-bg-secondary px-3.5 py-3 text-caption text-text-secondary">
                <History aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
                <span>
                  {auditText ??
                    'Recorded in the immutable, hash-chained audit log with your admin ID, role, reason, IP and UTC time.'}
                </span>
              </div>
              {formError && (
                <Note tone="danger" icon={CircleX} title="Not submitted">
                  {formError}
                </Note>
              )}
            </div>
            <DialogFooter className="tablet:items-center">
              <p className="mr-auto hidden text-caption text-text-tertiary tablet:block">
                {footerNote ??
                  (fourEyes ? 'Nothing changes until approved' : 'Takes effect when you submit')}
              </p>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={submitVariant}
                disabled={!ready}
                loading={form.formState.isSubmitting}
              >
                {fourEyes ? 'Submit for approval' : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── ApprovalReviewDialog ────────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, BadgeStatus> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'neutral',
  expired: 'expired',
};
const STATUS_LABEL: Record<string, string> = { cancelled: 'Withdrawn' };

export function approvalStatusBadge(status: string) {
  return <StatusBadge status={STATUS_BADGE[status] ?? 'neutral'} label={STATUS_LABEL[status]} />;
}

function whatHappens(a: ApprovalItem): string[] {
  const p = a.payload;
  switch (a.action) {
    case 'user.restriction.apply': {
      const type = p.type as RestrictionType;
      const who =
        typeof p.userHandle === 'string'
          ? formatHandle(p.userHandle)
          : typeof p.userPublicId === 'string'
            ? p.userPublicId
            : 'the player';
      return [
        `${RESTRICTION_LABEL[type] ?? type} is applied to ${who}. ${RESTRICTION_IMPACT[type] ?? ''}`,
        'The player sees an in-app notice without internal reason codes. Balances and ledger rows are not touched.',
        'Both admins, both reasons and both 2FA checks are stored in hash-chained audit entries.',
      ];
    }
    case 'withdrawal.approve':
      return [
        `${typeof p.reference === 'string' ? p.reference : 'The withdrawal'} moves to the send queue. Funds stay in Locked until sent; the network fee is deducted on-chain and the platform fee is 0.00.`,
        'Rejecting returns the full amount to the player’s Available balance.',
        'Both admins, both reasons and both 2FA checks are stored in hash-chained audit entries.',
      ];
    case 'admin.role.permissions.change': {
      const grant = (p.grant as string[] | undefined) ?? [];
      const revoke = (p.revoke as string[] | undefined) ?? [];
      return [
        `Role ${String(p.roleLabel ?? p.roleKey)} ${grant.length ? `gains ${grant.join(', ')}` : ''}${grant.length && revoke.length ? ' and ' : ''}${revoke.length ? `loses ${revoke.join(', ')}` : ''}.`,
        'Takes effect on the next request of every admin with that role (RBAC is loaded live).',
        'No role can ever edit results, choose winners, pay out or edit ledger rows — those permissions do not exist.',
      ];
    }
    default:
      return ['The requested action runs once, in the same transaction as your decision.'];
  }
}

function expiresIn(iso: string) {
  const m = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

function RequestCard({ a }: { a: ApprovalItem }) {
  const role = a.requestedBy.roles[0] ?? 'read_only';
  const p = a.payload;
  const facts: [string, React.ReactNode][] = [];
  if (a.action === 'withdrawal.approve') {
    if (typeof p.reference === 'string') facts.push(['Withdrawal', p.reference]);
    if (typeof p.amount === 'string') facts.push(['Amount', `${p.amount} USDT`]);
  } else if (a.action === 'user.restriction.apply') {
    facts.push(['Restriction', RESTRICTION_LABEL[p.type as RestrictionType] ?? String(p.type)]);
    facts.push([
      'Player',
      typeof p.userHandle === 'string'
        ? formatHandle(p.userHandle)
        : typeof p.userPublicId === 'string'
          ? p.userPublicId
          : '—',
    ]);
  } else if (a.action === 'admin.role.permissions.change') {
    facts.push(['Role', String(p.roleLabel ?? p.roleKey)]);
    const g = (p.grant as string[] | undefined) ?? [];
    const r = (p.revoke as string[] | undefined) ?? [];
    if (g.length) facts.push(['Grant', g.join(', ')]);
    if (r.length) facts.push(['Revoke', r.join(', ')]);
  }
  return (
    <article
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-border-gold bg-surface-default p-4"
      aria-label={`Request ${a.ref}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gold-tint-strong text-icon-gold">
          <Users aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex items-center gap-2 text-overline uppercase text-text-tertiary">
            Four-eyes approval · {a.ref} <DemoBadge size="xs" />
          </p>
          <p className="text-label-l text-text-primary">{a.summary}</p>
          <span>
            {a.status === 'pending' ? (
              <StatusBadge status="pending" label="Awaiting 2nd approver" />
            ) : (
              approvalStatusBadge(a.status)
            )}
          </span>
        </div>
      </div>
      <dl className="flex flex-col border-t border-border-subtle pt-1">
        {facts.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 py-1.5">
            <dt className="text-body-s text-text-tertiary">{k}</dt>
            <dd className="min-w-0 text-right text-label-m break-words">{v}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-body-s text-text-tertiary">Requested by</dt>
          <dd className="flex items-center gap-2 text-label-m">
            <Avatar initials={initialsOf(a.requestedBy.name)} size="s" />
            {a.requestedBy.name}
            <RoleChip role={role} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-body-s text-text-tertiary">Requested</dt>
          <dd className="text-label-m">{formatDateTimeUTC(a.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-body-s text-text-tertiary">Module</dt>
          <dd className="text-label-m">{a.module}</dd>
        </div>
      </dl>
      <figure className="flex flex-col gap-1.5 border-t border-border-subtle pt-3">
        <figcaption className="text-caption text-text-tertiary">
          Reason (required){a.requestCategory ? ` · ${a.requestCategory}` : ''}
        </figcaption>
        <blockquote className="rounded-md bg-surface-raised px-3 py-2.5 text-body-s text-text-primary">
          {a.requestReason}
        </blockquote>
      </figure>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 size-7 shrink-0 rounded-full border-2 border-dashed border-border-strong"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-label-m text-text-primary">
            {a.status === 'pending' ? 'Needs a second approver' : 'Second approver'}
          </span>
          <span className="text-caption text-text-tertiary">
            {a.requiredPermission
              ? `${PERMISSION_LABEL[a.requiredPermission] ?? a.requiredPermission} · can't be the requester`
              : 'Decided in its own module'}
          </span>
        </div>
        {a.status === 'pending' && a.expiresAt && (
          <span className="inline-flex shrink-0 items-center gap-1 text-caption text-text-warning">
            <Hourglass aria-hidden className="size-3.5" /> Expires in {expiresIn(a.expiresAt)}
          </span>
        )}
      </div>
      {a.status === 'pending' && (
        <p className="flex items-start gap-2 rounded-md bg-status-info-tint px-3 py-2.5 text-caption text-text-info">
          <KeyRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          2FA required to approve or reject. Your decision and reason are added to the request.
        </p>
      )}
    </article>
  );
}

function DecisionTrail({ a }: { a: ApprovalDetail }) {
  return (
    <ol className="flex flex-col" aria-label="Decision trail">
      {a.auditTrail.map((t) => {
        const ok = !/rejected|withdrawn|expired/.test(t.action);
        return (
          <li key={t.seq} className="flex gap-2.5 border-t border-border-subtle py-2.5">
            {ok ? (
              <CircleCheck
                aria-hidden
                className="mt-0.5 size-[18px] shrink-0 text-status-success"
              />
            ) : (
              <CircleX aria-hidden className="mt-0.5 size-[18px] shrink-0 text-text-danger" />
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-label-m text-text-primary">
                {formatTimeUTC(t.createdAt)} ·{' '}
                {t.action.replace(/^approval\./, '').replace(/[._]/g, ' ')}
                {t.actor ? ` · ${t.actor}` : ''}
              </p>
              <p className="truncate text-caption text-text-tertiary">
                {t.reason ? `“${t.reason}” · ` : ''}audit #{Number(t.seq).toLocaleString('en-US')} ·
                hash {t.hash.slice(0, 10)}…
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ApprovalReviewDialog({
  approvalId,
  onOpenChange,
}: {
  approvalId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = approvalId !== null;
  const q = useApproval(approvalId);
  const qc = useQueryClient();
  const { admin } = useAdminSession();
  const schema = React.useMemo(() => makeSchema(true), []);
  const form = useForm<SensitiveValues>({
    resolver: zodResolver(schema),
    defaultValues: { reasonCategory: '', reason: '', mfaCode: '' },
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [withdrawReason, setWithdrawReason] = React.useState('');
  const [busy, setBusy] = React.useState<null | 'approve' | 'reject' | 'withdraw'>(null);
  const idPrefix = React.useId();

  React.useEffect(() => {
    if (!open) {
      form.reset({ reasonCategory: '', reason: '', mfaCode: '' });
      setFormError(null);
      setWithdrawing(false);
      setWithdrawReason('');
    }
  }, [open, form]);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'approvals'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }),
    ]);
  };

  const decide = (kind: 'approve' | 'reject') =>
    form.handleSubmit(async (v) => {
      if (!approvalId) return;
      setFormError(null);
      setBusy(kind);
      try {
        await (kind === 'approve' ? approveRequest : rejectRequest)(approvalId, v);
        await refresh();
      } catch (err) {
        const e = actionErrorMessage(err);
        form.setValue('mfaCode', '');
        if (e.field) form.setError(e.field, { message: e.message });
        else setFormError(e.message);
        await qc.invalidateQueries({ queryKey: ['admin', 'approvals'] });
      } finally {
        setBusy(null);
      }
    })();

  const withdraw = async () => {
    if (!approvalId) return;
    setBusy('withdraw');
    setFormError(null);
    try {
      await withdrawRequest(approvalId, withdrawReason.trim());
      await refresh();
    } catch (err) {
      setFormError(actionErrorMessage(err).message);
    } finally {
      setBusy(null);
    }
  };

  const a = q.data;
  const values = form.watch();
  const ready =
    values.reasonCategory && values.reason.trim().length >= 5 && values.mfaCode.length === 6;
  const header = (() => {
    if (!a)
      return {
        icon: UserCheck,
        tone: 'brand' as const,
        title: 'Four-eyes request',
        sub: 'Loading…',
      };
    if (a.status === 'approved')
      return {
        icon: CircleCheck,
        tone: 'success' as const,
        title: `${a.ref} approved`,
        sub: `Approved by ${a.decidedBy?.name ?? '—'} on ${a.decidedAt ? formatDateTimeUTC(a.decidedAt) : '—'} · decision is final`,
      };
    if (a.status === 'rejected' || a.status === 'cancelled' || a.status === 'expired')
      return {
        icon: a.status === 'expired' ? Clock : CircleX,
        tone: 'danger' as const,
        title: `${a.ref} ${a.status === 'cancelled' ? 'withdrawn' : a.status}`,
        sub:
          a.status === 'expired'
            ? 'Nobody decided within 4 hours — nothing was changed.'
            : `${a.status === 'cancelled' ? 'Withdrawn' : 'Rejected'} by ${a.decidedBy?.name ?? '—'}${a.decidedAt ? ` on ${formatDateTimeUTC(a.decidedAt)}` : ''} — nothing was changed.`,
      };
    if (a.yourRole === 'requester')
      return {
        icon: Ban,
        tone: 'danger' as const,
        title: `${a.ref} · you can't approve your own request`,
        sub: `Requested by you on ${formatDateTimeUTC(a.createdAt)} · waiting for a second approver${a.expiresAt ? ` · expires ${formatTimeUTC(a.expiresAt)}` : ''}`,
      };
    return {
      icon: UserCheck,
      tone: 'brand' as const,
      title: `Review ${a.ref} · ${a.actionLabel.toLowerCase()}`,
      sub: `Requested by ${a.requestedBy.name}${a.requestedBy.title ? ` (${a.requestedBy.title})` : ''} on ${formatDateTimeUTC(a.createdAt)}${a.expiresAt ? ` · expires ${formatTimeUTC(a.expiresAt)}` : ''}`,
    };
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="l" className="max-w-[960px]" data-testid="approval-review">
        <div className="flex items-start gap-3.5 border-b border-border-subtle px-6 pt-5 pb-5 pr-16">
          <Tile icon={header.icon} tone={header.tone} />
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>{header.title}</DialogTitle>
            <DialogDescription>{header.sub}</DialogDescription>
          </div>
          <DemoBadge size="s" className="ml-auto shrink-0" />
        </div>
        {q.isPending ? (
          <div className="grid gap-6 p-6 laptop:grid-cols-2" aria-busy>
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        ) : q.isError || !a ? (
          <div className="p-6">
            <QueryErrorPanel
              error={q.error}
              onRetry={() => void q.refetch()}
              role={admin?.roles[0]}
              what="this request"
            />
          </div>
        ) : (
          <>
            <div className="grid min-h-0 gap-6 overflow-y-auto p-6 laptop:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
              <RequestCard a={a} />
              <div className="flex min-w-0 flex-col gap-4">
                {a.status !== 'pending' ? (
                  <>
                    <p className="text-overline uppercase text-text-tertiary">Decision trail</p>
                    {a.decisionReason && (
                      <Note
                        tone={a.status === 'approved' ? 'success' : 'info'}
                        icon={a.status === 'approved' ? CircleCheck : Eye}
                        title={`${a.decidedBy?.name ?? 'Decision'}'s reason`}
                      >
                        “{a.decisionReason}”
                      </Note>
                    )}
                    <DecisionTrail a={a} />
                    <Line icon={Lock} muted>
                      Decisions are final. If something is wrong, open a new request — balances are
                      never adjusted by hand.
                    </Line>
                  </>
                ) : a.yourRole === 'requester' ? (
                  <>
                    <Note tone="danger" icon={Ban} title="You can't approve your own request">
                      Four-eyes policy: a different admin with “
                      {a.requiredPermission ? PERMISSION_LABEL[a.requiredPermission] : '—'}” must
                      approve or reject it.
                    </Note>
                    <p className="text-overline uppercase text-text-tertiary">Eligible approvers</p>
                    <ul className="flex flex-col gap-2" data-testid="eligible-approvers">
                      {a.eligibleApprovers.length === 0 && (
                        <li className="text-body-s text-text-secondary">
                          No other active admin holds this permission yet.
                        </li>
                      )}
                      {a.eligibleApprovers.slice(0, 5).map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-2.5 rounded-md bg-surface-raised px-3 py-2.5"
                        >
                          <Avatar initials={initialsOf(e.name)} size="s" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-label-m">{e.name}</span>
                            <span className="text-caption text-text-tertiary">
                              {e.lastLoginAt
                                ? `Last sign-in ${formatDateTimeUTC(e.lastLoginAt)}`
                                : 'Not signed in yet'}
                            </span>
                          </span>
                          <RoleChip role={e.roles[0] ?? 'read_only'} className="ml-auto" />
                        </li>
                      ))}
                    </ul>
                    <Line icon={Lock}>
                      Nothing moves until a second admin decides.
                      {a.expiresAt
                        ? ` If nobody decides by ${formatTimeUTC(a.expiresAt)} the request expires and changes nothing.`
                        : ''}
                    </Line>
                    {withdrawing && (
                      <Field
                        label="Why are you withdrawing it?"
                        helper="Min. 5 characters · audit-logged"
                      >
                        <Textarea
                          rows={2}
                          value={withdrawReason}
                          onChange={(e) => setWithdrawReason(e.target.value)}
                          maxLength={500}
                        />
                      </Field>
                    )}
                  </>
                ) : a.yourRole === 'external' ? (
                  <Note tone="info" icon={Lock} title="Decided in its own module">
                    This request belongs to another module with its own dual-control rules. Open{' '}
                    <a
                      href={a.decideAt ?? '/admin'}
                      className="text-text-brand underline-offset-4 hover:underline"
                    >
                      {a.decideAt}
                    </a>{' '}
                    to review it — nothing can be approved from here.
                  </Note>
                ) : a.yourRole === 'not_eligible' ? (
                  <Note
                    tone="info"
                    icon={Lock}
                    title="You can see this request, but your role can't decide it"
                  >
                    It needs “{a.requiredPermission ? PERMISSION_LABEL[a.requiredPermission] : '—'}
                    ”, held by
                    {` ${a.eligibleApprovers.map((e) => e.name).join(', ') || 'no active admin'}`}.
                  </Note>
                ) : (
                  <form
                    noValidate
                    className="flex flex-col gap-4"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <p className="text-overline uppercase text-text-brand">
                      Your decision · second approver
                    </p>
                    <ReasonFields
                      categories={ADMIN_CONSOLE_REASON_CATEGORIES.approval_decision}
                      control={form.control}
                      register={form.register}
                      errors={form.formState.errors}
                      watchReason={values.reason}
                      requireMfa
                      reasonLabel="Your reason — stored next to the requester's"
                      idPrefix={idPrefix}
                    />
                    <div className="flex flex-col gap-2 rounded-md bg-surface-raised p-4">
                      <p className="text-overline uppercase text-text-tertiary">
                        What happens when you approve
                      </p>
                      {whatHappens(a).map((t) => (
                        <Line key={t} icon={CircleCheck}>
                          {t}
                        </Line>
                      ))}
                    </div>
                  </form>
                )}
                {formError && (
                  <Note tone="danger" icon={CircleX} title="Not recorded">
                    {formError}
                  </Note>
                )}
              </div>
            </div>
            <DialogFooter className="items-center">
              <p className="mr-auto hidden text-caption text-text-tertiary tablet:block">
                Requester ≠ approver · every decision needs a reason and a fresh 2FA code ·
                hash-chained
              </p>
              {a.status !== 'pending' ? (
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              ) : a.yourRole === 'requester' ? (
                withdrawing ? (
                  <>
                    <Button variant="secondary" onClick={() => setWithdrawing(false)}>
                      Keep request
                    </Button>
                    <Button
                      variant="danger"
                      disabled={withdrawReason.trim().length < 5}
                      loading={busy === 'withdraw'}
                      onClick={() => void withdraw()}
                    >
                      Withdraw request
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setWithdrawing(true)}>
                      Withdraw my request
                    </Button>
                    <Button disabled leadingIcon={<Lock aria-hidden />}>
                      Approve
                    </Button>
                  </>
                )
              ) : a.yourRole === 'not_eligible' || a.yourRole === 'external' ? (
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    leadingIcon={<CircleX aria-hidden />}
                    disabled={!ready || busy !== null}
                    loading={busy === 'reject'}
                    onClick={() => void decide('reject')}
                  >
                    Reject request
                  </Button>
                  <Button
                    leadingIcon={<ShieldCheck aria-hidden />}
                    disabled={!ready || busy !== null}
                    loading={busy === 'approve'}
                    onClick={() => void decide('approve')}
                    data-testid="approve-request"
                  >
                    {a.action === 'withdrawal.approve'
                      ? 'Approve & release'
                      : a.action === 'user.restriction.apply'
                        ? 'Approve & apply'
                        : 'Approve change'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function roleName(role: string) {
  return ADMIN_ROLE_LABEL[role as AdminRole] ?? role;
}
