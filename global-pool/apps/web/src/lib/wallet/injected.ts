'use client';

/**
 * Injected (EIP-1193) wallet reads for security warnings (ERR-07 "wrong network"). Read-only and prompt-free:
 * `eth_chainId` and `eth_accounts` never open a wallet pop-up (unlike `eth_requestAccounts`). Nothing here signs,
 * sends or links anything — wallet linking stays in `useWalletConnect()` (components/auth/wallet-dialogs).
 */
import { MVP_CHAIN_ID } from '@gp/shared/chains';
import * as React from 'react';

interface Eip1193 {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (value: unknown) => void) => void;
  removeListener?: (event: string, cb: (value: unknown) => void) => void;
}

function injected(): Eip1193 | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum;
}

export interface InjectedWalletState {
  /** Chain id the injected wallet is on (null: no injected wallet, or it did not answer). */
  chainId: number | null;
  /** Accounts this site is already allowed to see (lower-case); empty when not connected. */
  accounts: string[];
}

const toChainId = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = v.startsWith('0x') ? Number.parseInt(v, 16) : Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const toAccounts = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((a): a is string => typeof a === 'string').map((a) => a.toLowerCase())
    : [];

/** Chain id + already-authorised accounts of an injected wallet; follows `chainChanged` / `accountsChanged`. */
export function useInjectedWallet(enabled = true): InjectedWalletState {
  const [state, setState] = React.useState<InjectedWalletState>({ chainId: null, accounts: [] });
  React.useEffect(() => {
    const eth = enabled ? injected() : undefined;
    if (!eth) return;
    let alive = true;
    const onChain = (v: unknown) => alive && setState((s) => ({ ...s, chainId: toChainId(v) }));
    const onAccounts = (v: unknown) =>
      alive && setState((s) => ({ ...s, accounts: toAccounts(v) }));
    eth.request({ method: 'eth_chainId' }).then(onChain, () => undefined);
    eth.request({ method: 'eth_accounts' }).then(onAccounts, () => undefined);
    eth.on?.('chainChanged', onChain);
    eth.on?.('accountsChanged', onAccounts);
    return () => {
      alive = false;
      eth.removeListener?.('chainChanged', onChain);
      eth.removeListener?.('accountsChanged', onAccounts);
    };
  }, [enabled]);
  return state;
}

/**
 * The member's own linked wallet is connected to this site but on another chain than the MVP chain (Arbitrum
 * Sepolia). A wallet extension that is merely installed, or connected with an address the member never linked,
 * is not "theirs" here — no warning for players who signed in by email and never use that wallet with us.
 */
export function isWrongNetwork(
  { chainId, accounts }: InjectedWalletState,
  linkedAddress: string | null | undefined,
  expectedChainId: number = MVP_CHAIN_ID,
): boolean {
  if (!linkedAddress || chainId === null) return false;
  if (!accounts.includes(linkedAddress.toLowerCase())) return false;
  return chainId !== expectedChainId;
}

/** Ask the injected wallet to switch to the MVP chain (the wallet shows its own approval). False when it can't. */
export async function switchToMvpChain(): Promise<boolean> {
  const eth = injected();
  if (!eth) return false;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${MVP_CHAIN_ID.toString(16)}` }],
    });
    return true;
  } catch {
    return false;
  }
}
