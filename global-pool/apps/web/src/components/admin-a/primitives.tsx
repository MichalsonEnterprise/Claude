'use client';

import type { AdminRole, Permission } from '@gp/shared/enums';
import { ADMIN_ROLE_LABEL, PERMISSION_LABEL } from '@gp/shared/enums';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Crown,
  Eye,
  Headset,
  KeyRound,
  Landmark,
  Lock,
  Megaphone,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api/client';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

// ── page header ─────────────────────────────────────────────────────────────────────────────────

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb + H3 title + DEMO DATA + subtitle + right-side actions (admin content header). */
export function AdminPageHeader({
  crumbs,
  title,
  description,
  actions,
  demo = true,
  className,
}: {
  crumbs: Crumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  demo?: boolean;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 laptop:flex-row laptop:items-end', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-body-s text-text-tertiary">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                  {c.href && !last ? (
                    <Link href={c.href} className="hover:text-text-primary">
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={cn(last && 'text-text-primary')}
                    >
                      {c.label}
                    </span>
                  )}
                  {!last && <ChevronRight aria-hidden className="size-3.5" />}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h3 text-text-primary">{title}</h1>
          {demo && <DemoBadge size="m" />}
        </div>
        {description && (
          <p className="max-w-[760px] text-body-s text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// ── panels ──────────────────────────────────────────────────────────────────────────────────────

export function Panel({
  title,
  icon: Icon,
  demo = false,
  actions,
  description,
  children,
  className,
  bodyClassName,
  as: Comp = 'section',
  id,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  demo?: boolean;
  actions?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'div' | 'article';
  id?: string;
}) {
  const headingId = React.useId();
  return (
    <Comp
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-lg border border-border-subtle bg-surface-default p-5',
        className,
      )}
    >
      {(title ?? actions) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {Icon && <Icon aria-hidden className="size-[18px] shrink-0 text-icon-muted" />}
          {title && (
            <h2 id={headingId} className="text-h5 text-text-primary">
              {title}
            </h2>
          )}
          {demo && <DemoBadge size="s" />}
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {description && <p className="-mt-2 text-caption text-text-tertiary">{description}</p>}
      <div className={cn('flex min-w-0 flex-col', bodyClassName)}>{children}</div>
    </Comp>
  );
}

/** Label ··· value row with a hairline on top (dense key/value lists). */
export function KeyValue({
  label,
  value,
  className,
  first = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-start justify-between gap-4 py-2',
        !first && 'border-t border-border-subtle',
        className,
      )}
    >
      <dt className="shrink-0 text-body-s text-text-tertiary">{label}</dt>
      <dd className="min-w-0 text-right text-label-m text-text-primary">{value}</dd>
    </div>
  );
}

// ── KPI tile ────────────────────────────────────────────────────────────────────────────────────

export function KpiTile({
  label,
  value,
  unit,
  context,
  definition,
  tone = 'neutral',
  demo = true,
  href,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** Small line under the value (live / snapshot / counts). */
  context?: React.ReactNode;
  definition?: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'gold';
  demo?: boolean;
  href?: string;
  icon?: LucideIcon;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-caption text-text-secondary">
          {Icon && <Icon aria-hidden className="size-3.5 text-icon-muted" />}
          {label}
        </p>
        {demo && <DemoBadge size="xs" />}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            'text-number-s tabular-nums tablet:text-number-m',
            tone === 'gold'
              ? 'text-text-gold'
              : tone === 'brand'
                ? 'text-text-brand'
                : 'text-text-primary',
          )}
        >
          {value}
        </span>
        {unit && <span className="text-caption text-text-tertiary">{unit}</span>}
      </p>
      {context && (
        <p
          className={cn(
            'text-caption',
            tone === 'success' && 'text-text-success',
            tone === 'warning' && 'text-text-warning',
            tone === 'danger' && 'text-text-danger',
            !['success', 'warning', 'danger'].includes(tone) && 'text-text-tertiary',
          )}
        >
          {context}
        </p>
      )}
      {definition && (
        <p className="mt-auto hidden border-t border-border-subtle pt-2 text-caption text-text-tertiary tablet:block">
          {definition}
        </p>
      )}
    </>
  );
  const cls =
    'flex min-w-0 flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface-default p-3 tablet:gap-2 tablet:p-4';
  if (href) {
    return (
      <Link
        href={href}
        className={cn(cls, 'transition-colors hover:border-border-strong hover:bg-surface-raised')}
      >
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

// ── status line / chips ─────────────────────────────────────────────────────────────────────────

export function StatusLine({
  tone,
  icon: Icon = CircleCheck,
  children,
  className,
}: {
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'brand';
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-label-s',
        tone === 'success' && 'text-text-success',
        tone === 'warning' && 'text-text-warning',
        tone === 'danger' && 'text-text-danger',
        tone === 'info' && 'text-text-info',
        tone === 'muted' && 'text-text-tertiary',
        tone === 'brand' && 'text-text-brand',
        className,
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {children}
    </span>
  );
}

const ROLE_ICON: Record<string, { icon: LucideIcon; cls: string }> = {
  super_admin: { icon: Crown, cls: 'text-text-gold' },
  finance: { icon: Landmark, cls: 'text-text-info' },
  compliance: { icon: ShieldCheck, cls: 'text-text-brand' },
  support: { icon: Headset, cls: 'text-status-pending' },
  marketing: { icon: Megaphone, cls: 'text-text-warning' },
  read_only: { icon: Eye, cls: 'text-text-secondary' },
};

export function roleLabel(role: string): string {
  return ADMIN_ROLE_LABEL[role as AdminRole] ?? role.replace(/_/g, ' ');
}

/** Admin/Role Chip: neutral raised pill with a coloured role icon (S 20 px tables, M 26 px headers). */
export function RoleChip({
  role,
  size = 's',
  className,
}: {
  role: string;
  size?: 's' | 'm';
  className?: string;
}) {
  const spec = ROLE_ICON[role] ?? { icon: KeyRound, cls: 'text-text-secondary' };
  const Icon = spec.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border-subtle bg-surface-raised font-medium text-text-primary',
        size === 's' ? 'h-5 px-2 text-[11px]' : 'h-[26px] px-2.5 text-label-s',
        className,
      )}
    >
      <Icon aria-hidden className={cn(size === 's' ? 'size-3' : 'size-3.5', spec.cls)} />
      {roleLabel(role)}
    </span>
  );
}

export const RISK_TONE = {
  low: 'bg-status-success-tint text-text-success',
  medium: 'bg-status-warning-tint text-text-warning',
  high: 'bg-status-danger-tint text-text-danger',
  critical: 'bg-status-danger text-text-on-danger',
} as const;

export function RiskChip({
  level,
  score,
}: {
  level: keyof typeof RISK_TONE | null | undefined;
  score?: number;
}) {
  if (!level) return <span className="text-caption text-text-tertiary">No open alerts</span>;
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold capitalize',
        RISK_TONE[level],
      )}
    >
      {level}
      {score !== undefined && <span className="tabular-nums">· {score}</span>}
    </span>
  );
}

const KYC_SHORT: Record<string, string> = {
  none: '—',
  level_1: 'L1',
  level_2: 'L2',
  level_3: 'L3',
};

/** User/KYC Status Chip: 'KYC L2 | Approved'. */
export function KycChip({ level, status }: { level: string; status?: string }) {
  const verified = level !== 'none';
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-label-s',
        verified
          ? 'border-border-brand bg-brand-tint-subtle text-text-brand'
          : 'border-border-default bg-surface-raised text-text-secondary',
      )}
    >
      {verified ? (
        <ShieldCheck aria-hidden className="size-3.5" />
      ) : (
        <Lock aria-hidden className="size-3.5" />
      )}
      {verified ? `KYC ${KYC_SHORT[level] ?? level}` : 'No KYC'}
      {status && (
        <>
          <span aria-hidden className="h-3 w-px bg-current opacity-40" />
          <span className="capitalize">{status.replace(/_/g, ' ')}</span>
        </>
      )}
    </span>
  );
}

/** Horizontal meter (RG usage, SLA, risk). `value` and `max` are numbers of the same unit (display only). */
export function Meter({
  value,
  max,
  tone = 'brand',
  label,
}: {
  value: number;
  max: number;
  tone?: 'brand' | 'warning' | 'danger' | 'info';
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-raised"
    >
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'brand' && 'bg-brand',
          tone === 'warning' && 'bg-status-warning',
          tone === 'danger' && 'bg-status-danger',
          tone === 'info' && 'bg-status-info',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── states ──────────────────────────────────────────────────────────────────────────────────────

/** ADM-00 role-based "no permission" state — explains which permission is missing; never shows the data. */
export function NoPermission({
  title = "Your role doesn't include this area",
  permissions,
  role,
  description,
  compact = false,
}: {
  title?: string;
  permissions?: readonly Permission[];
  role?: string | null;
  description?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      data-testid="admin-no-permission"
      className={cn(
        'flex flex-col items-start gap-4 rounded-lg border border-border-subtle bg-surface-default',
        compact ? 'p-5' : 'p-8',
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-md bg-surface-raised text-icon-muted">
        <Lock aria-hidden className="size-6" />
      </span>
      <div className="flex max-w-[640px] flex-col gap-1.5">
        <p className="text-h5 text-text-primary">{title}</p>
        <p className="text-body-s text-text-secondary">
          {description ??
            'This page is left out for your role — the data is not loaded or shown. If you need access for a task, ask a Super Admin; role changes need a second approver and are audit-logged.'}
        </p>
      </div>
      {(permissions?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
          <span>Needs:</span>
          {permissions!.map((p) => (
            <code
              key={p}
              className="rounded-xs bg-surface-raised px-1.5 py-0.5 font-mono text-mono-s text-text-secondary"
              title={PERMISSION_LABEL[p]}
            >
              {p}
            </code>
          ))}
          {role && (
            <>
              <span>· your role:</span>
              <RoleChip role={role} />
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="s">
          <Link href="/admin">Back to overview</Link>
        </Button>
        <Button asChild variant="ghost" size="s">
          <Link href="/admin/permissions">Role permissions</Link>
        </Button>
      </div>
    </div>
  );
}

/** Error panel for a failed query: real message + request id, retry. 403 → NoPermission. */
export function QueryErrorPanel({
  error,
  onRetry,
  role,
  what = 'this data',
}: {
  error: unknown;
  onRetry?: () => void;
  role?: string | null;
  what?: string;
}) {
  if (error instanceof ApiRequestError && error.status === 403) {
    const missing = (error.details?.missingPermissions as Permission[] | undefined) ?? [];
    return <NoPermission permissions={missing} role={role} compact />;
  }
  // Shared ERR-02 copy per error kind (offline, timeout, 429 countdown, maintenance, 5xx) — never raw text.
  const kind = describeError(error, what).kind;
  return (
    <ErrorState
      variant="inline"
      error={error}
      onRetry={onRetry}
      what={what}
      title={kind === 'server' || kind === 'unknown' ? `Couldn’t load ${what}` : undefined}
    />
  );
}

export function PanelSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div
      aria-busy
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-5',
        className,
      )}
    >
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
  label = 'results',
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
  label?: string;
}) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <p className="text-caption text-text-tertiary">
        Page {Math.max(1, page)} of {Math.max(1, totalPages)} · {total.toLocaleString('en-US')}{' '}
        {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="s"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          leadingIcon={<ChevronLeft aria-hidden />}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="s"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          trailingIcon={<ChevronRight aria-hidden />}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

/** Small DEMO-aware cell: value + XS DEMO badge when the record is DEMO. */
export function DemoMark({ demo }: { demo: boolean | undefined }) {
  return demo ? <DemoBadge size="xs" /> : null;
}

export function initialsOf(name: string): string {
  const parts = name
    .replace(/[^A-Za-z. ]/g, '')
    .split(/[\s.]+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
}
