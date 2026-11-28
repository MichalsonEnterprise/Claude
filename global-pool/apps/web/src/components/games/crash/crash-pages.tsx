'use client';

import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { formatAmount, money } from '@gp/shared/money';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Code2,
  Copy,
  Flag,
  Info,
  Lock,
  Rocket,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import {
  CreditsAmount,
  GameHeader,
  GameSessionBar,
  KitChip,
  LicenceLine,
  useGameGate,
} from '@/components/games/kit';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field, InputControl, InputGroup, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  useCrashMyBets,
  useCrashRounds,
  useCrashStats,
  useCrashVerification,
  type CrashRoundRow,
  type CrashStatsPeriod,
} from '@/lib/api/orbit-rush';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { INFO, MAX_MULTIPLIER, SLUG, fmtX, shortHash, verifyRoundInBrowser, type RoundCheck as Check } from './crash-math';
import { CardShell, PointPill, SummaryRow } from './crash-parts';
import { CRASH_ROUTES } from './routes';

// ── sub-page frame (CR-05 / CR-07 tabs) ───────────────────────────────────────────────────────

const TABS = [
  { href: CRASH_ROUTES.play, label: 'Play' },
  { href: CRASH_ROUTES.rounds, label: 'Round history' },
  { href: CRASH_ROUTES.myBets, label: 'My bets' },
  { href: CRASH_ROUTES.statistics, label: 'Statistics' },
  { href: CRASH_ROUTES.fairness, label: 'Provably fair' },
] as const;

export function CrashSubpage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const gate = useGameGate();
  const mine = useCrashMyBets(1, 1);
  return (
    <div className="flex flex-col gap-5 tablet:gap-6">
      <ShellOverride collapseSidebar restricted={gate.gate === 'region'} />
      <GameHeader
        slug={SLUG}
        title="Orbit Rush"
        mechanic="Crash · cash out before it crashes"
        icon={Rocket}
        onFairness={() => router.push(CRASH_ROUTES.fairness)}
        chips={
          <>
            <KitChip icon={TrendingUp}>Max {fmtX(MAX_MULTIPLIER)}</KitChip>
            <KitChip icon={Wallet}>
              Bet {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)} DEMO
            </KitChip>
          </>
        }
      />
      <nav aria-label="Orbit Rush" className="no-scrollbar -mx-4 overflow-x-auto border-b border-border-subtle px-4 tablet:mx-0 tablet:px-0">
        <ul className="flex gap-1">
          {TABS.map((t) => {
            const active = t.href === pathname;
            return (
              <li key={t.label}>
                <Link
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    '-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-label-l text-text-secondary hover:text-text-primary',
                    active ? 'border-brand-primary text-text-primary' : 'border-transparent',
                  )}
                >
                  {t.label}
                  {t.label === 'My bets' && mine.data && (
                    <span className="rounded-full bg-surface-raised px-1.5 text-label-s text-text-secondary">{mine.data.total}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
      {gate.gate !== 'guest' && <GameSessionBar data={gate.credits} lossLimit={gate.lossLimit} loading={gate.gate === 'loading'} />}
      <LicenceLine className="rounded-lg border border-border-subtle px-4 py-3" />
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPage,
  label,
  pageSize,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  label: string;
  pageSize: number;
  onPageSize: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 tablet:flex-row tablet:items-center">
      <div className="flex items-center gap-3">
        <span className="text-caption text-text-tertiary">Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger size="s" aria-label="Rows per page" className="min-h-11 w-20 tablet:min-h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[12, 25, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-body-s text-text-secondary">{label}</span>
      </div>
      <div className="flex items-center gap-2 tablet:ml-auto">
        <span className="hidden text-caption text-text-tertiary laptop:inline">Newest first</span>
        <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-9" disabled={page <= 1} onClick={() => onPage(page - 1)} leadingIcon={<ChevronLeft aria-hidden />}>
          Previous
        </Button>
        <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-9" disabled={page >= totalPages} onClick={() => onPage(page + 1)} trailingIcon={<ChevronRight aria-hidden />}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ── CR-05 Round history + Game statistics ─────────────────────────────────────────────────────

type Window = 'last50' | 'today' | '7d';

function windowFrom(w: Window, now: number): string | undefined {
  if (w === 'today') {
    const d = new Date(now);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
  }
  if (w === '7d') return new Date(now - 7 * 86_400_000).toISOString();
  return undefined;
}

export function RoundHistoryPage() {
  const [win, setWin] = React.useState<Window>('last50');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [search, setSearch] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [anchor] = React.useState(() => Date.now());
  const from = windowFrom(win, anchor);
  const q = useCrashRounds(page, pageSize, { from, search: query || undefined });
  const total = q.data ? (win === 'last50' && !query ? Math.min(q.data.total, 50) : q.data.total) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = (q.data?.items ?? []).slice(0, win === 'last50' && !query ? Math.max(0, 50 - (page - 1) * pageSize) : undefined);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const v = search.trim();
      setQuery(/^(CR-?)?\d{1,9}$/i.test(v) ? v.toUpperCase() : '');
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  return (
    <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_400px] laptop:items-start">
      <CardShell className="gap-4 p-4 tablet:p-5" aria-labelledby="cr-history">
        <div className="flex flex-col gap-3 desktop:flex-row desktop:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 id="cr-history" className="text-h4 text-text-primary">
                Round history
              </h2>
              <DemoBadge size="s" />
            </div>
            <p className="text-body-s text-text-secondary">Every Orbit Rush round, newest first. Verify any result in one click.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Period" className="inline-grid grid-cols-3 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
              {(
                [
                  ['last50', 'Last 50'],
                  ['today', 'Today'],
                  ['7d', '7 days'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={win === k}
                  onClick={() => {
                    setWin(k);
                    setPage(1);
                  }}
                  className={cn(
                    'h-11 rounded-sm px-3 text-label-m text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
                    win === k && 'border border-border-brand bg-brand-tint text-text-brand',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <InputGroup size="m" className="w-full tablet:w-56">
              <Search aria-hidden className="size-4 text-icon-muted" />
              <InputControl value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search round ID" aria-label="Search round ID (e.g. CR-55102)" />
            </InputGroup>
          </div>
        </div>

        {q.isError && !q.data ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} what="the round history" />
        ) : q.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          query ? (
            <EmptyState type="no-results" title={`No finished round ${query}`} description="Rounds appear here once they have crashed and their seed is revealed." actions={<Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>} />
          ) : (
            <EmptyState type="no-data" title="No finished rounds in this period" description="Crashed rounds appear here with their revealed seed and crash point." />
          )
        ) : (
          <>
            <table className="hidden w-full text-body-s lg:table" data-testid="rounds-table">
              <thead>
                <tr className="bg-bg-secondary text-left text-overline text-text-tertiary uppercase">
                  <th scope="col" className="rounded-l-md px-3 py-3 font-semibold">Round</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Crash point</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Players</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Wagered</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Paid out</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Ended (UTC)</th>
                  <th scope="col" className="rounded-r-md px-3 py-3 text-right font-semibold">Verify</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={r.id} className={cn('border-b border-border-subtle/60', i === 0 && page === 1 && 'bg-surface-raised/50')}>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2 font-mono text-mono-s text-text-primary">
                        {r.ref} <DemoBadge size="xs" />
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <PointPill value={r.crashPoint ?? '0.00'} className="h-7" />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{r.players}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{formatAmount(r.wagered)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-primary">{formatAmount(r.paidOut)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{r.crashedAt ? formatTimeUTC(r.crashedAt, { seconds: true }).replace(' UTC', '') : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={CRASH_ROUTES.verify(r.number)} className="inline-flex items-center gap-1 text-label-m text-text-brand hover:underline" aria-label={`Verify round ${r.ref}`}>
                        <ShieldCheck aria-hidden className="size-4" /> Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="flex flex-col gap-2 lg:hidden" data-testid="rounds-cards">
              {items.map((r) => (
                <RoundCard key={r.id} r={r} />
              ))}
            </ul>
            <p className="text-caption text-text-tertiary">Wagered and paid out are DEMO credits · no cash value.</p>
            <Pager
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              pageSize={pageSize}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              label={`${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + items.length} of ${total.toLocaleString('en-US')} rounds${win === 'today' ? ' today' : ''}`}
            />
          </>
        )}
      </CardShell>
      <div className="flex flex-col gap-5">
        <StatisticsCard />
        <MySessionCard />
      </div>
    </div>
  );
}

function RoundCard({ r }: { r: CrashRoundRow }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2 font-mono text-mono-s text-text-primary">
          {r.ref} <DemoBadge size="xs" />
        </span>
        <span className="text-caption text-text-tertiary">
          {r.players} {r.players === 1 ? 'player' : 'players'} · {formatAmount(r.wagered)} wagered · {formatAmount(r.paidOut)} paid ·{' '}
          {r.crashedAt ? formatTimeUTC(r.crashedAt, { seconds: true }) : '—'}
        </span>
      </div>
      <PointPill value={r.crashPoint ?? '0.00'} />
      <Link href={CRASH_ROUTES.verify(r.number)} className="inline-flex size-11 items-center justify-center rounded-md text-text-brand" aria-label={`Verify round ${r.ref}`}>
        <ShieldCheck aria-hidden className="size-5" />
      </Link>
    </li>
  );
}

function StatisticsCard() {
  const [period, setPeriod] = React.useState<CrashStatsPeriod>('24h');
  const q = useCrashStats(period);
  const s = q.data;
  const maxShare = Math.max(1, ...(s?.buckets ?? []).flatMap((b) => [Number(b.share), Number(b.expected)]));
  return (
    <CardShell id="statistics" className="scroll-mt-24 gap-4 p-4 tablet:p-5" aria-labelledby="cr-stats">
      <div className="flex items-center justify-between gap-2">
        <h2 id="cr-stats" className="text-h4 text-text-primary">
          Game statistics
        </h2>
        <DemoBadge size="s" />
      </div>
      <div role="radiogroup" aria-label="Statistics period" className="grid grid-cols-3 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
        {(['24h', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={period === p}
            onClick={() => setPeriod(p)}
            className={cn('h-11 rounded-sm text-label-m text-text-secondary hover:text-text-primary tablet:h-9', period === p && 'border border-border-brand bg-brand-tint text-text-brand')}
          >
            {p}
          </button>
        ))}
      </div>
      {q.isError && !s ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} what="the statistics" variant="inline" />
      ) : !s ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3" data-testid="crash-stats">
            <Kpi label="Rounds played" value={s.rounds.toLocaleString('en-US')} sub={`last ${s.period}`} />
            <Kpi label="Median crash" value={fmtX(s.median)} sub={`expected ${fmtX(s.expectedMedian)}`} />
            <Kpi label="Rounds reaching 2.00×" value={`${Number(s.reach2.share).toFixed(1)}%`} sub={`expected ${Number(s.reach2.expected).toFixed(1)}%`} />
            <Kpi label="Highest crash" value={s.highest ? fmtX(s.highest.crashPoint) : '—'} sub={s.highest ? `round ${s.highest.ref}` : 'no rounds yet'} />
          </div>
          <div className="flex flex-col gap-3 rounded-lg bg-bg-secondary p-4">
            <p className="text-body-s-strong text-text-primary">Crash point distribution · {s.rounds.toLocaleString('en-US')} rounds</p>
            <p className="flex items-center gap-4 text-caption text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-brand-primary" /> Observed
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-0.5 bg-text-primary" /> Expected (99% ÷ m)
              </span>
            </p>
            <ul className="flex flex-col gap-2.5">
              {s.buckets.map((b) => (
                <li key={b.label} className="grid grid-cols-[92px_minmax(0,1fr)_48px] items-center gap-2 text-caption">
                  <span className="text-text-secondary tabular-nums">{b.label}</span>
                  <span className="relative h-3 rounded-full bg-surface-raised" role="img" aria-label={`${b.label}: observed ${b.share}%, expected ${b.expected}%`}>
                    <span className="absolute inset-y-0 left-0 rounded-full bg-brand-primary" style={{ width: `${(Number(b.share) / maxShare) * 100}%` }} />
                    <span className="absolute -top-0.5 h-4 w-0.5 bg-text-primary" style={{ left: `${(Number(b.expected) / maxShare) * 100}%` }} />
                  </span>
                  <span className="text-right text-text-primary tabular-nums">{Number(b.share).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-status-info-tint p-3 text-caption text-text-secondary">
        <Info aria-hidden className="mt-px size-4 shrink-0 text-text-info" />
        Every round is independent. A run of low crashes does not make a high one “due” — the chance of reaching m is
        always 99% ÷ m.
      </p>
    </CardShell>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-bg-secondary p-3">
      <span className="text-caption text-text-tertiary">{label}</span>
      <span className="text-number-m text-text-primary tabular-nums">{value}</span>
      <span className="text-caption text-text-tertiary">{sub}</span>
    </div>
  );
}

/** "Your session · Orbit Rush" — my crash bets since the RG session started (DEMO credits). */
function MySessionCard() {
  const auth = useAuth();
  const gate = useGameGate();
  const from = gate.credits?.session.startedAt ?? undefined;
  const q = useCrashMyBets(1, 1, { from }, !!from);
  if (auth.status !== 'member') return null;
  const s = q.data?.summary;
  return (
    <CardShell className="gap-2.5 p-4 tablet:p-5" aria-labelledby="cr-my-session">
      <div className="flex items-center gap-2">
        <User aria-hidden className="size-4 text-icon-muted" />
        <h2 id="cr-my-session" className="text-body-m-strong text-text-primary">
          Your session · Orbit Rush
        </h2>
        <DemoBadge size="xs" className="ml-auto" />
      </div>
      {!from ? (
        <p className="text-body-s text-text-tertiary">No session yet — your Orbit Rush totals appear here once you play.</p>
      ) : !s ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <>
          <SummaryRow label="Bets" value={String(s.bets)} />
          <SummaryRow label="Wagered" value={<CreditsAmount value={s.wagered} />} />
          <SummaryRow label="Returned" value={<CreditsAmount value={s.returned} />} />
          <SummaryRow label="Net result" value={<CreditsAmount value={s.net} signed />} tone={money(s.net).lt(0) ? 'danger' : money(s.net).gt(0) ? 'success' : undefined} />
          <SummaryRow label="Best cash-out" value={s.bestCashOut ? fmtX(s.bestCashOut) : '—'} />
        </>
      )}
    </CardShell>
  );
}

// ── My bets ───────────────────────────────────────────────────────────────────────────────────

export function MyCrashBetsPage() {
  const auth = useAuth();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [result, setResult] = React.useState<'all' | 'win' | 'lose'>('all');
  const q = useCrashMyBets(page, pageSize, { result: result === 'all' ? undefined : result });
  if (auth.status === 'guest') {
    return (
      <CardShell className="p-6">
        <EmptyState
          type="no-data"
          title="Sign in to see your Orbit Rush bets"
          description="Your bets, cash-outs and results appear here with a link to verify every round."
          actions={<Button onClick={() => auth.signIn()}>Sign in</Button>}
        />
      </CardShell>
    );
  }
  const s = q.data?.summary;
  return (
    <CardShell className="gap-4 p-4 tablet:p-5" aria-labelledby="cr-my-bets">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="cr-my-bets" className="text-h4 text-text-primary">
          My bets
        </h2>
        <DemoBadge size="s" />
        <div role="radiogroup" aria-label="Result" className="ml-auto inline-grid grid-cols-3 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
          {(
            [
              ['all', 'All'],
              ['win', 'Cashed out'],
              ['lose', 'Lost'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={result === k}
              onClick={() => {
                setResult(k);
                setPage(1);
              }}
              className={cn('h-11 rounded-sm px-3 text-label-m text-text-secondary tablet:h-9', result === k && 'border border-border-brand bg-brand-tint text-text-brand')}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {s && (
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4" data-testid="my-bets-summary">
          <Kpi label="Bets" value={String(s.bets)} sub={`${s.wins} cashed out · ${s.losses} lost`} />
          <Kpi label="Wagered" value={formatAmount(s.wagered)} sub="DEMO credits" />
          <Kpi label="Returned" value={formatAmount(s.returned)} sub="DEMO credits" />
          <Kpi label="Net" value={`${money(s.net).gt(0) ? '+' : ''}${formatAmount(s.net)}`} sub={s.bestCashOut ? `best cash-out ${fmtX(s.bestCashOut)}` : 'DEMO credits'} />
        </div>
      )}
      {q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} what="your bets" />
      ) : q.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : !q.data?.items.length ? (
        <EmptyState
          type="no-data"
          title={result === 'all' ? 'No Orbit Rush bets yet' : 'No bets match this filter'}
          description="Place a bet in the next betting window — your results appear here."
          actions={
            <Button asChild>
              <Link href={CRASH_ROUTES.play}>Play Orbit Rush</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-body-s" data-testid="my-bets-table">
              <thead>
                <tr className="bg-bg-secondary text-left text-overline text-text-tertiary uppercase">
                  <th scope="col" className="rounded-l-md px-3 py-3 font-semibold">Bet</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Round</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Stake</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Target</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Cashed out</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Net</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Placed (UTC)</th>
                  <th scope="col" className="rounded-r-md px-3 py-3 text-right font-semibold">Verify</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((b) => (
                  <tr key={b.id} className="border-b border-border-subtle/60">
                    <td className="px-3 py-2.5 font-mono text-mono-s text-text-primary">{b.ref}</td>
                    <td className="px-3 py-2.5 text-text-secondary">CR-{b.round.number}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatAmount(b.stake)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{b.autoCashOut ? fmtX(b.autoCashOut) : 'Manual'}</td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', b.cashOutMultiplier ? 'text-text-brand' : 'text-text-tertiary')}>
                      {b.status === 'cashed_out' ? `${fmtX(b.cashOutMultiplier)} · ${b.cashOutKind}` : b.status === 'lost' ? 'Lost' : 'In play'}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', money(b.net).gt(0) ? 'text-text-success' : money(b.net).lt(0) ? 'text-text-danger' : 'text-text-primary')}>
                      {b.status === 'active' ? '—' : `${money(b.net).gt(0) ? '+' : ''}${formatAmount(b.net)}`}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{formatDateTimeUTC(b.createdAt).replace(' UTC', '')}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={CRASH_ROUTES.verify(b.round.number)} className="inline-flex min-h-11 items-center gap-1 text-label-m text-text-brand hover:underline tablet:min-h-0" aria-label={`Verify round CR-${b.round.number}`}>
                        <ShieldCheck aria-hidden className="size-4" /> Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            totalPages={q.data.totalPages}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            label={`${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + q.data.items.length} of ${q.data.total} bets · DEMO credits`}
          />
        </>
      )}
    </CardShell>
  );
}

// ── CR-07 Provably-fair verification (browser re-derivation with @gp/shared/fair) ─────────────

export function CrashFairnessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const latest = useCrashRounds(1, 5);
  const requested = Number(params.get('round') ?? '');
  const n = Number.isSafeInteger(requested) && requested > 0 ? requested : (latest.data?.items[0]?.number ?? null);
  const v = useCrashVerification(n);
  const [roundInput, setRoundInput] = React.useState('');
  const [seed, setSeed] = React.useState('');
  const [check, setCheck] = React.useState<Check | null>(null);

  React.useEffect(() => {
    if (n) setRoundInput(`CR-${n}`);
  }, [n]);
  React.useEffect(() => {
    if (v.data?.seed) {
      setSeed(v.data.seed);
      setCheck(verifyRoundInBrowser(v.data.seed, v.data));
    } else {
      setSeed('');
      setCheck(null);
    }
  }, [v.data]);

  const goRound = (e: React.FormEvent) => {
    e.preventDefault();
    const m = /^(?:CR-?)?(\d{1,9})$/i.exec(roundInput.trim());
    if (m) router.push(CRASH_ROUTES.verify(Number(m[1])));
  };
  const data = v.data;
  const recorded = data?.round.crashPoint ?? null;
  const matches = !!check && check.commitmentOk && check.chainOk && !!check.computed && check.computed.crashPoint === recorded;

  return (
    <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_400px] laptop:items-start">
      <CardShell className={cn('gap-4 p-4 tablet:p-5', matches && 'border-border-brand')} aria-labelledby="cr-verify">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-1 size-5 shrink-0 text-icon-brand" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 id="cr-verify" className="text-h4 text-text-primary">
              Verify round {n ? `CR-${n}` : ''}
            </h2>
            <p className="text-caption text-text-tertiary">Recompute this Orbit Rush crash point — runs in your browser, nothing is sent to us</p>
          </div>
          <DemoBadge size="s" />
        </div>
        <form onSubmit={goRound} className="grid gap-3 tablet:grid-cols-2">
          <Field label="Game">
            <InputGroup size="l">
              <InputControl value="Orbit Rush" readOnly aria-readonly />
            </InputGroup>
          </Field>
          <Field label="Round ID" helper="e.g. CR-55102 — press Enter to load">
            <InputGroup size="l">
              <InputControl value={roundInput} onChange={(e) => setRoundInput(e.target.value)} className="font-mono" data-testid="verify-round-input" />
              <Button type="submit" variant="ghost" size="s" className="min-h-11 tablet:min-h-8">
                Load
              </Button>
            </InputGroup>
          </Field>
        </form>

        {latest.isError && !n ? (
          <ErrorState error={latest.error} onRetry={() => void latest.refetch()} what="the rounds" />
        ) : v.isError ? (
          <ErrorState error={v.error} onRetry={() => void v.refetch()} what={`round CR-${n}`} />
        ) : !data ? (
          n === null && latest.data ? (
            <EmptyState type="no-data" title="No finished rounds yet" description="The first round appears here once it has crashed." />
          ) : (
            <Skeleton className="h-80 w-full" />
          )
        ) : !data.revealed ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4" role="status">
            <p className="flex items-center gap-2 text-body-s-strong text-text-primary">
              <Lock aria-hidden className="size-4" /> The seed is still secret
            </p>
            <p className="text-body-s text-text-secondary">
              Round CR-{data.round.number} hasn’t crashed yet. Its commitment is already published — the seed is revealed the moment the round crashes, then you can verify it here.
            </p>
            <SeedBox label="Server seed hash (published before bets opened)" value={data.round.commitment} locked />
          </div>
        ) : (
          <>
            <Field label="Server seed (revealed)" helper="Edit it to see a mismatch — the check runs again as you type.">
              <Textarea
                value={seed}
                onChange={(e) => {
                  setSeed(e.target.value);
                  setCheck(verifyRoundInBrowser(e.target.value, data));
                }}
                rows={2}
                className={cn('font-mono text-mono-s', check && (check.commitmentOk ? 'border-border-brand' : 'border-border-danger'))}
                data-testid="verify-seed"
                aria-label="Revealed server seed"
              />
            </Field>
            <SeedBox label="Server seed hash (published before bets opened)" value={data.round.commitment} locked />
            <div className="grid gap-3 tablet:grid-cols-[minmax(0,1fr)_140px]">
              <SeedBox label="Public salt (same for every round of this chain)" value={data.chain.salt} />
              <SeedBox label="Chain position" value={String(data.chain.index)} />
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-bg-secondary p-4" data-testid="verify-result">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-caption text-text-tertiary">SHA-256(revealed seed)</span>
                  <code className="font-mono text-mono-s text-text-primary">{check ? shortHash(check.hash, 16, 8) : '—'}</code>
                </div>
                <StatusChip ok={!!check?.commitmentOk} okText="Matches commitment" badText="Doesn’t match the commitment" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <span className="text-caption text-text-tertiary">Hash chain: seed hashed {data.chain.index.toLocaleString('en-US')}× = chain commitment {shortHash(data.chain.commitment, 8, 6)}</span>
                <StatusChip ok={!!check?.chainOk} okText="Chain verified" badText="Not on the chain" />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border-subtle pt-3">
                <div className="flex flex-col">
                  <span className="text-caption text-text-tertiary">Computed result</span>
                  <span className="text-h3 text-text-primary tabular-nums" data-testid="verify-computed">
                    {check?.computed ? `Crash point ${fmtX(check.computed.crashPoint)}` : '—'}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-caption text-text-tertiary">Recorded for CR-{data.round.number}</span>
                  <span className="text-body-m text-text-primary">Crash point {fmtX(recorded)}</span>
                </div>
              </div>
            </div>
            {matches ? (
              <div className="flex items-start gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle p-4" role="status" data-testid="verify-verdict" data-ok="true">
                <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
                <div className="flex flex-col gap-1">
                  <p className="text-body-m-strong text-text-brand">Verified — the crash point was fixed before bets opened</p>
                  <p className="text-body-s text-text-secondary">
                    The revealed seed hashes to the commitment published before round CR-{data.round.number} opened, sits on the published hash chain, and
                    HMAC-SHA256(seed, public salt) reproduces a {fmtX(recorded)} crash — the recorded result.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border-danger bg-status-danger-tint p-4" role="alert" data-testid="verify-verdict" data-ok="false">
                <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-text-danger" />
                <div className="flex flex-col gap-1">
                  <p className="text-body-m-strong text-text-danger">Doesn’t match</p>
                  <p className="text-body-s text-text-secondary">
                    With this seed the result can’t be reproduced. Restore the revealed seed to check the round again — if the
                    published values themselves don’t match, report the round.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                leadingIcon={<ShieldCheck aria-hidden />}
                onClick={() => {
                  if (data.seed) {
                    setSeed(data.seed);
                    setCheck(verifyRoundInBrowser(data.seed, data));
                  }
                }}
                data-testid="verify-again"
              >
                Verify again
              </Button>
              <a href="#how" className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-brand hover:underline">
                <BookOpen aria-hidden className="size-4" /> How verification works
              </a>
            </div>
          </>
        )}
      </CardShell>

      <div className="flex flex-col gap-5">
        <CardShell id="how" className="scroll-mt-24 gap-4 p-4 tablet:p-5" aria-labelledby="cr-how-made">
          <h2 id="cr-how-made" className="text-h4 text-text-primary">
            How an Orbit Rush crash point is made
          </h2>
          <ol className="flex flex-col gap-3">
            {[
              ['Commit', `Before bets open we publish the SHA-256 hash of this round’s seed${data ? ` (${shortHash(data.round.commitment)})` : ''}. Seeds come from a hash chain: each seed is the hash of the next one, so none can be swapped later.`],
              ['Lock', `Bets close when the round starts${data ? ` (${formatTimeUTC(data.round.startedAt, { seconds: true })})` : ''}. From here nothing anyone does — including us — can change the result.`],
              ['Compute', 'The crash point comes from HMAC-SHA256(round seed, public salt). About 1 in 100 rounds ends at 1.00× instantly; otherwise crash = floor(100·2⁵² ÷ (2⁵² − H)) ÷ 100, capped at 1,000.00×. That is the 1.00% house edge — identical for every player.'],
              ['Reveal', 'After the crash we reveal the seed. Hash it yourself: if it matches the commitment, the round was fixed in advance.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint-subtle text-label-s text-text-brand">{i + 1}</span>
                <span className="flex flex-col">
                  <span className="text-body-s-strong text-text-primary">{t}</span>
                  <span className="text-caption text-text-secondary">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-1 rounded-lg bg-bg-secondary p-3 font-mono text-mono-s text-text-secondary">
            <span className="font-sans text-caption text-text-tertiary">Check it yourself</span>
            <code>sha256(revealed_seed) == committed_hash</code>
            <code>crash = crashPointOf(seed, salt)</code>
            <code className="text-text-tertiary">// @gp/shared/fair — the same code the server settles with</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-9">
              <Link href="/provably-fair">
                <Code2 aria-hidden /> How provably fair works
              </Link>
            </Button>
            <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-9">
              <Link href={CRASH_ROUTES.details}>
                <BookOpen aria-hidden /> Published rules
              </Link>
            </Button>
          </div>
        </CardShell>

        <CardShell className="gap-3 p-4 tablet:p-5" aria-labelledby="cr-verify-another">
          <div className="flex items-center justify-between">
            <h2 id="cr-verify-another" className="text-h5 text-text-primary">
              Verify another round
            </h2>
            <DemoBadge size="s" />
          </div>
          {latest.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ul className="flex flex-col gap-2">
              {(latest.data?.items ?? [])
                .filter((r) => r.number !== n)
                .slice(0, 4)
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-lg bg-bg-secondary px-3 py-2">
                    <span className="font-mono text-mono-s text-text-primary">{r.ref}</span>
                    <PointPill value={r.crashPoint ?? '0.00'} className="h-7" />
                    <span className="hidden text-caption text-text-tertiary tablet:inline">Ended {r.crashedAt ? formatTimeUTC(r.crashedAt, { seconds: true }) : '—'}</span>
                    <Link href={CRASH_ROUTES.verify(r.number)} className="ml-auto inline-flex min-h-11 items-center gap-1 text-label-m text-text-primary hover:text-text-brand">
                      <ShieldCheck aria-hidden className="size-4" /> Verify
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </CardShell>

        <CardShell className="flex-row items-center gap-3 p-4">
          <Flag aria-hidden className="size-5 shrink-0 text-icon-muted" />
          <p className="flex-1 text-caption text-text-secondary">Something doesn’t match? Report the round and our fairness team will look into it.</p>
          <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-9">
            <Link href={`/support?topic=fairness${n ? `&round=CR-${n}` : ''}`}>Report round</Link>
          </Button>
        </CardShell>
      </div>
    </div>
  );
}

function StatusChip({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-label-s',
        ok ? 'border-border-brand bg-brand-tint-subtle text-text-brand' : 'border-border-danger bg-status-danger-tint text-text-danger',
      )}
    >
      {ok ? <CircleCheck aria-hidden className="size-3.5" /> : <CircleX aria-hidden className="size-3.5" />}
      {ok ? okText : badText}
    </span>
  );
}

function SeedBox({ label, value, locked = false }: { label: string; value: string; locked?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label-m text-text-secondary">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-3 py-2.5">
        <code className="min-w-0 flex-1 font-mono text-mono-s break-all text-text-primary">{value}</code>
        {locked ? (
          <Lock aria-hidden className="size-4 shrink-0 text-icon-muted" />
        ) : (
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-icon-muted hover:text-text-primary"
            aria-label={`Copy ${label}`}
            onClick={() => {
              void navigator.clipboard?.writeText(value).then(
                () => toast({ type: 'success', title: 'Copied' }),
                () => undefined,
              );
            }}
          >
            <Copy aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

