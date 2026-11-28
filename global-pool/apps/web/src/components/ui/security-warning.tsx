import { formatDateTimeUTC } from '@gp/shared/format';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Alert, type AlertType } from './alert';

/**
 * ERR-07 security warnings library: one honest, consistent copy set for the warnings players see around money and
 * identity. Built on `<Alert>` (Security / Warning / Info), so security warnings are never dismissible.
 *
 * Kinds: wrong-network · new-address (24 h cool-down) · new-device · suspicious-login · phishing · anti-phishing ·
 * unverified-contract. Every kind says what happened, what is still safe and the next step. No dark patterns: no
 * fake urgency, no hidden fees, nothing that pushes a player to skip a protection (support can't skip a cool-down
 * either).
 */
export type SecurityWarningKind =
  | 'wrong-network'
  | 'new-address'
  | 'new-device'
  | 'suspicious-login'
  | 'phishing'
  | 'anti-phishing'
  | 'unverified-contract';

export interface SecurityWarningProps {
  kind: SecurityWarningKind;
  /** wrong-network: the network the action needs (e.g. "Arbitrum Sepolia"). */
  networkName?: string;
  /** wrong-network: the chain id the wallet is on, when known. */
  currentChainId?: number | null;
  /** new-address: shortened address / label; `unlocksAt` = server's absolute unlock time (ISO). */
  address?: string;
  unlocksAt?: string | null;
  /** new-device / suspicious-login: device, approximate location and time (ISO) from the API. */
  device?: string;
  location?: string | null;
  at?: string | null;
  /** anti-phishing: the player's code (`GET /me` security.antiPhishingCode); null = not set. */
  code?: string | null;
  /** unverified-contract: the token the platform credits (e.g. "Test USDT (Arbitrum Sepolia)"). */
  tokenLabel?: string;
  /** Overrides the default title / body. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  layout?: 'inline' | 'full';
  className?: string;
}

const TYPE: Record<SecurityWarningKind, AlertType> = {
  'wrong-network': 'security',
  'new-address': 'info',
  'new-device': 'security',
  'suspicious-login': 'security',
  phishing: 'warning',
  'anti-phishing': 'info',
  'unverified-contract': 'security',
};

/** Default title + body per kind (exported for tests and for surfaces that need plain text, e.g. toasts). */
export function securityWarningCopy(
  p: Omit<SecurityWarningProps, 'title' | 'children' | 'actions' | 'layout' | 'className'>,
): { title: string; body: string } {
  const network = p.networkName ?? 'Arbitrum Sepolia';
  switch (p.kind) {
    case 'wrong-network':
      return {
        title: 'Your wallet is on the wrong network',
        body: `${p.currentChainId ? `Your wallet is on chain ID ${p.currentChainId}. ` : ''}Switch it to ${network} before you send or sign anything. A transfer on another network can’t be credited and may be lost. Switching is free and moves no funds.`,
      };
    case 'new-address':
      return {
        title: `${p.address ?? 'New address'} is cooling down`,
        body: `${p.unlocksAt ? `It can receive withdrawals from ${formatDateTimeUTC(p.unlocksAt)}. ` : ''}Every new withdrawal address waits 24 h, so your balance stays safe if someone else gets into your account — support can’t skip it. Didn’t add it? Remove it and secure your account.`,
      };
    case 'new-device':
      return {
        title: 'New sign-in on your account',
        body: `${[p.device, p.location, p.at ? formatDateTimeUTC(p.at) : null].filter(Boolean).join(' · ') || 'A device we haven’t seen before signed in.'}${p.device || p.location || p.at ? '.' : ''} If this was you, there’s nothing to do. If not, sign that device out and turn on two-step sign-in.`,
      };
    case 'suspicious-login':
      return {
        title: 'Unusual sign-in attempt',
        body: `${[p.device, p.location, p.at ? formatDateTimeUTC(p.at) : null].filter(Boolean).join(' · ') || 'We noticed a sign-in that doesn’t look like you.'}${p.device || p.location || p.at ? '.' : ''} Your balance hasn’t moved. Review your devices and sign out anything you don’t recognise.`,
      };
    case 'phishing':
      return {
        title: 'Check you’re on the real GLOBAL POOL',
        body: 'Only sign in on this site’s address. GLOBAL POOL never asks for your seed phrase, private keys, 2FA or backup codes — not by email, chat, phone or DM.',
      };
    case 'anti-phishing':
      return p.code
        ? {
            title: `Your anti-phishing code: ${p.code}`,
            body: 'Every genuine GLOBAL POOL email shows this code. No code, or a different one? Don’t click anything — it isn’t from us.',
          }
        : {
            title: 'Set an anti-phishing code',
            body: 'Add a code that only you and GLOBAL POOL know. Every genuine email will show it, so fake ones are easy to spot.',
          };
    case 'unverified-contract':
      return {
        title: `Only ${p.tokenLabel ?? 'the official test USDT'} is credited`,
        body: 'Tokens from any other contract — including look-alike tokens called “USDT” and unexpected airdrops — are never credited and are often scams. Don’t approve or interact with them.',
      };
  }
}

/** ERR-07 security warning (see `SecurityWarningKind`). Pass `actions` for the next step (switch, remove, review). */
export function SecurityWarning({
  title,
  children,
  actions,
  layout = 'inline',
  className,
  ...copy
}: SecurityWarningProps) {
  const d = securityWarningCopy(copy);
  return (
    <Alert
      type={TYPE[copy.kind]}
      layout={layout}
      title={title ?? d.title}
      actions={actions}
      data-security-warning={copy.kind}
      className={cn(className)}
    >
      {children ?? d.body}
    </Alert>
  );
}
