'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DEMO_USER } from '@gp/shared/demo';
import { verifyEmailSchema } from '@gp/shared/schemas';
import { ArrowLeft, Mail, Wallet } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';

import { AuthContext } from './context';
import type { AuthContextValue, AuthUser } from './types';

const STORAGE_KEY = 'gp.devMockSession';
const MOCK_DID = 'did:privy:dev-mock-nova-k';

const MOCK_USER: AuthUser = {
  id: MOCK_DID,
  handle: DEMO_USER.displayHandle,
  displayName: DEMO_USER.displayName,
  initials: 'NK',
  email: DEMO_USER.email,
  walletAddress: null,
  isDemo: true,
};

const emailStep = verifyEmailSchema.pick({ email: true });
type EmailStep = z.infer<typeof emailStep>;

function base64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * DEV MOCK auth (owner decision #3): used when NEXT_PUBLIC_PRIVY_APP_ID is unset or NEXT_PUBLIC_PRIVY_MOCK=true.
 * Mirrors the Privy flow visually (email → 6-digit code, wallet option) and signs in as the DEMO player
 * @nova.k. Session lives in localStorage on this device only. Never enabled in production builds with Privy.
 */
export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthContextValue['status']>('loading');
  const [dialog, setDialog] = React.useState<null | 'sign-in' | 'sign-up'>(null);

  React.useEffect(() => {
    let signedIn = false;
    try {
      signedIn = window.localStorage.getItem(STORAGE_KEY) === 'member';
    } catch {
      signedIn = false;
    }
    setStatus(signedIn ? 'member' : 'guest');
  }, []);

  const complete = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'member');
    } catch {
      /* storage unavailable: session lasts until reload */
    }
    setStatus('member');
    setDialog(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      mode: 'mock',
      status,
      user: status === 'member' ? MOCK_USER : null,
      signIn: () => setDialog('sign-in'),
      signUp: () => setDialog('sign-up'),
      signOut: () => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setStatus('guest');
        return Promise.resolve();
      },
      // UNSIGNED placeholder — the API's dev-token exchange (PRIVY_MOCK=true) is defined by the API package.
      getAccessToken: () =>
        Promise.resolve(
          status === 'member' ? `dev-mock.${base64url(JSON.stringify({ sub: MOCK_DID, mock: true }))}` : null,
        ),
    }),
    [status],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <MockSignInDialog
        mode={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        onComplete={complete}
      />
    </AuthContext.Provider>
  );
}

function MockSignInDialog({
  mode,
  onOpenChange,
  onComplete,
}: {
  mode: null | 'sign-in' | 'sign-up';
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const form = useForm<EmailStep>({ resolver: zodResolver(emailStep), defaultValues: { email: '' } });

  React.useEffect(() => {
    if (mode) {
      setStep('email');
      setCode('');
      form.reset({ email: '' });
    }
  }, [mode, form]);

  const onSubmit = form.handleSubmit((data) => {
    setEmail(data.email);
    setStep('code');
  });

  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent size="s">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Logo height={26} />
            <DemoBadge size="s" label="Dev mock" />
          </div>
          <DialogTitle>
            {step === 'code' ? 'Check your email' : mode === 'sign-up' ? 'Create your account' : 'Sign in'}
          </DialogTitle>
          <DialogDescription>
            {step === 'code'
              ? `We sent a 6-digit code to ${email}. DEV MOCK: any 6 digits work.`
              : 'Use your email, a social login or a wallet. No password needed. 18+ only.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {step === 'email' ? (
            <>
              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                <Field label="Email" error={form.formState.errors.email?.message}>
                  <Input
                    size="l"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    leadingIcon={<Mail />}
                    {...form.register('email')}
                  />
                </Field>
                <Button type="submit" size="l" block>
                  Continue with email
                </Button>
              </form>
              <div className="flex items-center gap-3 text-caption text-text-tertiary">
                <span className="h-px flex-1 bg-border-subtle" /> or <span className="h-px flex-1 bg-border-subtle" />
              </div>
              <Button variant="secondary" size="l" block leadingIcon={<Wallet />} onClick={onComplete}>
                Continue with a wallet
              </Button>
              <p className="text-caption text-text-tertiary">
                Privy is not configured (NEXT_PUBLIC_PRIVY_APP_ID is empty), so this offline mock signs you in as the
                DEMO player {DEMO_USER.displayHandle}. We never ask for your seed phrase.
              </p>
            </>
          ) : (
            <form
              className="flex flex-col items-center gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 6) onComplete();
              }}
            >
              <Field label="6-digit code" className="items-center">
                <OtpInput value={code} onChange={setCode} onComplete={onComplete} focusOnMount />
              </Field>
              <Button type="submit" size="l" block disabled={code.length !== 6}>
                Verify and continue
              </Button>
              <Button variant="ghost" size="s" leadingIcon={<ArrowLeft />} onClick={() => setStep('email')}>
                Use a different email
              </Button>
            </form>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
