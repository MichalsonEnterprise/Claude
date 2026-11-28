'use client';

import { formatDateTimeUTC } from '@gp/shared/format';
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Info,
  Lock,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api/client';
import { publicEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

export type Tone =
  'success' | 'warning' | 'danger' | 'info' | 'pending' | 'brand' | 'neutral' | 'gold';

const TONE_TEXT: Record<Tone, string> = {
  success: 'text-text-success',
  warning: 'text-text-warning',
  danger: 'text-text-danger',
  info: 'text-text-info',
  pending: 'text-status-pending',
  brand: 'text-text-brand',
  neutral: 'text-text-secondary',
  gold: 'text-text-gold',
};
const TONE_TILE: Record<Tone, string> = {
  success: 'bg-status-success-tint text-text-success',
  warning: 'bg-status-warning-tint text-text-warning',
  danger: 'bg-status-danger-tint text-text-danger',
  info: 'bg-status-info-tint text-text-info',
  pending: 'bg-status-pending-tint text-status-pending',
  brand: 'bg-brand-tint text-icon-brand',
  neutral: 'bg-surface-raised text-icon-default',
  gold: 'bg-gold-tint-strong text-icon-gold',
};
const TONE_BORDER: Record<Tone, string> = {
  success: 'border-border-success',
  warning: 'border-status-warning/50',
  danger: 'border-border-danger',
  info: 'border-status-info/40',
  pending: 'border-status-pending/40',
  brand: 'border-border-brand',
  neutral: 'border-border-subtle',
  gold: 'border-border-gold',
};

export function toneText(tone: Tone) {
  return TONE_TEXT[tone];
}
export function toneBorder(tone: Tone) {
  return TONE_BORDER[tone];
}

/** DEMO markers only in DEMO builds (the platform is DEMO / testnet only, so this is on by default). */
export function Demo({
  show = true,
  size = 's',
  className,
}: {
  show?: boolean;
  size?: 'xs' | 's' | 'm';
  className?: string;
}) {
  if (!show || !publicEnv.demoMode) return null;
  return <DemoBadge size={size} className={className} />;
}

/** Square icon tile (40 by default) used in rows and cards. */
export function IconTile({
  icon: Icon,
  tone = 'neutral',
  size = 40,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 32 | 36 | 40 | 48 | 56;
  className?: string;
}) {
  const box = {
    32: 'size-8 [&_svg]:size-4',
    36: 'size-9 [&_svg]:size-[18px]',
    40: 'size-10 [&_svg]:size-5',
    48: 'size-12 [&_svg]:size-6',
    56: 'size-14 [&_svg]:size-7',
  }[size];
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md',
        box,
        TONE_TILE[tone],
        className,
      )}
    >
      <Icon />
    </span>
  );
}

/** Small status chip: icon + label (colour is never the only signal). */
export function ToneChip({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-label-s whitespace-nowrap',
        TONE_TILE[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}

/** ✓ / ✕ / ! line used in score breakdowns, check lists and "we will never" cards. */
export function CheckLine({
  ok,
  tone,
  children,
  aside,
  className,
}: {
  ok: boolean | 'warn' | 'info';
  tone?: Tone;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  const Icon =
    ok === true ? CircleCheck : ok === 'warn' ? TriangleAlert : ok === 'info' ? Info : CircleX;
  const t: Tone =
    tone ??
    (ok === true ? 'success' : ok === 'warn' ? 'warning' : ok === 'info' ? 'info' : 'danger');
  return (
    <div className={cn('flex items-start gap-2.5 text-body-s text-text-primary', className)}>
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[t])} />
      <span className="sr-only">{ok === true ? 'Yes: ' : ok === false ? 'No: ' : ''}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {aside && <span className="shrink-0 text-caption text-text-secondary">{aside}</span>}
    </div>
  );
}

/** Card head: title (+ description) with optional right-side content. */
export function SectionCardHeader({
  title,
  description,
  aside,
  as: Heading = 'h2',
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <Heading className="text-h5 text-text-primary">{title}</Heading>
        {description && <p className="mt-1 text-body-s text-text-secondary">{description}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}

/** One settings row: icon tile, title + detail, right-side controls. Stacks below 640 px. */
export function SettingRow({
  icon,
  tone = 'neutral',
  title,
  detail,
  children,
  className,
  first = false,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  detail?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4',
        !first && 'border-t border-border-subtle',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="text-body-m-strong text-text-primary">{title}</div>
          {detail && <div className="mt-0.5 text-body-s text-text-secondary">{detail}</div>}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:shrink-0 sm:pl-0">
          {children}
        </div>
      )}
    </div>
  );
}

/** Label / value pair (definition list row). */
export function KeyValue({
  label,
  value,
  locked = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  locked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-border-subtle py-3 last:border-b-0',
        className,
      )}
    >
      <dt className="text-caption text-text-tertiary">{label}</dt>
      <dd className="flex items-center gap-2 text-body-m text-text-primary">
        <span className="min-w-0 break-words">{value}</span>
        {locked && (
          <Lock
            aria-label="Locked — verified identity"
            className="size-3.5 shrink-0 text-icon-muted"
          />
        )}
      </dd>
    </div>
  );
}

/** Horizontal meter (share / progress). `value` 0–100. */
export function Meter({
  value,
  tone = 'brand',
  label,
  className,
}: {
  value: number;
  tone?: Tone;
  label: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const bar = {
    brand: 'bg-brand',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    info: 'bg-status-info',
    pending: 'bg-status-pending',
    neutral: 'bg-ink-400',
    gold: 'bg-gold',
  }[tone];
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-raised', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', bar)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Circular score (A2 security score). */
export function ScoreRing({ score, max = 100, tone }: { score: number; max?: number; tone: Tone }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  const stroke = {
    success: 'stroke-status-success',
    warning: 'stroke-status-warning',
    danger: 'stroke-status-danger',
  }[tone === 'success' || tone === 'danger' ? tone : 'warning'];
  return (
    <div
      className="relative size-[88px] shrink-0"
      role="img"
      aria-label={`Security score ${score} of ${max}`}
    >
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} className="fill-none stroke-surface-raised" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          className={cn('fill-none transition-[stroke-dashoffset] duration-500', stroke)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-number-l leading-none tabular-nums">{score}</span>
        <span className="text-caption text-text-tertiary">/ {max}</span>
      </div>
    </div>
  );
}

/** "27 Nov 2026, 18:42 UTC" */
export function utc(value: string | null | undefined): string {
  return value ? formatDateTimeUTC(value) : '—';
}

/** Relative time for lists ("40 min ago", "2 d ago"). */
export function relative(value: string, now: number = Date.now()): string {
  const diff = Math.round((now - Date.parse(value)) / 1000);
  if (diff < 0) return formatDateTimeUTC(value);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 30 * 86_400) return `${Math.floor(diff / 86_400)} d ago`;
  return formatDateTimeUTC(value);
}

/** Standard query states: skeleton while loading, error card with retry, otherwise the children. */
export function QueryState({
  query,
  skeleton,
  children,
  label = 'this section',
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  label?: string;
}) {
  if (query.isPending) return <>{skeleton ?? <CardSkeleton />}</>;
  if (query.isError) {
    const ref = query.error instanceof ApiRequestError ? query.error.requestId : undefined;
    return (
      <Card>
        <EmptyState
          type="error"
          title={`We couldn’t load ${label}`}
          description="Your balance and settings are safe. Check your connection and try again."
          reference={ref}
          actions={
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="inline-flex h-10 items-center rounded-md border border-border-default px-4 text-label-m hover:bg-surface-hover"
            >
              Try again
            </button>
          }
        />
      </Card>
    );
  }
  return <>{children}</>;
}

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn('gap-4', className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </Card>
  );
}

/** Inline callout box (info / warning / danger / success) used inside cards. */
export function NoteBox({
  tone = 'info',
  icon,
  title,
  children,
  actions,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const Icon =
    icon ??
    (tone === 'warning'
      ? TriangleAlert
      : tone === 'danger'
        ? CircleAlert
        : tone === 'success'
          ? CircleCheck
          : Info);
  const bg = {
    info: 'bg-status-info-tint/60',
    warning: 'bg-status-warning-tint',
    danger: 'bg-status-danger-tint',
    success: 'bg-status-success-tint',
    pending: 'bg-status-pending-tint',
    brand: 'bg-brand-tint',
    neutral: 'bg-surface-raised',
    gold: 'bg-gold-tint',
  }[tone];
  return (
    <div className={cn('flex gap-3 rounded-md border p-4', bg, TONE_BORDER[tone], className)}>
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', TONE_TEXT[tone])} />
      <div className="min-w-0 flex-1 text-body-s text-text-secondary">
        {title && <p className="mb-1 text-body-s-strong text-text-primary">{title}</p>}
        {children}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Link with a trailing chevron ("View all →"). */
export function ArrowLinkText({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-sm text-label-m text-text-brand hover:underline sm:min-h-0',
        className,
      )}
    >
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}
