'use client';

import { formatTimeUTC } from '@gp/shared/format';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Alert } from '@/components/ui/alert';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { ApiRequestError } from '@/lib/api/client';
import { useMe } from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

export interface StepUpErrorInfo {
  kind: 'invalid' | 'locked' | 'not_enrolled' | 'required' | 'other';
  message: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
}

/** Map an API step-up failure (STEP_UP_REQUIRED / STEP_UP_LOCKED) to plain language. */
export function stepUpError(err: unknown): StepUpErrorInfo | null {
  if (!(err instanceof ApiRequestError)) return null;
  const d = err.details ?? {};
  if (err.code === 'STEP_UP_LOCKED') {
    const until = typeof d.lockedUntil === 'string' ? d.lockedUntil : undefined;
    return {
      kind: 'locked',
      lockedUntil: until,
      message: `Too many incorrect codes, so we paused withdrawals and whitelist changes to protect your account${until ? ` until ${formatTimeUTC(until)}` : ''}. Nothing has been sent.`,
    };
  }
  if (err.code === 'STEP_UP_REQUIRED') {
    if (d.reason === 'enroll_2fa')
      return {
        kind: 'not_enrolled',
        message: 'Set up two-factor authentication before you continue.',
      };
    if (d.reason === 'invalid_code') {
      const left = typeof d.attemptsRemaining === 'number' ? d.attemptsRemaining : undefined;
      return {
        kind: 'invalid',
        attemptsRemaining: left,
        message: `That code didn’t match — enter the newest code from your authenticator app.${left !== undefined ? ` ${left} of 5 attempts left.` : ''}`,
      };
    }
    return { kind: 'required', message: err.message };
  }
  return null;
}

/** Anti-phishing code block: genuine GLOBAL POOL emails and security prompts always show it. */
export function AntiPhishingCode({ className }: { className?: string }) {
  const me = useMe();
  const code = me.data?.security.antiPhishingCode;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3',
        className,
      )}
    >
      <ShieldCheck aria-hidden className="size-5 shrink-0 text-icon-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-caption text-text-tertiary">Your anti-phishing code</p>
        <p className="font-mono text-mono-m text-text-primary">
          {/* ERR-07: an unknown code (profile failed) is never shown as "Not set". */}
          {code ??
            (me.isPending
              ? '…'
              : me.isError
                ? 'Couldn’t load — check before you continue'
                : 'Not set')}
        </p>
      </div>
      {me.data?.isDemo && <DemoBadge size="xs" />}
      <p className="hidden max-w-56 text-caption text-text-tertiary tablet:block">
        Only continue if this matches the code in our emails.
      </p>
    </div>
  );
}

/**
 * Step-up 2FA field (authenticator code). The code is sent with the protected request (`totpCode`), so one code
 * authorises exactly one action. Shows the anti-phishing code and maps wrong-code / locked states.
 */
export function TwoFactorField({
  value,
  onChange,
  error,
  disabled,
  onComplete,
  label = 'Authenticator code',
  focusOnMount,
}: {
  value: string;
  onChange: (v: string) => void;
  error: unknown;
  disabled?: boolean;
  onComplete?: (v: string) => void;
  label?: string;
  focusOnMount?: boolean;
}) {
  const info = stepUpError(error);
  const locked = info?.kind === 'locked';
  return (
    <div className="flex flex-col gap-4">
      <AntiPhishingCode />
      <Field
        label={label}
        helper={
          info?.kind === 'invalid'
            ? undefined
            : 'From your authenticator app (GLOBAL POOL). Codes refresh every 30 seconds. A backup code also works.'
        }
        error={info?.kind === 'invalid' ? info.message : undefined}
        disabled={disabled || locked}
      >
        <OtpInput
          value={value}
          onChange={onChange}
          onComplete={onComplete}
          invalid={info?.kind === 'invalid'}
          disabled={disabled || locked}
          focusOnMount={focusOnMount}
        />
      </Field>
      {locked && (
        <Alert type="security" title="Paused for 15 minutes">
          {info.message} Lost your authenticator? Use a backup code or recover access — support will
          never ask for your codes.
        </Alert>
      )}
      {info?.kind === 'not_enrolled' && (
        <Alert
          type="security"
          title="Two-factor authentication is off"
          actions={
            <Link
              href="/account/security"
              className="inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-brand"
            >
              <KeyRound aria-hidden className="size-4" /> Set up 2FA
            </Link>
          }
        >
          Withdrawals and whitelist changes need an authenticator code.
        </Alert>
      )}
      {info?.kind === 'required' && <Alert type="security">{info.message}</Alert>}
    </div>
  );
}
