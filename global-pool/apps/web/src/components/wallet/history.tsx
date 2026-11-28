'use client';

import { CHAIN_DISPLAY_ORDER, CHAINS, type ChainKey } from '@gp/shared/chains';
import { TX_STATUS_LABEL, type TxStatus, type TxType } from '@gp/shared/enums';
import { ENTRY_PRICE, PLATFORM_FEE_PER_ENTRY } from '@gp/shared/fees';
import { formatCount, formatDateUTC, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { Amount } from '@/components/domain/amount';
import { CountBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CellStack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLifetime, useTransactions, type TxQuery, type TxView } from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

import { ResponsiveModal } from './responsive-modal';
import { TxDetailDrawer } from './tx-detail';
import { signedAmount, TxList, TxListSkeleton, txSubtitle, txTitle } from './tx-list';
import {
  QueryError,
  TxStatusBadge,
  WALLET_ROUTES,
  WalletPageHeader,
  WalletTabs,
} from './wallet-ui';

const TYPE_CHIPS: { value: TxType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'entry_purchase', label: 'Entries' },
  { value: 'refund', label: 'Refunds' },
  { value: 'prize', label: 'Prizes' },
  { value: 'reward', label: 'Rewards' },
];
const STATUSES: TxStatus[] = [
  'pending',
  'confirming',
  'under_review',
  'processing',
  'completed',
  'failed',
  'rejected',
  'cancelled',
];
const RANGES = [
  { value: 'all', label: 'All time', days: null },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
] as const;
type Range = (typeof RANGES)[number]['value'];
const PAGE_SIZE = 10;

interface Filters {
  type: TxType | 'all';
  status: TxStatus | 'all';
  network: ChainKey | 'all';
  range: Range;
  page: number;
}

function readFilters(sp: URLSearchParams): Filters {
  const type = sp.get('type');
  const status = sp.get('status');
  const network = sp.get('network');
  const range = sp.get('range');
  return {
    type: TYPE_CHIPS.some((c) => c.value === type) ? (type as TxType) : 'all',
    status: STATUSES.includes(status as TxStatus) ? (status as TxStatus) : 'all',
    network: CHAIN_DISPLAY_ORDER.includes(network as ChainKey) ? (network as ChainKey) : 'all',
    range: RANGES.some((r) => r.value === range) ? (range as Range) : 'all',
    page: Math.max(1, Number(sp.get('page')) || 1),
  };
}

/** Start of the range as an ISO timestamp, rounded to the minute so the query key stays stable. */
function rangeFrom(range: Range): string | undefined {
  const days = RANGES.find((r) => r.value === range)?.days;
  if (!days) return undefined;
  const ms = Math.floor(Date.now() / 60_000) * 60_000 - days * 86_400_000;
  return new Date(ms).toISOString();
}

/** WAL-20 Transaction history (filters, empty, no results, loading) + WAL-21 detail drawer via `?tx=`. */
export function WalletHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filters = readFilters(new URLSearchParams(sp.toString()));
  const selected = sp.get('tx');
  const [sheet, setSheet] = React.useState(false);

  const query: TxQuery = {
    page: filters.page,
    pageSize: PAGE_SIZE,
    type: filters.type === 'all' ? undefined : filters.type,
    status: filters.status === 'all' ? undefined : filters.status,
    network: filters.network === 'all' ? undefined : filters.network,
    from: rangeFrom(filters.range),
  };
  const tx = useTransactions(query);
  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.network !== 'all' ? 1 : 0) +
    (filters.range !== 'all' ? 1 : 0);
  const filtered = activeCount > 0 || filters.type !== 'all';

  const update = (patch: Partial<Filters & { tx: string | null }>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === 'all' || v === undefined || (k === 'page' && v === 1)) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in patch) && !('tx' in patch)) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const clear = () => router.replace(pathname, { scroll: false });

  const data = tx.data;
  return (
    <div className="flex flex-col gap-6">
      <WalletPageHeader
        title="Transaction history"
        description="Every deposit, withdrawal, entry, fee, refund and reward on your account — newest first. Times are UTC."
        actions={
          <Button
            asChild
            variant="secondary"
            leadingIcon={<ArrowDownToLine />}
            className="hidden tablet:inline-flex"
          >
            <Link href={WALLET_ROUTES.deposit}>Deposit</Link>
          </Button>
        }
      />
      <WalletTabs />
      <LifetimeTiles />

      <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center laptop:justify-between">
        <div
          role="group"
          aria-label="Transaction type"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 tablet:mx-0 tablet:flex-wrap tablet:px-0"
        >
          {TYPE_CHIPS.map((c) => {
            const on = filters.type === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={on}
                onClick={() => update({ type: c.value })}
                className={cn(
                  'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-label-m transition-colors tablet:h-9',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
                  on
                    ? 'border-border-brand bg-brand-tint text-text-brand'
                    : 'border-border-default bg-surface-default text-text-secondary hover:text-text-primary',
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <p className="hidden text-caption text-text-tertiary laptop:block">
          Showing {PAGE_SIZE} per page · newest first
        </p>
        <Button
          variant="secondary"
          className="tablet:hidden"
          leadingIcon={<SlidersHorizontal />}
          onClick={() => setSheet(true)}
          trailingIcon={
            activeCount > 0 ? <CountBadge count={activeCount} tone="brand" /> : undefined
          }
        >
          Filters
        </Button>
      </div>

      <Card radius="xl" padding="l" className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-s text-text-secondary" aria-live="polite">
            {data
              ? `${data.total} ${data.total === 1 ? 'transaction' : 'transactions'}`
              : 'Loading…'}
            {filtered && data ? ' match your filters' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 tablet:flex">
              <FilterFields filters={filters} update={update} compact />
              {activeCount > 0 && (
                <Button variant="ghost" size="s" leadingIcon={<X />} onClick={clear}>
                  Clear
                </Button>
              )}
            </div>
            <DemoBadge size="m" />
            {data && data.items.length > 0 && (
              <Button
                variant="secondary"
                size="s"
                leadingIcon={<Download />}
                onClick={() => exportCsv(data.items)}
              >
                Export CSV
              </Button>
            )}
          </div>
        </div>
        {tx.isPending ? (
          <TxListSkeleton rows={6} />
        ) : tx.isError ? (
          <QueryError error={tx.error} onRetry={() => void tx.refetch()} />
        ) : data && data.items.length === 0 ? (
          filtered ? (
            <EmptyState
              type="no-results"
              title="No transactions match these filters"
              description="Try another type, status, network or a longer date range."
              actions={
                <Button variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No transactions yet"
              description="Your deposits, withdrawals, entries and fees will appear here, each with its own receipt and timeline."
              actions={
                <Button asChild leadingIcon={<ArrowDownToLine />}>
                  <Link href={WALLET_ROUTES.deposit}>Make a deposit</Link>
                </Button>
              }
            />
          )
        ) : data ? (
          <>
            <TxList
              items={data.items}
              groupByDay
              selected={selected}
              onSelect={(t) => update({ tx: t.id, page: filters.page })}
              className={cn('laptop:hidden', tx.isFetching && 'opacity-70 transition-opacity')}
            />
            <TxTable
              items={data.items}
              selected={selected}
              onSelect={(t) => update({ tx: t.id, page: filters.page })}
              className={cn(
                'hidden laptop:block',
                tx.isFetching && 'opacity-70 transition-opacity',
              )}
            />
            {data.totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="s"
                  leadingIcon={<ChevronLeft />}
                  disabled={filters.page <= 1}
                  onClick={() => update({ page: filters.page - 1 })}
                >
                  Newer
                </Button>
                <span className="text-caption text-text-tertiary">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="s"
                  trailingIcon={<ChevronRight />}
                  disabled={filters.page >= data.totalPages}
                  onClick={() => update({ page: filters.page + 1 })}
                >
                  Older
                </Button>
              </nav>
            )}
          </>
        ) : null}
      </Card>

      <ResponsiveModal
        open={sheet}
        onOpenChange={setSheet}
        title="Filter transactions"
        footer={
          <>
            <Button variant="secondary" onClick={clear}>
              Clear all
            </Button>
            <Button onClick={() => setSheet(false)}>Show results</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FilterFields filters={filters} update={update} />
        </div>
      </ResponsiveModal>

      <TxDetailDrawer
        reference={selected}
        onOpenChange={(o) => !o && update({ tx: null, page: filters.page })}
      />
    </div>
  );
}

function FilterFields({
  filters,
  update,
  compact = false,
}: {
  filters: Filters;
  update: (p: Partial<Filters>) => void;
  compact?: boolean;
}) {
  const w = compact ? 'w-36' : 'w-full';
  return (
    <>
      <Field label="Status" hideLabel={compact} className={w}>
        <Select
          value={filters.status}
          onValueChange={(v) => update({ status: v as Filters['status'] })}
        >
          <SelectTrigger size={compact ? 'm' : 'l'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TX_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Network" hideLabel={compact} className={w}>
        <Select
          value={filters.network}
          onValueChange={(v) => update({ network: v as Filters['network'] })}
        >
          <SelectTrigger size={compact ? 'm' : 'l'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any network</SelectItem>
            {CHAIN_DISPLAY_ORDER.map((k) => (
              <SelectItem key={k} value={k}>
                {CHAINS[k].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Date" hideLabel={compact} className={w}>
        <Select value={filters.range} onValueChange={(v) => update({ range: v as Range })}>
          <SelectTrigger size={compact ? 'm' : 'l'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

function LifetimeTiles() {
  const l = useLifetime();
  const tiles = l.data
    ? [
        {
          label: 'Deposited',
          value: formatUSDT(l.data.deposits, { symbol: false }),
          hint: 'USDT · lifetime',
        },
        {
          label: 'Withdrawn',
          value: formatUSDT(l.data.withdrawals, { symbol: false }),
          hint: 'USDT · lifetime',
        },
        {
          label: 'Pool entries',
          value: formatCount(l.data.entries),
          hint: `entries · ${formatUSDT(money(l.data.entries).times(ENTRY_PRICE).toFixed(2), { symbol: false })} USDT`,
        },
        {
          label: 'Platform fees',
          value: formatUSDT(l.data.platformFeesPaid, { symbol: false }),
          hint: `USDT · ${formatCount(l.data.entries)} × ${PLATFORM_FEE_PER_ENTRY}`,
        },
        {
          label: 'Prizes & rewards',
          value: formatUSDT(l.data.rewards, { symbol: false }),
          hint: 'USDT · lifetime',
        },
      ]
    : null;
  // ERR-03: a failed request is never an endless row of skeleton tiles.
  if (!tiles && l.isError)
    return (
      <ErrorState
        variant="inline"
        error={l.error}
        onRetry={() => void l.refetch()}
        retrying={l.isFetching}
        what="your lifetime totals"
      />
    );
  return (
    <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 laptop:grid-cols-5">
      {(tiles ?? Array.from({ length: 5 }, () => null)).map((t, i) => (
        <li
          key={t?.label ?? i}
          className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface-default p-4"
        >
          {t ? (
            <>
              <span className="flex items-center justify-between gap-2 text-overline text-text-tertiary uppercase">
                {t.label}
                <DemoBadge size="xs" />
              </span>
              <span className="text-number-m text-text-primary tabular-nums">{t.value}</span>
              <span className="text-caption text-text-tertiary">{t.hint}</span>
            </>
          ) : (
            <>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Desktop table (Figma Table/Example Transactions): transaction · date · network · status · amount. */
function TxTable({
  items,
  selected,
  onSelect,
  className,
}: {
  items: TxView[];
  selected: string | null;
  onSelect: (t: TxView) => void;
  className?: string;
}) {
  return (
    <TableContainer className={className}>
      <Table>
        <caption className="sr-only">
          Transactions, newest first. Select a row to open its details.
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Status</TableHead>
            <TableHead align="right">Amount (USDT)</TableHead>
            <TableHead>
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => (
            <TableRow
              key={t.id}
              data-state={selected === t.id ? 'selected' : undefined}
              className={cn('cursor-pointer', selected === t.id && 'bg-surface-selected')}
              onClick={() => onSelect(t)}
            >
              <TableCell>
                <span className="flex max-w-[360px] flex-col">
                  <span className="text-body-s text-text-primary">{txTitle(t)}</span>
                  <span className="truncate text-caption text-text-tertiary" title={txSubtitle(t)}>
                    {txSubtitle(t)}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <CellStack
                  primary={formatDateUTC(t.createdAt)}
                  secondary={formatTimeUTC(t.createdAt)}
                />
              </TableCell>
              <TableCell>
                {t.network ? (
                  <span className="flex items-center gap-2">
                    <ChainMark chain={t.network} size={18} />
                    <CellStack
                      primary={CHAINS[t.network].name}
                      secondary={CHAINS[t.network].usdtStandard}
                    />
                  </span>
                ) : (
                  <CellStack primary="Platform balance" secondary="No network fee" />
                )}
              </TableCell>
              <TableCell>
                <TxStatusBadge status={t.status} type={t.type} />
              </TableCell>
              <TableCell align="right">
                <span className="inline-flex items-center gap-2">
                  <Amount
                    value={signedAmount(t)}
                    tone="signed"
                    className={cn(
                      'text-number-s',
                      t.direction === 'out' && t.status !== 'completed' && 'text-text-primary',
                    )}
                  />
                  {t.isDemo && <DemoBadge size="xs" />}
                </span>
              </TableCell>
              <TableCell align="right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(t);
                  }}
                  aria-label={`${txTitle(t)} ${t.id}, open details`}
                  className="inline-flex size-9 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover hover:text-icon-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** Export the rows on screen as CSV (decimal strings as-is — no float conversion). */
function exportCsv(items: TxView[]) {
  const head = [
    'reference',
    'type',
    'status',
    'direction',
    'network',
    'amount',
    'network_fee',
    'platform_fee',
    'net_amount',
    'created_at_utc',
    'demo',
  ];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = items.map((t) =>
    [
      t.id,
      t.type,
      t.status,
      t.direction,
      t.network ?? '',
      t.amount,
      t.networkFee ?? '',
      t.platformFee,
      t.netAmount,
      t.createdAt,
      String(t.isDemo),
    ]
      .map(esc)
      .join(','),
  );
  const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `globalpool_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
