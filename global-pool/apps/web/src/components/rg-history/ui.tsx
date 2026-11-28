/**
 * Small building blocks shared by the RG and history screens (Figma: icon tiles, meters, status chips, KV rows,
 * bullet lists, note boxes). Token classes only.
 */
import { CircleCheck, Clock, Hourglass, Minus, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

type Tone =
  'brand' | 'default' | 'muted' | 'gold' | 'pending' | 'success' | 'warning' | 'danger' | 'info';

const TILE_TONE: Record<Tone, string> = {
  brand: 'bg-brand-tint text-icon-brand',
  default: 'bg-surface-raised text-icon-default',
  muted: 'bg-surface-raised text-icon-muted',
  gold: 'bg-accent-gold-tint text-icon-gold',
  pending: 'bg-status-pending-tint text-status-pending',
  success: 'bg-status-success-tint text-text-success',
  warning: 'bg-status-warning-tint text-text-warning',
  danger: 'bg-status-danger-tint text-text-danger',
  info: 'bg-status-info-tint text-text-info',
};

export function IconTile({
  icon: Icon,
  tone = 'brand',
  size = 40,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 32 | 36 | 40 | 48;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md',
        TILE_TONE[tone],
        size === 32 && 'size-8 [&_svg]:size-4',
        size === 36 && 'size-9 [&_svg]:size-[18px]',
        size === 40 && 'size-10 [&_svg]:size-5',
        size === 48 && 'size-12 [&_svg]:size-6',
        className,
      )}
    >
      <Icon />
    </span>
  );
}

/** Usage meter; `value` 0–1. Colour turns amber ≥ 80 % and red at 100 %. */
export function Meter({
  value,
  label,
  tone,
  className,
}: {
  value: number;
  label: string;
  tone?: 'brand' | 'warning' | 'danger' | 'gold';
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10;
  const t = tone ?? (value >= 1 ? 'danger' : value >= 0.8 ? 'warning' : 'brand');
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-raised', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          t === 'brand' && 'bg-brand',
          t === 'warning' && 'bg-status-warning',
          t === 'danger' && 'bg-status-danger',
          t === 'gold' && 'bg-gold',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const CHIP: Record<
  'on' | 'off' | 'pending' | 'active' | 'info',
  { icon: LucideIcon; cls: string }
> = {
  on: { icon: CircleCheck, cls: 'bg-status-success-tint text-text-success' },
  off: { icon: Minus, cls: 'bg-surface-raised text-text-secondary' },
  pending: { icon: Clock, cls: 'bg-status-pending-tint text-status-pending' },
  active: { icon: Hourglass, cls: 'bg-status-info-tint text-text-info' },
  info: { icon: Clock, cls: 'bg-status-info-tint text-text-info' },
};

export function Chip({
  kind,
  children,
  icon,
  className,
}: {
  kind: keyof typeof CHIP;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  const spec = CHIP[kind];
  const Icon = icon ?? spec.icon;
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-label-s whitespace-nowrap [&_svg]:size-3.5',
        spec.cls,
        className,
      )}
    >
      <Icon aria-hidden />
      {children}
    </span>
  );
}

export function SectionHead({
  title,
  sub,
  as: As = 'h2',
  className,
  aside,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex max-w-[900px] flex-col gap-1">
        <As className="text-h4 text-text-primary">{title}</As>
        {sub && <p className="text-body-s text-text-secondary">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Label / value row with a hairline (Figma kv()). */
export function KV({
  label,
  value,
  demo = true,
  divider = true,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  demo?: boolean;
  divider?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-3',
        divider && 'border-b border-border-subtle',
      )}
    >
      <span className="min-w-0 text-body-s text-text-secondary">{label}</span>
      <span className="flex shrink-0 items-center gap-2 text-right">
        <span className={cn('text-body-s-strong text-text-primary tabular-nums', valueClassName)}>
          {value}
        </span>
        {demo && <DemoBadge size="xs" />}
      </span>
    </div>
  );
}

export function Bullet({
  icon,
  title,
  body,
  tone = 'brand',
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  body?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-start gap-3">
      <IconTile icon={icon} tone={tone} size={32} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-s-strong text-text-primary">{title}</p>
        {body && <p className="text-body-s text-text-secondary">{body}</p>}
      </div>
    </div>
  );
}

export function NoteBox({
  icon: Icon,
  tone = 'info',
  children,
  className,
}: {
  icon: LucideIcon;
  tone?: 'info' | 'pending' | 'warning' | 'success' | 'danger';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md p-3 text-body-s text-text-primary',
        tone === 'info' && 'bg-status-info-tint [&>svg]:text-text-info',
        tone === 'pending' && 'bg-status-pending-tint [&>svg]:text-status-pending',
        tone === 'warning' && 'bg-status-warning-tint [&>svg]:text-text-warning',
        tone === 'success' && 'bg-status-success-tint [&>svg]:text-text-success',
        tone === 'danger' && 'bg-status-danger-tint [&>svg]:text-text-danger',
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Main + right rail columns (672 / 440 at 1440; stacked below 1280). */
export function Columns({
  main,
  rail,
  railWidth = 440,
}: {
  main: React.ReactNode;
  rail: React.ReactNode;
  railWidth?: 440 | 520;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-6',
        railWidth === 440
          ? 'laptop:grid-cols-[minmax(0,1fr)_360px] desktop:grid-cols-[minmax(0,1fr)_440px]'
          : 'laptop:grid-cols-[440px_minmax(0,1fr)] desktop:grid-cols-[520px_minmax(0,1fr)]',
      )}
    >
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="flex min-w-0 flex-col gap-6">{rail}</div>
    </div>
  );
}

export function CardHead({
  icon,
  tone = 'brand',
  title,
  sub,
  aside,
  level = 'h3',
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  sub?: React.ReactNode;
  aside?: React.ReactNode;
  level?: 'h2' | 'h3';
}) {
  const H = level;
  return (
    <div className="flex items-center gap-3">
      {icon && <IconTile icon={icon} tone={tone} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <H className="text-h5 text-text-primary">{title}</H>
        {sub && <p className="text-body-s text-text-tertiary">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
