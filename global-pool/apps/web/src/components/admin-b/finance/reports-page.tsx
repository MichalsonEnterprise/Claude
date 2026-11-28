'use client';

import { CalendarRange, Coins, Gift, TrendingUp } from 'lucide-react';
import * as React from 'react';

import { useRevenue } from '@/lib/api/admin-b';
import { money } from '@gp/shared/money';

import { ExportCsvButton } from '../export-dialog';
import {
  BarChart,
  FilterChips,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  MoneyText,
  Panel,
  PageStack,
  QueryView,
  count,
  dt,
  usd,
} from '../primitives';

export function ReportsPage() {
  const [days, setDays] = React.useState<'7' | '30' | '90'>('30');
  const q = useRevenue(Number(days));
  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Revenue reports"

        description="Platform revenue tied to its ledger sources. Pool stakes and prizes are player money and never count as revenue; recovered network fees are shown but excluded."
        actions={<ExportCsvButton dataset="revenue" />}
      />
      <FilterChips
        label="Period"
        value={days}
        onChange={setDays}
        options={[
          { value: '7', label: 'Last 7 days' },
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 90 days' },
        ]}
      />
      <QueryView query={q}>
        {(d) => (
          <>
            <KpiGrid>
              <KpiTile
                label="Gross revenue"
                icon={Coins}
                value={usd(d.gross)}
                unit="USDT"
                sub={`${count(d.qualifyingEntries)} qualifying entries × 0.05`}
                demo
              />
              <KpiTile
                label="Rewards funded"
                icon={Gift}
                value={usd(d.rewards)}
                unit="USDT"
                sub="VIP rewards, rakeback, cashback"
                demo
              />
              <KpiTile
                label="Net revenue"
                icon={TrendingUp}
                value={usd(d.net)}
                unit="USDT"
                sub="Gross − rewards"
                subTone="success"
                demo
              />
              <KpiTile
                label="Period"
                icon={CalendarRange}
                value={`${d.period.days} days`}
                sub={`${dt(d.period.from)} → now`}
              />
            </KpiGrid>
            <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]">
              <Panel
                title="Net platform fees per week"
                demo
                description="Weeks start Monday (UTC). Sum equals gross revenue for the period."
              >
                {d.weekly.length > 0 ? (
                  <BarChart
                    label="Platform fees per week"
                    height={180}
                    data={d.weekly.map((w) => ({
                      key: w.weekStart,
                      label: w.weekStart.slice(5),
                      value: money(w.net).toNumber(),
                      display: `${usd(w.net)} USDT`,
                    }))}
                    formatValue={(v) => usd(String(v))}
                  />
                ) : (
                  <p className="py-8 text-center text-body-s text-text-tertiary">
                    No revenue in this period.
                  </p>
                )}
              </Panel>
              <Panel title="By product">
                <ul className="flex flex-col gap-3">
                  {d.products.map((p) => (
                    <li key={p.key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 text-body-s">
                        <span className="text-text-secondary">{p.name}</span>
                        <MoneyText value={p.amount} />
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-surface-raised"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${p.share}%` }}
                        />
                      </div>
                      <span className="text-caption text-text-tertiary">{p.share}% of gross</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-caption text-text-tertiary">
                  Games run as non-monetary simulations until separately approved.
                </p>
              </Panel>
            </div>
            <Panel
              title="Revenue statement"
              demo
              description="Each line names the ledger source it is computed from."
            >
              <table className="w-full text-body-s">
                <caption className="sr-only">Revenue statement</caption>
                <thead>
                  <tr className="text-overline uppercase text-text-tertiary">
                    <th className="py-2 text-left">Line</th>
                    <th className="hidden py-2 text-left tablet:table-cell">Ledger source</th>
                    <th className="py-2 text-right">USDT</th>
                  </tr>
                </thead>
                <tbody>
                  {d.statement.map((s, i) => (
                    <tr
                      key={s.line}
                      className={
                        i === d.statement.length - 1
                          ? 'border-t border-border-default text-body-s-strong'
                          : 'border-t border-border-subtle'
                      }
                    >
                      <td className="py-2 pr-2">{s.line}</td>
                      <td className="hidden py-2 font-mono text-mono-s text-text-tertiary tablet:table-cell">
                        {s.source}
                      </td>
                      <td className="py-2 text-right tabular-nums">{usd(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-overline uppercase text-text-tertiary">
                Excluded from revenue
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {d.excluded.map((x) => (
                  <li
                    key={x.line}
                    className="flex flex-wrap justify-between gap-2 text-caption text-text-secondary"
                  >
                    <span>
                      {x.line} — <span className="text-text-tertiary">{x.why}</span>
                    </span>
                    {x.amount ? <MoneyText value={x.amount} /> : null}
                  </li>
                ))}
              </ul>
            </Panel>
            <p className="text-caption text-text-tertiary">
              Scheduled reports are not configured in this build — use Export CSV (reason required,
              audited).
            </p>
          </>
        )}
      </QueryView>
    </PageStack>
  );
}
