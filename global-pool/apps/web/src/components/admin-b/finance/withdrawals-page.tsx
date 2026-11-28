'use client';

import type { ChainKey } from '@gp/shared/chains';
import { formatUSDT } from '@gp/shared/money';
import {
  ArrowRight,
  BookOpenCheck,
  CircleCheck,
  CircleX,
  Lock,
  ShieldAlert,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import {
  useWithdrawalQueue,
  type WithdrawalRow,
  type WithdrawalView,
  type WithdrawalsResponse,
} from '@/lib/api/admin-b';
import { cn } from '@/lib/utils';

import { ExportCsvButton } from '../export-dialog';
import {
  CopyHash,
  DataTable,
  LiveDot,
  ModuleHeader,
  Pagination,
  Panel,
  PageStack,
  Pill,
  QueryView,
  count,
  humanMinutes,
  short,
  usd,
  type Column,
} from '../primitives';

export const WITHDRAWAL_BADGE: Record<string, BadgeStatus> = {
  requested: 'pending',
  risk_check: 'processing',
  under_review: 'under_review',
  queued: 'pending',
  broadcast: 'processing',
  confirmed: 'confirmed',
  failed: 'failed',
  rejected: 'rejected',
  cancelled: 'expired',
};

const initials = (h: string | null | undefined) =>
  (h ?? '??').replace('@', '').slice(0, 2).toUpperCase();

/** Risk cell: 5-bar level indicator + level · score (colour is never the only signal). */
export function RiskBars({ level, score }: { level: string | null; score: number }) {
  const lit =
    level === 'critical'
      ? 5
      : level === 'high'
        ? 5
        : level === 'medium'
          ? 3
          : level === 'low'
            ? 1
            : 0;
  const tone =
    level === 'high' || level === 'critical'
      ? 'bg-status-danger'
      : level === 'medium'
        ? 'bg-status-warning'
        : 'bg-status-success';
  const text =
    level === 'high' || level === 'critical'
      ? 'text-text-danger'
      : level === 'medium'
        ? 'text-text-warning'
        : 'text-text-success';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn('h-full w-[3px] rounded-[1px]', i < lit ? tone : 'bg-surface-raised')}
          />
        ))}
      </span>
      <span className={cn('text-caption', text)}>
        {level ? level[0]!.toUpperCase() + level.slice(1) : '—'}
        <span className="text-text-tertiary"> · {score}</span>
      </span>
    </span>
  );
}

function QueueCard({ d }: { d: WithdrawalsResponse }) {
  const oldest = d.summary.oldestOpenMinutes ?? 0;
  const pct = Math.min(100, Math.round((oldest / (d.policy.slaHours * 60)) * 100));
  const onTrack = d.summary.withinSlaPercent === 100;
  return (
    <div className="flex min-w-[280px] flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-4 laptop:col-span-1">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-surface-raised">
            <ArrowRight aria-hidden className="size-4 -rotate-90 text-icon-default" />
          </span>
          <span className="flex flex-col">
            <span className="text-label-m text-text-primary">Withdrawals queue</span>
            <span className="text-caption text-text-tertiary">
              Finance · SLA {d.policy.slaHours} h
            </span>
          </span>
        </span>
        <DemoBadge size="xs" />
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className="text-number-l text-text-primary tabular-nums">
            {count(d.summary.open)}
          </span>
          <span className="text-body-s text-text-secondary">pending</span>
        </p>
        <Pill tone={onTrack ? 'success' : 'warning'} icon={onTrack ? CircleCheck : Timer}>
          {onTrack ? 'On track' : 'At risk'}
        </Pill>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-caption">
        <div>
          <dt className="text-text-tertiary">Oldest item</dt>
          <dd className="text-body-s-strong text-text-primary">
            {d.summary.oldestOpenMinutes === null ? '—' : humanMinutes(oldest).replace(' left', '')}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Within SLA</dt>
          <dd className="text-body-s-strong text-text-primary">{d.summary.withinSlaPercent}%</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Needs 2nd approver</dt>
          <dd className="text-body-s-strong text-text-primary">
            {count(d.summary.awaitingSecond)}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-caption text-text-tertiary">
          <span>Oldest item vs SLA</span>
          <span>
            {pct}% of {d.policy.slaHours} h
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
          <div
            className={cn(
              'h-full rounded-full',
              pct >= 100 ? 'bg-status-danger' : pct >= 75 ? 'bg-status-warning' : 'bg-brand',
            )}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  lines,
}: {
  label: string;
  value: string;
  unit: string;
  lines: React.ReactNode[];
}) {
  return (
    <div className="flex min-w-[200px] flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-text-secondary">{label}</span>
        <DemoBadge size="xs" />
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-number-m text-text-primary tabular-nums">{value}</span>
        <span className="text-caption text-text-tertiary">{unit}</span>
      </p>
      {lines.map((l, i) => (
        <p key={i} className="text-caption text-text-tertiary">
          {l}
        </p>
      ))}
    </div>
  );
}

const TABS: { value: WithdrawalView; label: string; key?: keyof WithdrawalsResponse['summary'] }[] =
  [
    { value: 'queue', label: 'Queue', key: 'open' },
    { value: 'awaiting_second', label: 'Awaiting 2nd approver', key: 'awaitingSecond' },
    { value: 'broadcasting', label: 'Broadcasting', key: 'broadcasting' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

const POLICY = [
  {
    icon: UserCheck,
    tone: 'text-text-success',
    text: 'One approver: Low / Medium risk, no AML flag, under 10,000.00 USDT. Most requests clear screening and are queued without manual review.',
  },
  {
    icon: Users,
    tone: 'text-text-warning',
    text: 'Two approvers (four-eyes): AML flag or 10,000.00 USDT or more. The second approver must be a different admin with the approve permission — never the first approver.',
  },
  {
    icon: CircleX,
    tone: 'text-text-danger',
    text: 'Reject: reason category + written reason. Funds return to the user’s Available balance; the user is notified.',
  },
  {
    icon: Lock,
    tone: 'text-text-tertiary',
    text: 'Not possible for any role: editing the amount or destination, paying to another address, or releasing funds before screening finishes.',
  },
];

export function WithdrawalsPage() {
  const [view, setView] = React.useState<WithdrawalView>('queue');
  const [q, setQ] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const queue = useWithdrawalQueue({ view, page, pageSize: 10, q: query || undefined });

  const columns: Column<WithdrawalRow>[] = [
    {
      key: 'ref',
      header: 'Request',
      cell: (w) => <span className="font-mono text-mono-s text-text-primary">{w.reference}</span>,
    },
    {
      key: 'user',
      header: 'User',
      cell: (w) => (
        <span className="flex items-center gap-2">
          <Avatar size="xs" initials={initials(w.user.handle)} label="" />
          {w.user.handle}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (USDT)',
      align: 'right',
      cell: (w) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-body-s-strong">{usd(w.amount)}</span>
          {w.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    {
      key: 'dest',
      header: 'Destination',
      hideBelow: 'laptop',
      cell: (w) => (
        <span className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-bg-secondary pl-2">
          <ChainMark chain={w.network as ChainKey} size={14} label={w.networkName} />
          <CopyHash value={w.toAddress} label="destination address" />
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk',
      cell: (w) => <RiskBars level={w.riskLevel} score={w.riskScore} />,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (w) => (
        <span className="flex flex-col items-start gap-0.5">
          <StatusBadge
            status={WITHDRAWAL_BADGE[w.status] ?? 'neutral'}
            label={w.statusLabel}
            size="s"
          />
          {w.approval ? (
            <span className="text-caption text-text-warning">
              {w.approval.approvals}/{w.approval.of} · {w.approval.requestedBy}
            </span>
          ) : w.requiresFourEyes && w.status === 'under_review' ? (
            <span className="text-caption text-text-tertiary">Needs 2 approvals</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'req',
      header: 'Requested (UTC)',
      cell: (w) => (
        <span className="flex flex-col">
          <span className="text-text-secondary">
            {new Date(w.createdAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC',
            })}
          </span>
          {w.slaMinutesLeft !== null ? (
            <span
              className={cn(
                'text-caption',
                w.slaMinutesLeft < 0
                  ? 'text-text-danger'
                  : w.slaMinutesLeft < 60
                    ? 'text-text-warning'
                    : 'text-text-tertiary',
              )}
            >
              {humanMinutes(w.slaMinutesLeft)}
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Withdrawals"
        badges={<LiveDot label="LIVE" />}
        description="Requests waiting for checks before broadcast. One Finance admin can approve low-risk requests under 10,000.00 USDT; AML-flagged or larger requests need a second approver (four-eyes, policy FIN-2.3). Admins approve or reject with a reason — they can never change the amount or the destination."
        actions={
          <>
            <Button variant="ghost" size="s" leadingIcon={<BookOpenCheck aria-hidden />} asChild>
              <a href="#approval-policy">Approval policy</a>
            </Button>
            <ExportCsvButton dataset="withdrawals" />
          </>
        }
      />
      <QueryView query={queue}>
        {(d) => (
          <>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:px-0 laptop:grid laptop:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <QueueCard d={d} />
              <StatCard
                label="Awaiting 2nd approver"
                value={count(d.summary.awaitingSecond)}
                unit="requests"
                lines={['4-eyes · policy FIN-2.3', 'Approved once, waiting for a different admin']}
              />
              <StatCard
                label="Under review · AML"
                value={count(d.summary.underReview)}
                unit="requests"
                lines={[`${usd(d.summary.onHold)} USDT on hold`, 'Flagged by screening rules']}
              />
              <StatCard
                label="Paid · 24 h"
                value={count(d.summary.paid24h.count)}
                unit="withdrawals"
                lines={[
                  <span key="a" className="inline-flex items-center gap-1">
                    <TrendingUp aria-hidden className="size-3.5" />{' '}
                    {formatUSDT(d.summary.paid24h.amount)} confirmed on-chain
                  </span>,
                  `${count(d.summary.broadcasting)} broadcasting now`,
                ]}
              />
            </div>

            <div
              role="tablist"
              aria-label="Queue views"
              className="-mx-4 flex gap-5 overflow-x-auto border-b border-border-subtle px-4 tablet:mx-0 tablet:px-0"
            >
              {TABS.map((t) => {
                const on = view === t.value;
                const n = t.key ? (d.summary[t.key] as number) : null;
                return (
                  <button
                    key={t.value}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => {
                      setView(t.value);
                      setPage(1);
                    }}
                    className={cn(
                      'relative inline-flex h-11 shrink-0 items-center gap-1.5 text-label-m whitespace-nowrap outline-none focus-visible:shadow-focus-ring',
                      on ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                    )}
                  >
                    {t.label}
                    {n !== null ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-label-s tabular-nums',
                          on
                            ? 'bg-brand text-text-on-primary'
                            : 'bg-surface-raised text-text-secondary',
                        )}
                      >
                        {count(n)}
                      </span>
                    ) : null}
                    {on ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-3 tablet:p-4">
              <div className="flex flex-col gap-2 tablet:flex-row">
                <SearchInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onClear={() => setQ('')}
                  placeholder="Search handle, WD-ID or destination…"
                  aria-label="Search withdrawals"
                  groupClassName="tablet:flex-1"
                />
              </div>
              <p className="flex flex-wrap items-center justify-between gap-2 text-caption text-text-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  {count(d.total)} results <DemoBadge size="xs" /> ·{' '}
                  {view === 'queue'
                    ? 'status Pending + Under review · sorted oldest first (FIFO)'
                    : 'newest first'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Lock aria-hidden className="size-3" /> Exports are watermarked with your admin ID
                  and recorded in the audit log
                </span>
              </p>
            </div>

            <Panel
              flush
              mobileBare
              title="Withdrawal queue"
              description={`${count(d.summary.open)} open · oldest first (FIFO) · four-eyes on any AML flag or from 10,000.00 USDT · all times UTC`}
              actions={
                <span className="flex items-center gap-2">
                  <LiveDot label="LIVE" />
                  <DemoBadge size="s" />
                </span>
              }
            >
              <DataTable
                caption="Withdrawal queue"
                mobileVariant="cards"
                columns={columns}
                rows={d.items}
                rowKey={(w) => w.id}
                rowHref={(w) => `/admin/finance/withdrawals/${w.id}`}
                empty={
                  <EmptyState
                    type={query ? 'no-results' : 'no-data'}
                    title={query ? 'No withdrawals match this search' : 'Nothing in this view'}
                    description={
                      view === 'queue'
                        ? 'The review queue is empty — every request has been decided.'
                        : 'Withdrawals appear here as their status changes.'
                    }
                    className="py-10"
                  />
                }
                mobileCard={(w) => (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-mono-s text-text-primary">
                          {w.reference}
                        </span>
                        {w.slaMinutesLeft !== null ? (
                          <span className="text-caption text-text-tertiary">
                            {humanMinutes(w.slaMinutesLeft)}
                          </span>
                        ) : null}
                      </span>
                      <StatusBadge
                        status={WITHDRAWAL_BADGE[w.status] ?? 'neutral'}
                        label={w.statusLabel}
                        size="s"
                      />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-h5 text-text-primary tabular-nums">
                        {usd(w.amount)}{' '}
                        <span className="text-caption text-text-tertiary">USDT</span>
                      </span>
                      <RiskBars level={w.riskLevel} score={w.riskScore} />
                    </div>
                    <p className="text-caption text-text-secondary">
                      {w.user.handle} · {w.networkName} ·{' '}
                      <span className="font-mono">{short(w.toAddress)}</span>
                    </p>
                    {w.requiresFourEyes && w.status === 'under_review' ? (
                      <p className="inline-flex items-center gap-1 text-caption text-text-warning">
                        <ShieldAlert aria-hidden className="size-3.5" />
                        {w.amlAlert ? `AML · ${w.amlAlert.rule.replace(/_/g, ' ')} · ` : ''}needs 2
                        approvals
                      </p>
                    ) : null}
                  </div>
                )}
                footer={
                  <Pagination
                    page={d.page}
                    totalPages={d.totalPages}
                    total={d.total}
                    pageSize={d.pageSize}
                    onPage={setPage}
                    noun="withdrawals"
                    demo
                  />
                }
              />
            </Panel>

            <div className="grid gap-4 laptop:grid-cols-2">
              <Panel
                title={`SLA watch · ${d.policy.slaHours} h target`}
                demo
                description="Oldest open requests first. Breaches escalate to the Finance Lead."
              >
                {d.slaWatch.length === 0 ? (
                  <p className="text-body-s text-text-tertiary">No open requests.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {d.slaWatch.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/admin/finance/withdrawals/${s.id}`}
                          className="flex min-h-11 items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary px-3 py-2 outline-none hover:border-border-strong focus-visible:shadow-focus-ring"
                        >
                          <Timer aria-hidden className="size-4 shrink-0 text-icon-gold" />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="font-mono text-mono-s whitespace-nowrap text-text-primary">
                              {s.reference}
                            </span>
                            <span className="truncate text-caption text-text-tertiary">
                              {s.handle} · {usd(s.amount)} USDT
                              {s.requiresFourEyes ? ' · four-eyes' : ''}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'text-label-s whitespace-nowrap',
                              s.slaMinutesLeft < 0
                                ? 'text-text-danger'
                                : s.slaMinutesLeft < 60
                                  ? 'text-text-warning'
                                  : 'text-text-secondary',
                            )}
                          >
                            {humanMinutes(s.slaMinutesLeft)}
                          </span>
                          <span className="hidden tablet:inline-flex">
                            <StatusBadge
                              status={WITHDRAWAL_BADGE[s.status] ?? 'neutral'}
                              label={s.statusLabel}
                              size="s"
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel
                id="approval-policy"
                title="Approval policy FIN-2.3"
                description="What each role can do in this queue. Every decision needs 2FA and a reason, and is written to the audit log."
              >
                <ul className="flex flex-col gap-3">
                  {POLICY.map((p) => (
                    <li
                      key={p.text}
                      className="flex items-start gap-3 text-body-s text-text-secondary"
                    >
                      <p.icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', p.tone)} />
                      {p.text}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
            <p className="text-caption text-text-tertiary">
              The queue refreshes every 30 s. Bulk approval is not offered in this build — every
              request is opened and decided on its own detail page.
            </p>
          </>
        )}
      </QueryView>
    </PageStack>
  );
}
