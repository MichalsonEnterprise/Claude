'use client';

import { formatCount, formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { add, formatUSDT, money } from '@gp/shared/money';
import { ArrowRight, CircleCheck, Lock, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Countdown } from '@/components/domain/countdown';
import { LiveDot } from '@/components/home/primitives';
import { ROUTES } from '@/components/shell/nav-config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { MyEntriesView, RoundView } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { Demo, Meter } from '../primitives';
import { approxPercent } from './balances';

function ratio(value: string, min: string): string {
  const m = money(min);
  return m.isZero() ? '—' : `${money(value).div(m).toDecimalPlaces(1).toFixed(1)}×`;
}

function pct(value: string | number, of: string | number): number {
  const o = money(of);
  if (o.isZero()) return 0;
  return Math.min(100, money(value).div(o).times(100).toDecimalPlaces(1).toNumber());
}

/** USR-01 "Active Pool": live round snapshot + my entries / odds, or the "no entries yet" explainer. */
export function ActivePoolSection({
  round,
  mine,
  restricted,
  canEnter,
  enterBlockedReason,
  demo,
}: {
  round: RoundView | undefined;
  mine: MyEntriesView | undefined;
  restricted: boolean;
  canEnter: boolean;
  enterBlockedReason?: string;
  demo: boolean;
}) {
  if (!round) {
    return (
      <section aria-label="Active Pool" className="flex flex-col gap-4">
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-4 laptop:grid-cols-[360px_1fr]">
          <Skeleton className="h-[420px] rounded-lg" />
          <Skeleton className="h-[420px] rounded-lg" />
        </div>
      </section>
    );
  }
  const open = round.status === 'open';
  const hasEntries = (mine?.entries ?? 0) > 0;
  return (
    <section aria-labelledby="pool-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="pool-h" className="text-h4">
          Active Pool
        </h2>
        {open && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-label-s text-text-brand">
            <LiveDot /> LIVE
          </span>
        )}
        <p className="text-caption text-text-tertiary">
          Round {round.numberLabel}
          {round.openedAt ? ` · opened ${formatDateTimeUTC(round.openedAt)}` : ''} · draws{' '}
          {formatTimeUTC(round.closesAt)}
        </p>
        <Link
          href={ROUTES.pool}
          className="ml-auto inline-flex min-h-11 items-center gap-1 text-label-m text-text-primary hover:text-text-brand tablet:min-h-0"
        >
          Open Global Pool <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 laptop:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <RoundCard
          round={round}
          restricted={restricted}
          canEnter={canEnter}
          reason={enterBlockedReason}
          demo={demo}
        />
        {hasEntries && mine ? (
          <MyEntriesCard round={round} mine={mine} demo={demo} restricted={restricted} />
        ) : (
          <NoEntriesCard
            round={round}
            canEnter={canEnter}
            reason={enterBlockedReason}
            demo={demo}
          />
        )}
      </div>
    </section>
  );
}

function RoundCard({
  round,
  restricted,
  canEnter,
  reason,
  demo,
}: {
  round: RoundView;
  restricted: boolean;
  canEnter: boolean;
  reason?: string;
  demo: boolean;
}) {
  return (
    <Card className="gap-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-gold text-text-on-gold"
        >
          <span className="text-label-l font-bold">$</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-m-strong">Global Pool</p>
          <p className="text-caption text-text-tertiary">Round {round.numberLabel}</p>
        </div>
        {round.status === 'open' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-label-s text-text-brand">
            <LiveDot /> LIVE
          </span>
        )}
      </div>
      <div className="rounded-lg border border-border-gold bg-gold-tint p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-overline uppercase text-text-gold">
          Pool balance <Demo show={demo} size="xs" />
        </p>
        <p className="mt-1 text-number-l text-text-gold tabular-nums">
          {formatUSDT(round.poolBalance)}
        </p>
        <p className="mt-1 text-caption text-text-secondary">
          Platform fees ({formatUSDT(round.platformFees)}) are not part of the pool
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption text-text-tertiary">
          {round.status === 'open' ? 'Closes in' : 'Status'}
        </p>
        {round.status === 'open' ? (
          <Countdown closesAt={round.closesAt} caption={null} />
        ) : (
          <p className="text-body-m-strong capitalize">{round.status}</p>
        )}
        <p className="text-caption text-text-tertiary">
          Draw at {formatDateTimeUTC(round.closesAt)} · Chainlink VRF
        </p>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Users aria-hidden className="size-3.5" /> {formatCount(round.participants)} participants
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Ticket aria-hidden className="size-3.5" /> {formatCount(round.entries)} entries
        </span>
        <Demo show={demo} size="xs" />
      </p>
      {canEnter ? (
        <Button size="l" block leadingIcon={<Ticket aria-hidden />} asChild>
          <Link href={ROUTES.pool}>Enter round</Link>
        </Button>
      ) : (
        <Button size="l" block disabled leadingIcon={<Lock aria-hidden />}>
          {restricted ? 'Not available in your region' : 'Enter round'}
        </Button>
      )}
      <p className="text-caption text-text-tertiary">
        {formatUSDT(round.entryPrice)} per entry + {formatUSDT(round.platformFeePerEntry)} platform
        fee per entry · paid from your balance (no network fee) · 18+ · You can lose your stake
        {reason ? ` · ${reason}` : ''}
      </p>
    </Card>
  );
}

function MyEntriesCard({
  round,
  mine,
  demo,
  restricted,
}: {
  round: RoundView;
  mine: MyEntriesView;
  demo: boolean;
  restricted: boolean;
}) {
  const paid = add(mine.entryAmount, mine.platformFee).toFixed(2);
  const odds = mine.odds;
  return (
    <Card className="gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Ticket aria-hidden className="size-5 text-icon-brand" />
        <h3 className="text-h5">Your entries in round {round.numberLabel}</h3>
        <Demo show={demo} />
        <p className="ml-auto text-caption text-text-tertiary">
          Paid from Available · no network fee for entries
        </p>
      </div>
      <dl className="grid gap-4 tablet:grid-cols-3">
        <div>
          <dt className="text-caption text-text-tertiary">Entries</dt>
          <dd className="text-number-l tabular-nums">{formatCount(mine.entries)}</dd>
          <dd className="text-caption text-text-tertiary">
            of {formatCount(round.entries)} qualifying entries
            {mine.firstEntryId && mine.lastEntryId
              ? ` · IDs ${mine.firstEntryId} … ${mine.lastEntryId.split('-').pop()}`
              : ''}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-tertiary">You paid</dt>
          <dd className="text-number-l tabular-nums">
            {formatUSDT(paid, { symbol: false })}{' '}
            <span className="text-body-s text-text-tertiary">USDT</span>
          </dd>
          <dd className="text-caption text-text-tertiary">
            {formatUSDT(mine.entryAmount, { symbol: false })} entries +{' '}
            {formatUSDT(mine.platformFee, { symbol: false })} platform fee ({mine.entries} ×{' '}
            {formatUSDT(round.platformFeePerEntry, { symbol: false })})
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-tertiary">Chance of any prize</dt>
          <dd className="text-number-l text-text-brand tabular-nums">
            {odds ? `≈ ${approxPercent(odds.anyPrizeApproxPercent)}` : '—'}
          </dd>
          {odds && (
            <dd className="text-caption text-text-tertiary">
              1st prize ≈ {approxPercent(odds.firstPrizePercent)} · {odds.prizes} prizes per round
            </dd>
          )}
        </div>
      </dl>

      <ThresholdBox round={round} demo={demo} />

      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end">
        <MiniTicket entryId={mine.firstEntryId ?? '—'} round={round} demo={demo} />
        <div className="flex flex-1 flex-col gap-2">
          <Button variant="gold" size="l" block disabled={restricted} asChild={!restricted}>
            {restricted ? (
              <span>Buy more entries</span>
            ) : (
              <Link href={ROUTES.pool}>Buy more entries</Link>
            )}
          </Button>
          <Button variant="secondary" size="l" block asChild>
            <Link href={ROUTES.entries}>View all {formatCount(mine.entries)} entries</Link>
          </Button>
          <p className="text-caption text-text-tertiary">
            You can lose your stake. Entries are final once the round closes at{' '}
            {formatTimeUTC(round.closesAt)}.
          </p>
          <Link
            href={ROUTES.responsibleGaming}
            className="text-label-s text-text-brand hover:underline"
          >
            Set a participation limit
          </Link>
        </div>
      </div>
    </Card>
  );
}

function ThresholdBox({ round, demo }: { round: RoundView; demo: boolean }) {
  const t = round.thresholds;
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-secondary p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body-s-strong">Draw threshold</p>
        <Demo show={demo} size="xs" />
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-s',
            t.met
              ? 'bg-status-success-tint text-text-success'
              : 'bg-status-warning-tint text-text-warning',
          )}
        >
          <CircleCheck aria-hidden className="size-3.5" />{' '}
          {t.met ? 'Both minimums met' : 'Minimums not met yet'}
        </span>
      </div>
      <p className="-mt-3 text-caption text-text-tertiary">
        Round {round.numberLabel} · closes {formatTimeUTC(round.closesAt)}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-caption text-text-tertiary">
          <span>Pool balance</span>
          <span className="text-text-success">
            {ratio(round.poolBalance, t.minPool)} the minimum
          </span>
        </div>
        <p className="text-number-s tabular-nums">{formatUSDT(round.poolBalance)}</p>
        <Meter
          value={pct(round.poolBalance, money(t.minPool).times(4).toString())}
          tone="success"
          label="Pool balance against the minimum"
        />
        <p className="text-caption text-text-tertiary">Min {formatUSDT(t.minPool)}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-caption text-text-tertiary">
          <span>Participants</span>
          <span className="text-text-success">
            {ratio(String(round.participants), String(t.minParticipants))} the minimum
          </span>
        </div>
        <p className="text-number-s tabular-nums">{formatCount(round.participants)}</p>
        <Meter
          value={pct(round.participants, t.minParticipants * 8)}
          tone="success"
          label="Participants against the minimum"
        />
        <p className="text-caption text-text-tertiary">Min {formatCount(t.minParticipants)}</p>
      </div>
      <p className="text-caption text-text-secondary">
        {t.met
          ? `Both minimums are met, so this round will draw at ${formatTimeUTC(round.closesAt, { seconds: true })}.`
          : 'If a minimum isn’t met when the round closes, the round is cancelled and every stake goes back to Owed.'}
      </p>
    </div>
  );
}

function MiniTicket({
  entryId,
  round,
  demo,
}: {
  entryId: string;
  round: RoundView;
  demo: boolean;
}) {
  return (
    <div className="flex w-full max-w-[360px] overflow-hidden rounded-md bg-surface-raised shadow-elevation-1">
      <div className="flex flex-1 flex-col gap-1 p-4 pr-2">
        <div className="flex items-center justify-between">
          <span className="text-overline uppercase text-text-tertiary">Entry</span>
          <Demo show={demo} size="xs" />
        </div>
        <span className="font-mono text-mono-s text-text-primary">{entryId}</span>
        <span className="text-caption text-text-secondary">
          Round {round.numberLabel} · Global Pool
        </span>
        <div className="mt-1 grid grid-cols-2 gap-2 text-caption text-text-tertiary">
          <span className="flex flex-col">
            Entry{' '}
            <span className="text-label-m text-text-primary">{formatUSDT(round.entryPrice)}</span>
          </span>
          <span className="flex flex-col">
            Platform fee{' '}
            <span className="text-label-m text-text-primary">
              {formatUSDT(round.platformFeePerEntry)}
            </span>
          </span>
        </div>
      </div>
      <div className="flex w-[96px] flex-col items-center justify-center gap-1 border-l border-dashed border-border-strong px-2 text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-1.5 py-0.5 text-[10px] font-semibold text-text-brand">
          <span aria-hidden className="size-1 rounded-full bg-brand" /> In draw
        </span>
        <span className="text-[10px] text-text-tertiary">Draw at</span>
        <span className="text-label-s whitespace-nowrap">{formatTimeUTC(round.closesAt)}</span>
      </div>
    </div>
  );
}

function NoEntriesCard({
  round,
  canEnter,
  reason,
  demo,
}: {
  round: RoundView;
  canEnter: boolean;
  reason?: string;
  demo: boolean;
}) {
  return (
    <Card className="gap-5">
      <div className="flex items-center gap-2">
        <Ticket aria-hidden className="size-5 text-icon-brand" />
        <h3 className="text-h5">You have no entries in round {round.numberLabel}</h3>
      </div>
      <p className="text-body-s text-text-secondary">
        Each entry costs {formatUSDT(round.entryPrice)} plus a{' '}
        {formatUSDT(round.platformFeePerEntry)} platform fee, paid from your Available balance — no
        network fee for entries. The platform fee is never added to the pool.
      </p>
      <ol className="grid gap-3 tablet:grid-cols-3">
        {[
          [
            'Buy entries',
            'Pick how many entries to buy, within your participation limit. Entries lock until the draw.',
          ],
          [
            `Verifiable draw at ${formatTimeUTC(round.closesAt)}`,
            `Chainlink VRF on Arbitrum selects ${round.prizeDistribution.reduce((s, p) => s + p.winners, 0)} winning entries. Anyone can verify the result on-chain.`,
          ],
          [
            'Prizes to your balance',
            round.prizeDistribution.map((p) => `${p.label} ${p.sharePercent}%`).join(' · '),
          ],
        ].map(([title, body], i) => (
          <li
            key={title}
            className="flex flex-col gap-1 rounded-md border border-border-subtle bg-bg-secondary p-4"
          >
            <span className="text-label-m text-text-brand">{i + 1}</span>
            <span className="text-body-s-strong">{title}</span>
            <span className="text-caption text-text-tertiary">{body}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4">
        <div className="flex items-center gap-2">
          <p className="text-body-s-strong">Prize distribution</p>
          <Demo show={demo} size="xs" className="ml-auto" />
        </div>
        <p className="-mt-2 text-caption text-text-tertiary">
          Round {round.numberLabel} · pool {formatUSDT(round.poolBalance)} ·{' '}
          {round.prizeDistribution.reduce((s, p) => s + p.winners, 0)} prizes
        </p>
        {round.prizeDistribution.map((p) => (
          <div key={p.tier} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-body-s">
              <span>
                {p.label}
                {p.winners > 1 ? ` ×${p.winners}` : ''} · {p.sharePercent}%
                {p.winners > 1 ? ' each' : ''}
              </span>
              <span className="tabular-nums">
                {formatUSDT(p.amountEach)}
                {p.winners > 1 ? ' each' : ''}
              </span>
            </div>
            <Meter value={Number(p.sharePercent)} tone="gold" label={`${p.label} share`} />
          </div>
        ))}
        <p className="border-t border-border-subtle pt-3 text-caption text-text-tertiary">
          Platform fees ({formatUSDT(round.platformFees)}) are separate and never taken from the
          pool. Every qualifying entry has an equal chance; one entry can win at most one prize.
        </p>
      </div>
      <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center">
        {canEnter ? (
          <Button size="l" asChild>
            <Link href={ROUTES.pool}>Enter round</Link>
          </Button>
        ) : (
          <Button size="l" disabled leadingIcon={<Lock aria-hidden />}>
            Enter round
          </Button>
        )}
        <p className="text-caption text-text-tertiary">
          {reason ? `${reason} ` : ''}You can lose your stake — only play with money you can afford
          to lose.
        </p>
      </div>
    </Card>
  );
}
