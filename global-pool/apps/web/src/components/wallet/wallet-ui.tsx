'use client';

import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { TX_STATUS_LABEL, type TxStatus, type TxType } from '@gp/shared/enums';
import { formatDateTimeUTC } from '@gp/shared/format';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Gift,
  History,
  Percent,
  RotateCcw,
  Ticket,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

// ── routes ─────────────────────────────────────────────────────────────────────────────────────

export const WALLET_ROUTES = {
  overview: '/wallet',
  deposit: '/wallet/deposit',
  withdraw: '/wallet/withdraw',
  history: '/wallet/history',
  connected: '/wallet/connected',
  whitelist: '/wallet/whitelist',
  withdrawal: (reference: string) => `/wallet/withdraw/${encodeURIComponent(reference)}`,
  tx: (reference: string) => `/wallet/history?tx=${encodeURIComponent(reference)}`,
} as const;

const TABS = [
  { label: 'Overview', href: WALLET_ROUTES.overview },
  { label: 'Deposit', href: WALLET_ROUTES.deposit },
  { label: 'Withdraw', href: WALLET_ROUTES.withdraw },
  { label: 'Transaction history', href: WALLET_ROUTES.history },
  { label: 'Connected wallets', href: WALLET_ROUTES.connected },
  { label: 'Address whitelist', href: WALLET_ROUTES.whitelist },
] as const;

/** Wallet sub-navigation (Figma Tabs/Underline: Overview · Deposit · Withdraw · History · Connected · Whitelist). */
export function WalletTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === WALLET_ROUTES.overview
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label="Wallet" className={cn('-mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0', className)}>
      <ul className="flex min-w-max items-end gap-6 border-b border-border-subtle">
        {TABS.map((t) => {
          const on = active(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 items-center text-label-l whitespace-nowrap transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
                  on ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {t.label}
                {on && (
                  <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Page header: H2 title + description, DEMO DATA marker and actions (Figma "Page header"). */
export function WalletPageHeader({
  title,
  description,
  actions,
  demo = true,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  demo?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 laptop:flex-row laptop:items-start laptop:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-h3 text-text-primary tablet:text-h2">{title}</h1>
          {demo && <DemoBadge size="s" className="laptop:hidden" />}
        </div>
        {description && (
          <p className="max-w-[680px] text-body-s text-text-secondary tablet:text-body-m">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 laptop:gap-3">
        {demo && <DemoBadge size="m" className="hidden laptop:inline-flex" />}
        {actions}
      </div>
    </div>
  );
}

// ── status / type mapping ──────────────────────────────────────────────────────────────────────

const TX_BADGE: Record<TxStatus, BadgeStatus> = {
  pending: 'pending',
  confirming: 'processing',
  under_review: 'under_review',
  processing: 'processing',
  completed: 'confirmed',
  failed: 'failed',
  rejected: 'rejected',
  cancelled: 'expired',
};

export function TxStatusBadge({
  status,
  type,
  size = 's',
  className,
}: {
  status: TxStatus;
  type?: TxType;
  size?: 's' | 'm';
  className?: string;
}) {
  let label: string = TX_STATUS_LABEL[status];
  if (status === 'completed') label = type === 'deposit' ? 'Credited' : 'Confirmed';
  if (status === 'pending' && (type === 'refund' || type === 'reward' || type === 'prize'))
    label = 'Owed';
  return <StatusBadge status={TX_BADGE[status]} label={label} size={size} className={className} />;
}

export const TX_ICON: Record<TxType, LucideIcon> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  entry_purchase: Ticket,
  platform_fee: Percent,
  prize: Trophy,
  refund: RotateCcw,
  reward: Gift,
  rakeback: Coins,
  cashback: Coins,
  referral_commission: Gift,
};

export function TxIcon({ type, direction }: { type: TxType; direction: 'in' | 'out' }) {
  const Icon = TX_ICON[type] ?? History;
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-[18px]',
        direction === 'in'
          ? 'bg-status-success-tint text-text-success'
          : type === 'platform_fee'
            ? 'bg-surface-pressed text-text-secondary'
            : 'bg-surface-raised text-icon-default',
      )}
    >
      <Icon />
    </span>
  );
}

export function chainName(network: ChainKey | null | undefined): string {
  return network ? CHAINS[network].name : '—';
}

export function when(iso: string): string {
  return formatDateTimeUTC(iso);
}

// ── layout bits ────────────────────────────────────────────────────────────────────────────────

/** Label / value rows with hairline separators (Figma "kv" rows). */
export function KeyValueList({
  rows,
  className,
}: {
  rows: { label: React.ReactNode; value: React.ReactNode; id?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn('flex flex-col', className)}>
      {rows.map((r, i) => (
        <div
          key={r.id ?? i}
          className="flex min-h-11 items-center justify-between gap-4 border-b border-border-subtle py-2.5 text-body-s last:border-b-0"
        >
          <dt className="text-text-secondary">{r.label}</dt>
          <dd className="min-w-0 text-right text-text-primary">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Error state for a failed query: plain reason + request id + retry. */
export function QueryError({
  error,
  onRetry,
  title = 'We couldn’t load this',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const ref = error instanceof ApiRequestError ? error.requestId : undefined;
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  return (
    <EmptyState
      type="error"
      title={title}
      description={message}
      reference={ref ? `Request ${ref}` : undefined}
      className={className}
      actions={
        onRetry ? (
          <Button variant="secondary" size="s" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}

/** Wallet pages are member-only: guests get a sign-in prompt; the auth bootstrap shows a skeleton. */
export function MemberGate({ children }: { children: React.ReactNode }) {
  const { status, signIn } = useAuth();
  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your wallet">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (status === 'guest') {
    return (
      <EmptyState
        title="Sign in to see your wallet"
        description="Your balances, deposits and withdrawals are private to your account."
        actions={<Button onClick={signIn}>Sign in</Button>}
        className="rounded-xl border border-border-subtle bg-surface-default"
      />
    );
  }
  return <>{children}</>;
}

/** Section title + optional DEMO DATA marker + right-side action. */
export function SectionTitle({
  children,
  demo,
  action,
  as: Comp = 'h2',
  className,
}: {
  children: React.ReactNode;
  demo?: boolean;
  action?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Comp className="text-h5 text-text-primary">{children}</Comp>
        {demo && <DemoBadge size="s" />}
      </div>
      {action}
    </div>
  );
}

/** Small circular confirmation progress ring (n / N) used in pending deposit rows. */
export function ConfirmationRing({
  current,
  required,
  size = 48,
  className,
}: {
  current: number;
  required: number;
  size?: number;
  className?: string;
}) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = required > 0 ? Math.min(1, current / required) : 0;
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${current} of ${required} confirmations`}
    >
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={3} className="fill-none stroke-surface-pressed" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="fill-none stroke-balance-pending transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums text-text-primary">
        {current}/{required}
      </span>
    </span>
  );
}

/** Segmented confirmations bar (one segment per ~N/12 confirmations). */
export function ConfirmationBar({
  current,
  required,
  className,
}: {
  current: number;
  required: number;
  className?: string;
}) {
  const segments = Math.min(required, 12);
  const filled = required > 0 ? Math.round((Math.min(current, required) / required) * segments) : 0;
  return (
    <div className={cn('flex gap-1', className)} aria-hidden>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn('h-1 flex-1 rounded-full', i < filled ? 'bg-balance-pending' : 'bg-surface-pressed')}
        />
      ))}
    </div>
  );
}
