'use client';

import { formatTimeUTC } from '@gp/shared/format';
import { CircleCheck, CircleX, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { classifyGameError, useGameBets, type GameBetView } from '@/lib/api/games';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { CreditsAmount, toneOfNet } from './parts';

export interface HistoryColumn<B> {
  id: string;
  header: string;
  align?: 'left' | 'right';
  cell: (bet: B) => React.ReactNode;
}

type ResultFilter = 'all' | 'wins' | 'losses';

const won = (b: GameBetView) => b.win === true;

/**
 * My bets for one game (DI-05): KPIs (bets, wagered, returned, net in DEMO credits), result filter, table ≥ 1024 /
 * cards below, pagination, Verify per row. `columns` add the game-specific cells (target, roll, pick …).
 */
export function BetHistory<B extends GameBetView>({
  slug,
  columns,
  summary,
  onVerify,
  multiplier = (b) => b.multiplier,
  title = 'My bets',
  noun = 'bet',
  pageSize = 10,
  className,
  actions,
}: {
  slug: string;
  columns: HistoryColumn<B>[];
  /** One-line mobile summary ("Over 50.50 · 1.9603×"). */
  summary: (bet: B) => string;
  onVerify: (bet: B) => void;
  /** Multiplier column (default: the effective payout ÷ stake the API records). */
  multiplier?: (bet: B) => string | null;
  title?: string;
  noun?: string;
  pageSize?: number;
  className?: string;
  /** Extra header actions (e.g. "Export CSV"), rendered before the result filter. */
  actions?: React.ReactNode;
}) {
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState<ResultFilter>('all');
  const q = useGameBets<B>(slug, page, pageSize);
  const wide = useMediaQuery(MQ.lg, true);
  const items = (q.data?.items ?? []).filter((b) =>
    filter === 'all' ? true : filter === 'wins' ? won(b) : !won(b),
  );
  const s = q.data?.summary;

  return (
    <section
      aria-labelledby={`history-${slug}`}
      className={cn('flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5', className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`history-${slug}`} className="text-h5 text-text-primary">
          {title}
        </h2>
        <DemoBadge size="s" label="DEMO credits" />
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        <div
          role="group"
          aria-label="Filter results"
          className={cn('flex gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1', !actions && 'ml-auto')}
        >
          {(['all', 'wins', 'losses'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'h-9 min-w-11 rounded-sm px-3 text-label-m capitalize text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-8',
                filter === f && 'bg-surface-raised text-text-primary shadow-elevation-1',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {s && (
        <dl className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
          {[
            ['Bets', String(s.bets), ''],
            ['Wagered', <CreditsAmount key="w" value={s.wagered} />, ''],
            ['Returned', <CreditsAmount key="r" value={s.returned} />, ''],
            ['Net result', <CreditsAmount key="n" value={s.net} signed />, toneOfNet(s.net)],
          ].map(([label, value, tone]) => (
            <div key={label as string} className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-secondary p-3">
              <dt className="text-overline text-text-tertiary uppercase">{label}</dt>
              <dd className={cn('text-number-s text-text-primary', tone as string)}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {q.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          type="error"
          title="Couldn’t load your bets"
          description={classifyGameError(q.error).message}
          actions={
            <Button variant="secondary" size="s" onClick={() => void q.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !items.length ? (
        <EmptyState
          type="no-data"
          title={filter === 'all' ? `No ${noun}s yet` : `No ${filter} on this page`}
          description={
            filter === 'all'
              ? `Your ${noun}s appear here with the seeds and nonce needed to verify them.`
              : 'Change the filter or load another page.'
          }
        />
      ) : wide ? (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Time (UTC)</TableHead>
                <TableHead align="right">Bet</TableHead>
                {columns.map((c) => (
                  <TableHead key={c.id} align={c.align}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead align="right">Multiplier</TableHead>
                <TableHead align="right">Profit</TableHead>
                <TableHead>
                  <span className="sr-only">Verify</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-mono-s">{b.ref}</TableCell>
                  <TableCell className="text-text-secondary">{formatTimeUTC(b.createdAt, { seconds: true })}</TableCell>
                  <TableCell align="right">
                    <CreditsAmount value={b.stake} unit={false} />
                  </TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.id} align={c.align}>
                      {c.cell(b)}
                    </TableCell>
                  ))}
                  <TableCell align="right" className="tabular-nums text-text-secondary">
                    {multiplier(b) ? `${multiplier(b)}×` : '—'}
                  </TableCell>
                  <TableCell align="right" className={cn('tabular-nums', toneOfNet(b.net))}>
                    <CreditsAmount value={b.net} signed unit={false} />
                  </TableCell>
                  <TableCell>
                    <Button variant="link" size="s" onClick={() => onVerify(b)} leadingIcon={<ShieldCheck aria-hidden />}>
                      Verify<span className="sr-only"> {b.ref}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onVerify(b)}
                className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3 text-left focus-visible:outline-2 focus-visible:outline-border-focus"
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-md',
                    won(b) ? 'bg-brand-tint text-icon-brand' : 'bg-status-danger-tint text-text-danger',
                  )}
                >
                  {won(b) ? <CircleCheck aria-hidden className="size-5" /> : <CircleX aria-hidden className="size-5" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-mono text-mono-s text-text-primary">{b.ref}</span>
                  <span className="truncate text-caption text-text-secondary">
                    {summary(b)} · {formatTimeUTC(b.createdAt)}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className={cn('text-label-m', won(b) ? 'text-text-brand' : 'text-text-danger')}>
                    {won(b) ? 'Win' : 'Lose'}
                  </span>
                  <span className={cn('text-number-s', toneOfNet(b.net))}>
                    <CreditsAmount value={b.net} signed unit={false} />
                  </span>
                </span>
                <span className="sr-only">Verify {b.ref}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {q.data && q.data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-text-tertiary">
            Page {q.data.page} of {q.data.totalPages} · {q.data.total} {noun}s
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Newer
            </Button>
            <Button
              variant="secondary"
              size="s"
              className="min-h-11 tablet:min-h-8"
              disabled={page >= q.data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** "Recent results" pill strip (newest first, outlined). Each bet is independent — the caption says so. */
export function RecentResults<B extends GameBetView>({
  slug,
  label,
  onSelect,
  caption = 'Each result is independent and fixed by your seeds — a run of losses never makes a win “due”.',
  className,
}: {
  slug: string;
  label: (bet: B) => string;
  onSelect?: (bet: B) => void;
  caption?: string;
  className?: string;
}) {
  const q = useGameBets<B>(slug, 1, 10);
  const items = q.data?.items ?? [];
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <p className="text-label-m text-text-secondary">Your last results</p>
        <DemoBadge size="xs" />
      </div>
      {q.isPending ? (
        <Skeleton className="h-8 w-full" />
      ) : items.length ? (
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="Your last results, newest first">
          {items.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect?.(b)}
                className={cn(
                  'inline-flex h-8 min-w-11 items-center gap-1 rounded-full border px-2.5 text-label-s tabular-nums focus-visible:outline-2 focus-visible:outline-border-focus',
                  won(b) ? 'border-border-brand bg-brand-tint text-text-brand' : 'border-border-default bg-surface-raised text-text-secondary',
                  i === 0 && 'ring-2 ring-border-focus',
                )}
                aria-label={`${b.ref}: ${label(b)}, ${won(b) ? 'win' : 'lose'} — verify`}
              >
                {won(b) ? <CircleCheck aria-hidden className="size-3" /> : <CircleX aria-hidden className="size-3 text-text-danger" />}
                {label(b)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-s text-text-tertiary">No results yet.</p>
      )}
      <p className="text-caption text-text-tertiary">{caption}</p>
    </div>
  );
}
