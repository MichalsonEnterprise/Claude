'use client';

import {
  formatCount,
  formatDateTimeUTC,
  formatDateUTC,
  formatRoundNumber,
  formatTimeUTC,
} from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { ROUND_THRESHOLDS, prizeBreakdown } from '@gp/shared/pool';
import { ArrowRight, Coins, History, Percent, ShieldCheck, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { PoolRoundView } from '@/lib/api/pool';
import { cn } from '@/lib/utils';

import { approxPercent, clock, hmsUntil, oddsFor } from './logic';
import {
  CardHeading,
  KV,
  LicenceStrip,
  POOL_ROUTES,
  PoolPageHeader,
  PoolTabs,
  PrizeDistributionCard,
  QueryError,
  RoundStatusBadge,
  cardCls,
} from './parts';
import { useCurrentRound, useMyRoundEntries, useNow, useRounds, useViewer } from './use-pool';

const SEGMENT = ['bg-gold-300', 'bg-gold-400', 'bg-gold-500', 'bg-gold-600'] as const;

/** GP-11 Prize distribution breakdown for the current round (+ the same split in past rounds). */
export function PrizesPage() {
  const current = useCurrentRound();
  const past = useRounds({ pageSize: 5, status: ['settled', 'cancelled'] });
  const now = useNow();
  const { member } = useViewer();
  const round = current.data ?? null;
  const mine = useMyRoundEntries(member && round?.status === 'open' ? round : null);

  const header = (
    <>
      <PoolPageHeader
        crumbs={[
          { label: 'Lobby', href: '/' },
          { label: 'Global Pool', href: POOL_ROUTES.hub },
          { label: 'Prize distribution' },
        ]}
        title="Prize distribution"
        badges={round?.isDemo ? <DemoBadge size="s" /> : undefined}
        description={
          round
            ? `How the pool of round ${formatRoundNumber(round.number)} is split between 13 winning entries. Shares are fixed in the round rules when the round opens; amounts follow the live pool until entries close at ${formatTimeUTC(round.closesAt)}.`
            : 'How every Global Pool round is split between 13 winning entries.'
        }
        actions={
          <>
            <Button variant="secondary" asChild leadingIcon={<ShieldCheck aria-hidden />}>
              <Link href={POOL_ROUTES.fairness}>Verify a past draw</Link>
            </Button>
            <Button variant="ghost" asChild leadingIcon={<History aria-hidden />}>
              <Link href={POOL_ROUTES.history}>Round history</Link>
            </Button>
          </>
        }
      />
      <PoolTabs active="prizes" entries={mine.data?.entries} />
    </>
  );

  if (current.isPending)
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        {header}
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  if (current.isError)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <QueryError error={current.error} onRetry={() => void current.refetch()} />
      </div>
    );

  const pool = round ? (round.status === 'cancelled' ? '0.00' : round.poolBalance) : '0.00';
  const n = round?.entries ?? 0;
  const tiers = prizeBreakdown(pool).tiers;
  const left =
    round && now !== null && round.status === 'open' ? hmsUntil(round.closesAt, now) : null;
  const odds = mine.data && mine.data.entries > 0 && n > 0 ? oddsFor(mine.data.entries, n) : null;
  const chance = (k: number) => (n > 0 ? approxPercent(money(k).div(n).times(100).toFixed()) : '—');

  return (
    <div className="flex flex-col gap-6 pb-4">
      {header}
      {round && (
        <section
          className={cn(
            cardCls,
            'grid gap-6 p-5 tablet:p-6 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] laptop:items-center',
          )}
        >
          <div className="flex flex-col gap-2 rounded-xl border border-border-gold bg-gold-900/60 bg-gradient-gold-tint p-5">
            <p className="flex items-center gap-2 text-overline text-text-gold uppercase">
              Pool basis · round {formatRoundNumber(round.number)}{' '}
              {round.isDemo && <DemoBadge size="xs" />}
            </p>
            <p className="font-semibold leading-none tabular-nums">
              <span className="bg-gradient-gold-jackpot bg-clip-text text-[length:clamp(32px,6vw,56px)] text-transparent">
                {formatUSDT(pool, { symbol: false })}
              </span>{' '}
              <span className="text-h4 text-text-gold">USDT</span>
            </p>
            <p className="text-caption text-text-secondary">
              100% of the pool is paid out as 13 prizes.
            </p>
          </div>
          <dl className="flex flex-col gap-3">
            <KV
              label="Round"
              value={
                <span className="inline-flex items-center gap-2">
                  {formatRoundNumber(round.number)} <RoundStatusBadge status={round.status} />
                </span>
              }
            />
            <KV
              label="Pool basis"
              value={`${formatCount(n)} qualifying entries × ${round.entryPrice} USDT`}
            />
            <KV
              label={round.status === 'open' ? 'Entries close' : 'Entries closed'}
              value={
                <span
                  suppressHydrationWarning
                >{`${formatDateTimeUTC(round.closesAt)}${left ? ` · in ${clock(left)}` : ''}`}</span>
              }
            />
            <KV
              label="Final amounts"
              value={
                round.status === 'settled'
                  ? `Paid at settlement ${round.settledAt ? formatTimeUTC(round.settledAt) : ''}`
                  : 'Fixed at close, paid at settlement'
              }
            />
          </dl>
        </section>
      )}

      {round && (
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,520fr)_minmax(0,600fr)]">
          <PrizeDistributionCard
            roundNumber={round.number}
            pool={pool}
            tiers={tiers}
            demo={round.isDemo}
            platformFees={round.platformFees}
          />
          <article className={cn(cardCls, 'flex min-w-0 flex-col gap-4 p-5 tablet:p-6')}>
            <CardHeading title="Split of the pool" sub="Share of the pool per prize tier" />
            <div
              className="flex h-10 w-full overflow-hidden rounded-md"
              role="img"
              aria-label="1st 50%, 2nd 20%, 3rd 10%, 10 runner-ups 20%"
            >
              {tiers.map((t, i) => (
                <span
                  key={t.tier}
                  className={cn(
                    'flex items-center justify-center border-r border-bg-base text-label-s text-ink-950 last:border-r-0',
                    SEGMENT[i],
                  )}
                  style={{ width: `${Number(t.sharePercent) * t.winners}%` }}
                >
                  {Number(t.sharePercent) * t.winners}%
                </span>
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-3 text-caption">
              {tiers.map((t, i) => (
                <li key={t.tier} className="flex items-center gap-2">
                  <span aria-hidden className={cn('size-3 rounded-xs', SEGMENT[i])} />
                  <span className="text-text-secondary">
                    {t.winners > 1 ? `${t.winners} runner-ups` : t.label} ·{' '}
                    {formatUSDT(t.amountTotal)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-caption text-text-tertiary">
              Per-winner amounts are rounded down to 6 decimals; the 1st prize takes any remainder
              so the prizes always add up to exactly the pool.
            </p>
          </article>
        </div>
      )}

      {round && (
        <section
          className={cn(cardCls, 'flex min-w-0 flex-col gap-3 p-5 tablet:p-6')}
          aria-labelledby="tiers-title"
        >
          <CardHeading
            title={
              <span id="tiers-title">Prize tiers · round {formatRoundNumber(round.number)}</span>
            }
            demo={round.isDemo}
          />
          <div className="-mx-5 overflow-x-auto tablet:-mx-6">
            <table className="w-full min-w-[720px] text-body-s">
              <thead className="text-left text-caption text-text-tertiary">
                <tr>
                  <th scope="col" className="px-5 py-2 font-medium tablet:px-6">
                    Prize tier
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Share of pool
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Winning entries
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Prize per winner
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Tier total
                  </th>
                  <th scope="col" className="px-5 py-2 text-right font-medium tablet:px-6">
                    Chance per entry
                  </th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.tier} className="border-t border-border-subtle">
                    <td className="px-5 py-3 text-label-m text-text-gold tablet:px-6">
                      {t.winners > 1 ? 'Runner-up' : t.label}
                    </td>
                    <td className="px-3 py-3 text-right text-text-secondary">
                      {t.winners > 1
                        ? `${t.sharePercent}% each · ${Number(t.sharePercent) * t.winners}%`
                        : `${t.sharePercent}%`}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {t.winners > 1 ? 'Ten winning entries' : 'One winning entry'}
                    </td>
                    <td className="px-3 py-3 text-right text-text-primary tabular-nums">
                      {formatUSDT(t.amountEach)}
                    </td>
                    <td className="px-3 py-3 text-right text-text-primary tabular-nums">
                      {formatUSDT(t.amountTotal)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-secondary tabular-nums tablet:px-6">
                      {chance(t.winners)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border-default">
                  <td className="px-5 py-3 text-label-m text-text-primary tablet:px-6" colSpan={3}>
                    Whole pool is paid out · 13 prizes
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right text-label-m text-text-gold tabular-nums">
                    {formatUSDT(pool)}
                  </td>
                  <td className="px-5 py-3 text-right text-text-secondary tabular-nums tablet:px-6">
                    {n > 0 ? `${approxPercent(oddsFor(1, n).anyPrizePercent)} for any prize` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-4 laptop:grid-cols-3">
        <article className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
          <CardHeading
            icon={<Percent aria-hidden className="size-5 text-icon-brand" />}
            title={odds ? `Your chances · ${formatCount(odds.myEntries)} entries` : 'Your chances'}
            as="h3"
          />
          {odds && mine.data ? (
            <dl className="flex flex-col gap-2.5">
              <KV label="1st prize" value={approxPercent(odds.firstPrizePercent)} />
              <KV label="Any prize" value={approxPercent(odds.anyPrizePercent)} />
              <KV
                label="At stake"
                value={`${mine.data.entryAmount} + ${mine.data.platformFee} fee`}
              />
            </dl>
          ) : (
            <p className="text-body-s text-text-secondary">
              {member ? 'You have no entries in this round yet.' : 'Sign in to see your chances.'}{' '}
              With 1 entry of {formatCount(Math.max(n, 1))}, the chance of any prize is{' '}
              {n > 0 ? approxPercent(oddsFor(1, n).anyPrizePercent) : '—'}.
            </p>
          )}
          <p className="text-caption text-text-tertiary">
            You can lose your stake. One entry can win at most one prize.
          </p>
        </article>
        <article className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
          <CardHeading
            icon={<Coins aria-hidden className="size-5 text-icon-gold" />}
            title="Not part of the pool"
            as="h3"
          />
          <dl className="flex flex-col gap-2.5">
            <KV label="Platform fees" value={formatUSDT(round?.platformFees ?? '0')} />
            <KV
              label="Fee basis"
              value={`${formatCount(n)} × ${round?.platformFeePerEntry ?? '0.05'} USDT`}
            />
            <KV label="Network fee on entries" value="0.00 USDT" />
          </dl>
          <p className="text-caption text-text-tertiary">
            Fees are collected separately and are never added to or taken from the prize pool.
          </p>
        </article>
        <article className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
          <CardHeading
            icon={<TriangleAlert aria-hidden className="size-5 text-text-warning" />}
            title="If the round doesn’t draw"
            as="h3"
          />
          <p className="text-body-s text-text-secondary">
            A round needs at least{' '}
            {formatCount(round?.thresholds.minParticipants ?? ROUND_THRESHOLDS.minParticipants)}{' '}
            players and {formatUSDT(round?.thresholds.minPool ?? ROUND_THRESHOLDS.minPool)} at
            close. Otherwise no prizes are paid: every stake goes back to its owner’s Owed balance.
            Platform fees are not refunded.
          </p>
          {past.data?.items.find((r) => r.status === 'cancelled') && (
            <Button variant="ghost" size="s" asChild className="self-start">
              <Link
                href={POOL_ROUTES.round(
                  past.data.items.find((r) => r.status === 'cancelled')!.number,
                )}
              >
                See cancelled round{' '}
                {formatRoundNumber(past.data.items.find((r) => r.status === 'cancelled')!.number)}{' '}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
        </article>
      </div>

      <section
        className={cn(cardCls, 'flex min-w-0 flex-col gap-3 p-5 tablet:p-6')}
        aria-labelledby="past-split"
      >
        <CardHeading
          title={<span id="past-split">Same split in past rounds</span>}
          demo={past.data?.items.some((r) => r.isDemo)}
          action={
            <Button variant="ghost" size="s" asChild>
              <Link href={POOL_ROUTES.history}>
                All rounds <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
        {past.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : past.isError ? (
          <QueryError error={past.error} onRetry={() => void past.refetch()} />
        ) : (
          <div className="-mx-5 overflow-x-auto tablet:-mx-6">
            <table className="w-full min-w-[760px] text-body-s">
              <thead className="text-left text-caption text-text-tertiary">
                <tr>
                  <th scope="col" className="px-5 py-2 font-medium tablet:px-6">
                    Round
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Pool
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    1st prize
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    2nd
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    3rd
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Runner-up each
                  </th>
                  <th scope="col" className="px-5 py-2 font-medium tablet:px-6">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {past.data.items.map((r) => (
                  <PastRow key={r.id} round={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <LicenceStrip />
    </div>
  );
}

function PastRow({ round }: { round: PoolRoundView }) {
  const cancelled = round.status === 'cancelled';
  const t = prizeBreakdown(cancelled ? '0' : round.poolBalance).tiers;
  const first = round.winners[0];
  return (
    <tr className="border-t border-border-subtle">
      <td className="px-5 py-3 tablet:px-6">
        <Link
          href={POOL_ROUTES.round(round.number)}
          className="text-label-m text-text-primary hover:underline"
        >
          {formatRoundNumber(round.number)}
        </Link>
        <span className="block text-caption text-text-tertiary">
          {formatDateUTC(round.closesAt)}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-text-primary tabular-nums">
        {formatUSDT(
          cancelled ? money(round.entryPrice).times(round.entries).toFixed(2) : round.poolBalance,
          { symbol: false },
        )}
      </td>
      {cancelled ? (
        <td colSpan={4} className="px-3 py-3 text-text-warning">
          No prizes — round cancelled · stakes refunded to Owed
        </td>
      ) : (
        <>
          <td className="px-3 py-3">
            <span className="text-label-m text-text-gold tabular-nums">
              {formatUSDT(first?.amount ?? t[0]!.amountEach)}
            </span>
            <span className="block text-caption text-text-tertiary">
              {first?.handle ? `@${first.handle}` : '—'}
            </span>
          </td>
          <td className="px-3 py-3 text-right text-text-secondary tabular-nums">
            {formatUSDT(t[1]!.amountEach, { symbol: false })}
          </td>
          <td className="px-3 py-3 text-right text-text-secondary tabular-nums">
            {formatUSDT(t[2]!.amountEach, { symbol: false })}
          </td>
          <td className="px-3 py-3 text-right text-text-secondary tabular-nums">
            {formatUSDT(t[3]!.amountEach, { symbol: false })}
          </td>
        </>
      )}
      <td className="px-5 py-3 tablet:px-6">
        <span className="flex items-center gap-1.5">
          <RoundStatusBadge status={round.status} />
          {round.isDemo && <DemoBadge size="xs" />}
        </span>
      </td>
    </tr>
  );
}
