'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MIN_AGE } from '@gp/shared/limits';
import { dateOfBirthSchema, handleSchema } from '@gp/shared/schemas';
import { countryCodeSchema } from '@gp/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  CircleCheck,
  Globe2,
  LogIn,
  MapPin,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { Field, Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { ApiRequestError, isOutcomeUnknown } from '@/lib/api/client';
import { authApi, authKeys } from '@/lib/api/auth';
import { describeError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/context';

import {
  AuthModal,
  BrandArt,
  Callout,
  NumStep,
  Overline,
  Pane,
  PaneHeader,
  ResponsibleFooter,
  SplitLayout,
  StepBar,
} from './auth-ui';
import { safeNext } from './auth-route';
import { countryName, countryOptions } from './countries';

/**
 * Onboarding form (owner decision #3): consents are never pre-checked; terms + privacy and 18+ + jurisdiction are
 * shown as the two required checkboxes of Figma AUTH-01, marketing is a separate optional box. Date of birth is
 * required here (server re-checks ≥ 18) even though the API accepts it as optional.
 */
const onboardingForm = z.object({
  handle: handleSchema,
  country: countryCodeSchema,
  dateOfBirth: z.string().min(1, { error: 'Enter your date of birth' }).pipe(dateOfBirthSchema),
  termsAndPrivacy: z
    .boolean()
    .refine((v) => v, { error: 'Accept the Terms of Service and Privacy Policy' }),
  ageAndJurisdiction: z.boolean().refine((v) => v, {
    error: `Confirm that you are ${MIN_AGE} or older and live in a permitted jurisdiction`,
  }),
  marketingOptIn: z.boolean(),
});
type OnboardingForm = z.infer<typeof onboardingForm>;

function suggestHandle(email: string | null | undefined): string {
  const local =
    (email ?? '')
      .split('@')[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9._]/g, '') ?? '';
  const trimmed = local.replace(/^[._]+|[._]+$/g, '').slice(0, 24);
  return trimmed.length >= 3 ? trimmed : '';
}

export function OnboardingScreen() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  // Set when this visit completed onboarding, so the refreshed profile doesn't swap in "already set up".
  const [completed, setCompleted] = React.useState(false);

  if (completed) {
    return (
      <OnboardingShell aside={<SetupSteps current={3} />}>
        <DoneState next={next} />
      </OnboardingShell>
    );
  }
  if (auth.status === 'loading' || (auth.status === 'member' && auth.syncing)) {
    return (
      <OnboardingShell aside={<SetupSteps current={1} />}>
        <FormSkeleton />
      </OnboardingShell>
    );
  }
  if (auth.status === 'guest') {
    return (
      <OnboardingShell aside={<SetupSteps current={0} />}>
        <PaneHeader icon={LogIn} title="Sign in to finish setting up">
          Account setup continues after you sign in with your email code, Google, Apple or a wallet.
        </PaneHeader>
        <Button
          size="l"
          block
          onClick={() =>
            auth.openAuth?.('sign-in', {
              next: `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ''}`,
            }) ?? auth.signIn()
          }
        >
          Sign in
        </Button>
      </OnboardingShell>
    );
  }
  if (auth.profile && !auth.profile.onboardingRequired) {
    return (
      <OnboardingShell aside={<SetupSteps current={3} />}>
        <DoneState next={next} already />
      </OnboardingShell>
    );
  }
  if (!auth.profile) {
    return (
      <OnboardingShell aside={<SetupSteps current={1} />}>
        <Callout tone="danger" title="We couldn’t load your account">
          Check your connection and reload the page. Nothing has been saved yet.
        </Callout>
        <Button variant="secondary" size="l" onClick={() => router.refresh()}>
          Try again
        </Button>
      </OnboardingShell>
    );
  }
  return <OnboardingFormView next={next} onDone={() => setCompleted(true)} />;
}

function OnboardingFormView({ next, onDone }: { next?: string; onDone: () => void }) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [done, setDone] = React.useState(false);
  const formId = React.useId();
  const region = useQuery({
    queryKey: authKeys.region,
    queryFn: authApi.region,
    staleTime: 5 * 60_000,
  });
  const detected = region.data?.country ?? null;

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingForm),
    defaultValues: {
      handle: suggestHandle(auth.profile?.email ?? auth.user?.email),
      country: '',
      dateOfBirth: '',
      termsAndPrivacy: false,
      ageAndJurisdiction: false,
      marketingOptIn: false,
    },
  });

  // Prefill the detected country once (the player can change it; the API checks both).
  React.useEffect(() => {
    if (detected && !form.getValues('country')) form.setValue('country', detected);
  }, [detected, form]);

  const mutation = useMutation({
    mutationFn: (v: OnboardingForm) =>
      authApi.onboarding({
        handle: v.handle,
        country: v.country,
        dateOfBirth: v.dateOfBirth,
        consents: {
          ageConfirmed: v.ageAndJurisdiction as true,
          jurisdictionConfirmed: v.ageAndJurisdiction as true,
          termsAccepted: v.termsAndPrivacy as true,
          privacyAccepted: v.termsAndPrivacy as true,
          marketingOptIn: v.marketingOptIn,
        },
      }),
    onSuccess: async (profile) => {
      qc.setQueriesData({ queryKey: authKeys.me }, profile);
      await qc.invalidateQueries({ queryKey: authKeys.all });
      setDone(true);
      onDone();
      toast({
        type: 'success',
        title: 'You’re all set',
        description: `Welcome to GLOBAL POOL, ${profile.displayHandle ?? 'player'}.`,
      });
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        if (err.code === 'CONFLICT' && err.details?.field === 'handle') {
          form.setError('handle', { message: 'This handle is already taken — try another.' });
        } else if (err.code === 'GEO_RESTRICTED') {
          form.setError('country', { message: err.message });
        } else if (err.code === 'VALIDATION_FAILED' && err.issues) {
          for (const issue of err.issues) {
            const key = String(issue.path[0] ?? '');
            if (key === 'handle' || key === 'country' || key === 'dateOfBirth')
              form.setError(key, { message: issue.message });
          }
        }
      }
    },
  });

  const country = form.watch('country');
  const geoError =
    mutation.error instanceof ApiRequestError && mutation.error.code === 'GEO_RESTRICTED';

  if (done) {
    return (
      <OnboardingShell aside={<SetupSteps current={3} />}>
        <DoneState next={next} />
      </OnboardingShell>
    );
  }

  const finishButton = (
    <Button type="submit" form={formId} size="l" block loading={mutation.isPending}>
      Finish setup
    </Button>
  );
  return (
    <OnboardingShell aside={<SetupSteps current={1} />} mobileFooter={finishButton}>
      <StepBar total={3} current={2} label="Step 3 of 3 · Set up your account" />
      <PaneHeader title="Finish setting up your account">
        A few details before you can deposit or play — it’s a legal requirement and takes about a
        minute.
      </PaneHeader>
      <form
        id={formId}
        className="flex flex-col gap-5"
        noValidate
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <Field
          label="Public handle"
          helper="Shown on leaderboards and winner lists instead of your name. 3–24 letters, digits, dots or underscores."
          error={form.formState.errors.handle?.message}
        >
          <Input
            size="l"
            autoComplete="nickname"
            leadingIcon={<AtSign />}
            placeholder="nova.k"
            {...form.register('handle')}
          />
        </Field>

        <div className="grid gap-5 tablet:grid-cols-2">
          <Field label="Country of residence" error={form.formState.errors.country?.message}>
            <Controller
              control={form.control}
              name="country"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger size="l" onBlur={field.onBlur}>
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin aria-hidden className="size-4 shrink-0 text-icon-muted" />
                      <SelectValue placeholder="Choose your country" />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {countryOptions().map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
            <Input
              size="l"
              type="date"
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
              {...form.register('dateOfBirth')}
            />
          </Field>
        </div>

        {region.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : detected && region.data ? (
          region.data.permitted ? (
            <p className="flex gap-2 text-caption text-text-secondary">
              <CircleCheck aria-hidden className="mt-px size-4 shrink-0 text-text-success" />
              <span>
                Detected from your connection: {region.data.countryName ?? countryName(detected)} —
                play is permitted there
                {country && country !== detected
                  ? `; you chose ${countryName(country)} as your residence`
                  : ''}
                . You must be {MIN_AGE} or older to register.
              </span>
            </p>
          ) : (
            <Callout
              tone="warning"
              icon={Globe2}
              title={`GLOBAL POOL isn’t available in ${region.data.countryName ?? countryName(detected)}`}
            >
              Our licence doesn’t cover your current location, so we can’t open an account here.
            </Callout>
          )
        ) : (
          <p className="flex gap-2 text-caption text-text-tertiary">
            <Globe2 aria-hidden className="mt-px size-4 shrink-0" />
            {region.isError
              ? 'We couldn’t check your location right now — choose your country of residence. '
              : ''}
            We check your location when you deposit or play. You must be {MIN_AGE} or older.
          </p>
        )}
        {geoError && (
          <Callout tone="warning" icon={TriangleAlert} title="Not available in your country">
            {mutation.error?.message}. If you’ve moved, choose your current country of residence.
          </Callout>
        )}

        <fieldset className="flex flex-col gap-2 border-t border-border-subtle pt-5">
          <legend className="sr-only">Consents</legend>
          <Controller
            control={form.control}
            name="termsAndPrivacy"
            render={({ field, fieldState }) => (
              <ConsentRow error={fieldState.error?.message}>
                <CheckboxField
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={fieldState.error ? true : undefined}
                  label={
                    <>
                      I accept the{' '}
                      <Link
                        href="/legal/terms"
                        className="text-text-brand underline underline-offset-2"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/legal/privacy"
                        className="text-text-brand underline underline-offset-2"
                      >
                        Privacy Policy
                      </Link>
                    </>
                  }
                />
              </ConsentRow>
            )}
          />
          <Controller
            control={form.control}
            name="ageAndJurisdiction"
            render={({ field, fieldState }) => (
              <ConsentRow error={fieldState.error?.message}>
                <CheckboxField
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={fieldState.error ? true : undefined}
                  label={`I am ${MIN_AGE} or older and I live in a permitted jurisdiction`}
                  description="Required. Real-money play is offered only where an applicable licence permits it."
                />
              </ConsentRow>
            )}
          />
          <Controller
            control={form.control}
            name="marketingOptIn"
            render={({ field }) => (
              <ConsentRow>
                <CheckboxField
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  label="Email me bonus offers and promotions (optional)"
                  description="Unsubscribe any time in Settings → Notifications."
                />
              </ConsentRow>
            )}
          />
        </fieldset>

        {mutation.isError &&
          !geoError &&
          !(
            mutation.error instanceof ApiRequestError &&
            ['CONFLICT', 'VALIDATION_FAILED'].includes(mutation.error.code)
          ) && (
            <Callout tone="danger" title="We couldn’t save your details">
              {/* ERR-02: readable copy per error kind; "nothing was saved" only when that is certain. */}
              {describeError(mutation.error, 'your details').description}
              {isOutcomeUnknown(mutation.error)
                ? ' We can’t tell yet whether they were saved — reload this page to check before you try again.'
                : ' Nothing was saved.'}
            </Callout>
          )}

        <div className="flex flex-col gap-3">
          <div className="max-tablet:hidden">{finishButton}</div>
          <p className="text-center text-caption text-text-tertiary">
            Nothing is pre-ticked. You can change marketing preferences at any time.
          </p>
        </div>
      </form>
    </OnboardingShell>
  );
}

function ConsentRow({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="min-h-11 [&_label]:cursor-pointer">{children}</div>
      {error && (
        <p role="alert" className="pl-8 text-caption text-text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function DoneState({ next, already = false }: { next?: string; already?: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const twoFactor = auth.profile?.security.twoFactorEnabled ?? false;
  return (
    <>
      <PaneHeader
        icon={CircleCheck}
        tone="success"
        title={already ? 'Your account is already set up' : 'You’re all set'}
      >
        {auth.profile?.displayHandle ? `Signed in as ${auth.profile.displayHandle}. ` : ''}
        Deposits and play are unlocked where permitted. Set limits any time in Responsible gaming.
      </PaneHeader>
      {!twoFactor && (
        <Callout tone="info" icon={ShieldCheck} title="Recommended: turn on two-step sign-in">
          Withdrawals, address changes and security settings need a code from an authenticator app.
        </Callout>
      )}
      <div className="flex flex-col gap-3 tablet:flex-row-reverse">
        {!twoFactor && (
          <Button asChild size="l" block leadingIcon={<ShieldCheck />}>
            <Link href={`/2fa/setup${next ? `?next=${encodeURIComponent(next)}` : ''}`}>
              Set up 2FA now
            </Link>
          </Button>
        )}
        <Button
          variant={twoFactor ? 'primary' : 'secondary'}
          size="l"
          block
          onClick={() => router.replace(next ?? '/')}
        >
          {next ? 'Continue' : 'Go to the lobby'}
        </Button>
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Loading">
      <Skeleton className="h-2 w-2/3" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-5 tablet:grid-cols-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function SetupSteps({ current }: { current: 0 | 1 | 3 }) {
  return (
    <ol className="flex flex-col gap-4">
      <NumStep n={1} state={current > 0 ? 'done' : 'now'} title="Sign in">
        Email code, Google, Apple or a wallet — no password.
      </NumStep>
      <NumStep
        n={2}
        state={current > 1 ? 'done' : current === 1 ? 'now' : 'next'}
        title="Country, age and terms"
      >
        Required before any deposit or entry.
      </NumStep>
      <NumStep n={3} state="next" title="Two-step sign-in">
        Recommended · protects withdrawals.
      </NumStep>
    </ol>
  );
}

/** Focused onboarding card: the same split anatomy as the auth dialog, without the modal (no lobby behind). */
function OnboardingShell({
  aside,
  children,
  mobileFooter,
}: {
  aside: React.ReactNode;
  children: React.ReactNode;
  mobileFooter?: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  // Required before any gaming / financial action, so the dialog can't be dismissed — signing out is the way out.
  return (
    <AuthModal
      open
      onOpenChange={() => undefined}
      dismissible={false}
      title="Finish setting up your account"
      size="split"
    >
      <SplitLayout
        panel={
          <>
            <div className="flex flex-col gap-3 px-10 pt-10">
              <Logo height={34} title="GLOBAL POOL" />
              <Overline className="mt-5">Account setup</Overline>
              <p className="text-h3 text-text-primary">One minute and you’re in</p>
              <p className="text-body-s text-text-secondary">
                We ask the same of every player: who you are on the leaderboard, where you live and
                that you’re {MIN_AGE}+.
              </p>
            </div>
            <div className="px-10 pt-6">{aside}</div>
            <BrandArt className="mt-auto" />
            <div className="border-t border-border-subtle px-10 pt-5 pb-8">
              <ResponsibleFooter />
            </div>
          </>
        }
      >
        <Pane mobileFooter={mobileFooter}>
          {children}
          {auth.status === 'member' && (
            <p className="text-center text-caption text-text-tertiary">
              Not now?{' '}
              <button
                type="button"
                className="inline-flex min-h-11 items-center text-label-s text-text-brand hover:underline"
                onClick={() => void auth.signOut().then(() => router.replace('/'))}
              >
                Sign out
              </button>{' '}
              — you can finish setup next time you sign in.
            </p>
          )}
        </Pane>
      </SplitLayout>
    </AuthModal>
  );
}
