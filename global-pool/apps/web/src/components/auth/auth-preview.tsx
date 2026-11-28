'use client';

import Link from 'next/link';
import * as React from 'react';

import type { AccountStatus, NewDeviceAlert } from '@/lib/api/auth';
import { MOCK_WALLET_ADDRESS } from '@/lib/auth/mock-auth-provider';
import { useAuthUi } from '@/lib/auth/ui-context';
import { buildWalletMessage } from '@/lib/auth/wallet-message';

import { AuthModal } from './auth-ui';
import { PREVIEW_STATES, type PreviewState } from './preview-states';
import { KeyValue, KeyValueBox } from './auth-ui';
import { NewDeviceDialog } from './new-device-dialog';
import { RestrictedView, type RestrictedVariant } from './restricted';
import { SessionExpiredBody } from './session-expired-dialog';
import { StepUpDialog, type StepUpUiState } from './step-up';
import {
  ConnectWalletDialog,
  VerifyWalletDialog,
  type ConnectState,
  type VerifyState,
} from './wallet-dialogs';

/**
 * Dev / QA only (/auth-preview?show=…, enabled with the state preview flag): renders each auth dialog state with
 * DEMO fixtures so Playwright can screenshot states that are hard to reach live (locked 2FA, expired nonce…).
 */

const issued = new Date();
const conn = { address: MOCK_WALLET_ADDRESS, chainId: 421614, provider: 'browser' as const };
const request = {
  message: buildWalletMessage({
    address: MOCK_WALLET_ADDRESS,
    nonce: '8f3a91c2d4e6b7a0',
    issuedAt: issued,
  }),
  nonce: '8f3a91c2d4e6b7a0',
  issuedAt: issued.toISOString(),
  expiresAt: new Date(issued.getTime() + 10 * 60_000).toISOString(),
};
const expiredRequest = {
  ...request,
  issuedAt: new Date(issued.getTime() - 20 * 60_000).toISOString(),
  expiresAt: new Date(issued.getTime() - 10 * 60_000).toISOString(),
};

const BASE_STATUS: AccountStatus = {
  gate: 'ok',
  onboarded: true,
  status: 'active',
  restrictions: [],
  paused: { gaming: false, deposits: false, withdrawals: false },
  selfExclusion: { active: false, startsAt: null, endsAt: null },
  region: {
    current: { code: 'PT', name: 'Portugal', permitted: true },
    declared: { code: 'PT', name: 'Portugal', permitted: true },
    permitted: true,
  },
  isDemo: true,
};

function statusFor(v: RestrictedVariant): AccountStatus {
  switch (v) {
    case 'suspended':
      return {
        ...BASE_STATUS,
        gate: 'suspended',
        restrictions: [
          { type: 'account_suspended', since: '2026-11-27T09:12:00Z', reference: 'SUS-3107A2' },
        ],
        paused: { gaming: true, deposits: true, withdrawals: false },
      };
    case 'under-review':
      return {
        ...BASE_STATUS,
        gate: 'under_review',
        restrictions: [
          { type: 'gaming_blocked', since: '2026-11-27T10:00:00Z', reference: 'REV-2291C4' },
          { type: 'deposits_blocked', since: '2026-11-27T10:00:00Z', reference: 'REV-2291C5' },
        ],
        paused: { gaming: true, deposits: true, withdrawals: false },
      };
    case 'self-excluded':
      return {
        ...BASE_STATUS,
        gate: 'self_excluded',
        selfExclusion: {
          active: true,
          startsAt: '2026-11-27T16:45:00Z',
          endsAt: '2027-11-27T16:45:00Z',
        },
        paused: { gaming: true, deposits: true, withdrawals: false },
      };
    case 'region':
      return {
        ...BASE_STATUS,
        gate: 'region',
        region: {
          current: { code: 'US', name: 'United States', permitted: false },
          declared: { code: 'PT', name: 'Portugal', permitted: true },
          permitted: false,
        },
        paused: { gaming: true, deposits: true, withdrawals: false },
      };
  }
}

const ALERT: NewDeviceAlert = {
  sessionId: '00000000-0000-4000-8000-000000000021',
  device: 'Edge on Windows',
  location: 'Madrid, Spain (approximate)',
  ipMasked: '85.48.•••.12',
  signedInAt: '2026-11-25T21:14:00Z',
  isDemo: true,
};

export function AuthPreview({ show }: { show: PreviewState | null }) {
  const ui = useAuthUi();
  const [open, setOpen] = React.useState(true);
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (opened.current) return;
    if (show === 'sign-in' || show === 'sign-up' || show === 'wallet') {
      opened.current = true;
      ui.openDialog({ view: show, intent: show === 'sign-up' ? 'sign-up' : 'sign-in' });
    }
  }, [show, ui]);

  const close = () => setOpen(false);
  const restricted = show?.startsWith('restricted-')
    ? (show.slice('restricted-'.length) as RestrictedVariant)
    : null;

  const connectState: ConnectState | null = !open
    ? null
    : show === 'connect-list'
      ? { step: 'list' }
      : show === 'connect-qr'
        ? { step: 'qr', provider: 'walletconnect', expiresAt: Date.now() + 292_000 }
        : show === 'connect-connecting'
          ? { step: 'connecting', provider: 'browser' }
          : show === 'connect-rejected'
            ? {
                step: 'rejected',
                provider: 'browser',
                message: 'The request was declined in your wallet.',
              }
            : show === 'connect-wrong-network'
              ? { step: 'wrong-network', conn: { ...conn, chainId: 10 } }
              : show === 'connect-success'
                ? { step: 'success', conn }
                : null;
  const verifyState: VerifyState | null = !open
    ? null
    : show === 'verify-request'
      ? { step: 'request', conn, request, signing: false }
      : show === 'verify-success'
        ? {
            step: 'success',
            conn,
            request,
            signature: `0x4c1d${'0'.repeat(122)}92ab`,
            at: issued.toISOString(),
          }
        : show === 'verify-rejected'
          ? { step: 'rejected', conn }
          : show === 'verify-expired'
            ? { step: 'expired', conn, request: expiredRequest }
            : null;
  const stepUp: StepUpUiState | null =
    show === 'stepup'
      ? { kind: 'entry' }
      : show === 'stepup-wrong'
        ? { kind: 'wrong', attemptsRemaining: 3 }
        : show === 'stepup-locked'
          ? { kind: 'locked', lockedUntil: new Date(Date.now() + 892_000).toISOString() }
          : null;

  return (
    <div className="flex flex-col gap-6">
      {restricted ? (
        <RestrictedView
          variant={restricted}
          status={statusFor(restricted)}
          balances={{
            available: '9215.30',
            locked: '1850.00',
            pending: '1000.00',
            owed: '415.20',
            total: '12480.50',
            isDemo: true,
          }}
        />
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-6">
          <h1 className="text-h3 text-text-primary">Auth preview (dev / QA only)</h1>
          <p className="text-body-s text-text-secondary">
            DEMO fixtures for every AUTH dialog state.
          </p>
          <ul className="flex flex-wrap gap-2">
            {PREVIEW_STATES.map((s) => (
              <li key={s}>
                <Link
                  className="inline-flex min-h-11 items-center rounded-md bg-surface-raised px-3 text-label-s text-text-secondary hover:text-text-primary"
                  href={`/auth-preview?show=${s}`}
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {stepUp && (
        <StepUpDialog
          open={open}
          previewState={stepUp}
          request={{
            purpose: 'withdrawal',
            title: 'Confirm withdrawal WD-20931',
            description:
              'Enter the current code from your authenticator app to send this withdrawal.',
            confirmLabel: 'Confirm withdrawal',
            summary: (
              <KeyValueBox>
                <KeyValue label="Amount" value="1,500.00 USDT" demo />
                <KeyValue label="To" value="0x7c4e…a21D" mono demo />
                <KeyValue label="Network fee" value="0.12 USDT" />
                <KeyValue label="Platform fee" value="0.00 USDT" last />
              </KeyValueBox>
            ),
          }}
          onVerified={close}
          onCancel={close}
        />
      )}
      {connectState && (
        <ConnectWalletDialog
          state={connectState}
          onStateChange={(s) => !s && close()}
          onVerify={close}
        />
      )}
      {verifyState && (
        <VerifyWalletDialog state={verifyState} onStateChange={(s) => !s && close()} />
      )}
      {show === 'session-expired' && (
        <AuthModal
          open={open}
          onOpenChange={(o) => !o && close()}
          title="You were signed out to keep your account safe"
          size="s"
        >
          <SessionExpiredBody
            state={{
              reason: 'idle',
              at: '2026-11-27T18:42:00Z',
              account: {
                name: 'Nova K.',
                detail: 'n•••@example.com · GP-48213',
                initials: 'NK',
                isDemo: true,
              },
            }}
            onSignIn={close}
            onDismiss={close}
          />
        </AuthModal>
      )}
      {show === 'new-device' && (
        <NewDeviceDialog
          alert={open ? ALERT : null}
          secured={null}
          busy={null}
          error={null}
          onConfirm={close}
          onSecure={close}
          onLater={close}
          onCloseSecured={close}
        />
      )}
    </div>
  );
}
