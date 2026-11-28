'use client';

import {
  CircleCheck,
  LogIn,
  MapPin,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Dialog as DialogPrimitive, RadioGroup as RadioPrimitive } from 'radix-ui';
import * as React from 'react';

import { countryName, countryOptions } from '@/components/auth/countries';
import { Logo } from '@/components/brand/logo';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge, DemoBar } from '@/components/ui/demo-badge';
import { Field } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { GeoDecision } from '@/lib/api/compliance';
import { publicEnv } from '@/lib/env';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { regulatoryCopy } from './regulatory-copy';
import { HelpOrganisations, RegulatoryFooter } from './regulatory-state';
import { GATE_ROUTES, LEAVE_URL } from './routes';
import { useDeclaredCountry } from './use-geo';

export type AgeAnswer = 'yes' | 'no' | null;

/** Pure rule for the primary button (unit-tested): Enter only after "Yes" + the ticked jurisdiction box. */
export function ageGateAction(input: {
  age: AgeAnswer;
  jurisdictionConfirmed: boolean;
  /** Declared country permitted? null = unknown / still checking. */
  declaredPermitted: boolean | null;
}): { label: 'Enter' | 'Continue'; enabled: boolean; outcome: 'enter' | 'under_age' | null } {
  if (input.age === 'no') return { label: 'Continue', enabled: true, outcome: 'under_age' };
  const enabled =
    input.age === 'yes' && input.jurisdictionConfirmed && input.declaredPermitted === true;
  return { label: 'Enter', enabled, outcome: enabled ? 'enter' : null };
}

function AgeOption({ value, title, body }: { value: 'yes' | 'no'; title: string; body: string }) {
  const id = `gp-age-${value}`;
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border-default bg-surface-default px-4 py-3 transition-colors hover:border-border-strong has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-tint/40"
    >
      <RadioPrimitive.Item
        id={id}
        value={value}
        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-surface-default outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus data-[state=checked]:border-brand"
      >
        <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-brand" />
      </RadioPrimitive.Item>
      <span className="flex min-w-0 flex-col">
        <span className="text-body-s-strong text-text-primary">{title}</span>
        <span className="text-caption text-text-tertiary">{body}</span>
      </span>
    </label>
  );
}

function StatusLine({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: 'success' | 'warning' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-caption',
        tone === 'success' && 'text-text-success',
        tone === 'warning' && 'text-text-warning',
        tone === 'muted' && 'text-text-tertiary',
      )}
      aria-live="polite"
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      <span className="min-w-0 text-text-secondary">{children}</span>
    </p>
  );
}

export interface AgeGateFormProps {
  /** The request's geo decision (detected country), if known. */
  detected: GeoDecision | undefined;
  onEnter: (country: string | null) => void;
  onUnderAge: () => void;
  onSignIn: () => void;
  /** Where the footer buttons go: inline (page / preview) or a sticky sheet footer (rendered by the caller). */
  renderFooter: (footer: React.ReactNode) => React.ReactNode;
}

/**
 * PUB-22 content: "Are you 18 or older?" Yes / No (neither selected), country of residence (prefilled with the
 * detected country, checked by the API), the jurisdiction checkbox (never pre-checked), licence notice and legal
 * links. Enter stays disabled until "Yes" + the box are answered.
 */
export function AgeGateForm({ detected, onEnter, onUnderAge, onSignIn, renderFooter }: AgeGateFormProps) {
  const [age, setAge] = React.useState<AgeAnswer>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [country, setCountry] = React.useState<string>('');
  React.useEffect(() => {
    if (detected?.country && !country) setCountry(detected.country);
  }, [detected?.country, country]);

  // The detected country's answer comes with the geo decision; only a different choice needs a request.
  const sameAsDetected = Boolean(detected?.country) && country === detected?.country;
  const declared = useDeclaredCountry(country && !sameAsDetected ? country : null);
  const declaredPermitted: boolean | null = !country
    ? null
    : sameAsDetected
      ? (detected?.permitted ?? null)
      : (declared.data?.permitted ?? null);

  const action = ageGateAction({ age, jurisdictionConfirmed: confirmed, declaredPermitted });
  const name = country ? (declared.data?.name ?? (sameAsDetected ? detected?.countryName : null) ?? countryName(country)) : null;

  const footer = (
    <>
      <Button asChild variant="secondary" size="l" className="tablet:min-w-32">
        <a href={LEAVE_URL} rel="noopener noreferrer">
          Leave
        </a>
      </Button>
      <Button
        size="l"
        className="tablet:min-w-40"
        disabled={!action.enabled}
        onClick={() => {
          if (action.outcome === 'enter') onEnter(country || null);
          if (action.outcome === 'under_age') onUnderAge();
        }}
      >
        {action.label}
      </Button>
    </>
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        <RadioPrimitive.Root
          aria-label="Are you 18 or older?"
          value={age ?? ''}
          onValueChange={(v) => setAge(v === 'yes' || v === 'no' ? v : null)}
          className="grid gap-2 tablet:grid-cols-2"
        >
          <AgeOption value="yes" title="Yes, I’m 18 or older" body="I’m an adult where I live" />
          <AgeOption value="no" title="No, I’m under 18" body="I’m not old enough to gamble" />
        </RadioPrimitive.Root>

        {age === 'no' ? (
          <p
            role="status"
            className="flex gap-3 rounded-md border border-status-danger/60 bg-status-danger-tint px-4 py-3.5 text-body-s text-text-secondary"
          >
            <ShieldX aria-hidden className="mt-0.5 size-5 shrink-0 text-text-danger" />
            <span>
              <span className="block text-body-s-strong text-text-primary">You must be 18+</span>
              GLOBAL POOL is for adults only. Continue to see where you can find help.
            </span>
          </p>
        ) : (
          <>
            <Field label="Country of residence">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger size="l">
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
            </Field>
            {country ? (
              declaredPermitted === null ? (
                <StatusLine icon={MapPin} tone="muted">
                  Checking {name}…
                </StatusLine>
              ) : declaredPermitted ? (
                <StatusLine icon={CircleCheck} tone="success">
                  {sameAsDetected ? 'Detected from your connection: ' : ''}
                  <span className="text-text-primary">{name}</span> · permitted jurisdiction
                  {detected?.isDemo && <DemoBadge size="xs" className="ml-1.5 align-middle" />}
                </StatusLine>
              ) : (
                <StatusLine icon={TriangleAlert} tone="warning">
                  GLOBAL POOL isn’t available in <span className="text-text-primary">{name}</span>.{' '}
                  <Link href={GATE_ROUTES.restrictedCountries} className="text-text-brand hover:underline">
                    Restricted countries
                  </Link>
                </StatusLine>
              )
            ) : (
              <StatusLine icon={MapPin} tone="muted">
                Choose the country you live in.
              </StatusLine>
            )}
            <CheckboxField
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              label="I confirm online gambling is legal for me where I live, and I’m not in a restricted country."
              description="We check your location on our servers too — for every game, entry and deposit."
            />
          </>
        )}

        <section
          aria-label="Licence notice"
          className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary/60 p-4"
        >
          <p className="flex items-center gap-2 text-label-l text-text-primary">
            <ShieldCheck aria-hidden className="size-4 text-icon-brand" /> Licence notice
          </p>
          <p className="text-body-s text-text-secondary">
            GLOBAL POOL is offered only where an applicable gaming licence permits it. This is a
            DEMO / testnet build: test funds and DEMO credits only — no real money. Outcomes come
            from verifiable randomness; you can lose your stake.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-label-s">
            <Link className="text-text-brand hover:underline" href={GATE_ROUTES.terms}>
              Terms
            </Link>
            <Link className="text-text-brand hover:underline" href={GATE_ROUTES.privacy}>
              Privacy
            </Link>
            <Link className="text-text-brand hover:underline" href={GATE_ROUTES.responsibleGaming}>
              Responsible gaming
            </Link>
            <Link className="text-text-brand hover:underline" href={GATE_ROUTES.restrictedCountries}>
              Restricted countries
            </Link>
          </p>
        </section>

        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex items-center gap-2 self-start rounded-sm text-label-m text-text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
        >
          <LogIn aria-hidden className="size-4" /> Already a member? Sign in — your sign-up confirmation applies
        </button>
      </div>
      {renderFooter(footer)}
    </>
  );
}

const TITLE = 'Are you 18 or older?';
const DESCRIPTION =
  'GLOBAL POOL is for adults in permitted jurisdictions only. Please confirm before you continue.';

/**
 * PUB-22 age gate + licence notice: modal over the blurred casino (≥ 768) or bottom sheet (< 768). It can't be
 * dismissed without an answer (no close icon, Esc / outside clicks ignored); "Leave" leaves the site.
 */
export function AgeGateDialog({
  open,
  ...form
}: Omit<AgeGateFormProps, 'renderFooter'> & { open: boolean }) {
  const wide = useMediaQuery(MQ.tablet, true);
  const block = (e: Event) => e.preventDefault();
  if (!wide) {
    return (
      <Sheet open={open}>
        <SheetContent
          side="bottom"
          showClose={false}
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          onInteractOutside={block}
          data-gate="age-gate"
        >
          <SheetHeader>
            <div className="flex items-center gap-2">
              <AgeBadge />
              <SheetTitle>{TITLE}</SheetTitle>
            </div>
            <SheetDescription>{DESCRIPTION}</SheetDescription>
          </SheetHeader>
          <AgeGateForm
            {...form}
            renderFooter={(footer) => <SheetFooter className="flex-col-reverse">{footer}</SheetFooter>}
          />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim-strong backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-gate="age-gate"
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          onInteractOutside={block}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-overlay text-text-primary shadow-elevation-4 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex flex-col gap-2 px-6 pt-6">
            <div className="flex items-center gap-3">
              <Logo variant="mark" height={24} title="" />
              <AgeBadge />
            </div>
            <DialogPrimitive.Title className="text-h3 text-text-primary">{TITLE}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-body-s text-text-secondary">
              {DESCRIPTION}
            </DialogPrimitive.Description>
          </div>
          <AgeGateForm
            {...form}
            renderFooter={(footer) => (
              <div className="flex flex-col-reverse gap-3 border-t border-border-subtle px-6 py-4 tablet:flex-row tablet:justify-end">
                {footer}
              </div>
            )}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Focused frame of the gate pages (no casino navigation): DEMO bar + logo header. */
export function FocusedGateFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-base">
      {publicEnv.demoMode && <DemoBar className="sticky top-0 z-40" />}
      <header className="flex h-topbar shrink-0 items-center border-b border-border-subtle px-4 laptop:px-8">
        <Logo height={28} />
      </header>
      {children}
    </div>
  );
}

/**
 * PUB-22 failure / ERR-05 age state — the "You must be 18+" exit page (`/age-restricted`): help organisations,
 * a note for parents and carers, "Leave GLOBAL POOL". No way back into the gambling pages from here.
 */
export function AgeRestrictedPage() {
  const copy = regulatoryCopy('age');
  return (
    <FocusedGateFrame>
      <main id="main" className="flex-1 px-4 pt-8 pb-16 tablet:px-6 laptop:px-8" data-gate="age-restricted">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
          <section className="flex flex-col items-start gap-4 rounded-xl border border-border-subtle bg-surface-default p-6 tablet:p-10">
            <span className="inline-flex size-12 items-center justify-center rounded-lg bg-status-danger-tint text-text-danger [&_svg]:size-6">
              <ShieldX aria-hidden />
            </span>
            <p className="text-overline font-semibold tracking-[0.08em] text-text-danger uppercase">
              {copy.overline}
            </p>
            <h1 className="text-h3 text-text-primary tablet:text-h2">{copy.title}</h1>
            <p className="text-body-m text-text-secondary">{copy.body}</p>
            <Button asChild size="l" variant="secondary">
              <a href={LEAVE_URL} rel="noopener noreferrer">
                Leave GLOBAL POOL
              </a>
            </Button>
          </section>
          <HelpOrganisations title="Need someone to talk to?" />
          <section className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
            <h2 className="text-h5 text-text-primary">For parents and carers</h2>
            <p className="text-body-s text-text-secondary">{copy.note}</p>
          </section>
          <RegulatoryFooter />
        </div>
      </main>
    </FocusedGateFrame>
  );
}
