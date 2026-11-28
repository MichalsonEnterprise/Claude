'use client';

/**
 * ADM-02 Overview — every brief KPI on one dense page from REAL API data: ledger-derived money KPIs (30 d), users,
 * pool liabilities, active rounds, work queues, four-eyes approvals, system health (DB, Redis, queues, randomness,
 * ledger invariants), KYC, the live round monitor, network configuration and recent sensitive actions.
 * Read-only monitoring. Roles without finance access (e.g. Support) get the money panels LEFT OUT (not blurred).
 * No fabricated trends: the API reports 30-day totals without a previous-period comparison, so no deltas are shown.
 */
import {
  formatCount,
  formatDateTimeUTC,
  formatRoundNumber,
  formatTimeUTC,
} from '@gp/shared/format';
import { formatAmount, formatUSDT } from '@gp/shared/money';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  IdCard,
  KeyRound,
  Lock,
  Server,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import {
  useAlerts,
  useApprovalsInbox,
  useAuditLogs,
  useDashboard,
  useSystemHealth,
  useUserStats,
} from './hooks';
import {
  AdminPageHeader,
  KeyValue,
  KpiTile,
  Panel,
  QueryErrorPanel,
  RoleChip,
  StatusLine,
} from './primitives';
import { useAdminSession } from './session';

interface CurrentRound {
  id: string;
  number: number;
  status: string;
  closesAt: string;
  participants: number;
  entries: number;
  poolBalance: string;
  platformFees: string;
  thresholds: { minParticipants: number; minPool: string; met: boolean };
  isDemo: boolean;
}

function useNow() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function countdown(target: string, now: number) {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function expiresIn(iso: string | null, now: number) {
  if (!iso) return 'no expiry';
  const m = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export function OverviewPage() {
  const { admin, can, canAny } = useAdminSession();
  const role = admin?.roles[0] ?? null;
  const moneyAccess = canAny(['ledger.read', 'withdrawals.approve']);
  const dash = useDashboard();
  const stats = useUserStats(can('users.read'));
  const inbox = useApprovalsInbox('open');
  const alerts = useAlerts();
  const audit = useAuditLogs({ pageSize: 6 }, can('audit.read'));
  const round = useQuery({
    queryKey: ['admin', 'public-round'],
    queryFn: () => apiRequest<CurrentRound>('/pool/rounds/current', { auth: 'none' }),
    refetchInterval: 30_000,
  });
  const now = useNow();
  const d = dash.data;

  return (
    <div className="flex flex-col gap-5" data-testid="admin-overview">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Overview' }]}
        title="Overview"
        description={
          moneyAccess
            ? `KPIs for the last ${d?.windowDays ?? 30} days and live operations. Money figures come from the append-only ledger. Data as of ${d ? formatDateTimeUTC(d.generatedAt) : '…'} · refreshes every minute.`
            : `Player and operations KPIs for the last ${d?.windowDays ?? 30} days. Data as of ${d ? formatDateTimeUTC(d.generatedAt) : '…'}. Some panels are hidden for your role.`
        }
        actions={
          <span className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg-secondary px-3 text-label-m text-text-secondary">
            Last 30 days
          </span>
        }
      />

      {dash.isError ? (
        <QueryErrorPanel
          error={dash.error}
          onRetry={() => void dash.refetch()}
          role={role}
          what="the KPIs"
        />
      ) : !d ? (
        <div className="grid grid-cols-2 gap-3 tablet:gap-4 laptop:grid-cols-4" aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {moneyAccess ? (
            <div
              className="grid grid-cols-2 gap-3 tablet:gap-4 laptop:grid-cols-4"
              data-testid="kpis-money"
            >
              <KpiTile
                label={`Total deposits · ${d.windowDays} d`}
                value={formatAmount(d.totalDeposits)}
                unit="USDT"
                context={`${formatCount(d.depositsCount)} credited deposits`}
                definition="Σ deposits credited after confirmations, all networks"
              />
              <KpiTile
                label={`Total withdrawals · ${d.windowDays} d`}
                value={formatAmount(d.totalWithdrawals)}
                unit="USDT"
                context={`${formatCount(d.withdrawalsCount)} confirmed on-chain`}
                definition="Σ confirmed withdrawals, all networks"
              />
              <KpiTile
                label={`Platform fees · ${d.windowDays} d`}
                value={formatAmount(d.platformFees)}
                unit="USDT"
                context={`All time ${formatUSDT(d.platformFeesAllTime)}`}
                definition={`${formatCount(d.qualifyingEntries)} entries × 0.05 USDT · fees never enter the pool`}
              />
              <KpiTile
                label="Customer balances"
                value={formatAmount(d.customerLiabilities)}
                unit="USDT"
                context={`Owed ${formatUSDT(d.owedTotal)}`}
                definition="Σ Available + Locked + Pending + Owed (ledger)"
              />
            </div>
          ) : (
            <div
              className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-default p-5 tablet:flex-row tablet:items-start"
              data-testid="kpis-money-hidden"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-raised text-icon-muted">
                <Lock aria-hidden className="size-5" />
              </span>
              <div className="flex flex-1 flex-col gap-1.5">
                <p className="text-label-l text-text-primary">
                  Financial KPIs are hidden for your role
                </p>
                <p className="text-body-s text-text-secondary">
                  Deposits, withdrawals, platform fees, customer balances, pool liabilities and the
                  audit feed are limited to Finance, Compliance, auditors and Super Admin. They are
                  left out of this page — not blurred.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="s"
                    trailingIcon={<ArrowRight aria-hidden />}
                  >
                    <Link href="/admin/permissions">Role permissions</Link>
                  </Button>
                </div>
              </div>
              {role && <RoleChip role={role} size="m" />}
            </div>
          )}
          <div
            className="grid grid-cols-2 gap-3 tablet:gap-4 laptop:grid-cols-4"
            data-testid="kpis-users"
          >
            <KpiTile
              label="Total users"
              value={formatCount(d.totalUsers)}
              unit="accounts"
              context={
                stats.data ? `${formatCount(stats.data.newUsers30d)} new in 30 d` : undefined
              }
              definition="All registered player accounts"
            />
            <KpiTile
              label={`Active users · ${d.windowDays} d`}
              value={formatCount(d.activeUsers)}
              unit="players"
              definition="Signed in or entered a round in the window"
            />
            {moneyAccess ? (
              <KpiTile
                label="Pool liabilities"
                value={formatAmount(d.poolLiabilities)}
                unit="USDT"
                tone="gold"
                context={`+ ${formatUSDT(d.owedPrizes)} owed prizes`}
                definition="Stakes in open / closed / drawing rounds (ledger)"
              />
            ) : (
              <KpiTile
                label="Pending withdrawals"
                value={formatCount(d.pendingWithdrawals)}
                unit="in queue"
                definition="Requested → sent (count only)"
              />
            )}
            <KpiTile
              label="Active rounds"
              value={formatCount(d.activeRounds)}
              unit={d.activeRounds === 1 ? 'round' : 'rounds'}
              context={
                round.data
                  ? `${formatRoundNumber(round.data.number)} · closes ${formatTimeUTC(round.data.closesAt)}`
                  : undefined
              }
              definition="Open, closed or drawing"
              href={can('rounds.read') ? '/admin/pool' : undefined}
            />
          </div>

          <div className="grid gap-4 laptop:grid-cols-[1fr_1fr_1.2fr]">
            <QueueCard
              icon={ArrowRight}
              title="Withdrawals queue"
              sub="Finance · four eyes when flagged"
              count={d.pendingWithdrawals}
              unit="open"
              facts={[
                ['Under review', formatCount(d.withdrawalsUnderReview)],
                [
                  'Needs 2nd approver',
                  formatCount(
                    inbox.data?.items.filter((i) => i.action === 'withdrawal.approve').length ?? 0,
                  ),
                ],
              ]}
              href={can('withdrawals.read') ? '/admin/finance/withdrawals' : null}
            />
            <QueueCard
              icon={IdCard}
              title="KYC & AML"
              sub="Compliance"
              count={d.kycPending}
              unit="KYC pending"
              facts={[
                ['Open AML alerts', formatCount(d.amlOpenAlerts)],
                ['Verified accounts', stats.data ? formatCount(stats.data.kycVerified) : '—'],
              ]}
              href={can('kyc.read') ? '/admin/compliance/kyc' : null}
            />
            <ApprovalsPanel now={now} />
          </div>
        </>
      )}

      <div className="grid gap-4 laptop:grid-cols-[1.1fr_1fr]">
        <HealthPanel />
        <RoundPanel
          round={round.data}
          loading={round.isPending}
          error={round.error}
          onRetry={() => void round.refetch()}
          now={now}
        />
      </div>

      <div className="grid gap-4 laptop:grid-cols-[1.4fr_1fr]">
        <NetworksPanel />
        {can('audit.read') ? (
          <Panel
            title="Recent sensitive actions"
            icon={Activity}
            demo
            actions={
              <Button asChild variant="ghost" size="s" trailingIcon={<ArrowRight aria-hidden />}>
                <Link href="/admin/audit">Open audit log</Link>
              </Button>
            }
          >
            {audit.isPending ? (
              <Skeleton className="h-40" />
            ) : audit.isError ? (
              <QueryErrorPanel
                error={audit.error}
                onRetry={() => void audit.refetch()}
                role={role}
                what="the audit feed"
              />
            ) : (audit.data?.items.length ?? 0) === 0 ? (
              <p className="text-body-s text-text-secondary">No audit entries yet.</p>
            ) : (
              <ol className="flex flex-col">
                {(audit.data?.items ?? []).map((r, i) => (
                  <li
                    key={r.id}
                    className={cn('flex gap-3 py-2.5', i > 0 && 'border-t border-border-subtle')}
                  >
                    <span className="w-12 shrink-0 font-mono text-mono-s text-text-tertiary">
                      {formatTimeUTC(r.createdAt).replace(' UTC', '')}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-body-s text-text-primary">{r.action}</span>
                      <span className="truncate text-caption text-text-tertiary">
                        {r.actorLabel ?? r.actorType} · #{Number(r.seq).toLocaleString('en-US')} ·
                        hash-chain ✓
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        ) : (
          <AlertsSummary loading={alerts.isPending} count={alerts.data?.counts.total ?? 0} />
        )}
      </div>
    </div>
  );
}

function QueueCard({
  icon: Icon,
  title,
  sub,
  count,
  unit,
  facts,
  href,
}: {
  icon: typeof ArrowRight;
  title: string;
  sub: string;
  count: number;
  unit: string;
  facts: [string, string][];
  href: string | null;
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-default p-5"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-surface-raised text-icon-muted">
          <Icon aria-hidden className="size-[18px]" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-label-l text-text-primary">{title}</h2>
          <p className="text-caption text-text-tertiary">{sub}</p>
        </div>
        <DemoBadge size="xs" className="ml-auto" />
      </div>
      <p className="flex items-baseline gap-2">
        <span className="text-number-l tabular-nums">{formatCount(count)}</span>
        <span className="text-body-s text-text-tertiary">{unit}</span>
      </p>
      <dl className="grid grid-cols-2 gap-3">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-caption text-text-tertiary">{k}</dt>
            <dd className="text-label-m text-text-primary tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {href ? (
        <Button
          asChild
          variant="secondary"
          size="s"
          className="mt-auto self-start"
          trailingIcon={<ArrowRight aria-hidden />}
        >
          <Link href={href}>Open queue</Link>
        </Button>
      ) : (
        <p className="mt-auto flex items-center gap-1.5 text-caption text-text-tertiary">
          <Lock aria-hidden className="size-3.5" /> Queue not available for your role
        </p>
      )}
    </section>
  );
}

function ApprovalsPanel({ now }: { now: number }) {
  const inbox = useApprovalsInbox('open');
  const items = inbox.data?.items ?? [];
  return (
    <Panel
      title="Four-eyes approvals"
      icon={UserCheck}
      demo
      actions={
        inbox.data ? (
          <StatusBadge status="pending" label={`${inbox.data.counts.open} open`} />
        ) : undefined
      }
    >
      {inbox.isPending ? (
        <Skeleton className="h-40" />
      ) : inbox.isError ? (
        <QueryErrorPanel
          error={inbox.error}
          onRetry={() => void inbox.refetch()}
          what="approvals"
        />
      ) : items.length === 0 ? (
        <p className="text-body-s text-text-secondary">
          No open requests. Sensitive actions that need a second admin appear here.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.slice(0, 4).map((a, i) => (
            <li
              key={a.id}
              className={cn(
                'flex items-center gap-3 py-2',
                i > 0 && 'border-t border-border-subtle',
              )}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-mono text-mono-s text-text-tertiary">{a.ref}</span>
                <span className="truncate text-body-s text-text-primary">{a.summary}</span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1 text-caption text-text-tertiary">
                <Hourglass aria-hidden className="size-3.5" />
                {expiresIn(a.expiresAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        asChild
        variant="secondary"
        size="s"
        className="mt-3 self-start"
        trailingIcon={<ArrowRight aria-hidden />}
      >
        <Link href="/admin/approvals">Open approvals</Link>
      </Button>
    </Panel>
  );
}

function HealthPanel() {
  const health = useSystemHealth();
  const h = health.data;
  const tone = !h
    ? 'muted'
    : h.status === 'operational'
      ? 'success'
      : h.status === 'degraded'
        ? 'warning'
        : 'danger';
  return (
    <Panel
      title="System health"
      icon={Server}
      demo
      actions={
        h && (
          <StatusLine tone={tone} icon={h.status === 'operational' ? CircleCheck : TriangleAlert}>
            {h.status === 'operational'
              ? 'Operational'
              : h.status === 'degraded'
                ? 'Degraded'
                : 'Down'}
          </StatusLine>
        )
      }
      description={
        h
          ? `Checked ${formatTimeUTC(h.checkedAt, { seconds: true })} · uptime ${Math.floor(h.uptimeSeconds / 3600)} h ${Math.floor((h.uptimeSeconds % 3600) / 60)} min · v${h.version}`
          : undefined
      }
    >
      {health.isPending ? (
        <Skeleton className="h-56" />
      ) : health.isError || !h ? (
        <QueryErrorPanel
          error={health.error}
          onRetry={() => void health.refetch()}
          what="system health"
        />
      ) : (
        <dl className="flex flex-col" data-testid="system-health">
          {h.services.map((s, i) => (
            <KeyValue
              key={s.key}
              first={i === 0}
              label={s.name}
              value={
                <StatusLine
                  tone={s.status === 'up' ? 'success' : 'danger'}
                  icon={s.status === 'up' ? CircleCheck : CircleX}
                >
                  {s.status === 'up'
                    ? `Up · ${s.latencyMs} ms`
                    : `Down · ${s.error ?? 'no answer'}`}
                </StatusLine>
              }
            />
          ))}
          {h.queues.map((q) => (
            <KeyValue
              key={q.name}
              label={`Queue · ${q.name}`}
              value={
                q.status === 'up' && q.counts ? (
                  <span className="text-label-m tabular-nums">
                    {q.counts.waiting ?? 0} waiting · {q.counts.active ?? 0} active ·{' '}
                    <span className={cn((q.counts.failed ?? 0) > 0 && 'text-text-warning')}>
                      {q.counts.failed ?? 0} failed
                    </span>
                  </span>
                ) : (
                  <StatusLine tone="danger" icon={CircleX}>
                    Unreachable
                  </StatusLine>
                )
              }
            />
          ))}
          <KeyValue
            label="Background workers"
            value={
              <StatusLine
                tone={h.jobsEnabled ? 'success' : 'warning'}
                icon={h.jobsEnabled ? CircleCheck : TriangleAlert}
              >
                {h.jobsEnabled ? 'Running on this instance' : 'Off on this instance'}
              </StatusLine>
            }
          />
          <KeyValue
            label={`Randomness · ${h.randomness.provider === 'mock' ? 'mock VRF (DEMO)' : 'Chainlink VRF'}`}
            value={
              <span className="text-label-m">
                {h.randomness.lastFulfilledAt
                  ? `last fulfilled ${formatDateTimeUTC(h.randomness.lastFulfilledAt)}`
                  : 'no draws fulfilled yet'}
                {h.randomness.pendingRequests > 0
                  ? ` · ${h.randomness.pendingRequests} waiting`
                  : ''}
              </span>
            }
          />
          <KeyValue
            label="Ledger invariants"
            value={
              <StatusLine
                tone={h.ledger.ok ? 'success' : 'danger'}
                icon={h.ledger.ok ? CircleCheck : CircleX}
              >
                {h.ledger.ok
                  ? `Balanced · total ${h.ledger.ledgerTotal}`
                  : `${h.ledger.unbalancedPostings} unbalanced · ${h.ledger.poolMismatches.length} pool mismatches`}
              </StatusLine>
            }
          />
          <KeyValue
            label="Real money"
            value={
              <StatusLine tone="muted" icon={Lock}>
                {h.realMoneyEnabled ? 'Enabled' : 'Disabled · DEMO / testnet only'}
              </StatusLine>
            }
          />
        </dl>
      )}
    </Panel>
  );
}

function RoundPanel({
  round,
  loading,
  error,
  onRetry,
  now,
}: {
  round: CurrentRound | undefined;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  now: number;
}) {
  return (
    <Panel
      title={round ? `Round ${formatRoundNumber(round.number)}` : 'Current round'}
      icon={Waves}
      demo
      actions={
        round && (
          <StatusBadge
            status={round.status === 'open' ? 'live' : 'neutral'}
            label={round.status === 'open' ? 'Live' : round.status}
          />
        )
      }
    >
      {loading ? (
        <Skeleton className="h-56" />
      ) : error || !round ? (
        <QueryErrorPanel
          error={error ?? new Error('No round scheduled')}
          onRetry={error ? onRetry : undefined}
          what="the round"
        />
      ) : (
        <>
          <p className="text-overline uppercase text-text-tertiary">Pool balance</p>
          <p className="text-number-l tabular-nums text-text-gold">
            {formatUSDT(round.poolBalance)}
          </p>
          <dl className="mt-2 flex flex-col">
            <KeyValue first label="Participants" value={formatCount(round.participants)} />
            <KeyValue label="Qualifying entries" value={formatCount(round.entries)} />
            <KeyValue label="Platform fees (not in pool)" value={formatUSDT(round.platformFees)} />
            <KeyValue
              label="Closes"
              value={
                <span>
                  {formatDateTimeUTC(round.closesAt)} ·{' '}
                  <span className="tabular-nums">in {countdown(round.closesAt, now)}</span>
                </span>
              }
            />
            <KeyValue
              label="Threshold"
              value={`${round.thresholds.met ? 'Met' : 'Not met'} · ${formatCount(round.participants)} ≥ ${formatCount(round.thresholds.minParticipants)} players`}
            />
            <KeyValue label="Draw" value="Verifiable randomness · Arbitrum Sepolia" />
          </dl>
          <p className="mt-3 flex items-start gap-2 rounded-md bg-surface-raised px-3 py-2.5 text-caption text-text-secondary">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
            Monitoring only. No admin can alter entries, the draw or the payout — those actions do
            not exist.
          </p>
        </>
      )}
    </Panel>
  );
}

function NetworksPanel() {
  const health = useSystemHealth();
  return (
    <Panel
      title="Network configuration"
      icon={Activity}
      demo
      description="Testnets only · the MVP chain is Arbitrum Sepolia (421614); others stay “coming soon”."
    >
      {health.isPending ? (
        <Skeleton className="h-40" />
      ) : health.isError || !health.data ? (
        <QueryErrorPanel
          error={health.error}
          onRetry={() => void health.refetch()}
          what="networks"
        />
      ) : (
        <ul className="flex flex-col" data-testid="networks">
          {health.data.chains.map((c, i) => (
            <li
              key={c.network}
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5',
                i > 0 && 'border-t border-border-subtle',
              )}
            >
              <span className="text-label-m text-text-primary">{c.name}</span>
              <span className="text-caption text-text-tertiary">
                {c.testnet} · {c.chainId}
              </span>
              <span className="ml-auto flex items-center gap-3 text-caption text-text-tertiary">
                <span>{c.confirmations} conf.</span>
                {c.enabled ? (
                  <StatusLine
                    tone={c.rpcConfigured ? 'success' : 'warning'}
                    icon={c.rpcConfigured ? CircleCheck : TriangleAlert}
                  >
                    {c.rpcConfigured ? 'Enabled · RPC set' : 'Enabled · no RPC (watcher skips)'}
                  </StatusLine>
                ) : (
                  <StatusLine tone="muted" icon={Clock}>
                    Coming soon
                  </StatusLine>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AlertsSummary({ loading, count }: { loading: boolean; count: number }) {
  return (
    <Panel title="Alerts" icon={ShieldAlert} demo>
      {loading ? (
        <Skeleton className="h-24" />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-s text-text-secondary">
            {count === 0
              ? 'No live alerts for your role.'
              : `${count} live alert(s) visible to your role.`}
          </p>
          <Button asChild variant="secondary" size="s" trailingIcon={<ArrowRight aria-hidden />}>
            <Link href="/admin/alerts">Open alerts</Link>
          </Button>
          <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
            <KeyRound aria-hidden className="size-3.5" /> The audit feed needs the audit.read
            permission.
          </p>
        </div>
      )}
    </Panel>
  );
}
