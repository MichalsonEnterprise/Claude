'use client';

import { Clock, Info, LogIn, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { IDLE_TIMEOUT_MINUTES } from '@/lib/auth/session-layer';
import { useAuthUi, type SessionExpiredState } from '@/lib/auth/ui-context';

import { AuthModal, Callout, Note, Pane, PaneHeader } from './auth-ui';
import { formatUtcDateTime } from './format';

/**
 * AUTH-20 session expired. Shown after the inactivity timeout or when the API rejects the session (signed out on
 * another device, token revoked). Privy has no passwords, so "Sign in again" reopens the email-code / wallet flow
 * and returns to the same page.
 */
export function SessionExpiredDialog() {
  const ui = useAuthUi();
  const pathname = usePathname();
  const state = ui.expired;
  return (
    <AuthModal
      open={state !== null}
      onOpenChange={(o) => !o && ui.showExpired(null)}
      title="You were signed out to keep your account safe"
      size="s"
    >
      {state && (
        <SessionExpiredBody
          state={state}
          onSignIn={() => ui.openDialog({ view: 'sign-in', intent: 'sign-in', next: pathname })}
          onDismiss={() => ui.showExpired(null)}
        />
      )}
    </AuthModal>
  );
}

export function SessionExpiredBody({
  state,
  onSignIn,
  onDismiss,
}: {
  state: SessionExpiredState;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  const idle = state.reason === 'idle';
  return (
    <Pane onClose={onDismiss} top={<span className="sr-only">Session expired</span>}>
      <PaneHeader icon={Clock} tone="warning" overline="Session expired" title="You were signed out to keep your account safe">
        {idle ? (
          <>
            No activity for {IDLE_TIMEOUT_MINUTES} minutes — signed out {formatUtcDateTime(state.at)}. Sign in again
            and we’ll bring you back to where you were.
          </>
        ) : (
          <>
            This session ended — it was signed out on another device or expired ({formatUtcDateTime(state.at)}).
            Sign in again to continue where you were.
          </>
        )}
      </PaneHeader>
      {state.account && (
        <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised py-2.5 pr-3.5 pl-2.5">
          <Avatar initials={state.account.initials} size="m" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body-s-strong text-text-primary">{state.account.name}</span>
            {state.account.detail && <span className="truncate text-caption text-text-tertiary">{state.account.detail}</span>}
          </div>
          {state.account.isDemo && <DemoBadge size="xs" />}
          <button type="button" onClick={onSignIn} className="min-h-11 text-label-s text-text-brand hover:underline">
            Not you?
          </button>
        </div>
      )}
      <Callout tone="success" icon={ShieldCheck} title="Nothing changed while you were away">
        Your balances, entries and withdrawals are exactly as you left them — signing out never cancels anything.
      </Callout>
      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-4 tablet:flex-row">
        <Button variant="ghost" size="l" block onClick={onDismiss}>
          Sign out completely
        </Button>
        <Button size="l" block leadingIcon={<LogIn />} onClick={onSignIn}>
          Sign in again
        </Button>
      </div>
      <Note icon={Info}>
        No password needed — we’ll email you a new code (or use your wallet). Inactivity sign-out after{' '}
        {IDLE_TIMEOUT_MINUTES} min; security changes always ask for your authenticator code.
      </Note>
    </Pane>
  );
}
