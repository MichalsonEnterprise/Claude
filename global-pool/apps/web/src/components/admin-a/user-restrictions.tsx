'use client';

/**
 * ADM-U8 Account restrictions: active restrictions (lift = reason + 2FA, no second approver), "Apply a restriction"
 * cards (one per type, policy chips), restriction history, and the side panels "What restrictions can do",
 * "Four-eyes requests" and "What the user sees". Apply dialog: restriction select · what changes for the user ·
 * reason category + internal reason · fresh 2FA; withdrawal holds and suspensions become a FOUR-EYES request.
 * Restrictions never touch balances or ledger rows.
 */
import {
  RESTRICTION_IMPACT,
  RESTRICTION_LABEL,
  RESTRICTION_REQUIRES_FOUR_EYES,
  RESTRICTION_TYPES,
  type RestrictionType,
} from '@gp/shared/enums';
import { formatDateTimeUTC, formatHandle } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import { ADMIN_CONSOLE_REASON_CATEGORIES } from '@gp/shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  CircleCheck,
  CircleX,
  Eye,
  Fingerprint,
  Gamepad2,
  History,
  Lock,
  MessageSquareText,
  Scale,
  Unlock,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  applyRestriction,
  liftRestriction,
  type AdminUserDetail,
  type UserRestriction,
} from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { approvalStatusBadge, ApprovalReviewDialog, ConfirmWithReasonDialog } from './four-eyes';
import { useApprovalsInbox, useUser } from './hooks';
import { Panel, QueryErrorPanel } from './primitives';
import { useAdminSession } from './session';
import { useUserId } from './user-detail';

const TYPE_ICON: Record<RestrictionType, LucideIcon> = {
  withdrawals_frozen: ArrowUpFromLine,
  gaming_blocked: Gamepad2,
  deposits_blocked: ArrowDownToLine,
  account_suspended: UserX,
};

const PLAYER_MESSAGE: Record<RestrictionType, { title: string; body: string }> = {
  withdrawals_frozen: {
    title: 'Your withdrawals are on hold',
    body: "We're reviewing your account. Your balance is safe and unchanged. Questions? Contact support.",
  },
  gaming_blocked: {
    title: 'Games and pool entries are paused',
    body: 'Some actions on your account are restricted. Your balance is unchanged and withdrawals keep working.',
  },
  deposits_blocked: {
    title: 'Deposits are paused',
    body: 'Some actions on your account are restricted. Your balance is unchanged and withdrawals keep working.',
  },
  account_suspended: {
    title: 'Your account is suspended',
    body: 'Some actions on your account are restricted. Your balance is safe and withdrawals stay available.',
  },
};

function PolicyChip({
  icon: Icon,
  children,
  brand = false,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  brand?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold',
        brand ? 'bg-brand-tint text-text-brand' : 'bg-surface-raised text-text-secondary',
      )}
    >
      <Icon aria-hidden className="size-3" />
      {children}
    </span>
  );
}

function WhatChanges({ type, u }: { type: RestrictionType; u: AdminUserDetail }) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-md border border-border-subtle bg-bg-secondary p-3.5"
      aria-live="polite"
    >
      <p className="text-overline uppercase text-text-tertiary">What changes for the user</p>
      <p className="flex items-start gap-2.5 text-body-s text-text-secondary">
        <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-text-warning" />
        {RESTRICTION_IMPACT[type]}
      </p>
      <p className="flex items-start gap-2.5 text-body-s text-text-secondary">
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
        {type === 'withdrawals_frozen'
          ? 'Deposits, play and Global Pool entries keep working.'
          : 'Withdrawals keep working — a restriction never traps funds.'}
      </p>
      <p className="flex items-start gap-2.5 text-body-s text-text-secondary">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
        Balances are not touched: {formatUSDT(u.balances.total)} total stays exactly as recorded in
        the ledger.
      </p>
    </div>
  );
}

export function UserRestrictionsTab() {
  const id = useUserId();
  const { can, admin } = useAdminSession();
  const user = useUser(id);
  const inbox = useApprovalsInbox('open');
  const qc = useQueryClient();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [applyOpen, setApplyOpen] = React.useState(params.get('apply') === '1');
  const [type, setType] = React.useState<RestrictionType | null>(null);
  const [lift, setLift] = React.useState<UserRestriction | null>(null);
  const [review, setReview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!applyOpen && params.get('apply')) router.replace(pathname, { scroll: false });
  }, [applyOpen, params, pathname, router]);

  if (user.isPending) return null;
  if (user.isError || !user.data)
    return <QueryErrorPanel error={user.error} role={admin?.roles[0]} what="restrictions" />;
  const u = user.data;
  const who = u.handle ? formatHandle(u.handle) : u.publicId;
  const active = u.restrictions.filter((r) => !r.liftedAt);
  const history = u.restrictions.filter((r) => r.liftedAt);
  const pending = (inbox.data?.items ?? []).filter(
    (a) => a.targetType === 'user' && a.targetId === id,
  );
  const activeTypes = new Set(active.map((r) => r.type));
  const canRestrict = can('users.restrict');
  const preview: RestrictionType = type ?? active[0]?.type ?? 'withdrawals_frozen';
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'approvals'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] }),
    ]);
  const openApply = (t: RestrictionType | null) => {
    setType(t);
    setApplyOpen(true);
  };

  return (
    <div
      className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]"
      data-testid="user-restrictions"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <Panel
          title="Active restrictions"
          icon={Lock}
          demo
          actions={
            canRestrict ? (
              <Button
                size="s"
                variant="danger"
                leadingIcon={<Ban aria-hidden />}
                onClick={() => openApply(null)}
                data-testid="apply-restriction"
              >
                Restrict account
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                <Lock aria-hidden className="size-3.5" /> Needs users.restrict
              </span>
            )
          }
        >
          {active.length === 0 ? (
            <p className="text-body-s text-text-secondary">
              No active restrictions — the player can use every feature their region and limits
              allow.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {active.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-md border border-status-danger/30 bg-status-danger-tint p-3 tablet:flex-row tablet:items-start"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="restricted" label={RESTRICTION_LABEL[r.type]} />
                      <span className="text-caption text-text-tertiary">
                        since {formatDateTimeUTC(r.appliedAt)}
                      </span>
                    </span>
                    <span className="text-body-s text-text-secondary">“{r.reason}”</span>
                    <span className="text-caption text-text-tertiary">
                      {RESTRICTION_IMPACT[r.type]}
                    </span>
                  </div>
                  {canRestrict && (
                    <Button
                      size="s"
                      variant="secondary"
                      leadingIcon={<Unlock aria-hidden />}
                      onClick={() => setLift(r)}
                    >
                      Lift
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Apply a restriction"
          icon={Ban}
          description="Choose the narrowest restriction that addresses the risk. Every option needs a reason and a fresh 2FA code and is explained to the player."
        >
          <ul className="grid gap-3 tablet:grid-cols-2">
            {RESTRICTION_TYPES.map((t) => {
              const Icon = TYPE_ICON[t];
              const isActive = activeTypes.has(t);
              return (
                <li
                  key={t}
                  className="flex flex-col gap-2.5 rounded-md border border-border-subtle bg-bg-secondary p-4"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-md bg-surface-raised text-icon-muted">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="text-label-l text-text-primary">{RESTRICTION_LABEL[t]}</span>
                  </span>
                  <p className="text-caption text-text-secondary">{RESTRICTION_IMPACT[t]}</p>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <PolicyChip icon={MessageSquareText}>Reason</PolicyChip>
                    <PolicyChip icon={Fingerprint}>2FA</PolicyChip>
                    {RESTRICTION_REQUIRES_FOUR_EYES[t] && (
                      <PolicyChip icon={Users} brand>
                        4-eyes
                      </PolicyChip>
                    )}
                    <Button
                      size="s"
                      variant="ghost"
                      className="ml-auto"
                      disabled={!canRestrict || isActive}
                      onClick={() => openApply(t)}
                      aria-label={`Apply ${RESTRICTION_LABEL[t]}`}
                    >
                      {isActive ? 'Active' : 'Apply…'}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          title="Restriction history"
          icon={History}
          demo
          actions={
            <span className="text-caption text-text-tertiary">
              {u.restrictions.length} in total
            </span>
          }
        >
          {history.length === 0 ? (
            <p className="text-body-s text-text-secondary">No lifted restrictions.</p>
          ) : (
            <ul className="flex flex-col">
              {history.map((r, i) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex flex-col gap-0.5 py-2.5',
                    i > 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="text-label-m">{RESTRICTION_LABEL[r.type]}</span>
                  <span className="text-caption text-text-tertiary">
                    Applied {formatDateTimeUTC(r.appliedAt)} · reason: “{r.reason}” · lifted{' '}
                    {r.liftedAt ? formatDateTimeUTC(r.liftedAt) : ''} · “{r.liftReason ?? '—'}”
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="What restrictions can do" icon={Scale}>
          <ul className="flex flex-col gap-2.5 text-body-s text-text-secondary">
            {(
              [
                [true, 'Limit access to specific features, one at a time'],
                [true, 'Always need a reason, your 2FA code and an audit entry'],
                [true, 'Tell the user what is limited and how to get help'],
                [true, 'Withdrawal holds and suspensions need a second approver'],
                [false, 'Never change balances or ledger entries'],
                [false, 'Never cancel active entries or alter round results'],
                [false, 'Never block a self-excluded player from withdrawing'],
              ] as const
            ).map(([ok, text]) => (
              <li key={text} className="flex items-start gap-2">
                {ok ? (
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
                ) : (
                  <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
                )}
                {text}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Four-eyes requests" icon={Users} demo>
          {pending.length === 0 ? (
            <p className="text-body-s text-text-secondary">
              No pending requests for this user.
              <span className="mt-1 block text-caption text-text-tertiary">
                Requests you submit wait here until a Compliance Officer or Super Admin approves or
                rejects them. They expire after 4 h.
              </span>
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-1.5 rounded-md bg-surface-raised px-3 py-2.5"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-mono-s text-text-tertiary">{a.ref}</span>
                    {approvalStatusBadge(a.status)}
                  </span>
                  <span className="text-body-s text-text-primary">{a.summary}</span>
                  <span className="flex items-center gap-2 text-caption text-text-tertiary">
                    by {a.requestedBy.name}
                    <Button
                      size="s"
                      variant={a.yourRole === 'can_decide' ? 'primary' : 'ghost'}
                      className="ml-auto"
                      onClick={() => setReview(a.id)}
                    >
                      {a.yourRole === 'can_decide' ? 'Review' : 'View'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="What the user sees" icon={Eye}>
          <div className="flex flex-col gap-1.5 rounded-md border border-border-subtle bg-bg-secondary p-3.5">
            <p className="text-label-l text-text-primary">{PLAYER_MESSAGE[preview].title}</p>
            <p className="text-caption text-text-secondary">{PLAYER_MESSAGE[preview].body}</p>
          </div>
          <p className="mt-2 text-caption text-text-tertiary">
            Example for “{RESTRICTION_LABEL[preview]}”. Internal reasons and admin names are never
            shown to the user.
          </p>
        </Panel>
      </div>

      <ConfirmWithReasonDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title="Apply restriction"
        subtitle={
          <>
            {who} · <span className="font-mono">{u.publicId}</span>{' '}
            {u.isDemo && <DemoBadge size="xs" />}
          </>
        }
        description=""
        icon={Ban}
        tone="danger"
        categories={ADMIN_CONSOLE_REASON_CATEGORIES.restriction_apply}
        fourEyes={type ? RESTRICTION_REQUIRES_FOUR_EYES[type] : false}
        fourEyesText={`A second admin (Compliance Officer or Super Admin) must approve before the ${type ? RESTRICTION_LABEL[type].toLowerCase() : 'restriction'} takes effect. The request expires in 4 h if nobody acts.`}
        auditText={`Recorded in the immutable audit log with your admin ID, role, reason, IP and UTC time. The user is told “${type ? PLAYER_MESSAGE[type].title : 'Some actions on your account are restricted'}” — internal reasons are never shown.`}
        reasonLabel="Reason (required, internal)"
        codeLabel="Your 2FA code"
        codeHelper="Re-authenticate to submit · code from your authenticator app"
        submitLabel="Apply restriction"
        submitVariant="danger"
        extraValid={type !== null}
        testId="apply-restriction-dialog"
        onSubmit={async (v) => {
          const res = await applyRestriction(id, {
            type: type!,
            reason: v.reason,
            reasonCategory: v.reasonCategory,
            mfaCode: v.mfaCode,
          });
          await refresh();
          if (res.status === 'pending_approval') {
            return {
              kind: 'pending',
              ref: res.approval.ref,
              expiresAt: res.approval.expiresAt,
              auditSeq: res.approval.auditSeq,
              note: `${RESTRICTION_LABEL[type!]} applies only after a different admin approves.`,
            };
          }
          return {
            kind: 'done',
            title: `${RESTRICTION_LABEL[res.type]} applied`,
            body: RESTRICTION_IMPACT[res.type],
          };
        }}
      >
        <Field label="Restriction">
          <Select value={type ?? undefined} onValueChange={(v) => setType(v as RestrictionType)}>
            <SelectTrigger size="l">
              <SelectValue placeholder="Choose a restriction" />
            </SelectTrigger>
            <SelectContent>
              {RESTRICTION_TYPES.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  disabled={activeTypes.has(t)}
                  aside={
                    activeTypes.has(t)
                      ? 'Active'
                      : RESTRICTION_REQUIRES_FOUR_EYES[t]
                        ? '4-eyes'
                        : undefined
                  }
                >
                  {RESTRICTION_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {type && <WhatChanges type={type} u={u} />}
      </ConfirmWithReasonDialog>

      <ConfirmWithReasonDialog
        open={lift !== null}
        onOpenChange={(o) => !o && setLift(null)}
        title={lift ? `Lift “${RESTRICTION_LABEL[lift.type]}”` : 'Lift restriction'}
        subtitle={
          <>
            {who} · <span className="font-mono">{u.publicId}</span>
          </>
        }
        description="Lifting needs a reason and a fresh 2FA code — no second approver. The player regains the blocked features immediately."
        icon={Unlock}
        categories={ADMIN_CONSOLE_REASON_CATEGORIES.restriction_lift}
        reasonLabel="Reason (required, internal)"
        codeLabel="Your 2FA code"
        codeHelper="Re-authenticate to submit · code from your authenticator app"
        submitLabel="Lift restriction"
        testId="lift-restriction-dialog"
        onSubmit={async (v) => {
          const res = await liftRestriction(id, lift!.id, {
            reason: v.reason,
            mfaCode: v.mfaCode,
            reasonCategory: v.reasonCategory,
          });
          await refresh();
          return {
            kind: 'done',
            title: `${RESTRICTION_LABEL[res.type]} lifted`,
            body: `Lifted at ${formatDateTimeUTC(res.liftedAt)}.`,
          };
        }}
      />

      <ApprovalReviewDialog approvalId={review} onOpenChange={(o) => !o && setReview(null)} />
    </div>
  );
}
