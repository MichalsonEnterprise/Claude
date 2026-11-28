'use client';

import { blockMessage, hmacSha256Hex, sha256Hex } from '@gp/shared/fair';
import { formatDateTimeUTC, formatDuration, formatTimeUTC } from '@gp/shared/format';
import { formatAmount, money } from '@gp/shared/money';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDot,
  CircleX,
  Code2,
  KeyRound,
  LifeBuoy,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { GameArt } from '@/components/brand/game-art';
import {
  CreditsAmount,
  GAMES_ROUTES,
  LicenceLine,
  SeedDisplay,
  shortHash,
  toneOfNet,
  useGameGate,
  verifyInBrowser,
} from '@/components/games/kit';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { apiRequest } from '@/lib/api/client';
import {
  classifyGameError,
  gameKeys,
  useBetVerification,
  useGameBets,
  useRotateSeed,
  type GameBetsPage,
} from '@/lib/api/games';
import { useAuth } from '@/lib/auth';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { RouletteFelt, RouletteFeltVertical } from './roulette-felt';
import {
  PAYOUTS,
  RULES,
  chanceOfCount,
  colorOf,
  covers,
  fromBets,
  pocketFacts,
  pocketName,
  returnsOf,
  signed,
  toParams,
  toSlipBet,
  type Spot,
} from './roulette-math';
import { GameTabs, PocketDisc, ROULETTE_ROUTES, SLUG, SettlementCard, betsSummary, type RouletteBetView } from './roulette-parts';

const LAST_KEY = 'gp.roulette.lastBets';

// ── page shell (RL-06 / 07 / 08) ─────────────────────────────────────────────────────────────

function PageShell({
  title,
  crumb,
  subtitle,
  actions,
  children,
}: {
  title: string;
  crumb: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 tablet:gap-6">
      <header className="flex flex-col gap-4 laptop:flex-row laptop:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="hidden size-16 shrink-0 overflow-hidden rounded-lg bg-gradient-tile-red tablet:block">
            <GameArt game="pool-roulette" className="size-full" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-tertiary">
                <li>
                  <Link href={GAMES_ROUTES.lobby} className="hover:text-text-primary">
                    Casino
                  </Link>
                </li>
                <li aria-hidden>›</li>
                <li>
                  <Link href={ROULETTE_ROUTES.play} className="hover:text-text-primary">
                    Pool Roulette
                  </Link>
                </li>
                <li aria-hidden>›</li>
                <li aria-current="page" className="text-text-secondary">
                  {crumb}
                </li>
              </ol>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h3 text-text-primary tablet:text-h2">{title}</h1>
              <DemoBadge size="s" />
            </div>
            <p className="max-w-[640px] text-body-s text-text-secondary tablet:text-body-m">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          <Button asChild className="min-h-11 tablet:min-h-10" leadingIcon={<CircleDot aria-hidden />}>
            <Link href={ROULETTE_ROUTES.play}>Back to table</Link>
          </Button>
        </div>
      </header>
      <GameTabs />
      {children}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle px-4 py-3">
        <LicenceLine className="min-w-0 flex-1" />
        <Button variant="ghost" size="s" asChild leadingIcon={<ShieldCheck aria-hidden />}>
          <Link href={GAMES_ROUTES.responsibleGaming}>Responsible gaming</Link>
        </Button>
        <Button variant="ghost" size="s" asChild leadingIcon={<SlidersHorizontal aria-hidden />}>
          <Link href={GAMES_ROUTES.lossLimits}>Set limits</Link>
        </Button>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, aside, children, className }: { title: string; icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-6', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon aria-hidden className="size-5 text-icon-brand" />}
        <h2 id={id} className="text-h5 text-text-primary">
          {title}
        </h2>
        <span className="ml-auto flex items-center gap-2">{aside}</span>
      </div>
      {children}
    </section>
  );
}

function repeatBets(router: ReturnType<typeof useRouter>, bet: RouletteBetView) {
  try {
    window.sessionStorage.setItem(LAST_KEY, JSON.stringify(toParams(fromBets(bet.params?.bets)).bets));
  } catch {
    // storage unavailable — the table opens without them
  }
  router.push(`${ROULETTE_ROUTES.play}?repeat=1`);
}

// ── RL-06 My bets ────────────────────────────────────────────────────────────────────────────

type Period = 'today' | '7d' | '30d' | 'all';
type Result = 'all' | 'win' | 'lose';

function periodFrom(p: Period): string | undefined {
  if (p === 'all') return undefined;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (p === '7d') start.setUTCDate(start.getUTCDate() - 6);
  if (p === '30d') start.setUTCDate(start.getUTCDate() - 29);
  return start.toISOString();
}

type SpinsPage = GameBetsPage<RouletteBetView> & { summary: GameBetsPage['summary'] & { wins?: number } };

/** GET /games/pool-roulette/bets with the period / result filters (the summary follows the filters). */
function useSpins(page: number, pageSize: number, period: Period, result: Result) {
  const member = useAuth().status === 'member';
  const from = periodFrom(period);
  return useQuery({
    queryKey: [...gameKeys.bets(SLUG), 'filtered', page, pageSize, period, result],
    queryFn: () =>
      apiRequest<SpinsPage>(`/games/${SLUG}/bets`, {
        query: { page, pageSize, ...(from ? { from } : {}), ...(result !== 'all' ? { result } : {}) },
      }),
    enabled: member,
    placeholderData: keepPreviousData,
  });
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'h-11 min-w-11 rounded-sm px-3 text-label-m text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-8',
            value === v && 'bg-surface-raised text-text-primary shadow-elevation-1',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function SpinDetail({ bet, onVerify, onRepeat }: { bet: RouletteBetView; onVerify: () => void; onRepeat: () => void }) {
  return (
    <div className="grid gap-4 border-l-[3px] border-border-brand bg-surface-selected p-4 laptop:grid-cols-[1fr_1fr_auto]">
      <SettlementCard bet={bet} title="Per-bet settlement" />
      <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-4 text-body-s">
        <p className="text-body-s-strong text-text-primary">Seeds for this spin</p>
        {[
          ['Server seed hash', shortHash(bet.fairness.serverSeedHash, 8, 6)],
          ['Client seed', bet.fairness.clientSeed],
          ['Nonce', String(bet.fairness.nonce)],
          ['Settled', formatDateTimeUTC(bet.settledAt ?? bet.createdAt)],
          ['Server seed', bet.fairness.revealed ? 'revealed — verify any time' : 'secret until you rotate'],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between gap-3">
            <span className="text-text-secondary">{l}</span>
            <span className="truncate font-mono text-mono-s text-text-primary">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-row flex-wrap gap-2 laptop:flex-col">
        <Button size="s" className="min-h-11 tablet:min-h-8" onClick={onVerify} leadingIcon={<ShieldCheck aria-hidden />}>
          Verify spin
        </Button>
        <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={onRepeat} leadingIcon={<RotateCcw aria-hidden />}>
          Repeat these bets
        </Button>
      </div>
    </div>
  );
}

/** RL-06 — My spins: KPIs for the period, filters, table (cards < 1024) with per-bet settlement, pocket strip. */
export function RouletteHistoryPage() {
  const router = useRouter();
  const auth = useAuth();
  const gate = useGameGate();
  const wide = useMediaQuery(MQ.lg, true);
  const [period, setPeriod] = React.useState<Period>('today');
  const [result, setResult] = React.useState<Result>('all');
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState<string | null>(null);
  const q = useSpins(page, 10, period, result);
  const strip = useGameBets<RouletteBetView>(SLUG, 1, 50);
  React.useEffect(() => setPage(1), [period, result]);
  const s = q.data?.summary;
  const items = q.data?.items ?? [];
  const verify = (b: RouletteBetView) => router.push(`${ROULETTE_ROUTES.fairness}?bet=${encodeURIComponent(b.id)}`);
  const periodLabel = { today: 'today (UTC)', '7d': 'last 7 days', '30d': 'last 30 days', all: 'all time' }[period];
  const pockets = (strip.data?.items ?? []).filter((b) => typeof b.outcome?.pocket === 'number');
  const tally = pockets.reduce((a, b) => ((a[colorOf(b.outcome.pocket)] += 1), a), { red: 0, black: 0, green: 0 });

  return (
    <PageShell
      title="My bets"
      crumb="My bets"
      subtitle="Every Pool Roulette spin you played, with the pocket, what each bet returned and the seeds to verify it. DEMO credits · no cash value. Times are UTC."
    >
      {auth.status !== 'member' ? (
        <EmptyState type="no-data" title="Sign in to see your spins" description="Your spins, their pockets and the seeds to verify them appear here." actions={<Button onClick={() => auth.signIn()}>Sign in</Button>} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Seg label="Period" value={period} onChange={setPeriod} options={[['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All']]} />
            <Seg label="Result" value={result} onChange={setResult} options={[['all', 'All spins'], ['win', 'Won'], ['lose', 'Lost']]} />
            <span className="ml-auto text-caption text-text-tertiary">
              {q.data ? `Showing ${items.length} of ${q.data.total} spins · ${periodLabel}` : ''}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 laptop:grid-cols-4" data-testid="spins-kpis">
            {[
              ['Spins', s ? String(s.bets) : '—', s?.wins !== undefined ? `${s.wins} with a return · ${s.bets - s.wins} lost · ${periodLabel}` : periodLabel, ''],
              ['Staked', s ? <CreditsAmount key="w" value={s.wagered} /> : '—', 'Pool Roulette only', ''],
              ['Returned', s ? <CreditsAmount key="r" value={s.returned} /> : '—', 'Stake + winnings on winning bets', ''],
              [
                'Net result',
                s ? <CreditsAmount key="n" value={s.net} signed={!money(s.net).isZero()} /> : '—',
                'Returned − staked · the 2.70% edge applies over time',
                s ? toneOfNet(s.net) : '',
              ],
            ].map(([l, v, sub, tone]) => (
              <div key={l as string} className="flex flex-col gap-1.5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5">
                <dt className="flex items-center justify-between text-overline uppercase text-text-tertiary">
                  {l}
                  <DemoBadge size="xs" />
                </dt>
                <dd className={cn('flex flex-wrap items-center gap-x-2 text-number-s text-text-primary tablet:text-number-m', tone as string)}>
                  {l === 'Net result' && s && (money(s.net).gte(0) ? <TrendingUp aria-hidden className="size-5" /> : <TrendingDown aria-hidden className="size-5" />)}
                  {v}
                </dd>
                <p className="text-caption text-text-secondary">{sub}</p>
              </div>
            ))}
          </dl>

          <section aria-labelledby="spins-table" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary">
            <div className="flex items-center gap-2 p-4 tablet:px-5">
              <h2 id="spins-table" className="text-h5 text-text-primary">
                {period === 'today' ? 'Today' : periodLabel[0]!.toUpperCase() + periodLabel.slice(1)} · newest first
              </h2>
              <DemoBadge size="s" label="DEMO credits" />
            </div>
            {q.isPending ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : q.isError ? (
              <EmptyState
                type="error"
                title="Couldn’t load your spins"
                description={classifyGameError(q.error).message}
                actions={<Button variant="secondary" size="s" onClick={() => void q.refetch()}>Try again</Button>}
              />
            ) : !items.length ? (
              <EmptyState
                type="no-data"
                title={result === 'all' ? `No spins ${periodLabel}` : `No ${result === 'win' ? 'winning' : 'losing'} spins ${periodLabel}`}
                description="Change the period or filter — or head back to the table."
              />
            ) : wide ? (
              <table className="w-full border-t border-border-subtle text-body-s">
                <thead className="bg-surface-default text-left text-caption text-text-tertiary">
                  <tr>
                    {['Spin ID', 'Time (UTC)', 'Bets', 'Stake', 'Pocket', 'Returned', 'Net', ''].map((h, i) => (
                      <th key={i} scope="col" className={cn('px-4 py-3 font-medium', [3, 5, 6].includes(i) && 'text-right')}>
                        {h || <span className="sr-only">Details</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((b, i) => (
                    <React.Fragment key={b.id}>
                      <tr className={cn('border-t border-border-subtle', i % 2 && 'bg-surface-default/50')}>
                        <td className="px-4 py-3 font-mono text-mono-s text-text-primary">{b.ref}</td>
                        <td className="px-4 py-3 text-text-secondary">{formatTimeUTC(b.createdAt, { seconds: true })}</td>
                        <td className="max-w-[260px] truncate px-4 py-3 text-text-primary">{betsSummary(b.params?.bets)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatAmount(b.stake)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <PocketDisc n={b.outcome.pocket} size={24} />
                            <span className="text-caption text-text-secondary capitalize">{colorOf(b.outcome.pocket)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{formatAmount(b.payout)}</td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', toneOfNet(b.net))}>{signed(b.net)}</td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="s"
                            aria-expanded={open === b.id}
                            onClick={() => setOpen(open === b.id ? null : b.id)}
                            trailingIcon={open === b.id ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
                          >
                            Details<span className="sr-only"> {b.ref}</span>
                          </Button>
                        </td>
                      </tr>
                      {open === b.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <SpinDetail bet={b} onVerify={() => verify(b)} onRepeat={() => repeatBets(router, b)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <ul className="flex flex-col gap-2 border-t border-border-subtle p-3">
                {items.map((b) => (
                  <li key={b.id} className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface-default p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-mono-s text-text-primary">{b.ref}</span>
                      <DemoBadge size="xs" />
                      <span className="ml-auto text-caption text-text-tertiary">{formatTimeUTC(b.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <PocketDisc n={b.outcome.pocket} size={40} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-body-s-strong text-text-primary">{betsSummary(b.params?.bets, 2)}</span>
                        <span className="text-caption text-text-tertiary">
                          Stake {formatAmount(b.stake)} · returned {formatAmount(b.payout)}
                        </span>
                      </div>
                      <span className={cn('text-number-s', toneOfNet(b.net))}>{signed(b.net)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-caption text-text-secondary">{pocketFacts(b.outcome.pocket).split(' · ').slice(0, 2).join(' · ')}</span>
                      <Button variant="ghost" size="s" className="ml-auto min-h-11" onClick={() => setOpen(open === b.id ? null : b.id)} aria-expanded={open === b.id}>
                        Details
                      </Button>
                      <Button variant="ghost" size="s" className="min-h-11" onClick={() => verify(b)} leadingIcon={<ShieldCheck aria-hidden />}>
                        Verify
                      </Button>
                    </div>
                    {open === b.id && <SpinDetail bet={b} onVerify={() => verify(b)} onRepeat={() => repeatBets(router, b)} />}
                  </li>
                ))}
              </ul>
            )}
            {q.data && q.data.totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-border-subtle p-3 tablet:px-5">
                <span className="text-caption text-text-tertiary">
                  Page {q.data.page} of {q.data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Newer
                  </Button>
                  <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" disabled={page >= q.data.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Older
                  </Button>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_360px] tablet:gap-6">
            <Card title={`Your last ${Math.min(50, pockets.length) || 50} spins`} icon={CircleDot} aside={<DemoBadge size="xs" />}>
              {pockets.length ? (
                <ul className="flex flex-wrap gap-1" aria-label="Pockets of your last spins, newest first">
                  {pockets.map((b, i) => (
                    <li key={b.id}>
                      <PocketDisc n={b.outcome.pocket} size={28} newest={i === 0} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-s text-text-tertiary">No spins yet.</p>
              )}
              <p className="text-caption text-text-tertiary">
                {pockets.length ? `${tally.red} red · ${tally.black} black · ${tally.green} zero. ` : ''}Every spin is independent: each of the 37
                pockets has the same 1-in-37 chance every time, so “hot” or “cold” numbers never predict the next spin.
              </p>
            </Card>
            <Card title="Session & limits" icon={ShieldCheck} aside={<AgeBadge />}>
              <dl className="flex flex-col gap-2 text-body-s">
                {[
                  ['Session time', gate.credits ? formatDuration(gate.credits.session.durationSeconds) : '—'],
                  ['Net this session (all games)', gate.credits ? <CreditsAmount key="n" value={gate.credits.session.net} signed={!money(gate.credits.session.net).isZero()} /> : '—'],
                  ['Reality check', gate.credits?.session.realityCheck.nextAt ? `every ${gate.credits.session.realityCheck.intervalMinutes} min · next ${formatTimeUTC(gate.credits.session.realityCheck.nextAt)} UTC` : 'Off'],
                  ['Loss limit', gate.lossLimit ? `${gate.lossLimit.used !== null ? `${formatAmount(gate.lossLimit.used)} / ` : ''}${formatAmount(gate.lossLimit.limit)} per ${gate.lossLimit.period}` : 'Not set'],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between gap-3">
                    <dt className="text-text-secondary">{l}</dt>
                    <dd className="text-body-s-strong text-text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8" leadingIcon={<SlidersHorizontal aria-hidden />}>
                  <Link href={GAMES_ROUTES.lossLimits}>Set limits</Link>
                </Button>
                <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-8" leadingIcon={<PauseCircle aria-hidden />}>
                  <Link href={GAMES_ROUTES.coolingOff}>Take a break</Link>
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

// ── RL-07 Rules & payouts ───────────────────────────────────────────────────────────────────

const MAP_BETS = [
  toSlipBet({ type: 'straight', numbers: [19] }, '1.00'),
  toSlipBet({ type: 'split', numbers: [17, 20] }, '1.00'),
  toSlipBet({ type: 'street', numbers: [31, 32, 33] }, '1.00'),
  toSlipBet({ type: 'corner', numbers: [22, 23, 25, 26] }, '1.00'),
  toSlipBet({ type: 'line', numbers: [1, 2, 3, 4, 5, 6] }, '1.00'),
  toSlipBet({ type: 'column', numbers: [2] }, '1.00'),
  toSlipBet({ type: 'dozen', numbers: [2] }, '1.00'),
  toSlipBet({ type: 'red' }, '1.00'),
];

const INSIDE: [string, string, Spot][] = [
  ['Straight', 'One number (0 included)', { type: 'straight', numbers: [19] }],
  ['Split', 'The line between two numbers', { type: 'split', numbers: [17, 20] }],
  ['Street', 'Outer edge of a row of three · or a trio with 0', { type: 'street', numbers: [31, 32, 33] }],
  ['Corner', 'Where four numbers meet', { type: 'corner', numbers: [22, 23, 25, 26] }],
  ['First four', '0 · 1 · 2 · 3 — the outer corner of 0 and 1', { type: 'corner', numbers: [0, 1, 2, 3] }],
  ['Line', 'Two streets — the edge between them', { type: 'line', numbers: [1, 2, 3, 4, 5, 6] }],
];
const OUTSIDE: [string, string, Spot][] = [
  ['Column', 'A full column of 12 — the 2:1 boxes', { type: 'column', numbers: [2] }],
  ['Dozen', '1–12 · 13–24 · 25–36', { type: 'dozen', numbers: [2] }],
  ['Red / Black', '18 numbers each', { type: 'red' }],
  ['Odd / Even', '18 numbers each (0 is neither)', { type: 'odd' }],
  ['1–18 / 19–36', 'Low or high half', { type: 'low' }],
];

function PayTable({ title, rows, foot }: { title: string; rows: [string, string, Spot][]; foot: string }) {
  return (
    <Card title={title} className="gap-3">
      <table className="w-full text-body-s">
        <thead className="text-left text-overline uppercase text-text-tertiary">
          <tr>
            <th scope="col" className="py-2 font-medium">Bet</th>
            <th scope="col" className="py-2 pl-3 text-right font-medium whitespace-nowrap tablet:pl-5">Covers</th>
            <th scope="col" className="py-2 pl-3 text-right font-medium whitespace-nowrap tablet:pl-5">Pays</th>
            <th scope="col" className="py-2 pl-3 text-right font-medium whitespace-nowrap tablet:pl-5">Chance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, how, s]) => {
            const n = covers(s).length;
            return (
              <tr key={l} className="border-t border-border-subtle">
                <td className="py-2.5 pr-2">
                  <span className="block text-body-s-strong text-text-primary">{l}</span>
                  <span className="block text-caption text-text-tertiary">{how}</span>
                </td>
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums tablet:pl-5">{n}</td>
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums tablet:pl-5">{PAYOUTS[s.type]}:1</td>
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums tablet:pl-5">{chanceOfCount(n)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-caption text-text-tertiary">{foot}</p>
    </Card>
  );
}

/** RL-07 — Rules & payouts (computed from the shared rule module, not typed by hand). */
export function RouletteRulesPage() {
  const largest = returnsOf('straight', RULES.maxPerSpot).minus(money(RULES.maxPerSpot)).toFixed(2);
  return (
    <PageShell
      title="Rules & payouts"
      crumb="Rules & payouts"
      subtitle="European roulette with a single zero. Every bet type returns the same 97.30% on average — the house edge is 2.70% (1 in 37) on all of them. DEMO credits only, no cash value."
      actions={
        <Button variant="secondary" asChild className="min-h-11 tablet:min-h-10" leadingIcon={<ShieldCheck aria-hidden />}>
          <Link href={ROULETTE_ROUTES.fairness}>How fairness works</Link>
        </Button>
      }
    >
      <Card title="Where each bet goes" icon={CircleDot}>
        <div className="grid items-center gap-6 laptop:grid-cols-[minmax(0,1fr)_280px]">
          {/* ≥ 768 the horizontal table; below, the same vertical felt the 390 table uses (no clipped side-scroller) */}
          <div className="hidden tablet:block" inert aria-hidden>
            <RouletteFelt bets={MAP_BETS} onPlace={() => undefined} onRemove={() => undefined} hover={null} onHover={() => undefined} />
          </div>
          <div className="mx-auto w-full max-w-[340px] tablet:hidden" inert aria-hidden>
            <RouletteFeltVertical bets={MAP_BETS} onNumber={() => undefined} onPlace={() => undefined} onRemove={() => undefined} />
          </div>
          <ul className="flex flex-col gap-2.5">
            {[
              ['Straight 19', 'chip on the number'],
              ['Split 17 | 20', 'chip on the shared line'],
              ['Street 31 · 32 · 33', 'chip on the outer edge of the row'],
              ['Corner 22 · 23 · 25 · 26', 'chip where the four meet'],
              ['Line 1 – 6', 'chip on the edge between two streets'],
              ['2nd column · 2nd dozen · Red', 'chips in the outside boxes'],
            ].map(([t, d]) => (
              <li key={t} className="flex flex-col">
                <span className="text-body-s-strong text-text-primary">{t}</span>
                <span className="text-caption text-text-tertiary">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <div className="grid gap-5 laptop:grid-cols-2 tablet:gap-6">
        <PayTable title="Inside bets" rows={INSIDE} foot="Payouts are “to 1”: a 1.00 split that wins returns 18.00 (17.00 winnings + your 1.00)." />
        <PayTable title="Outside bets" rows={OUTSIDE} foot="If the ball lands on 0, every outside bet loses. This table has no La Partage or En Prison rule." />
      </div>
      <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_320px_320px] tablet:gap-6">
        <Card title="How a spin works" icon={RefreshCw}>
          <ol className="flex flex-col gap-4">
            {[
              ['Place your bets', `Per spot ${formatAmount(RULES.minPerSpot)} – ${formatAmount(RULES.maxPerSpot)} DEMO, up to ${formatAmount(RULES.tableMax)} DEMO and ${RULES.maxSpots} spots per spin. Chips can be moved or removed until you press Spin.`],
              ['Spin', 'Your total stake is taken from your DEMO credits. The pocket is computed from your seed pair and nonce — the wheel animation only shows it.'],
              ['Settle', 'Winning bets return stake + winnings straight to your DEMO credits. No fee is taken from bets or winnings.'],
              ['If you disconnect', 'An accepted spin always settles on the server exactly once. You’ll find it in My bets with the pocket and seeds.'],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-brand bg-brand-tint text-label-s text-text-brand">{i + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-body-s-strong text-text-primary">{t}</span>
                  <span className="text-body-s text-text-secondary">{b}</span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Limits" icon={SlidersHorizontal}>
          <dl className="flex flex-col gap-2 text-body-s">
            {[
              ['Per spot', `${formatAmount(RULES.minPerSpot)} – ${formatAmount(RULES.maxPerSpot)} DEMO`],
              ['Per spin (table max)', `${formatAmount(RULES.tableMax)} DEMO`],
              ['Spots per spin', String(RULES.maxSpots)],
              ['Largest single win', `${formatAmount(largest)} DEMO`],
              ['House edge', '2.70% · every bet'],
              ['Fees on bets', '0.00 DEMO'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-3">
                <dt className="text-text-secondary">{l}</dt>
                <dd className="text-body-s-strong text-text-primary tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-caption text-text-tertiary">
            Largest single win = a {formatAmount(RULES.maxPerSpot)} straight bet at 35:1. The 0.05 USDT platform fee applies to Global Pool
            entries only.
          </p>
        </Card>
        <Card title="Play within your limits" icon={ShieldCheck} aside={<AgeBadge />}>
          <p className="text-body-s text-text-secondary">
            Roulette has no strategy that beats the house edge — betting systems only change how wins and losses are spread. You can lose
            your stake. Set a loss limit before you play; reality checks remind you between spins.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8" leadingIcon={<SlidersHorizontal aria-hidden />}>
              <Link href={GAMES_ROUTES.lossLimits}>Set limits</Link>
            </Button>
            <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-8" leadingIcon={<LifeBuoy aria-hidden />}>
              <Link href={GAMES_ROUTES.responsibleGaming}>Get help</Link>
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

// ── RL-08 Provably-fair verification ────────────────────────────────────────────────────────

function Step({ n, title, ok, children, mono }: { n: number; title: string; ok: boolean | null; children: React.ReactNode; mono?: string }) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full border text-label-s',
          ok === false ? 'border-border-danger bg-status-danger-tint text-text-danger' : 'border-border-brand bg-brand-tint text-text-brand',
        )}
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-1.5 text-body-s-strong text-text-primary">
          {title}
          {ok === true && <CircleCheck aria-label="passed" className="size-4 text-icon-brand" />}
          {ok === false && <CircleX aria-label="failed" className="size-4 text-text-danger" />}
        </p>
        <div className="text-body-s text-text-secondary">{children}</div>
        {mono && (
          <code className="w-fit max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] rounded-sm border border-border-subtle bg-bg-secondary px-2.5 py-1.5 font-mono text-mono-s text-text-primary">
            {mono}
          </code>
        )}
      </div>
    </li>
  );
}

/** RL-08 — verify one spin in the browser with @gp/shared/fair (same code the API settles with). */
export function RouletteFairnessPage() {
  const auth = useAuth();
  const recent = useGameBets<RouletteBetView>(SLUG, 1, 12);
  const [betId, setBetId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('bet');
    if (id) setBetId(id);
  }, []);
  const selected = betId ?? recent.data?.items[0]?.id ?? null;
  const q = useBetVerification(selected);
  const v = q.data;
  const rotate = useRotateSeed(SLUG);
  const [edit, setEdit] = React.useState<{ serverSeed: string; clientSeed: string; nonce: string } | null>(null);
  React.useEffect(() => {
    setEdit(v?.verify.serverSeed ? { serverSeed: v.verify.serverSeed, clientSeed: v.verify.clientSeed, nonce: String(v.verify.nonce) } : null);
  }, [v?.verify.serverSeed, v?.verify.clientSeed, v?.verify.nonce]);
  const nonce = edit && /^\d{1,9}$/.test(edit.nonce) ? Number(edit.nonce) : null;
  const check = React.useMemo(
    () => (v && edit && nonce !== null ? verifyInBrowser(v, { serverSeed: edit.serverSeed.trim(), clientSeed: edit.clientSeed.trim(), nonce }) : null),
    [v, edit, nonce],
  );
  const bet = v?.bet as RouletteBetView | undefined;
  const recomputed = check?.result?.outcome as { pocket?: number; u32?: number } | undefined;
  const u32 = typeof recomputed?.u32 === 'number' ? recomputed.u32 : null;
  const f = u32 !== null ? money(u32).div(money(2).pow(32)) : null;
  const edited = !!v && !!edit && (edit.serverSeed !== v.verify.serverSeed || edit.clientSeed !== v.verify.clientSeed || edit.nonce !== String(v.verify.nonce));

  const reveal = async () => {
    try {
      await rotate.mutateAsync(undefined);
      await q.refetch();
    } catch (err) {
      toast({ type: 'error', title: 'Could not rotate seeds', description: classifyGameError(err).message });
    }
  };

  return (
    <PageShell
      title="Verify a spin"
      crumb="Fairness"
      subtitle="Check that a spin came from the seeds committed before you bet. Verifying never changes a result — it only recomputes it, in your browser, with the same code the server settles with."
      actions={
        <Button variant="ghost" asChild className="min-h-11 tablet:min-h-10" leadingIcon={<Code2 aria-hidden />}>
          <Link href={GAMES_ROUTES.provablyFair}>How provably fair works</Link>
        </Button>
      }
    >
      {auth.status !== 'member' ? (
        <EmptyState type="no-data" title="Sign in to verify your spins" description="Every spin you play can be re-derived here from its seeds and nonce." actions={<Button onClick={() => auth.signIn()}>Sign in</Button>} />
      ) : (
        <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] tablet:gap-6">
          <div className="flex min-w-0 flex-col gap-5">
            <Card title="Choose a spin" icon={CircleDot} aside={<DemoBadge size="xs" />}>
              {recent.isPending ? (
                <Skeleton className="h-10 w-full" />
              ) : recent.data?.items.length ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Your recent spins">
                  {recent.data.items.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setBetId(b.id)}
                        aria-pressed={selected === b.id}
                        aria-label={`${b.ref} — ${pocketName(b.outcome.pocket)}`}
                        className={cn(
                          'flex h-11 items-center gap-2 rounded-full border px-2 pr-3 text-label-s focus-visible:outline-2 focus-visible:outline-border-focus',
                          selected === b.id ? 'border-border-brand bg-brand-tint-subtle text-text-primary' : 'border-border-subtle bg-surface-raised text-text-secondary',
                        )}
                      >
                        <PocketDisc n={b.outcome.pocket} size={28} />
                        <span className="font-mono">{b.ref}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-s text-text-tertiary">
                  No spins yet. <Link href={ROULETTE_ROUTES.play} className="text-text-brand hover:underline">Play a spin</Link> to verify it here.
                </p>
              )}
            </Card>

            {selected && (
              <Card
                title={bet ? `Spin ${bet.ref}` : 'Spin'}
                icon={ShieldCheck}
                aside={
                  check ? (
                    check.matches ? (
                      <span className="inline-flex items-center gap-1.5 text-label-m text-text-brand" data-testid="pf-status">
                        <CircleCheck aria-hidden className="size-4" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-label-m text-text-danger" data-testid="pf-status">
                        <CircleX aria-hidden className="size-4" /> Doesn’t match
                      </span>
                    )
                  ) : v && !v.verify.serverSeed ? (
                    <span className="text-label-m text-text-warning" data-testid="pf-status">
                      Server seed still secret
                    </span>
                  ) : null
                }
              >
                {q.isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : q.isError || !v || !bet ? (
                  <EmptyState type="error" title="Couldn’t load this spin" description={q.error ? classifyGameError(q.error).message : 'Try another spin.'} />
                ) : (
                  <>
                    {!v.verify.serverSeed ? (
                      <div className="flex flex-col gap-3 rounded-lg border border-status-warning/40 bg-status-warning-tint p-4">
                        <p className="text-body-s text-text-primary">
                          The server seed of this pair is still secret, so the spin can’t be recomputed yet. Rotating reveals it and commits a
                          new seed for your next spins.
                        </p>
                        <Button className="w-fit min-h-11 tablet:min-h-10" loading={rotate.isPending} onClick={() => void reveal()} leadingIcon={<KeyRound aria-hidden />}>
                          Rotate seeds & reveal
                        </Button>
                      </div>
                    ) : (
                      edit && (
                        <div className="grid gap-3 tablet:grid-cols-2">
                          <Field label="Server seed (revealed)" className="tablet:col-span-2">
                            <Input value={edit.serverSeed} onChange={(e) => setEdit({ ...edit, serverSeed: e.target.value })} className="font-mono" spellCheck={false} />
                          </Field>
                          <Field label="Client seed">
                            <Input value={edit.clientSeed} onChange={(e) => setEdit({ ...edit, clientSeed: e.target.value })} className="font-mono" spellCheck={false} />
                          </Field>
                          <Field label="Nonce">
                            <Input value={edit.nonce} inputMode="numeric" onChange={(e) => setEdit({ ...edit, nonce: e.target.value.replace(/\D/g, '') })} className="font-mono" />
                          </Field>
                          {edited && (
                            <Button
                              variant="ghost"
                              size="s"
                              className="w-fit"
                              onClick={() => setEdit({ serverSeed: v.verify.serverSeed!, clientSeed: v.verify.clientSeed, nonce: String(v.verify.nonce) })}
                              leadingIcon={<RotateCcw aria-hidden />}
                            >
                              Restore the recorded seeds
                            </Button>
                          )}
                        </div>
                      )
                    )}
                    <ol className="flex flex-col gap-4" data-testid="pf-steps">
                      <Step n={1} title="Commitment published" ok={true} mono={shortHash(v.verify.serverSeedHash, 10, 6)}>
                        Before your bet we showed the SHA-256 hash of the server seed. It hasn’t changed since.
                      </Step>
                      <Step
                        n={2}
                        title="Server seed revealed"
                        ok={v.verify.serverSeed ? (edit ? sha256Hex(edit.serverSeed.trim()) === v.verify.serverSeedHash : null) : null}
                        mono={v.verify.serverSeed ? shortHash(edit?.serverSeed ?? v.verify.serverSeed, 10, 6) : 'still secret'}
                      >
                        Hashing the revealed seed must give exactly the committed value.
                      </Step>
                      <Step n={3} title="Your inputs" ok={null} mono={`${edit?.clientSeed ?? v.verify.clientSeed} · nonce ${edit?.nonce ?? v.verify.nonce}`}>
                        Your client seed (you can change it any time) and the nonce — the bet number with this seed pair.
                      </Step>
                      <Step
                        n={4}
                        title="Pocket recomputed"
                        ok={check ? recomputed?.pocket === bet.outcome.pocket : null}
                        mono={
                          f && edit && nonce !== null
                            ? `HMAC block 0 = ${hmacSha256Hex(edit.serverSeed.trim(), blockMessage(edit.clientSeed.trim(), nonce, 0)).slice(0, 8)}… → f = ${f.toDecimalPlaces(6, 1).toFixed(6)} → × 37 = ${f.times(37).toDecimalPlaces(2, 1).toFixed(2)} → pocket ${recomputed?.pocket}`
                            : `recorded pocket ${bet.outcome.pocket}`
                        }
                      >
                        HMAC-SHA256(server seed, “client seed:nonce:0”) → first 4 bytes as a number from 0 to 1 → × 37 → rounded down.
                      </Step>
                      <Step
                        n={5}
                        title="Bets settled"
                        ok={check ? money(check.result?.payout ?? '-1').eq(money(bet.payout)) : null}
                        mono={(bet.outcome.bets ?? [])
                          .filter((b) => b.win)
                          .map((b) => `${formatAmount(b.amount)}×${PAYOUTS[b.type] + 1}`)
                          .join(' + ')
                          .concat(` = ${formatAmount(check?.result?.payout ?? bet.payout)} returned`)}
                      >
                        Pocket {pocketName(bet.outcome.pocket)} settles every bet on the slip by the published payouts —{' '}
                        {formatAmount(bet.payout)} DEMO returned on {formatAmount(bet.stake)} staked.
                      </Step>
                    </ol>
                    {check?.error && <p className="text-caption text-text-danger">{check.error}</p>}
                    {check && !check.matches && (
                      <p className="rounded-md border border-border-danger bg-status-danger-tint p-3 text-caption text-text-primary" role="status">
                        {edited
                          ? 'These inputs give a different result from the recorded spin — that’s expected when you edit a seed or the nonce.'
                          : 'The recorded spin doesn’t match its seeds. Please contact support with the spin ID.'}
                      </p>
                    )}
                  </>
                )}
              </Card>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            {bet && (
              <Card title={`Spin ${bet.ref} · ${pocketName(bet.outcome.pocket)}`} icon={CircleDot} aside={<DemoBadge size="xs" />}>
                <div className="flex items-center gap-4">
                  <PocketDisc n={bet.outcome.pocket} size={56} newest />
                  <p className="text-body-s text-text-secondary">{pocketFacts(bet.outcome.pocket)}</p>
                </div>
                <SettlementCard bet={bet} />
              </Card>
            )}
            <SeedDisplay slug={SLUG} />
            <Card title="Check it yourself" icon={Code2}>
              <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-secondary p-4 font-mono text-mono-s text-text-secondary">
                {`h = HMAC_SHA256(key = server_seed, msg = client_seed + ":" + nonce + ":0")
u = int(h[0:8], 16)              # first 4 bytes, big-endian
pocket = floor(u × 37 / 2^32)    # 0 – 36, European single zero`}
              </pre>
              <p className="text-caption text-text-tertiary">
                Any HMAC-SHA256 tool gives the same pocket. Pocket numbers map directly to the table (0 – 36), not to wheel positions.
                No code path, flag or admin tool can choose, edit or re-roll a pocket.
              </p>
              {bet && (
                <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
                  <ArrowLeft aria-hidden className="size-3.5" />
                  Spin {bet.ref} · {formatDateTimeUTC(bet.settledAt ?? bet.createdAt)} · rules {bet.rulesVersion}
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}

