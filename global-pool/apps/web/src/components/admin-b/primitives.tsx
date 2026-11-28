'use client';

/**
 * Admin-b building blocks (Finance · Global Pool · Compliance back-office). Token classes only; money is a decimal
 * string formatted through @gp/shared/money. Every DEMO value carries a DEMO badge.
 */
import { formatCount, formatDateTimeUTC, formatTimeUTC, truncateAddress } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Copy,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin-a/primitives';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

import { COMPLIANCE_NAV, FINANCE_NAV, POOL_NAV } from './nav';

// ── formatting ────────────────────────────────────────────────────────────────────────────────

/** "1,234.56" (no unit) from a decimal string. */
export const usd = (v: string | null | undefined, decimals = 2) =>
  formatUSDT(v ?? '0', { symbol: false, decimals });
/** "1,234.56 USDT". */
export const usdt = (v: string | null | undefined) => formatUSDT(v ?? '0');
export const count = (n: number | null | undefined) => formatCount(n ?? 0);
export const dt = (iso: string | null | undefined) => (iso ? formatDateTimeUTC(iso) : '—');
export const time = (iso: string | null | undefined) =>
  iso ? formatTimeUTC(iso).replace(' UTC', '') : '—';
export const short = (v: string | null | undefined) => (v ? truncateAddress(v) : '—');
export const roundLabel = (n: number | null | undefined) => (n ? `#${formatCount(n)}` : '—');

export function humanMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined) return '—';
  const m = Math.abs(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  const s = h > 0 ? `${h} h ${String(r).padStart(2, '0')} min` : `${r} min`;
  return min < 0 ? `${s} overdue` : `${s} left`;
}

// ── page structure ────────────────────────────────────────────────────────────────────────────

const MODULE_HREF: Record<string, string> = {
  Finance: '/admin/finance/deposits',
  'Global Pool': '/admin/pool',
  Compliance: '/admin/compliance/kyc',
};

/** Page header in the admin-a shell style (breadcrumb + H3 + DEMO DATA + subtitle + actions). */
export function ModuleHeader({
  module,
  title,
  crumb,
  description,
  actions,
  badges,
  className,
}: {
  module: string;
  title: React.ReactNode;
  /** Breadcrumb label when `title` is not plain text. */
  crumb?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}) {
  const sub = MODULE_SUBNAV[module];
  return (
    <>
      <AdminPageHeader
        className={className}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: module, href: MODULE_HREF[module] },
          { label: crumb ?? (typeof title === 'string' ? title : module) },
        ]}
        title={
          badges ? (
            <span className="inline-flex flex-wrap items-center gap-3">
              {title}
              {badges}
            </span>
          ) : (
            title
          )
        }
        description={description}
        actions={actions}
      />
      {sub ? (
        <SubNav items={sub.items} label={`${module} sections`} className={sub.className} />
      ) : null}
    </>
  );
}

/**
 * Module sub-navigation under the page header: Global Pool always (Figma tabs); Finance and Compliance only below
 * 1280, where the admin sidebar (which lists their pages) is collapsed into the drawer.
 */
const MODULE_SUBNAV: Record<string, { items: SubNavItem[]; className?: string }> = {
  Finance: { items: FINANCE_NAV, className: 'laptop:hidden' },
  'Global Pool': { items: POOL_NAV },
  Compliance: { items: COMPLIANCE_NAV, className: 'laptop:hidden' },
};

export interface SubNavItem {
  href: string;
  label: string;
  /** Match prefix (default exact). */
  prefix?: boolean;
}

/** Module sub-navigation (Tabs/Underline look); scrolls horizontally on small screens. */
export function SubNav({
  items,
  label,
  className,
}: {
  items: SubNavItem[];
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className={cn('-mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0', className)}
    >
      <ul className="flex min-w-max gap-5 border-b border-border-subtle">
        {items.map((it) => {
          const active = it.prefix ? pathname.startsWith(it.href) : pathname === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex h-11 items-center whitespace-nowrap text-label-m outline-none focus-visible:shadow-focus-ring',
                  active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                {it.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Panel({
  title,
  icon: Icon,
  actions,
  description,
  demo,
  children,
  className,
  bodyClassName,
  flush,
  mobileBare,
  id,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  description?: React.ReactNode;
  demo?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No body padding (tables). */
  flush?: boolean;
  /** < 768: drop the panel chrome so the content (e.g. card lists) sits on the page. */
  mobileBare?: boolean;
  id?: string;
}) {
  const headingId = React.useId();
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        'flex min-w-0 flex-col rounded-lg border border-border-subtle bg-surface-default',
        mobileBare && 'max-tablet:border-0 max-tablet:bg-transparent',
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            'flex flex-wrap items-start justify-between gap-2 px-4 pt-4 pb-3 tablet:px-5',
            mobileBare && 'max-tablet:px-0 max-tablet:pt-0',
          )}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId} className="flex items-center gap-2 text-h5 text-text-primary">
              {Icon ? <Icon aria-hidden className="size-4 shrink-0 text-icon-muted" /> : null}
              <span className="min-w-0">{title}</span>
              {demo ? <DemoBadge size="xs" /> : null}
            </h2>
            {description ? <p className="text-caption text-text-tertiary">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div
        className={cn(
          flush ? '' : 'px-4 pb-4 tablet:px-5 tablet:pb-5',
          !title && !flush && 'pt-4',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'gold';
const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-text-secondary',
  success: 'text-text-success',
  warning: 'text-text-warning',
  danger: 'text-text-danger',
  info: 'text-text-info',
  brand: 'text-text-brand',
  gold: 'text-text-gold',
};
const TONE_TINT: Record<Tone, string> = {
  neutral: 'bg-surface-raised text-text-secondary',
  success: 'bg-status-success-tint text-text-success',
  warning: 'bg-status-warning-tint text-text-warning',
  danger: 'bg-status-danger-tint text-text-danger',
  info: 'bg-status-info-tint text-text-info',
  brand: 'bg-brand-tint text-text-brand',
  gold: 'bg-gold-tint text-text-gold',
};

/** KPI tile (Admin/KPI Tile): label, big number, unit, a context line and an optional definition. */
export function KpiTile({
  label,
  value,
  unit,
  sub,
  subTone = 'neutral',
  icon: Icon,
  demo,
  definition,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  subTone?: Tone;
  icon?: LucideIcon;
  demo?: boolean;
  definition?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface-default p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-label-s text-text-tertiary">
          {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
          <span className="truncate">{label}</span>
        </p>
        {demo ? <DemoBadge size="xs" /> : null}
      </div>
      <p className="flex flex-wrap items-baseline gap-1 text-number-m text-text-primary tabular-nums">
        <span className="min-w-0 break-all">{value}</span>
        {unit ? <span className="text-label-s text-text-tertiary">{unit}</span> : null}
      </p>
      {sub ? <p className={cn('text-caption', TONE_TEXT[subTone])}>{sub}</p> : null}
      {definition ? <p className="text-caption text-text-tertiary">{definition}</p> : null}
    </div>
  );
}

export function KpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 laptop:grid-cols-4', className)}>{children}</div>
  );
}

export function Pill({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-label-s whitespace-nowrap',
        TONE_TINT[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}

export const RISK_TONE: Record<string, Tone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};
export function RiskPill({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-caption text-text-tertiary">—</span>;
  return (
    <Pill tone={RISK_TONE[level] ?? 'neutral'} icon={level === 'low' ? ShieldCheck : AlertTriangle}>
      {level[0]!.toUpperCase() + level.slice(1)}
    </Pill>
  );
}

/** Key–value list (definition list). */
export function KeyValues({
  items,
  className,
  columns = 1,
}: {
  items: { k: React.ReactNode; v: React.ReactNode; mono?: boolean }[];
  className?: string;
  columns?: 1 | 2;
}) {
  return (
    <dl className={cn('grid gap-x-6', columns === 2 && 'tablet:grid-cols-2', className)}>
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-4 border-b border-border-subtle py-2.5 last:border-0"
        >
          <dt className="text-body-s text-text-tertiary">{it.k}</dt>
          <dd
            className={cn(
              'min-w-0 text-right text-body-s-strong text-text-primary tabular-nums',
              it.mono && 'font-mono text-mono-s',
            )}
          >
            {it.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MoneyText({
  value,
  unit = true,
  className,
  tone,
}: {
  value: string | null | undefined;
  unit?: boolean;
  className?: string;
  tone?: 'signed';
}) {
  const v = value ?? '0';
  const negative = v.trim().startsWith('-');
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        tone === 'signed' && (negative ? 'text-text-danger' : 'text-text-success'),
        className,
      )}
    >
      {tone === 'signed' && !negative && v !== '0' && v !== '0.00' ? '+' : ''}
      {formatUSDT(v, { symbol: false })}
      {unit ? <span className="ml-1 text-caption text-text-tertiary">USDT</span> : null}
    </span>
  );
}

export function CopyHash({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-mono-s text-text-secondary" title={value}>
        {truncateAddress(value, { lead: 8, tail: 6 })}
      </span>
      <button
        type="button"
        aria-label={`Copy ${label ?? 'value'}`}
        className="inline-flex size-8 items-center justify-center rounded-sm text-icon-muted hover:text-text-primary focus-visible:shadow-focus-ring"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? (
          <CircleCheck aria-hidden className="size-3.5 text-text-success" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
      </button>
    </span>
  );
}

// ── query states ──────────────────────────────────────────────────────────────────────────────

export function PageSkeleton({ tiles = 4, rows = 6 }: { tiles?: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-11 rounded-lg" />
      <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

export function errorText(error: unknown): {
  title: string;
  description: string;
  reference?: string;
} {
  if (error instanceof ApiRequestError) {
    if (error.status === 401)
      return { title: 'Your admin session has ended', description: 'Sign in again to continue.' };
    if (error.status === 403)
      return {
        title: 'Your role can’t open this page',
        description: 'Ask a Super Admin for the permission if you need it. Nothing was changed.',
        reference: error.requestId,
      };
    return {
      title: 'This data could not be loaded',
      description: error.message,
      reference: error.requestId,
    };
  }
  return {
    title: 'This data could not be loaded',
    description: 'Check that the API is running and try again.',
  };
}

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = errorText(error);
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-default p-6">
      <EmptyState
        type="error"
        title={e.title}
        description={e.description}
        reference={e.reference}
        actions={
          onRetry ? (
            <Button variant="secondary" size="s" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

/** Loading → error → content, the standard trio for every admin-b page. */
export function QueryView<T>({
  query,
  children,
  skeleton,
}: {
  query: {
    data: T | undefined;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  children: (data: T) => React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  if (query.isPending) return <>{skeleton ?? <PageSkeleton />}</>;
  if (query.isError || query.data === undefined)
    return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}

// ── data table (table ≥ tablet, stacked cards on phones) ─────────────────────────────────────

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  /** Hide below this breakpoint (low-priority columns). */
  hideBelow?: 'laptop' | 'desktop';
  className?: string;
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  laptop: 'hidden laptop:table-cell',
  desktop: 'hidden desktop:table-cell',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  mobileCard,
  onRowClick,
  rowHref,
  selectedKey,
  footer,
  density = 'compact',
  mobileVariant = 'list',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  empty?: React.ReactNode;
  /** Phone layout (< 768). */
  mobileCard?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  selectedKey?: string | null;
  footer?: React.ReactNode;
  density?: 'compact' | 'comfortable';
  /** Phone layout: divided list inside the panel, or separate bordered cards (pair with Panel mobileBare). */
  mobileVariant?: 'list' | 'cards';
}) {
  if (rows.length === 0) return <>{empty}</>;
  const cards = mobileVariant === 'cards';
  const item = cards
    ? 'block rounded-lg border border-border-subtle bg-surface-default p-4 outline-none hover:border-border-strong focus-visible:shadow-focus-ring'
    : 'block px-4 py-3 outline-none hover:bg-surface-hover focus-visible:shadow-focus-ring';
  return (
    <>
      {mobileCard ? (
        <ul
          className={cn(
            'flex flex-col tablet:hidden',
            cards ? 'gap-3' : 'divide-y divide-border-subtle',
          )}
          aria-label={caption}
        >
          {rows.map((r) => {
            const href = rowHref?.(r);
            const inner = mobileCard(r);
            return (
              <li key={rowKey(r)}>
                {href ? (
                  <Link href={href} className={item}>
                    {inner}
                  </Link>
                ) : onRowClick ? (
                  <button
                    type="button"
                    onClick={() => onRowClick(r)}
                    className={cn(item, 'w-full text-left')}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className={cards ? item : 'px-4 py-3'}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className={cn('w-full overflow-x-auto', mobileCard && 'hidden tablet:block')}>
        <table data-density={density} className="group/table w-full border-collapse text-body-s">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-bg-secondary/60">
            <tr className="border-b border-border-subtle">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'h-10 px-3 text-overline whitespace-nowrap uppercase text-text-tertiary first:pl-4 last:pr-4 tablet:first:pl-5 tablet:last:pr-5',
                    c.align === 'right' ? 'text-right' : 'text-left',
                    c.hideBelow && HIDE[c.hideBelow],
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const k = rowKey(r);
              const href = rowHref?.(r);
              return (
                <tr
                  key={k}
                  data-state={selectedKey === k ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn(
                    'border-b border-border-subtle transition-colors last:border-0 hover:bg-surface-hover data-[state=selected]:bg-surface-selected',
                    (onRowClick || href) && 'cursor-pointer',
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn(
                        'h-12 px-3 align-middle whitespace-nowrap text-text-primary first:pl-4 last:pr-4 tablet:first:pl-5 tablet:last:pr-5',
                        density === 'comfortable' && 'h-14',
                        c.align === 'right' && 'text-right tabular-nums',
                        c.hideBelow && HIDE[c.hideBelow],
                        c.className,
                      )}
                    >
                      {i === 0 && href ? (
                        <Link
                          href={href}
                          className="rounded-xs outline-none hover:underline focus-visible:shadow-focus-ring"
                        >
                          {c.cell(r)}
                        </Link>
                      ) : (
                        c.cell(r)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  noun = 'rows',
  demo,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  noun?: string;
  demo?: boolean;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-4 py-3 tablet:px-5">
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        Showing {count(from)}–{count(to)} of {count(total)} {noun}
        {demo ? <DemoBadge size="xs" /> : null}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="s"
          className="size-11 p-0 tablet:size-8"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-label-s text-text-secondary">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="ghost"
          size="s"
          className="size-11 p-0 tablet:size-8"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Filter chips row (single select). */
export function FilterChips<V extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:flex-wrap tablet:px-0"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-label-s whitespace-nowrap outline-none focus-visible:shadow-focus-ring tablet:h-8',
              on
                ? 'border-border-brand bg-brand-tint text-text-primary'
                : 'border-border-subtle bg-surface-default text-text-secondary hover:text-text-primary',
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className={cn('tabular-nums', on ? 'text-text-brand' : 'text-text-tertiary')}>
                {count(o.count)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ── compliance / integrity panels ─────────────────────────────────────────────────────────────

/** "Immutable by design" — the capabilities no admin role has (rendered on finance + pool screens). */
export function ImmutablePanel({
  cannot,
  allowed,
  title = 'Immutable by design',
  compact,
  action,
}: {
  cannot: string[];
  allowed?: string;
  title?: string;
  compact?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Panel title={title} icon={ShieldCheck} className="border-border-brand bg-surface-default">
      <p className="mb-3 text-body-s text-text-secondary">
        No one at GLOBAL POOL — including Super Admins — can influence who wins or how much is paid.
        These limits are enforced by the contract and the API, not by permissions.
      </p>
      <ul className={cn('flex flex-wrap gap-2', compact && 'flex-col items-start')}>
        {cannot.map((c) => (
          <li
            key={c}
            className="inline-flex items-center gap-1.5 rounded-full bg-status-danger-tint px-3 py-1 text-label-s text-text-primary"
          >
            <Ban aria-hidden className="size-3.5 text-text-danger" />
            <span>
              <span className="sr-only">Cannot: </span>
              {c}
            </span>
          </li>
        ))}
      </ul>
      {allowed ? <p className="mt-3 text-caption text-text-tertiary">{allowed}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </Panel>
  );
}

export function StatusLine({
  ok,
  pending,
  label,
  detail,
}: {
  ok: boolean | null;
  pending?: boolean;
  label: React.ReactNode;
  detail?: React.ReactNode;
}) {
  const Icon = pending ? CircleDashed : ok ? CircleCheck : AlertTriangle;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0',
          pending ? 'text-text-tertiary' : ok ? 'text-text-success' : 'text-text-danger',
        )}
      />
      <div className="min-w-0">
        <p className="text-body-s-strong text-text-primary">
          <span className="sr-only">{pending ? 'Pending: ' : ok ? 'OK: ' : 'Problem: '}</span>
          {label}
        </p>
        {detail ? <p className="text-caption break-words text-text-tertiary">{detail}</p> : null}
      </div>
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { title: React.ReactNode; at?: string | null; detail?: React.ReactNode; tone?: Tone }[];
}) {
  return (
    <ol className="relative flex flex-col gap-4 border-l border-border-subtle pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden
            className={cn(
              'absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-surface-default',
              it.tone === 'success'
                ? 'bg-status-success'
                : it.tone === 'warning'
                  ? 'bg-status-warning'
                  : it.tone === 'danger'
                    ? 'bg-status-danger'
                    : it.tone === 'brand'
                      ? 'bg-brand'
                      : 'bg-ink-400',
            )}
          />
          <p className="text-body-s-strong text-text-primary">{it.title}</p>
          {it.at ? <p className="text-caption text-text-tertiary">{dt(it.at)}</p> : null}
          {it.detail ? (
            <p className="mt-0.5 text-caption text-text-secondary">{it.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Admin/Risk Score Meter — read-only model output (0–100, four bands). */
export function RiskMeter({
  score,
  level,
  factors,
}: {
  score: number;
  level: string;
  factors?: string[];
}) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-number-m text-text-primary tabular-nums">
          {score}
          <span className="ml-1 text-caption text-text-tertiary">/ 100</span>
        </p>
        <RiskPill level={level} />
      </div>
      <div className="relative">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <span className="w-[30%] bg-status-success" />
          <span className="w-[30%] bg-status-warning" />
          <span className="w-[25%] bg-status-danger/70" />
          <span className="flex-1 bg-status-danger" />
        </div>
        <span
          aria-hidden
          className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-text-primary ring-2 ring-surface-default"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-caption text-text-tertiary" aria-hidden>
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>85</span>
        <span>100</span>
      </div>
      <p className="sr-only">
        Risk score {score} of 100, {level}.
      </p>
      {factors && factors.length > 0 ? (
        <p className="text-caption text-text-secondary">Top factors: {factors.join(' · ')}</p>
      ) : null}
      <p className="text-caption text-text-tertiary">Model output — read-only, no override.</p>
    </div>
  );
}

/** Threshold / progress bar with label + values. */
export function ProgressBar({
  value,
  label,
  detail,
  tone = 'brand',
}: {
  value: number;
  label: React.ReactNode;
  detail?: React.ReactNode;
  tone?: 'brand' | 'gold' | 'success' | 'warning';
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label-s text-text-secondary">{label}</span>
        {detail ? (
          <span className="text-caption text-text-tertiary tabular-nums">{detail}</span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={typeof label === 'string' ? label : undefined}
        className="h-2 overflow-hidden rounded-full bg-surface-raised"
      >
        <div
          className={cn(
            'h-full rounded-full',
            tone === 'gold'
              ? 'bg-gold'
              : tone === 'success'
                ? 'bg-status-success'
                : tone === 'warning'
                  ? 'bg-status-warning'
                  : 'bg-brand',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Single-series bar chart (sequential mint, no legend — the panel title names the series). 4 px rounded data ends
 * on the baseline, 2 px gaps, per-bar hover/focus tooltip, recessive axis; a data table is available below it.
 */
export function BarChart({
  data,
  label,
  formatValue,
  height = 160,
  tone = 'brand',
}: {
  data: { key: string; label: string; value: number; display: string }[];
  label: string;
  formatValue?: (v: number) => string;
  height?: number;
  tone?: 'brand' | 'gold';
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => String(v));
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative" style={{ height }}>
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 border-t border-dashed border-border-subtle"
        />
        <span
          aria-hidden
          className="absolute top-0 right-0 -translate-y-full pb-0.5 text-caption text-text-tertiary"
        >
          {fmt(max)}
        </span>
        <div className="absolute inset-0 flex items-end gap-0.5" role="group" aria-label={label}>
          {data.map((d, i) => (
            <button
              key={d.key}
              type="button"
              aria-label={`${d.label}: ${d.display}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full min-w-0 flex-1 cursor-default items-end outline-none focus-visible:shadow-focus-ring"
            >
              <span
                className={cn(
                  'block w-full rounded-t-xs transition-opacity',
                  tone === 'gold' ? 'bg-gold' : 'bg-brand',
                  active !== null && active !== i && 'opacity-50',
                )}
                style={{ height: `${d.value > 0 ? Math.max(2, (d.value / max) * 100) : 0}%` }}
              />
              {active === i ? (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-sm border border-border-subtle bg-surface-overlay px-2 py-1 text-caption whitespace-nowrap text-text-primary shadow-elevation-2">
                  {d.label} · {d.display}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="flex justify-between border-t border-border-default pt-1 text-caption text-text-tertiary"
      >
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

export function SectionGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]', className)}>
      {children}
    </div>
  );
}

export function PageStack({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">{children}</div>;
}

export function LiveDot({ label = 'Live' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-label-s text-text-brand">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-brand motion-safe:animate-ping motion-safe:opacity-60" />
        <span className="relative size-2 rounded-full bg-brand" />
      </span>
      {label}
    </span>
  );
}
