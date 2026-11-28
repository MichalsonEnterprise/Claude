'use client';

import { formatAmount, money } from '@gp/shared/money';
import {
  Activity,
  BookOpen,
  ChevronRight,
  CircleX,
  Clock,
  Hash,
  Info,
  KeyRound,
  Lock,
  Percent,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeUTC } from '@gp/shared/format';
import type { CrashLiveBet, CrashMyBet, CrashRoundView } from '@/lib/api/orbit-rush';
import { cn } from '@/lib/utils';

import {
  HIGH_ROLLER_STAKE,
  HOUSE_EDGE,
  INFO,
  MAX_MULTIPLIER,
  RULES,
  fmtX,
  initialsOf,
  medianOf,
  pointTone,
  shortHash,
} from './crash-math';
import type { LinkStatus } from './live-client';
import { CRASH_ROUTES } from './routes';

// ── small pieces ──────────────────────────────────────────────────────────────────────────────

const PILL_TONE = {
  instant: 'border-border-danger bg-status-danger-tint text-text-danger',
  low: 'border-border-default bg-surface-raised text-text-secondary',
  mid: 'border-border-brand/50 bg-brand-tint-subtle text-text-brand',
  high: 'border-border-brand bg-brand-primary text-text-on-primary',
} as const;

/** Crash-point pill (value is always the label — colour only adds emphasis). */
export function PointPill({
  value,
  newest = false,
  href,
  className,
}: {
  value: string;
  newest?: boolean;
  href?: string;
  className?: string;
}) {
  const cls = cn(
    'inline-flex h-8 shrink-0 items-center rounded-full border px-2.5 text-label-s tabular-nums',
    PILL_TONE[pointTone(value)],
    newest && 'ring-2 ring-border-brand ring-offset-2 ring-offset-bg-secondary',
    className,
  );
  return href ? (
    <Link href={href} className={cn(cls, 'focus-visible:outline-2 focus-visible:outline-border-focus')} aria-label={`Crash point ${fmtX(value)} — verify`}>
      {fmtX(value)}
    </Link>
  ) : (
    <span className={cls}>{fmtX(value)}</span>
  );
}

export type PhasePillKind = 'open' | 'live' | 'cashed' | 'crashed' | 'paused' | 'waiting';

const PHASE_PILL: Record<PhasePillKind, { label: string; icon: LucideIcon; cls: string }> = {
  open: { label: 'Bets open', icon: Clock, cls: 'border-border-brand/60 bg-brand-tint-subtle text-text-brand' },
  live: { label: 'Live', icon: Activity, cls: 'border-border-brand/60 bg-brand-tint-subtle text-text-brand' },
  cashed: { label: 'Cashed out', icon: ShieldCheck, cls: 'border-border-brand/60 bg-brand-tint-subtle text-text-brand' },
  crashed: { label: 'Crashed', icon: CircleX, cls: 'border-border-danger bg-status-danger-tint text-text-danger' },
  paused: { label: 'Paused', icon: Activity, cls: 'border-border-default bg-surface-raised text-text-secondary' },
  waiting: { label: 'Next round soon', icon: Clock, cls: 'border-border-default bg-surface-raised text-text-secondary' },
};

export function PhasePill({ kind, className }: { kind: PhasePillKind; className?: string }) {
  const p = PHASE_PILL[kind];
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-full border px-2 text-label-s', p.cls, className)} data-testid="phase-pill" data-phase={kind}>
      <p.icon aria-hidden className="size-3.5" />
      {p.label}
    </span>
  );
}

/** "LIVE" / "Paused" link indicator (icon + label). */
export function LinkPill({ link }: { link: LinkStatus }) {
  const live = link === 'live';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-label-s',
        live ? 'bg-brand-tint-subtle text-text-brand' : 'bg-surface-raised text-text-secondary',
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', live ? 'bg-brand-primary' : 'bg-text-tertiary')} />
      {live ? 'LIVE' : link === 'connecting' ? 'Connecting' : 'Paused'}
    </span>
  );
}

export function CardShell({
  children,
  className,
  as: As = 'section',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' }) {
  return (
    <As className={cn('flex min-w-0 flex-col rounded-xl border border-border-subtle bg-surface-default', className)} {...rest}>
      {children}
    </As>
  );
}

export function SummaryRow({
  label,
  value,
  tone,
  testId,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: 'success' | 'danger' | 'brand' | 'muted';
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-body-s">
      <span className="text-text-secondary">{label}</span>
      <span
        data-testid={testId}
        className={cn(
          'shrink-0 text-right text-body-s-strong whitespace-nowrap tabular-nums text-text-primary',
          tone === 'success' && 'text-text-success',
          tone === 'danger' && 'text-text-danger',
          tone === 'brand' && 'text-text-brand',
          tone === 'muted' && 'text-text-tertiary',
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── recent results (CR-01 strip) ──────────────────────────────────────────────────────────────

export function RecentResults({
  history,
  loading,
  count = 7,
  compact = false,
}: {
  history: { number: number; crashPoint: string }[];
  loading: boolean;
  count?: number;
  compact?: boolean;
}) {
  const shown = history.slice(0, count);
  const median = medianOf(history.slice(0, 20).map((h) => h.crashPoint));
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2" aria-label="Recent crash points, newest first">
        <Clock aria-hidden className="size-4 shrink-0 text-icon-muted" />
        {loading ? (
          <Skeleton className="h-8 flex-1" />
        ) : (
          <ul className="no-scrollbar -mr-4 flex min-w-0 gap-2 overflow-x-auto py-1 pr-4">
            {history.slice(0, 12).map((h, i) => (
              <li key={h.number}>
                <PointPill value={h.crashPoint} newest={i === 0} href={CRASH_ROUTES.verify(h.number)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <CardShell className="gap-3 p-4" aria-labelledby="cr-recent">
      <div className="flex items-start gap-3">
        <TrendingUp aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-muted" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="cr-recent" className="text-body-m-strong text-text-primary">
            Recent results
          </h2>
          <p className="text-caption text-text-tertiary">Last {shown.length || count} rounds</p>
        </div>
        <DemoBadge size="s" className="mt-0.5" />
        <Link
          href={CRASH_ROUTES.rounds}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-label-m text-text-brand underline-offset-4 hover:underline tablet:min-h-0"
        >
          View all <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-full" />
      ) : shown.length ? (
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto p-0.5" aria-label="Recent crash points, newest first">
          {shown.map((h, i) => (
            <li key={h.number}>
              <PointPill value={h.crashPoint} newest={i === 0} href={CRASH_ROUTES.verify(h.number)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-s text-text-tertiary">No finished rounds yet — the first crash point appears here.</p>
      )}
      <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
        <Info aria-hidden className="mt-px size-3.5 shrink-0" />
        {median ? `Median ${fmtX(median)} — ` : ''}each round is independent; a long run of low crashes doesn’t make a
        high one “due”.
      </p>
    </CardShell>
  );
}

// ── round footer ──────────────────────────────────────────────────────────────────────────────

export function RoundFooter({
  round,
  suffix,
  compact = false,
}: {
  round: CrashRoundView | null;
  suffix?: string;
  compact?: boolean;
}) {
  if (!round) return <Skeleton className="h-6 w-2/3" />;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      {!compact && <Hash aria-hidden className="size-4 text-icon-muted" />}
      <span className="text-body-s-strong text-text-primary" data-testid="round-ref">
        {compact ? round.ref : `Round ${round.ref}`}
        {suffix ? ` · ${suffix}` : ''}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-caption text-text-tertiary">
        {!compact && 'Seed hash'}
        <code className="font-mono text-mono-s text-text-secondary" title={round.commitment}>
          {shortHash(round.commitment, compact ? 8 : 8, compact ? 4 : 8)}
        </code>
        <DemoBadge size="xs" />
      </span>
      <Link
        href={CRASH_ROUTES.verify(round.number)}
        className="ml-auto inline-flex min-h-11 items-center gap-1 text-label-m text-text-brand underline-offset-4 hover:underline tablet:min-h-0"
      >
        Verify <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

// ── live bets (real DEMO-credit bets from the socket only) ───────────────────────────────────

type BetsTab = 'all' | 'mine' | 'high';

export function LiveBetsPanel({
  bets,
  link,
  myBetId,
  myLabel,
  loading,
  roundRef,
  footer,
  compact = false,
  phase,
}: {
  bets: CrashLiveBet[];
  link: LinkStatus;
  myBetId: string | null;
  myLabel: React.ReactNode;
  loading: boolean;
  roundRef: string | null;
  footer: React.ReactNode;
  compact?: boolean;
  phase: CrashRoundView['status'] | null;
}) {
  const [tab, setTab] = React.useState<BetsTab>('all');
  const [all, setAll] = React.useState(false);
  const mineFirst = React.useMemo(() => {
    const m = bets.filter((b) => b.id === myBetId);
    return [...m, ...bets.filter((b) => b.id !== myBetId)];
  }, [bets, myBetId]);
  const rows =
    tab === 'mine'
      ? mineFirst.filter((b) => b.id === myBetId)
      : tab === 'high'
        ? mineFirst.filter((b) => money(b.stake).gte(HIGH_ROLLER_STAKE))
        : compact
          ? mineFirst
          : bets;
  const total = bets.reduce((acc, b) => acc.plus(money(b.stake)), money(0)).toFixed(2);
  const visible = compact && !all ? rows.slice(0, 5) : rows;
  return (
    <CardShell id="my-bets" className="scroll-mt-24 gap-3 p-4 tablet:p-5" aria-labelledby="cr-live-bets" data-testid="live-bets">
      <div className="flex items-center gap-2">
        <h2 id="cr-live-bets" className="text-h5 text-text-primary">
          Live bets
        </h2>
        <LinkPill link={link} />
        <DemoBadge size="s" className="ml-auto" />
      </div>
      {!compact && (
        <div role="tablist" aria-label="Filter live bets" className="grid grid-cols-3 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
          {(
            [
              ['all', 'All bets'],
              ['mine', 'My bets'],
              ['high', 'High rollers'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                'h-10 rounded-sm text-label-m text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
                tab === k && 'border border-border-brand bg-brand-tint text-text-brand',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-body-s">
        <span className="flex items-center gap-1.5 text-text-primary">
          <Users aria-hidden className="size-4 text-icon-muted" />
          <span className="text-body-s-strong" data-testid="live-players">
            {bets.length} {bets.length === 1 ? 'player' : 'players'}
          </span>
        </span>
        <span className="text-text-secondary">
          <CreditsAmount value={total} className="text-body-s-strong text-text-primary" /> in play
        </span>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <table className="w-full table-fixed text-body-s" aria-describedby="cr-live-note">
          <thead>
            <tr className="text-left text-overline text-text-tertiary uppercase">
              <th scope="col" className="w-[44%] pb-2 font-semibold">Player</th>
              <th scope="col" className="pb-2 text-right font-semibold">Bet</th>
              <th scope="col" className="w-[18%] pb-2 text-right font-semibold">At</th>
              <th scope="col" className="w-[22%] pb-2 text-right font-semibold">Payout</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-body-s text-text-tertiary">
                  {tab === 'mine'
                    ? `You have no bet in ${roundRef ?? 'this round'}.`
                    : tab === 'high'
                      ? `No bets of ${formatAmount(HIGH_ROLLER_STAKE)} DEMO or more in this round.`
                      : 'No bets in this round yet.'}
                </td>
              </tr>
            )}
            {visible.map((b) => {
              const mine = b.id === myBetId;
              return (
                <tr key={b.id} className={cn('border-t border-border-subtle/60', mine && 'bg-brand-tint-subtle')} data-testid={mine ? 'my-live-bet' : undefined}>
                  <td className="py-2 pr-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-brand/50 bg-brand-tint-subtle text-[9px] font-bold text-text-brand">
                        {initialsOf(b.player)}
                      </span>
                      <span className={cn('truncate', mine ? 'text-text-brand' : 'text-text-primary')}>{b.player}</span>
                      {mine && <span className="shrink-0 text-text-brand">(you)</span>}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-text-secondary">{formatAmount(b.stake)}</td>
                  <td className={cn('py-2 text-right tabular-nums', b.cashOutMultiplier ? 'text-text-brand' : 'text-text-tertiary')}>
                    {b.cashOutMultiplier ? fmtX(b.cashOutMultiplier) : '—'}
                  </td>
                  <td
                    className={cn(
                      'py-2 text-right tabular-nums',
                      b.status === 'cashed_out' ? 'text-text-brand' : b.status === 'lost' ? 'text-text-danger' : 'text-text-tertiary',
                    )}
                  >
                    {b.status === 'cashed_out'
                      ? formatAmount(b.payout)
                      : b.status === 'lost'
                        ? 'Lost'
                        : phase === 'running'
                          ? <span className={mine ? 'text-text-brand' : 'text-text-secondary'}>In play</span>
                          : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {compact && rows.length > 5 && (
        <Button variant="ghost" size="s" className="min-h-11 self-center" onClick={() => setAll((v) => !v)} trailingIcon={<ChevronRight aria-hidden className={cn(all && '-rotate-90')} />}>
          {all ? 'Show fewer' : `See all ${rows.length} bets`}
        </Button>
      )}
      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-start gap-2.5 rounded-lg bg-surface-raised p-3 text-body-s text-text-secondary" role="status" aria-live="polite">
          <User aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
          <span data-testid="my-bet-status">{myLabel}</span>
        </div>
        <p id="cr-live-note" className="text-caption text-text-tertiary">
          {footer}
        </p>
      </div>
    </CardShell>
  );
}

// ── info cards (How a round works · Odds & limits · Provably fair) ───────────────────────────

export function HowRoundWorksCard() {
  const steps = [
    [
      `Bet in the ${RULES.bettingMs / 1000}-second window`,
      'Set your amount and, if you like, an auto cash-out target.',
    ],
    ['Watch the multiplier climb', 'It starts at 1.00× and rises until the round crashes.'],
    [
      'Cash out before the crash',
      'You receive bet × multiplier. If it crashes first, you lose your stake.',
    ],
  ];
  return (
    <CardShell className="gap-4 p-5" aria-labelledby="cr-how">
      <h2 id="cr-how" className="flex items-center gap-2 text-h5 text-text-primary">
        <BookOpen aria-hidden className="size-5 text-icon-brand" /> How a round works
      </h2>
      <ol className="flex flex-col gap-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint-subtle text-label-s text-text-brand">
              {i + 1}
            </span>
            <span className="flex flex-col">
              <span className="text-body-s-strong text-text-primary">{t}</span>
              <span className="text-caption text-text-secondary">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </CardShell>
  );
}

export function OddsLimitsCard() {
  return (
    <CardShell className="gap-3 p-5" aria-labelledby="cr-odds">
      <h2 id="cr-odds" className="flex items-center gap-2 text-h5 text-text-primary">
        <Percent aria-hidden className="size-5 text-icon-brand" /> Odds & limits
      </h2>
      <SummaryRow label="House edge" value={`${HOUSE_EDGE}%`} />
      <SummaryRow label="Return to player" value={`${INFO.rtpPercent}%`} />
      <SummaryRow label="Win chance for target m" value="99% ÷ m" />
      <SummaryRow label="Instant crash at 1.00×" value={`≈ 1 in ${RULES.instantCrashOneIn} rounds`} />
      <SummaryRow
        label="Bet per round"
        value={
          <>
            {formatAmount(INFO.minBet)} – <CreditsAmount value={INFO.maxBet} />
          </>
        }
      />
      <SummaryRow label="Max multiplier" value={fmtX(MAX_MULTIPLIER)} />
      <SummaryRow label="Fees" value={<CreditsAmount value="0.00" />} />
    </CardShell>
  );
}

export function ProvablyFairCard({ commitment, roundNumber }: { commitment: string | null; roundNumber: number | null }) {
  return (
    <CardShell className="gap-3 p-5" aria-labelledby="cr-pf">
      <h2 id="cr-pf" className="flex items-center gap-2 text-h5 text-text-primary">
        <ShieldCheck aria-hidden className="size-5 text-icon-brand" /> Provably fair
      </h2>
      <p className="text-body-s text-text-secondary">
        Every crash point is fixed before bets open. We publish the SHA-256 hash of the round seed first and reveal the
        seed after the round, so you can recompute the result yourself.
      </p>
      <div className="flex items-center gap-2 rounded-md bg-surface-raised px-3 py-2.5">
        <Lock aria-hidden className="size-4 shrink-0 text-icon-muted" />
        <code className="min-w-0 flex-1 truncate font-mono text-mono-s text-text-secondary" title={commitment ?? undefined}>
          {commitment ? shortHash(commitment, 12, 8) : '—'}
        </code>
        <DemoBadge size="xs" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-9">
          <Link href={roundNumber ? CRASH_ROUTES.verify(roundNumber) : CRASH_ROUTES.fairness}>
            <ShieldCheck aria-hidden /> Verify a round
          </Link>
        </Button>
        <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-9">
          <Link href={`${CRASH_ROUTES.fairness}#how`}>
            <KeyRound aria-hidden /> How seeds work
          </Link>
        </Button>
      </div>
    </CardShell>
  );
}

// ── connection lost banner (CR-08) ───────────────────────────────────────────────────────────

export function ConnectionBanner({
  link,
  attempt,
  max,
  myBet,
  pausedAt,
  onRetry,
}: {
  link: LinkStatus;
  attempt: number;
  max: number;
  myBet: CrashMyBet | null;
  pausedAt: string | null;
  onRetry: () => void;
}) {
  const offline = link === 'offline';
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-status-warning/60 bg-status-warning-tint px-4 py-3 laptop:flex-row laptop:items-center laptop:gap-5"
      data-testid="connection-banner"
    >
      <p className="flex items-center gap-2 text-body-s-strong text-text-primary laptop:shrink-0">
        <TriangleAlert aria-hidden className="size-5 text-text-warning" />
        {offline ? 'Connection lost' : `Connection lost — reconnecting (attempt ${Math.max(1, attempt)} of ${max})`}
      </p>
      <p className="min-w-0 flex-1 text-body-s text-text-secondary">
        {myBet && myBet.status === 'active'
          ? myBet.autoCashOut
            ? `Your bet in round CR-${myBet.round.number} is safe: auto cash-out at ${fmtX(myBet.autoCashOut)} runs on our servers while you are offline.`
            : `Your bet in round CR-${myBet.round.number} is held on the server. Manual cash-out needs a live connection — without an auto cash-out, the bet is lost if the round crashes before you reconnect.`
          : 'Nothing is staked while you are offline — betting resumes when the connection is back.'}
        {pausedAt ? ` Live data paused at ${formatTimeUTC(pausedAt, { seconds: true })}.` : ''}
      </p>
      <Button variant="secondary" size="s" className="min-h-11 self-start laptop:self-auto" onClick={onRetry} leadingIcon={<RefreshCw aria-hidden />}>
        Retry now
      </Button>
    </div>
  );
}
