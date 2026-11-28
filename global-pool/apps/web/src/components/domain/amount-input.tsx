'use client';

import { formatUSDT, gt, isUSDTAmount, lt } from '@gp/shared/money';
import * as React from 'react';

import { TokenMark } from '@/components/brand/chain-mark';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface AmountInputProps {
  /** Decimal string as typed (never a float). */
  value: string;
  onChange: (value: string) => void;
  /** Available balance (decimal string) — drives the header hint, MAX and the over-balance error. */
  available: string;
  label?: string;
  min?: string;
  /** Upper bound in addition to `available` (e.g. daily limit). */
  max?: string;
  /** Fraction digits allowed while typing. Default 2. */
  decimals?: number;
  /** Limits line, e.g. "Min 20.00 · Max 25,000.00 per day". */
  limitsLabel?: React.ReactNode;
  /** External error (server-side validation) — overrides the built-in checks. */
  error?: React.ReactNode;
  demo?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Keep digits and one decimal point, at most `decimals` fraction digits ("1,5" → "1.5"). Exported for tests. */
export function sanitizeAmount(raw: string, decimals: number): string {
  const cleaned = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [int = '', ...rest] = cleaned.split('.');
  if (rest.length === 0) return int.replace(/^0+(?=\d)/, '');
  return `${int.replace(/^0+(?=\d)/, '') || '0'}.${rest.join('').slice(0, decimals)}`;
}

/**
 * Input/Amount: "Available 9,215.30 USDT" header (+DEMO), Number/M value, USDT suffix + MAX, limits line.
 * Errors: over available balance, below minimum, above max. Comparison uses decimal.js via @gp/shared/money.
 */
export function AmountInput({
  value,
  onChange,
  available,
  label = 'Amount',
  min,
  max,
  decimals = 2,
  limitsLabel,
  error,
  demo = false,
  disabled,
  id,
  className,
}: AmountInputProps) {
  const valid = value !== '' && isUSDTAmount(value) && !value.endsWith('.');
  let builtIn: string | null = null;
  if (valid) {
    if (gt(value, available)) builtIn = `Exceeds your available balance (${formatUSDT(available)})`;
    else if (max && gt(value, max)) builtIn = `Above the maximum of ${formatUSDT(max)}`;
    else if (min && lt(value, min)) builtIn = `Minimum is ${formatUSDT(min)}`;
  }
  const message = error ?? builtIn;

  return (
    <Field
      id={id}
      label={label}
      labelAside={
        <>
          <span>
            Available{' '}
            <span className="text-text-primary tabular-nums">{formatUSDT(available)}</span>
          </span>
          {demo && <DemoBadge size="xs" />}
        </>
      }
      error={message ?? undefined}
      helper={message ? undefined : limitsLabel}
      disabled={disabled}
      className={className}
    >
      <InputGroup size="l" className="h-14 pr-2">
        <InputControl
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(sanitizeAmount(e.target.value, decimals))}
          className="text-number-m tabular-nums"
        />
        <span className="flex items-center gap-1.5 text-label-m text-text-secondary">
          <TokenMark size={20} />
          USDT
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(max && gt(available, max) ? max : available)}
          className={cn(
            'ml-1 h-8 rounded-sm border border-border-brand bg-brand-tint px-2.5 text-label-s text-text-brand transition-colors hover:bg-surface-selected',
            'disabled:border-border-subtle disabled:bg-transparent disabled:text-text-disabled',
          )}
        >
          MAX
        </button>
      </InputGroup>
    </Field>
  );
}
