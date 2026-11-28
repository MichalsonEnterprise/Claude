'use client';

import { formatCount, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money, mul } from '@gp/shared/money';
import { displayOddsPercent } from '@gp/shared/pool';
import { Activity, CircleHelp, Wallet } from 'lucide-react';
import * as React from 'react';

import { Amount } from '@/components/domain/amount';
import { BALANCE_SPEC, BalanceCard } from '@/components/domain/balance-card';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import type { BalancesView, LifetimeView } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { Demo, IconTile } from '../primitives';

const PARTS = ['available', 'locked', 'pending', 'owed'] as const;

function share(part: string, total: string): string {
  const t = money(total);
  return t.isZero() ? '0' : money(part).div(t).times(100).toDecimalPlaces(2).toString();
}

/** Composition caption for a bucket from the ledger breakdown ("350.00 in entries + 1,500.00 pending withdrawal"). */
function composition(b: BalancesView, type: (typeof PARTS)[number], dailyLimit?: string): string {
  switch (type) {
    case 'available':
      return dailyLimit
        ? `Usable for entries and withdrawable now · daily withdrawal limit ${formatUSDT(dailyLimit)}`
        : 'Usable for entries and withdrawable now';
    case 'locked':
      return b.breakdown.locked.length
        ? b.breakdown.locked
            .map(
              (i) =>
                `${formatUSDT(i.amount, { symbol: false })} ${i.label.charAt(0).toLowerCase()}${i.label.slice(1)}`,
            )
            .join(' · ')
        : 'Nothing locked — no open entries or pending withdrawals';
    case 'pending':
      return b.breakdown.pending.length
        ? b.breakdown.pending.map((i) => i.label).join(' · ')
        : 'No deposits waiting for confirmations';
    case 'owed':
      return b.breakdown.owed.length
        ? b.breakdown.owed
            .map((i) => `${formatUSDT(i.amount, { symbol: false })} ${i.label}`)
            .join(' · ')
        : 'No refunds or rewards waiting';
  }
}

export function BalancesSection({
  balances,
  lifetime,
  dailyLimit,
  demo,
  updatedAt,
  isNew,
}: {
  balances: BalancesView | undefined;
  lifetime: LifetimeView | undefined;
  dailyLimit?: string;
  demo: boolean;
  updatedAt: number;
  isNew: boolean;
}) {
  const updated = updatedAt ? `Updated ${formatTimeUTC(new Date(updatedAt))}` : undefined;
  return (
    <section aria-labelledby="balances-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="balances-h" className="text-h4">
          Balances
        </h2>
        <Demo size="m" show={demo} />
        <div className="ml-auto flex items-center gap-4 text-caption text-text-tertiary">
          {updated && <span className="hidden tablet:inline">{updated}</span>}
          <Popover>
            <PopoverTrigger className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-label-m text-text-secondary hover:text-text-primary tablet:min-h-0">
              <CircleHelp aria-hidden className="size-4" /> What do these mean?
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px]">
              <dl className="flex flex-col gap-3 text-body-s">
                {PARTS.map((p) => (
                  <div key={p}>
                    <dt className={cn('text-body-s-strong', BALANCE_SPEC[p].text)}>
                      {BALANCE_SPEC[p].label}
                    </dt>
                    <dd className="text-text-secondary">{BALANCE_SPEC[p].definition}</dd>
                  </div>
                ))}
              </dl>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!balances ? (
        <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[188px] rounded-lg" />
          ))}
        </div>
      ) : isNew ? (
        <ZeroBalances balances={balances} />
      ) : (
        <>
          <MobileBalances balances={balances} demo={demo} updated={updated} />
          <div className="hidden gap-4 tablet:grid tablet:grid-cols-2 laptop:grid-cols-3">
            <TotalCard balances={balances} demo={demo} updated={updated} />
            {PARTS.map((p) => (
              <BalanceCard
                key={p}
                type={p}
                amount={balances[p]}
                total={balances.total}
                composition={composition(balances, p, p === 'available' ? dailyLimit : undefined)}
                updatedLabel={updated}
                demo={demo}
              />
            ))}
            <LifetimeCard lifetime={lifetime} demo={demo} />
          </div>
        </>
      )}
    </section>
  );
}

function TotalCard({
  balances,
  demo,
  updated,
}: {
  balances: BalancesView;
  demo: boolean;
  updated?: string;
}) {
  return (
    <Card className="gap-4">
      <div className="flex items-center gap-2.5">
        <IconTile icon={Wallet} tone="brand" size={36} />
        <p className="text-body-s-strong text-text-secondary">Total balance</p>
        <Demo show={demo} className="ml-auto" />
      </div>
      <Amount value={balances.total} className="text-number-l" />
      <div
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-raised"
        role="img"
        aria-label={`Available ${share(balances.available, balances.total)}%, locked ${share(balances.locked, balances.total)}%, pending ${share(balances.pending, balances.total)}%, owed ${share(balances.owed, balances.total)}%`}
      >
        {PARTS.map((p) => (
          <span
            key={p}
            className={cn('h-full', BALANCE_SPEC[p].bar)}
            style={{ width: `${share(balances[p], balances.total)}%` }}
          />
        ))}
      </div>
      <p className="text-caption text-text-tertiary">
        Available {formatUSDT(balances.available, { symbol: false })} + Locked{' '}
        {formatUSDT(balances.locked, { symbol: false })} + Pending{' '}
        {formatUSDT(balances.pending, { symbol: false })} + Owed{' '}
        {formatUSDT(balances.owed, { symbol: false })}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3 text-caption text-text-tertiary">
        <span>Reconciled with the ledger</span>
        {updated && <span>{updated}</span>}
      </div>
    </Card>
  );
}

function LifetimeCard({ lifetime, demo }: { lifetime: LifetimeView | undefined; demo: boolean }) {
  return (
    <Card className="gap-4">
      <div className="flex items-center gap-2.5">
        <IconTile icon={Activity} tone="neutral" size={36} />
        <p className="text-body-s-strong text-text-secondary">Lifetime activity</p>
        <Demo show={demo} className="ml-auto" />
      </div>
      {!lifetime ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div>
            <p className="text-caption text-text-tertiary">Total entries</p>
            <p className="text-number-l tabular-nums">{formatCount(lifetime.entries)}</p>
            <p className="text-caption text-text-tertiary">
              {formatUSDT(lifetime.platformFeesPaid)} platform fees paid (
              {formatCount(lifetime.entries)} × {formatUSDT('0.05', { symbol: false })})
            </p>
          </div>
          <div>
            <p className="text-caption text-text-tertiary">Total rewards</p>
            <Amount value={lifetime.rewards} className="text-number-m" />
            <p className="text-caption text-text-tertiary">
              Prizes, VIP rewards and refunds credited to you
            </p>
          </div>
          <p className="mt-auto border-t border-border-subtle pt-3 text-caption text-text-tertiary">
            Deposited {formatUSDT(lifetime.deposits)} · Withdrawn {formatUSDT(lifetime.withdrawals)}
          </p>
        </>
      )}
    </Card>
  );
}

/** Mobile (< 768): one compact breakdown card instead of six cards (Wallet/Balance Breakdown Compact). */
function MobileBalances({
  balances,
  demo,
  updated,
}: {
  balances: BalancesView;
  demo: boolean;
  updated?: string;
}) {
  return (
    <Card className="gap-4 tablet:hidden">
      <div className="flex items-center gap-2">
        <p className="text-body-s-strong text-text-secondary">Total balance</p>
        <Demo show={demo} className="ml-auto" />
      </div>
      <div>
        <Amount value={balances.total} className="text-number-l" />
        {updated && <p className="text-caption text-text-tertiary">{updated}</p>}
      </div>
      <div
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-raised"
        aria-hidden
      >
        {PARTS.map((p) => (
          <span
            key={p}
            className={cn('h-full', BALANCE_SPEC[p].bar)}
            style={{ width: `${share(balances[p], balances.total)}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col">
        {PARTS.map((p) => {
          const Icon = BALANCE_SPEC[p].icon;
          return (
            <li key={p} className="flex items-start gap-3 border-t border-border-subtle py-3">
              <span
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4',
                  BALANCE_SPEC[p].tile,
                )}
              >
                <Icon aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-s-strong">{BALANCE_SPEC[p].label}</p>
                <p className="text-caption text-text-tertiary">{composition(balances, p)}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-number-s tabular-nums', BALANCE_SPEC[p].text)}>
                  {formatUSDT(balances[p], { symbol: false })}
                </p>
                <p className="text-caption text-text-tertiary">
                  {share(balances[p], balances.total)}%
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** New-user zero-balance strip (USR-01 New user). */
function ZeroBalances({ balances }: { balances: BalancesView }) {
  return (
    <Card className="flex-col gap-4 tablet:flex-row tablet:items-center">
      <div className="flex items-end gap-2">
        <div>
          <p className="text-caption text-text-tertiary">Total balance</p>
          <Amount value={balances.total} className="text-number-l" />
        </div>
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-3 tablet:grid-cols-4">
        {PARTS.map((p) => {
          const Icon = BALANCE_SPEC[p].icon;
          return (
            <div key={p}>
              <dt className="flex items-center gap-1.5 text-caption text-text-tertiary">
                <Icon aria-hidden className={cn('size-3.5', BALANCE_SPEC[p].text)} />{' '}
                {BALANCE_SPEC[p].label}
              </dt>
              <dd className="text-number-s tabular-nums">{formatUSDT(balances[p])}</dd>
            </div>
          );
        })}
      </dl>
      <p className="max-w-[260px] text-caption text-text-tertiary">
        Your balances appear here once your first deposit is confirmed on-chain.
      </p>
    </Card>
  );
}

/** "2.44%" helper for odds (string in, string out — no floats): rounded DOWN, never overstated (R48b). */
export function approxPercent(value: string): string {
  return `${displayOddsPercent(value)}%`;
}

/** Total paid for n entries (entry + platform fee lines kept separate). */
export function entryTotals(entries: number, price: string, fee: string) {
  return { stake: mul(price, entries).toFixed(2), fee: mul(fee, entries).toFixed(2) };
}
