'use client';

import { backupCodeSchema } from '@gp/shared/schemas';
import type { StepUpPurpose } from '@gp/shared/enums';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  KeyRound,
  Lock,
  LogIn,
  MessageCircle,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api/client';
import { authApi, authKeys, type StepUpToken } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';

import { AuthModal, Callout, ModalHeading, Note, PaneHeader } from './auth-ui';
import { formatCountdown, formatUtcTime, useNow } from './format';
import { safeNext } from './safe-next';

export const STEP_UP_PURPOSE_LABEL: Record<StepUpPurpose, string> = {
  withdrawal: 'Withdrawal',
  whitelist_change: 'Withdrawal address change',
  security_settings: 'Security settings',
};

export interface StepUpRequest {
  purpose: StepUpPurpose;
  /** Heading override, e.g. "Confirm withdrawal WD-20931". */
  title?: string;
  /** One-line explanation under the heading. */
  description?: React.ReactNode;
  /** What is being confirmed (e.g. a <KeyValueBox> with amount / address / fees). */
  summary?: React.ReactNode;
  /** Primary button label (default "Verify and continue"). */
  confirmLabel?: string;
}

export type StepUpUiState =
  | { kind: 'entry' }
  | { kind: 'wrong'; attemptsRemaining: number | null }
  | { kind: 'locked'; lockedUntil: string };

interface StepUpContextValue {
  /**
   * Opens the step-up dialog (AUTH-08) and resolves with a single-use step-up token (5 min, bound to this session
   * and purpose) — or `null` when the player cancels. Pass the token as `apiRequest(..., { stepUpToken })`.
   */
  requestStepUp: (request: StepUpRequest) => Promise<StepUpToken | null>;
}

const StepUpContext = React.createContext<StepUpContextValue | null>(null);

/** Reusable step-up 2FA for wallet / account flows: `const { requestStepUp } = useStepUp()`. */
export function useStepUp(): StepUpContextValue {
  const ctx = React.useContext(StepUpContext);
  if (!ctx) throw new Error('useStepUp must be used inside <AuthProvider>');
  return ctx;
}

export function StepUpProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<{
    request: StepUpRequest;
    resolve: (t: StepUpToken | null) => void;
  } | null>(null);

  const requestStepUp = React.useCallback(
    (request: StepUpRequest) =>
      new Promise<StepUpToken | null>((resolve) => {
        setPending((prev) => {
          prev?.resolve(null);
          return { request, resolve };
        });
      }),
    [],
  );

  const finish = (token: StepUpToken | null) => {
    pending?.resolve(token);
    setPending(null);
  };

  const value = React.useMemo(() => ({ requestStepUp }), [requestStepUp]);
  return (
    <StepUpContext.Provider value={value}>
      {children}
      <StepUpDialog
        open={pending !== null}
        request={pending?.request ?? { purpose: 'security_settings' }}
        onVerified={(t) => finish(t)}
        onCancel={() => finish(null)}
      />
    </StepUpContext.Provider>
  );
}

/**
 * AUTH-08 step-up challenge (Modal/2FA): anti-phishing code, authenticator / backup code, wrong-code and 15-minute
 * lock states, "set up 2FA first" when not enrolled. Controlled; `useStepUp()` is the usual entry point.
 */
export function StepUpDialog({
  open,
  request,
  onVerified,
  onCancel,
  previewState,
}: {
  open: boolean;
  request: StepUpRequest;
  onVerified: (token: StepUpToken) => void;
  onCancel: () => void;
  /** QA / preview only: force a state. */
  previewState?: StepUpUiState;
}) {
  return (
    <AuthModal
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title={request.title ?? 'Confirm it’s you'}
      size="xs"
    >
      {open && (
        <StepUpBody
          request={request}
          onVerified={onVerified}
          onCancel={onCancel}
          previewState={previewState}
        />
      )}
    </AuthModal>
  );
}

/** The challenge form itself — also used full-page by /2fa/challenge. */
export function StepUpBody({
  request,
  onVerified,
  onCancel,
  previewState,
  page = false,
}: {
  request: StepUpRequest;
  onVerified: (token: StepUpToken) => void;
  onCancel: () => void;
  previewState?: StepUpUiState;
  page?: boolean;
}) {
  const auth = useAuth();
  const pathname = usePathname();
  const now = useNow(1000);
  const status = useQuery({
    queryKey: authKeys.twoFactor,
    queryFn: authApi.twoFactorStatus,
    enabled: auth.status === 'member' && !previewState,
    staleTime: 0,
  });
  const [mode, setMode] = React.useState<'totp' | 'backup'>('totp');
  const [code, setCode] = React.useState('');
  const [backup, setBackup] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<StepUpUiState>(previewState ?? { kind: 'entry' });
  const [backupError, setBackupError] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (previewState) setState(previewState);
  }, [previewState]);
  React.useEffect(() => {
    const lockedUntil = status.data?.lockedUntil;
    if (lockedUntil && !previewState) setState({ kind: 'locked', lockedUntil });
  }, [status.data?.lockedUntil, previewState]);

  const lockedUntilMs = state.kind === 'locked' ? Date.parse(state.lockedUntil) : 0;
  const locked = state.kind === 'locked' && lockedUntilMs > now;
  const antiPhishing = auth.profile?.security.antiPhishingCode ?? null;
  const notEnrolled = !previewState && status.data !== undefined && !status.data.enabled;
  const purposeLabel = STEP_UP_PURPOSE_LABEL[request.purpose];

  const submit = async (value?: string) => {
    if (busy || locked) return;
    let submitted: string;
    if (mode === 'backup') {
      const parsed = backupCodeSchema.safeParse(backup);
      if (!parsed.success) {
        setBackupError(parsed.error.issues[0]?.message ?? 'Enter a backup code like ABCD-1234');
        return;
      }
      submitted = parsed.data;
    } else {
      submitted = value ?? code;
      if (submitted.length !== 6) return;
    }
    setBusy(true);
    setBackupError(null);
    setFailure(null);
    try {
      const token = await authApi.challenge(request.purpose, submitted);
      onVerified(token);
    } catch (err) {
      setCode('');
      if (err instanceof ApiRequestError && err.code === 'STEP_UP_LOCKED') {
        const until = err.details?.lockedUntil;
        setState({
          kind: 'locked',
          lockedUntil:
            typeof until === 'string' ? until : new Date(Date.now() + 15 * 60_000).toISOString(),
        });
      } else if (err instanceof ApiRequestError && err.code === 'STEP_UP_REQUIRED') {
        const left = err.details?.attemptsRemaining;
        setState({ kind: 'wrong', attemptsRemaining: typeof left === 'number' ? left : null });
      } else {
        setFailure(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const wrong = state.kind === 'wrong';
  const attemptsNote =
    wrong && state.attemptsRemaining !== null
      ? ` ${state.attemptsRemaining} ${state.attemptsRemaining === 1 ? 'attempt' : 'attempts'} left.`
      : '';

  const headerTitle = locked
    ? 'Too many incorrect codes'
    : notEnrolled
      ? 'Set up two-step sign-in first'
      : (request.title ?? 'Confirm with 2FA');
  const headerBody = locked ? (
    <>
      Confirmation is paused until {formatUtcTime(lockedUntilMs)}. Nothing in your account has
      changed.
    </>
  ) : notEnrolled ? (
    <>
      Withdrawals, address changes and security settings need a code from an authenticator app. It
      takes about two minutes.
    </>
  ) : (
    (request.description ?? (
      <>
        Enter the current code from your authenticator app to confirm this{' '}
        {purposeLabel.toLowerCase()}.
      </>
    ))
  );
  const HeaderIcon = locked ? Lock : notEnrolled ? ShieldCheck : ShieldCheck;
  const header = (
    <div className="flex items-start gap-4">
      <span
        aria-hidden
        className={cn(
          'inline-flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:size-6',
          locked ? 'bg-status-danger-tint text-text-danger' : 'bg-brand-tint text-icon-brand',
        )}
      >
        <HeaderIcon />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-overline font-semibold tracking-[0.08em] text-text-tertiary uppercase">
          {purposeLabel}
        </p>
        <ModalHeading className="text-h4 text-text-primary">{headerTitle}</ModalHeading>
        <div className="text-body-s text-text-secondary">{headerBody}</div>
      </div>
      {!page && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-icon-muted transition-colors hover:bg-surface-hover hover:text-icon-default focus-visible:shadow-focus-ring focus-visible:outline-none"
        >
          <X aria-hidden className="size-5" />
        </button>
      )}
    </div>
  );

  const antiPhishingRow = (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-brand bg-brand-tint px-4 py-3.5">
      <p className="text-overline font-semibold tracking-[0.08em] text-text-secondary uppercase">
        Your anti-phishing code
      </p>
      {antiPhishing ? (
        <p className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-4 text-icon-brand" />
          <span className="font-mono text-mono-m text-text-brand">{antiPhishing}</span>
          {auth.profile?.isDemo && <DemoBadge size="xs" />}
        </p>
      ) : (
        <p className="text-body-s text-text-secondary">Not set yet</p>
      )}
      <p className="text-caption text-text-secondary">
        {antiPhishing
          ? 'Only GLOBAL POOL shows this code. If it’s missing or different, close this window and contact support.'
          : 'Set one in Security settings — we show it in every email and here, so fakes are easy to spot.'}
      </p>
    </div>
  );

  const body =
    status.isPending && !previewState && auth.status === 'member' ? (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-[300px]" />
        <Skeleton className="h-12 w-full" />
      </div>
    ) : notEnrolled ? (
      <>
        <Callout tone="info" title="Why we ask">
          A second lock keeps your balance safe even if someone gets into your email or wallet.
        </Callout>
        <div className="flex flex-col gap-3 tablet:flex-row-reverse">
          <Button asChild size="l" block>
            <Link href={`/2fa/setup?next=${encodeURIComponent(pathname)}`}>Set up 2FA</Link>
          </Button>
          <Button variant="ghost" size="l" block onClick={onCancel}>
            Not now
          </Button>
        </div>
      </>
    ) : (
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {request.summary}
        {locked && (
          <div
            className="flex flex-col gap-3 rounded-lg border border-status-danger bg-status-danger-tint p-4"
            role="alert"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <Lock aria-hidden className="size-5 text-text-danger" />
              <p className="flex-1 text-body-s-strong text-text-primary">Paused for 15 minutes</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 font-mono text-number-s text-text-primary">
                <Clock aria-hidden className="size-3.5 text-icon-muted" />
                Try again in {formatCountdown(lockedUntilMs - now)}
              </span>
            </div>
            <p className="text-body-s text-text-secondary">
              Locked after 5 incorrect codes · unlocks automatically at{' '}
              {formatUtcTime(lockedUntilMs)}. The countdown follows the real unlock time.
            </p>
          </div>
        )}
        {antiPhishingRow}
        {mode === 'totp' ? (
          <Field
            label="Authenticator code"
            helper={
              locked
                ? `Available again at ${formatUtcTime(lockedUntilMs)}`
                : wrong
                  ? undefined
                  : 'Codes refresh every 30 seconds'
            }
            error={wrong ? `Incorrect or expired code.${attemptsNote}` : undefined}
            disabled={locked}
          >
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(v) => void submit(v)}
              focusOnMount={!locked}
              disabled={locked || busy}
            />
          </Field>
        ) : (
          <Field
            label="Backup code"
            helper="One of the 10 codes you saved — each works once."
            error={
              backupError ?? (wrong ? `That backup code didn’t work.${attemptsNote}` : undefined)
            }
            disabled={locked}
          >
            <Input
              size="l"
              value={backup}
              onChange={(e) => setBackup(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              autoComplete="one-time-code"
              className="font-mono"
              leadingIcon={<KeyRound />}
            />
          </Field>
        )}
        {wrong && (
          <Callout tone="warning" title="Check the clock on your phone">
            Authenticator codes depend on it. Turn on automatic date and time, then enter the newest
            code. After 5 incorrect codes in a row, confirmation pauses for 15 minutes.
          </Callout>
        )}
        {failure && (
          <Callout tone="danger" title="That didn’t work">
            {failure}
          </Callout>
        )}
        {!locked && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-brand hover:underline"
              onClick={() => {
                setMode((m) => (m === 'totp' ? 'backup' : 'totp'));
                setState({ kind: 'entry' });
              }}
            >
              <KeyRound aria-hidden className="size-4" />{' '}
              {mode === 'totp' ? 'Use a backup code' : 'Use authenticator code'}
            </button>
            <span className="text-text-tertiary" aria-hidden>
              ·
            </span>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center text-label-m text-text-brand hover:underline"
            >
              Lost your device?
            </Link>
          </div>
        )}
        {locked && request.purpose === 'withdrawal' && (
          <Note icon={TriangleAlert}>
            Your withdrawal is on hold, not cancelled — nothing is sent without a valid code.
            Cancelling returns the amount to Available straight away.
          </Note>
        )}
        <div className="-mx-4 flex flex-col-reverse gap-3 border-t border-border-subtle px-4 pt-5 tablet:-mx-6 tablet:flex-row tablet:items-center tablet:justify-end tablet:px-6">
          <Button type="button" variant="secondary" size="l" onClick={onCancel}>
            Cancel
          </Button>
          {locked ? (
            <Button asChild variant="secondary" size="l" leadingIcon={<MessageCircle />}>
              <Link href="/support">Contact support</Link>
            </Button>
          ) : (
            <Button
              type="submit"
              size="l"
              loading={busy}
              disabled={mode === 'totp' ? code.length !== 6 : backup.trim().length < 8}
            >
              {request.confirmLabel ?? 'Verify and continue'}
            </Button>
          )}
        </div>
      </form>
    );

  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        !page && 'min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-6 tablet:px-6 tablet:pt-6',
      )}
    >
      {header}
      {body}
    </div>
  );
}

// ── page-level challenge (/2fa/challenge?purpose=…&next=…) ──────────────────────────────────────

const STORED_KEY = (purpose: StepUpPurpose) => `gp.stepUp.${purpose}`;

/**
 * Read (and remove) a step-up token stored by the /2fa/challenge page for `purpose`. Returns null when missing or
 * expired. Tokens are single-use and expire after 5 minutes on the server anyway.
 */
export function consumeStoredStepUp(purpose: StepUpPurpose): StepUpToken | null {
  try {
    const raw = window.sessionStorage.getItem(STORED_KEY(purpose));
    window.sessionStorage.removeItem(STORED_KEY(purpose));
    if (!raw) return null;
    const token = JSON.parse(raw) as StepUpToken;
    return Date.parse(token.expiresAt) > Date.now() ? token : null;
  } catch {
    return null;
  }
}

export function StepUpPage({ purpose, next }: { purpose: StepUpPurpose; next?: string }) {
  const auth = useAuth();
  const router = useRouter();
  const [verified, setVerified] = React.useState(false);
  // In-app navigation only; `next` is re-checked here so no caller can turn it into an external / script URL.
  const leave = () => router.replace(safeNext(next) ?? '/');
  const here = `/2fa/challenge?purpose=${purpose}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
  return (
    <AuthModal open onOpenChange={(o) => !o && leave()} title="Confirm it’s you" size="xs">
      {auth.status === 'guest' ? (
        <div className="flex flex-col gap-5 px-4 pt-3 pb-6 tablet:p-6">
          <PaneHeader icon={LogIn} title="Sign in to continue">
            Security confirmations need an active session.
          </PaneHeader>
          <Button
            size="l"
            onClick={() => auth.openAuth?.('sign-in', { next: here }) ?? auth.signIn()}
          >
            Sign in
          </Button>
        </div>
      ) : verified ? (
        <div className="flex flex-col gap-5 px-4 pt-3 pb-6 tablet:p-6">
          <PaneHeader icon={ShieldCheck} tone="success" title="Confirmed">
            Your confirmation is valid for 5 minutes and works once.
          </PaneHeader>
          <Button size="l" onClick={leave}>
            Continue
          </Button>
        </div>
      ) : (
        <StepUpBody
          request={{ purpose }}
          onCancel={leave}
          onVerified={(token) => {
            try {
              window.sessionStorage.setItem(STORED_KEY(purpose), JSON.stringify(token));
            } catch {
              /* ignore */
            }
            setVerified(true);
            if (next) leave();
          }}
        />
      )}
    </AuthModal>
  );
}
