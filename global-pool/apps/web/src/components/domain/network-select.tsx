'use client';

import { CHAIN_DISPLAY_ORDER, CHAINS, type ChainKey } from '@gp/shared/chains';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface NetworkSelectProps {
  value?: ChainKey;
  onValueChange?: (chain: ChainKey) => void;
  label?: string;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  /** Show the typical withdrawal network fee column (withdraw flow). */
  showFee?: boolean;
  /**
   * Only chains enabled in @gp/shared/chains are selectable (MVP = Arbitrum Sepolia); others show
   * "Coming soon". Set true for DEMO screens that must show all five as selectable.
   */
  allowDisabledChains?: boolean;
  size?: 'm' | 'l';
  className?: string;
}

/**
 * Select/Network: 5 chains with marks, token standard, confirmations, typical fee and status.
 * Fees and confirmations are DEMO estimates from @gp/shared/chains — the API quotes live fees.
 */
export function NetworkSelect({
  value,
  onValueChange,
  label = 'Network',
  helper,
  error,
  showFee = true,
  allowDisabledChains = false,
  size = 'm',
  className,
}: NetworkSelectProps) {
  return (
    <Field label={label} helper={helper} error={error} className={className}>
      <Select value={value} onValueChange={(v) => onValueChange?.(v as ChainKey)}>
        <SelectTrigger size={size}>
          <SelectValue placeholder="Choose a network" />
        </SelectTrigger>
        <SelectContent className="min-w-[320px]">
          {CHAIN_DISPLAY_ORDER.map((key) => {
            const c = CHAINS[key];
            const selectable = c.enabled || allowDisabledChains;
            const congested = c.health !== 'operational';
            return (
              <SelectItem
                key={key}
                value={key}
                disabled={!selectable}
                description={`${c.usdtStandard} · ${c.confirmationsLabel} confirmations`}
                aside={
                  <>
                    {showFee && (
                      <span className="flex items-center gap-1 text-text-primary tabular-nums">
                        {c.typicalNetworkFee} USDT
                        <DemoBadge size="xs" />
                      </span>
                    )}
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        !c.enabled ? 'text-text-tertiary' : congested ? 'text-text-warning' : 'text-text-success',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'size-1.5 rounded-full',
                          !c.enabled ? 'bg-text-tertiary' : congested ? 'bg-status-warning' : 'bg-status-success',
                        )}
                      />
                      {c.enabled ? c.healthLabel : c.statusLabel}
                    </span>
                  </>
                }
              >
                <ChainMark chain={key} size={20} />
                <span className="truncate">{c.name}</span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </Field>
  );
}
