'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { emailSchema } from '@gp/shared/schemas';
import {
  ArrowLeft,
  CircleCheck,
  Clock,
  Info,
  Mail,
  MailCheck,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { useAuth, useAuthCore } from '@/lib/auth/context';
import { AuthFlowError, type OAuthProvider, type WalletProviderId } from '@/lib/auth/types';
import { useAuthUi } from '@/lib/auth/ui-context';
import { cn } from '@/lib/utils';

import {
  AuthModal,
  BrandPanel,
  Callout,
  Divider,
  Note,
  NumStep,
  Pane,
  PaneHeader,
  SplitLayout,
  StepBar,
} from './auth-ui';
import { maskEmail, useNow, formatUtcTime, formatCountdown } from './format';
import { WalletProviderList } from './wallet-providers';

const RESEND_COOLDOWN_MS = 60_000;
const MAX_CODE_ATTEMPTS = 5;

const emailForm = z.object({ email: emailSchema });
type EmailForm = z.infer<typeof emailForm>;

interface CodeState {
  email: string;
  sentAt: number;
  expiresAt: number;
  failures: number;
}

/**
 * The GLOBAL POOL sign-in / sign-up dialog (AUTH-01/02/03/04 adapted to Privy, owner decision #3): email → 6-digit
 * code, Google / Apple, wallet (browser wallet + WalletConnect). Split dialog over the dimmed lobby on desktop,
 * single pane at 768–1023, full-height bottom sheet with a sticky CTA bar below 768. Mounted once by the auth
 * session layer; open it with `useAuth().signIn() / signUp() / openAuth(view, { next })`.
 */
export function AuthDialog() {
  const ui = useAuthUi();
  const open = ui.dialog !== null;
  const view = ui.dialog?.view ?? 'sign-in';
  const intent = ui.dialog?.intent ?? 'sign-in';
  const [code, setCode] = React.useState<CodeState | null>(null);

  React.useEffect(() => {
    if (!open) setCode(null);
  }, [open]);

  const title =
    view === 'code'
      ? 'Check your email'
      : view === 'wallet'
        ? intent === 'sign-up'
          ? 'Sign up with a wallet'
          : 'Sign in with a wallet'
        : view === 'success'
          ? 'You’re signed in'
          : intent === 'sign-up'
            ? 'Create your account'
            : 'Sign in to GLOBAL POOL';

  return (
    <AuthModal
      open={open}
      onOpenChange={(o) => !o && ui.closeDialog('dismiss')}
      title={title}
      size="split"
    >
      <SplitLayout panel={<BrandPanel />}>
        {view === 'code' && code ? (
          <CodeView state={code} setState={setCode} intent={intent} />
        ) : view === 'wallet' ? (
          <WalletView intent={intent} />
        ) : view === 'success' ? (
          <SuccessView email={code?.email ?? null} intent={intent} />
        ) : (
          <EmailView
            intent={intent}
            onSent={(email, expiresAt) => {
              setCode({ email, sentAt: Date.now(), expiresAt: Date.parse(expiresAt), failures: 0 });
              ui.setView('code');
            }}
          />
        )}
      </SplitLayout>
    </AuthModal>
  );
}

// ── shared bits ───────────────────────────────────────────────────────────────────────────────

function IntentTabs({ intent }: { intent: 'sign-in' | 'sign-up' }) {
  const ui = useAuthUi();
  const set = (next: 'sign-in' | 'sign-up') =>
    ui.dialog && ui.openDialog({ ...ui.dialog, view: next, intent: next });
  return (
    <div role="tablist" aria-label="Sign in or sign up" className="inline-flex rounded-md bg-surface-default p-1">
      {(['sign-in', 'sign-up'] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={intent === k}
          onClick={() => set(k)}
          className={cn(
            'h-9 rounded-sm px-4 text-label-m transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none',
            intent === k ? 'bg-surface-raised text-text-primary shadow-elevation-1' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {k === 'sign-in' ? 'Sign in' : 'Sign up'}
        </button>
      ))}
    </div>
  );
}

function DevMockNote({ children }: { children: React.ReactNode }) {
  const core = useAuthCore();
  if (core.mode !== 'mock') return null;
  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed border-status-warning/60 bg-status-warning-tint px-3 py-2 text-caption text-text-secondary">
      <DemoBadge size="xs" label="Dev mock" className="mt-px" />
      <span>{children}</span>
    </p>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12S6.6 21.8 12 21.8c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12Z" />
      <path fill="#34A853" d="M3.5 7.4l3.2 2.4C7.6 7.7 9.6 6.2 12 6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 8.3 2.2 5.1 4.3 3.5 7.4Z" opacity=".001" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current">
      <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-.9-2.4-3.9ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
    </svg>
  );
}

/** Sticky CTA bar on mobile, inline block on tablet+ (Figma: sticky CTA with home indicator below 768). */
function Actions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        'max-tablet:sticky max-tablet:bottom-0 max-tablet:z-10 max-tablet:-mx-4 max-tablet:-mb-6 max-tablet:border-t max-tablet:border-border-subtle max-tablet:bg-surface-overlay max-tablet:px-4 max-tablet:pt-3 max-tablet:pb-[max(16px,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── email (sign in / sign up) ─────────────────────────────────────────────────────────────────

function EmailView({
  intent,
  onSent,
}: {
  intent: 'sign-in' | 'sign-up';
  onSent: (email: string, expiresAt: string) => void;
}) {
  const core = useAuthCore();
  const ui = useAuthUi();
  const [error, setError] = React.useState<string | null>(null);
  const [social, setSocial] = React.useState<OAuthProvider | null>(null);
  const form = useForm<EmailForm>({ resolver: zodResolver(emailForm), defaultValues: { email: '' } });

  const submit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      const { expiresAt } = await core.flow.sendEmailCode(email);
      onSent(email, expiresAt);
    } catch (err) {
      setError(err instanceof AuthFlowError ? err.message : 'We couldn’t send the code. Try again.');
    }
  });

  const oauth = async (provider: OAuthProvider) => {
    setError(null);
    setSocial(provider);
    try {
      await core.flow.loginWithOAuth(provider);
      if (core.mode === 'mock') ui.setView('success');
    } catch (err) {
      setError(err instanceof AuthFlowError ? err.message : 'Sign-in was cancelled.');
    } finally {
      setSocial(null);
    }
  };

  const signUp = intent === 'sign-up';
  return (
    <Pane top={<IntentTabs intent={intent} />} onClose={() => ui.closeDialog('dismiss')}>
      <PaneHeader title={signUp ? 'Create your account' : 'Welcome back'}>
        {signUp
          ? 'Takes about a minute. Next, you’ll verify your email.'
          : 'Sign in with a one-time code — no password to remember.'}
      </PaneHeader>

      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Email address" error={form.formState.errors.email?.message}>
          <Input
            size="l"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            leadingIcon={<Mail />}
            {...form.register('email')}
          />
        </Field>
        <Note icon={ShieldCheck} tone="brand">
          We email you a 6-digit code — players never have a password. 18+ only; you’ll confirm your age, country
          and the Terms in the next step (nothing is pre-ticked).
        </Note>
        {error && (
          <Callout tone="danger" title="That didn’t work">
            {error}
          </Callout>
        )}
        <Actions>
          <Button type="submit" size="l" block loading={form.formState.isSubmitting}>
            {signUp ? 'Create account' : 'Send me a code'}
          </Button>
        </Actions>
      </form>

      <Divider label="or" />

      <div className="grid gap-3 tablet:grid-cols-2">
        <Button
          variant="secondary"
          size="l"
          block
          leadingIcon={<GoogleMark />}
          loading={social === 'google'}
          onClick={() => void oauth('google')}
        >
          Continue with Google
        </Button>
        <Button
          variant="secondary"
          size="l"
          block
          leadingIcon={<AppleMark />}
          loading={social === 'apple'}
          onClick={() => void oauth('apple')}
        >
          Continue with Apple
        </Button>
      </div>
      <Button
        variant="secondary"
        size="l"
        block
        leadingIcon={<Wallet />}
        onClick={() => ui.setView('wallet')}
      >
        {signUp ? 'Sign up with a wallet instead' : 'Connect wallet instead'}
      </Button>

      <p className="text-center text-body-s text-text-secondary">
        {signUp ? 'Already have an account?' : 'New to GLOBAL POOL?'}{' '}
        <button
          type="button"
          className="text-label-m text-text-brand hover:underline focus-visible:underline focus-visible:outline-none"
          onClick={() =>
            ui.dialog &&
            ui.openDialog({ ...ui.dialog, view: signUp ? 'sign-in' : 'sign-up', intent: signUp ? 'sign-in' : 'sign-up' })
          }
        >
          {signUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <DevMockNote>
        Privy isn’t configured, so this offline mock signs you in. <b>nova.k@example.com</b>, Google, Apple and
        wallets open the DEMO player @nova.k; any other email creates a new player who must onboard.
      </DevMockNote>
    </Pane>
  );
}

// ── 6-digit code (AUTH-04) ────────────────────────────────────────────────────────────────────

function CodeView({
  state,
  setState,
  intent,
}: {
  state: CodeState;
  setState: React.Dispatch<React.SetStateAction<CodeState | null>>;
  intent: 'sign-in' | 'sign-up';
}) {
  const core = useAuthCore();
  const ui = useAuthUi();
  const now = useNow(1000);
  const [value, setValue] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [error, setError] = React.useState<AuthFlowError | null>(null);
  const masked = maskEmail(state.email);
  const expired = now >= state.expiresAt || error?.kind === 'expired_code';
  const exhausted = state.failures >= MAX_CODE_ATTEMPTS || error?.kind === 'too_many_attempts';
  const cooldownLeft = Math.max(0, state.sentAt + RESEND_COOLDOWN_MS - now);
  const remaining = 6 - value.length;

  const verify = async (code: string) => {
    if (code.length !== 6 || busy || expired || exhausted) return;
    setBusy(true);
    setError(null);
    try {
      await core.flow.loginWithEmailCode(code);
      ui.setView('success');
    } catch (err) {
      const e = err instanceof AuthFlowError ? err : new AuthFlowError('unknown', 'Something went wrong. Try again.');
      setError(e);
      if (e.kind === 'invalid_code') setState((s) => (s ? { ...s, failures: s.failures + 1 } : s));
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const { expiresAt } = await core.flow.sendEmailCode(state.email);
      setState({ email: state.email, sentAt: Date.now(), expiresAt: Date.parse(expiresAt), failures: 0 });
      setValue('');
    } catch (err) {
      setError(err instanceof AuthFlowError ? err : new AuthFlowError('unknown', 'We couldn’t send a new code.'));
    } finally {
      setResending(false);
    }
  };

  const attemptsLeft = MAX_CODE_ATTEMPTS - state.failures;
  return (
    <Pane
      top={
        intent === 'sign-up' ? (
          <StepBar total={3} current={1} label="Step 2 of 3 · Verify email" />
        ) : (
          <button
            type="button"
            onClick={() => ui.setView('sign-in')}
            className="inline-flex min-h-11 items-center gap-2 text-label-m text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to sign in
          </button>
        )
      }
      onClose={() => ui.closeDialog('dismiss')}
    >
      <PaneHeader icon={expired || exhausted ? Clock : Mail} tone={expired || exhausted ? 'warning' : 'brand'} title={expired ? 'This code has expired' : exhausted ? 'Too many incorrect codes' : 'Check your email'}>
        {expired ? (
          <>
            Codes work for 10 minutes. The one we sent to {masked} expired at {formatUtcTime(state.expiresAt)}.
            Send a new one — it only takes a moment.
          </>
        ) : exhausted ? (
          <>For your safety this code no longer works. Send a new code to {masked} and try again.</>
        ) : (
          <>
            We sent a 6-digit code to {masked}. Enter it below to {intent === 'sign-up' ? 'verify your address' : 'sign in'}.
          </>
        )}
      </PaneHeader>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void verify(value);
        }}
      >
        <Field
          label="Verification code"
          error={
            error?.kind === 'invalid_code' && !exhausted
              ? `${error.message} ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`
              : undefined
          }
          helper={
            !error ? `Enter the 6 digits from the email we sent to ${masked}.` : undefined
          }
          disabled={expired || exhausted}
        >
          <OtpInput
            value={value}
            onChange={setValue}
            onComplete={(v) => void verify(v)}
            focusOnMount
            disabled={expired || exhausted || busy}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden className="size-3.5" />
            {cooldownLeft > 0 ? (
              <span aria-live="polite">Resend code in {formatCountdown(cooldownLeft)}</span>
            ) : (
              <button
                type="button"
                onClick={() => void resend()}
                disabled={resending}
                className="inline-flex min-h-6 items-center text-label-s text-text-brand hover:underline disabled:opacity-60"
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </span>
          <span>
            Sent {formatUtcTime(state.sentAt)} · expires {formatUtcTime(state.expiresAt)}
          </span>
        </div>

        {expired || exhausted ? (
          <Callout tone="warning" title={expired ? 'Code expired' : 'Code locked'}>
            Nothing has changed in your account. Request a new code to continue.
          </Callout>
        ) : (
          <Note icon={Info}>Tip: paste the whole code — all six boxes fill at once.</Note>
        )}
        {error && error.kind !== 'invalid_code' && error.kind !== 'expired_code' && !exhausted && (
          <Callout tone="danger" title="That didn’t work">
            {error.message}
          </Callout>
        )}

        <Actions>
          {expired || exhausted ? (
            <Button type="button" size="l" block leadingIcon={<RefreshCw />} loading={resending} onClick={() => void resend()} disabled={cooldownLeft > 0 && !expired && !exhausted}>
              Send a new code
            </Button>
          ) : (
            <Button type="submit" size="l" block disabled={value.length !== 6} loading={busy}>
              {intent === 'sign-up' ? 'Verify email' : 'Verify and sign in'}
            </Button>
          )}
        </Actions>
        {!expired && !exhausted && remaining > 0 && (
          <Note icon={Info}>
            {remaining === 6
              ? 'The button turns on when all 6 digits are in.'
              : `${remaining} more ${remaining === 1 ? 'digit' : 'digits'} to go — the button turns on when all 6 are in.`}
          </Note>
        )}
      </form>

      <Button
        variant="ghost"
        size="l"
        leadingIcon={<Pencil />}
        className="self-center"
        onClick={() => ui.setView(intent)}
      >
        Change email address
      </Button>
      <DevMockNote>No email is sent in DEV MOCK: any 6 digits work (000000 simulates a wrong code).</DevMockNote>
    </Pane>
  );
}

// ── wallet (AUTH-02 wallet-first) ─────────────────────────────────────────────────────────────

function WalletView({ intent }: { intent: 'sign-in' | 'sign-up' }) {
  const core = useAuthCore();
  const ui = useAuthUi();
  const [pending, setPending] = React.useState<WalletProviderId | null>(null);
  const [error, setError] = React.useState<AuthFlowError | null>(null);

  const choose = async (provider: WalletProviderId) => {
    setError(null);
    setPending(provider);
    try {
      if (core.mode === 'privy' && provider !== 'browser') ui.closeDialog('done');
      await core.flow.loginWithWallet(provider);
      if (core.mode === 'mock' || provider === 'browser') ui.setView('success');
    } catch (err) {
      setError(err instanceof AuthFlowError ? err : new AuthFlowError('unknown', 'Something went wrong.'));
    } finally {
      setPending(null);
    }
  };

  return (
    <Pane
      top={
        <button
          type="button"
          onClick={() => ui.setView(intent)}
          className="inline-flex min-h-11 items-center gap-2 text-label-m text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft aria-hidden className="size-4" /> {intent === 'sign-up' ? 'Sign up with email instead' : 'Use email instead'}
        </button>
      }
      onClose={() => ui.closeDialog('dismiss')}
    >
      <PaneHeader title={intent === 'sign-up' ? 'Sign up with a wallet' : 'Sign in with a wallet'}>
        Choose your wallet. You’ll sign a short message to prove it’s yours — signing is not a transaction and
        costs no gas.
      </PaneHeader>
      {pending ? (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3.5">
          <RefreshCw aria-hidden className="size-5 animate-spin text-icon-brand" />
          <div className="flex flex-col gap-0.5">
            <p className="text-body-s-strong text-text-primary">Waiting for your wallet…</p>
            <p className="text-caption text-text-tertiary">Approve the connection, then sign the message. No funds move.</p>
          </div>
        </div>
      ) : null}
      {error && (
        <Callout tone={error.kind === 'rejected' ? 'info' : 'danger'} title={error.kind === 'rejected' ? 'You declined the request' : 'Couldn’t connect'}>
          {error.message} {error.kind === 'rejected' && 'Nothing was signed or sent.'}
        </Callout>
      )}
      <WalletProviderList onChoose={(p) => void choose(p)} disabled={pending !== null} />
      <Callout tone="success" icon={ShieldCheck} title="We never ask for your seed phrase">
        Connecting a wallet never moves funds. Entries are always paid from your platform balance.
      </Callout>
      <p className="text-caption text-text-tertiary">
        By connecting you confirm you are 18+ and located in a permitted jurisdiction. Terms and Privacy Policy
        apply.
      </p>
      <DevMockNote>Any wallet signs you in as the DEMO player @nova.k (simulated connection, no extension needed).</DevMockNote>
    </Pane>
  );
}

// ── success (AUTH-04 success → onboarding / lobby) ────────────────────────────────────────────

function SuccessView({ email, intent }: { email: string | null; intent: 'sign-in' | 'sign-up' }) {
  const auth = useAuth();
  const ui = useAuthUi();
  const router = useRouter();
  const profile = auth.profile ?? null;
  const ready = auth.status === 'member' && profile !== null;
  const needsOnboarding = profile?.onboardingRequired ?? false;
  const next = ui.dialog?.next;

  const proceed = () => {
    ui.closeDialog('done');
    if (needsOnboarding) {
      router.push(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    } else if (next) {
      router.push(next);
    } else if (ui.dialog?.returnTo) {
      router.replace(ui.dialog.returnTo);
    }
  };

  const who = profile?.displayHandle ?? profile?.emailMasked ?? (email ? maskEmail(email) : null);
  return (
    <Pane
      top={intent === 'sign-up' || needsOnboarding ? <StepBar total={3} current={2} label="Step 3 of 3 · Set up your account" /> : undefined}
      onClose={proceed}
      closeLabel="Close and continue"
    >
      <PaneHeader icon={MailCheck} tone="success" title={needsOnboarding ? 'Email verified' : who ? `Welcome back, ${who}` : 'You’re signed in'}>
        {!ready
          ? 'Setting up your session…'
          : needsOnboarding
            ? `You’re signed in${who ? ` as ${who}` : ''}. One more minute to finish your account.`
            : 'Your balance, entries and history are exactly as you left them.'}
      </PaneHeader>
      {needsOnboarding && (
        <ol className="flex flex-col gap-4">
          <NumStep n={1} state="done" title="Email verified">
            Your code matched — no password needed.
          </NumStep>
          <NumStep n={2} state="now" title="Country, age and terms">
            Required before you can deposit or play. Nothing is pre-ticked.
          </NumStep>
          <NumStep n={3} state="next" title="Turn on two-step sign-in">
            Recommended now · protects withdrawals and security changes.
          </NumStep>
          <NumStep n={4} state="next" title="Verify your identity (KYC)">
            Later — only needed for higher withdrawal limits.
          </NumStep>
        </ol>
      )}
      <Actions>
        <Button size="l" block onClick={proceed} disabled={!ready} loading={!ready} leadingIcon={ready ? <CircleCheck /> : undefined}>
          {needsOnboarding ? 'Continue to account setup' : 'Continue'}
        </Button>
      </Actions>
    </Pane>
  );
}
