'use client';

import { add, money } from '@gp/shared/money';
import { CircleCheck, Coins, Landmark, Scale, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { usePoolAccounting, type PoolAccountingResponse } from '@/lib/api/admin-b';

import { ExportCsvButton } from '../export-dialog';
import {
  DataTable,
  ImmutablePanel,
  KeyValues,
  ModuleHeader,
  MoneyText,
  Panel,
  PageStack,
  Pill,
  QueryView,
  count,
  dt,
  roundLabel,
  usd,
  type Column,
} from '../primitives';

const POLICY_CANNOT = [
  'Move pool funds to any address',
  'Edit balances or ledger rows',
  'Change a round’s prize split or close time',
  'Issue manual refunds or prizes',
];

function Composition({ l }: { l: PoolAccountingResponse['liabilities'] }) {
  const total = money(l.total);
  const parts = [
    { label: 'Pool escrow (open rounds)', value: l.poolEscrow, cls: 'bg-gold' },
    { label: 'Owed prizes', value: l.owedPrizes, cls: 'bg-brand' },
    { label: 'Refunds outstanding', value: l.refundsOutstanding, cls: 'bg-status-info' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
        {parts.map((p) => {
          const pct = total.isZero() ? 0 : money(p.value).div(total).times(100).toNumber();
          return pct > 0 ? (
            <span key={p.label} className={p.cls} style={{ width: `${pct}%` }} />
          ) : null;
        })}
      </div>
      <ul className="grid gap-2 tablet:grid-cols-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-2">
            <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-xs ${p.cls}`} />
            <span className="flex flex-col">
              <span className="text-caption text-text-tertiary">{p.label}</span>
              <MoneyText value={p.value} className="text-body-s-strong text-text-primary" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PoolAccountingPage() {
  const q = usePoolAccounting();
  const columns: Column<PoolAccountingResponse['rounds'][number]>[] = [
    {
      key: 'round',
      header: 'Round',
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {roundLabel(r.number)} {r.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <Pill
          tone={r.status === 'open' ? 'brand' : r.status === 'cancelled' ? 'neutral' : 'success'}
        >
          {r.status}
        </Pill>
      ),
    },
    {
      key: 'proj',
      header: 'Projection',
      align: 'right',
      hideBelow: 'laptop',
      cell: (r) => usd(r.projection),
    },
    { key: 'in', header: 'Entries in', align: 'right', cell: (r) => usd(r.entriesIn) },
    {
      key: 'out',
      header: 'Settled out',
      align: 'right',
      hideBelow: 'laptop',
      cell: (r) => usd(r.settledOut),
    },
    { key: 'ref', header: 'Refunded', align: 'right', cell: (r) => usd(r.refunded) },
    { key: 'bal', header: 'Ledger balance', align: 'right', cell: (r) => usd(r.ledger) },
    {
      key: 'chk',
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
        module="Finance"
        title="Pool accounting"

        description="What the platform owes players for the Global Pool, computed from the append-only ledger: open-round escrow, prizes owed to winners and refunds of cancelled rounds. Platform fees are held apart."
        actions={<ExportCsvButton dataset="rounds" label="Export rounds" />}
      />
      <QueryView query={q}>
        {(d) => (
          <>
            <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
              <Panel
                title="Total pool liabilities"
                icon={Scale}
                demo
                description={`Everything the platform owes players for the Global Pool right now · updated ${dt(d.generatedAt)}`}
              >
                <p className="mb-4 flex items-baseline gap-2">
                  <span className="text-display-m text-text-primary tabular-nums">
                    {usd(d.liabilities.total)}
                  </span>
                  <span className="text-label-l text-text-tertiary">USDT</span>
                </p>
                <Composition l={d.liabilities} />
                <p className="mt-3 text-caption text-text-tertiary">
                  Not part of the pool: platform fees {usd(d.accounts.fees)} USDT sit in the fees
                  account — see Platform fees.
                </p>
              </Panel>
              <Panel
                title="Ledger check"
                icon={Landmark}
                description="Ledger mirror of custody vs what players hold"
              >
                <KeyValues
                  items={[
                    {
                      k: 'Custody mirror (chain clearing)',
                      v: <MoneyText value={d.accounts.custodyMirror} />,
                    },
                    {
                      k: 'Players · all buckets',
                      v: <MoneyText value={d.accounts.customerBalances} />,
                    },
                    { k: 'Platform fees', v: <MoneyText value={d.accounts.fees} /> },
                    {
                      k: 'Covered by custody',
                      v: money(d.accounts.custodyMirror).gte(
                        add(d.accounts.customerBalances, d.accounts.fees),
                      ) ? (
                        <StatusBadge status="confirmed" label="Match" size="s" />
                      ) : (
                        <StatusBadge status="under_review" label="Check custody" size="s" />
                      ),
                    },
                  ]}
                />
                <p className="mt-2 text-caption text-text-tertiary">
                  On-chain balances are read by the watchers; in this DEMO environment no RPC is
                  configured, so the check uses the ledger mirror.
                </p>
              </Panel>
            </div>
            <div className="grid gap-4 laptop:grid-cols-2">
              <Panel
                title={
                  d.currentRound
                    ? `Round ${roundLabel(d.currentRound.number)} waterfall`
                    : 'Current round'
                }
                icon={Coins}
                demo={d.currentRound?.isDemo}
              >
                {d.currentRound ? (
                  <div className="flex flex-col gap-3">
                    <KeyValues
                      items={[
                        {
                          k: `${count(d.currentRound.entries)} entries × ${usd(d.currentRound.entryPrice)}`,
                          v: <MoneyText value={d.currentRound.pool} />,
                        },
                        {
                          k: 'Platform fees (not in pool)',
                          v: <MoneyText value={d.currentRound.fees} />,
                        },
                        { k: 'Closes', v: dt(d.currentRound.closesAt) },
                      ]}
                    />
                    <p className="text-overline uppercase text-text-tertiary">
                      Prize distribution (if thresholds are met)
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {d.currentRound.waterfall.tiers.map((t) => (
                        <li
                          key={t.tier}
                          className="flex items-center justify-between gap-2 text-body-s"
                        >
                          <span className="text-text-secondary">
                            {t.label} · {t.sharePercent}%
                            {t.winners > 1 ? ` · ${t.winners} × ${usd(t.amountEach)}` : ''}
                          </span>
                          <MoneyText value={t.amountTotal} className="text-text-primary" />
                        </li>
                      ))}
                    </ul>
                    <p className="text-caption text-text-tertiary">
                      The prizes always sum to the pool. If thresholds are not met the round is
                      cancelled and every stake returns to Owed.
                    </p>
                  </div>
                ) : (
                  <p className="text-body-s text-text-secondary">No open round.</p>
                )}
              </Panel>
              <Panel
                title="Ledger accounts"
                icon={Landmark}
                description="Σ of lines per account type — read-only"
              >
                <KeyValues
                  items={[
                    { k: 'Pool accounts', v: <MoneyText value={d.accounts.pool} /> },
                    {
                      k: 'Prize liability (0 after settlement)',
                      v: <MoneyText value={d.accounts.prizeLiability} />,
                    },
                    { k: 'Refunds clearing', v: <MoneyText value={d.accounts.refundsClearing} /> },
                    { k: 'Players · Owed', v: <MoneyText value={d.accounts.userOwed} /> },
                    {
                      k: 'Players · all buckets',
                      v: <MoneyText value={d.accounts.customerBalances} />,
                    },
                    { k: 'Platform fees (separate)', v: <MoneyText value={d.accounts.fees} /> },
                    {
                      k: 'Custody mirror (chain clearing)',
                      v: <MoneyText value={d.accounts.custodyMirror} />,
                    },
                    {
                      k: 'Covered by custody',
                      v: money(d.accounts.custodyMirror).gte(
                        add(d.accounts.customerBalances, d.accounts.fees),
                      ) ? (
                        <StatusBadge status="confirmed" label="Yes" size="s" />
                      ) : (
                        <StatusBadge status="under_review" label="Check custody" size="s" />
                      ),
                    },
                  ]}
                />
              </Panel>
            </div>
            <Panel
              flush
              title="Rounds ledger"
              demo
              description="Projection vs ledger per round; unsettled rounds must match before settlement may run."
            >
              <DataTable
                caption="Rounds ledger"
                columns={columns}
                rows={d.rounds}
                rowKey={(r) => String(r.number)}
                mobileCard={(r) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-body-s-strong">
                        {roundLabel(r.number)} · {r.status}
                      </span>
                      <span
                        className={
                          r.matches
                            ? 'text-caption text-text-success'
                            : 'text-caption text-text-danger'
                        }
                      >
                        {r.matches ? 'Match' : 'Mismatch'}
                      </span>
                    </div>
                    <p className="text-caption text-text-secondary">
                      In {usd(r.entriesIn)} · refunded {usd(r.refunded)} · balance {usd(r.ledger)}{' '}
                      USDT
                    </p>
                  </div>
                )}
              />
            </Panel>
            <ImmutablePanel cannot={POLICY_CANNOT} allowed={d.policy} />
          </>
        )}
      </QueryView>
    </PageStack>
  );
}
