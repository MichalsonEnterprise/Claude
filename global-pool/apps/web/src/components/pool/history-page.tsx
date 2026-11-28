'use client';

import type { RoundStatus } from '@gp/shared/enums';
import {
  formatCount,
  formatDateTimeUTC,
  formatRoundNumber,
  formatTimeUTC,
  formatWeekdayDateUTC,
} from '@gp/shared/format';
import { formatUSDT, money, sum, toUSDTString } from '@gp/shared/money';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import type { EntryHistoryItem, EntryResultKind, PoolRoundView } from '@/lib/api/pool';
import { cn } from '@/lib/utils';

import {
  LicenceStrip,
  POOL_ROUTES,
  PoolPageHeader,
  PoolTabs,
  QueryError,
  RoundStatusBadge,
  cardCls,
} from './parts';
import { useCurrentRound, useEntryHistory, useRounds, useViewer } from './use-pool';

type StatusFilter = 'all' | 'open' | 'settled' | 'cancelled' | 'drawing';
const FILTERS: { id: StatusFilter; label: string; statuses?: RoundStatus[] }[] = [
  { id: 'all', label: 'All rounds' },
  { id: 'open', label: 'Open', statuses: ['open'] },
  { id: 'settled', label: 'Settled', statuses: ['settled'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  { id: 'drawing', label: 'Drawing', statuses: ['closed', 'drawing'] },
];
const PAGE_SIZE = 10;

/** GP-08 Round history: every past round with its pool, result and proof; filters (status, round #, rounds I entered). */
export function HistoryPage() {
  const { member } = useViewer();
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [search, setSearch] = React.useState('');
  const [mineOnly, setMineOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const number = /^#?\s*[\d,]+$/.test(search.trim())
    ? Number(search.replace(/[#,\s]/g, ''))
    : undefined;
  const rounds = useRounds({
    page,
    pageSize: PAGE_SIZE,
    status: status === 'open' ? ['settled'] : FILTERS.find((f) => f.id === status)?.statuses,
    number,
  });
  const current = useCurrentRound();
  // GET /pool/rounds lists finished rounds; the open round (from /pool/rounds/current) leads page 1.
  const openRound =
    current.data &&
    current.data.status === 'open' &&
    page === 1 &&
    (number === undefined || number === current.data.number)
      ? current.data
      : null;
  const history = useEntryHistory(1, 100);
  const mineByRound = React.useMemo(() => {
    const m = new Map<number, EntryHistoryItem[]>();
    for (const i of history.data?.items ?? [])
      m.set(i.roundNumber, [...(m.get(i.roundNumber) ?? []), i]);
    return m;
  }, [history.data]);
  React.useEffect(() => setPage(1), [status, number, mineOnly]);

  const listed = status === 'open' ? [] : (rounds.data?.items ?? []);
  const items = [
    ...(openRound && (status === 'all' || status === 'open') ? [openRound] : []),
    ...listed,
  ].filter((r) => !mineOnly || mineByRound.has(r.number));
  const settled = (rounds.data?.items ?? []).filter((r) => r.status === 'settled');
  const cancelled = (rounds.data?.items ?? []).filter((r) => r.status === 'cancelled');
  const demo = rounds.data?.items.some((r) => r.isDemo);

  const exportCsv = () => {
    const rows = [
      [
        'round',
        'status',
        'opened_utc',
        'closed_utc',
        'participants',
        'entries',
        'pool_usdt',
        'platform_fees_usdt',
        'first_prize_handle',
        'first_prize_usdt',
        'demo',
      ],
      ...items.map((r) => [
        r.number,
        r.status,
        r.openedAt,
        r.closesAt,
        r.participants,
        r.entries,
        r.poolBalance,
        r.platformFees,
        r.winners[0]?.handle ?? '',
        r.winners[0]?.amount ?? '',
        r.isDemo,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-pool-rounds-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <PoolPageHeader
        crumbs={[
          { label: 'Lobby', href: '/' },
          { label: 'Global Pool', href: POOL_ROUTES.hub },
          { label: 'Round history' },
        ]}
        title="Round history"
        badges={demo ? <DemoBadge size="s" /> : undefined}
        description="Every Global Pool round with its pool, result and proof. A new round opens daily at 08:00 UTC and draws at 20:00 UTC with Chainlink VRF."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<Download aria-hidden />}
              onClick={exportCsv}
              disabled={!items.length}
            >
              Export CSV
            </Button>
            <Button variant="ghost" asChild leadingIcon={<CircleHelp aria-hidden />}>
              <Link href={POOL_ROUTES.fairness}>How draws work</Link>
            </Button>
          </>
        }
      />
      <PoolTabs active="history" />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
        <Stat
          label="Current round"
          value={current.data ? formatRoundNumber(current.data.number) : '—'}
          hint={
            current.data
              ? `${current.data.statusLabel} · closes ${formatDateTimeUTC(current.data.closesAt)}`
              : 'No round scheduled'
          }
          demo={current.data?.isDemo}
        />
        <Stat
          label="Prizes paid · this page"
          value={formatUSDT(toUSDTString(sum(settled.map((r) => r.poolBalance))), {
            symbol: false,
          })}
          hint="100% of each pool"
          demo={demo}
        />
        <Stat
          label="Cancelled on this page"
          value={formatCount(cancelled.length)}
          hint={
            cancelled.length
              ? `${cancelled.map((r) => formatRoundNumber(r.number)).join(', ')} · stakes refunded to Owed`
              : 'None'
          }
          demo={demo}
        />
        <Stat
          label="Your result · lifetime"
          value={
            member && history.data
              ? `+${formatUSDT(history.data.summary.prizesWon, { symbol: false })}`
              : '—'
          }
          hint={
            member
              ? history.data
                ? `${formatCount(mineByRound.size)} rounds entered · prizes won`
                : 'Loading…'
              : 'Sign in to see your rounds'
          }
          demo={history.data?.items.some((i) => i.isDemo)}
          tone={
            member && history.data && money(history.data.summary.prizesWon).gt(0)
              ? 'text-text-success'
              : undefined
          }
        />
      </section>

      <section
        aria-label="Filters"
        className="flex flex-col gap-3 laptop:flex-row laptop:items-center laptop:justify-between"
      >
        <div className="w-full laptop:max-w-80">
          <SearchInput
            aria-label="Search round number"
            placeholder="Search round #, e.g. 1245"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 laptop:mx-0 laptop:px-0"
          role="group"
          aria-label="Status"
        >
          {FILTERS.map((f) => (
            <Chip key={f.id} selected={status === f.id} onClick={() => setStatus(f.id)}>
              {f.label}
            </Chip>
          ))}
          {member && (
            <Chip selected={mineOnly} onClick={() => setMineOnly((v) => !v)}>
              Rounds I entered
            </Chip>
          )}
        </div>
      </section>

      {rounds.isPending ? (
        <div className={cn(cardCls, 'flex flex-col gap-2 p-4')} aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rounds.isError ? (
        <QueryError error={rounds.error} onRetry={() => void rounds.refetch()} />
      ) : items.length === 0 ? (
        <div className={cardCls}>
          <EmptyState
            type="no-results"
            title="No rounds match these filters"
            description="Try another status or clear the search."
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus('all');
                  setSearch('');
                  setMineOnly(false);
                }}
              >
                Clear all
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className={cn(cardCls, 'hidden overflow-hidden tablet:block')}>
            <table className="w-full text-body-s">
              <caption className="sr-only">Global Pool rounds</caption>
              <thead className="bg-bg-secondary/60 text-left text-caption text-text-tertiary">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Round
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Participants
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Pool (USDT)
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Result
                  </th>
                  {member && (
                    <th scope="col" className="px-4 py-3 font-medium">
                      Your entries
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Proof
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border-subtle align-top hover:bg-surface-hover/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={POOL_ROUTES.round(r.number)}
                        className="text-label-l text-text-primary hover:underline"
                      >
                        {formatRoundNumber(r.number)}
                      </Link>
                      <span className="block text-caption text-text-tertiary">
                        {formatWeekdayDateUTC(r.closesAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <RoundStatusBadge status={r.status} />
                        {r.isDemo && <DemoBadge size="xs" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-label-m text-text-primary tabular-nums">
                        {r.participants ? formatCount(r.participants) : '—'}
                        {r.status === 'cancelled' && (
                          <span className="text-text-tertiary">
                            {' '}
                            / {formatCount(r.thresholds.minParticipants)}
                          </span>
                        )}
                      </span>
                      <span className="text-caption text-text-tertiary">
                        {formatCount(r.entries)} entries
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="block text-label-m text-text-primary tabular-nums">
                        {formatUSDT(poolOf(r), { symbol: false })}
                      </span>
                      {r.status === 'cancelled' && (
                        <span className="text-caption text-text-tertiary">refunded to Owed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ResultCell round={r} />
                    </td>
                    {member && (
                      <td className="px-4 py-3">
                        <MineCell rows={mineByRound.get(r.number)} />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {r.status === 'settled' ? (
                        <Link
                          href={POOL_ROUTES.verify(r.number)}
                          className="inline-flex items-center gap-1 text-label-m text-text-brand hover:underline"
                        >
                          <ShieldCheck aria-hidden className="size-4" /> Verify
                        </Link>
                      ) : (
                        <Link
                          href={POOL_ROUTES.round(r.number)}
                          className="inline-flex items-center gap-1 text-label-m text-text-secondary hover:underline"
                        >
                          Details <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-3 tablet:hidden">
            {items.map((r) => (
              <li key={r.id} className={cn(cardCls, 'flex flex-col gap-3 p-4')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={POOL_ROUTES.round(r.number)} className="text-h5 text-text-primary">
                      Round {formatRoundNumber(r.number)}
                    </Link>
                    <p className="text-caption text-text-tertiary">
                      {formatWeekdayDateUTC(r.closesAt)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5">
                    <RoundStatusBadge status={r.status} />
                    {r.isDemo && <DemoBadge size="xs" />}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-caption">
                  <span className="flex flex-col text-text-tertiary">
                    Pool{' '}
                    <span className="text-label-m text-text-primary tabular-nums">
                      {formatUSDT(poolOf(r))}
                    </span>
                  </span>
                  <span className="flex flex-col text-text-tertiary">
                    Entries{' '}
                    <span className="text-label-m text-text-primary tabular-nums">
                      {formatCount(r.entries)}
                    </span>
                  </span>
                </div>
                <ResultCell round={r} />
                {member && <MineCell rows={mineByRound.get(r.number)} />}
                <Button variant="secondary" size="m" asChild>
                  <Link
                    href={
                      r.status === 'settled'
                        ? POOL_ROUTES.verify(r.number)
                        : POOL_ROUTES.round(r.number)
                    }
                  >
                    {r.status === 'settled' ? 'Verify draw' : 'Round details'}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          <nav
            aria-label="Pagination"
            className="flex flex-col items-center justify-between gap-3 tablet:flex-row"
          >
            <p className="text-caption text-text-tertiary">
              {mineOnly
                ? `Showing ${items.length} rounds you entered on this page`
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + (rounds.data?.items.length ?? 0)} of ${formatCount(rounds.data?.total ?? 0)} rounds`}
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
                disabled={page >= (rounds.data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                trailingIcon={<ChevronRight aria-hidden />}
              >
                Older
              </Button>
            </div>
          </nav>
        </>
      )}
      <LicenceStrip />
    </div>
  );
}

const poolOf = (r: PoolRoundView) =>
  r.status === 'cancelled' ? money(r.entryPrice).times(r.entries).toFixed(2) : r.poolBalance;

function ResultCell({ round }: { round: PoolRoundView }) {
  if (round.status === 'cancelled')
    return (
      <span className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-label-m text-text-warning">
          <TriangleAlert aria-hidden className="size-4" />
          Cancelled —{' '}
          {round.cancellation?.reason === 'vrf_timeout'
            ? 'randomness timed out'
            : 'threshold not met'}
        </span>
        <span className="text-caption text-text-tertiary">
          {formatCount(round.participants)} / {formatCount(round.thresholds.minParticipants)}{' '}
          players · stakes refunded to Owed
        </span>
      </span>
    );
  if (round.status === 'settled') {
    const w = round.winners[0];
    return (
      <span className="flex flex-col gap-0.5">
        <span className="text-label-m text-text-primary">
          1st {w ? (w.handle ? `@${w.handle}` : 'Hidden') : '—'} ·{' '}
          <span className="text-text-gold">{w ? formatUSDT(w.amount) : '—'}</span>
        </span>
        <span className="text-caption text-text-tertiary">
          Settled {round.settledAt ? formatDateTimeUTC(round.settledAt) : '—'}
        </span>
      </span>
    );
  }
  if (round.status === 'open')
    return (
      <span className="flex flex-col gap-0.5">
        <span className="text-label-m text-text-primary">
          Draws {formatDateTimeUTC(round.closesAt)}
        </span>
        <span className="text-caption text-text-tertiary">
          {round.thresholds.met ? 'Threshold met' : 'Threshold not met yet'} · entries open
        </span>
      </span>
    );
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-label-m text-text-info">Drawing</span>
      <span className="text-caption text-text-tertiary">
        Closed {formatTimeUTC(round.closesAt)} · awaiting randomness
      </span>
    </span>
  );
}

/**
 * The player's result for ONE round, over ALL their purchases in it: the API reports each purchase's own prize and
 * refund (R16), so the round figure is their sum — won if any purchase won (Σ prizes), else Σ refunds still owed, …
 */
export function roundResultOf(rows: readonly EntryHistoryItem[]): {
  kind: EntryResultKind;
  prize: string | null;
  refund: string | null;
} {
  const of = (kind: EntryResultKind) => rows.filter((r) => r.result.kind === kind);
  const total = (xs: EntryHistoryItem[], pick: (r: EntryHistoryItem) => string | null) =>
    toUSDTString(sum(xs.map((r) => pick(r) ?? '0')));
  const won = of('won');
  if (won.length > 0) return { kind: 'won', prize: total(won, (r) => r.result.prize), refund: null };
  for (const kind of ['refund_owed', 'refunded'] as const) {
    const refunds = of(kind);
    if (refunds.length > 0)
      return { kind, prize: null, refund: total(refunds, (r) => r.result.refund) };
  }
  const kind =
    (['not_selected', 'drawing', 'in_draw'] as const).find((k) => of(k).length > 0) ??
    rows[0]?.result.kind ??
    'in_draw';
  return { kind, prize: null, refund: null };
}

function MineCell({ rows }: { rows: EntryHistoryItem[] | undefined }) {
  if (!rows?.length) return <span className="text-caption text-text-tertiary">—</span>;
  const entries = rows.reduce((n, r) => n + r.entries, 0);
  const total = toUSDTString(sum(rows.map((r) => r.total)));
  const res = roundResultOf(rows);
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-label-m text-text-primary">
        {formatCount(entries)} entries · {formatUSDT(total)}
      </span>
      <span
        className={cn(
          'text-caption',
          res.kind === 'won'
            ? 'text-text-success'
            : res.kind === 'refund_owed'
              ? 'text-text-warning'
              : 'text-text-tertiary',
        )}
      >
        {res.kind === 'won'
          ? `Won · +${formatUSDT(res.prize ?? '0')}`
          : res.kind === 'refund_owed'
            ? `Refund ${formatUSDT(res.refund ?? '0')} owed`
            : res.kind === 'refunded'
              ? 'Refunded'
              : res.kind === 'not_selected'
                ? 'Not selected'
                : 'In the draw'}
      </span>
    </span>
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
      <p className="truncate text-caption text-text-tertiary" title={hint}>
        {hint}
      </p>
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-label-m whitespace-nowrap transition-colors tablet:h-9',
        selected
          ? 'border-border-brand bg-brand-tint text-text-brand'
          : 'border-border-default text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}
