'use client';

import type { TxStatus, TxType } from '@gp/shared/enums';
import { formatCount } from '@gp/shared/format';
import { gt, money, toUSDTString } from '@gp/shared/money';
import {
  CircleCheck,
  Clock,
  Crown,
  Download,
  Hourglass,
  Info,
  Loader,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { newIdempotencyKey } from '@/lib/api/client';
import {
  historyApi,
  useActiveRounds,
  useFeeLines,
  useFinanceSummary,
  useHistoryTransactions,
  useRoundResults,
  useWalletBalances,
  type HistoryTxFilters,
  type TxView,
} from '@/lib/api/rg-history';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

import { ExportDialog, periodFrom } from './export-dialog';
import { dateTime, num } from './format';
import {
  EmptyCard,
  FIN_BASE,
  FinancePage,
  Kpi,
  LinkButton,
  ListSkeleton,
  Pager,
  TxCards,
  TxTable,
  type RoundStatusMap,
} from './history-common';
import { QueryError } from './page-shell';
import { IconTile, KV, Meter, NoteBox } from './ui';

const PAGE_SIZE = 10;

function useRoundStatusMap(): RoundStatusMap {
  const active = useActiveRounds();
  const results = useRoundResults();
  return React.useMemo(() => {
    const map: RoundStatusMap = {};
    for (const r of [...(active.data ?? []), ...(results.data ?? [])])
      map[r.round.id] = r.round.status;
    return map;
  }, [active.data, results.data]);
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

const STATUS_OPTIONS: { value: '' | TxStatus; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'completed', label: 'Completed' },
  { value: 'confirming', label: 'Confirming' },
  { value: 'under_review', label: 'Under review' },
  { value: 'pending', label: 'Pending / owed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];
const TYPE_OPTIONS: { value: string; label: string; types?: TxType[] }[] = [
  { value: '', label: 'All activity' },
  { value: 'deposit', label: 'Deposits', types: ['deposit'] },
  { value: 'withdrawal', label: 'Withdrawals', types: ['withdrawal'] },
  { value: 'entry', label: 'Entries', types: ['entry_purchase'] },
  { value: 'prize', label: 'Prizes', types: ['prize'] },
  {
    value: 'reward',
    label: 'Rewards',
    types: ['reward', 'rakeback', 'cashback', 'referral_commission'],
  },
  { value: 'refund', label: 'Refunds', types: ['refund'] },
];
const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
] as const;

function NativeSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-0 rounded-md border border-border-default bg-surface-raised px-3 text-body-s text-text-primary tablet:h-10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Filterable, paginated transaction list (search · type · status · period · export). */
function TxList({
  types,
  allowTypeFilter = false,
  emptyTitle,
  emptyText,
  emptyAction,
  onExport,
  caption,
}: {
  types?: TxType[];
  allowTypeFilter?: boolean;
  emptyTitle: string;
  emptyText: string;
  emptyAction?: React.ReactNode;
  onExport: () => void;
  caption: string;
}) {
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<'' | TxStatus>('');
  const [period, setPeriod] = React.useState<(typeof PERIOD_OPTIONS)[number]['value']>('all');
  const [typeKey, setTypeKey] = React.useState('');
  const [page, setPage] = React.useState(1);
  const dq = useDebounced(q);
  React.useEffect(() => setPage(1), [dq, status, period, typeKey]);
  const filters: HistoryTxFilters = {
    types: allowTypeFilter ? TYPE_OPTIONS.find((t) => t.value === typeKey)?.types : types,
    status: status || undefined,
    from: periodFrom(period),
    q: dq || undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const query = useHistoryTransactions(filters);
  const rounds = useRoundStatusMap();
  const filtered = Boolean(dq || status || period !== 'all' || typeKey);

  return (
    <Card padding="none" className="gap-0">
      <div className="flex flex-col gap-3 border-b border-border-subtle p-4 laptop:flex-row laptop:items-center">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Search by ID or hash"
            placeholder="Search ID, round or hash"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leadingIcon={<Search />}
            size="m"
            groupClassName="h-11 tablet:h-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 tablet:flex tablet:items-center">
          {allowTypeFilter && (
            <NativeSelect
              label="Type"
              value={typeKey}
              onChange={setTypeKey}
              options={TYPE_OPTIONS}
            />
          )}
          <NativeSelect
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as TxStatus | '')}
            options={STATUS_OPTIONS}
          />
          <NativeSelect
            label="Period"
            value={period}
            onChange={(v) => setPeriod(v as typeof period)}
            options={PERIOD_OPTIONS}
          />
          <Button
            variant="secondary"
            size="m"
            className="min-h-11 tablet:min-h-10"
            onClick={onExport}
          >
            <Download aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>
      <p className="flex items-start gap-2 border-b border-border-subtle px-4 py-2 text-caption text-text-tertiary">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Shows movements of your USDT cash balance, newest first. Times in UTC. The 0.05 USDT
        platform fee is always its own line, separate from network fees.
      </p>
      <div className="p-2 lg:p-0">
        {query.isPending ? (
          <div className="p-4">
            <ListSkeleton />
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <QueryError error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : query.data.items.length === 0 ? (
          <div className="p-4">
            {filtered ? (
              <EmptyCard
                title="No matching transactions"
                description="Try another search, status or period."
                actions={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ('');
                      setStatus('');
                      setPeriod('all');
                      setTypeKey('');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyCard title={emptyTitle} description={emptyText} actions={emptyAction} />
            )}
          </div>
        ) : (
          <>
            <TxTable items={query.data.items} rounds={rounds} caption={caption} />
            <TxCards items={query.data.items} rounds={rounds} />
          </>
        )}
      </div>
      {query.data && query.data.total > 0 && (
        <div className="border-t border-border-subtle p-4">
          <Pager
            page={page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </div>
      )}
    </Card>
  );
}

function useExport(types?: TxType[]) {
  const [open, setOpen] = React.useState(false);
  return {
    open: () => setOpen(true),
    dialog: <ExportDialog open={open} onOpenChange={setOpen} defaultTypes={types} />,
  };
}

// ── F6 · Complete transaction history ─────────────────────────────────────────────────────────

export function HistoryTransactions() {
  const exp = useExport();
  const summary = useFinanceSummary();
  const balances = useWalletBalances();
  const s = summary.data;
  const b = balances.data;
  const notYet = b ? toUSDTString(money(b.locked).plus(b.pending).plus(b.owed)) : null;
  return (
    <FinancePage
      href={`${FIN_BASE}/transactions`}
      title="Transaction history"
      sub="Every movement of your USDT balance in one ledger — deposits, withdrawals, Global Pool entries, prizes, rewards, refunds and fees. Export any period as CSV for your records or tax reporting."
      mobileSub="Every movement of your USDT balance, newest first. Times in UTC."
      onExport={exp.open}
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Card padding="m" className="gap-3">
            <div className="flex items-center justify-between">
              <span className="text-body-s text-text-secondary">Total balance</span>
              <DemoBadge size="s" />
            </div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-number-l tabular-nums">{b ? num(b.total) : '—'}</span>
              <span className="text-body-s text-text-tertiary">USDT</span>
            </p>
            {b && (
              <>
                <div
                  className="flex h-1.5 overflow-hidden rounded-full bg-surface-raised"
                  aria-hidden
                >
                  {(['available', 'locked', 'pending', 'owed'] as const).map((k) => (
                    <span
                      key={k}
                      className={cn(
                        k === 'available' && 'bg-balance-available',
                        k === 'locked' && 'bg-balance-locked',
                        k === 'pending' && 'bg-balance-pending',
                        k === 'owed' && 'bg-balance-owed',
                      )}
                      style={{
                        width: `${gt(b.total, 0) ? Number(money(b[k]).div(b.total).times(100).toFixed(2)) : 0}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-col">
                  <KV
                    label="Available"
                    value={`${num(b.available)} USDT`}
                    valueClassName="text-balance-available"
                    demo={false}
                  />
                  <KV label="Locked" value={`${num(b.locked)} USDT`} demo={false} />
                  <KV label="Pending" value={`${num(b.pending)} USDT`} demo={false} />
                  <KV label="Owed" value={`${num(b.owed)} USDT`} demo={false} divider={false} />
                </div>
              </>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Kpi
              label="Deposits · lifetime"
              value={s ? num(s.deposits.lifetime) : '—'}
              loading={summary.isPending}
              caption={
                s &&
                `${formatCount(s.deposits.count)} credited · ${s.deposits.pendingCount} pending (${num(s.deposits.pending)})`
              }
            />
            <Kpi
              label="Withdrawals · lifetime"
              value={s ? num(s.withdrawals.lifetime) : '—'}
              loading={summary.isPending}
              caption={
                s &&
                `${s.withdrawals.completedCount} completed · ${s.withdrawals.openCount} open (${num(s.withdrawals.open)})`
              }
            />
            <Kpi
              label="Rewards · lifetime"
              value={s ? num(s.rewards.lifetime) : '—'}
              loading={summary.isPending}
              caption="VIP, rakeback, cashback, tournaments"
            />
            <Kpi
              label="Platform fees · lifetime"
              value={s ? num(s.fees.platformLifetime) : '—'}
              loading={summary.isPending}
              caption={s && `${formatCount(s.fees.entriesLifetime)} qualifying entries × 0.05`}
            />
          </div>
        </div>
        {notYet && <p className="sr-only">Not yet available: {num(notYet)} USDT</p>}
        <TxList
          allowTypeFilter
          caption="All transactions"
          emptyTitle="No transactions yet"
          emptyText="Deposits, entries, prizes and withdrawals will appear here."
          emptyAction={
            <LinkButton href="/wallet/deposit" variant="primary">
              Make a deposit
            </LinkButton>
          }
          onExport={exp.open}
        />
      </div>
      {exp.dialog}
    </FinancePage>
  );
}

// ── F1 · Deposits ─────────────────────────────────────────────────────────────────────────────

export function HistoryDeposits() {
  const exp = useExport(['deposit']);
  const summary = useFinanceSummary();
  const s = summary.data;
  return (
    <FinancePage
      href={`${FIN_BASE}/deposits`}
      title="Deposits"
      sub="Test-USDT you sent to your personal deposit address. Deposits are credited after the required network confirmations. GLOBAL POOL charges no deposit fee."
      mobileSub="Credited after the required confirmations. No deposit fee."
      onExport={exp.open}
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <Kpi
            label="Deposited · lifetime"
            value={s ? num(s.deposits.lifetime) : '—'}
            loading={summary.isPending}
            caption={s && `${formatCount(s.deposits.count)} credited`}
          />
          <Kpi
            label="This week"
            value={s ? num(s.deposits.thisWeek) : '—'}
            loading={summary.isPending}
            caption="Counts toward your weekly deposit limit"
          />
          <Kpi
            label="Confirming"
            value={s ? num(s.deposits.pending) : '—'}
            loading={summary.isPending}
            tone="text-balance-pending"
            caption={
              s &&
              `${s.deposits.pendingCount} deposit${s.deposits.pendingCount === 1 ? '' : 's'} waiting for confirmations`
            }
          />
        </div>
        <TxList
          types={['deposit']}
          caption="Deposits"
          emptyTitle="No deposits yet"
          emptyText="Your first deposit will show here with its confirmations. This is a DEMO / testnet account — only test-USDT is used."
          emptyAction={
            <LinkButton href="/wallet/deposit" variant="primary">
              Deposit test-USDT
            </LinkButton>
          }
          onExport={exp.open}
        />
      </div>
      {exp.dialog}
    </FinancePage>
  );
}

// ── F2 · Withdrawals ──────────────────────────────────────────────────────────────────────────

export function HistoryWithdrawals() {
  const exp = useExport(['withdrawal']);
  const summary = useFinanceSummary();
  const open = useHistoryTransactions({
    types: ['withdrawal'],
    status: 'under_review',
    pageSize: 3,
  });
  const s = summary.data;
  return (
    <FinancePage
      href={`${FIN_BASE}/withdrawals`}
      title="Withdrawals"
      sub="Sent only to your whitelisted addresses. GLOBAL POOL charges no withdrawal fee; the network fee is shown before you confirm."
      onExport={exp.open}
    >
      <div className="flex flex-col gap-6">
        {open.data?.items.map((w) => (
          <WithdrawalTracker key={w.uuid} w={w} />
        ))}
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <Kpi
            label="Withdrawn · lifetime"
            value={s ? num(s.withdrawals.lifetime) : '—'}
            loading={summary.isPending}
            caption={s && `${s.withdrawals.completedCount} completed`}
          />
          <Card padding="m" className="gap-2">
            <div className="flex items-center justify-between">
              <span className="text-body-s text-text-secondary">Daily limit used</span>
              <DemoBadge size="s" />
            </div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-number-l tabular-nums">
                {s ? num(s.withdrawals.usedToday) : '—'}
              </span>
              <span className="text-body-s text-text-tertiary">USDT</span>
            </p>
            {s && (
              <>
                <Meter
                  value={
                    gt(s.withdrawals.dailyLimit, 0)
                      ? Math.min(
                          1,
                          Number(
                            money(s.withdrawals.usedToday).div(s.withdrawals.dailyLimit).toFixed(4),
                          ),
                        )
                      : 0
                  }
                  label="Daily withdrawal limit used"
                />
                <p className="text-caption text-text-tertiary">
                  of {num(s.withdrawals.dailyLimit)} USDT · set by your KYC level · resets 00:00 UTC
                </p>
              </>
            )}
          </Card>
        </div>
        <TxList
          types={['withdrawal']}
          caption="Withdrawals"
          emptyTitle="No withdrawals yet"
          emptyText="Withdrawals are sent only to whitelisted addresses and are never blocked by responsible-gaming tools."
          emptyAction={<LinkButton href="/wallet/withdraw">Withdraw</LinkButton>}
          onExport={exp.open}
        />
      </div>
      {exp.dialog}
    </FinancePage>
  );
}

function WithdrawalTracker({ w }: { w: TxView }) {
  const steps: [string, 'done' | 'now' | 'todo'][] = [
    ['Risk check · automatic screening', 'done'],
    ['2FA confirmed · submitted', 'done'],
    ['Manual AML review', 'now'],
    ['Sent on-chain · confirmations', 'todo'],
    ['Completed', 'todo'],
  ];
  return (
    <Card padding="l" className="gap-4 border-border-default">
      <div className="flex items-start gap-3">
        <IconTile icon={Hourglass} tone="pending" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-label-l">{w.id} is under review</h2>
          <p className="text-caption text-text-tertiary">
            {num(w.amount)} USDT → {w.addressDisplay ?? '—'} · {w.network}
          </p>
        </div>
        {w.isDemo && <DemoBadge size="xs" />}
      </div>
      {w.statusDetail && (
        <p className="text-body-s text-text-secondary">
          {w.statusDetail}. The amount stays Locked until it is sent.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <div className="rounded-md bg-surface-raised px-3">
          <KV label="Amount" value={`${num(w.amount)} USDT`} demo={false} />
          <KV
            label={`Network fee · ${w.network ?? ''}`}
            value={`−${num(w.networkFee)} USDT`}
            demo={false}
          />
          <KV label="Platform fee" value="0.00 USDT" demo={false} />
          <KV label="You receive" value={`${num(w.netAmount)} USDT`} demo={false} divider={false} />
        </div>
        <ol className="flex flex-col gap-2" aria-label="Withdrawal progress">
          {steps.map(([label, s]) => (
            <li key={label} className="flex items-center gap-2 text-body-s">
              {s === 'done' ? (
                <CircleCheck aria-hidden className="size-4 text-text-success" />
              ) : s === 'now' ? (
                <Loader
                  aria-hidden
                  className="size-4 text-status-pending motion-safe:animate-spin"
                />
              ) : (
                <Clock aria-hidden className="size-4 text-icon-muted" />
              )}
              <span className={s === 'todo' ? 'text-text-tertiary' : 'text-text-primary'}>
                {label}
              </span>
              <span className="sr-only">
                {s === 'done' ? '(done)' : s === 'now' ? '(in progress)' : '(next)'}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/wallet/withdraw/${encodeURIComponent(w.id)}`}>Track</LinkButton>
      </div>
      <p className="text-caption text-text-tertiary">
        You can cancel until it is broadcast. Times in UTC.
      </p>
    </Card>
  );
}

// ── F3 · Fees ─────────────────────────────────────────────────────────────────────────────────

export function HistoryFees() {
  const exp = useExport(['entry_purchase', 'withdrawal']);
  const summary = useFinanceSummary();
  const [page, setPage] = React.useState(1);
  const lines = useFeeLines(page);
  const s = summary.data;
  return (
    <FinancePage
      href={`${FIN_BASE}/fees`}
      title="Fees"
      sub="The only platform fee is 0.05 USDT per qualifying Global Pool entry. Deposits and withdrawals carry no platform fee; network fees go to the blockchain."
      onExport={exp.open}
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 laptop:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Card padding="l" className="gap-3">
            <div className="flex items-center justify-between">
              <span className="text-overline text-text-tertiary uppercase">
                Platform fees paid · lifetime
              </span>
              <DemoBadge size="xs" />
            </div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-number-l tabular-nums">
                {s ? num(s.fees.platformLifetime) : '—'}
              </span>
              <span className="text-body-m-strong text-text-secondary">USDT</span>
            </p>
            {s && (
              <div className="flex flex-wrap items-center gap-2" aria-label="Fee equation">
                <Term v={formatCount(s.fees.entriesLifetime)} l="entries" />
                <span className="text-text-tertiary">×</span>
                <Term v="0.05" l="USDT each" />
                <span className="text-text-tertiary">=</span>
                <Term v={num(s.fees.platformLifetime)} l="USDT" hl />
              </div>
            )}
            <p className="text-caption text-text-secondary">
              Always shown as its own line before you confirm. Never added to the prize pool.
            </p>
          </Card>
          <Kpi
            label={
              s?.fees.currentRound
                ? `Round #${formatCount(s.fees.currentRound.number)}`
                : 'Current round'
            }
            value={s?.fees.currentRound ? num(s.fees.currentRound.platformFee) : '0.00'}
            loading={summary.isPending}
            caption={
              s?.fees.currentRound
                ? `${s.fees.currentRound.entries} × 0.05 · in progress`
                : 'No entries in the open round'
            }
          />
          <Kpi
            label="Last 30 days"
            value={s ? num(s.fees.platformLast30d) : '—'}
            loading={summary.isPending}
            caption={
              s &&
              `${formatCount(s.fees.entriesLast30d)} entries × 0.05 · network fees lifetime ${num(s.fees.networkLifetime)}`
            }
          />
        </div>
        <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-[minmax(0,1fr)_360px]">
          <Card padding="none" className="gap-0">
            <h2 className="border-b border-border-subtle px-4 py-3 text-h5">Fee lines</h2>
            {lines.isPending ? (
              <div className="p-4">
                <ListSkeleton />
              </div>
            ) : lines.isError ? (
              <div className="p-4">
                <QueryError error={lines.error} onRetry={() => void lines.refetch()} />
              </div>
            ) : lines.data.items.length === 0 ? (
              <div className="p-4">
                <EmptyCard
                  title="No fees yet"
                  description="Platform fees appear here when you buy Global Pool entries."
                />
              </div>
            ) : (
              <ul>
                {lines.data.items.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 border-b border-border-subtle px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-s-strong">{f.title}</span>
                      <span className="text-caption text-text-tertiary">
                        {f.detail} · {dateTime(f.createdAt)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'hidden rounded-full px-2 py-0.5 text-label-s tablet:inline',
                        f.status === 'round_cancelled'
                          ? 'bg-surface-raised text-text-secondary'
                          : f.status === 'reserved'
                            ? 'bg-status-pending-tint text-status-pending'
                            : 'bg-status-success-tint text-text-success',
                      )}
                    >
                      {f.status === 'round_cancelled'
                        ? 'Round cancelled · not refunded'
                        : f.status === 'reserved'
                          ? 'Reserved'
                          : 'Charged'}
                    </span>
                    <span className="text-number-s whitespace-nowrap text-text-danger tabular-nums">
                      −{num(f.amount)}
                    </span>
                    {f.isDemo && <DemoBadge size="xs" />}
                  </li>
                ))}
              </ul>
            )}
            {lines.data && (
              <div className="p-4">
                <Pager
                  page={page}
                  totalPages={lines.data.totalPages}
                  total={lines.data.total}
                  pageSize={10}
                  onPage={setPage}
                  noun="fee lines"
                />
              </div>
            )}
          </Card>
          <Card padding="l" className="gap-0">
            <h2 className="pb-2 text-h5">Fee schedule</h2>
            <KV label="Global Pool entry" value="10.00 · 100% to pool" demo={false} />
            <KV
              label="Platform fee"
              value="0.05 per entry"
              valueClassName="text-text-brand"
              demo={false}
            />
            <KV label="Deposits" value="0.00" demo={false} />
            <KV label="Withdrawals" value="0.00 + network fee" demo={false} />
            <KV
              label="Originals & table games"
              value="No per-bet fee"
              demo={false}
              divider={false}
            />
            <p className="pt-3 text-caption text-text-tertiary">
              Network fees are paid to the blockchain and shown before you confirm. House edge is
              disclosed on every game. Platform fees on a cancelled round are not refunded under the
              current round rules.
            </p>
          </Card>
        </div>
      </div>
      {exp.dialog}
    </FinancePage>
  );
}

function Term({ v, l, hl }: { v: string; l: string; hl?: boolean }) {
  return (
    <span
      className={cn(
        'flex flex-col rounded-md px-2.5 py-1.5',
        hl ? 'bg-brand-tint' : 'bg-surface-raised',
      )}
    >
      <span
        className={cn('text-number-s tabular-nums', hl ? 'text-text-brand' : 'text-text-primary')}
      >
        {v}
      </span>
      <span className="text-caption text-text-tertiary">{l}</span>
    </span>
  );
}

// ── F4 · Rewards ──────────────────────────────────────────────────────────────────────────────

function useClaimOwed() {
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const key = React.useRef(newIdempotencyKey());
  const claim = async () => {
    setBusy(true);
    try {
      const r = await historyApi.claimOwed(key.current);
      key.current = newIdempotencyKey();
      toast({
        type: 'success',
        title: 'Moved to Available',
        description: `${num(r.claimed)} USDT is now available.`,
      });
      void qc.invalidateQueries({ queryKey: ['history'] });
    } catch (e) {
      toast({
        type: 'error',
        title: 'Could not claim',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };
  return { claim, busy };
}

export function HistoryRewards() {
  const exp = useExport(['reward']);
  const summary = useFinanceSummary();
  const owed = useHistoryTransactions({
    types: ['reward', 'rakeback', 'cashback'],
    status: 'pending',
    pageSize: 5,
  });
  const s = summary.data;
  const { claim, busy } = useClaimOwed();
  return (
    <FinancePage
      href={`${FIN_BASE}/rewards`}
      title="Rewards"
      sub="What you earned, how it was paid and what is still waiting. Rewards never change odds, outcomes or your limits."
      onExport={exp.open}
    >
      <div className="flex flex-col gap-6">
        {owed.data?.items.map((r) => (
          <Card key={r.uuid} padding="l" className="gap-4 border-border-gold">
            <div className="flex items-center gap-3">
              <IconTile icon={Crown} tone="gold" />
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-label-l">{r.description}</h2>
                <p className="text-caption text-text-tertiary">{r.statusDetail}</p>
              </div>
              <span className="flex flex-col items-end">
                <span className="text-number-m text-text-gold tabular-nums">{num(r.amount)}</span>
                <span className="text-caption text-text-tertiary">USDT · Owed</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="l" loading={busy} onClick={() => void claim()}>
                Move everything owed to Available
              </Button>
              {r.isDemo && <DemoBadge size="xs" />}
            </div>
            <p className="text-caption text-text-secondary">
              Not claimed? Owed rewards settle to Available automatically — you never lose them.
              Claiming moves every owed amount (rewards, refunds, prizes) at once.
            </p>
          </Card>
        ))}
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <Kpi
            label="Earned · lifetime"
            value={s ? num(s.rewards.lifetime) : '—'}
            loading={summary.isPending}
            caption={s && `${s.rewards.count} cash rewards`}
          />
          <Kpi
            label="Owed now"
            value={s ? num(s.rewards.owed) : '—'}
            loading={summary.isPending}
            tone="text-balance-owed"
            caption={s && `${s.rewards.owedCount} waiting to settle`}
          />
        </div>
        <TxList
          types={['reward', 'rakeback', 'cashback', 'referral_commission']}
          caption="Rewards"
          emptyTitle="No rewards yet"
          emptyText="VIP rewards, rakeback and cashback appear here. Terms apply to every promotion."
          onExport={exp.open}
        />
        <p className="text-caption text-text-tertiary">
          Lifetime total counts cash rewards. Bonus funds must be wagered before they can be
          withdrawn; Global Pool entries contribute 0%. Terms apply to every promotion.
        </p>
      </div>
      {exp.dialog}
    </FinancePage>
  );
}

// ── F5 · Refunds ──────────────────────────────────────────────────────────────────────────────

export function HistoryRefunds() {
  const exp = useExport(['refund']);
  const summary = useFinanceSummary();
  const owed = useHistoryTransactions({ types: ['refund'], status: 'pending', pageSize: 5 });
  const s = summary.data;
  const { claim, busy } = useClaimOwed();
  return (
    <FinancePage
      href={`${FIN_BASE}/refunds`}
      title="Refunds"
      sub="Money returned when a Global Pool round is cancelled, following the round rules. Nobody at GLOBAL POOL can change or hold back a refund."
      onExport={exp.open}
    >
      <div className="flex flex-col gap-6">
        {owed.data?.items.map((r) => (
          <Card key={r.uuid} padding="l" className="gap-4">
            <div className="flex items-center gap-3">
              <IconTile icon={RotateCcw} tone="info" />
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-label-l">
                  {r.roundNumber ? `Round #${formatCount(r.roundNumber)} refund` : 'Refund'}
                </h2>
                <p className="truncate font-mono text-mono-s text-text-tertiary">{r.description}</p>
              </div>
              <span className="flex flex-col items-end">
                <span className="text-number-m text-balance-owed tabular-nums">
                  {num(r.amount)}
                </span>
                <span className="text-caption text-text-tertiary">USDT · Owed</span>
              </span>
            </div>
            <ol className="flex flex-col gap-2.5" aria-label="Refund progress">
              <RefundStep
                done
                title="Round closed below threshold"
                sub="Not enough participants or pool at close"
              />
              <RefundStep
                done
                title="Round cancelled — no draw requested"
                sub={`Entry amounts returned to Owed · ${dateTime(r.createdAt)}`}
              />
              <RefundStep
                title="Move to Available"
                sub="Claim now, or it settles automatically — nothing is ever lost"
              />
            </ol>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="l" loading={busy} onClick={() => void claim()}>
                Move everything owed to Available
              </Button>
              {r.isDemo && <DemoBadge size="xs" />}
            </div>
          </Card>
        ))}
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <Kpi
            label="Refund owed"
            value={s ? num(s.refunds.owed) : '—'}
            tone="text-balance-owed"
            loading={summary.isPending}
            caption={
              s && `${s.refunds.owedCount} refund${s.refunds.owedCount === 1 ? '' : 's'} waiting`
            }
          />
          <Kpi
            label="Refunded · lifetime"
            value={s ? num(s.refunds.lifetime) : '—'}
            loading={summary.isPending}
            caption={s && `${s.refunds.count} refund${s.refunds.count === 1 ? '' : 's'}`}
          />
        </div>
        <TxList
          types={['refund']}
          caption="Refunds"
          emptyTitle="No refunds"
          emptyText="If a round is cancelled, your entry amounts come back here automatically."
          onExport={exp.open}
        />
        <Card padding="l" className="gap-3">
          <h2 className="text-h5">How refunds work</h2>
          {[
            'A round that misses its participant or pool threshold at close is cancelled.',
            'No randomness is requested and no winners are drawn.',
            'Entry amounts return from the round pool to Owed, then to Available when claimed or settled.',
            'Under the current round rules the 0.05 USDT platform fee per entry is not refunded.',
          ].map((t, i) => (
            <div key={t} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-info-tint text-caption text-text-info">
                {i + 1}
              </span>
              <p className="text-body-s text-text-secondary">{t}</p>
            </div>
          ))}
        </Card>
        <NoteBox icon={ShieldAlert} tone="info">
          Refunds follow the round rules recorded when the round opened — admins cannot withhold,
          change or redirect them.
        </NoteBox>
      </div>
      {exp.dialog}
    </FinancePage>
  );
}

function RefundStep({ done, title, sub }: { done?: boolean; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
      ) : (
        <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
      )}
      <span className="flex flex-col">
        <span className={cn('text-body-s-strong', !done && 'text-text-tertiary')}>{title}</span>
        <span className="text-caption text-text-tertiary">{sub}</span>
      </span>
    </li>
  );
}
