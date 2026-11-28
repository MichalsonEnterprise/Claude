'use client';

import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Tag } from '@/components/ui/badge';
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
  markClass: string;
  tag?: string;
}[] = [
  { id: 'browser', name: 'Browser wallet', meta: 'Extension in this browser (EVM)', mark: 'B', markClass: 'bg-surface-hover text-text-primary' },
  { id: 'walletconnect', name: 'WalletConnect', meta: 'Scan a QR code with any mobile wallet', mark: 'W', markClass: 'bg-sky-500 text-ink-950', tag: 'Recommended' },
  { id: 'coinbase', name: 'Coinbase Wallet', meta: 'Mobile app or extension', mark: 'C', markClass: 'bg-sky-400 text-ink-950' },
  { id: 'trust', name: 'Trust Wallet', meta: 'Mobile app', mark: 'T', markClass: 'bg-mint-600 text-ink-950' },
  { id: 'phantom', name: 'Phantom (Solana)', meta: 'Connects on Solana only', mark: 'P', markClass: 'bg-violet-400 text-ink-950', tag: 'Solana' },
  { id: 'ledger', name: 'Ledger via WalletConnect', meta: 'Hardware wallet through the Ledger Live app', mark: 'L', markClass: 'bg-ink-100 text-ink-950', tag: 'Hardware' },
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
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-md text-label-l font-bold', p.markClass, className)}
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
                  {p.id === 'browser' && injected && <Tag tone="brand">Detected</Tag>}
                  {p.tag && <Tag>{p.tag}</Tag>}
                </span>
                <span className="text-caption text-text-tertiary">
                  {unavailable ? 'Not detected — open this page in your wallet’s in-app browser' : p.meta}
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
