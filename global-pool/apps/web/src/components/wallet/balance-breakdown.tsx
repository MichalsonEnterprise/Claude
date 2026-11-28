'use client';

import { formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { CircleHelp, Wallet } from 'lucide-react';
import * as React from 'react';

import { Amount } from '@/components/domain/amount';
import { BALANCE_SPEC, type BalanceType } from '@/components/domain/balance-card';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoTooltip } from '@/components/ui/tooltip';
import type { WalletBalances } from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

const BUCKETS: Exclude<BalanceType, 'total'>[] = ['available', 'locked', 'pending', 'owed'];

const ROW_HELP: Record<Exclude<BalanceType, 'total'>, string> = {
  available: 'Usable for entries and withdrawable now',
  locked: 'Active round entries and pending withdrawals',
  pending: 'Deposits waiting for network confirmations',
  owed: 'Refunds and rewards on their way to Available',
};

function share(part: string, total: string): string | null {
  const t = money(total);
  if (t.isZero()) return null;
  return money(part).div(t).times(100).toDecimalPlaces(1).toFixed(1);
}

/** "350.00 in active entries · round #1,248 + 1,500.00 pending withdrawal WD-20931" from the API breakdown. */
export function composition(b: WalletBalances, bucket: Exclude<BalanceType, 'total'>): string {
  const items =
    bucket === 'locked'
      ? b.breakdown.locked
      : bucket === 'pending'
        ? b.breakdown.pending
        : bucket === 'owed'
          ? b.breakdown.owed
          : [];
  if (bucket === 'available') return ROW_HELP.available;
  if (items.length === 0) return `Nothing ${bucket} right now`;
  return items
    .map((i) => {
      const label = i.label
        .replace(/^Active entries — /, 'in active entries · ')
        .replace(/^Pending /, 'pending ');
      return `${formatUSDT(i.amount, { symbol: false })} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
    })
    .join(' + ');
}

/**
 * Wallet/Balance Breakdown (WAL-01): total + stacked share bar + one row per bucket with its definition,
 * composition, share and amount. `compact` = the side-summary variant (withdraw flow, laptop, mobile).
 */
export function BalanceBreakdown({
  balances,
  updatedAt,
  compact = false,
  demo = true,
  className,
}: {
  balances: WalletBalances;
  updatedAt?: number;
  compact?: boolean;
  demo?: boolean;
  className?: string;
}) {
  const [glossary, setGlossary] = React.useState(false);
  const b = balances;
  return (
    <Card padding={compact ? 's' : 'l'} radius="xl" className={cn('gap-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-body-s-strong text-text-secondary">
            <Wallet aria-hidden className="size-4 text-icon-muted" />
            Total balance
            <InfoTooltip label="What is the total balance?">
              {BALANCE_SPEC.total.definition}
            </InfoTooltip>
          </div>
          <Amount
            value={b.total}
            className={cn('text-text-primary', compact ? 'text-number-m' : 'text-number-l')}
          />
          {updatedAt !== undefined && updatedAt > 0 && (
            <p className="text-caption text-text-tertiary">
              Updated {formatTimeUTC(new Date(updatedAt))} · computed from your ledger
            </p>
          )}
        </div>
        {demo && <DemoBadge size="s" />}
      </div>

      <div
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-raised"
        role="img"
        aria-label={`Balance split: ${BUCKETS.map((k) => `${BALANCE_SPEC[k].label} ${share(b[k], b.total) ?? '0.0'}%`).join(', ')}`}
      >
        {BUCKETS.map((k) => {
          const pct = share(b[k], b.total);
          if (!pct || pct === '0.0') return null;
          return (
            <span
              key={k}
              className={cn('h-full', BALANCE_SPEC[k].bar)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      <ul className="flex flex-col">
        {BUCKETS.map((k) => {
          const spec = BALANCE_SPEC[k];
          const Icon = spec.icon;
          const pct = share(b[k], b.total);
          return (
            <li
              key={k}
              className="flex items-start gap-3 border-b border-border-subtle py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4',
                  spec.tile,
                )}
              >
                <Icon />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-body-s-strong text-text-primary">{spec.label}</span>
                  <InfoTooltip label={`What is ${spec.label.toLowerCase()}?`}>
                    {spec.definition}
                  </InfoTooltip>
                </div>
                {!compact && <p className="text-caption text-text-tertiary">{composition(b, k)}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Amount value={b[k]} className={cn('text-number-s', spec.text)} />
                <span className="flex items-center gap-1.5 text-caption text-text-tertiary">
                  {pct ? `${pct}%` : '—'}
                  {demo && <DemoBadge size="xs" />}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {!compact && (
        <button
          type="button"
          onClick={() => setGlossary(true)}
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-label-m text-text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
        >
          <CircleHelp aria-hidden className="size-4" />
          What do these balances mean?
        </button>
      )}
      <BalanceGlossary open={glossary} onOpenChange={setGlossary} />
    </Card>
  );
}

/** Balance glossary (WAL-01 "Glossary open"): plain-language definitions of every bucket. */
export function BalanceGlossary({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="m">
        <DialogHeader>
          <DialogTitle>Your balance, in plain words</DialogTitle>
          <DialogDescription>
            Every number comes from an append-only ledger — nothing is edited in place.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <dl className="flex flex-col gap-4">
            {(['total', ...BUCKETS] as BalanceType[]).map((k) => {
              const spec = BALANCE_SPEC[k];
              const Icon = spec.icon;
              return (
                <div key={k} className="flex gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4',
                      spec.tile,
                    )}
                  >
                    <Icon />
                  </span>
                  <div>
                    <dt className="text-body-s-strong text-text-primary">{spec.label}</dt>
                    <dd className="text-body-s text-text-secondary">{spec.definition}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
          <p className="mt-4 text-caption text-text-tertiary">
            Only Available can be withdrawn. Pending becomes Available after the network
            confirmations; Locked is released when the round settles or the withdrawal completes;
            Owed moves to Available when you claim it or when it settles automatically.
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function BalanceBreakdownSkeleton({ className }: { className?: string }) {
  return (
    <Card padding="l" radius="xl" className={cn('gap-5', className)} aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-2 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </Card>
  );
}
