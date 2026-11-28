import { cva } from 'class-variance-authority';
import {
  Ban,
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Crown,
  Lock,
  RefreshCw,
  ScanSearch,
  Star,
  TimerOff,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Status set (Figma Badge/Status): every status pairs an icon with a label — colour is never the only signal.
 * Values match the lowercase snake_case convention used by @gp/shared enums.
 */
export type BadgeStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'approved'
  | 'failed'
  | 'rejected'
  | 'under_review'
  | 'restricted'
  | 'live'
  | 'new'
  | 'expired'
  | 'neutral';

interface StatusSpec {
  label: string;
  icon: LucideIcon | 'dot';
  tone: 'pending' | 'info' | 'success' | 'danger' | 'warning' | 'brand' | 'neutral' | 'muted';
  spin?: boolean;
}

export const STATUS_SPEC: Record<BadgeStatus, StatusSpec> = {
  pending: { label: 'Pending', icon: Clock, tone: 'pending' },
  processing: { label: 'Processing', icon: RefreshCw, tone: 'info', spin: true },
  confirmed: { label: 'Confirmed', icon: CircleCheck, tone: 'success' },
  approved: { label: 'Approved', icon: BadgeCheck, tone: 'success' },
  failed: { label: 'Failed', icon: CircleX, tone: 'danger' },
  rejected: { label: 'Rejected', icon: Ban, tone: 'danger' },
  under_review: { label: 'Under review', icon: ScanSearch, tone: 'warning' },
  restricted: { label: 'Restricted', icon: Lock, tone: 'danger' },
  live: { label: 'Live', icon: 'dot', tone: 'brand' },
  new: { label: 'New', icon: Star, tone: 'brand' },
  expired: { label: 'Expired', icon: TimerOff, tone: 'muted' },
  neutral: { label: 'Neutral', icon: CircleDashed, tone: 'neutral' },
};

const statusBadge = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium leading-none',
  {
    variants: {
      tone: {
        pending: 'bg-status-pending-tint text-status-pending',
        info: 'bg-status-info-tint text-text-info',
        success: 'bg-status-success-tint text-text-success',
        danger: 'bg-status-danger-tint text-text-danger',
        warning: 'bg-status-warning-tint text-text-warning',
        brand: 'bg-brand-tint text-text-brand',
        neutral: 'bg-surface-pressed text-text-secondary',
        muted: 'bg-surface-hover text-text-tertiary',
      },
      size: {
        s: 'h-5 px-2 text-[11px] [&_svg]:size-3',
        m: 'h-6 px-2.5 text-label-s [&_svg]:size-3.5',
      },
    },
    defaultVariants: { size: 's', tone: 'neutral' },
  },
);

export interface StatusBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  status: BadgeStatus;
  size?: 's' | 'm';
  /** Override the default label (e.g. 'Drawing', 'Settled', 'Whitelisted'). */
  label?: string;
  /** Uppercase label (used for LIVE / NEW tile badges). */
  uppercase?: boolean;
}

export function StatusBadge({
  status,
  size = 's',
  label,
  uppercase,
  className,
  ...props
}: StatusBadgeProps) {
  const spec = STATUS_SPEC[status];
  const Icon = spec.icon;
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        statusBadge({ tone: spec.tone, size }),
        uppercase && 'uppercase tracking-wide',
        className,
      )}
      {...props}
    >
      {Icon === 'dot' ? (
        <span aria-hidden className="size-1.5 animate-live-pulse rounded-full bg-current" />
      ) : (
        <Icon aria-hidden className={cn(spec.spin && 'animate-spin [animation-duration:2.4s]')} />
      )}
      {label ?? spec.label}
    </span>
  );
}

/** Numeric count pill (Figma Badge/Count): notifications, nav counts, filter counts. */
export function CountBadge({
  count,
  max = 99,
  tone = 'danger',
  size = 's',
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
  count: number;
  max?: number;
  tone?: 'danger' | 'brand' | 'neutral';
  size?: 's' | 'm';
}) {
  const text = count > max ? `${max}+` : String(count);
  return (
    <span
      data-slot="count-badge"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums leading-none',
        size === 's' ? 'h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-[11px]',
        tone === 'danger' && 'bg-status-danger text-text-on-danger',
        tone === 'brand' && 'bg-brand text-text-on-primary',
        tone === 'neutral' && 'bg-surface-pressed text-text-secondary',
        className,
      )}
      {...props}
    >
      {text}
    </span>
  );
}

export type VipTierName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

const VIP_CLASSES: Record<VipTierName, string> = {
  bronze: 'text-vip-bronze border-vip-bronze/40 bg-vip-bronze/10',
  silver: 'text-vip-silver border-vip-silver/40 bg-vip-silver/10',
  gold: 'text-vip-gold border-border-gold bg-gold-tint',
  platinum: 'text-vip-platinum border-vip-platinum/40 bg-vip-platinum/10',
  diamond: 'text-vip-diamond border-vip-diamond/40 bg-vip-diamond/10',
};

/** VIP tier badge (Figma Badge/VIP). */
export function VipBadge({
  tier,
  size = 's',
  label,
  className,
}: {
  tier: VipTierName;
  size?: 's' | 'm';
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold leading-none',
        size === 's'
          ? 'h-5 px-2 text-[11px] [&_svg]:size-3'
          : 'h-6 px-2.5 text-label-s [&_svg]:size-3.5',
        VIP_CLASSES[tier],
        className,
      )}
    >
      <Crown aria-hidden />
      {label ?? `VIP ${tier[0]?.toUpperCase()}${tier.slice(1)}`}
    </span>
  );
}

/** Outlined "18+" pill (Figma Badge/18+). */
export function AgeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full border border-text-tertiary px-2 text-label-s text-text-secondary',
        className,
      )}
      role="img"
      aria-label="18 plus only"
    >
      18+
    </span>
  );
}

/** Plain neutral tag (filter chips, meta labels, tile corner tags). */
export function Tag({
  className,
  tone = 'neutral',
  ...props
}: React.ComponentProps<'span'> & { tone?: 'neutral' | 'brand' | 'gold' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-xs px-1.5 text-[11px] font-semibold uppercase leading-none tracking-wide',
        tone === 'neutral' && 'bg-surface-raised text-text-secondary',
        tone === 'brand' && 'bg-brand text-text-on-primary',
        tone === 'gold' && 'bg-gold text-text-on-gold',
        tone === 'danger' && 'bg-status-danger-strong text-text-on-danger',
        className,
      )}
      {...props}
    />
  );
}
