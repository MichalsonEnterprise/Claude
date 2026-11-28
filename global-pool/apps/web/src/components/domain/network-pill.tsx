import type { ChainKey } from '@gp/shared/chains';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { CHAIN_NAMES, ChainMark } from '@/components/brand/chain-mark';
import { cn } from '@/lib/utils';

export type NetworkStatus = 'operational' | 'degraded' | 'down' | 'congested';

const STATUS: Record<NetworkStatus, { dot: string; label: string }> = {
  operational: { dot: 'bg-status-success', label: 'Operational' },
  degraded: { dot: 'bg-status-warning', label: 'Degraded' },
  congested: { dot: 'bg-status-warning', label: 'Congested' },
  down: { dot: 'bg-status-danger', label: 'Down' },
};

export interface NetworkPillProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  chain: ChainKey;
  status?: NetworkStatus;
  showStatusLabel?: boolean;
  /** Renders a chevron (use inside a button/trigger). */
  showChevron?: boolean;
  size?: 's' | 'm';
}

/** Wallet/Network Pill: chain mark + name + status dot (+ label) (+ chevron). */
export function NetworkPill({
  chain,
  status = 'operational',
  showStatusLabel = false,
  showChevron = false,
  size = 'm',
  className,
  ...props
}: NetworkPillProps) {
  const s = STATUS[status];
  return (
    <span
      data-slot="network-pill"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-default bg-surface-default font-medium text-text-primary',
        size === 's' ? 'h-7 pr-2.5 pl-1 text-caption' : 'h-8 pr-3 pl-1.5 text-body-s',
        className,
      )}
      {...props}
    >
      <ChainMark chain={chain} size={size === 's' ? 18 : 20} />
      <span>{CHAIN_NAMES[chain]}</span>
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {showStatusLabel ? (
        <span className="text-text-secondary">{s.label}</span>
      ) : (
        <span className="sr-only">{s.label}</span>
      )}
      {showChevron && <ChevronDown aria-hidden className="size-4 text-icon-muted" />}
    </span>
  );
}
