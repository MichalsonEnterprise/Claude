'use client';

import {
  Activity,
  CircleCheck,
  Clock,
  Coins,
  Cpu,
  FileCode2,
  Hourglass,
  Pause,
  Receipt,
  Scale,
  Trophy,
  Undo2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { usePoolOverview, type RoundRow } from '@/lib/api/admin-b';
import { money } from '@gp/shared/money';

import { ExportCsvButton } from '../export-dialog';
import {
  DataTable,
  ImmutablePanel,
  KpiGrid,
  KpiTile,
  LiveDot,
  ModuleHeader,
  Panel,
  PageStack,
  Pill,
  QueryView,
  StatusLine,
  count,
  dt,
  roundLabel,
  time,
  usd,
  type Column,
} from '../primitives';
import { ServerCountdown } from './shared';

export const ROUND_TONE: Record<string, 'brand' | 'success' | 'neutral' | 'warning' | 'info'> = {
  open: 'brand',
  scheduled: 'info',
  closed: 'warning',
  drawing: 'warning',
  settled: 'success',
  cancelled: 'neutral',
};

export const roundColumns: Column<RoundRow>[] = [
  {
    key: 'round',
    header: 'Round',
    cell: (r) => (
      <span className="flex flex-col">
        <span className="flex items-center gap-1.5 text-body-s-strong">
          {roundLabel(r.number)} {r.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
        <span className="text-caption text-text-tertiary">{dt(r.closesAt).slice(0, 11)}</span>
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (r) => <Pill tone={ROUND_TONE[r.status] ?? 'neutral'}>{r.statusLabel}</Pill>,
  },
  {
    key: 'players',
    header: 'Participants',
    align: 'right',
    hideBelow: 'laptop',
    cell: (r) => count(r.participants),
  },
  { key: 'entries', header: 'Entries', align: 'right', cell: (r) => count(r.entries) },
  { key: 'pool', header: 'Pool (USDT)', align: 'right', cell: (r) => usd(r.pool) },
  {
    key: 'fees',
    header: 'Fees (USDT)',
    align: 'right',
    hideBelow: 'desktop',
    cell: (r) => usd(r.fees),
  },
  {
    key: 'settle',
    header: 'Settlement',
    cell: (r) => (
      <span className="text-caption text-text-secondary">
        {r.settlement?.label ?? (r.status === 'open' ? `Closes ${time(r.closesAt)} UTC` : '—')}
      </span>
    ),
  },
];

export function PoolOverviewPage() {
  const q = usePoolOverview();
  const receivedAt = q.dataUpdatedAt;
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Global Pool — overview"
        crumb="Overview"
        badges={<LiveDot />}
        description="Live state of the current round and the rounds still settling. Rules, results and payouts are contract-defined: this console monitors them and can only pause NEW entries (dual approval)."
        actions={<ExportCsvButton dataset="rounds" label="Export report" />}
      />
      <QueryView query={q}>
        {(d) => {
          const r = d.round;
          const prev = d.previous;
          const growth =
            r && prev && !money(prev.pool).isZero()
              ? money(r.poolBalance).minus(prev.pool).div(prev.pool).times(100).toFixed(1)
              : null;
          return (
            <>
              <KpiGrid>
                <KpiTile
                  label={r ? `Pool — round ${r.numberLabel}` : 'Pool'}
                  icon={Coins}
                  value={usd(d.kpis.pool)}
                  unit="USDT"
                  sub={
                    r
                      ? `${count(r.entries)} entries × ${usd(r.entryPrice)} USDT${growth ? ` · ${growth.startsWith('-') ? '' : '+'}${growth}% vs ${roundLabel(prev!.number)}` : ''}`
                      : undefined
                  }
                  demo
                />
                <KpiTile
                  label="Participants"
                  icon={Users}
                  value={count(d.kpis.participants)}
                  unit="accounts"
                  sub={
                    r
                      ? `Minimum ${count(r.thresholds.minParticipants)} — ${d.kpis.participants >= r.thresholds.minParticipants ? 'met' : 'not met yet'}`
                      : undefined
                  }
                  subTone={
                    r && d.kpis.participants >= r.thresholds.minParticipants ? 'success' : 'warning'
                  }
                  demo
                />
                <KpiTile
                  label="Owed prizes"
                  icon={Trophy}
                  value={usd(d.kpis.owedPrizes)}
                  unit="USDT"
                  sub={`${count(d.kpis.owedPrizesCount)} prizes · settled rounds, excl. refunds`}
                  demo
                />
                <KpiTile
                  label={r ? `Fees — round ${r.numberLabel}` : 'Fees'}
                  icon={Receipt}
                  value={usd(d.kpis.fees)}
                  unit="USDT"
                  sub={`0.05 × ${count(d.kpis.entries)} · fees account, not in pool`}
                  demo
                />
              </KpiGrid>

              {r ? (
                <Panel
                  title={`Round ${r.numberLabel} — ${r.statusLabel.toLowerCase()}`}
                  icon={Clock}
                  demo={r.isDemo}
                  actions={
                    <Button asChild size="s" variant="secondary">
                      <Link href="/admin/pool/active">Monitor round</Link>
                    </Button>
                  }
                >
                  <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                        <div>
                          <p className="text-caption text-text-tertiary">Closes in</p>
                          <p className="text-number-l text-text-gold">
                            <ServerCountdown
                              closesAt={r.closesAt}
                              serverNow={d.serverNow}
                              receivedAt={receivedAt}
                            />
                          </p>
                          <p className="text-caption text-text-tertiary">{dt(r.closesAt)}</p>
                        </div>
                        <div>
                          <p className="text-caption text-text-tertiary">Pool</p>
                          <p className="text-number-l text-text-primary tabular-nums">
                            {usd(r.poolBalance)}{' '}
                            <span className="text-label-s text-text-tertiary">USDT</span>
                          </p>
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-border-subtle bg-bg-secondary laptop:grid-cols-4">
                        {[
                          {
                            k: 'Participants',
                            v: count(r.participants),
                            s: `min ${count(r.thresholds.minParticipants)}`,
                          },
                          {
                            k: 'Qualifying entries',
                            v: count(r.entries),
                            s: `${usd(r.entryPrice)} USDT each`,
                          },
                          {
                            k: 'Pool balance',
                            v: `${usd(r.poolBalance)} USDT`,
                            s: 'platform fees excluded',
                          },
                          {
                            k: 'Threshold',
                            v: r.thresholds.met ? 'Met' : 'Not met yet',
                            s: r.thresholds.met ? 'round will draw' : 'cancel + refund if unmet',
                          },
                        ].map((x) => (
                          <div
                            key={x.k}
                            className="flex flex-col gap-0.5 border-border-subtle p-3 not-last:border-r"
                          >
                            <dt className="text-caption text-text-tertiary">{x.k}</dt>
                            <dd className="text-body-m-strong text-text-primary tabular-nums">
                              {x.v}
                            </dd>
                            <dd className="text-caption text-text-tertiary">{x.s}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="rounded-md border border-border-subtle bg-bg-secondary px-3 py-2 text-caption text-text-secondary">
                        Entry {usd(r.entryPrice)} USDT + {usd(r.platformFeePerEntry)} USDT platform
                        fee per entry (separate line) · You can lose your stake · 18+ · permitted
                        jurisdictions only
                      </p>
                      <ol
                        className="grid gap-2 tablet:grid-cols-4"
                        aria-label="Lifecycle (contract-defined, no manual steps)"
                      >
                        {[
                          { t: 'Entries open', s: `Opened ${time(r.openedAt)} UTC`, done: true },
                          {
                            t: 'Close + VRF request',
                            s: `Automatic at ${time(r.closesAt)} UTC`,
                            done: ['closed', 'drawing', 'settled'].includes(r.status),
                          },
                          {
                            t: 'VRF fulfilment',
                            s: r.draw?.fulfilledAt
                              ? `Fulfilled ${time(r.draw.fulfilledAt)}`
                              : 'After close',
                            done: Boolean(r.draw?.fulfilledAt),
                          },
                          {
                            t: 'Settle + credit',
                            s: r.settledAt ? `Settled ${time(r.settledAt)}` : '13 prizes to Owed',
                            done: r.status === 'settled',
                          },
                        ].map((s, i) => (
                          <li
                            key={s.t}
                            className="flex items-start gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3"
                          >
                            <span
                              className={
                                s.done
                                  ? 'flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-label-s text-text-on-primary'
                                  : 'flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-label-s text-text-secondary'
                              }
                            >
                              {s.done ? <CircleCheck aria-hidden className="size-3.5" /> : i + 1}
                            </span>
                            <span className="flex flex-col">
                              <span className="text-label-s text-text-primary">{s.t}</span>
                              <span className="text-caption text-text-tertiary">{s.s}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="text-caption text-text-tertiary">
                        Lifecycle is contract-defined — there are no manual steps.
                      </p>
                    </div>
                    <dl className="flex flex-col divide-y divide-border-subtle rounded-md border border-border-subtle bg-bg-secondary px-4">
                      <div className="flex flex-col py-3">
                        <dt className="text-caption text-text-tertiary">Thresholds</dt>
                        <dd className="text-body-s-strong text-text-primary">
                          {r.thresholds.met ? 'Met' : 'Not met yet'}
                          <span className="block text-caption font-normal text-text-tertiary">
                            {count(r.participants)} / {count(r.thresholds.minParticipants)}{' '}
                            participants · {usd(r.poolBalance)} / {usd(r.thresholds.minPool)}
                          </span>
                        </dd>
                      </div>
                      <div className="flex flex-col py-3">
                        <dt className="text-caption text-text-tertiary">Entry rate</dt>
                        <dd className="text-body-s-strong text-text-primary">
                          {count(d.kpis.entriesLastHour)} / h
                        </dd>
                      </div>
                      <div className="flex flex-col py-3">
                        <dt className="text-caption text-text-tertiary">Next contract step</dt>
                        <dd className="text-body-s-strong text-text-primary">
                          {time(r.closesAt)} UTC{' '}
                          <span className="block text-caption font-normal text-text-tertiary">
                            Close + VRF request (automatic)
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Panel>
              ) : null}

              <div className="grid gap-4 laptop:grid-cols-2">
                <Panel title="Pipeline health" icon={Activity}>
                  <StatusLine
                    ok={d.pipeline.contract.configured}
                    pending={!d.pipeline.contract.configured}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <FileCode2 aria-hidden className="size-3.5" />
                        GlobalPoolRounds contract
                      </span>
                    }
                    detail={
                      d.pipeline.contract.address
                        ? `${d.pipeline.contract.address} · Arbitrum Sepolia`
                        : 'Not configured in this DEMO environment — rounds run on the off-chain mirror'
                    }
                  />
                  <StatusLine
                    ok={d.pipeline.newEntries === 'open'}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        {d.pipeline.newEntries === 'open' ? null : (
                          <Pause aria-hidden className="size-3.5" />
                        )}
                        New entries {d.pipeline.newEntries} · breaker{' '}
                        {d.pipeline.newEntries === 'open' ? 'off' : 'ON'}
                      </span>
                    }
                    detail={
                      d.pipeline.breakerLastChange
                        ? `Last change ${dt(d.pipeline.breakerLastChange.at)} by ${d.pipeline.breakerLastChange.by}`
                        : 'Circuit breaker never used'
                    }
                  />
                  <StatusLine
                    ok
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <Cpu aria-hidden className="size-3.5" />
                        Randomness provider:{' '}
                        {d.pipeline.randomness.provider === 'mock'
                          ? 'mock (DEV)'
                          : 'Chainlink VRF v2.5'}
                      </span>
                    }
                    detail={`Timeout ${d.pipeline.randomness.timeoutHours} h → round cancelled with refunds${d.pipeline.randomness.lastRequest ? ` · last request ${d.pipeline.randomness.lastRequest.status}` : ''}`}
                  />
                  <StatusLine
                    ok={d.pipeline.ledger.ok}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <Scale aria-hidden className="size-3.5" />
                        Ledger ↔ round projections{' '}
                        {d.pipeline.ledger.ok ? 'reconciled' : 'MISMATCH'}
                      </span>
                    }
                    detail={`Checked ${dt(d.pipeline.ledger.checkedAt)} · ${count(d.pipeline.ledger.poolMismatches)} pool mismatches`}
                  />
                </Panel>
                <Panel title="Needs attention" icon={Hourglass}>
                  <ul className="flex flex-col gap-2">
                    <li className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3">
                      <span className="flex items-center gap-2 text-body-s text-text-secondary">
                        <Trophy aria-hidden className="size-4 text-icon-gold" /> Owed prizes (
                        {count(d.kpis.owedPrizesCount)})
                      </span>
                      <span className="text-body-s-strong tabular-nums">
                        {usd(d.kpis.owedPrizes)} USDT
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3">
                      <Link
                        href="/admin/pool/refunds"
                        className="flex items-center gap-2 text-body-s text-text-secondary hover:underline"
                      >
                        <Undo2 aria-hidden className="size-4 text-icon-default" /> Refunds
                        outstanding ({count(d.kpis.refundsOutstandingCount)} players)
                      </Link>
                      <span className="text-body-s-strong tabular-nums">
                        {usd(d.kpis.refundsOutstanding)} USDT
                      </span>
                    </li>
                  </ul>
                  <p className="mt-3 text-caption text-text-tertiary">
                    Held prizes are released by Compliance decisions, never by editing the pool.
                  </p>
                </Panel>
              </div>

              <Panel
                flush
                title="Recent rounds"
                demo
                actions={
                  <Button asChild size="s" variant="ghost">
                    <Link href="/admin/pool/rounds">All rounds</Link>
                  </Button>
                }
              >
                <DataTable
                  caption="Recent rounds"
                  columns={roundColumns}
                  rows={d.recent}
                  rowKey={(x) => x.id}
                  empty={
                    <EmptyState
                      title="No rounds yet"
                      description="Rounds appear here once the first one opens."
                    />
                  }
                  rowHref={(x) =>
                    x.status === 'cancelled'
                      ? `/admin/pool/refunds?round=${x.number}`
                      : `/admin/pool/prizes?round=${x.number}`
                  }
                  mobileCard={(x) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-body-s-strong">{roundLabel(x.number)}</span>
                        <Pill tone={ROUND_TONE[x.status] ?? 'neutral'}>{x.statusLabel}</Pill>
                      </div>
                      <p className="text-caption text-text-secondary">
                        {count(x.entries)} entries · {usd(x.pool)} USDT ·{' '}
                        {x.settlement?.label ?? ''}
                      </p>
                    </div>
                  )}
                />
              </Panel>

              <ImmutablePanel
                cannot={d.policy.cannot}
                allowed={d.policy.allowed}
                action={
                  <Button asChild size="s" variant="secondary">
                    <Link href="/admin/pool/policy">Open policy & circuit breaker</Link>
                  </Button>
                }
              />
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}
