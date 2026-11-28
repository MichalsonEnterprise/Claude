import { formatUSDT, type MoneyInput } from '@gp/shared/money';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface AmountProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Decimal string (never a float), e.g. '9215.30'. */
  value: MoneyInput;
  /** 'signed' colours positives green with "+" and negatives red with "−" (money in / out). */
  tone?: 'neutral' | 'signed' | 'gold' | 'brand' | 'muted';
  /** Show the "USDT" unit (smaller, secondary). Default true. */
  unit?: boolean;
  decimals?: number;
}

/** USDT amount: formatUSDT() digits (tabular) + small unit. Money is formatted from decimal strings only. */
export function Amount({ value, tone = 'neutral', unit = true, decimals = 2, className, ...props }: AmountProps) {
  const text = formatUSDT(value, {
    symbol: false,
    decimals,
    sign: tone === 'signed' ? 'always' : 'auto',
  });
  const negative = text.startsWith('−');
  const positive = text.startsWith('+');
  return (
    <span
      data-slot="amount"
      className={cn(
        'inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums',
        tone === 'signed' && positive && 'text-text-success',
        tone === 'signed' && negative && 'text-text-danger',
        tone === 'gold' && 'text-text-gold',
        tone === 'brand' && 'text-text-brand',
        tone === 'muted' && 'text-text-secondary',
        className,
      )}
      {...props}
    >
      <span>{text}</span>
      {unit && <span className="text-[0.7em] font-medium text-text-secondary">USDT</span>}
    </span>
  );
}
