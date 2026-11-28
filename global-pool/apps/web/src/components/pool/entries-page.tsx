'use client';

import { formatCount, formatDateUTC, formatRoundNumber, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { ArrowRight, ChevronLeft, ChevronRight, Download, Shield, Wallet } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AgeBadge, StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { EntryHistoryItem, EntryResultKind } from '@/lib/api/pool';
import { cn } from '@/lib/utils';

import {
  KV,
  LicenceStrip,
  Meter,
  POOL_ROUTES,
  PoolPageHeader,
  PoolTabs,
  QueryError,
  cardCls,
} from './parts';
import { Chip } from './history-page';
import { useEntryHistory, useViewer, useViewerRg } from './use-pool';

const RESULT: Record<EntryResultKind, { badge: BadgeStatus; label: string }> = {
  in_draw: { badge: 'pending', label: 'In the draw' },
  drawing: { badge: 'processing', label: 'Drawing' },
  won: { badge: 'approved', label: 'Won' },
  not_selected: { badge: 'neutral', label: 'Not selected' },
  refund_owed: { badge: 'pending', label: 'Refund owed' },
  refunded: { badge: 'confirmed', label: 'Refunded' },
};
const PAGE_SIZE = 10;

/** GP-10 Entry history: every purchase, what it cost (entries + separate platform fee) and what happened to it. */
export function EntriesPage() {
  const { auth, member, loading } = useViewer();
  const [page, setPage] = React.useState(1);
  const q = useEntryHistory(page, PAGE_SIZE);
  const rg = useViewerRg();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<'all' | 'active' | 'won' | 'not_selected' | 'refunds'>(
    'all',
  );
  const items = (q.data?.items ?? []).filter((i) =>
    kind === 'all'
      ? true
      : kind === 'active'
        ? i.result.kind === 'in_draw' || i.result.kind === 'drawing'
        : kind === 'refunds'
          ? i.result.kind === 'refund_owed' || i.result.kind === 'refunded'
          : i.result.kind === kind,
  );
  const current = items.find((i) => i.transactionId === selected) ?? items[0] ?? null;
  const s = q.data?.summary;
  const demo = items.some((i) => i.isDemo);
  const participation = rg.data?.limits.find((l) => l.type === 'participation' && l.limit !== null);

  const exportCsv = () => {
    const rows = [
      [
        'reference',
        'round',
        'purchased_utc',
        'entries',
        'first_entry',
        'last_entry',
        'entries_usdt',
        'platform_fee_usdt',
        'network_fee_usdt',
        'total_usdt',
        'result',
        'prize_usdt',
        'refund_usdt',
        'demo',
      ],
      ...items.map((i) => [
        i.reference,
        i.roundNumber,
        i.purchasedAt,
        i.entries,
        i.firstEntryId ?? '',
        i.lastEntryId ?? '',
        i.entryAmount,
        i.platformFee,
        i.networkFee,
        i.total,
        i.result.kind,
        i.result.prize ?? '',
        i.result.refund ?? '',
        i.isDemo,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-pool-entries-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const header = (
    <>
      <PoolPageHeader
        crumbs={[
          { label: 'Lobby', href: '/' },
          { label: 'Global Pool', href: POOL_ROUTES.hub },
          { label: 'My entries' },
        ]}
        title="Entry history"
        badges={demo ? <DemoBadge size="s" /> : undefined}
        description="Every entry you bought, what you paid for it and what happened to it. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee and is paid from your platform balance."
        actions={
          member ? (
            <>
              <Button
                variant="secondary"
                leadingIcon={<Download aria-hidden />}
                onClick={exportCsv}
                disabled={!items.length}
              >
                Export CSV
              </Button>
              <Button variant="ghost" asChild leadingIcon={<Shield aria-hidden />}>
                <Link href={POOL_ROUTES.rg}>Set a participation limit</Link>
              </Button>
            </>
          ) : undefined
        }
      />
      <PoolTabs active="entries" entries={s?.activeEntries} />
    </>
  );

  if (!member) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className={cardCls}>
          {loading ? (
            <Skeleton className="m-6 h-40" />
          ) : (
            <EmptyState
              title="Sign in to see your entries"
              description="Your purchases, entry IDs, fees and results are listed here once you are signed in."
              actions={
                <Button
                  variant="primary"
                  leadingIcon={<Wallet aria-hidden />}
                  onClick={() =>
                    auth.openAuth
                      ? auth.openAuth('sign-in', { next: POOL_ROUTES.entries })
                      : auth.signIn()
                  }
                >
                  Sign in / connect wallet
                </Button>
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {header}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
        <Stat
          label="Qualifying entries · lifetime"
          value={s ? formatCount(s.qualifyingEntries) : '—'}
          hint={s ? `${formatCount(s.activeEntries)} in the draw now` : ''}
          demo={demo}
        />
        <Stat
          label="Platform fees paid · lifetime"
          value={s ? formatUSDT(s.platformFeesPaid, { symbol: false }) : '—'}
          hint="Never added to a pool"
          demo={demo}
        />
        <Stat
          label="Prizes won · lifetime"
          value={s ? formatUSDT(s.prizesWon, { symbol: false }) : '—'}
          hint="Credited to Owed at settlement"
          demo={demo}
          tone={s && money(s.prizesWon).gt(0) ? 'text-text-success' : undefined}
        />
        <Stat
          label="Refund owed"
          value={s ? formatUSDT(s.refundOwed, { symbol: false }) : '—'}
          hint="Stakes from cancelled rounds"
          demo={demo}
          tone={s && money(s.refundOwed).gt(0) ? 'text-text-warning' : undefined}
        />
      </section>

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:px-0"
        role="group"
        aria-label="Result"
      >
        {(
          [
            ['all', 'All'],
            ['active', 'In the draw'],
            ['won', 'Won'],
            ['not_selected', 'Not selected'],
            ['refunds', 'Refunds'],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} selected={kind === id} onClick={() => setKind(id)}>
            {label}
          </Chip>
        ))}
      </div>

      {q.isPending ? (
        <div className={cn(cardCls, 'flex flex-col gap-2 p-4')} aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        <div className={cardCls}>
          {kind !== 'all' && (q.data?.items.length ?? 0) > 0 ? (
            <EmptyState
              type="no-results"
              title="No purchases on this page match the filter"
              actions={
                <Button variant="secondary" onClick={() => setKind('all')}>
                  Show all
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No entries yet"
              description="When you buy entries in a Global Pool round they appear here with their IDs, fees and result."
              actions={
                <Button variant="gold" asChild>
                  <Link href={POOL_ROUTES.hub}>Go to Global Pool</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className={cn(cardCls, 'hidden overflow-hidden tablet:block')}>
              <table className="w-full text-body-s">
                <caption className="sr-only">Your entry purchases</caption>
                <thead className="bg-bg-secondary/60 text-left text-caption text-text-tertiary">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Bought
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Round
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Entries
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Paid
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr
                      key={i.transactionId}
                      className={cn(
                        'border-t border-border-subtle align-top',
                        current?.transactionId === i.transactionId && 'bg-surface-hover/50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(i.transactionId)}
                          aria-pressed={current?.transactionId === i.transactionId}
                          className="flex min-h-11 flex-col items-start text-left"
                        >
                          <span className="text-label-m whitespace-nowrap text-text-primary">
                            {formatDateUTC(i.purchasedAt)}
                          </span>
                          <span className="text-caption text-text-tertiary">
                            {formatTimeUTC(i.purchasedAt)}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={POOL_ROUTES.round(i.roundNumber)}
                          className="text-label-m text-text-primary hover:underline"
                        >
                          {formatRoundNumber(i.roundNumber)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-label-m text-text-primary">
                          {formatCount(i.entries)} entries
                        </span>
                        {i.firstEntryId && (
                          <span className="font-mono text-mono-s text-text-tertiary">
                            {i.firstEntryId} … {i.lastEntryId?.split('-').at(-1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="block text-label-m whitespace-nowrap text-text-primary tabular-nums">
                          {formatUSDT(i.total)}
                        </span>
                        <span className="text-caption text-text-tertiary">
                          {i.entryAmount} + {i.platformFee} fee
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <StatusBadge
                            status={RESULT[i.result.kind].badge}
                            label={RESULT[i.result.kind].label}
                          />
                          {i.isDemo && <DemoBadge size="xs" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ResultValue item={i} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-3 tablet:hidden">
              {items.map((i) => (
                <li key={i.transactionId} className={cn(cardCls, 'flex flex-col gap-2 p-4')}>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={POOL_ROUTES.round(i.roundNumber)}
                      className="text-label-l text-text-primary"
                    >
                      Round {formatRoundNumber(i.roundNumber)}
                    </Link>
                    <StatusBadge
                      status={RESULT[i.result.kind].badge}
                      label={RESULT[i.result.kind].label}
                    />
                  </div>
                  <p className="text-caption text-text-tertiary">
                    {formatDateUTC(i.purchasedAt)}, {formatTimeUTC(i.purchasedAt)} ·{' '}
                    {formatCount(i.entries)} entries
                  </p>
                  {i.firstEntryId && (
                    <p className="font-mono text-mono-s break-all text-text-secondary">
                      {i.firstEntryId} … {i.lastEntryId?.split('-').at(-1)}
                    </p>
                  )}
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-caption text-text-tertiary">
                      Paid{' '}
                      <span className="text-label-m text-text-primary">{formatUSDT(i.total)}</span>
                      <br />
                      {i.entryAmount} + {i.platformFee} fee
                    </span>
                    <ResultValue item={i} />
                  </div>
                </li>
              ))}
            </ul>
            <nav
              aria-label="Pagination"
              className="flex flex-col items-center justify-between gap-3 tablet:flex-row"
            >
              <p className="text-caption text-text-tertiary">
                Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + items.length} of{' '}
                {formatCount(q.data.total)} purchases
                {s ? ` (${formatCount(s.qualifyingEntries)} qualifying entries)` : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="m"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  leadingIcon={<ChevronLeft aria-hidden />}
                >
                  Newer
                </Button>
                <Button
                  variant="secondary"
                  size="m"
                  disabled={page >= q.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  trailingIcon={<ChevronRight aria-hidden />}
                >
                  Older
                </Button>
              </div>
            </nav>
          </div>
          {current && <PurchaseDetail item={current} />}
        </div>
      )}

      <section
        aria-label="Participation limit"
        className={cn(
          cardCls,
          'flex flex-col gap-4 p-5 tablet:flex-row tablet:items-center tablet:justify-between tablet:p-6',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="flex items-center gap-2 text-label-l text-text-primary">
            <Shield aria-hidden className="size-4 text-icon-brand" /> Daily participation limit
          </p>
          {participation ? (
            <>
              <p className="text-body-s text-text-secondary">
                {formatUSDT(participation.used ?? '0', { symbol: false })} of{' '}
                {formatUSDT(participation.limit!)} used today · resets 00:00 UTC
              </p>
              <Meter
                value={money(participation.used ?? '0')
                  .div(participation.limit!)
                  .toNumber()}
                label="Daily participation limit used"
                className="max-w-md"
              />
            </>
          ) : (
            <p className="text-body-s text-text-secondary">
              No participation limit set. You can set one at any time — decreases apply immediately.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AgeBadge />
          <Button variant="secondary" asChild>
            <Link href={POOL_ROUTES.rg}>{participation ? 'Change limit' : 'Set a limit'}</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`${POOL_ROUTES.rg}#take-a-break`}>Take a break</Link>
          </Button>
        </div>
      </section>
      <LicenceStrip />
    </div>
  );
}

function ResultValue({ item }: { item: EntryHistoryItem }) {
  const r = item.result;
  if (r.kind === 'won')
    return (
      <span className="text-label-m text-text-success tabular-nums">
        +{formatUSDT(r.prize ?? '0')}
      </span>
    );
  if (r.kind === 'refund_owed' || r.kind === 'refunded')
    return (
      <span className="flex flex-col items-end">
        <span className="text-label-m text-text-warning tabular-nums">
          +{formatUSDT(r.refund ?? '0')}
        </span>
        <span className="text-caption text-text-tertiary">
          stake {r.kind === 'refund_owed' ? 'owed' : 'refunded'} · fee kept
        </span>
      </span>
    );
  if (r.kind === 'not_selected') return <span className="text-caption text-text-tertiary">—</span>;
  return (
    <span className="text-caption text-text-tertiary">
      Draws {formatTimeUTC(item.roundClosesAt)}
    </span>
  );
}

function PurchaseDetail({ item }: { item: EntryHistoryItem }) {
  return (
    <aside
      aria-label="Purchase receipt"
      className={cn(
        cardCls,
        'flex h-fit flex-col gap-4 p-5 laptop:sticky laptop:top-[calc(var(--gp-shell-top)+80px)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-overline text-text-tertiary uppercase">Purchase receipt</p>
          <p className="text-h5 text-text-primary">Round {formatRoundNumber(item.roundNumber)}</p>
        </div>
        {item.isDemo && <DemoBadge size="xs" />}
      </div>
      <dl className="flex flex-col gap-2.5">
        <KV
          label="Reference"
          value={<span className="font-mono text-mono-s">{item.reference}</span>}
        />
        <KV
          label="Bought"
          value={`${formatDateUTC(item.purchasedAt)}, ${formatTimeUTC(item.purchasedAt)}`}
        />
        <KV
          label="Entries"
          value={`${formatCount(item.entries)} × 10.00 = ${formatUSDT(item.entryAmount)}`}
        />
        <KV label="Platform fee" value={formatUSDT(item.platformFee)} />
        <KV label="Network fee" value={formatUSDT(item.networkFee)} />
        <KV label="Total paid" value={formatUSDT(item.total)} valueClassName="text-label-l" />
        <KV label="Paid from" value="Available balance" />
        {item.firstEntryId && (
          <KV
            label="Entry IDs"
            value={
              <span className="font-mono text-mono-s">
                {item.firstEntryId} … {item.lastEntryId?.split('-').at(-1)}
              </span>
            }
          />
        )}
        <KV label="Result" value={RESULT[item.result.kind].label} />
        {item.result.winningEntryIds.length > 0 && (
          <KV
            label="Winning entries"
            value={
              <span className="font-mono text-mono-s">
                {item.result.winningEntryIds.join(', ')}
              </span>
            }
          />
        )}
      </dl>
      <Button variant="secondary" asChild>
        <Link href={POOL_ROUTES.round(item.roundNumber)}>
          Round {formatRoundNumber(item.roundNumber)} <ArrowRight aria-hidden />
        </Link>
      </Button>
    </aside>
  );
}

function Stat({
  label,
  value,
  hint,
  demo,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  demo?: boolean;
  tone?: string;
}) {
  return (
    <div className={cn(cardCls, 'flex min-w-0 flex-col gap-1 p-4')}>
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        <span className="truncate">{label}</span>
        {demo && <DemoBadge size="xs" />}
      </p>
      <p className={cn('truncate text-number-m text-text-primary tabular-nums', tone)}>{value}</p>
      <p className="truncate text-caption text-text-tertiary">{hint}</p>
    </div>
  );
}
