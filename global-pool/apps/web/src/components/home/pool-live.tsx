'use client';

import { formatCount, formatDateUTC, formatRoundNumber, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { PRIZE_DISTRIBUTION, ROUND_THRESHOLDS, prizeBreakdown } from '@gp/shared/pool';
import { ArrowRight, Info, TrendingUp, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/components/shell/nav-config';
import { useEntriesFeed, usePoolHistory } from '@/lib/data/hooks';
import type { FeedEntryView, RoundView } from '@/lib/data/types';
import { cn } from '@/lib/utils';

import { TicketGlyph } from './art';
import { useHomeView } from './home-context';
import { PoolBalanceChart, niceCeil } from './pool-chart';
import { HomeSection, SectionHeader, initialsOf } from './primitives';

const card = 'rounded-xl border border-border-subtle bg-surface-default';

// ── chart card ──────────────────────────────────────────────────────────────────────────────────

function PoolBalanceCard() {
  const { scenario, snapshot } = useHomeView();
  const history = usePoolHistory(scenario);
  const points = history.data?.points ?? [];
  const last = points.at(-1);
  const prev = points.at(-2);
  const delta =
    last && prev && Number(prev.pool) > 0
      ? money(last.pool).minus(prev.pool).div(prev.pool).times(100).toDecimalPlaces(1, 4)
      : null;
  return (
    <article className={cn(card, 'flex min-w-0 flex-col gap-4 p-5 tablet:p-6')}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-label-l text-text-primary">Pool balance</h3>
          <p className="text-caption text-text-tertiary">
            Closing pool per daily round
            {points[0] && last
              ? ` · ${formatDateUTC(points[0].closesAt).replace(/ \d{4}$/, '')} – ${formatDateUTC(last.closesAt)}`
              : ''}{' '}
            · USDT
          </p>
        </div>
        {history.data?.isDemo && <DemoBadge size="s" />}
      </header>
      {last ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-number-m text-text-primary tabular-nums">
              {formatUSDT(last.pool, { symbol: false })}
            </span>
            <span className="text-label-s text-text-secondary">USDT</span>
          </span>
          {delta && prev && (
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium',
                  delta.isNegative()
                    ? 'bg-status-danger-tint text-text-danger'
                    : 'bg-brand-tint text-text-brand',
                )}
              >
                <TrendingUp
                  aria-hidden
                  className={cn('size-3', delta.isNegative() && 'rotate-180')}
                />
                {delta.isNegative() ? '' : '+'}
                {delta.toFixed(1)}%
              </span>
              <span className="text-caption text-text-tertiary">
                vs round {formatRoundNumber(prev.roundNumber)}
              </span>
            </span>
          )}
          {snapshot.current && <StatusBadge status="live" uppercase />}
        </p>
      ) : (
        <Skeleton className="h-8 w-60" />
      )}
      {history.data ? (
        <PoolBalanceChart points={points} minPool={history.data.minPool} className="-ml-1" />
      ) : (
        <Skeleton className="h-[260px] w-full" />
      )}
    </article>
  );
}

// ── latest entries feed ─────────────────────────────────────────────────────────────────────────

function ago(iso: string, now: number | null): string {
  if (now === null) return '';
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  // future (DEMO rows dated later today) or older than an hour → absolute time, never a made-up "0 s ago"
  if (s < 0 || s >= 3600) return formatTimeUTC(iso);
  if (s < 60) return `${s} s ago`;
  return `${Math.floor(s / 60)} min ago`;
}

function FeedRow({
  entry,
  now,
  roundNumber,
}: {
  entry: FeedEntryView;
  now: number | null;
  /** The API feed is per round and omits roundNumber on rows. */
  roundNumber: number;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-0">
      {entry.handle ? (
        <Avatar initials={initialsOf(entry.handle)} size="m" tone="brand" className="size-7" />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-icon-muted">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 22 12a14 14 0 0 1-2.3 3.3M6.6 6.6A14.3 14.3 0 0 0 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-label-l',
            entry.handle ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {entry.handle ? `@${entry.handle}` : 'Hidden'}
        </p>
        <p className="truncate text-caption text-text-tertiary">
          {formatCount(entry.entries)} {entry.entries === 1 ? 'entry' : 'entries'} · round{' '}
          {formatRoundNumber(entry.roundNumber ?? roundNumber)}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-h5 text-text-gold tabular-nums">{formatUSDT(entry.amount)}</span>
        <span className="text-caption text-text-tertiary" suppressHydrationWarning>
          {ago(entry.at, now)}
        </span>
      </div>
    </li>
  );
}

function LatestEntriesCard() {
  const { snapshot, now } = useHomeView();
  const round = snapshot.current;
  const feed = useEntriesFeed(round?.number ?? snapshot.last.number, Boolean(round));
  return (
    <article className={cn(card, 'flex min-w-0 flex-col p-5 tablet:p-6')}>
      <header className="flex items-center gap-2">
        <h3 className="text-label-l text-text-primary">
          {round ? 'Latest entries' : `Round ${formatRoundNumber(snapshot.last.number)} winners`}
        </h3>
        {round && <StatusBadge status="live" uppercase />}
        {snapshot.isDemo && <DemoBadge size="s" className="ml-auto" />}
      </header>
      {round ? (
        <ul className="mt-2 flex flex-col">
          {feed.data
            ? feed.data
                .slice(0, 5)
                .map((e) => <FeedRow key={e.id} entry={e} now={now} roundNumber={round.number} />)
            : Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="py-3">
                  <Skeleton className="h-9 w-full" />
                </li>
              ))}
        </ul>
      ) : (
        <WinnersList round={snapshot.last} />
      )}
      <p className="mt-auto border-t border-border-subtle pt-3 text-caption text-text-tertiary">
        Each entry adds 10.00 USDT to the pool. The 0.05 USDT platform fee is kept separate.
      </p>
    </article>
  );
}

function WinnersList({ round }: { round: RoundView }) {
  const rows = round.winners.slice(0, 5);
  return (
    <ul className="mt-2 flex flex-col">
      {rows.map((w) => (
        <li
          key={w.place}
          className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-0"
        >
          <Avatar initials={initialsOf(w.handle)} size="m" tone="brand" className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-l text-text-primary">@{w.handle}</p>
            <p className="text-caption text-text-tertiary">
              {w.tier === 'runner_up'
                ? `Runner-up · place ${w.place}`
                : `${['1st', '2nd', '3rd'][w.place - 1]} prize`}
            </p>
          </div>
          <span className="text-h5 text-text-gold tabular-nums">{formatUSDT(w.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── threshold ───────────────────────────────────────────────────────────────────────────────────

function Meter({
  label,
  value,
  ratioLabel,
  fill,
  marker,
  markerLabel,
  met,
}: {
  label: string;
  value: string;
  ratioLabel: string;
  fill: number;
  marker: number;
  markerLabel: string;
  met: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center justify-between gap-2 text-caption text-text-secondary">
        {label}
        <span className={met ? 'text-text-brand' : 'text-text-warning'}>{ratioLabel}</span>
      </p>
      <p className="text-body-l text-text-primary tabular-nums">{value}</p>
      <div className="relative mt-2 mb-6 h-2 rounded-full bg-surface-raised">
        <div
          className={cn('h-full rounded-full', met ? 'bg-green-500' : 'bg-status-warning')}
          style={{ width: `${Math.min(100, fill * 100)}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1.5 h-5 w-0.5 rounded-full bg-ink-50"
          style={{ left: `${marker * 100}%` }}
        />
        <span
          className="absolute top-4 -translate-x-1/2 text-caption whitespace-nowrap text-text-secondary"
          style={{ left: `${marker * 100}%` }}
        >
          {markerLabel}
        </span>
      </div>
    </div>
  );
}

const times = (a: string | number, b: string | number) =>
  `${money(a).div(b).toDecimalPlaces(1, 1).toFixed(1)}× the minimum`;

function ThresholdCard() {
  const { snapshot } = useHomeView();
  const round = snapshot.current ?? snapshot.last;
  const pool = round.poolBalance ?? '0';
  const participants = round.participants ?? 0;
  const { minPool, minParticipants } = round.thresholds ?? ROUND_THRESHOLDS;
  const poolMax = niceCeil(Math.max(Number(pool), Number(minPool)));
  const partMax = niceCeil(Math.max(participants, minParticipants));
  const poolMet = money(pool).gte(minPool);
  const partMet = participants >= minParticipants;
  const both = poolMet && partMet;
  const open = Boolean(snapshot.current);
  return (
    <article className={cn(card, 'flex min-w-0 flex-col gap-5 p-5 tablet:p-6')}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-label-l text-text-primary">
            Draw threshold {snapshot.isDemo && <DemoBadge size="s" />}
          </h3>
          <p className="text-caption text-text-tertiary">
            Round {formatRoundNumber(round.number)} · {open ? 'closes' : 'closed'}{' '}
            {formatTimeUTC(round.closesAt, { seconds: true })}
          </p>
        </div>
        <StatusBadge
          status={both ? 'confirmed' : 'under_review'}
          size="m"
          label={both ? 'Both minimums met' : 'Minimum not met yet'}
        />
      </header>
      <Meter
        label="Pool balance"
        value={formatUSDT(pool)}
        ratioLabel={times(pool, minPool)}
        fill={Number(pool) / poolMax}
        marker={Number(minPool) / poolMax}
        markerLabel={`Min ${formatUSDT(minPool, { symbol: false })}`}
        met={poolMet}
      />
      <Meter
        label="Participants"
        value={formatCount(participants)}
        ratioLabel={times(participants, minParticipants)}
        fill={participants / partMax}
        marker={minParticipants / partMax}
        markerLabel={`Min ${formatCount(minParticipants)}`}
        met={partMet}
      />
      <p className="flex items-start gap-2 text-body-s text-text-secondary">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
        {open
          ? both
            ? `Both minimums are met, so this round will draw at ${formatTimeUTC(round.closesAt, { seconds: true })}.`
            : 'If either minimum is not met at close, the round is cancelled and every entry is refunded to Owed.'
          : `Round ${formatRoundNumber(round.number)} met both minimums and was drawn with Chainlink VRF.`}
      </p>
    </article>
  );
}

// ── participate panel ───────────────────────────────────────────────────────────────────────────

function PrizeDialog({ pool }: { pool: string }) {
  const breakdown = prizeBreakdown(pool);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="l">
          Prize distribution
        </Button>
      </DialogTrigger>
      <DialogContent size="m">
        <DialogHeader>
          <DialogTitle>Prize distribution</DialogTitle>
          <DialogDescription>
            13 prizes per round, shares of the pool at close. Platform fees are not part of the
            pool. Amounts are for the current pool of {formatUSDT(pool)} (DEMO).
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <table className="w-full text-body-s">
            <thead>
              <tr className="text-left text-overline text-text-tertiary uppercase">
                <th className="py-2 font-semibold">Prize</th>
                <th className="py-2 text-right font-semibold">Share</th>
                <th className="py-2 text-right font-semibold">Each</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.tiers.map((t) => (
                <tr key={t.tier} className="border-t border-border-subtle">
                  <td className="py-2.5">
                    {t.winners > 1 ? `${t.winners} × ${t.label}` : t.label}
                  </td>
                  <td className="py-2.5 text-right text-text-secondary">{t.sharePercent}%</td>
                  <td className="py-2.5 text-right tabular-nums text-text-gold">
                    {formatUSDT(t.amountEach)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border-default font-semibold">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 text-right">
                  {PRIZE_DISTRIBUTION.reduce((n, t) => n + Number(t.sharePercent) * t.winners, 0)}%
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatUSDT(breakdown.totalPaid)}
                </td>
              </tr>
            </tbody>
          </table>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function CostRow({ label, hint, value }: { label: string; hint: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-body-s text-text-secondary max-tablet:flex-col">
        {label}
        <span className="text-caption text-text-tertiary">{hint}</span>
      </dt>
      <dd className="shrink-0 text-body-m whitespace-nowrap text-text-primary tabular-nums">
        {formatUSDT(value)}
      </dd>
    </div>
  );
}

function ParticipatePanel() {
  const { snapshot, restricted, viewer, signUp } = useHomeView();
  const round = snapshot.current;
  const ref = round ?? snapshot.last;
  const participants = ref.participants ?? 0;
  const entryPrice = ref.entryPrice;
  const fee = ref.platformFeePerEntry;
  const network = '0.00';
  const total = money(entryPrice).plus(fee).plus(network).toFixed(2);
  return (
    <article
      className={cn(card, 'relative flex min-w-0 flex-col gap-5 overflow-hidden p-5 tablet:p-6')}
    >
      <div className="flex w-fit max-w-full flex-wrap items-center gap-3 rounded-full border border-border-subtle bg-bg-secondary/60 py-1.5 pr-4 pl-1.5">
        <span className="flex -space-x-1">
          {snapshot.recentHandles.slice(0, 5).map((h) => (
            <Avatar
              key={h}
              initials={initialsOf(h)}
              size="m"
              tone="brand"
              className="size-7 text-[11px] ring-2 ring-surface-default"
            />
          ))}
          {participants > 5 && (
            <span className="relative flex h-7 min-w-11 items-center justify-center rounded-full bg-surface-raised px-2 text-label-s text-text-secondary ring-2 ring-surface-default">
              +{(Math.floor(participants / 100) / 10).toFixed(1)}k
            </span>
          )}
        </span>
        <span className="flex flex-col">
          <span className="text-body-m text-text-primary">
            <span className="font-semibold tabular-nums">{formatCount(participants)}</span>{' '}
            <span className="text-body-s text-text-secondary">participants</span>
          </span>
          {snapshot.participantsLastHour !== null && round && (
            <span className="flex items-center gap-1 text-caption text-text-brand">
              <TrendingUp aria-hidden className="size-3.5" />+{snapshot.participantsLastHour} in the
              last hour
            </span>
          )}
        </span>
        {snapshot.isDemo && <DemoBadge size="s" />}
      </div>

      <dl className="flex flex-col gap-2.5 rounded-lg bg-bg-secondary/70 p-4">
        <CostRow
          label="Entry price"
          hint={
            <span className="inline-flex items-center gap-1">
              <ArrowRight aria-hidden className="size-3" /> 100% goes to the pool
            </span>
          }
          value={entryPrice}
        />
        <CostRow label="Platform fee" hint="per qualifying entry" value={fee} />
        <CostRow label="Network fee" hint="paid from your balance" value={network} />
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border-default pt-4">
          <dt className="text-label-l text-text-primary">You pay per entry</dt>
          <dd className="shrink-0 text-number-m whitespace-nowrap text-text-primary tabular-nums">
            {formatUSDT(total)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {restricted ? (
          <Button variant="gold" size="l" disabled leadingIcon={<TriangleAlert aria-hidden />}>
            Not available in your region
          </Button>
        ) : !round ? (
          <Button variant="gold" size="l" disabled leadingIcon={<TicketGlyph className="size-5" />}>
            Opens {formatTimeUTC(snapshot.next.opensAt)}
          </Button>
        ) : viewer === 'member' ? (
          <Button variant="gold" size="l" asChild>
            <Link href={ROUTES.pool}>
              <TicketGlyph className="size-5" /> Participate
            </Link>
          </Button>
        ) : (
          <Button
            variant="gold"
            size="l"
            leadingIcon={<TicketGlyph className="size-5" />}
            onClick={signUp}
          >
            Participate
          </Button>
        )}
        <PrizeDialog pool={ref.poolBalance ?? '0'} />
      </div>
      <p className="text-caption text-text-tertiary">
        18+ · You can lose your stake · Your chance of winning is shown before you confirm (e.g. 35
        entries ≈ 2.44% chance of any prize) · Licensed operator, permitted jurisdictions only ·
        Terms apply
      </p>
    </article>
  );
}

// ── section ─────────────────────────────────────────────────────────────────────────────────────

/** H2 Global Pool live: chart + latest entries · draw threshold + participate panel. */
export function PoolLiveSection() {
  const { snapshot } = useHomeView();
  return (
    <HomeSection id="pool-live">
      <SectionHeader
        id="pool-live-title"
        title={snapshot.current ? 'Global Pool live' : 'Global Pool — between rounds'}
        live={Boolean(snapshot.current)}
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href={ROUTES.pool}>Round details</Link>
          </Button>
        }
      />
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_400px]">
        <PoolBalanceCard />
        <LatestEntriesCard />
      </div>
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,520fr)_minmax(0,600fr)]">
        <ThresholdCard />
        <ParticipatePanel />
      </div>
    </HomeSection>
  );
}
