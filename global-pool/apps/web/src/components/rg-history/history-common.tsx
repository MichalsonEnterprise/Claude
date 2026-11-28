'use client';

import type { TxType } from '@gp/shared/enums';
import { PLATFORM_FEE_PER_ENTRY } from '@gp/shared/fees';
import { formatCount, formatDateUTC, formatTimeUTC } from '@gp/shared/format';
import { isZero } from '@gp/shared/money';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Gift,
  Printer,
  Receipt,
  RotateCcw,
  Ticket,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CHAIN_NAMES, ChainMark } from '@/components/brand/chain-mark';
import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { TxView } from '@/lib/api/rg-history';
import { cn } from '@/lib/utils';

import { num } from './format';
import { MemberOnly, PageShell, type SubNavItem } from './page-shell';

export const FIN_BASE = '/history';
export const FIN_NAV: SubNavItem[] = [
  { label: 'All activity', href: `${FIN_BASE}/transactions` },
  { label: 'Deposits', href: `${FIN_BASE}/deposits` },
  { label: 'Withdrawals', href: `${FIN_BASE}/withdrawals` },
  { label: 'Fees', href: `${FIN_BASE}/fees` },
  { label: 'Rewards', href: `${FIN_BASE}/rewards` },
  { label: 'Refunds', href: `${FIN_BASE}/refunds` },
];
export const GAME_BASE = '/history/games';
export const GAME_NAV: SubNavItem[] = [
  { label: 'My games', href: GAME_BASE },
  { label: 'My entries', href: `${GAME_BASE}/entries` },
  { label: 'Active rounds', href: `${GAME_BASE}/active` },
  { label: 'Results', href: `${GAME_BASE}/results` },
  { label: 'Winnings', href: `${GAME_BASE}/winnings` },
  { label: 'Game history', href: `${GAME_BASE}/rounds` },
  { label: 'Favourites', href: `${GAME_BASE}/favourites` },
];

export function FinancePage({
  href,
  title,
  sub,
  mobileSub,
  onExport,
  children,
}: {
  href: string;
  title: string;
  sub: string;
  mobileSub?: string;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  const tab = FIN_NAV.find((n) => n.href === href);
  return (
    <PageShell
      crumbs={[
        { label: 'Dashboard', href: '/account' },
        { label: 'Financial history', href: `${FIN_BASE}/transactions` },
        { label: tab?.label ?? title },
      ]}
      title={title}
      sub={sub}
      mobileSub={mobileSub}
      backHref={href === `${FIN_BASE}/transactions` ? '/wallet' : `${FIN_BASE}/transactions`}
      backLabel={href === `${FIN_BASE}/transactions` ? 'Wallet' : 'Financial history'}
      nav={FIN_NAV}
      activeHref={href}
      navLabel="Financial history sections"
      ageBadge={false}
      actions={
        <>
          <Button variant="secondary" size="m" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print statement
          </Button>
          {onExport && (
            <Button size="m" onClick={onExport}>
              <Download aria-hidden />
              Export CSV
            </Button>
          )}
        </>
      }
    >
      <MemberOnly what="financial history">{children}</MemberOnly>
    </PageShell>
  );
}

export function GamingPage({
  href,
  title,
  sub,
  mobileSub,
  actions,
  children,
}: {
  href: string;
  title: string;
  sub: string;
  mobileSub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tab = GAME_NAV.find((n) => n.href === href);
  return (
    <PageShell
      crumbs={[
        { label: 'Dashboard', href: '/account' },
        { label: 'Gaming', href: GAME_BASE },
        ...(href === GAME_BASE ? [] : [{ label: tab?.label ?? title }]),
      ]}
      title={title}
      sub={sub}
      mobileSub={mobileSub}
      backHref={href === GAME_BASE ? '/account' : GAME_BASE}
      backLabel={href === GAME_BASE ? 'Account' : 'My games'}
      nav={GAME_NAV}
      activeHref={href}
      navLabel="Gaming history sections"
      actions={actions ?? <span />}
    >
      <MemberOnly what="gaming history">{children}</MemberOnly>
    </PageShell>
  );
}

/** KPI card: label + DEMO, big number + unit, caption. */
export function Kpi({
  label,
  value,
  unit = 'USDT',
  caption,
  demo = true,
  tone,
  loading,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: React.ReactNode;
  demo?: boolean;
  tone?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card padding="m" className={cn('gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-s text-text-secondary">{label}</span>
        {demo && <DemoBadge size="s" />}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <p className="flex flex-wrap items-baseline gap-1.5">
          <span
            className={cn(
              'text-number-m tabular-nums tablet:text-number-l',
              tone ?? 'text-text-primary',
            )}
          >
            {value}
          </span>
          {unit && <span className="text-body-s text-text-tertiary">{unit}</span>}
        </p>
      )}
      {caption && <p className="text-caption text-text-tertiary">{caption}</p>}
    </Card>
  );
}

// ── transaction presentation ──────────────────────────────────────────────────────────────────

export const TYPE_LABEL: Record<TxType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  entry_purchase: 'Entry',
  platform_fee: 'Fee',
  prize: 'Prize',
  refund: 'Refund',
  reward: 'Reward',
  rakeback: 'Reward',
  cashback: 'Reward',
  referral_commission: 'Reward',
};

const TYPE_ICON: Record<TxType, { icon: LucideIcon; tone: string }> = {
  deposit: { icon: ArrowDownToLine, tone: 'bg-status-success-tint text-text-success' },
  withdrawal: { icon: ArrowUpFromLine, tone: 'bg-surface-raised text-icon-default' },
  entry_purchase: { icon: Ticket, tone: 'bg-surface-raised text-icon-default' },
  platform_fee: { icon: Receipt, tone: 'bg-surface-raised text-icon-muted' },
  prize: { icon: Trophy, tone: 'bg-accent-gold-tint text-icon-gold' },
  refund: { icon: RotateCcw, tone: 'bg-status-info-tint text-text-info' },
  reward: { icon: Gift, tone: 'bg-accent-gold-tint text-icon-gold' },
  rakeback: { icon: Gift, tone: 'bg-accent-gold-tint text-icon-gold' },
  cashback: { icon: Gift, tone: 'bg-accent-gold-tint text-icon-gold' },
  referral_commission: { icon: Crown, tone: 'bg-accent-gold-tint text-icon-gold' },
};

export type RoundStatusMap = Record<string, string>;

/** Status badge + label for a transaction (statuses are server truth; labels follow the Figma copy). */
export function txStatus(
  t: TxView,
  rounds: RoundStatusMap = {},
): { status: BadgeStatus; label: string } {
  if (t.type === 'entry_purchase') {
    const rs = t.roundId ? rounds[t.roundId] : undefined;
    if (rs === 'open' || rs === 'closed' || rs === 'drawing')
      return { status: 'live', label: 'In round' };
    if (rs === 'cancelled') return { status: 'expired', label: 'Round cancelled' };
    if (rs === 'settled') return { status: 'confirmed', label: 'Settled' };
    return { status: 'confirmed', label: 'Confirmed' };
  }
  switch (t.status) {
    case 'completed':
      return {
        status: 'confirmed',
        label:
          t.type === 'withdrawal' ? 'Completed' : t.type === 'deposit' ? 'Credited' : 'Credited',
      };
    case 'confirming':
      return {
        status: 'processing',
        label: t.confirmations
          ? `Confirming ${t.confirmations.current}/${t.confirmations.required}`
          : 'Confirming',
      };
    case 'under_review':
      return { status: 'under_review', label: 'Under review' };
    case 'processing':
      return { status: 'processing', label: 'Processing' };
    case 'pending':
      return {
        status: 'pending',
        label:
          t.type === 'refund' || t.type === 'reward' || t.type === 'prize' ? 'Owed' : 'Pending',
      };
    case 'rejected':
      return { status: 'rejected', label: 'Rejected' };
    case 'failed':
      return { status: 'failed', label: 'Failed' };
    case 'cancelled':
      return { status: 'expired', label: 'Cancelled' };
  }
}

export function txTitle(t: TxView): { title: string; sub: string } {
  switch (t.type) {
    case 'deposit':
      return { title: t.id, sub: t.txHashDisplay ? `Tx ${t.txHashDisplay}` : t.description };
    case 'withdrawal':
      return {
        title: t.id,
        sub: [
          t.addressDisplay ? `To ${t.addressDisplay}` : null,
          t.networkFee ? `fee ${num(t.networkFee)}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    case 'entry_purchase': {
      const m = /^(\d+) entries · (Round #[\d,]+)$/.exec(t.description);
      return {
        title: m ? `${m[2]} · ${m[1]} entries` : t.description,
        // Q26: the fee is its own line under this one (txFeeLine); this line is the stake.
        sub: isZero(t.platformFee)
          ? `Entries ${num(t.amount)}`
          : `Entries ${num(t.amount)} · ${num(t.netAmount)} paid with the platform fee below`,
      };
    }
    case 'refund':
      return {
        title: t.roundNumber ? `Refund · round #${formatCount(t.roundNumber)}` : 'Refund',
        sub: t.statusDetail ?? t.description,
      };
    case 'prize':
    case 'reward':
    case 'rakeback':
    case 'cashback':
    case 'referral_commission':
    case 'platform_fee':
      return { title: t.description, sub: t.statusDetail ?? '' };
  }
}

/**
 * Q26: the 0.05 USDT-per-entry platform fee of a purchase as its OWN line under the purchase (same transaction,
 * booked to the fee ledger — never the prize pool), so "always its own line" is true in every list. Null otherwise.
 */
export function txFeeLine(t: TxView): { title: string; sub: string; text: string; tone: string } | null {
  if (t.type !== 'entry_purchase' || isZero(t.platformFee)) return null;
  const m = /^(\d+) entr(?:y|ies)\b/.exec(t.description);
  const n = m ? Number(m[1]) : null;
  return {
    title: 'Platform fee',
    sub: `${n !== null ? `${formatCount(n)} qualifying ${n === 1 ? 'entry' : 'entries'} × ${PLATFORM_FEE_PER_ENTRY} USDT · ` : ''}not added to the prize pool`,
    text: `−${num(t.platformFee)}`,
    tone: 'text-text-danger',
  };
}

/**
 * Signed amount the player's balance moved by ('+1,000.00' / '−350.00'); rejected withdrawals move nothing. An entry
 * purchase shows its stake — its platform fee is the separate `txFeeLine` (stake + fee = what Available moved by).
 */
export function txAmount(t: TxView): { text: string; tone: string } {
  if (
    t.type === 'withdrawal' &&
    (t.status === 'rejected' || t.status === 'cancelled' || t.status === 'failed')
  ) {
    return { text: num(t.amount), tone: 'text-text-tertiary line-through' };
  }
  const value = t.amount;
  if (isZero(value)) return { text: num(value), tone: 'text-text-primary' };
  return t.direction === 'in'
    ? { text: `+${num(value)}`, tone: 'text-text-success' }
    : { text: `−${num(value)}`, tone: 'text-text-danger' };
}

function NetworkCell({ t }: { t: TxView }) {
  if (!t.network) {
    return (
      <span className="flex items-center gap-2">
        <span aria-hidden className="size-4 rounded-full bg-brand" />
        <span className="flex flex-col">
          <span className="text-body-s">Platform</span>
          <span className="text-caption text-text-tertiary">No on-chain tx</span>
        </span>
      </span>
    );
  }
  const chain = t.network as keyof typeof CHAIN_NAMES;
  return (
    <span className="flex items-center gap-2">
      <ChainMark chain={chain} size={16} />
      <span className="flex flex-col">
        <span className="text-body-s">{CHAIN_NAMES[chain] ?? t.network}</span>
        <span className="text-caption text-text-tertiary">
          USDT{t.type === 'refund' ? ' · contract refund' : ''}
        </span>
      </span>
    </span>
  );
}

function TypeIcon({ type }: { type: TxType }) {
  const spec = TYPE_ICON[type];
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5',
        spec.tone,
      )}
    >
      <spec.icon />
    </span>
  );
}

function TxDetails({ t }: { t: TxView }) {
  const rows: [string, string | null][] = [
    ['Reference', t.id],
    ['Status detail', t.statusDetail],
    ['Amount', `${num(t.amount)} USDT`],
    ['Platform fee', `${num(t.platformFee)} USDT`],
    ['Network fee', t.networkFee !== null ? `${num(t.networkFee)} USDT` : '—'],
    ['Net', `${num(t.netAmount)} USDT`],
    ['Address', t.addressDisplay],
    ['Tx hash', t.txHashDisplay],
    ['Created', `${formatDateUTC(t.createdAt)}, ${formatTimeUTC(t.createdAt)}`],
    [
      'Completed',
      t.completedAt ? `${formatDateUTC(t.completedAt)}, ${formatTimeUTC(t.completedAt)}` : null,
    ],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 py-3 text-body-s tablet:grid-cols-2">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-border-subtle pb-2">
            <dt className="text-text-tertiary">{k}</dt>
            <dd className="text-right font-mono text-mono-s text-text-primary">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Desktop table (≥ 1024) of transactions with expandable details. */
export function TxTable({
  items,
  rounds,
  caption,
}: {
  items: TxView[];
  rounds?: RoundStatusMap;
  caption: string;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-overline text-text-tertiary uppercase">
            <th scope="col" className="px-4 py-3 font-semibold">
              Transaction
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Type
            </th>
            <th scope="col" className="px-3 py-3 font-semibold" aria-sort="descending">
              Date
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Network
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Amount
            </th>
            <th scope="col" className="w-12 px-2 py-3">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => {
            const { title, sub } = txTitle(t);
            const st = txStatus(t, rounds);
            const amt = txAmount(t);
            const fee = txFeeLine(t);
            const expanded = open === t.uuid;
            return (
              <React.Fragment key={t.uuid}>
                <tr className="border-b border-border-subtle hover:bg-surface-hover/40">
                  <td className="px-4 py-3">
                    <span className="flex flex-col">
                      <span className="text-body-s-strong text-text-primary">{title}</span>
                      <span className="text-caption text-text-tertiary">{sub}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-body-s">{TYPE_LABEL[t.type]}</td>
                  <td className="px-3 py-3">
                    <span className="flex flex-col">
                      <span className="text-body-s">{formatDateUTC(t.createdAt)}</span>
                      <span className="text-caption text-text-tertiary">
                        {formatTimeUTC(t.createdAt)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <NetworkCell t={t} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={st.status} label={st.label} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span className={cn('text-number-s tabular-nums', amt.tone)}>{amt.text}</span>
                      <span className="text-caption text-text-tertiary">USDT</span>
                      {t.isDemo && <DemoBadge size="xs" />}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Hide' : 'Show'} details for ${title}`}
                      onClick={() => setOpen(expanded ? null : t.uuid)}
                      className="inline-flex size-9 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover"
                    >
                      <ChevronDown
                        aria-hidden
                        className={cn('size-4 transition-transform', expanded && 'rotate-180')}
                      />
                    </button>
                  </td>
                </tr>
                {fee && (
                  <tr
                    className="border-b border-border-subtle bg-bg-secondary/20"
                    data-testid="tx-fee-line"
                  >
                    <td className="py-2 pr-4 pl-8">
                      <span className="flex flex-col">
                        <span className="text-body-s text-text-primary">{fee.title}</span>
                        <span className="text-caption text-text-tertiary">{fee.sub}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-body-s">{TYPE_LABEL.platform_fee}</td>
                    <td colSpan={3} className="px-3 py-2 text-caption text-text-tertiary">
                      Part of {t.id} · no network fee
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className={cn('text-number-s tabular-nums', fee.tone)}>{fee.text}</span>
                        <span className="text-caption text-text-tertiary">USDT</span>
                      </span>
                    </td>
                    <td />
                  </tr>
                )}
                {expanded && (
                  <tr className="border-b border-border-subtle bg-bg-secondary/40">
                    <td colSpan={7} className="px-4">
                      <TxDetails t={t} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function dayLabel(iso: string, now = new Date()): string {
  const d = formatDateUTC(iso);
  return d === formatDateUTC(now) ? `Today · ${d}` : d;
}

/** Mobile/tablet (< 1024): stacked Tx cards grouped by day. */
export function TxCards({ items, rounds }: { items: TxView[]; rounds?: RoundStatusMap }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const groups: [string, TxView[]][] = [];
  for (const t of items) {
    const key = dayLabel(t.createdAt);
    const g = groups.find(([k]) => k === key);
    if (g) g[1].push(t);
    else groups.push([key, [t]]);
  }
  return (
    <div className="flex flex-col gap-5 lg:hidden">
      {groups.map(([label, rows]) => (
        <section key={label} className="flex flex-col gap-2" aria-label={label}>
          <h3 className="text-overline text-text-tertiary uppercase">{label}</h3>
          {rows.map((t) => {
            const { title, sub } = txTitle(t);
            const st = txStatus(t, rounds);
            const amt = txAmount(t);
            const fee = txFeeLine(t);
            const expanded = open === t.uuid;
            return (
              <article
                key={t.uuid}
                className="rounded-lg border border-border-subtle bg-surface-default"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : t.uuid)}
                  className="flex w-full flex-col gap-3 p-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <TypeIcon type={t.type} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-label-l text-text-primary">{title}</span>
                      <span className="truncate text-caption text-text-tertiary">{sub}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className={cn('text-number-s tabular-nums', amt.tone)}>{amt.text}</span>
                      <span className="text-caption text-text-tertiary">USDT</span>
                    </span>
                  </span>
                  {fee && (
                    <span
                      className="flex items-center gap-3 rounded-md bg-bg-secondary px-3 py-2"
                      data-testid="tx-fee-line"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-body-s text-text-primary">{fee.title}</span>
                        <span className="truncate text-caption text-text-tertiary">{fee.sub}</span>
                      </span>
                      <span className="flex flex-col items-end">
                        <span className={cn('text-number-s tabular-nums', fee.tone)}>{fee.text}</span>
                        <span className="text-caption text-text-tertiary">USDT</span>
                      </span>
                    </span>
                  )}
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={st.status} label={st.label} />
                    {t.network && (
                      <ChainMark chain={t.network as keyof typeof CHAIN_NAMES} size={14} />
                    )}
                    <span className="flex-1 text-caption text-text-tertiary">
                      {formatTimeUTC(t.createdAt)}
                    </span>
                    {t.isDemo && <DemoBadge size="xs" />}
                    <ChevronRight
                      aria-hidden
                      className={cn(
                        'size-4 text-icon-muted transition-transform',
                        expanded && 'rotate-90',
                      )}
                    />
                  </span>
                </button>
                {expanded && (
                  <div className="border-t border-border-subtle px-4">
                    <TxDetails t={t} />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  noun = 'transactions',
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  noun?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center gap-3 tablet:flex-row tablet:justify-between"
    >
      <p className="text-caption text-text-tertiary">
        Showing {from}–{to} of {formatCount(total)} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="s"
          className="min-h-11 tablet:min-h-8"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <span className="min-w-16 text-center text-label-m" aria-current="page">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="s"
          className="min-h-11 tablet:min-h-8"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyCard({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-default">
      <EmptyState title={title} description={description} actions={actions} icon={icon} />
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'secondary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Button asChild variant={variant} size="m" className="min-h-11 tablet:min-h-10">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
