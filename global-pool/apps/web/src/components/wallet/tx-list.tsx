'use client';

import { TX_TYPE_LABEL } from '@gp/shared/enums';
import { formatDateUTC } from '@gp/shared/format';
import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Amount } from '@/components/domain/amount';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TxView } from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

import { chainName, TxIcon, TxStatusBadge, when } from './wallet-ui';

/** One-line subtitle: reference · network · detail (fees and confirmations spelled out, never hidden). */
export function txSubtitle(tx: TxView): string {
  const parts: string[] = [tx.id];
  if (tx.network) parts.push(chainName(tx.network));
  if (tx.type === 'withdrawal' && tx.addressDisplay) parts.push(`to ${tx.addressDisplay}`);
  if (tx.type === 'entry_purchase' && tx.platformFee !== '0.00')
    parts.push(`platform fee ${tx.platformFee} billed separately`);
  if (tx.confirmations && tx.status === 'confirming')
    parts.push(`${tx.confirmations.current} / ${tx.confirmations.required} confirmations`);
  else if (tx.statusDetail && tx.type !== 'entry_purchase') parts.push(tx.statusDetail);
  return parts.join(' · ');
}

export function txTitle(tx: TxView): string {
  if (tx.type === 'entry_purchase') {
    const m = /^(\d+) entries/.exec(tx.description);
    return m ? `Global Pool entries ×${m[1]}` : TX_TYPE_LABEL.entry_purchase;
  }
  return TX_TYPE_LABEL[tx.type] ?? tx.description;
}

/** Signed amount for a row: money in "+", money out "−" (entry rows show the stake; the fee is its own line). */
export function signedAmount(tx: TxView): string {
  return tx.direction === 'in' ? tx.amount : `-${tx.amount}`;
}

export interface TxListProps {
  items: TxView[];
  onSelect?: (tx: TxView) => void;
  selected?: string | null;
  className?: string;
  /** Group mobile cards by day (history page). */
  groupByDay?: boolean;
}

/**
 * Transaction rows (Figma Tx/Row): desktop = one row with icon, title + subtitle, signed amount, status, time,
 * DEMO and chevron; mobile (< 768) = stacked cards. Each row is a button that opens the detail drawer / sheet.
 */
export function TxList({ items, onSelect, selected, className, groupByDay = false }: TxListProps) {
  const groups = React.useMemo(() => {
    if (!groupByDay) return [{ day: null as string | null, items }];
    const out: { day: string | null; items: TxView[] }[] = [];
    for (const tx of items) {
      const day = formatDateUTC(tx.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(tx);
      else out.push({ day, items: [tx] });
    }
    return out;
  }, [items, groupByDay]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {groups.map((g) => (
        <div key={g.day ?? 'all'} className="flex flex-col gap-2">
          {g.day && (
            <p className="pt-2 text-overline text-text-tertiary uppercase tablet:hidden">{g.day}</p>
          )}
          <ul className="flex flex-col gap-2">
            {g.items.map((tx) => (
              <li key={tx.id}>
                <TxRow tx={tx} onSelect={onSelect} selected={selected === tx.id} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TxRow({
  tx,
  onSelect,
  selected,
}: {
  tx: TxView;
  onSelect?: (tx: TxView) => void;
  selected: boolean;
}) {
  const body = (
    <>
      <TxIcon type={tx.type} direction={tx.direction} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-body-s-strong text-text-primary">{txTitle(tx)}</p>
          <Amount
            value={signedAmount(tx)}
            tone="signed"
            className={cn(
              'text-number-s tablet:hidden',
              tx.direction === 'out' && 'text-text-primary',
            )}
          />
        </div>
        <p className="line-clamp-2 text-caption text-text-tertiary tablet:truncate">
          {txSubtitle(tx)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 tablet:hidden">
          <TxStatusBadge status={tx.status} type={tx.type} />
          <span className="text-caption text-text-tertiary">{when(tx.createdAt)}</span>
          {tx.isDemo && <DemoBadge size="xs" />}
        </div>
      </div>
      <Amount
        value={signedAmount(tx)}
        tone="signed"
        className={cn(
          'hidden w-36 justify-end text-number-s tablet:inline-flex',
          tx.direction === 'out' && 'text-text-primary',
        )}
      />
      <span className="hidden w-32 justify-center laptop:flex">
        <TxStatusBadge status={tx.status} type={tx.type} />
      </span>
      <span className="hidden w-44 text-right text-caption text-text-tertiary tablet:block">
        <span className="laptop:hidden">
          <TxStatusBadge status={tx.status} type={tx.type} className="mb-1" />
          <br />
        </span>
        {when(tx.createdAt)}
      </span>
      <span className="hidden w-12 justify-center tablet:flex">
        {tx.isDemo && <DemoBadge size="xs" />}
      </span>
      {onSelect && (
        <ChevronRight aria-hidden className="hidden size-4 shrink-0 text-icon-muted tablet:block" />
      )}
    </>
  );
  const cls = cn(
    'flex w-full items-start gap-3 rounded-md border border-border-subtle bg-surface-default p-3 text-left tablet:items-center tablet:px-4',
    onSelect &&
      'transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
    selected && 'border-border-brand bg-surface-selected',
  );
  if (!onSelect) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(tx)}
      aria-label={`${txTitle(tx)} ${tx.id}, open details`}
    >
      {body}
    </button>
  );
}

export function TxListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading transactions">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-border-subtle p-3">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-28 tablet:block" />
          <Skeleton className="hidden h-5 w-24 laptop:block" />
        </div>
      ))}
    </div>
  );
}
