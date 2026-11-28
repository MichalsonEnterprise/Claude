import { formatHandle } from '@gp/shared/format';
import { formatUSDT, type MoneyInput } from '@gp/shared/money';
import { ArrowRight, EyeOff } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { TokenMark } from '@/components/brand/chain-mark';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/** Pulsing mint dot used before "live" section titles. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/25',
        className,
      )}
    >
      <span className="size-2 animate-live-pulse rounded-full bg-brand" />
    </span>
  );
}

/** Section title row (Row/Carousel Header): title (+ live dot) · optional subtitle · action on the right. */
export function SectionHeader({
  id,
  title,
  live = false,
  action,
  subtitle,
  className,
}: {
  id: string;
  title: React.ReactNode;
  live?: boolean;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex min-h-8 items-center justify-between gap-4">
        <h2 id={id} className="flex items-center gap-2.5 text-h5 text-text-primary">
          {live && <LiveDot />}
          {title}
        </h2>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {subtitle && <p className="-mb-1.5 text-body-m text-text-secondary">{subtitle}</p>}
    </div>
  );
}

/** Home section wrapper: landmark + consistent spacing between sections. */
export function HomeSection({
  id,
  className,
  children,
  ...props
}: React.ComponentProps<'section'> & { id: string }) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      id={id}
      className={cn('flex scroll-mt-28 flex-col gap-6', className)}
      {...props}
    >
      {children}
    </section>
  );
}

/** "Verify a draw →" style text link (mint, label). */
export function ArrowLink({
  href,
  children,
  className,
  tone = 'brand',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: 'brand' | 'primary';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs text-label-m hover:underline hover:underline-offset-4',
        tone === 'brand' ? 'text-text-brand' : 'text-text-primary',
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden className="size-4 shrink-0" />
    </Link>
  );
}

/** Text filled with the gold jackpot gradient. */
export function GoldText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('bg-gradient-gold-jackpot bg-clip-text text-transparent', className)}
      {...props}
    />
  );
}

/** USDT token glyph + amount (no unit) — wins strip and live bets. */
export function TokenAmount({
  value,
  className,
  tone = 'primary',
  size = 16,
}: {
  value: MoneyInput;
  className?: string;
  tone?: 'primary' | 'gold' | 'success' | 'muted';
  size?: number;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums',
        tone === 'gold' && 'text-text-gold',
        tone === 'success' && 'text-text-success',
        tone === 'muted' && 'text-text-tertiary',
        className,
      )}
    >
      <TokenMark size={size} />
      <span>
        {formatUSDT(value, { symbol: false })}
        <span className="sr-only"> USDT</span>
      </span>
    </span>
  );
}

/** 'mira.sol' → 'MS', 'atlas_q' → 'AQ', 'juno88' → 'JU', 'kestrel' → 'KE'. */
export function initialsOf(handle: string): string {
  const parts = handle
    .replace(/^@/, '')
    .split(/[._-]/)
    .map((p) => p.replace(/\d+/g, ''))
    .filter(Boolean);
  const raw =
    parts.length >= 2 ? `${parts[0]![0]}${parts[1]![0]}` : (parts[0] ?? handle).slice(0, 2);
  return raw.toUpperCase();
}

/** Player cell: initials avatar + @handle, or the "Hidden" placeholder (player opted out of public feeds). */
export function PlayerTag({
  handle,
  size = 's',
  className,
  nameClassName,
}: {
  handle: string | null;
  size?: 's' | 'm';
  className?: string;
  nameClassName?: string;
}) {
  if (!handle) {
    return (
      <span className={cn('inline-flex min-w-0 items-center gap-2 text-text-tertiary', className)}>
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-surface-raised',
            size === 's' ? 'size-6' : 'size-8',
          )}
        >
          <EyeOff className={size === 's' ? 'size-3.5' : 'size-4'} />
        </span>
        <span className={nameClassName}>Hidden</span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar initials={initialsOf(handle)} size={size === 's' ? 's' : 'm'} tone="brand" />
      <span className={cn('truncate', nameClassName)}>{formatHandle(handle)}</span>
    </span>
  );
}
