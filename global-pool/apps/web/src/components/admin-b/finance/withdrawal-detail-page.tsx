'use client';

import type { ChainKey } from '@gp/shared/chains';
import { ADMIN_REASON_CATEGORIES } from '@gp/shared/schemas';
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Download,
  Eye,
  Info,
  Lock,
  ShieldCheck,
  TriangleAlert,
  Unlock,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { toast } from '@/components/ui/sonner';
import {
  useAdminMe,
  useApproveWithdrawal,
  useCan,
  useRejectWithdrawal,
  useWithdrawal,
  type WithdrawalDetail,
} from '@/lib/api/admin-b';
import { cn } from '@/lib/utils';

import { ReasonDialog } from '../reason-dialog';
import {
  CopyHash,
  KeyValues,
  ModuleHeader,
  MoneyText,
  Panel,
  PageSkeleton,
  PageStack,
  Pill,
  QueryView,
  RiskMeter,
  count,
  dt,
  humanMinutes,
  time,
  usd,
} from '../primitives';
import { WITHDRAWAL_BADGE } from './withdrawals-page';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function since(iso: string): string {
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / (30 * 86_400_000)),
  );
  if (months < 1) return 'under a month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y > 0 ? `${y} y ${m} m` : `${m} m`;
}

interface Check {
  name: string;
  detail: string;
  result: string;
  ok: boolean;
}

/** Screening results from the AML provider (array of checks), or a summary built from the stored flags. */
function screeningChecks(w: WithdrawalDetail): Check[] {
  const aml = w.amlAlerts[0];
  const raw = aml?.details.checks;
  if (Array.isArray(raw)) {
    return (
      raw as {
        name?: string;
        key?: string;
        passed?: boolean;
        ok?: boolean;
        detail?: string;
        result?: string;
      }[]
    ).map((c, i) => {
      const ok = c.passed ?? c.ok ?? true;
      return {
        name: c.name ?? c.key ?? `Check ${i + 1}`,
        detail: c.detail ?? '',
        result: c.result ?? (ok ? 'Clear' : 'Flagged'),
        ok,
      };
    });
  }
  const flags = Array.isArray(w.risk.factors) ? w.risk.factors : [];
  const list: Check[] = [
    {
      name: 'Sanctions screening',
      detail: 'Destination checked against sanctions lists (mock provider in DEMO)',
      result: 'Clear',
      ok: true,
    },
    {
      name: 'Destination history',
      detail: w.destination.firstPayout
        ? 'First withdrawal ever sent to this address'
        : `${count(w.destination.previousPayouts)} earlier payouts to this address`,
      result: w.destination.firstPayout ? 'Flagged' : 'Known',
      ok: !w.destination.firstPayout,
    },
    {
      name: 'Address whitelist',
      detail: w.destination.whitelistedAt
        ? `Whitelisted ${dt(w.destination.whitelistedAt)} · 24 h cool-down passed`
        : 'Not on the player’s whitelist',
      result: w.destination.whitelistedAt ? 'Verified' : 'Missing',
      ok: Boolean(w.destination.whitelistedAt),
    },
  ];
  if (flags.some((f) => /amount|velocity/.test(f)))
    list.push({
      name: 'Amount vs history',
      detail: 'Unusual amount or velocity for this player',
      result: 'Flagged',
      ok: false,
    });
  return list;
}

function DecisionPanel({
  w,
  onApprove,
  onReject,
}: {
  w: WithdrawalDetail;
  onApprove: () => void;
  onReject: () => void;
}) {
  const canApproveRole = useCan('withdrawals.approve');
  const canRejectRole = useCan('withdrawals.reject');
  const me = useAdminMe();
  const { fourEyes } = w;
  const step = fourEyes.required ? Math.min(2, fourEyes.approvals + 1) : 1;
  const approveLabel = fourEyes.required ? `Approve · step ${step} of 2` : 'Approve';
  return (
    <section
      aria-labelledby="decision-h"
      className="flex flex-col gap-4 rounded-lg border border-border-brand bg-surface-default p-5 laptop:sticky laptop:top-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="decision-h" className="text-h4 text-text-primary">
          Decision
        </h2>
        <p className="text-body-s text-text-secondary">
          {fourEyes.required
            ? 'Four-eyes required: AML-flagged or large request (policy FIN-2.3). Each step needs 2FA and a written reason.'
            : 'One approval with a written reason and 2FA queues this withdrawal for sending.'}
        </p>
      </div>
      {fourEyes.required ? (
        <ol className="flex flex-col gap-2">
          <li
            className={cn(
              'flex items-center gap-3 rounded-md border p-3',
              fourEyes.approvals === 0
                ? 'border-border-brand bg-brand-tint/40'
                : 'border-border-subtle bg-bg-secondary',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-label-s',
                fourEyes.approvals > 0
                  ? 'bg-status-success text-text-on-primary'
                  : 'bg-brand text-text-on-primary',
              )}
            >
              {fourEyes.approvals > 0 ? <CircleCheck aria-hidden className="size-4" /> : '1'}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label-m text-text-primary">
                First approver{fourEyes.approvals === 0 ? ' — you' : ''}
              </span>
              <span className="text-caption text-text-tertiary">
                {fourEyes.firstApprover ?? me.data?.name ?? 'Finance or Compliance'} · reason + 2FA
              </span>
            </span>
            <Pill tone={fourEyes.approvals > 0 ? 'success' : 'info'}>
              {fourEyes.approvals > 0 ? 'Done' : 'Your turn'}
            </Pill>
          </li>
          <li
            className={cn(
              'flex items-center gap-3 rounded-md border p-3',
              fourEyes.approvals === 1 && !fourEyes.firstApprovedByMe
                ? 'border-border-brand bg-brand-tint/40'
                : 'border-border-subtle bg-bg-secondary',
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-label-s text-text-secondary">
              2
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label-m text-text-primary">Second approver</span>
              <span className="text-caption text-text-tertiary">
                A different admin with the approve permission · not the first approver · within 4 h
              </span>
            </span>
            {fourEyes.approvals === 0 || fourEyes.firstApprovedByMe ? (
              <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                <Lock aria-hidden className="size-3.5" /> Locked
              </span>
            ) : (
              <Pill tone="info">Your turn</Pill>
            )}
          </li>
        </ol>
      ) : null}
      {w.canDecide ? (
        <div className="hidden flex-col gap-2 tablet:flex">
          <Button
            leadingIcon={<ShieldCheck aria-hidden />}
            onClick={onApprove}
            disabled={!w.canApprove || !canApproveRole}
            title={
              !canApproveRole
                ? 'Your role cannot approve withdrawals'
                : fourEyes.firstApprovedByMe
                  ? 'Self-approval is disabled'
                  : undefined
            }
          >
            {approveLabel}
          </Button>
          <Button
            variant="danger"
            leadingIcon={<CircleX aria-hidden />}
            onClick={onReject}
            disabled={!canRejectRole}
          >
            Reject…
          </Button>
          {fourEyes.firstApprovedByMe ? (
            <p className="text-caption text-text-warning">
              You gave the first approval. Self-approval is disabled — a different admin must give
              the second.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-md bg-bg-secondary p-3 text-body-s text-text-secondary">
          This withdrawal is {w.statusLabel.toLowerCase()} — no review action is open.
        </p>
      )}
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        You can’t change the amount or destination, or send funds anywhere else. Rejecting returns{' '}
        {usd(w.amount)} USDT to the user’s Available balance and needs a reason and 2FA.
      </p>
    </section>
  );
}

export function WithdrawalDetailPage({ id }: { id: string }) {
  const q = useWithdrawal(id);
  const approve = useApproveWithdrawal(id);
  const reject = useRejectWithdrawal(id);
  const canApproveRole = useCan('withdrawals.approve');
  const canRejectRole = useCan('withdrawals.reject');
  const [dialog, setDialog] = React.useState<'approve' | 'reject' | null>(null);

  return (
    <QueryView query={q} skeleton={<PageSkeleton tiles={3} rows={8} />}>
      {(w) => {
        const aml = w.amlAlerts[0];
        const checks = screeningChecks(w);
        const flaggedChecks = checks.filter((c) => !c.ok).length;
        const step = w.fourEyes.required ? Math.min(2, w.fourEyes.approvals + 1) : 1;
        const activity = [
          ...w.audit.map((a) => ({
            key: `a${a.seq}`,
            at: a.createdAt,
            icon: a.action.includes('reject')
              ? CircleX
              : a.action.includes('approve')
                ? ShieldCheck
                : Eye,
            title: `${a.action.replace(/\./g, ' ')} — ${a.actorLabel ?? a.actorType}`,
            detail: `Audit #${count(Number(a.seq))}${a.reason ? ` · “${a.reason}”` : ''}`,
          })),
          ...w.timeline.map((t, i) => ({
            key: `t${i}`,
            at: t.at,
            icon:
              t.status === 'requested'
                ? Upload
                : t.status === 'under_review'
                  ? TriangleAlert
                  : t.status === 'rejected'
                    ? Unlock
                    : t.status === 'confirmed'
                      ? Download
                      : Info,
            title: t.label,
            detail: `Status → ${t.status.replace(/_/g, ' ')}`,
          })),
          ...w.postings.map((p) => ({
            key: `p${p.id}`,
            at: p.createdAt,
            icon: Lock,
            title: p.kindLabel,
            detail: p.lines.map((l) => `${l.account} ${l.amount}`).join(' · '),
          })),
        ].sort((a, b) => b.at.localeCompare(a.at));
        return (
          <PageStack>
            <ModuleHeader
              module="Finance"
              title={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="font-mono">{w.reference}</span>
                  <StatusBadge
                    status={WITHDRAWAL_BADGE[w.status] ?? 'neutral'}
                    label={w.statusLabel}
                  />
                  {aml ? (
                    <Pill tone="warning" icon={TriangleAlert}>
                      {aml.reference} · {aml.rule.replace(/_/g, ' ')}
                    </Pill>
                  ) : null}
                </span>
              }
              crumb={w.reference}
              description={
                <>
                  Requested {dt(w.createdAt)} by {w.user.handle} · SLA {w.sla.hours} h — due{' '}
                  {time(w.sla.dueAt)} UTC
                  {w.sla.minutesLeft !== null ? ` (${humanMinutes(w.sla.minutesLeft)})` : ''}
                </>
              }
              actions={
                w.canDecide ? (
                  <span className="hidden items-center gap-2 tablet:flex">
                    <Button
                      variant="danger"
                      leadingIcon={<CircleX aria-hidden />}
                      onClick={() => setDialog('reject')}
                      disabled={!canRejectRole}
                    >
                      Reject…
                    </Button>
                    <Button
                      leadingIcon={<ShieldCheck aria-hidden />}
                      onClick={() => setDialog('approve')}
                      disabled={!w.canApprove || !canApproveRole}
                    >
                      {w.fourEyes.required ? `Approve · step ${step} of 2` : 'Approve'}
                    </Button>
                  </span>
                ) : undefined
              }
            />
            <p className="-mt-3">
              <Link
                href="/admin/finance/withdrawals"
                className="inline-flex min-h-11 items-center gap-1 text-label-s text-text-secondary hover:text-text-primary tablet:min-h-0"
              >
                ← Back to the queue
              </Link>
            </p>

            <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex min-w-0 flex-col gap-4">
                <Panel
                  title="Request summary"
                  demo={w.isDemo}
                  description="What the user asked for. Amount and destination are locked after submission — no admin role can edit them."
                >
                  <div className="flex flex-col gap-4">
                    <p className="flex items-baseline gap-2">
                      <span className="text-display-m text-text-primary tabular-nums">
                        {usd(w.amount)}
                      </span>
                      <span className="text-label-l text-text-tertiary">USDT</span>
                    </p>
                    <div className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-secondary p-4">
                      <p className="flex items-center justify-between text-label-m text-text-primary">
                        Fee breakdown <DemoBadge size="xs" />
                      </p>
                      <div className="flex justify-between gap-2 text-body-s">
                        <span className="text-text-secondary">Withdrawal amount</span>
                        <MoneyText value={w.amount} className="text-text-primary" />
                      </div>
                      <div className="flex justify-between gap-2 text-body-s">
                        <span className="flex flex-col">
                          <span className="text-text-secondary">
                            Network fee · {w.destination.networkName}
                          </span>
                          <span className="text-caption text-text-tertiary">
                            Paid to the network, not to GLOBAL POOL
                          </span>
                        </span>
                        <MoneyText value={`-${w.networkFee}`} className="text-text-primary" />
                      </div>
                      <div className="flex justify-between gap-2 text-body-s">
                        <span className="flex flex-col">
                          <span className="text-text-secondary">Platform fee</span>
                          <span className="text-caption text-text-tertiary">
                            No platform fee on withdrawals
                          </span>
                        </span>
                        <MoneyText value={w.platformFee} className="text-text-primary" />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-border-brand bg-brand-tint/30 px-4 py-3">
                        <span className="flex flex-col">
                          <span className="text-label-m text-text-primary">You receive</span>
                          <span className="text-caption text-text-tertiary">
                            to {short(w.destination.address)} on {w.destination.networkName}
                          </span>
                        </span>
                        <span className="text-number-m text-text-primary tabular-nums">
                          {usd(w.youReceive)}{' '}
                          <span className="text-caption text-text-tertiary">USDT</span>
                        </span>
                      </div>
                    </div>
                    <KeyValues
                      items={[
                        { k: 'User', v: `${w.user.handle} · ${w.user.publicId}` },
                        {
                          k: 'Network',
                          v: (
                            <span className="inline-flex items-center gap-1.5">
                              <ChainMark
                                chain={w.destination.network as ChainKey}
                                size={16}
                                label=""
                              />
                              {w.destination.networkName} (testnet)
                            </span>
                          ),
                        },
                        {
                          k: 'Destination',
                          v: (
                            <span className="flex flex-col items-end gap-0.5">
                              <CopyHash value={w.destination.address} label="destination address" />
                              <span className="text-caption text-text-warning">
                                {w.destination.whitelistedAt
                                  ? `Whitelisted ${dt(w.destination.whitelistedAt).slice(0, 11)}`
                                  : 'Not whitelisted'}
                                {w.destination.firstPayout ? ' · first payout to this address' : ''}
                              </span>
                            </span>
                          ),
                        },
                        { k: 'Requested', v: dt(w.createdAt) },
                        {
                          k: 'Balance effect',
                          v: `${usd(w.amount)} USDT moved Available → Locked at request`,
                        },
                      ]}
                    />
                  </div>
                </Panel>

                <Panel
                  title="Screening results"
                  description={
                    flaggedChecks > 0
                      ? `Automated checks ran at request time. ${flaggedChecks} rule${flaggedChecks > 1 ? 's' : ''} flagged this request, so it needs a manual decision${w.fourEyes.required ? ' and a second approver' : ''}.`
                      : 'Automated checks ran at request time and passed.'
                  }
                  actions={
                    aml ? (
                      <StatusBadge
                        status="under_review"
                        label={aml.status.replace(/_/g, ' ')}
                        size="s"
                      />
                    ) : undefined
                  }
                >
                  <ul className="flex flex-col gap-2">
                    {checks.map((c) => (
                      <li
                        key={c.name}
                        className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary px-4 py-3"
                      >
                        {c.ok ? (
                          <CircleCheck aria-hidden className="size-4 shrink-0 text-text-success" />
                        ) : (
                          <TriangleAlert
                            aria-hidden
                            className="size-4 shrink-0 text-text-warning"
                          />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-label-m text-text-primary">{c.name}</span>
                          {c.detail ? (
                            <span className="text-caption text-text-tertiary">{c.detail}</span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            'text-label-s',
                            c.ok ? 'text-text-success' : 'text-text-warning',
                          )}
                        >
                          {c.result}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {aml && typeof aml.details.reason === 'string' ? (
                    <p className="mt-3 text-caption text-text-tertiary">
                      Provider note: {aml.details.reason}
                    </p>
                  ) : null}
                </Panel>

                <Panel
                  title="Activity & audit trail"
                  description="Append-only. Every decision on this request is logged with admin ID, reason, IP and 2FA status."
                >
                  <ul className="flex flex-col">
                    {activity.map((a) => (
                      <li
                        key={a.key}
                        className="flex items-start gap-3 border-b border-border-subtle py-3 last:border-0"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                          <a.icon aria-hidden className="size-4 text-icon-default" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-label-m text-text-primary first-letter:uppercase">
                            {a.title}
                          </span>
                          <span className="truncate text-caption text-text-tertiary">
                            {a.detail}
                          </span>
                        </span>
                        <span className="font-mono text-mono-s text-text-tertiary">
                          {time(a.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>

              <div className="flex flex-col gap-4">
                <section
                  aria-label="User"
                  className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-5"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      initials={(w.user.handle ?? '??').replace('@', '').slice(0, 2).toUpperCase()}
                      size="m"
                      label=""
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-h5 text-text-primary">{w.user.handle}</span>
                      <span className="text-caption text-text-tertiary">{w.user.publicId}</span>
                    </span>
                    {w.user.isDemo ? <DemoBadge size="xs" /> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      tone={w.user.kycLevel === 'none' ? 'warning' : 'success'}
                      icon={ShieldCheck}
                    >
                      KYC {w.user.kycLevel.replace('level_', 'L')}
                    </Pill>
                    <Pill tone={w.user.twoFactorEnabled ? 'success' : 'warning'} icon={ShieldCheck}>
                      2FA {w.user.twoFactorEnabled ? 'on' : 'off'}
                    </Pill>
                    <Pill tone="gold">
                      {w.user.vipTier[0]!.toUpperCase() + w.user.vipTier.slice(1)}
                    </Pill>
                  </div>
                  <KeyValues
                    items={[
                      {
                        k: 'Account age',
                        v: `${since(w.user.memberSince)} · since ${dt(w.user.memberSince).slice(0, 11)}`,
                      },
                      { k: 'Available', v: <MoneyText value={w.balances.available} /> },
                      { k: 'Locked', v: <MoneyText value={w.balances.locked} /> },
                      { k: 'Completed withdrawals', v: count(w.user.confirmedWithdrawals) },
                    ]}
                  />
                  <Link
                    href={`/admin/users/${w.user.id}`}
                    className="inline-flex min-h-11 items-center gap-1 text-label-m text-text-primary hover:underline"
                  >
                    Open user profile <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </section>
                <section
                  aria-label="AML risk score"
                  className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-5"
                >
                  <p className="flex items-center justify-between text-caption text-text-secondary">
                    AML risk score · {w.user.handle} <DemoBadge size="xs" />
                  </p>
                  <RiskMeter
                    score={w.risk.score}
                    level={w.risk.level}
                    factors={w.risk.factors.map((f) => f.replace(/_/g, ' '))}
                  />
                  {w.fourEyes.required ? (
                    <p className="flex items-center gap-1.5 text-caption text-text-warning">
                      <Eye aria-hidden className="size-3.5" /> Manual review · four-eyes required
                      (FIN-2.3)
                    </p>
                  ) : null}
                </section>
                <DecisionPanel
                  w={w}
                  onApprove={() => setDialog('approve')}
                  onReject={() => setDialog('reject')}
                />
              </div>
            </div>

            {w.canDecide ? (
              <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-2 border-t border-border-subtle bg-bg-secondary/95 px-4 py-3 backdrop-blur tablet:hidden">
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => setDialog('reject')}
                  disabled={!canRejectRole}
                >
                  Reject…
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setDialog('approve')}
                  disabled={!w.canApprove || !canApproveRole}
                >
                  {w.fourEyes.required ? `Approve · ${step} of 2` : 'Approve'}
                </Button>
              </div>
            ) : null}

            <ReasonDialog
              open={dialog === 'approve'}
              onOpenChange={(o) => setDialog(o ? 'approve' : null)}
              title={
                w.fourEyes.required
                  ? `Approve ${w.reference} · step ${step} of 2`
                  : `Approve ${w.reference}`
              }
              description="Confirm with a reason and a fresh 2FA code."
              categories={ADMIN_REASON_CATEGORIES.withdrawal_approve}
              summary={
                <KeyValues
                  items={[
                    { k: 'Amount', v: <MoneyText value={w.amount} /> },
                    { k: 'User receives', v: <MoneyText value={w.youReceive} /> },
                    {
                      k: 'To',
                      v: (
                        <span className="font-mono text-mono-s">
                          {short(w.destination.address)} · {w.destination.networkName}
                        </span>
                      ),
                    },
                  ]}
                />
              }
              fourEyes={
                w.fourEyes.required && w.fourEyes.approvals === 0
                  ? 'A second, different admin must approve before this withdrawal is queued for sending. You cannot give both approvals.'
                  : null
              }
              confirmLabel={
                w.fourEyes.required && w.fourEyes.approvals === 0
                  ? 'Approve · step 1 of 2'
                  : 'Approve and queue'
              }
              onSubmit={async (v) => {
                const res = await approve.mutateAsync({
                  reason: v.reasonCategory ? `${v.reasonCategory}: ${v.reason}` : v.reason,
                  mfaCode: v.mfaCode ?? '',
                });
                toast({
                  type: 'success',
                  title:
                    res.status === 'queued'
                      ? `${w.reference} approved — queued for sending`
                      : 'First approval recorded — waiting for a second admin',
                  description: 'Recorded in the audit log.',
                });
              }}
            />
            <ReasonDialog
              open={dialog === 'reject'}
              onOpenChange={(o) => setDialog(o ? 'reject' : null)}
              title={`Reject ${w.reference}`}
              description="The funds return to the user’s Available balance and the user is notified."
              categories={ADMIN_REASON_CATEGORIES.withdrawal_reject}
              confirmVariant="danger"
              confirmLabel="Reject and return funds"
              summary={
                <KeyValues
                  items={[
                    { k: 'Returned to Available', v: <MoneyText value={w.amount} /> },
                    { k: 'User', v: w.user.handle },
                  ]}
                />
              }
              onSubmit={async (v) => {
                await reject.mutateAsync({
                  reason: v.reasonCategory ? `${v.reasonCategory}: ${v.reason}` : v.reason,
                  mfaCode: v.mfaCode ?? '',
                });
                toast({
                  type: 'success',
                  title: `${w.reference} rejected`,
                  description: `${usd(w.amount)} USDT returned to Available.`,
                });
              }}
            />
          </PageStack>
        );
      }}
    </QueryView>
  );
}
