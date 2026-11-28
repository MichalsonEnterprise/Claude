'use client';

import type { KycLevel, KycStatus } from '@gp/shared/enums';
import { ADMIN_REASON_CATEGORIES } from '@gp/shared/schemas';
import {
  ArrowLeft,
  BadgeCheck,
  CircleCheck,
  CircleX,
  Clock,
  FileQuestion,
  FileText,
  History,
  IdCard,
  ScrollText,
  ShieldAlert,
  TriangleAlert,
  User,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { toast } from '@/components/ui/sonner';
import { useCan, useKycDecision, useKycDetail, useKycQueue, type KycRow } from '@/lib/api/admin-b';
import { cn } from '@/lib/utils';

import { ReasonDialog } from '../reason-dialog';
import {
  DataTable,
  FilterChips,
  KeyValues,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  MoneyText,
  Pagination,
  Panel,
  PageSkeleton,
  PageStack,
  Pill,
  QueryView,
  RiskMeter,
  RiskPill,
  StatusLine,
  Timeline,
  count,
  dt,
  time,
  usd,
  type Column,
  type Tone,
} from '../primitives';

export const KYC_BADGE: Record<string, { s: BadgeStatus; label: string }> = {
  not_started: { s: 'neutral', label: 'Not started' },
  pending: { s: 'pending', label: 'Pending review' },
  in_review: { s: 'under_review', label: 'In review' },
  verified: { s: 'approved', label: 'Approved' },
  rejected: { s: 'rejected', label: 'Rejected' },
  resubmission_required: { s: 'expired', label: 'Info requested' },
};
type TimelineItem = { title: string; at: string; detail?: string; tone: Tone };
const lvl = (l: string) => (l === 'none' ? 'L0' : l.replace('level_', 'L'));

export function KycQueuePage() {
  const [status, setStatus] = React.useState<'open' | KycStatus>('open');
  const [level, setLevel] = React.useState<'all' | KycLevel>('all');
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
  const queue = useKycQueue({
    page,
    pageSize: 20,
    status: status === 'open' ? undefined : status,
    level: level === 'all' ? undefined : level,
    q: query || undefined,
  });
  const cols: Column<KycRow>[] = [
    {
      key: 'ref',
      header: 'Case',
      cell: (r) => <span className="font-mono text-mono-s">{r.reference}</span>,
    },
    {
      key: 'user',
      header: 'Player',
      cell: (r) => (
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5">
            {r.user.handle ?? r.user.publicId} {r.isDemo ? <DemoBadge size="xs" /> : null}
          </span>
          <span className="text-caption text-text-tertiary">
            {r.user.publicId} · {r.user.country ?? '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'lvl',
      header: 'Level',
      cell: (r) => (
        <span className="text-body-s">
          {lvl(r.user.currentLevel)} → {lvl(r.level)}
        </span>
      ),
    },
    {
      key: 'st',
      header: 'Status',
      cell: (r) => (
        <StatusBadge
          status={KYC_BADGE[r.status]?.s ?? 'neutral'}
          label={KYC_BADGE[r.status]?.label ?? r.status}
          size="s"
        />
      ),
    },
    { key: 'risk', header: 'Risk', cell: (r) => <RiskPill level={r.riskLevel} /> },
    {
      key: 'sub',
      header: 'Submitted (UTC)',
      hideBelow: 'laptop',
      cell: (r) => <span className="text-caption text-text-secondary">{dt(r.submittedAt)}</span>,
    },
    {
      key: 'sla',
      header: 'SLA',
      cell: (r) =>
        r.slaHoursLeft === null ? (
          '—'
        ) : (
          <span
            className={cn(
              'text-caption',
              r.slaHoursLeft < 0
                ? 'text-text-danger'
                : r.slaHoursLeft < 8
                  ? 'text-text-warning'
                  : 'text-text-secondary',
            )}
          >
            {r.slaHoursLeft < 0
              ? `${Math.abs(r.slaHoursLeft)} h overdue`
              : `${r.slaHoursLeft} h left`}
          </span>
        ),
    },
    {
      key: 'prov',
      header: 'Provider',
      hideBelow: 'desktop',
      cell: (r) => <span className="text-caption text-text-tertiary">{r.provider}</span>,
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Compliance"
        title="KYC queue"
        description="Verification cases waiting for a decision, oldest first. KYC levels only change withdrawal limits; decisions need a reason and a fresh 2FA code and are recorded in the audit log."
      />
      <QueryView query={queue}>
        {(d) => (
          <>
            <KpiGrid className="laptop:grid-cols-3">
              <KpiTile
                label="KYC review queue · SLA 48 h"
                icon={IdCard}
                value={count(d.summary.open)}
                unit="pending"
                sub={`Oldest ${d.summary.oldestHours === null ? '—' : `${d.summary.oldestHours} h`} · ${count(d.summary.slaBreached)} past SLA · ${count(d.summary.resubmission)} waiting for the player`}
                subTone={d.summary.slaBreached > 0 ? 'danger' : 'neutral'}
                demo
              />
              <KpiTile
                label="Decisions today"
                icon={BadgeCheck}
                value={count(
                  d.summary.decidedToday.approved +
                    d.summary.decidedToday.rejected +
                    d.summary.decidedToday.infoRequested,
                )}
                unit="cases"
                sub={`Approved ${count(d.summary.decidedToday.approved)} · rejected ${count(d.summary.decidedToday.rejected)} · info ${count(d.summary.decidedToday.infoRequested)} · since 00:00 UTC`}
                demo
              />
              <KpiTile
                label="Median time to decision"
                icon={Clock}
                value={
                  d.summary.medianDecisionMinutes7d === null
                    ? '—'
                    : `${Math.floor(d.summary.medianDecisionMinutes7d / 60)} h ${String(d.summary.medianDecisionMinutes7d % 60).padStart(2, '0')} min`
                }
                sub="Submitted → decision, last 7 days · SLA 48 h"
                demo
              />
            </KpiGrid>
            <Panel
              flush
              title="Cases"
              demo
              actions={
                <span className="text-caption text-text-tertiary">Oldest first · times UTC</span>
              }
            >
              <div className="flex flex-col gap-3 px-4 pb-3 tablet:px-5">
                <SearchInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onClear={() => setQ('')}
                  placeholder="Search @handle or GP-ID"
                  aria-label="Search KYC cases"
                />
                <div className="flex flex-col gap-2 laptop:flex-row laptop:items-center laptop:justify-between">
                  <FilterChips
                    label="Case status"
                    value={status}
                    onChange={(v) => {
                      setStatus(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'open', label: 'Open', count: d.summary.open },
                      { value: 'pending', label: 'Pending', count: d.summary.pending },
                      { value: 'in_review', label: 'In review', count: d.summary.inReview },
                      {
                        value: 'resubmission_required',
                        label: 'Info requested',
                        count: d.summary.resubmission,
                      },
                      { value: 'verified', label: 'Approved', count: d.summary.verified },
                      { value: 'rejected', label: 'Rejected', count: d.summary.rejected },
                    ]}
                  />
                  <FilterChips
                    label="Level"
                    value={level}
                    onChange={(v) => {
                      setLevel(v);
                      setPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All levels' },
                      { value: 'level_1', label: 'L1' },
                      { value: 'level_2', label: 'L2' },
                      { value: 'level_3', label: 'L3' },
                    ]}
                  />
                </div>
              </div>
              <DataTable
                caption="KYC cases"
                columns={cols}
                rows={d.items}
                rowKey={(r) => r.id}
                rowHref={(r) => `/admin/compliance/kyc/${r.id}`}
                empty={
                  <EmptyState
                    type={query || status !== 'open' || level !== 'all' ? 'no-results' : 'no-data'}
                    title={
                      status === 'open' && !query
                        ? 'The KYC queue is empty'
                        : 'No cases match these filters'
                    }
                    description={
                      status === 'open' && !query
                        ? 'Every submitted verification has a decision. New cases appear here when players submit documents.'
                        : 'Try another status or level.'
                    }
                    className="py-10"
                  />
                }
                mobileCard={(r) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body-s-strong">{r.user.handle}</span>
                      <StatusBadge
                        status={KYC_BADGE[r.status]?.s ?? 'neutral'}
                        label={KYC_BADGE[r.status]?.label ?? r.status}
                        size="s"
                      />
                    </div>
                    <p className="text-caption text-text-secondary">
                      {r.reference} · {lvl(r.user.currentLevel)} → {lvl(r.level)} ·{' '}
                      {r.slaHoursLeft !== null ? `${r.slaHoursLeft} h left` : ''}
                    </p>
                  </div>
                )}
                footer={
                  <Pagination
                    page={d.page}
                    totalPages={d.totalPages}
                    total={d.total}
                    pageSize={d.pageSize}
                    onPage={setPage}
                    noun="cases"
                    demo
                  />
                }
              />
            </Panel>
            <div className="grid gap-4 laptop:grid-cols-2">
              <Panel title="Decision rules · policy KYC-1.4" icon={ScrollText}>
                <ul className="flex flex-col gap-2">
                  <li className="flex items-start gap-3 rounded-md border border-border-success bg-status-success-tint/30 p-3 text-body-s text-text-secondary">
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
                    A level is approved by one reviewer when the provider result is clear, the
                    profile matches and no watchlist hit is open. Every decision needs a reason and
                    2FA.
                  </li>
                  <li className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3 text-body-s text-text-secondary">
                    <FileQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-text-info" />
                    Unreadable or mismatching documents: request information — the case leaves the
                    queue until the player resubmits.
                  </li>
                  <li className="flex items-start gap-3 rounded-md border border-border-gold bg-gold-tint/20 p-3 text-body-s text-text-secondary">
                    <TriangleAlert
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-text-warning"
                    />
                    KYC levels only change withdrawal limits. Restricted countries are blocked at
                    onboarding; the player keeps withdraw-only access and is told why.
                  </li>
                </ul>
              </Panel>
              <Panel title="Recent decisions" icon={History} demo>
                {d.recentDecisions.length === 0 ? (
                  <p className="text-body-s text-text-tertiary">No decisions recorded yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {d.recentDecisions.map((r) => (
                      <li key={r.seq} className="flex items-center gap-3 py-2.5">
                        <span className="font-mono text-mono-s text-text-tertiary">
                          {time(r.at)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-label-m text-text-primary">
                            {r.reference} · {r.handle ?? '—'}
                          </span>
                          <span className="text-caption text-text-tertiary">
                            by {r.by ?? 'system'}
                          </span>
                        </span>
                        <Pill
                          tone={
                            r.action === 'kyc.approve'
                              ? 'success'
                              : r.action === 'kyc.reject'
                                ? 'danger'
                                : 'info'
                          }
                        >
                          {r.action === 'kyc.approve'
                            ? `Approved ${r.level ? lvl(r.level) : ''}`
                            : r.action === 'kyc.reject'
                              ? 'Rejected'
                              : 'Info requested'}
                        </Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </QueryView>
    </PageStack>
  );
}

export function KycReviewPage({ id }: { id: string }) {
  const q = useKycDetail(id);
  const canReview = useCan('kyc.review');
  const decide = useKycDecision(id);
  const [dialog, setDialog] = React.useState<'approve' | 'reject' | 'request_info' | null>(null);
  return (
    <QueryView query={q} skeleton={<PageSkeleton tiles={3} />}>
      {(k) => (
        <PageStack>
          <ModuleHeader
            module="Compliance"
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="font-mono">{k.reference}</span>
                <StatusBadge
                  status={KYC_BADGE[k.status]?.s ?? 'neutral'}
                  label={KYC_BADGE[k.status]?.label ?? k.status}
                />
              </span>
            }
            crumb={k.reference}
            description={`KYC review · ${k.user.handle} · ${lvl(k.user.currentLevel)} → ${lvl(k.level)} (${k.levelLabel}) · submitted ${dt(k.submittedAt)} · SLA ${k.sla.hours} h (${k.sla.hoursLeft >= 0 ? `${k.sla.hoursLeft} h left` : `${Math.abs(k.sla.hoursLeft)} h overdue`})`}
            actions={
              k.canDecide && canReview ? (
                <span className="hidden flex-wrap gap-2 tablet:flex">
                  <Button
                    variant="ghost"
                    leadingIcon={<FileQuestion aria-hidden />}
                    onClick={() => setDialog('request_info')}
                  >
                    Request information
                  </Button>
                  <Button
                    variant="danger"
                    leadingIcon={<CircleX aria-hidden />}
                    onClick={() => setDialog('reject')}
                  >
                    Reject
                  </Button>
                  <Button
                    leadingIcon={<CircleCheck aria-hidden />}
                    onClick={() => setDialog('approve')}
                  >
                    Approve {lvl(k.level)}
                  </Button>
                </span>
              ) : undefined
            }
          />
          <p className="-mt-3">
            <Link
              href="/admin/compliance/kyc"
              className="inline-flex min-h-11 items-center gap-1 text-label-s text-text-secondary hover:text-text-primary tablet:min-h-0"
            >
              <ArrowLeft aria-hidden className="size-4" /> KYC queue
            </Link>
          </p>
          <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-4">
              <Panel
                title="Provider result & checks"
                icon={FileText}
                demo={k.isDemo}
                description={k.documentsNote}
              >
                <div className="flex flex-col divide-y divide-border-subtle">
                  {k.checks.map((c) => (
                    <StatusLine key={c.key} ok={c.ok} label={c.label} detail={c.detail} />
                  ))}
                </div>
              </Panel>
              <Panel
                title="Player"
                icon={User}
                demo={k.user.isDemo}
                description="Personal data is masked; revealing a field is a separate, logged action in User Management."
              >
                <KeyValues
                  columns={2}
                  items={[
                    {
                      k: 'Player',
                      v: (
                        <Link className="hover:underline" href={`/admin/users/${k.user.id}`}>
                          {k.user.handle}
                        </Link>
                      ),
                    },
                    { k: 'Player ID', v: k.user.publicId, mono: true },
                    { k: 'Email', v: k.user.emailMasked ?? '—' },
                    { k: 'Date of birth', v: k.user.dateOfBirthMasked ?? '—' },
                    { k: 'Country', v: k.user.country ?? '—' },
                    { k: 'Member since', v: dt(k.user.memberSince).slice(0, 11) },
                    { k: 'Current level', v: k.user.currentLevelLabel },
                    {
                      k: 'Restrictions',
                      v: k.user.restrictions.length ? k.user.restrictions.join(', ') : 'None',
                    },
                  ]}
                />
              </Panel>
              <Panel title="Activity" demo={k.isDemo}>
                <KeyValues
                  columns={2}
                  items={[
                    { k: 'Available', v: <MoneyText value={k.activity.balances.available} /> },
                    { k: 'Total balance', v: <MoneyText value={k.activity.balances.total} /> },
                    {
                      k: 'Deposits credited',
                      v: `${count(k.activity.deposits.count)} · ${usd(k.activity.deposits.amount)} USDT`,
                    },
                    {
                      k: 'Withdrawals paid',
                      v: `${count(k.activity.withdrawals.count)} · ${usd(k.activity.withdrawals.amount)} USDT`,
                    },
                  ]}
                />
              </Panel>
              <Panel title="Review history" icon={History}>
                <Timeline
                  items={[
                    ...k.history.map((h): TimelineItem => ({
                      title: `${h.reference} · ${lvl(h.level)} · ${KYC_BADGE[h.status]?.label ?? h.status}`,
                      at: h.reviewedAt ?? h.submittedAt,
                      detail: h.rejectionReason ?? undefined,
                      tone:
                        h.status === 'verified'
                          ? 'success'
                          : h.status === 'rejected'
                            ? 'danger'
                            : 'warning',
                    })),
                    ...k.audit.map((a): TimelineItem => ({
                      title: `${a.action} — ${a.actorLabel ?? 'system'} (#${a.seq})`,
                      at: a.createdAt,
                      detail: a.reason ? `“${a.reason}”` : undefined,
                      tone: 'neutral' as const,
                    })),
                  ]}
                />
              </Panel>
            </div>
            <div className="flex flex-col gap-4">
              <Panel title="Risk" icon={ShieldAlert}>
                <RiskMeter score={k.risk.score} level={k.risk.level} factors={k.risk.factors} />
                {k.amlAlerts.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-1">
                    {k.amlAlerts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between text-caption text-text-secondary"
                      >
                        <span>
                          {a.reference} · {a.rule.replace(/_/g, ' ')}
                        </span>
                        <Pill tone="neutral">{a.status}</Pill>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Panel>
              <Panel title="Limits" icon={ScrollText} description="Daily withdrawal limit by level">
                <KeyValues
                  items={k.limits.byLevel.map((l) => ({
                    k: (
                      <span className={cn(l.level === k.level && 'text-text-primary')}>
                        {l.label}
                      </span>
                    ),
                    v:
                      l.dailyWithdrawal === '0' || l.dailyWithdrawal === '0.00'
                        ? 'No withdrawals'
                        : `${usd(l.dailyWithdrawal)} USDT`,
                  }))}
                />
                <p className="mt-2 text-caption text-text-tertiary">
                  Approving raises the daily limit from {usd(k.limits.current)} to{' '}
                  {usd(k.limits.afterApproval)} USDT. It never moves funds.
                </p>
              </Panel>
              {k.canDecide ? (
                <Panel title="Decision">
                  {canReview ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        leadingIcon={<CircleCheck aria-hidden />}
                        onClick={() => setDialog('approve')}
                      >
                        Approve {lvl(k.level)}
                      </Button>
                      <Button
                        variant="danger"
                        leadingIcon={<CircleX aria-hidden />}
                        onClick={() => setDialog('reject')}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="secondary"
                        leadingIcon={<FileQuestion aria-hidden />}
                        onClick={() => setDialog('request_info')}
                      >
                        Request information
                      </Button>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-body-s text-text-secondary">
                      <TriangleAlert aria-hidden className="size-4" /> Your role can view but not
                      decide KYC cases.
                    </p>
                  )}
                  <p className="mt-3 text-caption text-text-tertiary">
                    Reason + fresh 2FA · audited · the player is notified.
                  </p>
                </Panel>
              ) : (
                <Panel title="Decision">
                  <p className="text-body-s text-text-secondary">
                    Decided {k.reviewedAt ? dt(k.reviewedAt) : ''} —{' '}
                    {KYC_BADGE[k.status]?.label ?? k.status}.
                  </p>
                </Panel>
              )}
            </div>
          </div>
          <ReasonDialog
            open={dialog !== null}
            onOpenChange={(o) => setDialog(o ? dialog : null)}
            title={
              dialog === 'approve'
                ? `Approve ${lvl(k.level)} for ${k.user.handle}`
                : dialog === 'reject'
                  ? `Reject ${k.reference}`
                  : `Request information — ${k.reference}`
            }
            description={
              dialog === 'approve'
                ? `${k.levelLabel} becomes active; daily withdrawal limit ${usd(k.limits.afterApproval)} USDT.`
                : dialog === 'reject'
                  ? 'The player keeps their current level and can resubmit.'
                  : 'The player is asked to resubmit; the case leaves the queue until they do.'
            }
            categories={ADMIN_REASON_CATEGORIES.kyc}
            confirmVariant={dialog === 'reject' ? 'danger' : 'primary'}
            confirmLabel={
              dialog === 'approve'
                ? 'Approve'
                : dialog === 'reject'
                  ? 'Reject'
                  : 'Request information'
            }
            onSubmit={async (v) => {
              const res = await decide.mutateAsync({
                decision: dialog ?? 'request_info',
                reason: v.reason,
                reasonCategory: v.reasonCategory,
                mfaCode: v.mfaCode ?? '',
              });
              toast({
                type: 'success',
                title: `${k.reference} — ${KYC_BADGE[res.status]?.label ?? res.status}`,
                description: `Audit entry #${res.auditSeq}`,
              });
            }}
          />
        </PageStack>
      )}
    </QueryView>
  );
}
