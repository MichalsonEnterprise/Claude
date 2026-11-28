'use client';

import type { NotificationCategory, NotificationChannel } from '@gp/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, RotateCcw, Save } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import {
  accountApi,
  accountKeys,
  useMe,
  usePreferences,
  type PreferencesView,
} from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import { CardSkeleton, QueryState, ToneChip, utc } from './primitives';

type Matrix = Record<string, Record<NotificationChannel, boolean | null>>;

const COPY: Record<NotificationCategory, { title: string; detail: string }> = {
  security_signins: {
    title: 'New sign-ins and devices',
    detail: 'Every new device or browser, and blocked sign-in attempts.',
  },
  security_changes: {
    title: '2FA and withdrawal-address changes',
    detail: 'So nobody can change your security settings unnoticed.',
  },
  wallet_deposits: {
    title: 'Deposits credited',
    detail: 'When a deposit reaches its required confirmations.',
  },
  wallet_withdrawals: {
    title: 'Withdrawal status',
    detail: 'Under review, sent, completed or returned to Available.',
  },
  pool_results: {
    title: 'Results for my entries',
    detail: 'When a round you entered is drawn and settled.',
  },
  pool_closing_reminder: {
    title: 'Closing reminder for my rounds',
    detail: 'One reminder 1 hour before a round you entered closes.',
  },
  pool_tournaments: {
    title: 'Tournament standings',
    detail: 'Weekly results for tournaments you joined.',
  },
  offers_promotions: {
    title: 'Promotions, bonuses and news',
    detail: 'Welcome offers, missions, cashback and tournaments.',
  },
  offers_vip: { title: 'VIP and rewards updates', detail: 'Level-ups and rewards ready to claim.' },
  rg_reality_checks: {
    title: 'Reality checks',
    detail:
      'In-app reminder with time played and net result. Change the interval in Responsible gaming.',
  },
  rg_limit_changes: {
    title: 'Limit changes',
    detail:
      'Confirmations when a limit is lowered, or when a raised limit starts after its 24-hour wait.',
  },
};

const GROUPS: {
  id: PreferencesView['notifications']['categories'][number]['group'];
  title: string;
  sub?: string;
}[] = [
  {
    id: 'security',
    title: 'Security & account',
    sub: 'Always sent by email and in-app, each with your anti-phishing code.',
  },
  { id: 'wallet', title: 'Wallet' },
  {
    id: 'pool',
    title: 'Global Pool & games',
    sub: 'Only about rounds and games you already joined — never nudges to buy more entries.',
  },
  {
    id: 'offers',
    title: 'Offers & news',
    sub: 'Off unless you switch it on. Never sent while a cooling-off period or self-exclusion is active.',
  },
  { id: 'rg', title: 'Responsible gaming' },
];

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'push', label: 'Push' },
  { id: 'inApp', label: 'In-app' },
];

function toMatrix(p: PreferencesView): Matrix {
  return Object.fromEntries(p.notifications.categories.map((c) => [c.key, { ...c.channels }]));
}

/** USR-A9 Notification preferences: channel matrix per category; security + RG locked on; marketing opt-in only. */
export function NotificationPrefsPage() {
  const q = usePreferences();
  const me = useMe();
  const qc = useQueryClient();
  const [m, setM] = React.useState<Matrix | null>(null);
  const [quiet, setQuiet] = React.useState(false);
  React.useEffect(() => {
    if (q.data) {
      setM(toMatrix(q.data));
      setQuiet(q.data.notifications.quietHours.enabled);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: accountApi.updateNotificationPrefs,
    onSuccess: (data) => {
      qc.setQueryData(accountKeys.preferences(), data);
      void qc.invalidateQueries({ queryKey: accountKeys.me() });
      toast({ type: 'success', title: 'Preferences saved' });
    },
    onError: (e) => toast({ type: 'error', title: 'Not saved', description: e.message }),
  });

  const base = q.data ? toMatrix(q.data) : null;
  const dirty =
    Boolean(base && m && JSON.stringify(base) !== JSON.stringify(m)) ||
    (q.data ? quiet !== q.data.notifications.quietHours.enabled : false);
  const submit = () => {
    if (!m || !q.data) return;
    const categories = Object.fromEntries(
      q.data.notifications.categories
        .filter((c) => !c.locked)
        .map((c) => [
          c.key,
          Object.fromEntries(Object.entries(m[c.key] ?? {}).filter(([, v]) => v !== null)),
        ]),
    );
    save.mutate({ categories, quietHours: { ...q.data.notifications.quietHours, enabled: quiet } });
  };
  const reset = () => {
    if (!q.data) return;
    // recommended = the platform defaults (marketing off)
    const rec: Matrix = {};
    for (const c of q.data.notifications.categories) {
      rec[c.key] = c.locked ? { ...c.channels } : { ...c.channels };
    }
    rec.offers_promotions = { email: false, push: false, inApp: false };
    rec.offers_vip = { email: false, push: false, inApp: false };
    rec.pool_results = { email: false, push: true, inApp: true };
    rec.pool_closing_reminder = { email: false, push: false, inApp: true };
    rec.pool_tournaments = { email: false, push: false, inApp: true };
    rec.wallet_deposits = { email: true, push: true, inApp: true };
    rec.wallet_withdrawals = { email: true, push: true, inApp: true };
    setM(rec);
  };

  const saveBtn = (
    <Button
      size="m"
      leadingIcon={<Save aria-hidden />}
      disabled={!dirty}
      loading={save.isPending}
      onClick={submit}
    >
      Save preferences
    </Button>
  );

  return (
    <DashboardPage
      tab="account"
      accountTab="notification-settings"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Notification preferences' },
      ]}
      title="Notification preferences"
      description="Choose what we tell you about and where. Security messages can’t be switched off — they’re how we warn you about sign-ins and withdrawals."
      actions={saveBtn}
    >
      <QueryState query={q} label="your preferences" skeleton={<CardSkeleton rows={6} />}>
        {q.data && m && (
          <>
            {GROUPS.map((g) => {
              const cats = q.data.notifications.categories.filter((c) => c.group === g.id);
              return (
                <Card key={g.id} padding="l" className="gap-1">
                  <div className="mb-2">
                    <h2 className="text-h5">{g.title}</h2>
                    {g.sub && (
                      <p className="text-body-s text-text-secondary">
                        {g.sub.replace(
                          'your anti-phishing code',
                          `your anti-phishing code${me.data?.security.antiPhishingCode ? ` ${me.data.security.antiPhishingCode}` : ''}`,
                        )}
                      </p>
                    )}
                  </div>
                  {cats.map((c) => (
                    <div
                      key={c.key}
                      className="flex flex-col gap-3 border-t border-border-subtle py-4 laptop:flex-row laptop:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-body-m-strong">
                          {COPY[c.key].title}
                          {c.locked && (
                            <ToneChip tone="info" icon={Lock}>
                              Required
                            </ToneChip>
                          )}
                        </p>
                        <p className="text-body-s text-text-secondary">{COPY[c.key].detail}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 laptop:w-[360px]">
                        {CHANNELS.map((ch) => {
                          const v = m[c.key]?.[ch.id] ?? null;
                          const id = `pref-${c.key}-${ch.id}`;
                          if (v === null)
                            return (
                              <div key={ch.id} className="flex flex-col">
                                <span className="text-label-s text-text-tertiary">{ch.label}</span>
                                <span className="text-caption text-text-disabled">Not offered</span>
                              </div>
                            );
                          return (
                            <label
                              key={ch.id}
                              htmlFor={id}
                              className={cn(
                                'flex min-h-11 items-center gap-2 text-label-s',
                                c.locked ? 'text-text-tertiary' : 'text-text-secondary',
                              )}
                            >
                              <Switch
                                id={id}
                                checked={v}
                                disabled={c.locked}
                                onCheckedChange={(nv) =>
                                  setM((prev) =>
                                    prev
                                      ? { ...prev, [c.key]: { ...prev[c.key]!, [ch.id]: nv } }
                                      : prev,
                                  )
                                }
                                aria-label={`${COPY[c.key].title}: ${ch.label}`}
                              />
                              {ch.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Card>
              );
            })}
            <Card padding="l" className="gap-4">
              <h2 className="text-h5">Delivery</h2>
              <div className="flex min-h-11 items-start gap-3">
                <Switch
                  id="quiet-hours"
                  checked={quiet}
                  onCheckedChange={setQuiet}
                  aria-label="Quiet hours for push"
                  className="mt-0.5"
                />
                <label htmlFor="quiet-hours">
                  <span className="block text-body-s-strong">
                    Quiet hours for push · {q.data.notifications.quietHours.from} –{' '}
                    {q.data.notifications.quietHours.to}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    Security alerts are still delivered. Times in {q.data.timeZone}.
                  </span>
                </label>
              </div>
              <dl className="grid gap-3 text-body-s tablet:grid-cols-2">
                <div>
                  <dt className="text-caption text-text-tertiary">Email address</dt>
                  <dd>
                    {me.data?.emailMasked ?? '—'} {me.data?.emailVerified ? '· verified' : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-text-tertiary">Marketing</dt>
                  <dd>{q.data.marketingOptIn ? 'Opted in' : 'Off — opt-in only'}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 tablet:flex-row tablet:items-center">
                <p className="flex-1 text-caption text-text-tertiary">
                  {q.data.notifications.updatedAt
                    ? `Last saved ${utc(q.data.notifications.updatedAt)}`
                    : 'Using the recommended defaults'}
                </p>
                <Button
                  variant="secondary"
                  size="m"
                  leadingIcon={<RotateCcw aria-hidden />}
                  onClick={reset}
                >
                  Reset to recommended
                </Button>
                {saveBtn}
              </div>
            </Card>
          </>
        )}
      </QueryState>
    </DashboardPage>
  );
}
