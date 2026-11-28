'use client';

import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Download, Info, Search, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount, credits, shortHash, toneOfNet } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { InputControl, InputGroup } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { classifyGameError, useGameBets, type GameBetsFilters } from '@/lib/api/games';
import { historyApi, saveCsv } from '@/lib/api/rg-history';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { SideDisc } from './coin';
import { CoinflipSubpage } from './coinflip-pages';
import {
  MULTIPLIER,
  SLUG,
  WIN_CHANCE,
  mappingLine,
  normaliseFlipSearch,
  periodFrom,
  sideLabel,
  type CoinflipBet,
  type FlipPeriod,
} from './coinflip-math';
import { COINFLIP_ROUTES } from './routes';

const PERIODS: { id: FlipPeriod; label: string; caption: string }[] = [
  { id: 'today', label: 'Today', caption: 'Since 00:00 UTC' },
  { id: '7d', label: '7 days', caption: 'Last 7 days' },
  { id: '30d', label: '30 days', caption: 'Last 30 days' },
  { id: 'all', label: 'All', caption: 'All time' },
];

type PickFilter = 'all' | 'heads' | 'tails';
type ResultFilter = 'all' | 'win' | 'lose';

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-label-m transition-colors focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
        pressed
          ? 'border-border-brand bg-brand-tint text-text-brand'
          : 'border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function SideCell({ side }: { side: 'heads' | 'tails' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <SideDisc side={side} size={24} />
      <span className="text-body-s text-text-primary">{sideLabel(side)}</span>
    </span>
  );
}

function detailText(b: CoinflipBet): string {
  return [
    `Flip ${b.ref} (Double Side, DEMO credits — no cash value)`,
    `Time: ${formatDateTimeUTC(b.settledAt ?? b.createdAt, { seconds: true })}`,
    `Pick: ${sideLabel(b.outcome.pick)} · Landed: ${sideLabel(b.outcome.side)} · ${b.win ? 'Win' : 'Lose'}`,
    `Stake: ${b.stake} DEMO · Payout: ${b.payout} DEMO · Fee: 0.00`,
    `Server seed hash: ${b.fairness.serverSeedHash}`,
    `Client seed: ${b.fairness.clientSeed} · Nonce: ${b.fairness.nonce}`,
    `Result: ${mappingLine(b.outcome.u32)}`,
  ].join('\n');
}

function FlipDetail({ b, className }: { b: CoinflipBet; className?: string }) {
  const kv: [string, React.ReactNode, boolean][] = [
    ['Server seed hash (committed before the flip)', shortHash(b.fairness.serverSeedHash, 16, 16), true],
    ['Client seed', b.fairness.clientSeed, true],
    ['Nonce', String(b.fairness.nonce), true],
    ['Result', mappingLine(b.outcome.u32), false],
    ['Settled', formatDateTimeUTC(b.settledAt ?? b.createdAt, { seconds: true }), false],
    ['Server seed', b.fairness.revealed ? 'Revealed — recompute it now' : 'Still secret — rotate your seed pair to reveal', false],
  ];
  return (
    <div className={cn('flex flex-col gap-4', className)} data-testid={`flip-detail-${b.ref}`}>
      <dl className="grid gap-x-8 gap-y-3 tablet:grid-cols-2 laptop:grid-cols-3">
        {kv.map(([k, v, mono]) => (
          <div key={k} className="flex min-w-0 flex-col gap-1">
            <dt className="text-caption text-text-tertiary">{k}</dt>
            <dd className={cn('break-all text-text-primary', mono ? 'font-mono text-mono-s' : 'text-body-s-strong')}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8" leadingIcon={<ShieldCheck aria-hidden />}>
          <Link href={COINFLIP_ROUTES.verify(b.id)}>Verify this flip</Link>
        </Button>
        <Button
          variant="ghost"
          size="s"
          className="min-h-11 tablet:min-h-8"
          leadingIcon={<Copy aria-hidden />}
          onClick={() =>
            void navigator.clipboard?.writeText(detailText(b)).then(
              () => toast({ type: 'success', title: `Details of ${b.ref} copied` }),
              () => undefined,
            )
          }
        >
          Copy details
        </Button>
        <DemoBadge size="xs" />
        <p className="text-caption text-text-tertiary">
          The server seed is revealed when you rotate your seed pair — after that anyone can recompute this flip.
        </p>
      </div>
    </div>
  );
}

/** CF-04 — My flips: period, pick and result filters, search, KPIs, table / cards with an expandable detail row. */
export function MyFlipsPage() {
  const [period, setPeriod] = React.useState<FlipPeriod>('today');
  const [pick, setPick] = React.useState<PickFilter>('all');
  const [result, setResult] = React.useState<ResultFilter>('all');
  const [searchText, setSearchText] = React.useState('');
  const [search, setSearch] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [open, setOpen] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const wide = useMediaQuery(MQ.lg, true);

  // `from` is fixed when the period is chosen (a moving "now" would refetch on every render).
  const from = React.useMemo(() => periodFrom(period), [period]);
  const searchInvalid = searchText.trim() !== '' && normaliseFlipSearch(searchText) === null;
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(normaliseFlipSearch(searchText));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const filters = React.useMemo<GameBetsFilters>(
    () => ({
      ...(from ? { from } : {}),
      ...(pick !== 'all' ? { pick } : {}),
      ...(result !== 'all' ? { result } : {}),
      ...(search ? { search } : {}),
    }),
    [from, pick, result, search],
  );
  const q = useGameBets<CoinflipBet>(SLUG, page, pageSize, filters);
  const s = q.data?.summary;
  const items = q.data?.items ?? [];
  const periodInfo = PERIODS.find((p) => p.id === period)!;

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
    setOpen(null);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await historyApi.exportGameRounds({ game: SLUG, ...(from ? { from } : {}) });
      saveCsv(typeof csv === 'string' ? csv : String(csv), `globalpool_double-side_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ type: 'success', title: 'CSV exported', description: 'Seeds and nonces included · DEMO credits (no cash value).' });
    } catch (err) {
      toast({ type: 'error', title: 'Could not export', description: classifyGameError(err).message });
    } finally {
      setExporting(false);
    }
  };

  const kpis: { label: string; value: React.ReactNode; sub: string; tone?: string }[] = s
    ? [
        { label: `Flips · ${periodInfo.label}`, value: String(s.bets), sub: `${periodInfo.caption} · Double Side only` },
        { label: 'Wagered', value: <CreditsAmount value={s.wagered} />, sub: `${s.bets} flip${s.bets === 1 ? '' : 's'} · Fees 0.00` },
        {
          label: 'Net result',
          value: <CreditsAmount value={s.net} signed />,
          sub: `${s.wins ?? 0} win${s.wins === 1 ? '' : 's'} · ${s.losses ?? 0} loss${s.losses === 1 ? '' : 'es'}`,
          tone: toneOfNet(s.net),
        },
        {
          label: 'Landed',
          value: s.landed ? `Heads ${s.landed.heads} · Tails ${s.landed.tails}` : '—',
          sub: 'Each flip is independent — this is a record, not a pattern',
        },
      ]
    : [];

  const total = q.data?.total ?? 0;
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(total, page * pageSize);
  const totalPages = q.data?.totalPages ?? 1;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
  );

  return (
    <CoinflipSubpage
      crumb="My flips"
      title="My flips"
      tab="my-flips"
      chips={<DemoBadge size="m" />}
      actions={
        <Button
          variant="secondary"
          className="min-h-11 tablet:min-h-10"
          onClick={() => void exportCsv()}
          loading={exporting}
          leadingIcon={<Download aria-hidden />}
        >
          Export CSV
        </Button>
      }
    >
      {/* filters */}
      <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center">
        <div role="radiogroup" aria-label="Period" className="inline-flex w-fit shrink-0 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={period === p.id}
              onClick={() => reset(() => setPeriod(p.id))}
              className={cn(
                'h-11 rounded-sm px-3 text-label-m text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
                period === p.id && 'bg-surface-raised text-text-primary shadow-elevation-1',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:flex-wrap tablet:px-0" role="group" aria-label="Filter flips">
          <Chip pressed={pick === 'all'} onClick={() => reset(() => setPick('all'))}>
            All picks
          </Chip>
          <Chip pressed={pick === 'heads'} onClick={() => reset(() => setPick(pick === 'heads' ? 'all' : 'heads'))}>
            Picked Heads
          </Chip>
          <Chip pressed={pick === 'tails'} onClick={() => reset(() => setPick(pick === 'tails' ? 'all' : 'tails'))}>
            Picked Tails
          </Chip>
          <Chip pressed={result === 'win'} onClick={() => reset(() => setResult(result === 'win' ? 'all' : 'win'))}>
            Wins
          </Chip>
          <Chip pressed={result === 'lose'} onClick={() => reset(() => setResult(result === 'lose' ? 'all' : 'lose'))}>
            Losses
          </Chip>
        </div>
        <div className="flex flex-col gap-1 laptop:ml-auto laptop:w-72">
          <InputGroup size="m" state={searchInvalid ? 'error' : 'default'} className="min-h-11 tablet:min-h-10">
            <Search aria-hidden className="size-4 text-icon-muted" />
            <InputControl
              value={searchText}
              onChange={(e) => setSearchText(e.target.value.slice(0, 16))}
              placeholder="Search flip ID or nonce"
              aria-label="Search flip ID or nonce"
              aria-invalid={searchInvalid || undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {searchText && (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-sm text-icon-muted hover:text-text-primary"
                aria-label="Clear search"
                onClick={() => setSearchText('')}
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </InputGroup>
          {searchInvalid && <p className="text-caption text-text-danger">Use a flip ID like CF-52107 or a nonce like 418.</p>}
        </div>
      </div>

      {/* KPIs */}
      <dl className="grid grid-cols-2 gap-3 laptop:grid-cols-4 tablet:gap-4" aria-busy={q.isPending}>
        {q.isPending
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)
          : kpis.map((k) => (
              <div key={k.label} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-overline text-text-tertiary uppercase">{k.label}</dt>
                  <DemoBadge size="xs" />
                </div>
                <dd className={cn('text-h4 break-words text-text-primary laptop:text-number-l', k.label === 'Landed' && 'laptop:text-h4', k.tone)}>
                  {k.value}
                </dd>
                <dd className="text-caption text-text-tertiary">{k.sub}</dd>
              </div>
            ))}
      </dl>

      {/* list */}
      <section aria-label="Flips" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-default">
        {q.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : q.isError ? (
          <EmptyState
            type="error"
            title="Couldn’t load your flips"
            description={classifyGameError(q.error).message}
            actions={
              <Button variant="secondary" size="s" onClick={() => void q.refetch()}>
                Try again
              </Button>
            }
          />
        ) : !items.length ? (
          <EmptyState
            type={search || pick !== 'all' || result !== 'all' ? 'no-results' : 'no-data'}
            title={search ? `No flip matches “${searchText.trim()}”` : `No flips ${period === 'all' ? 'yet' : `in this period`}`}
            description={
              search || pick !== 'all' || result !== 'all'
                ? 'Change the filters or search for another flip ID or nonce.'
                : 'Your flips appear here with the seeds and nonce needed to verify them.'
            }
            actions={
              <Button variant="secondary" size="s" asChild>
                <Link href={COINFLIP_ROUTES.play}>Play Double Side</Link>
              </Button>
            }
          />
        ) : wide ? (
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">My Double Side flips, newest first</caption>
            <thead className="bg-bg-secondary">
              <tr className="text-overline text-text-tertiary uppercase">
                <th scope="col" className="h-11 px-4 font-semibold">Flip</th>
                <th scope="col" className="px-4 font-semibold" aria-sort="descending">
                  <span className="inline-flex items-center gap-1">
                    Time (UTC) <ChevronDown aria-hidden className="size-3.5" />
                  </span>
                </th>
                <th scope="col" className="px-4 font-semibold">Pick</th>
                <th scope="col" className="px-4 font-semibold">Landed</th>
                <th scope="col" className="px-4 text-right font-semibold">Bet</th>
                <th scope="col" className="px-4 text-right font-semibold">Payout</th>
                <th scope="col" className="px-4 text-right font-semibold">Profit</th>
                <th scope="col" className="px-4 font-semibold">Fairness</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const expanded = open === b.id;
                return (
                  <React.Fragment key={b.id}>
                    <tr className={cn('border-t border-border-subtle', expanded && 'bg-surface-selected')}>
                      <td className="h-[52px] px-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono text-mono-s text-text-primary">{b.ref}</span>
                          <DemoBadge size="xs" />
                        </span>
                      </td>
                      <td className="px-4 text-body-s text-text-secondary tabular-nums">
                        {formatTimeUTC(b.createdAt, { seconds: true }).replace(' UTC', '')}
                      </td>
                      <td className="px-4">
                        <SideCell side={b.outcome.pick} />
                      </td>
                      <td className="px-4">
                        <SideCell side={b.outcome.side} />
                      </td>
                      <td className="px-4 text-right">
                        <CreditsAmount value={b.stake} className="text-body-s-strong text-text-primary" />
                      </td>
                      <td className="px-4 text-right text-body-s-strong tabular-nums">
                        {b.win ? <span className="text-text-primary">{MULTIPLIER}×</span> : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className={cn('px-4 text-right text-body-s-strong', toneOfNet(b.net))}>
                        <CreditsAmount value={b.net} signed />
                      </td>
                      <td className="px-4">
                        <Button
                          variant="ghost"
                          size="s"
                          aria-expanded={expanded}
                          aria-controls={`detail-${b.id}`}
                          onClick={() => setOpen(expanded ? null : b.id)}
                          leadingIcon={expanded ? <ChevronUp aria-hidden /> : <ShieldCheck aria-hidden />}
                        >
                          {expanded ? 'Hide' : 'Verify'}
                          <span className="sr-only"> {b.ref}</span>
                        </Button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={`detail-${b.id}`} className="border-t border-border-subtle bg-surface-raised">
                        <td colSpan={8} className="px-6 py-5">
                          <FlipDetail b={b} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <ul className="flex flex-col">
            {items.map((b) => {
              const expanded = open === b.id;
              return (
                <li key={b.id} className="border-b border-border-subtle last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`detail-${b.id}`}
                    onClick={() => setOpen(expanded ? null : b.id)}
                    className={cn(
                      'flex min-h-[72px] w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus',
                      expanded && 'bg-surface-selected',
                    )}
                  >
                    <SideDisc side={b.outcome.side} size={36} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-mono-s text-text-primary">{b.ref}</span>
                        <DemoBadge size="xs" />
                      </span>
                      <span className="truncate text-caption text-text-secondary">
                        Picked {sideLabel(b.outcome.pick)} · landed {sideLabel(b.outcome.side)} ·{' '}
                        {formatTimeUTC(b.createdAt, { seconds: true })}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className={cn('text-body-s-strong', toneOfNet(b.net))}>
                        <CreditsAmount value={b.net} signed />
                      </span>
                      <span className="text-caption text-text-tertiary">bet {credits(b.stake)}</span>
                    </span>
                    {expanded ? (
                      <ChevronUp aria-hidden className="size-4 shrink-0 text-icon-muted" />
                    ) : (
                      <ChevronDown aria-hidden className="size-4 shrink-0 text-icon-muted" />
                    )}
                  </button>
                  {expanded && <FlipDetail b={b} className="border-t border-border-subtle bg-surface-raised p-4" />}
                </li>
              );
            })}
          </ul>
        )}

        {q.data && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border-subtle p-4 tablet:flex-row tablet:items-center">
            <div className="flex items-center gap-3">
              <span className="text-caption text-text-tertiary">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                  setOpen(null);
                }}
              >
                <SelectTrigger size="s" className="w-20" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-caption text-text-secondary tabular-nums">
                {first}–{last} of {total}
              </span>
            </div>
            <nav aria-label="Pagination" className="flex items-center gap-1 tablet:ml-auto">
              <Button
                variant="secondary"
                size="s"
                className="size-11 px-0 tablet:size-8"
                aria-label="Newer flips"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              {pages.map((n, i) => (
                <React.Fragment key={n}>
                  {i > 0 && n - pages[i - 1]! > 1 && <span className="px-1 text-text-tertiary">…</span>}
                  <Button
                    variant={n === page ? 'secondary' : 'ghost'}
                    size="s"
                    className={cn('size-11 px-0 tablet:size-8', n === page && 'border-border-brand text-text-brand')}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                </React.Fragment>
              ))}
              <Button
                variant="secondary"
                size="s"
                className="size-11 px-0 tablet:size-8"
                aria-label="Older flips"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-body-s text-text-secondary">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
        History is a record, not a strategy: past flips never predict the next one. Every flip is {WIN_CHANCE}% Heads /{' '}
        {WIN_CHANCE}% Tails, payout {MULTIPLIER}×.
      </p>
    </CoinflipSubpage>
  );
}
