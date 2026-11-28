'use client';

import type { ChainKey } from '@gp/shared/chains';
import { NEW_ADDRESS_COOLDOWN_HOURS } from '@gp/shared/limits';
import { formatDateUTC } from '@gp/shared/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleCheck,
  CircleX,
  Clock,
  Fingerprint,
  History,
  KeyRound,
  Lock,
  Mail,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AddressChip } from '@/components/domain/address-chip';
import { ROUTES } from '@/components/shell/nav-config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { accountApi, accountKeys, useSecurity, type SecurityView } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import {
  ArrowLinkText,
  CardSkeleton,
  CheckLine,
  Demo,
  IconTile,
  QueryState,
  ScoreRing,
  SettingRow,
  ToneChip,
  utc,
  type Tone,
} from './primitives';

export function scoreTone(status: SecurityView['status']): Tone {
  return status === 'strong' ? 'success' : status === 'needs_review' ? 'warning' : 'danger';
}

/** "It was me" / "Secure my account" for a flagged device (protective actions — no 2FA code needed to secure). */
export function useDeviceReview() {
  const qc = useQueryClient();
  const confirm = useMutation({
    mutationFn: accountApi.confirmDevice,
    onSuccess: () => toast({ type: 'success', title: 'Thanks — device marked as yours' }),
    onError: (e) =>
      toast({ type: 'error', title: 'Couldn’t update the device', description: e.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
  const secure = useMutation({
    mutationFn: accountApi.secureAccount,
    onSuccess: (r) =>
      toast({
        type: 'success',
        title: 'Account secured',
        description: `${r.revokedSessions} other session${r.revokedSessions === 1 ? '' : 's'} signed out. Your balance is not affected.`,
      }),
    onError: (e) =>
      toast({ type: 'error', title: 'Couldn’t secure the account', description: e.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
  return { confirm, secure };
}

/** USR-A2 Security settings: score, review banner, sign-in + withdrawal protection, recent security activity. */
export function SecurityOverview() {
  const q = useSecurity();
  const s = q.data;
  const review = s?.devicesToReview[0];
  const { confirm, secure } = useDeviceReview();
  const demo = s?.devicesToReview.some((d) => d.isDemo) ?? false;

  return (
    <DashboardPage
      tab="account"
      accountTab="security"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Security' },
      ]}
      title="Security settings"
      description="Your security score and every control that protects sign-in and withdrawals. Protective actions (revoking a device, ending sessions) never need extra checks."
      actions={
        <>
          <Button variant="secondary" size="m" leadingIcon={<History aria-hidden />} asChild>
            <Link href={ACCOUNT_ROUTES.loginHistory}>Login history</Link>
          </Button>
          {review && (
            <Button size="m" leadingIcon={<ShieldCheck aria-hidden />} asChild>
              <a href="#review-sign-in">Review new sign-in</a>
            </Button>
          )}
        </>
      }
    >
      <QueryState
        query={q}
        label="your security settings"
        skeleton={
          <div className="grid gap-6 laptop:grid-cols-2">
            <CardSkeleton rows={5} />
            <CardSkeleton rows={5} />
          </div>
        }
      >
        {s && (
          <>
            {review && (
              <section
                id="review-sign-in"
                aria-label="Sign-in to review"
                className="flex flex-col gap-3 rounded-lg border border-border-danger bg-status-danger-tint p-5"
              >
                <p className="flex flex-wrap items-center gap-2 text-body-m-strong">
                  <ShieldAlert aria-hidden className="size-5 text-text-danger" />
                  New sign-in{review.location ? ` from ${review.location}` : ''} — was this you?
                  <Demo show={review.isDemo} />
                </p>
                <p className="text-body-s text-text-secondary">
                  {review.device} on {utc(review.signedInAt)}. If you don’t recognise it, secure
                  your account — every other session is signed out and your balance stays protected
                  by 2FA.
                </p>
                <div className="flex flex-wrap gap-2 max-tablet:[&>*]:flex-1">
                  <Button
                    size="m"
                    loading={secure.isPending}
                    onClick={() => secure.mutate(review.sessionId)}
                  >
                    Secure account
                  </Button>
                  <Button
                    variant="ghost"
                    size="m"
                    loading={confirm.isPending}
                    onClick={() => confirm.mutate(review.sessionId)}
                  >
                    This was me
                  </Button>
                </div>
              </section>
            )}

            <div className="grid items-start gap-6 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
              <div className="flex flex-col gap-6">
                <ScoreCard s={s} />
                <Card className="gap-3">
                  <h2 className="flex items-center gap-2 text-h5">
                    <IconTile icon={ShieldCheck} tone="gold" size={32} /> We will never ask for
                  </h2>
                  {[
                    'Your 2FA codes or backup codes — not by email, chat or phone',
                    'Your wallet seed phrase or private keys — ever',
                    'A payment to “unlock” a withdrawal or a prize',
                    'Remote access to your device',
                  ].map((t) => (
                    <CheckLine key={t} ok={false} tone="danger">
                      {t}
                    </CheckLine>
                  ))}
                  <p className="text-caption text-text-tertiary">
                    Spotted something odd? Report it via{' '}
                    <Link href={ROUTES.support} className="text-text-brand hover:underline">
                      Support
                    </Link>
                    .
                  </p>
                </Card>
                <Card className="gap-2">
                  <h2 className="flex items-center gap-2 text-h5">
                    <Fingerprint aria-hidden className="size-5 text-icon-brand" /> Anti-phishing
                    code
                  </h2>
                  <p className="font-mono text-mono-m">{s.antiPhishingCode ?? 'Not set'}</p>
                  <p className="text-body-s text-text-secondary">
                    Shown in every email and 2FA dialog we send.
                  </p>
                  <ArrowLinkText href={ACCOUNT_ROUTES.antiPhishing}>
                    {s.antiPhishingCode ? 'Change code' : 'Set a code'}
                  </ArrowLinkText>
                </Card>
                <Card className="gap-2">
                  <h2 className="flex items-center gap-2 text-h5">
                    <MonitorSmartphone aria-hidden className="size-5 text-icon-brand" /> Devices
                    &amp; sessions
                  </h2>
                  <p className="text-body-m">
                    <span className="text-number-m">{s.sessions.active}</span>{' '}
                    <span className="text-text-secondary">
                      active session{s.sessions.active === 1 ? '' : 's'}
                    </span>
                  </p>
                  {s.sessions.toReview > 0 ? (
                    <p className="flex items-center gap-2 text-body-s text-text-warning">
                      <TriangleAlert aria-hidden className="size-4" /> {s.sessions.toReview} new
                      device
                      {s.sessions.toReview > 1 ? 's need' : ' needs'} review
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-body-s text-text-success">
                      <CircleCheck aria-hidden className="size-4" /> All devices recognised
                    </p>
                  )}
                  <ArrowLinkText href={ACCOUNT_ROUTES.devices}>Review devices</ArrowLinkText>
                </Card>
              </div>

              <div className="flex flex-col gap-6">
                <Card padding="l" className="gap-1">
                  <div className="mb-2">
                    <h2 className="text-h5">Sign-in protection</h2>
                    <p className="text-body-s text-text-secondary">
                      Required for new devices, withdrawals and any change to these settings.
                    </p>
                  </div>
                  <SettingRow
                    first
                    icon={KeyRound}
                    tone={s.twoFactor.enabled ? 'success' : 'warning'}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        Two-factor authentication
                        <ToneChip
                          tone={s.twoFactor.enabled ? 'success' : 'warning'}
                          icon={s.twoFactor.enabled ? CircleCheck : TriangleAlert}
                        >
                          {s.twoFactor.enabled ? 'On' : 'Off'}
                        </ToneChip>
                      </span>
                    }
                    detail={
                      s.twoFactor.enabled
                        ? `Authenticator app · ${s.twoFactor.backupCodesRemaining} of 10 backup codes left`
                        : 'Needed before your first withdrawal or a sign-in from a new device.'
                    }
                  >
                    <Button
                      variant={s.twoFactor.enabled ? 'secondary' : 'primary'}
                      size="s"
                      asChild
                    >
                      <Link href={ACCOUNT_ROUTES.twoFactor}>
                        {s.twoFactor.enabled ? 'Manage' : 'Turn on'}
                      </Link>
                    </Button>
                  </SettingRow>
                  <SettingRow
                    icon={Lock}
                    title="Sign-in method"
                    detail="Passwordless — a one-time email code, a social login or your wallet (via Privy). There is no password to steal or reuse."
                  >
                    <ToneChip tone="success" icon={CircleCheck}>
                      No password
                    </ToneChip>
                  </SettingRow>
                  <SettingRow
                    icon={Mail}
                    title="Email alerts for new devices"
                    detail={`We email ${s.email.masked ?? 'you'} with your anti-phishing code whenever a new device signs in.`}
                  >
                    <ToneChip tone="success" icon={CircleCheck}>
                      Always on
                    </ToneChip>
                  </SettingRow>
                </Card>

                <Card padding="l" className="gap-1">
                  <div className="mb-2">
                    <h2 className="text-h5">Withdrawal protection</h2>
                    <p className="text-body-s text-text-secondary">
                      Applies to every withdrawal. These checks are the same speed for everyone and
                      never hold your balance.
                    </p>
                  </div>
                  <SettingRow
                    first
                    icon={ShieldCheck}
                    tone={s.whitelist.length ? 'success' : 'neutral'}
                    title="Address whitelist"
                    detail={`Only whitelisted addresses can receive withdrawals. New addresses wait ${NEW_ADDRESS_COOLDOWN_HOURS} h before first use.`}
                  >
                    <span
                      className={cn(
                        'text-label-s',
                        s.whitelist.length ? 'text-text-success' : 'text-text-tertiary',
                      )}
                    >
                      {s.whitelist.length
                        ? `On · ${s.whitelist.length} address${s.whitelist.length > 1 ? 'es' : ''}`
                        : 'No addresses'}
                    </span>
                    <Button variant="secondary" size="s" asChild>
                      <Link href={`${ROUTES.wallet}/whitelist`}>Manage</Link>
                    </Button>
                  </SettingRow>
                  {s.whitelist.slice(0, 2).map((w) => (
                    <div
                      key={w.id}
                      className="mb-2 flex flex-wrap items-center gap-3 rounded-md bg-bg-secondary px-3 py-2.5"
                    >
                      <AddressChip
                        address={w.address}
                        chain={w.network as ChainKey}
                        demo={w.isDemo}
                        size="s"
                      />
                      <span className="text-caption text-text-tertiary">
                        whitelisted {w.whitelistedAt ? formatDateUTC(w.whitelistedAt) : '—'}
                      </span>
                    </div>
                  ))}
                  <SettingRow
                    icon={Lock}
                    title="2FA on every withdrawal"
                    detail={`Always on. You’ll see your anti-phishing code${s.antiPhishingCode ? ` ${s.antiPhishingCode}` : ''} in the confirmation dialog.`}
                  >
                    <span className="inline-flex items-center gap-1 text-label-s text-text-secondary">
                      <Lock aria-hidden className="size-3.5" /> Always on
                    </span>
                  </SettingRow>
                  <SettingRow
                    icon={Timer}
                    title="New-address cooldown"
                    detail={`${NEW_ADDRESS_COOLDOWN_HOURS} h after adding an address or changing 2FA.`}
                  >
                    <span className="inline-flex items-center gap-1 text-label-s text-text-secondary">
                      <Clock aria-hidden className="size-3.5" /> {NEW_ADDRESS_COOLDOWN_HOURS} h
                    </span>
                  </SettingRow>
                </Card>

                <Card padding="l" className="gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-h5">Recent security activity</h2>
                    <ArrowLinkText href={ACCOUNT_ROUTES.loginHistory} className="ml-auto">
                      Full login history
                    </ArrowLinkText>
                  </div>
                  {s.events.length === 0 ? (
                    <p className="text-body-s text-text-tertiary">
                      No security changes in the last 12 months.
                    </p>
                  ) : (
                    <ul className="flex flex-col">
                      {s.events.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 border-t border-border-subtle py-3 first:border-t-0"
                        >
                          <IconTile
                            icon={
                              e.tone === 'warning'
                                ? TriangleAlert
                                : e.tone === 'success'
                                  ? ShieldCheck
                                  : CircleCheck
                            }
                            tone={e.tone}
                            size={32}
                          />
                          <p className="min-w-0 flex-1 text-body-s-strong">{e.label}</p>
                          <span className="shrink-0 text-caption text-text-tertiary">
                            {utc(e.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
            {demo && (
              <p className="text-caption text-text-tertiary">
                Items marked DEMO are illustrative seed data.
              </p>
            )}
          </>
        )}
      </QueryState>
    </DashboardPage>
  );
}

const NEXT_STEP: Record<string, string> = {
  two_factor: 'turn on 2FA',
  anti_phishing: 'set an anti-phishing code',
  whitelist: 'whitelist a withdrawal address',
  email_verified: 'verify your email',
  backup_codes: 'generate new backup codes',
  devices_recognised: 'review your new devices',
};

function ScoreCard({ s }: { s: SecurityView }) {
  const tone = scoreTone(s.status);
  const todo = s.items.filter((i) => !i.ok);
  return (
    <Card className="gap-4" padding="l">
      <div>
        <h2 className="text-h5">Security score</h2>
        <p className="text-caption text-text-tertiary">Checked just now from your live settings</p>
      </div>
      <div className="flex items-center gap-4">
        <ScoreRing score={s.score} max={s.max} tone={tone} />
        <div>
          <p className="text-body-m-strong">
            {s.status === 'strong' ? 'Strong' : s.status === 'needs_review' ? 'Good' : 'At risk'}
            {todo.length
              ? ` — ${todo.length} item${todo.length > 1 ? 's' : ''} to review`
              : ' — nothing to review'}
          </p>
          <p className="text-body-s text-text-secondary">
            {todo.length
              ? `To reach ${s.max}: ${todo.map((t) => NEXT_STEP[t.key] ?? t.label).join(', ')}.`
              : 'Every protection is on.'}
          </p>
        </div>
      </div>
      <ul className="flex flex-col">
        {s.items.map((i) => (
          <li key={i.key} className="border-t border-border-subtle py-2.5 first:border-t-0">
            <CheckLine ok={i.ok ? true : 'warn'} aside={i.ok ? `+${i.points}` : `0 / ${i.points}`}>
              {i.label}
            </CheckLine>
          </li>
        ))}
      </ul>
      {!s.twoFactor.enabled && (
        <Button size="m" asChild>
          <Link href={ACCOUNT_ROUTES.twoFactor}>Turn on 2FA (+30)</Link>
        </Button>
      )}
      {s.twoFactor.enabled && s.twoFactor.backupCodesRemaining === 0 && (
        <p className="flex items-start gap-2 text-caption text-text-tertiary">
          <CircleX aria-hidden className="mt-0.5 size-3.5 text-text-warning" /> No backup codes left
          — generate new ones in Two-factor authentication.
        </p>
      )}
    </Card>
  );
}
