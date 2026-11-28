'use client';

/**
 * ADM-01 Admin login: step 1 work email + password, step 2 authenticator code, then ONE call to
 * POST /admin/auth/login {email, password, totpCode} (the API checks all three together and answers with one generic
 * error, so a failure never reveals which part was wrong). States: default, error (generic), locked (lockout after 5
 * failures), session ended (idle timeout / revoked), rate-limited, and — dev preview only — network blocked.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { adminLoginSchema } from '@gp/shared/schemas';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Fingerprint,
  History,
  Info,
  Lock,
  Mail,
  Timer,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { safeAdminNext } from '@/components/auth/safe-next';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { DemoBadge, DemoBar } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordInput } from '@/components/ui/password-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ApiRequestError, apiRequest } from '@/lib/api/client';
import { statePreviewEnabled } from '@/lib/home-preview';
import { cn } from '@/lib/utils';

import { useAdminSession } from './session';

const step1Schema = adminLoginSchema.pick({ email: true, password: true });
const step2Schema = adminLoginSchema.pick({ totpCode: true });
type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

type Problem =
  | { kind: 'invalid'; at: string }
  | { kind: 'locked'; until: string | null }
  | { kind: 'rate_limited' }
  | { kind: 'network'; message: string }
  | { kind: 'blocked' };

const PREVIEW_STATES = ['error', 'locked', 'blocked', 'expired', '2fa'] as const;

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'danger' | 'info' | 'warning';
  title: string;
  children: React.ReactNode;
}) {
  const Icon = tone === 'danger' ? CircleAlert : tone === 'warning' ? TriangleAlert : Info;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-md px-3.5 py-3',
        tone === 'danger' && 'bg-status-danger-tint',
        tone === 'info' && 'bg-status-info-tint',
        tone === 'warning' && 'bg-status-warning-tint',
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-[18px] shrink-0',
          tone === 'danger' && 'text-text-danger',
          tone === 'info' && 'text-text-info',
          tone === 'warning' && 'text-text-warning',
        )}
      />
      <div className="flex flex-col gap-1">
        <p className="text-label-l text-text-primary">{title}</p>
        <div className="text-body-s text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

function PolicyPanel() {
  const health = useQuery({
    queryKey: ['public', 'health'],
    queryFn: () =>
      apiRequest<{ status: 'ok' | 'degraded'; time: string; environment: string }>('/health', {
        auth: 'none',
      }),
    retry: 0,
    refetchInterval: 60_000,
  });
  const policies = [
    {
      icon: Fingerprint,
      title: '2FA on every sign-in',
      body: 'Authenticator app codes (TOTP). SMS codes are not accepted for admin accounts.',
    },
    {
      icon: Timer,
      title: '15-minute idle timeout',
      body: 'Sessions end after 15 minutes without activity. Sensitive actions ask for a fresh 2FA code.',
    },
    {
      icon: Users,
      title: 'Four-eyes on sensitive actions',
      body: 'Withdrawal releases, withdrawal holds, suspensions and role changes need a second admin.',
    },
    {
      icon: History,
      title: 'Everything is audited',
      body: 'Sign-ins, personal-data views and every action are hash-chained in an append-only audit log.',
    },
  ];
  const ok = health.data?.status === 'ok';
  return (
    <section
      aria-labelledby="admin-policy-title"
      className="hidden flex-1 flex-col justify-center gap-8 px-16 py-16 laptop:flex"
    >
      <div className="flex max-w-[640px] flex-col gap-4">
        <p className="text-overline uppercase text-text-tertiary">
          Admin console · restricted system
        </p>
        <h2 id="admin-policy-title" className="text-h1 text-text-primary">
          Staff access only.
        </h2>
        <p className="text-body-l text-text-secondary">
          The admin console manages player accounts, KYC and money movements. It cannot change draw
          results, choose winners or pay out from a pool — those actions do not exist here.
        </p>
      </div>
      <ul className="grid max-w-[752px] grid-cols-2 gap-4">
        {policies.map((p) => (
          <li
            key={p.title}
            className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-default p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-brand-tint text-icon-brand">
              <p.icon aria-hidden className="size-5" />
            </span>
            <p className="text-label-l text-text-primary">{p.title}</p>
            <p className="text-body-s text-text-secondary">{p.body}</p>
          </li>
        ))}
      </ul>
      <div
        className="flex w-fit flex-wrap items-center gap-2.5 rounded-md border border-border-subtle bg-surface-default px-4 py-3"
        role="status"
      >
        {health.isPending ? (
          <span className="text-body-s text-text-tertiary">Checking system status…</span>
        ) : ok ? (
          <>
            <CircleCheck aria-hidden className="size-[18px] text-status-success" />
            <span className="text-label-l text-text-primary">Admin console operational</span>
          </>
        ) : (
          <>
            <TriangleAlert aria-hidden className="size-[18px] text-status-warning" />
            <span className="text-label-l text-text-primary">
              {health.isError ? 'API unreachable' : 'Admin console degraded'}
            </span>
          </>
        )}
        {health.data && (
          <span className="text-caption text-text-tertiary">
            Status as of {formatDateTimeUTC(health.data.time)}
          </span>
        )}
        <DemoBadge size="xs" />
      </div>
    </section>
  );
}

export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useAdminSession();
  const preview = statePreviewEnabled ? params.get('state') : null;
  const previewState = (PREVIEW_STATES as readonly string[]).includes(preview ?? '')
    ? preview
    : null;

  const [step, setStep] = React.useState<1 | 2>(
    previewState === '2fa' || previewState === 'locked' ? 2 : 1,
  );
  const [problem, setProblem] = React.useState<Problem | null>(() =>
    previewState === 'error'
      ? { kind: 'invalid', at: new Date().toISOString() }
      : previewState === 'locked'
        ? { kind: 'locked', until: new Date(Date.now() + 15 * 60_000).toISOString() }
        : previewState === 'blocked'
          ? { kind: 'blocked' }
          : null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const previewExpired = React.useMemo(
    () =>
      previewState === 'expired'
        ? {
            email: 'k.osei@globalpool.example',
            name: 'K. Osei',
            at: new Date().toISOString(),
            reason: 'idle' as const,
            returnTo: '/admin/approvals',
          }
        : null,
    [previewState],
  );
  const expired = session.expired ?? previewExpired;
  const [useOther, setUseOther] = React.useState(false);
  const showExpired = Boolean(expired) && !useOther && step === 1;

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { totpCode: '' },
  });

  React.useEffect(() => {
    if (expired && !useOther) form1.setValue('email', expired.email);
  }, [expired, useOther, form1]);

  // Already signed in → straight to the console. `next` is untrusted (a link can open this page in a signed-in
  // tab): only same-origin /admin paths are followed, never an external or javascript: URL.
  React.useEffect(() => {
    if (session.status === 'signed_in' && !previewState)
      router.replace(safeAdminNext(params.get('next')) ?? '/admin');
  }, [session.status, router, params, previewState]);

  const onStep1 = form1.handleSubmit(() => {
    setProblem(null);
    setStep(2);
  });

  const submit = async (code: string) => {
    if (submitting) return;
    setSubmitting(true);
    const { email, password } = form1.getValues();
    try {
      await session.login({ email, password, totpCode: code });
      router.replace(safeAdminNext(params.get('next')) ?? safeAdminNext(expired?.returnTo) ?? '/admin');
    } catch (err) {
      form2.reset({ totpCode: '' });
      if (err instanceof ApiRequestError) {
        if (err.status === 403 || err.details?.locked === true) {
          setProblem({
            kind: 'locked',
            until: (err.details?.lockedUntil as string | undefined) ?? null,
          });
          setStep(2);
        } else if (err.status === 429) {
          setProblem({ kind: 'rate_limited' });
          setStep(1);
        } else if (err.status === 401 || err.status === 400) {
          setProblem({ kind: 'invalid', at: new Date().toISOString() });
          form1.resetField('password');
          setStep(1);
        } else {
          setProblem({ kind: 'network', message: err.message });
          setStep(1);
        }
      } else {
        setProblem({
          kind: 'network',
          message: 'The admin API could not be reached. Check your connection and try again.',
        });
        setStep(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onStep2 = form2.handleSubmit((v) => submit(v.totpCode));
  const email = form1.watch('email');
  const locked = problem?.kind === 'locked';

  return (
    <div className="flex min-h-dvh flex-col bg-bg-base">
      <DemoBar />
      <main id="main" className="flex flex-1">
        <section
          aria-labelledby="admin-login-title"
          className="flex w-full flex-col justify-between gap-10 border-r border-border-subtle bg-bg-secondary px-6 py-10 tablet:px-16 tablet:py-12 laptop:w-[560px] laptop:shrink-0"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Logo height={30} />
            <span className="text-label-m text-text-tertiary">Admin console</span>
            <span className="ml-auto inline-flex h-6 items-center gap-1.5 rounded-full bg-status-warning-tint px-2.5 text-overline uppercase text-text-warning">
              <span aria-hidden className="size-1.5 rounded-full bg-status-warning" />
              DEMO · testnet
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-[432px] flex-col gap-5 laptop:mx-0">
            {problem?.kind === 'blocked' ? (
              <>
                <p className="text-overline uppercase text-text-danger">Sign-in blocked</p>
                <h1 id="admin-login-title" className="text-h2 text-text-primary">
                  This network isn&apos;t approved for admin access
                </h1>
                <p className="text-body-m text-text-secondary">
                  The admin console only accepts sign-ins from approved company networks on managed
                  devices.
                </p>
                <Callout tone="danger" title="Attempt blocked and logged">
                  Your account was not signed in and nothing was accessed.
                </Callout>
                <p className="text-body-s text-text-secondary">
                  If this was you, contact IT security from a managed device and they will confirm
                  your access. If it was not you, no action is needed — IT security has already been
                  alerted.
                </p>
                <Button asChild size="l" block leadingIcon={<Mail aria-hidden />}>
                  <a href="mailto:it-security@globalpool.example">Contact IT security</a>
                </Button>
                <p className="text-caption text-text-tertiary">
                  GLOBAL POOL staff will never ask for your password or 2FA codes. (Dev preview
                  state — this build has no network allow-list.)
                </p>
              </>
            ) : step === 1 ? (
              <form
                noValidate
                onSubmit={(e) => void onStep1(e)}
                className="flex flex-col gap-5"
                aria-describedby="admin-login-sub"
              >
                {showExpired ? (
                  <>
                    <p className="text-overline uppercase text-text-warning">Session ended</p>
                    <h1 id="admin-login-title" className="text-h2 text-text-primary">
                      You were signed out
                    </h1>
                    <p id="admin-login-sub" className="text-body-m text-text-secondary">
                      Your session ended at {formatTimeUTC(expired!.at)}
                      {expired!.reason === 'idle'
                        ? ' after 15 minutes without activity'
                        : expired!.reason === 'revoked'
                          ? ' because it was revoked or expired on the server'
                          : ' because its maximum length was reached'}
                      . Sign in again to go back to{' '}
                      {expired!.returnTo === '/admin'
                        ? 'the overview'
                        : expired!.returnTo.replace('/admin/', '')}
                      .
                    </p>
                    <Callout tone="info" title="Nothing was submitted while you were away">
                      Open dialogs are never sent automatically. Pending four-eyes requests keep
                      waiting until they are decided or expire.
                    </Callout>
                  </>
                ) : (
                  <>
                    <p className="text-overline uppercase text-text-brand">Step 1 of 2 · Sign in</p>
                    <h1 id="admin-login-title" className="text-h2 text-text-primary">
                      Sign in to the admin console
                    </h1>
                    <p id="admin-login-sub" className="text-body-m text-text-secondary">
                      Use your staff account. Next you&apos;ll confirm with the 6-digit code from
                      your authenticator app.
                    </p>
                  </>
                )}
                {problem?.kind === 'invalid' && (
                  <Callout tone="danger" title="Email, password or code is incorrect">
                    For your security we don&apos;t say which part didn&apos;t match. After 5 failed
                    attempts the account locks for 15 minutes and IT security is notified. This
                    attempt was logged at {formatTimeUTC(problem.at)}.
                  </Callout>
                )}
                {problem?.kind === 'rate_limited' && (
                  <Callout tone="warning" title="Too many sign-in attempts">
                    Please wait a minute before trying again. Attempts are limited per network.
                  </Callout>
                )}
                {problem?.kind === 'network' && (
                  <Callout tone="danger" title="Sign-in is unavailable">
                    {problem.message}
                  </Callout>
                )}
                <Field label="Work email" error={form1.formState.errors.email?.message}>
                  <Input
                    size="l"
                    type="email"
                    autoComplete="username"
                    leadingIcon={<Mail />}
                    placeholder="name@globalpool.example"
                    disabled={showExpired}
                    {...form1.register('email')}
                  />
                </Field>
                <Controller
                  control={form1.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <Field label="Password" error={fieldState.error?.message}>
                      <PasswordInput
                        size="l"
                        leadingIcon={<Lock />}
                        placeholder="Enter your password"
                        {...field}
                      />
                    </Field>
                  )}
                />
                <div className="flex items-center justify-end">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="s">
                        Can&apos;t sign in?
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 text-body-s text-text-secondary">
                      Contact IT security from a managed device. Lost authenticators are re-issued
                      only after an identity check — staff will never ask for your password or 2FA
                      codes.
                    </PopoverContent>
                  </Popover>
                </div>
                <Button type="submit" size="l" block trailingIcon={<ArrowRight aria-hidden />}>
                  {showExpired ? 'Sign in again' : 'Continue'}
                </Button>
                {showExpired && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="s"
                    className="self-start"
                    onClick={() => {
                      setUseOther(true);
                      session.clearExpired();
                      form1.reset({ email: '', password: '' });
                    }}
                  >
                    Not you? Use another account
                  </Button>
                )}
              </form>
            ) : (
              <form noValidate onSubmit={(e) => void onStep2(e)} className="flex flex-col gap-5">
                <p
                  className={cn(
                    'text-overline uppercase',
                    locked ? 'text-text-danger' : 'text-text-brand',
                  )}
                >
                  Step 2 of 2 · Verify
                </p>
                <h1 id="admin-login-title" className="text-h2 text-text-primary">
                  {locked ? 'Too many incorrect attempts' : 'Confirm it’s you'}
                </h1>
                <p className="text-body-m text-text-secondary">
                  {locked
                    ? 'For your security, sign-in for this account is paused.'
                    : `Signing in as ${email || 'your staff account'}. Enter the 6-digit code from your authenticator app.`}
                </p>
                <Controller
                  control={form2.control}
                  name="totpCode"
                  render={({ field, fieldState }) => (
                    <Field
                      label="Authenticator code"
                      helper={
                        locked
                          ? 'Code entry is disabled while the account is locked.'
                          : 'Codes refresh every 30 seconds in your app.'
                      }
                      error={fieldState.error?.message}
                    >
                      <OtpInput
                        value={field.value}
                        onChange={field.onChange}
                        onComplete={(v) => void submit(v)}
                        disabled={locked || submitting}
                        focusOnMount={!locked}
                      />
                    </Field>
                  )}
                />
                {locked && problem.kind === 'locked' && (
                  <Callout
                    tone="danger"
                    title={`Sign-in locked${problem.until ? ` until ${formatTimeUTC(problem.until)}` : ''} (15 minutes)`}
                  >
                    5 failed attempts. IT security was notified automatically. Nothing in the admin
                    console was accessed.
                  </Callout>
                )}
                {locked ? (
                  <>
                    <Button asChild size="l" block leadingIcon={<Mail aria-hidden />}>
                      <a href="mailto:it-security@globalpool.example">Contact IT security</a>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="l"
                      block
                      leadingIcon={<ArrowLeft aria-hidden />}
                      onClick={() => {
                        setProblem(null);
                        setStep(1);
                      }}
                    >
                      Back to sign in
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      size="l"
                      block
                      loading={submitting}
                      disabled={form2.watch('totpCode').length !== 6}
                    >
                      Verify and sign in
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="s"
                      className="self-start"
                      leadingIcon={<ArrowLeft aria-hidden />}
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Callout tone="info" title="Session rules">
                      Admin sessions end after 15 minutes without activity. Approvals, restrictions
                      and exports ask for a fresh code even while you are signed in.
                    </Callout>
                  </>
                )}
              </form>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-caption text-text-tertiary">
              Authorised GLOBAL POOL staff only. Every sign-in attempt is logged with IP address,
              device and time.
            </p>
            <p className="font-mono text-mono-s text-text-tertiary">
              DEMO · testnet · Arbitrum Sepolia
            </p>
          </div>
        </section>
        <PolicyPanel />
      </main>
    </div>
  );
}
