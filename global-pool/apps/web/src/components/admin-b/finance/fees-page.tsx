'use client';

import { CalendarDays, CircleCheck, Coins, Layers, Receipt, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useFees, type FeesResponse } from '@/lib/api/admin-b';

import { ExportCsvButton } from '../export-dialog';
import {
  BarChart,
  DataTable,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  Panel,
  PageStack,
  Pill,
  QueryView,
  count,
  roundLabel,
  usd,
  type Column,
} from '../primitives';

const STATE: Record<
  FeesResponse['byRound'][number]['state'],
  { label: string; tone: 'info' | 'success' | 'neutral' }
> = {
  accruing: { label: 'Accruing — round open', tone: 'info' },
  earned: { label: 'Earned', tone: 'success' },
  retained_cancelled: { label: 'Retained — round cancelled', tone: 'neutral' },
};

export function FeesPage() {
  const fees = useFees();
  const [showTable, setShowTable] = React.useState(false);
  const columns: Column<FeesResponse['byRound'][number]>[] = [
    {
      key: 'round',
      header: 'Round',
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {r.roundNumber ? (
            <Link href={`/admin/pool/prizes?round=${r.roundNumber}`} className="hover:underline">
              {roundLabel(r.roundNumber)}
            </Link>
          ) : (
            'No round'
          )}
          {r.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    { key: 'entries', header: 'Qualifying entries', align: 'right', cell: (r) => count(r.entries) },
    { key: 'rate', header: 'Rate', align: 'right', hideBelow: 'laptop', cell: () => '0.05' },
    { key: 'amount', header: 'Fees (USDT)', align: 'right', cell: (r) => usd(r.amount) },
    {
      key: 'state',
      header: 'State',
      cell: (r) => <Pill tone={STATE[r.state].tone}>{STATE[r.state].label}</Pill>,
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Platform fees"

        description="0.05 USDT per qualifying entry, always shown to players as its own line and posted to the fees account — never into a pool. Network fees are separate."
        actions={<ExportCsvButton dataset="platform_fees" />}
      />
      <QueryView query={fees}>
        {(data) => (
          <>
            <KpiGrid>
              <KpiTile
                label="Fees · last 30 days"
                icon={Coins}
                value={usd(data.totals.last30d)}
                unit="USDT"
                sub={`${count(data.totals.last30dEntries)} qualifying entries`}
                demo
              />
              <KpiTile
                label="Fees · last 24 h"
                icon={CalendarDays}
                value={usd(data.totals.last24h)}
                unit="USDT"
                sub={`${count(data.totals.last24hEntries)} entries`}
                demo
              />
              <KpiTile
                label="Fees account"
                icon={Layers}
                value={usd(data.totals.feesAccountBalance)}
                unit="USDT"
                sub="All time · separate from every pool"
                demo
              />
              <KpiTile
                label="Sub-ledger check"
                icon={data.totals.subLedgerMatchesAccount ? CircleCheck : TriangleAlert}
                value={data.totals.subLedgerMatchesAccount ? 'Match' : 'Mismatch'}
                sub={`fee_ledger Σ ${usd(data.totals.allTime)} = fees account`}
                subTone={data.totals.subLedgerMatchesAccount ? 'success' : 'danger'}
              />
            </KpiGrid>
            <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
              <Panel
                title="Platform fees per day · last 30 days"
                demo
                actions={
                  <button
                    type="button"
                    onClick={() => setShowTable((s) => !s)}
                    className="min-h-11 text-label-s text-text-brand hover:underline tablet:min-h-0"
                  >
                    {showTable ? 'Show chart' : 'Show as table'}
                  </button>
                }
              >
                {showTable ? (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-body-s">
                      <caption className="sr-only">Platform fees per day</caption>
                      <thead>
                        <tr className="text-overline uppercase text-text-tertiary">
                          <th className="py-1 text-left">Day (UTC)</th>
                          <th className="py-1 text-right">Entries</th>
                          <th className="py-1 text-right">Fees (USDT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.series.map((d) => (
                          <tr key={d.day} className="border-t border-border-subtle">
                            <td className="py-1.5">{d.day}</td>
                            <td className="py-1.5 text-right tabular-nums">{count(d.entries)}</td>
                            <td className="py-1.5 text-right tabular-nums">{usd(d.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <BarChart
                    label="Platform fees per day"
                    data={data.series.map((d) => ({
                      key: d.day,
                      label: d.day.slice(5),
                      value: Number(d.amount),
                      display: `${usd(d.amount)} USDT · ${count(d.entries)} entries`,
                    }))}
                    formatValue={(v) => usd(String(v))}
                  />
                )}
                <p className="mt-3 text-caption text-text-tertiary">
                  Total {usd(data.totals.last30d)} USDT · each bar = one UTC day.
                </p>
              </Panel>
              <Panel title="Fee rule" icon={Receipt}>
                <div className="flex flex-col gap-3">
                  <p className="text-number-m text-text-primary">
                    {data.rule.perEntry}{' '}
                    <span className="text-label-s text-text-tertiary">
                      USDT per qualifying entry
                    </span>
                  </p>
                  <p className="text-body-s text-text-secondary">{data.rule.description}</p>
                  <p className="text-caption text-text-tertiary">{data.rule.changePolicy}</p>
                  <p className="text-caption text-text-tertiary">{data.rule.cancelledRounds}</p>
                  {data.totals.cancelledRoundFees !== '0.00' ? (
                    <p className="text-caption text-text-secondary">
                      Cancelled rounds: {usd(data.totals.cancelledRoundFees)} USDT in fees (stakes
                      fully refunded).
                    </p>
                  ) : null}
                </div>
              </Panel>
            </div>
            <Panel
              flush
              title="Fees by round"
              demo
              description="From the fee sub-ledger (fee_ledger), mirrored line by line from the fees account."
            >
              <DataTable
                caption="Fees by round"
                columns={columns}
                rows={data.byRound}
                rowKey={(r) => r.roundId ?? 'none'}
                empty={
                  <EmptyState
                    type="no-data"
                    title="No platform fees yet"
                    description="Fees appear with the first entry purchase."
                    className="py-10"
                  />
                }
                mobileCard={(r) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-body-s-strong text-text-primary">
                        {roundLabel(r.roundNumber)}
                      </span>
                      <span className="text-body-s-strong tabular-nums">{usd(r.amount)} USDT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-text-tertiary">
                        {count(r.entries)} entries × 0.05
                      </span>
                      <Pill tone={STATE[r.state].tone}>{STATE[r.state].label}</Pill>
                    </div>
                  </div>
                )}
              />
            </Panel>
          </>
        )}
      </QueryView>
    </PageStack>
  );
}
