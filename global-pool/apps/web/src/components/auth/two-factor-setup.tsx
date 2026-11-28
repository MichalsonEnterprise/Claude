'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Copy,
  Download,
  KeyRound,
  LogIn,
  Printer,
  ShieldCheck,
  Upload,
  UserCog,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { ApiRequestError } from '@/lib/api/client';
import { authApi, authKeys, type TotpEnrollment } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';

import {
  AuthModal,
  Callout,
  Note,
  NumStep,
  Pane,
  PaneHeader,
  Point,
  SecurityArt,
  SecurityPanel,
  SplitLayout,
  StepBar,
} from './auth-ui';
import { safeNext } from './auth-route';
import { formatUtcDateTime } from './format';
import { DemoQr } from './wallet-dialogs';

type Step = 'scan' | 'confirm' | 'codes';

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP" */
export function groupKey(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

function labelFromUri(uri: string): string {
  try {
    const path = decodeURIComponent(
      new URL(uri).pathname.replace(/^\/+totp\//, '').replace(/^\/+/, ''),
    );
    return path || 'GLOBAL POOL';
  } catch {
    return 'GLOBAL POOL';
  }
}

/** Illustrative phone with an authenticator app (DEMO codes) for the side panel. */
export function PhoneArt({ highlight = true }: { highlight?: boolean }) {
  const entries: [string, string, string, boolean][] = [
    ['GLOBAL POOL', 'your account', '482 915', highlight],
    ['Mail', 'nova.k@…', '105 772', false],
    ['Cloud drive', 'nova.k', '660 318', false],
  ];
  return (
    <SecurityArt>
      <div className="absolute top-7 left-[206px] h-[400px] w-[212px] -rotate-[7deg] rounded-[28px] border-2 border-border-strong bg-ink-950 p-2">
        <div className="flex h-full flex-col gap-2.5 rounded-[20px] bg-surface-default px-3 pt-2.5">
          <div className="flex items-center justify-between text-label-s text-text-primary">
            <span>16:42</span>
            <span className="h-1.5 w-10 rounded-full bg-border-strong" />
            <span className="w-6" />
          </div>
          <p className="text-label-l text-text-primary">Authenticator</p>
          {entries.map(([name, sub, code, on]) => (
            <div
              key={name}
              className={cn(
                'flex flex-col gap-0.5 rounded-md border px-3 py-2.5',
                on
                  ? 'border-border-brand bg-surface-selected'
                  : 'border-border-subtle bg-surface-raised',
              )}
            >
              <span
                className={cn(
                  'text-overline font-semibold tracking-[0.08em] uppercase',
                  on ? 'text-text-brand' : 'text-text-tertiary',
                )}
              >
                {name}
              </span>
              <span className="text-caption text-text-tertiary">{sub}</span>
              <span
                className={cn(
                  'font-mono text-number-m',
                  on ? 'text-text-brand' : 'text-text-secondary',
                )}
              >
                {code}
              </span>
            </div>
          ))}
        </div>
      </div>
      <DemoBadge size="s" className="absolute bottom-3 left-9" />
    </SecurityArt>
  );
}

function SetupPanel({ step, enabledAt }: { step: Step; enabledAt: string | null }) {
  const done = (s: Step) =>
    step === 'scan' ? false : step === 'confirm' ? s === 'scan' : s !== 'codes';
  const state = (s: Step) => (done(s) ? 'done' : step === s ? 'now' : 'next');
  return (
    <SecurityPanel
      overline="Account security"
      title={step === 'codes' ? 'Two-step sign-in is on' : 'Add a second lock to your account'}
      sub={
        step === 'scan'
          ? 'After setup, every withdrawal, every new withdrawal address and any security change will ask for a 6-digit code from your phone.'
          : step === 'confirm'
            ? 'GLOBAL POOL is now in your authenticator app. Enter the code it shows to finish linking it.'
            : 'One last thing: save your backup codes so a lost or broken phone never locks you out of your balance.'
      }
      art={<PhoneArt />}
    >
      <ol className="flex flex-col gap-4">
        <NumStep n={1} state={state('scan')} title="Scan the QR code">
          {done('scan')
            ? 'GLOBAL POOL added to your app'
            : 'Adds GLOBAL POOL to your authenticator app'}
        </NumStep>
        <NumStep n={2} state={state('confirm')} title="Enter the 6-digit code">
          {done('confirm') && enabledAt
            ? `Turned on ${formatUtcDateTime(enabledAt)}`
            : 'Proves the app and your account are in sync'}
        </NumStep>
        <NumStep n={3} state={state('codes')} title="Save 10 backup codes">
          Your way back in if you lose your phone
        </NumStep>
      </ol>
    </SecurityPanel>
  );
}

/** AUTH-07 two-pane dialog over the dimmed lobby (bottom sheet on mobile); dismissing returns to `next`. */
export function SecurityShell({
  panel,
  children,
  onDismiss,
  title = 'Set up two-step sign-in',
}: {
  panel: React.ReactNode;
  children: React.ReactNode;
  onDismiss: () => void;
  title?: string;
}) {
  return (
    <AuthModal open onOpenChange={(o) => !o && onDismiss()} title={title} size="split">
      <SplitLayout panel={panel}>
        <Pane onClose={onDismiss}>{children}</Pane>
      </SplitLayout>
    </AuthModal>
  );
}

function Actions({ left, right }: { left?: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 tablet:flex-row tablet:items-center max-tablet:sticky max-tablet:bottom-0 max-tablet:z-10 max-tablet:-mx-4 max-tablet:-mb-6 max-tablet:bg-surface-overlay max-tablet:px-4 max-tablet:pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex flex-col tablet:mr-auto">{left}</div>
      <div className="flex flex-col gap-3 tablet:flex-row">{right}</div>
    </div>
  );
}

/** AUTH-07: /2fa/setup — scan → confirm → backup codes. */
export function TwoFactorSetup() {
  const auth = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const next = safeNext(useSearchParams().get('next'));
  const member = auth.status === 'member';
  const status = useQuery({
    queryKey: authKeys.twoFactor,
    queryFn: authApi.twoFactorStatus,
    enabled: member,
  });
  const [step, setStep] = React.useState<Step>('scan');
  const [enrollment, setEnrollment] = React.useState<TotpEnrollment | null>(null);
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [enabledAt, setEnabledAt] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const started = React.useRef(false);

  const enroll = useMutation({ mutationFn: authApi.enroll2fa, onSuccess: setEnrollment });
  const confirm = useMutation({
    mutationFn: (c: string) => authApi.confirm2fa(c),
    onSuccess: (res) => {
      setCodes(res.backupCodes);
      setEnabledAt(new Date().toISOString());
      setStep('codes');
      void qc.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: () => setCode(''),
  });

  React.useEffect(() => {
    if (!status.data || started.current || status.data.enabled) return;
    started.current = true;
    enroll.mutate();
  }, [status.data, enroll]);

  const leave = () => router.replace(next ?? '/');

  if (auth.status === 'loading' || (member && status.isPending)) {
    return (
      <SecurityShell onDismiss={leave} panel={<SetupPanel step="scan" enabledAt={null} />}>
        <div className="flex flex-col gap-5" aria-busy aria-label="Loading">
          <Skeleton className="h-2 w-1/2" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-6">
            <Skeleton className="size-48" />
            <Skeleton className="h-48 flex-1" />
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      </SecurityShell>
    );
  }
  if (!member) {
    return (
      <SecurityShell onDismiss={leave} panel={<SetupPanel step="scan" enabledAt={null} />}>
        <PaneHeader icon={LogIn} title="Sign in to set up two-step sign-in">
          2FA protects withdrawals, withdrawal addresses and security settings.
        </PaneHeader>
        <Button
          size="l"
          block
          onClick={() => auth.openAuth?.('sign-in', { next: '/2fa/setup' }) ?? auth.signIn()}
        >
          Sign in
        </Button>
      </SecurityShell>
    );
  }
  if (status.isError) {
    return (
      <SecurityShell onDismiss={leave} panel={<SetupPanel step="scan" enabledAt={null} />}>
        <Callout tone="danger" title="We couldn’t load your security settings">
          {status.error instanceof Error ? status.error.message : 'Try again in a moment.'}
        </Callout>
        <Button variant="secondary" size="l" onClick={() => void status.refetch()}>
          Try again
        </Button>
      </SecurityShell>
    );
  }
  if (status.data?.enabled && step !== 'codes') {
    return (
      <SecurityShell onDismiss={leave} panel={<SetupPanel step="codes" enabledAt={null} />}>
        <PaneHeader icon={ShieldCheck} tone="success" title="Two-step sign-in is already on">
          {status.data.backupCodesRemaining} of 10 backup codes left. To change your authenticator,
          turn 2FA off in Security settings first (it asks for a code).
        </PaneHeader>
        <Actions
          right={
            <Button size="l" onClick={leave}>
              {next ? 'Continue' : 'Back to the lobby'}
            </Button>
          }
        />
      </SecurityShell>
    );
  }

  return (
    <SecurityShell onDismiss={leave} panel={<SetupPanel step={step} enabledAt={enabledAt} />}>
      {step === 'scan' && (
        <>
          <StepBar total={3} current={0} label="Step 1 of 3 · Scan" variant="overline" />
          <PaneHeader title="Scan this QR code with your authenticator app">
            In your authenticator app tap “+” or “Add account”, choose “Scan a QR code” and point
            your camera at the code.
          </PaneHeader>
          {enroll.isError ? (
            // ERR-02: readable copy per error kind + Try again (starting enrolment again is safe).
            <ErrorState
              variant="inline"
              error={enroll.error}
              onRetry={() => enroll.mutate()}
              retrying={enroll.isPending}
              what="the setup"
              title="We couldn’t start the setup"
            />
          ) : !enrollment ? (
            <div className="flex gap-6" aria-busy>
              <Skeleton className="size-48" />
              <Skeleton className="h-48 flex-1" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 tablet:flex-row tablet:items-start">
              <div className="max-tablet:hidden">
                <DemoQr value={enrollment.otpauthUrl} size={168} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <p className="text-label-m text-text-primary">
                  <span className="tablet:hidden">On this phone? Add it with the setup key</span>
                  <span className="max-tablet:hidden">Can’t scan it?</span>
                </p>
                <p className="text-body-s text-text-secondary">
                  Choose “Enter a setup key” in your app and type:
                </p>
                <div className="flex items-center gap-2 rounded-md border border-border-default bg-surface-raised py-2.5 pr-2 pl-3.5">
                  <code className="flex flex-1 flex-wrap gap-x-2 font-mono text-mono-m text-text-primary">
                    {groupKey(enrollment.secret)
                      .split(' ')
                      .map((g, i) => (
                        <span key={i} className="whitespace-nowrap">
                          {g}{' '}
                        </span>
                      ))}
                  </code>
                  <Button
                    variant="ghost"
                    size="s"
                    aria-label="Copy setup key"
                    leadingIcon={<Copy />}
                    onClick={() =>
                      void navigator.clipboard
                        ?.writeText(enrollment.secret)
                        .then(() => toast({ type: 'success', title: 'Setup key copied' }))
                    }
                  />
                </div>
                <dl className="flex flex-col gap-2">
                  <div>
                    <dt className="text-caption text-text-tertiary">Account name</dt>
                    <dd className="text-body-s-strong text-text-primary">
                      {labelFromUri(enrollment.otpauthUrl)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-tertiary">Type</dt>
                    <dd className="text-body-s-strong text-text-primary">
                      Time-based (TOTP) · 6 digits · every 30 s
                    </dd>
                  </div>
                </dl>
                <Button asChild variant="secondary" size="l" className="tablet:hidden">
                  <a href={enrollment.otpauthUrl}>Open authenticator app</a>
                </Button>
              </div>
            </div>
          )}
          <Note icon={KeyRound}>
            Your setup key is unique to your account and is never shown again after setup.
          </Note>
          <Callout tone="info" title="Any TOTP authenticator app works">
            For example Google Authenticator, Microsoft Authenticator, 1Password or Bitwarden. We
            don’t offer SMS codes — they can be stolen with a SIM swap.
          </Callout>
          <Actions
            left={
              <Button variant="ghost" size="l" onClick={leave}>
                Not now
              </Button>
            }
            right={
              <Button
                size="l"
                trailingIcon={<ArrowRight />}
                disabled={!enrollment}
                onClick={() => setStep('confirm')}
              >
                Next: enter code
              </Button>
            }
          />
        </>
      )}

      {step === 'confirm' && (
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) confirm.mutate(code);
          }}
        >
          <StepBar total={3} current={1} label="Step 2 of 3 · Confirm" variant="overline" />
          <PaneHeader title="Enter the 6-digit code from your app">
            Look for “GLOBAL POOL” in your authenticator app. The code changes every 30 seconds.
          </PaneHeader>
          <Field
            label="Authenticator code"
            helper={confirm.isError ? undefined : 'Type or paste the current 6-digit code'}
            error={
              confirm.isError
                ? confirm.error instanceof ApiRequestError &&
                  confirm.error.code === 'STEP_UP_LOCKED'
                  ? 'Too many incorrect codes — setup is paused for 15 minutes.'
                  : 'That code didn’t work. Use the newest code from your app.'
                : undefined
            }
          >
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(v) => confirm.mutate(v)}
              focusOnMount
              disabled={confirm.isPending}
            />
          </Field>
          <Note icon={Clock}>
            Code rejected? Codes depend on your phone’s clock — turn on automatic date and time,
            then use the newest code.
          </Note>
          <section className="flex flex-col gap-3.5 rounded-lg border border-border-subtle bg-surface-default p-5">
            <p className="text-label-m text-text-primary">
              Once it’s on, we’ll ask for a code when you:
            </p>
            <Point icon={Upload} title="Withdraw or add a withdrawal address">
              Every withdrawal, every time — new addresses also get a 24-hour cooldown.
            </Point>
            <Point icon={UserCog} title="Change security settings">
              Turning 2FA off also needs a code and is logged in your security history.
            </Point>
          </section>
          <Actions
            left={
              <Button
                type="button"
                variant="ghost"
                size="l"
                leadingIcon={<ArrowLeft />}
                onClick={() => setStep('scan')}
              >
                Back
              </Button>
            }
            right={
              <Button
                type="submit"
                size="l"
                leadingIcon={<ShieldCheck />}
                loading={confirm.isPending}
                disabled={code.length !== 6}
              >
                Verify and turn on
              </Button>
            }
          />
        </form>
      )}

      {step === 'codes' && codes && (
        <>
          <StepBar total={3} current={2} label="Step 3 of 3 · Backup codes" variant="overline" />
          <PaneHeader title="Save your 10 backup codes">
            Each code signs you in once if you can’t use your phone. This is the only time we show
            them.
          </PaneHeader>
          <Callout tone="success" title="Two-step sign-in is on">
            Turned on {enabledAt ? formatUtcDateTime(enabledAt) : 'just now'}
            {auth.profile?.emailMasked ? ` for ${auth.profile.emailMasked}` : ''}.
          </Callout>
          <BackupCodes codes={codes} generatedAt={enabledAt} />
          <Callout tone="warning" title="Keep them offline and private">
            Store them in a password manager or on paper — not in email or screenshots. We will
            never ask you for them.
          </Callout>
          <CheckboxField
            checked={saved}
            onCheckedChange={(v) => setSaved(v === true)}
            label="I’ve saved my backup codes somewhere safe"
          />
          <Actions
            left={
              !saved ? (
                <span className="text-caption text-text-tertiary">
                  Finish becomes available once you tick the box.
                </span>
              ) : undefined
            }
            right={
              <Button
                size="l"
                disabled={!saved}
                onClick={() => {
                  toast({
                    type: 'success',
                    title: 'Two-step sign-in is on',
                    description: 'Withdrawals and security changes now ask for a code.',
                  });
                  leave();
                }}
              >
                Finish setup
              </Button>
            }
          />
        </>
      )}
    </SecurityShell>
  );
}

export function BackupCodes({
  codes,
  generatedAt,
}: {
  codes: string[];
  generatedAt: string | null;
}) {
  const text = `GLOBAL POOL backup codes (each works once)\n${codes.map((c, i) => `${String(i + 1).padStart(2, '0')}  ${c}`).join('\n')}\n`;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-default bg-bg-secondary p-5">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound aria-hidden className="size-4 text-icon-brand" />
        <span className="text-label-m text-text-primary">Backup codes</span>
        {generatedAt && (
          <span className="text-caption text-text-tertiary">
            · generated {formatUtcDateTime(generatedAt)}
          </span>
        )}
      </div>
      <ol className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2" aria-label="Backup codes">
        {codes.map((c, i) => (
          <li
            key={c}
            className="flex items-center gap-3 rounded-sm border border-border-subtle bg-surface-default px-3 py-2"
          >
            <span className="font-mono text-mono-s text-text-tertiary">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-mono-m text-text-primary">{c}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="s"
          leadingIcon={<Download />}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'globalpool-backup-codes.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download .txt
        </Button>
        <Button
          variant="secondary"
          size="s"
          leadingIcon={<Copy />}
          onClick={() =>
            void navigator.clipboard
              ?.writeText(text)
              .then(() => toast({ type: 'success', title: 'Backup codes copied' }))
          }
        >
          Copy all
        </Button>
        <Button variant="ghost" size="s" leadingIcon={<Printer />} onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </section>
  );
}
