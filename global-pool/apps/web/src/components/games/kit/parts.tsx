import { formatAmount, money, type MoneyInput } from '@gp/shared/money';
import { CircleCheck, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { AgeBadge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

import { CREDITS_LABEL, CREDITS_UNIT, GAME_COPY } from './registry';

/** DEMO credit amount: '1,234.50' (2 dp, truncated). `signed` adds +/−. */
export function credits(value: MoneyInput, signed = false): string {
  return formatAmount(value, { sign: signed ? 'always' : 'auto' });
}

export function toneOfNet(value: MoneyInput): string {
  try {
    const d = money(value);
    return d.gt(0) ? 'text-text-success' : d.lt(0) ? 'text-text-danger' : 'text-text-primary';
  } catch {
    return 'text-text-primary';
  }
}

/** "10.00 DEMO" — amount + unit, the unit spoken as "DEMO credits" for screen readers. */
export function CreditsAmount({
  value,
  signed = false,
  tone = 'neutral',
  unit = true,
  className,
}: {
  value: MoneyInput;
  signed?: boolean;
  tone?: 'neutral' | 'net' | 'brand' | 'muted';
  unit?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'tabular-nums',
        tone === 'net' && toneOfNet(value),
        tone === 'brand' && 'text-text-brand',
        tone === 'muted' && 'text-text-secondary',
        className,
      )}
    >
      {credits(value, signed)}
      {unit && (
        <>
          {' '}
          <span aria-hidden className="text-[0.8em] font-semibold tracking-[0.02em] opacity-80">
            {CREDITS_UNIT}
          </span>
          <span className="sr-only">DEMO credits</span>
        </>
      )}
    </span>
  );
}

/** "DEMO credits · no cash value" label (every surface that shows DEMO credits). */
export function NoCashValueLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5 text-caption text-text-warning',
        className,
      )}
    >
      <DemoBadge size="xs" />
      {CREDITS_LABEL}
    </span>
  );
}

export function KitChip({
  icon: Icon,
  children,
  tone = 'neutral',
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: 'neutral' | 'brand' | 'danger' | 'warning';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-label-s',
        tone === 'neutral' && 'border-border-default bg-surface-default text-text-secondary',
        tone === 'brand' && 'border-border-brand bg-brand-tint-subtle text-text-brand',
        tone === 'danger' && 'border-border-danger bg-status-danger-tint text-text-danger',
        tone === 'warning' && 'border-status-warning bg-status-warning-tint text-text-warning',
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}

/** Win / lose chip — always icon + label (never colour alone). */
export function OutcomeChip({ win, children }: { win: boolean; children: React.ReactNode }) {
  return (
    <KitChip icon={win ? CircleCheck : CircleX} tone={win ? 'brand' : 'danger'}>
      {children}
    </KitChip>
  );
}

export function KvRow({
  label,
  value,
  demo = false,
  valueClassName,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  demo?: boolean;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 text-body-s', className)}>
      <span className="text-text-secondary">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={cn('text-body-s-strong text-text-primary tabular-nums', valueClassName)}>
          {value}
        </span>
        {demo && <DemoBadge size="xs" />}
      </span>
    </div>
  );
}

/** "You can lose your stake" + independence note (every bet surface). */
export function StakeRiskNote({
  limits,
  className,
}: {
  /** e.g. "Min 0.10 · Max 1,000.00 DEMO per roll." */
  limits?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-status-warning/40 bg-status-warning-tint px-3 py-2.5 text-caption text-text-warning',
        className,
      )}
    >
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" />
      <p>
        <strong className="font-semibold">{GAME_COPY.stakeRisk}</strong>
        {limits ? ` ${limits}` : ''} {GAME_COPY.independent}
      </p>
    </div>
  );
}

/** 18+ · licence / jurisdiction notice (simulation mode). */
export function LicenceLine({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-caption text-text-tertiary', className)}>
      <AgeBadge />
      <span>{GAME_COPY.licence}</span>
    </p>
  );
}

export function SectionCard({
  title,
  aside,
  children,
  className,
  as: As = 'section',
  titleId,
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div';
  titleId?: string;
}) {
  return (
    <As
      aria-labelledby={title && titleId ? titleId : undefined}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5',
        className,
      )}
    >
      {(title ?? aside) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 id={titleId} className="text-h5 text-text-primary">
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </As>
  );
}

/** Small meter (loss limit). `tone` follows the share. */
export function KitMeter({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone = value >= 1 ? 'bg-status-danger' : value >= 0.8 ? 'bg-status-warning' : 'bg-status-info';
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border-default', className)}
    >
      <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}
