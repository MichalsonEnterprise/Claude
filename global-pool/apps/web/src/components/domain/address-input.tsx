'use client';

import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { ClipboardPaste, ScanLine, ShieldCheck, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { isAddress } from 'viem';

import { IconButton } from '@/components/ui/button';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { NetworkPill } from './network-pill';

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Client-side format check per chain family (the API re-validates and screens the address). */
export function isValidAddress(chain: ChainKey, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return CHAINS[chain].family === 'solana'
    ? SOLANA_ADDRESS.test(v)
    : isAddress(v, { strict: false });
}

export interface AddressInputProps {
  chain: ChainKey;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Whitelist state of the entered address (from the API). */
  addressStatus?: 'whitelisted' | 'new';
  /** Cool-down hours for new addresses (default 24). */
  cooldownHours?: number;
  /** Opens a QR scanner; the Scan button is hidden when omitted. */
  onScanRequest?: () => void;
  showNetwork?: boolean;
  error?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Input/Address: network pill in the header, mono value, Paste + Scan QR, chain-family validation
 * (EVM checksum-tolerant via viem, Solana base58), Whitelisted / New address (24 h cooldown) states.
 */
export function AddressInput({
  chain,
  value,
  onChange,
  label = 'Withdrawal address',
  addressStatus,
  cooldownHours = 24,
  onScanRequest,
  showNetwork = true,
  error,
  disabled,
  className,
}: AddressInputProps) {
  const name = CHAINS[chain].name;
  const filled = value.trim().length > 0;
  const valid = filled && isValidAddress(chain, value);
  const message =
    error ??
    (filled && !valid
      ? `Not a valid ${name} address — check the network before you continue.`
      : undefined);
  const success =
    valid && !message
      ? addressStatus === 'whitelisted'
        ? `Whitelisted ${name} address`
        : `Valid ${name} address`
      : undefined;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
    } catch {
      /* clipboard permission denied — the user can still type/paste manually */
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Field
        label={label}
        labelAside={showNetwork ? <NetworkPill chain={chain} size="s" /> : undefined}
        error={message}
        success={success}
        helper={
          !filled
            ? `Only send USDT on ${name}. Sending on another network can lose funds.`
            : undefined
        }
        disabled={disabled}
      >
        <InputGroup
          size="l"
          state={message ? 'error' : success ? 'success' : 'default'}
          className="pr-1.5"
        >
          <InputControl
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            placeholder={CHAINS[chain].family === 'solana' ? 'Base58 address' : '0x…'}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono text-mono-m"
          />
          {addressStatus === 'whitelisted' && valid && (
            <ShieldCheck aria-label="Whitelisted" className="size-[18px] text-text-success" />
          )}
          <IconButton label="Paste address" size="s" onClick={paste} disabled={disabled}>
            <ClipboardPaste aria-hidden />
          </IconButton>
          {onScanRequest && (
            <IconButton label="Scan QR code" size="s" onClick={onScanRequest} disabled={disabled}>
              <ScanLine aria-hidden />
            </IconButton>
          )}
        </InputGroup>
      </Field>
      {addressStatus === 'new' && valid && (
        <div className="flex gap-2.5 rounded-md border border-status-warning/30 bg-status-warning-tint p-3 text-body-s">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-text-warning" />
          <p className="text-text-secondary">
            <span className="font-medium text-text-primary">New address.</span> For your security,
            withdrawals to a newly added address unlock after a {cooldownHours} h cool-down. You can
            cancel the address any time.
          </p>
        </div>
      )}
    </div>
  );
}
