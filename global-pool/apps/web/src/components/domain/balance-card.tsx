import { money, type MoneyInput } from '@gp/shared/money';
import { CircleCheck, Clock, Coins, Lock, Wallet, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { InfoTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { Amount } from './amount';

export type BalanceType = 'total' | 'available' | 'locked' | 'pending' | 'owed';

interface BalanceSpec {
  label: string;
  icon: LucideIcon;
  text: string;
  tile: string;
  bar: string;
  definition: string;
}

/** Balance semantics (decision #5): Available green ✓ · Locked neutral 🔒 · Pending sky ⏱ · Owed gold coins. */
export const BALANCE_SPEC: Record<BalanceType, BalanceSpec> = {
  total: {
    label: 'Total balance',
    icon: Wallet,
    text: 'text-text-primary',
    tile: 'bg-surface-raised text-icon-default',
    bar: 'bg-text-primary',
    definition: 'Everything you hold on GLOBAL POOL: Available + Locked + Pending + Owed.',
  },
  available: {
    label: 'Available',
    icon: CircleCheck,
    text: 'text-balance-available',
    tile: 'bg-status-success-tint text-balance-available',
    bar: 'bg-balance-available',
    definition: 'Usable now — enter rounds, play or withdraw.',
  },
  locked: {
    label: 'Locked',
    icon: Lock,
    text: 'text-balance-locked',
    tile: 'bg-surface-pressed text-balance-locked',
    bar: 'bg-balance-locked',
    definition:
      'Held for active round entries and pending withdrawals. Released when the round settles or the withdrawal completes.',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    text: 'text-balance-pending',
    tile: 'bg-status-info-tint text-balance-pending',
    bar: 'bg-balance-pending',
    definition: 'Deposits waiting for network confirmations. Credited to Available once confirmed.',
  },
  owed: {
    label: 'Owed',
    icon: Coins,
    text: 'text-balance-owed',
    tile: 'bg-gold-tint-strong text-balance-owed',
    bar: 'bg-balance-owed',
    definition:
      'Refunds and rewards we owe you (e.g. a cancelled round). Credited to Available automatically — no claim deadline.',
  },
};

export interface BalanceCardProps {
  type: BalanceType;
  /** Decimal string, e.g. '9215.30'. */
  amount: MoneyInput;
  /** Total balance — shows the share bar + percentage when given. */
  total?: MoneyInput;
  /** Composition caption, e.g. "350.00 in 35 entries + 1,500.00 pending withdrawal". */
  composition?: React.ReactNode;
  /** Footer timestamp, e.g. "Updated 18:42 UTC". */
  updatedLabel?: string;
  demo?: boolean;
  className?: string;
}

/** Card/Balance (320): icon tile + label + definition tooltip, amount in its balance colour, share bar. */
export function BalanceCard({
  type,
  amount,
  total,
  composition,
  updatedLabel,
  demo = false,
  className,
}: BalanceCardProps) {
  const spec = BALANCE_SPEC[type];
  const Icon = spec.icon;
  const totalDec = total !== undefined ? money(total) : null;
  const share =
    totalDec && !totalDec.isZero() ? money(amount).div(totalDec).times(100).toDecimalPlaces(1) : null;
  return (
    <Card className={cn('gap-4', className)}>
      <div className="flex items-center gap-2.5">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-[18px]', spec.tile)}>
          <Icon aria-hidden />
        </span>
        <p className="text-body-s-strong text-text-secondary">{spec.label}</p>
        <InfoTooltip label={`What is ${spec.label.toLowerCase()}?`}>{spec.definition}</InfoTooltip>
        {demo && <DemoBadge size="s" className="ml-auto" />}
      </div>
      <Amount value={amount} className={cn('text-number-l', spec.text)} />
      {share && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
          role="meter"
          aria-label={`${spec.label} share of total`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={share.toNumber()}
        >
          <div className={cn('h-full rounded-full', spec.bar)} style={{ width: `${share.toFixed(1)}%` }} />
        </div>
      )}
      {composition && <p className="text-caption text-text-tertiary">{composition}</p>}
      {(share ?? updatedLabel) && (
        <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-caption text-text-tertiary">
          <span>{share ? `${share.toFixed(1)}% of total` : ''}</span>
          {updatedLabel && <span>{updatedLabel}</span>}
        </div>
      )}
    </Card>
  );
}
