'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { formatCount, formatDateUTC } from '@gp/shared/format';
import { profileUpdateSchema, type ProfileUpdate } from '@gp/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  BadgeCheck,
  Check,
  CircleCheck,
  Coffee,
  Download,
  Info,
  Lock,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ROUTES } from '@/components/shell/nav-config';
import { Avatar } from '@/components/ui/avatar';
import { VipBadge, type VipTierName } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import {
  accountApi,
  accountKeys,
  useKyc,
  useMe,
  usePreferences,
  useTwoFactor,
} from '@/lib/api/account';
import { failedQueries } from '@/lib/api/errors';
import { initialsFrom } from '@/lib/auth/types';
import { cn } from '@/lib/utils';

import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import { Demo, NoteBox, SectionCardHeader, ToneChip, utc } from './primitives';

export const TIME_ZONES: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC (UTC+00:00)' },
  { value: 'Europe/Lisbon', label: 'Lisbon (UTC+00:00)' },
  { value: 'Europe/London', label: 'London (UTC+00:00)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+01:00)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+01:00)' },
  { value: 'Europe/Warsaw', label: 'Warsaw (UTC+01:00)' },
  { value: 'Europe/Athens', label: 'Athens (UTC+02:00)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+09:00)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC−03:00)' },
];

/** "Nova Kade" → "Nova K•••" (legal details are masked even for the owner on screen). */
function maskName(first: string, last: string) {
  return `${first} ${last.charAt(0)}${'•'.repeat(Math.max(3, last.length - 1))}`;
}

/** USR-A1 Personal information: editable public profile + preferences, locked legal details, account rail. */
export function PersonalInfo() {
  const me = useMe();
  const prefs = usePreferences();
  const kyc = useKyc();
  const tfa = useTwoFactor();
  const qc = useQueryClient();

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { displayName: '', language: 'en', timeZone: 'UTC' },
  });
  const loaded = prefs.data;
  React.useEffect(() => {
    if (loaded) {
      form.reset({
        displayName: loaded.displayName ?? '',
        language: 'en',
        timeZone: loaded.timeZone,
      });
    }
  }, [loaded, form]);

  const save = useMutation({
    mutationFn: (values: ProfileUpdate) => accountApi.updateProfile(values),
    onSuccess: (data) => {
      qc.setQueryData(accountKeys.preferences(), data);
      void qc.invalidateQueries({ queryKey: accountKeys.me() });
      form.reset({ displayName: data.displayName ?? '', language: 'en', timeZone: data.timeZone });
      toast({
        type: 'success',
        title: 'Personal information saved',
        description: `Saved ${utc(data.profileUpdatedAt)}`,
      });
    },
    onError: (e) => toast({ type: 'error', title: 'Not saved', description: e.message }),
  });

  const dirty = Object.keys(form.formState.dirtyFields);
  const fieldNames: Record<string, string> = {
    displayName: 'display name',
    timeZone: 'time zone',
    language: 'language',
  };
  const personal =
    kyc.data?.application?.status === 'verified' ? kyc.data.application.personal : null;
  const verifiedAt =
    kyc.data?.application?.status === 'verified' ? kyc.data.application.reviewedAt : null;
  const demo = me.data?.isDemo ?? false;
  const level = me.data?.kyc.level ?? 'none';

  return (
    <DashboardPage
      tab="account"
      accountTab="profile"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Personal information' },
      ]}
      title="Personal information"
      description="Your public profile, contact details and preferences. Legal details are locked after identity verification."
      failure={{ ...failedQueries(me, prefs), what: 'your profile' }}
    >
      <div className="grid gap-6 laptop:grid-cols-[1fr_300px] desktop:grid-cols-[1fr_320px]">
        <form
          className="flex min-w-0 flex-col gap-6"
          onSubmit={form.handleSubmit((v) =>
            save.mutate({ displayName: v.displayName, timeZone: v.timeZone }),
          )}
          noValidate
        >
          {!me.data ? (
            <Skeleton className="h-28 rounded-lg" />
          ) : (
            <Card className="flex-row items-center gap-4">
              <Avatar
                initials={initialsFrom(me.data.displayName ?? me.data.handle ?? 'GP')}
                size="xl"
                tone="brand"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-h4">
                  <span className="truncate">{me.data.displayName ?? me.data.displayHandle}</span>
                  <Demo show={demo} />
                </p>
                <p className="text-body-s text-text-secondary">
                  {me.data.displayHandle} · User ID {me.data.publicId}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ToneChip tone={level === 'none' ? 'neutral' : 'success'} icon={BadgeCheck}>
                    {level === 'none' ? 'Not verified' : `KYC L${level.slice(-1)} · Approved`}
                  </ToneChip>
                  <VipBadge tier={me.data.vip.tier as VipTierName} />
                </div>
              </div>
            </Card>
          )}

          <Card className="gap-5" padding="l">
            <SectionCardHeader
              title="Public profile"
              description="Shown on winner lists and live feeds next to your handle. Contact details are never shown to other players."
            />
            <div className="grid gap-4 tablet:grid-cols-2">
              <Field
                label="Display name"
                helper="3–24 characters. You don’t need to use your real name."
                error={form.formState.errors.displayName?.message}
              >
                <Input size="l" autoComplete="nickname" {...form.register('displayName')} />
              </Field>
              <Field
                label="Username"
                helper="Your handle is set at sign-up and can’t be changed here."
                disabled
              >
                <Input
                  size="l"
                  value={me.data?.displayHandle ?? ''}
                  readOnly
                  disabled
                  leadingIcon={<AtSign />}
                  trailing={<Lock aria-hidden className="size-4 text-icon-muted" />}
                />
              </Field>
            </div>
          </Card>

          <Card className="gap-5" padding="l">
            <SectionCardHeader
              title="Contact details"
              description="Used for security alerts and receipts. Your email is managed by your sign-in method (Privy) — change it there; we re-verify it on your next sign-in."
            />
            <Field
              label="Email"
              helper={
                me.data?.emailVerified
                  ? 'Verified · shown masked for your privacy'
                  : 'Not verified yet'
              }
              disabled
            >
              <Input
                size="l"
                value={me.data?.emailMasked ?? '—'}
                readOnly
                disabled
                leadingIcon={<Mail />}
                trailing={
                  me.data?.emailVerified ? (
                    <CircleCheck aria-label="Verified" className="size-4 text-text-success" />
                  ) : undefined
                }
              />
            </Field>
          </Card>

          <Card className="gap-4" padding="l">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-raised">
                <Lock aria-hidden className="size-5 text-icon-muted" />
              </span>
              <SectionCardHeader
                className="flex-1"
                title="Legal details"
                description="Locked after verification. To correct them, contact support with a valid document — we re-verify before any change."
                aside={
                  level !== 'none' ? (
                    <ToneChip tone="success" icon={ShieldCheck}>
                      KYC L{level.slice(-1)} · Approved
                    </ToneChip>
                  ) : undefined
                }
              />
            </div>
            {level === 'none' ? (
              <NoteBox tone="info" title="Not verified yet">
                Your legal name, date of birth and address are added when you verify your identity.{' '}
                <Link className="text-text-brand hover:underline" href={ACCOUNT_ROUTES.kycVerify}>
                  Start verification
                </Link>
              </NoteBox>
            ) : (
              <dl className="grid gap-x-6 tablet:grid-cols-2">
                <LockedField
                  label="Legal name"
                  value={
                    personal
                      ? maskName(personal.firstNames, personal.lastNames)
                      : 'Held by our verification partner'
                  }
                />
                <LockedField
                  label="Date of birth"
                  value={
                    personal
                      ? `•• ••• ${personal.dateOfBirth.slice(0, 4)}`
                      : 'Held by our verification partner'
                  }
                />
                <LockedField
                  label="Country of residence"
                  value={
                    me.data?.country
                      ? `${me.data.country.name ?? me.data.country.code} — ${me.data.country.permitted ? 'permitted' : 'not permitted'}`
                      : '—'
                  }
                />
                <LockedField
                  label="Residential address"
                  value={
                    personal
                      ? `${personal.city}, ${personal.country} · •••••`
                      : 'Held by our verification partner'
                  }
                />
              </dl>
            )}
            <p className="flex items-center gap-2 text-caption text-text-tertiary">
              <ShieldCheck aria-hidden className="size-3.5" />
              Encrypted at rest. Values are masked here; verified{' '}
              {verifiedAt ? `on ${formatDateUTC(verifiedAt)}` : 'by our partner'}.
            </p>
          </Card>

          <Card className="gap-5" padding="l">
            <SectionCardHeader
              title="Preferences"
              description="How dates and times appear across GLOBAL POOL. Round close times are always also shown in UTC."
            />
            <div className="grid gap-4 tablet:grid-cols-2">
              <Field label="Language" helper="More languages are coming soon.">
                <Controller
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger size="l" aria-label="Language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Time zone" error={form.formState.errors.timeZone?.message}>
                <Controller
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                      <SelectTrigger size="l" aria-label="Time zone">
                        <SelectValue placeholder="Choose a time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_ZONES.map((z) => (
                          <SelectItem key={z.value} value={z.value}>
                            {z.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </Card>

          <div
            className={cn(
              'flex flex-col gap-3 rounded-lg border p-4 tablet:flex-row tablet:items-center',
              dirty.length
                ? 'sticky bottom-[calc(var(--gp-tabbar-h,0px)+12px)] z-10 border-border-brand bg-surface-raised shadow-elevation-3 tablet:bottom-4'
                : 'border-border-subtle bg-surface-default',
            )}
          >
            <Pencil aria-hidden className="hidden size-5 text-icon-brand tablet:block" />
            <div className="flex-1" aria-live="polite">
              <p className="text-body-s-strong">
                {dirty.length
                  ? `${dirty.length} unsaved change${dirty.length > 1 ? 's' : ''}`
                  : 'All changes saved'}
              </p>
              <p className="text-caption text-text-tertiary">
                {dirty.length
                  ? `${dirty.map((d) => fieldNames[d] ?? d).join(' and ')}. Legal details are not affected.`
                  : prefs.data?.profileUpdatedAt
                    ? `Last saved ${utc(prefs.data.profileUpdatedAt)}`
                    : 'Edit a field to change it.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="m"
                disabled={!dirty.length}
                onClick={() => form.reset()}
              >
                Discard
              </Button>
              <Button
                type="submit"
                size="m"
                leadingIcon={<Check aria-hidden />}
                loading={save.isPending}
                disabled={!dirty.length}
              >
                Save changes
              </Button>
            </div>
          </div>
        </form>

        <aside className="flex flex-col gap-4" aria-label="Account summary">
          <Card className="gap-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-h5">Account</h2>
              <Demo show={demo} />
            </div>
            {!me.data ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <dl className="flex flex-col text-body-s">
                {[
                  [
                    'User ID',
                    <span key="id" className="font-mono text-mono-s">
                      {me.data.publicId}
                    </span>,
                  ],
                  ['Member since', formatDateUTC(me.data.onboardedAt ?? me.data.createdAt)],
                  [
                    'Identity',
                    <span key="k" className="inline-flex items-center gap-1">
                      {level !== 'none' && (
                        <CircleCheck aria-hidden className="size-3.5 text-text-success" />
                      )}
                      {level === 'none' ? 'Not verified' : `KYC Level ${level.slice(-1)}`}
                    </span>,
                  ],
                  [
                    'VIP tier',
                    `${me.data.vip.tier.charAt(0).toUpperCase()}${me.data.vip.tier.slice(1)} · ${formatCount(me.data.vip.points)} pts`,
                  ],
                  [
                    'Country',
                    <span key="c" className="inline-flex items-center gap-1">
                      <MapPin aria-hidden className="size-3.5 text-icon-muted" />
                      {me.data.country
                        ? `${me.data.country.name} (${me.data.country.permitted ? 'permitted' : 'restricted'})`
                        : '—'}
                    </span>,
                  ],
                  [
                    'Two-factor',
                    <span
                      key="t"
                      className={cn(
                        'inline-flex items-center gap-1',
                        tfa.data?.enabled ? 'text-text-success' : 'text-text-warning',
                      )}
                    >
                      {tfa.data?.enabled ? 'On · Authenticator' : 'Off'}
                    </span>,
                  ],
                ].map(([k, v], i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-text-tertiary">{k}</dt>
                    <dd className="text-right text-text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
          <Card className="gap-3">
            <h2 className="text-h5">Your data</h2>
            <p className="text-body-s text-text-secondary">
              Get a copy of everything we hold about you (GDPR). Ready within 30 days, delivered to
              your verified email.
            </p>
            <Button
              variant="secondary"
              size="m"
              block
              leadingIcon={<Download aria-hidden />}
              asChild
            >
              <Link href={`${ROUTES.support}?topic=data-export`}>Request data export</Link>
            </Button>
            <div className="mt-2 border-t border-border-subtle pt-4">
              <h3 className="text-body-m-strong">Close account</h3>
              <p className="mt-1 text-body-s text-text-secondary">
                Withdraw your balance first — closing never blocks a withdrawal. Need a pause
                instead? Cooling-off and self-exclusion are in Responsible gaming.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" size="m" leadingIcon={<UserX aria-hidden />} asChild>
                  <Link href={`${ROUTES.support}?topic=close-account`}>Close account</Link>
                </Button>
                <Button variant="ghost" size="m" leadingIcon={<Coffee aria-hidden />} asChild>
                  <Link href={ROUTES.responsibleGaming}>Take a break</Link>
                </Button>
              </div>
            </div>
          </Card>
          <NoteBox tone="info" icon={Info}>
            Licensed operators must verify who you are (AML/KYC). We never show legal details
            publicly and never sell your data.
          </NoteBox>
        </aside>
      </div>
    </DashboardPage>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <dt className="text-label-m text-text-tertiary">{label}</dt>
      <dd className="flex h-12 items-center justify-between gap-2 rounded-md border border-border-subtle bg-bg-secondary px-3 text-body-m text-text-tertiary">
        <span className="truncate">{value}</span>
        <Lock aria-label="Locked" className="size-4 shrink-0 text-icon-muted" />
      </dd>
    </div>
  );
}
