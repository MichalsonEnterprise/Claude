'use client';

import { money } from '@gp/shared/money';
import { CircleCheck, Landmark, Receipt, Scale, TriangleAlert, Trophy, Undo2 } from 'lucide-react';
import * as React from 'react';

import { DemoBadge } from '@/components/ui/demo-badge';
import { usePoolBalance, type PoolBalanceResponse } from '@/lib/api/admin-b';

import { ExportCsvButton } from '../export-dialog';
import {
  BarChart,
  DataTable,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  MoneyText,
  Panel,
  PageStack,
  Pill,
  QueryView,
  count,
  roundLabel,
  time,
  usd,
  type Column,
} from '../primitives';

export function PoolBalancePage() {
  const q = usePoolBalance();
  const cols: Column<PoolBalanceResponse['perRound'][number]>[] = [
    {
      key: 'r',
      header: 'Round',
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {roundLabel(r.number)} {r.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    { key: 's', header: 'Status', cell: (r) => <Pill tone="brand">{r.status}</Pill> },
    { key: 'l', header: 'Ledger (USDT)', align: 'right', cell: (r) => usd(r.ledger) },
    { key: 'p', header: 'Projection (USDT)', align: 'right', cell: (r) => usd(r.projection) },
    {
      key: 'f',
      header: 'Fees — separate',
      align: 'right',
      hideBelow: 'laptop',
      cell: (r) => usd(r.fees),
    },
    {
      key: 'm',
      header: 'Check',
      cell: (r) =>
        r.matches ? (
          <span className="inline-flex items-center gap-1 text-caption text-text-success">
            <CircleCheck aria-hidden className="size-3.5" /> Match
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-caption text-text-danger">
            <TriangleAlert aria-hidden className="size-3.5" /> Mismatch
          </span>
        ),
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Pool balance"
        description="Every USDT held for the Global Pool, where it came from and who it is owed to — computed from the append-only ledger and checked against the round projections. Funds leave only through settlement (prizes) and refunds (cancelled rounds)."
        actions={<ExportCsvButton dataset="ledger" />}
      />
      <QueryView query={q}>
        {(d) => {
          const total = money(d.contractLiabilities);
          const parts = [
            { label: 'Open-round pools', value: d.escrow, cls: 'bg-gold', icon: Landmark },
            { label: 'Owed prizes', value: d.owedPrizes, cls: 'bg-brand', icon: Trophy },
            {
              label: 'Refunds outstanding',
              value: d.refundsOutstanding,
              cls: 'bg-status-info',
              icon: Undo2,
            },
          ];
          return (
            <>
              <KpiGrid>
                <KpiTile
                  label="Held for players"
                  icon={Scale}
                  value={usd(d.contractLiabilities)}
                  unit="USDT"
                  sub="pools + owed prizes + refunds"
                  demo
                />
                <KpiTile
                  label="Open-round escrow"
                  icon={Landmark}
                  value={usd(d.escrow)}
                  unit="USDT"
                  sub={d.round ? `Round ${d.round.numberLabel}` : '—'}
                  demo
                />
                <KpiTile
                  label="Owed + refunds"
                  icon={Trophy}
                  value={usd(money(d.owedPrizes).plus(d.refundsOutstanding).toFixed(2))}
                  unit="USDT"
                  sub="Credited to players’ Owed"
                  demo
                />
                <KpiTile
                  label="Platform fees (separate)"
                  icon={Receipt}
                  value={usd(d.feesSeparate)}
                  unit="USDT"
                  sub="Never part of a pool"
                  demo
                />
              </KpiGrid>
              <Panel
                title="Where the money is"
                demo
                description={`${usd(d.contractLiabilities)} USDT held for players`}
              >
                <div
                  className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-surface-raised"
                  aria-hidden
                >
                  {parts.map((p) => {
                    const pct = total.isZero()
                      ? 0
                      : money(p.value).div(total).times(100).toNumber();
                    return pct > 0 ? (
                      <span key={p.label} className={p.cls} style={{ width: `${pct}%` }} />
                    ) : null;
                  })}
                </div>
                <ul className="mt-4 grid gap-3 tablet:grid-cols-3">
                  {parts.map((p) => (
                    <li key={p.label} className="flex items-start gap-2">
                      <span aria-hidden className={`mt-1 size-3 shrink-0 rounded-xs ${p.cls}`} />
                      <span className="flex flex-col">
                        <span className="text-caption text-text-tertiary">{p.label}</span>
                        <MoneyText
                          value={p.value}
                          className="text-body-s-strong text-text-primary"
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_380px]">
                <Panel
                  title={d.round ? `Pool growth — round ${d.round.numberLabel}` : 'Pool growth'}
                  demo
                  description="USDT added per hour from entry purchases (pool sub-ledger)."
                >
                  {d.hourly.length > 0 ? (
                    <BarChart
                      label="Pool added per hour"
                      tone="gold"
                      data={d.hourly.map((h) => ({
                        key: h.hour,
                        label: `${time(h.hour).slice(0, 5)}`,
                        value: money(h.added).toNumber(),
                        display: `+${usd(h.added)} USDT · ${count(h.entries)} entries · total ${usd(h.cumulative)}`,
                      }))}
                      formatValue={(v) => usd(String(v))}
                    />
                  ) : (
                    <p className="py-8 text-center text-body-s text-text-tertiary">
                      No entries yet in this round.
                    </p>
                  )}
                </Panel>
                <Panel title="Latest pool movements" description="pool_ledger · append-only">
                  {d.movements.length === 0 ? (
                    <p className="text-body-s text-text-tertiary">No movements yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border-subtle">
                      {d.movements.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 py-2 text-body-s"
                        >
                          <span className="flex flex-col">
                            <span className="text-text-primary">
                              {m.kind === 'entry' ? `${count(m.entries)} entries` : m.kind} ·{' '}
                              {m.handle ?? '—'}
                            </span>
                            <span className="text-caption text-text-tertiary">
                              {time(m.at)} UTC
                            </span>
                          </span>
                          <MoneyText value={m.amount} tone="signed" />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
              <Panel
                flush
                title="Active round pools"
                demo
                description="Ledger balance vs the round projection used for live display — settlement refuses to run if they differ."
              >
                <DataTable
                  caption="Active round pools"
                  columns={cols}
                  rows={d.perRound}
                  rowKey={(r) => String(r.number)}
                  empty={
                    <p className="px-5 py-8 text-center text-body-s text-text-tertiary">
                      No open, closed or drawing round.
                    </p>
                  }
                  mobileCard={(r) => (
                    <div className="flex items-center justify-between">
                      <span className="text-body-s-strong">{roundLabel(r.number)}</span>
                      <span className="text-body-s tabular-nums">
                        {usd(r.ledger)} USDT · {r.matches ? 'Match' : 'Mismatch'}
                      </span>
                    </div>
                  )}
                />
              </Panel>
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}
