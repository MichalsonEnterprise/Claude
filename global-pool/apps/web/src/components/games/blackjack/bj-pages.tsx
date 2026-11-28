'use client';

import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { blackjack } from '@gp/shared/fair';
import { formatAmount } from '@gp/shared/money';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  PauseCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount, GAMES_ROUTES, toneOfNet } from '@/components/games/kit';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { InputControl, InputGroup } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { classifyGameError } from '@/lib/api/games';
import { historyApi, saveCsv } from '@/lib/api/rg-history';
import { useBjHands, type BjBetView, type BjHandsFilters, type BjOutcomeFilter } from '@/lib/api/twenty-one';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { BjSubpage } from './bj-chrome';
import { INFO, SLUG, decisionsSummary, handTimeline, isNatural, payoutTable, totalOf } from './bj-math';
import { ResultChip } from './bj-parts';
import { MiniCards } from './cards';
import { BJ_ROUTES } from './routes';

// ── BJ-06 My hands ──────────────────────────────────────────────────────────────────────────────

type Period = 'today' | '7d' | '30d' | 'all';
const PERIODS: { id: Period; label: string; caption: string }[] = [
  { id: 'today', label: 'Today', caption: 'since 00:00 UTC' },
  { id: '7d', label: '7 days', caption: 'last 7 days' },
  { id: '30d', label: '30 days', caption: 'last 30 days' },
  { id: 'all', label: 'All', caption: 'all time' },
];

const FILTERS: { id: BjOutcomeFilter | 'all'; label: string }[] = [
  { id: 'all', label: 'All results' },
  { id: 'win', label: 'Wins' },
  { id: 'lose', label: 'Losses' },
  { id: 'push', label: 'Pushes' },
  { id: 'blackjack', label: 'Blackjacks' },
  { id: 'bust', label: 'Busts' },
  { id: 'split_double', label: 'Splits & doubles' },
];

function periodFrom(p: Period): string | undefined {
  const now = new Date();
  if (p === 'all') return undefined;
  if (p === 'today') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const days = p === '7d' ? 7 : 30;
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/** "BJ-40517", "40517" or a nonce — what the API search accepts. */
function normaliseSearch(v: string): string | null {
  const s = v.trim().toUpperCase();
  if (!s) return null;
  return /^(BJ-?)?\d{1,9}$/.test(s) ? s : null;
}

const handTotal = (cards: readonly string[]) => {
  const t = totalOf(cards).total;
  return isNatural(cards) ? 'BJ' : String(t);
};

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-label-m whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-10',
        pressed
          ? 'border-border-brand bg-brand-tint text-text-brand'
          : 'border-border-default bg-surface-default text-text-secondary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function HandDetail({ b }: { b: BjBetView }) {
  const lines = handTimeline(b);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            hand: b.ref,
            game: 'twenty-one',
            currency: 'DEMO',
            stake: b.stake,
            payout: b.payout,
            net: b.net,
            serverSeedHash: b.fairness.serverSeedHash,
            clientSeed: b.fairness.clientSeed,
            nonce: b.fairness.nonce,
            actions: b.outcome.actions ?? [],
            rulesVersion: b.rulesVersion,
          },
          null,
          2,
        ),
      );
      toast({ type: 'success', title: 'Hand data copied', description: `${b.ref} · DEMO credits (no cash value).` });
    } catch {
      toast({ type: 'error', title: 'Could not copy', description: 'Your browser blocked the clipboard.' });
    }
  };
  return (
    <div className="grid gap-5 bg-bg-secondary p-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] tablet:p-5">
      <div className="flex flex-col gap-2">
        <p className="text-overline text-text-tertiary uppercase">What happened</p>
        <ol className="flex flex-col gap-2">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 text-body-s text-text-primary">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
              {l.time && <span className="shrink-0 font-mono text-mono-s text-text-tertiary">{l.time}</span>}
              <span>{l.text}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-overline text-text-tertiary uppercase">Seed pair for this hand</p>
        <dl className="flex flex-col gap-1.5 text-body-s">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Server seed hash</dt>
            <dd className="flex items-center gap-1.5 font-mono text-mono-s text-text-primary">
              {b.fairness.serverSeedHash.slice(0, 8)}…{b.fairness.serverSeedHash.slice(-6)} <DemoBadge size="xs" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Client seed</dt>
            <dd className="font-mono text-mono-s break-all text-text-primary">{b.fairness.clientSeed}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Nonce</dt>
            <dd className="font-mono text-mono-s text-text-primary">{b.fairness.nonce}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Server seed</dt>
            <dd className="text-caption text-text-tertiary">{b.fairness.revealed ? 'Revealed — verify now' : 'Secret until you rotate'}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-9" asChild leadingIcon={<ShieldCheck aria-hidden />}>
            <Link href={BJ_ROUTES.verify(b.id)}>Verify this hand</Link>
          </Button>
          <Button variant="ghost" size="s" className="min-h-11 tablet:min-h-9" onClick={() => void copy()} leadingIcon={<ClipboardCopy aria-hidden />}>
            Copy hand data
          </Button>
        </div>
      </div>
    </div>
  );
}

function DealerCell({ b }: { b: BjBetView }) {
  const dealer = ((b.outcome.dealer ?? [])).filter(Boolean);
  if (!dealer.length) return <span className="text-text-tertiary">—</span>;
  return (
    <span className="flex items-center gap-2">
      <MiniCards cards={dealer} />
      <span className="text-caption text-text-secondary">{handTotal(dealer)}</span>
    </span>
  );
}

function YourHandCell({ b }: { b: BjBetView }) {
  const hands = b.outcome.hands ?? [];
  if (!hands.length) return <span className="text-text-tertiary">In play</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {hands.map((h, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-text-tertiary">/</span>}
          <MiniCards cards={h.cards} />
        </React.Fragment>
      ))}
      <span className="text-caption text-text-secondary">
        {hands.map((h) => (!h.fromSplit && isNatural(h.cards) ? 'BJ' : String(blackjack.handValue(h.cards).total))).join(' / ')}
      </span>
    </span>
  );
}

/** BJ-06 — My hands: KPIs, result chips (server-side `outcome` filter), period, search, table / cards, details. */
export function MyHandsPage() {
  const [period, setPeriod] = React.useState<Period>('today');
  const [outcome, setOutcome] = React.useState<BjOutcomeFilter | 'all'>('all');
  const [searchText, setSearchText] = React.useState('');
  const [search, setSearch] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [open, setOpen] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const wide = useMediaQuery(MQ.lg, true);

  const from = React.useMemo(() => periodFrom(period), [period]);
  const searchInvalid = searchText.trim() !== '' && normaliseSearch(searchText) === null;
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(normaliseSearch(searchText));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchText]);

  const filters = React.useMemo<BjHandsFilters>(
    () => ({
      ...(from ? { from } : {}),
      ...(outcome !== 'all' ? { outcome } : {}),
      ...(search ? { search } : {}),
    }),
    [from, outcome, search],
  );
  const q = useBjHands(page, pageSize, filters);
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
      saveCsv(typeof csv === 'string' ? csv : String(csv), `globalpool_twenty-one_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ type: 'success', title: 'CSV exported', description: 'Seeds and nonces included · DEMO credits (no cash value).' });
    } catch (err) {
      toast({ type: 'error', title: 'Could not export', description: classifyGameError(err).message });
    } finally {
      setExporting(false);
    }
  };

  const total = q.data?.total ?? 0;
  const totalPages = q.data?.totalPages ?? 1;
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(total, page * pageSize);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
  );

  const kpis = s
    ? [
        { label: `Hands · ${periodInfo.label}`, value: String(s.bets), sub: `Twenty-One only · ${periodInfo.caption}` },
        { label: 'Wagered', value: <CreditsAmount value={s.wagered} />, sub: 'incl. doubles, splits and insurance · Fees 0.00' },
        { label: 'Net result', value: <CreditsAmount value={s.net} signed />, sub: 'after every payout', tone: toneOfNet(s.net) },
        {
          label: 'Results',
          value: s.outcomes ? `${s.outcomes.win} W · ${s.outcomes.lose} L · ${s.outcomes.push} P` : '—',
          sub: 'wins · losses · pushes by net — each hand is independent',
        },
      ]
    : [];

  return (
    <BjSubpage tab="my-hands" crumb="My hands">
      <dl className="grid grid-cols-2 gap-3 laptop:grid-cols-4 tablet:gap-4" aria-busy={q.isPending}>
        {q.isPending
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)
          : kpis.map((k) => (
              <div key={k.label} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-body-s text-text-secondary">{k.label}</dt>
                  <DemoBadge size="xs" />
                </div>
                <dd className={cn('text-h4 break-words text-text-primary laptop:text-number-l', k.label === 'Results' && 'laptop:text-h4', k.tone)}>
                  {k.value}
                </dd>
                <dd className="text-caption text-text-tertiary">{k.sub}</dd>
              </div>
            ))}
      </dl>

      <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:flex-wrap tablet:px-0" role="group" aria-label="Filter by result">
          {FILTERS.map((f) => (
            <Chip key={f.id} pressed={outcome === f.id} onClick={() => reset(() => setOutcome(f.id))}>
              {f.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 laptop:ml-auto">
          <div role="radiogroup" aria-label="Period" className="inline-flex gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={period === p.id}
                onClick={() => reset(() => setPeriod(p.id))}
                className={cn(
                  'inline-flex h-11 items-center gap-1.5 rounded-sm px-3 text-label-m text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
                  period === p.id && 'bg-surface-raised text-text-primary shadow-elevation-1',
                )}
              >
                {p.id === 'today' && <CalendarDays aria-hidden className="size-4" />}
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="min-h-11 tablet:min-h-10" onClick={() => void exportCsv()} loading={exporting} leadingIcon={<Download aria-hidden />}>
            Export CSV
          </Button>
        </div>
      </div>

      <section aria-labelledby="bj-hand-history" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-default">
        <div className="flex flex-col gap-3 p-4 tablet:flex-row tablet:items-center tablet:p-5">
          <div className="flex items-center gap-2">
            <h2 id="bj-hand-history" className="text-h5 text-text-primary">
              Hand history
            </h2>
            <DemoBadge size="s" label="DEMO DATA" />
          </div>
          <div className="flex flex-col gap-1 tablet:ml-auto tablet:w-72">
            <InputGroup size="m" state={searchInvalid ? 'error' : 'default'} className="min-h-11 tablet:min-h-10">
              <Search aria-hidden className="size-4 text-icon-muted" />
              <InputControl
                value={searchText}
                onChange={(e) => setSearchText(e.target.value.slice(0, 16))}
                placeholder="Search hand ID, e.g. BJ-40517"
                aria-label="Search hand ID or nonce"
                aria-invalid={searchInvalid || undefined}
                autoComplete="off"
                spellCheck={false}
              />
              {searchText && (
                <button type="button" className="flex size-8 items-center justify-center rounded-sm text-icon-muted hover:text-text-primary" aria-label="Clear search" onClick={() => setSearchText('')}>
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </InputGroup>
            {searchInvalid && <p className="text-caption text-text-danger">Use a hand ID like BJ-40517 or a nonce like 418.</p>}
          </div>
        </div>

        {q.isPending ? (
          <div className="flex flex-col gap-2 p-4 tablet:p-5" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : q.isError && !q.data ? (
          <div className="p-4 tablet:p-5">
            <ErrorState error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} what="your hands" variant="inline" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 tablet:p-5">
            {outcome !== 'all' || search ? (
              <EmptyState
                type="no-results"
                title="No hands match these filters"
                description={`Nothing in ${periodInfo.caption} for “${FILTERS.find((f) => f.id === outcome)?.label ?? 'All results'}”${search ? ` and ${search}` : ''}.`}
                actions={
                  <Button variant="secondary" onClick={() => reset(() => { setOutcome('all'); setSearchText(''); })}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                type="no-data"
                title={period === 'all' ? 'No hands yet' : `No hands ${periodInfo.caption}`}
                description="Your Twenty-One hands appear here the moment they settle, with the seeds to verify them."
                actions={
                  <Button asChild>
                    <Link href={BJ_ROUTES.play}>Play Twenty-One</Link>
                  </Button>
                }
              />
            )}
          </div>
        ) : wide ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-y border-border-subtle text-overline text-text-tertiary uppercase">
                  <th scope="col" className="px-5 py-3 font-semibold">Hand</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Bet</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Your hand</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Dealer</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Decisions</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Result</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Net</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Proof</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => {
                  const expanded = open === b.id;
                  return (
                    <React.Fragment key={b.id}>
                      <tr className={cn('border-b border-border-subtle', expanded && 'bg-surface-raised')} data-testid={`bj-row-${b.ref}`}>
                        <td className="px-5 py-3 align-middle">
                          <button
                            type="button"
                            className="flex items-start gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-border-focus"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? 'Hide' : 'Show'} details of ${b.ref}`}
                            onClick={() => setOpen(expanded ? null : b.id)}
                          >
                            <ChevronDown aria-hidden className={cn('mt-0.5 size-4 text-icon-muted transition-transform', expanded && 'rotate-180')} />
                            <span className="flex flex-col">
                              <span className="font-mono text-mono-s text-text-primary">{b.ref}</span>
                              <span className="text-caption text-text-tertiary">{formatDateTimeUTC(b.createdAt, { seconds: true })}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right align-middle">
                          <span className="inline-flex items-center gap-1.5 text-body-m-strong tabular-nums">
                            {formatAmount(b.stake)} <DemoBadge size="xs" />
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <YourHandCell b={b} />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <DealerCell b={b} />
                        </td>
                        <td className="px-3 py-3 align-middle text-body-s text-text-secondary">
                          {b.status === 'settled' ? decisionsSummary(b.outcome) : '—'}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <ResultChip bet={b} />
                        </td>
                        <td className={cn('px-3 py-3 text-right align-middle text-body-m-strong tabular-nums', toneOfNet(b.net))}>
                          {b.status === 'settled' ? formatAmount(b.net, { sign: 'always' }) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right align-middle">
                          {b.status === 'settled' ? (
                            <Button variant="ghost" size="s" asChild className="min-h-9">
                              <Link href={BJ_ROUTES.verify(b.id)}>Verify</Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="s" asChild className="min-h-9">
                              <Link href={BJ_ROUTES.play}>Resume</Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-border-subtle">
                          <td colSpan={8} className="p-0">
                            <HandDetail b={b} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
            {items.map((b) => {
              const expanded = open === b.id;
              return (
                <li key={b.id} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : b.id)}
                    className="flex flex-col gap-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-border-focus"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-mono-s text-text-primary">{b.ref}</span>
                      <span className="text-caption text-text-tertiary">{formatTimeUTC(b.createdAt)}</span>
                      <span className={cn('ml-auto text-body-m-strong tabular-nums', toneOfNet(b.net))}>
                        {b.status === 'settled' ? formatAmount(b.net, { sign: 'always' }) : '—'}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <YourHandCell b={b} />
                      <span className="text-caption text-text-tertiary">vs</span>
                      <DealerCell b={b} />
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <ResultChip bet={b} />
                      <span className="text-caption text-text-secondary">
                        Bet {formatAmount(b.stake)} DEMO · {b.status === 'settled' ? decisionsSummary(b.outcome) : 'in play'}
                      </span>
                    </span>
                  </button>
                  {expanded && <HandDetail b={b} />}
                </li>
              );
            })}
          </ul>
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border-subtle p-4 tablet:flex-row tablet:items-center tablet:px-5">
            <label className="flex items-center gap-2 text-caption text-text-secondary">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => reset(() => setPageSize(Number(e.target.value)))}
                className="h-10 rounded-md border border-border-default bg-surface-default px-2 text-body-s text-text-primary"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-body-s text-text-secondary">
              {first}–{last} of {total} hand{total === 1 ? '' : 's'}
            </span>
            <nav aria-label="Pages" className="flex items-center gap-1 tablet:ml-auto">
              <Button variant="ghost" size="s" className="min-h-11 min-w-11 tablet:min-h-9" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                <ChevronLeft aria-hidden />
              </Button>
              {pages.map((n, i) => (
                <React.Fragment key={n}>
                  {i > 0 && n - pages[i - 1]! > 1 && <span className="px-1 text-text-tertiary">…</span>}
                  <Button
                    variant={n === page ? 'secondary' : 'ghost'}
                    size="s"
                    className={cn('min-h-11 min-w-11 tablet:min-h-9', n === page && 'border-border-brand text-text-brand')}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                </React.Fragment>
              ))}
              <Button variant="ghost" size="s" className="min-h-11 min-w-11 tablet:min-h-9" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <ShieldCheck aria-hidden className="mt-px size-4 shrink-0" />
        Hands settle the moment they finish and can never be edited. Each hand keeps its seed pair, so you can verify it at
        any time; export it as CSV for your records. DEMO credits have no cash value.
      </p>
    </BjSubpage>
  );
}

// ── BJ-07 Rules ─────────────────────────────────────────────────────────────────────────────────

const UP = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const;
type Move = 'H' | 'S' | 'D';
const STRATEGY_ROWS = ['17+', '16', '15', '14', '13', '12', '11', '10', '9', '≤8'] as const;

/** Basic strategy, hard totals — 6 decks, S17, double after split (published guidance; it never changes a card). */
function basicMove(row: (typeof STRATEGY_ROWS)[number], up: (typeof UP)[number]): Move {
  const u = up === 'A' ? 11 : Number(up);
  switch (row) {
    case '17+':
      return 'S';
    case '16':
    case '15':
    case '14':
    case '13':
      return u <= 6 ? 'S' : 'H';
    case '12':
      return u >= 4 && u <= 6 ? 'S' : 'H';
    case '11':
      return u <= 10 ? 'D' : 'H';
    case '10':
      return u <= 9 ? 'D' : 'H';
    case '9':
      return u >= 3 && u <= 6 ? 'D' : 'H';
    case '≤8':
      return 'H';
  }
}

const MOVE_CLASS: Record<Move, string> = {
  H: 'bg-bg-secondary text-text-secondary',
  S: 'bg-brand-tint text-text-brand',
  D: 'bg-status-info-tint text-text-info',
};

function Card({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-6', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-h4 text-text-primary">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** BJ-07 — How to play, table rules, payouts (computed with decimal.js), basic strategy chart, RG card. */
export function BjRulesPage() {
  const ex = payoutTable('10.00');
  const steps = [
    ['Place your bet', `Pick a chip and tap the bet spot — ${formatAmount(INFO.minBet)} to ${formatAmount(INFO.maxBet)} DEMO per hand.`],
    ['Get your cards', 'You get two cards face up. The dealer shows one and keeps one face down.'],
    ['Make your move', 'Hit, Stand, Double (one card, twice the stake) or Split a pair.'],
    ['Dealer plays', 'Dealer draws to 16 and stands on every 17. Closest to 21 wins.'],
  ];
  const rules: [string, React.ReactNode][] = [
    ['Decks', '6 decks (312 cards), freshly shuffled before every hand'],
    ['Dealer on soft 17', 'Stands (S17)'],
    ['Dealer peek', 'Yes — checks for blackjack with an Ace or 10-value card up'],
    ['Double down', 'Any first two cards, also after a split'],
    ['Split', 'Once (two hands max) · split Aces get one card each'],
    ['21 after a split', 'Counts as 21, not blackjack'],
    ['Insurance', 'Offered on a dealer Ace · costs half your bet · pays 2:1'],
    ['Surrender', 'Not offered'],
    [
      'Limits',
      <span key="l" className="inline-flex items-center gap-1.5">
        {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)} DEMO per hand <DemoBadge size="xs" />
      </span>,
    ],
    ['House edge', `≈${INFO.houseEdgePercent}% with basic strategy (RTP ≈${INFO.rtpPercent}%)`],
    ['Unfinished hands', 'Stay open on the server until you finish them — reopen Twenty-One on any device'],
    ['Fees', '0.00 DEMO — the house edge is the only cost'],
  ];
  const payouts: [string, string, React.ReactNode][] = [
    ['Win', '1:1', <CreditsAmount key="w" value={ex.win} />],
    ['Blackjack (Ace + 10-value card)', '3:2', <CreditsAmount key="b" value={ex.blackjack} />],
    ['Push (same total)', 'Stake back', <CreditsAmount key="p" value={ex.push} />],
    [
      'Insurance, dealer has blackjack',
      '2:1',
      <span key="i">
        <CreditsAmount value={ex.insuranceReturn} /> on a <CreditsAmount value={ex.insuranceStake} /> side bet
      </span>,
    ],
    ['Lose or bust', '—', <CreditsAmount key="l" value="0.00" />],
  ];
  return (
    <BjSubpage tab="rules" crumb="Rules" membersOnly={false}>
      <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_340px] tablet:gap-6">
        <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">
          <Card title="How to play">
            <ol className="grid gap-3 tablet:grid-cols-2 laptop:grid-cols-4">
              {steps.map(([t, d], i) => (
                <li key={t} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">{i + 1}</span>
                  <span className="text-body-m-strong text-text-primary">{t}</span>
                  <span className="text-body-s text-text-secondary">{d}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Table rules" aside={<span className="text-caption text-text-tertiary">rules {INFO.rulesVersion}</span>}>
            <dl className="flex flex-col divide-y divide-border-subtle">
              {rules.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 py-3 tablet:flex-row tablet:items-center tablet:justify-between tablet:gap-6">
                  <dt className="text-body-s text-text-secondary">{k}</dt>
                  <dd className="text-body-s-strong text-text-primary tablet:text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Payouts" aside={<DemoBadge size="s" />}>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[520px] text-left" data-testid="bj-payout-table">
                <thead>
                  <tr className="border-b border-border-subtle text-overline text-text-tertiary uppercase">
                    <th scope="col" className="py-2 pr-3 font-semibold">Outcome</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Pays</th>
                    <th scope="col" className="py-2 text-right font-semibold">Returned on a 10.00 bet</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(([o, p, r]) => (
                    <tr key={o} className="border-b border-border-subtle last:border-0">
                      <td className="py-3 pr-3 text-body-s text-text-primary">{o}</td>
                      <td className="py-3 pr-3 text-body-s-strong text-text-primary">{p}</td>
                      <td className="py-3 text-right text-body-s-strong text-text-primary">{r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-caption text-text-tertiary">
              You can lose your stake. Outcomes come from a provably-fair shuffle that you can verify after every hand. Each
              hand is independent — past results never change the odds.
            </p>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">
          <Card title="Basic strategy · hard totals">
            <p className="text-caption text-text-secondary">
              Your total (rows) against the dealer’s up-card (columns). 6 decks, S17, double after split.
            </p>
            <div className="relative overflow-x-auto">
              <table className="w-full border-separate border-spacing-0.5 text-center text-caption" aria-label="Basic strategy for hard totals">
                <thead>
                  <tr>
                    <th scope="col" className="px-1 text-left font-normal text-text-tertiary">You</th>
                    {UP.map((u) => (
                      <th key={u} scope="col" className="px-0.5 font-normal text-text-tertiary">
                        {u}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STRATEGY_ROWS.map((r) => (
                    <tr key={r}>
                      <th scope="row" className="px-1 text-left font-normal text-text-secondary">
                        {r}
                      </th>
                      {UP.map((u) => {
                        const m = basicMove(r, u);
                        return (
                          <td key={u} className={cn('h-6 min-w-6 rounded-sm font-semibold', MOVE_CLASS[m])}>
                            <span aria-label={m === 'H' ? 'Hit' : m === 'S' ? 'Stand' : 'Double, else hit'}>{m}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-secondary">
              <span>
                <span className={cn('rounded-sm px-1.5 font-semibold', MOVE_CLASS.H)}>H</span> Hit
              </span>
              <span>
                <span className={cn('rounded-sm px-1.5 font-semibold', MOVE_CLASS.S)}>S</span> Stand
              </span>
              <span>
                <span className={cn('rounded-sm px-1.5 font-semibold', MOVE_CLASS.D)}>D</span> Double (else hit)
              </span>
            </p>
            <p className="text-caption text-text-tertiary">
              Basic strategy lowers the house edge to about {INFO.houseEdgePercent}%. It never guarantees a win — every hand
              is independent.
            </p>
          </Card>
          <Card title="Play within your limits">
            <p className="text-body-s text-text-secondary">
              Set a daily loss or session limit before you play. Lowering a limit is instant; raising one waits 24 hours. 18+
              only.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" asChild className="min-h-11" leadingIcon={<SlidersHorizontal aria-hidden />}>
                <Link href={GAMES_ROUTES.responsibleGaming}>Set limits</Link>
              </Button>
              <Button variant="ghost" asChild className="min-h-11" leadingIcon={<PauseCircle aria-hidden />}>
                <Link href={GAMES_ROUTES.coolingOff}>Take a break</Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-caption text-text-tertiary">
              <AgeBadge /> Licence required · permitted regions only · DEMO credits have no cash value
            </p>
          </Card>
          <Button asChild size="l" className="min-h-12">
            <Link href={BJ_ROUTES.play}>Play Twenty-One (DEMO credits)</Link>
          </Button>
        </div>
      </div>
    </BjSubpage>
  );
}
