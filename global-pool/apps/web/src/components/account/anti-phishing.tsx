'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { antiPhishingCodeSchema } from '@gp/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Lock, Mail, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useStepUp } from '@/components/auth/step-up';
import { ROUTES } from '@/components/shell/nav-config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { accountApi, accountKeys, useMe, useTwoFactor } from '@/lib/api/account';
import { failedQueries } from '@/lib/api/errors';

import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import { CheckLine, Demo, IconTile, NoteBox, ToneChip } from './primitives';

const formSchema = z.object({ antiPhishingCode: antiPhishingCodeSchema });
type FormValues = z.input<typeof formSchema>;

/** USR-A10 Anti-phishing code: current code, email preview, change (step-up 2FA: security_settings). */
export function AntiPhishingPage() {
  const me = useMe();
  const tfa = useTwoFactor();
  const { requestStepUp } = useStepUp();
  const qc = useQueryClient();
  const code = me.data?.security.antiPhishingCode ?? null;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { antiPhishingCode: '' },
  });
  const save = useMutation({
    mutationFn: ({ value, token }: { value: string; token: string }) =>
      accountApi.setAntiPhishing(value, token),
    onSuccess: (r) => {
      form.reset({ antiPhishingCode: '' });
      toast({
        type: 'success',
        title: 'Anti-phishing code saved',
        description: `Emails sent from now on show ${r.antiPhishingCode}.`,
      });
    },
    onError: (e) => toast({ type: 'error', title: 'Not saved', description: e.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });

  const submit = form.handleSubmit(async (v) => {
    const value = formSchema.parse(v).antiPhishingCode;
    const t = await requestStepUp({
      purpose: 'security_settings',
      title: 'Confirm your new anti-phishing code',
      description: `New code: ${value}. Confirm with your authenticator app.`,
      confirmLabel: 'Save new code',
    });
    if (t) save.mutate({ value, token: t.stepUpToken });
  });
  const value = form.watch('antiPhishingCode');
  const preview = value?.trim() ? value.trim().toUpperCase() : code;

  return (
    <DashboardPage
      tab="account"
      accountTab="anti-phishing"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Anti-phishing code' },
      ]}
      title="Anti-phishing code"
      description="A private word we put in every email and every 2FA prompt. If a message claims to be from GLOBAL POOL without it, it isn’t from us."
      // A failed profile load must never read as "Not set" (ERR-02): show the error with Try again instead.
      failure={{ ...failedQueries(me, tfa), what: 'your anti-phishing code' }}
    >
      <div className="grid gap-6 laptop:grid-cols-2">
        <Card padding="l" className="gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-h5">Your code</h2>
            <ToneChip
              tone={code ? 'success' : 'warning'}
              icon={code ? CircleCheck : XCircle}
              className="ml-auto"
            >
              {code ? 'Active' : 'Not set'}
            </ToneChip>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border-brand bg-surface-raised px-6 py-5">
            <ShieldCheck aria-hidden className="size-6 text-icon-brand" />
            <span className="flex-1 text-h2 text-text-brand">{code ?? '— — —'}</span>
            <Demo show={me.data?.isDemo ?? false} />
          </div>
          <p className="text-body-s text-text-secondary">
            Only you and our systems know it. Never share it — support will never ask for it.
          </p>
          <p className="text-label-l">Where you’ll see it</p>
          {[
            'The header of every email we send',
            'Every 2FA prompt, including withdrawals',
            'In-app security notifications',
          ].map((t) => (
            <CheckLine key={t} ok tone="info">
              {t}
            </CheckLine>
          ))}
        </Card>

        <Card padding="l" className="gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-h5">What a real email looks like</h2>
            <Demo className="ml-auto" />
          </div>
          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary">
            <div className="flex flex-col gap-1 border-b border-border-subtle p-4">
              <p className="text-caption text-text-secondary">
                From: GLOBAL POOL &lt;no-reply@globalpool.example&gt;
              </p>
              <p className="text-body-s-strong">Subject: Your withdrawal is under review</p>
            </div>
            <div className="flex items-center gap-2 bg-brand-tint px-4 py-2.5 text-label-m text-text-brand">
              <ShieldCheck aria-hidden className="size-4" /> Your anti-phishing code:{' '}
              {preview ?? 'not set'}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <p className="text-body-s text-text-secondary">
                Hi {me.data?.displayName?.split(' ')[0] ?? 'there'}, your withdrawal is in a routine
                AML review. You don’t need to do anything.
              </p>
              <p className="text-caption text-text-tertiary">
                We never ask for 2FA codes, backup codes or seed phrases.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="l" className="gap-4">
        <div>
          <h2 className="text-h5">{code ? 'Change your code' : 'Set your code'}</h2>
          <p className="text-body-s text-text-secondary">
            The new code appears in emails sent after you save. Changing it asks for your 2FA code.
          </p>
        </div>
        {tfa.data && !tfa.data.enabled ? (
          <NoteBox tone="warning" title="Turn on two-factor authentication first">
            Security changes are confirmed with your authenticator code.{' '}
            <Link href={ACCOUNT_ROUTES.twoFactor} className="text-text-brand hover:underline">
              Set up 2FA
            </Link>
          </NoteBox>
        ) : (
          <form
            onSubmit={submit}
            noValidate
            className="flex flex-col gap-4 tablet:flex-row tablet:items-start"
          >
            <Field
              label="New anti-phishing code"
              helper="4–20 letters, numbers or hyphens. Not your handle or anything you use elsewhere."
              error={form.formState.errors.antiPhishingCode?.message}
              className="flex-1"
            >
              <Input
                size="l"
                autoComplete="off"
                placeholder="e.g. LIGHTHOUSE-9"
                leadingIcon={<Lock />}
                {...form.register('antiPhishingCode')}
              />
            </Field>
            <Button
              type="submit"
              size="l"
              className="tablet:mt-7"
              disabled={!value?.trim()}
              loading={save.isPending}
            >
              Save new code
            </Button>
          </form>
        )}
      </Card>

      <Card padding="l" variant="raised" className="gap-3">
        <h2 className="text-h5">Spotted a message without your code?</h2>
        <div className="grid gap-4 tablet:grid-cols-3">
          {[
            [
              XCircle,
              'Don’t click or reply',
              'Links in fake emails lead to look-alike sign-in pages.',
            ],
            [Mail, 'Report it to us', 'Send it to Support — we take fake sites down.'],
            [
              Lock,
              'Signed in on a fake page?',
              'Review your devices and end other sessions straight away.',
            ],
          ].map(([Icon, t, b]) => {
            const I = Icon as typeof Mail;
            return (
              <div key={t as string} className="flex gap-3">
                <IconTile icon={I} tone="neutral" size={36} />
                <div>
                  <p className="text-body-s-strong">{t as string}</p>
                  <p className="text-caption text-text-secondary">{b as string}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="flex gap-4 text-label-m">
          <Link href={ROUTES.support} className="text-text-brand hover:underline">
            Contact support
          </Link>
          <Link href={ACCOUNT_ROUTES.devices} className="text-text-brand hover:underline">
            Review devices
          </Link>
        </p>
      </Card>
    </DashboardPage>
  );
}
