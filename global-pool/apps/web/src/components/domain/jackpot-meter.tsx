'use client';

import { formatUSDT, type MoneyInput } from '@gp/shared/money';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** One rolling digit column: a 0–9 strip translated to the current digit (CSS transition, off for reduced motion). */
function RollingDigit({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-top leading-none">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[1200ms] ease-standard motion-reduce:transition-none"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] bg-gradient-gold-jackpot bg-clip-text text-center text-transparent">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function StaticGlyph({ ch }: { ch: string }) {
  return (
    <span className="inline-block h-[1em] bg-gradient-gold-jackpot bg-clip-text leading-none text-transparent">
      {ch}
    </span>
  );
}

/** Font size is capped by the container width (cqi) so the number never overflows its plaque. */
const SIZE = {
  m: 'text-[length:min(32px,10.5cqi)] tracking-[-0.02em]',
  l: 'text-[length:min(44px,11cqi)] tracking-[-0.025em]',
  xl: 'text-[length:min(64px,11.5cqi)] tracking-[-0.03em]',
} as const;

export interface JackpotMeterProps {
  /** Pool balance as a decimal string, e.g. '186400.00'. */
  amount: MoneyInput;
  size?: keyof typeof SIZE;
  label?: string;
  live?: boolean;
  demo?: boolean;
  /** Caption under the number. Default states that platform fees are not part of the pool. */
  caption?: React.ReactNode;
  /** Render without the plaque frame (inline in heroes). */
  bare?: boolean;
  className?: string;
}

/**
 * Jackpot/Counter on a gold plaque: rolling-digit pool balance with the gold jackpot gradient. Digits roll
 * when `amount` changes (1200 ms, never faster than real data); prefers-reduced-motion jumps instantly.
 */
export function JackpotMeter({
  amount,
  size = 'l',
  label = 'Pool balance',
  live = false,
  demo = false,
  caption,
  bare = false,
  className,
}: JackpotMeterProps) {
  const text = formatUSDT(amount, { symbol: false });
  return (
    <div
      className={cn(
        '@container flex w-full flex-col items-center gap-2 text-center',
        !bare && 'rounded-lg border border-border-gold bg-gold-900/60 bg-gradient-gold-tint px-5 py-4 shadow-inner-hairline',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-overline uppercase text-text-gold">{label}</p>
        {live && <StatusBadge status="live" uppercase />}
        {demo && <DemoBadge size="s" />}
      </div>
      <p className={cn('flex items-baseline gap-2 font-semibold leading-none tabular-nums', SIZE[size])}>
        <span className="sr-only">{formatUSDT(amount)}</span>
        <span aria-hidden className="inline-flex">
          {[...text].map((ch, i) =>
            /\d/.test(ch) ? <RollingDigit key={i} digit={Number(ch)} /> : <StaticGlyph key={i} ch={ch} />,
          )}
        </span>
        <span aria-hidden className="bg-gradient-gold-jackpot bg-clip-text text-[0.5em] text-transparent">
          USDT
        </span>
      </p>
      {caption !== null && (
        <p className="max-w-80 text-caption text-text-secondary">
          {caption ?? 'Platform fees are not part of the pool.'}
        </p>
      )}
    </div>
  );
}
