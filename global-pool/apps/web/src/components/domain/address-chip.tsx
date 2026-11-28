'use client';

import type { ChainKey } from '@gp/shared/chains';
import { truncateAddress } from '@gp/shared/format';
import { Check, Copy } from 'lucide-react';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

export interface AddressChipProps {
  /** Full or already-truncated address / hash. Displayed as 0x12ab…9f3C. */
  address: string;
  /** Value copied to the clipboard (defaults to `address`). */
  copyValue?: string;
  chain?: ChainKey;
  size?: 's' | 'm';
  demo?: boolean;
  copyable?: boolean;
  className?: string;
}

/** Wallet/Address Chip: mono truncated address + copy (Copied state) + optional chain mark and DEMO. */
export function AddressChip({
  address,
  copyValue,
  chain,
  size = 'm',
  demo = false,
  copyable = true,
  className,
}: AddressChipProps) {
  const [copied, setCopied] = React.useState(false);
  const display = truncateAddress(address);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? address);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span
      data-slot="address-chip"
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border-default bg-surface-default text-text-primary',
        size === 's' ? 'h-7 px-2 text-mono-s' : 'h-8 px-2.5 text-mono-m',
        className,
      )}
    >
      {chain && <ChainMark chain={chain} size={size === 's' ? 14 : 16} />}
      <span className="truncate font-mono" title={address}>
        {display}
      </span>
      {demo && <DemoBadge size="xs" />}
      {copyable && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? 'Copied' : `Copy ${display}`}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full transition-colors',
            copied
              ? 'text-text-success'
              : 'text-icon-muted hover:bg-surface-hover hover:text-icon-default',
          )}
        >
          {copied ? (
            <Check aria-hidden className="size-3.5" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
        </button>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Address copied' : ''}
      </span>
    </span>
  );
}
