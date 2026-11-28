'use client';

import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import type { WalletProviderId } from '@/lib/auth/types';
import { cn } from '@/lib/utils';

/**
 * Wallet/Provider Row list (Figma 27:15928, AUTH-02 / AUTH-09). Neutral letter marks — no third-party logos.
 * Browser wallet is enabled only when an injected EIP-1193 provider is detected.
 */
export const WALLET_PROVIDERS: {
  id: WalletProviderId;
  name: string;
  meta: string;
  mark: string;
  tag?: string;
}[] = [
  {
    id: 'browser',
    name: 'Browser wallet (EVM)',
    meta: 'Extension in this browser · Arbitrum',
    mark: 'BW',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    meta: 'Scan a QR code with any compatible mobile wallet',
    mark: 'WC',
  },
  { id: 'coinbase', name: 'Coinbase Wallet', meta: 'Browser extension or mobile app', mark: 'CB' },
  { id: 'trust', name: 'Trust Wallet', meta: 'Browser extension or mobile app', mark: 'TW' },
  {
    id: 'phantom',
    name: 'Phantom (Solana)',
    meta: 'Connects on Solana only',
    mark: 'PH',
    tag: 'Solana',
  },
  {
    id: 'ledger',
    name: 'Ledger via WalletConnect',
    meta: 'Hardware wallet through the Ledger Live app',
    mark: 'LG',
    tag: 'Hardware',
  },
];

export function useInjectedWallet(): boolean {
  const [detected, setDetected] = React.useState(false);
  React.useEffect(() => {
    setDetected(Boolean((globalThis as { ethereum?: unknown }).ethereum));
  }, []);
  return detected;
}

export function WalletMark({ id, className }: { id: WalletProviderId; className?: string }) {
  const p = WALLET_PROVIDERS.find((w) => w.id === id) ?? WALLET_PROVIDERS[0]!;
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-raised text-label-m font-bold text-text-primary',
        className,
      )}
    >
      {p.mark}
    </span>
  );
}

export function WalletProviderList({
  onChoose,
  disabled,
  mockAlwaysAvailable = true,
}: {
  onChoose: (id: WalletProviderId) => void;
  disabled?: boolean;
  /** DEV MOCK simulates the browser wallet even without an extension. */
  mockAlwaysAvailable?: boolean;
}) {
  const injected = useInjectedWallet();
  return (
    <ul className="flex flex-col gap-2" aria-label="Wallets">
      {WALLET_PROVIDERS.map((p) => {
        const unavailable = p.id === 'browser' && !injected && !mockAlwaysAvailable;
        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={disabled || unavailable}
              onClick={() => onChoose(p.id)}
              className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-default px-3 py-3 text-left transition-colors hover:border-border-default hover:bg-surface-hover focus-visible:shadow-focus-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WalletMark id={p.id} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-label-m text-text-primary">
                  {p.name}
                  {p.id === 'browser' && injected && <ProviderTag>Detected</ProviderTag>}
                  {p.tag && <ProviderTag>{p.tag}</ProviderTag>}
                </span>
                <span className="text-caption text-text-tertiary">
                  {unavailable
                    ? 'Not detected — open this page in your wallet’s in-app browser'
                    : p.meta}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-icon-muted" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ProviderTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-auto inline-flex h-6 shrink-0 items-center rounded-full bg-status-success-tint px-2.5 text-label-s text-text-success">
      {children}
    </span>
  );
}
