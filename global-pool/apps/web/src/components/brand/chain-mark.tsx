import type { ChainKey } from '@gp/shared/chains';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Original neutral network glyphs (decision #9 — no official logos): BNB diamond, Polygon hexagon,
 * Arbitrum triangle, Ethereum rhombus, Solana three bars; USDT "T". Circle fill = chain colour token.
 */
const CHAIN_FILL: Record<ChainKey, string> = {
  bnb: 'fill-chain-bnb',
  polygon: 'fill-chain-polygon',
  arbitrum: 'fill-chain-arbitrum',
  ethereum: 'fill-chain-ethereum',
  solana: 'fill-chain-solana',
};

export const CHAIN_NAMES: Record<ChainKey, string> = {
  bnb: 'BNB Chain',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  ethereum: 'Ethereum',
  solana: 'Solana',
};

function Glyph({ chain }: { chain: ChainKey }) {
  switch (chain) {
    case 'bnb':
      return (
        <g className="fill-ink-950">
          <path d="M12 6.2 17.8 12 12 17.8 6.2 12Z" />
          <path d="M12 9.6 14.4 12 12 14.4 9.6 12Z" className="fill-chain-bnb" />
        </g>
      );
    case 'polygon':
      return (
        <path
          d="M12 5.5 17.6 8.75v6.5L12 18.5l-5.6-3.25v-6.5Z"
          className="fill-none stroke-ink-50"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );
    case 'arbitrum':
      return (
        <path
          d="M12 6.4 17.6 16.6H6.4Z"
          className="fill-none stroke-ink-50"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );
    case 'ethereum':
      return (
        <g className="fill-ink-50">
          <path d="M12 4.8 16.4 12 12 14.4 7.6 12Z" />
          <path d="M12 15.6 16.4 13.2 12 19.2 7.6 13.2Z" opacity={0.75} />
        </g>
      );
    case 'solana':
      return (
        <g className="fill-ink-950">
          <path d="M8.6 7.4h8.8l-2 2.2H6.6Z" />
          <path d="M6.6 10.9h8.8l2 2.2H8.6Z" />
          <path d="M8.6 14.4h8.8l-2 2.2H6.6Z" />
        </g>
      );
  }
}

export interface MarkProps extends Omit<React.ComponentProps<'svg'>, 'children'> {
  /** Rendered size in px (square). Default 20. */
  size?: number;
  /** Accessible name; omit when a visible label sits next to the mark (decorative). */
  label?: string;
}

export function ChainMark({ chain, size = 20, label, className, ...props }: MarkProps & { chain: ChainKey }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="12" className={CHAIN_FILL[chain]} />
      <Glyph chain={chain} />
    </svg>
  );
}

/** USDT token mark (original "T" glyph on the token colour). */
export function TokenMark({ size = 20, label, className, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="12" className="fill-token-usdt" />
      <path d="M6.5 6.8h11v2.6h-4.2v8.8h-2.6V9.4H6.5Z" className="fill-ink-50" />
      <ellipse cx="12" cy="11.4" rx="5.4" ry="1.5" className="fill-none stroke-ink-50" strokeWidth={1.2} />
    </svg>
  );
}
