'use client';

import {
  BellOff,
  Check,
  ChevronRight,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ROUTES } from '@/components/shell/nav-config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import {
  accountApi,
  accountKeys,
  useMe,
  useNotifications,
  usePreferences,
  type NotificationCategoryFilter,
  type NotificationView,
  type PreferencesView,
} from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { notificationVisual } from './dashboard/sections';
import { notificationAction } from './logic';
import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import { Demo, IconTile, QueryState, relative } from './primitives';

type Filter = 'all' | 'unread' | NotificationCategoryFilter;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'security', label: 'Security' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'account', label: 'Account' },
];
const PAGE = 10;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** USR-02 Notification Center: filter chips with counts, Today / Earlier groups, delivery rail, anti-phishing card. */
export function NotificationCenter() {
  const [filter, setFilter] = React.useState<Filter>('all');
  const [pages, setPages] = React.useState(1);
  const qc = useQueryClient();
  const query = useNotifications({
    page: 1,
    pageSize: PAGE * pages,
    unread: filter === 'unread' || undefined,
    category: filter !== 'all' && filter !== 'unread' ? filter : undefined,
  });
  const me = useMe();
  const data = query.data;
  const counts = data?.counts;
  const unread = data?.unread ?? 0;

  const readAll = useMutation({
    mutationFn: accountApi.readAllNotifications,
    onSuccess: (r) =>
      toast({
        type: 'success',
        title: r.updated ? `${r.updated} marked as read` : 'Everything is already read',
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
  const readOne = useMutation({
    mutationFn: accountApi.readNotification,
    onSettled: () => qc.invalidateQueries({ queryKey: ['account', 'notifications'] }),
  });

  const today = startOfToday();
  const items = data?.items ?? [];
  const groups = [
    { id: 'today', label: 'Today', items: items.filter((n) => Date.parse(n.createdAt) >= today) },
    {
      id: 'earlier',
      label: 'Earlier',
      items: items.filter((n) => Date.parse(n.createdAt) < today),
    },
  ].filter((g) => g.items.length > 0);
  const demo = me.data?.isDemo ?? false;
  const countFor = (f: Filter) =>
    f === 'all' ? counts?.all : f === 'unread' ? unread : counts?.[f];

  return (
    <DashboardPage
      tab="notifications"
      crumbs={[{ label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard }, { label: 'Notifications' }]}
      title="Notifications"
      description={
        counts ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {unread} unread · {counts.all} in total · kept for 90 days <Demo show={demo} />
          </span>
        ) : undefined
      }
      actions={
        <>
          <Button variant="ghost" size="m" leadingIcon={<Settings aria-hidden />} asChild>
            <Link href={ACCOUNT_ROUTES.notificationSettings}>Notification settings</Link>
          </Button>
          <Button
            variant="secondary"
            size="m"
            leadingIcon={<Check aria-hidden />}
            loading={readAll.isPending}
            disabled={unread === 0}
            onClick={() => readAll.mutate()}
          >
            Mark all as read
          </Button>
        </>
      }
    >
      <div className="grid gap-6 laptop:grid-cols-[1fr_368px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div
            role="group"
            aria-label="Filter notifications"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.filter((f) => f.id !== 'account' || (counts?.account ?? 0) > 0).map((f) => {
              const on = filter === f.id;
              const c = countFor(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setFilter(f.id);
                    setPages(1);
                  }}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-label-m transition-colors',
                    on
                      ? 'border-border-brand bg-brand-tint text-text-brand'
                      : 'border-border-default text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                >
                  {on && <Check aria-hidden className="size-4" />}
                  {f.label}
                  {c !== undefined && <span className="tabular-nums">· {c}</span>}
                </button>
              );
            })}
          </div>

          <QueryState
            query={query}
            label="your notifications"
            skeleton={<Skeleton className="h-96 w-full rounded-lg" />}
          >
            {items.length === 0 ? (
              <Card padding="l">
                <EmptyState
                  icon={<BellOff aria-hidden />}
                  title={filter === 'all' ? 'No notifications yet' : 'Nothing here'}
                  description={
                    filter === 'all'
                      ? 'Deposits, withdrawals, round results and security alerts will appear here. Make your first deposit to get started.'
                      : 'No notifications match this filter.'
                  }
                  actions={
                    filter === 'all' ? (
                      <Button size="m" asChild>
                        <Link href={ROUTES.deposit}>Make a deposit</Link>
                      </Button>
                    ) : (
                      <Button size="m" variant="secondary" onClick={() => setFilter('all')}>
                        Show all
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <>
                {groups.map((g) => (
                  <Card key={g.id} padding="none" className="overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <p className="text-overline uppercase text-text-tertiary">{g.label}</p>
                      <Demo show={g.items.some((n) => n.isDemo)} />
                    </div>
                    <ul className="flex flex-col gap-1 px-2 pb-2">
                      {g.items.map((n) => (
                        <NotificationItem
                          key={n.id}
                          n={n}
                          onOpen={() => !n.read && readOne.mutate(n.id)}
                        />
                      ))}
                    </ul>
                  </Card>
                ))}
                <div className="flex items-center justify-center gap-4">
                  <p className="text-caption text-text-tertiary">
                    Showing {items.length} of {data?.total ?? items.length}
                  </p>
                  {data && items.length < data.total && (
                    <Button
                      variant="secondary"
                      size="m"
                      onClick={() => setPages((p) => p + 1)}
                      loading={query.isFetching}
                    >
                      Load older notifications
                    </Button>
                  )}
                </div>
              </>
            )}
          </QueryState>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Delivery preferences">
          <DeliveryRail />
          <Card className="gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-5 text-icon-brand" />
              <h2 className="text-h5">Check every email</h2>
              <Demo show={demo} className="ml-auto" />
            </div>
            <div className="flex items-center gap-3 rounded-md bg-bg-secondary px-3 py-2.5">
              <span className="text-caption text-text-tertiary">Your code</span>
              <span className="font-mono text-mono-s text-text-primary">
                {me.data?.security.antiPhishingCode ?? 'Not set'}
              </span>
            </div>
            <p className="text-body-s text-text-secondary">
              Our emails always show this code. No code or a different one? Don’t click any links —
              forward the email to our security team.
            </p>
            {!me.data?.security.antiPhishingCode && (
              <Link
                href={ACCOUNT_ROUTES.antiPhishing}
                className="text-label-m text-text-brand hover:underline"
              >
                Set your anti-phishing code
              </Link>
            )}
          </Card>
        </aside>
      </div>
    </DashboardPage>
  );
}

function NotificationItem({ n, onOpen }: { n: NotificationView; onOpen: () => void }) {
  const v = notificationVisual(n.category);
  const action = notificationAction(n);
  return (
    <li
      className={cn(
        'flex gap-3 rounded-md p-3 tablet:p-4',
        n.read ? 'bg-transparent' : 'bg-surface-raised',
      )}
    >
      <IconTile icon={v.icon} tone={v.tone} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <p
            className={cn(
              'flex-1 text-body-m',
              n.read ? 'text-text-secondary' : 'text-body-m-strong text-text-primary',
            )}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-caption text-text-tertiary">{relative(n.createdAt)}</span>
          {!n.read ? (
            <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
          ) : (
            <span aria-hidden className="size-2 shrink-0" />
          )}
        </div>
        <p className="mt-1 text-body-s text-text-secondary">{n.body}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          {action ? (
            <Link
              href={action.href}
              onClick={onOpen}
              className="inline-flex min-h-11 items-center gap-1 text-label-m text-text-brand hover:underline tablet:min-h-0"
            >
              {action.label} <ChevronRight aria-hidden className="size-3.5" />
            </Link>
          ) : (
            <span />
          )}
          <Demo show={n.isDemo} size="xs" />
        </div>
      </div>
    </li>
  );
}

/** Quick email toggles (in-app is always on); full matrix lives in /account/notifications (A9). */
function DeliveryRail() {
  const prefs = usePreferences();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: accountApi.updateNotificationPrefs,
    onSuccess: (data) => qc.setQueryData(accountKeys.preferences(), data),
    onError: (e) => toast({ type: 'error', title: 'Not saved', description: e.message }),
  });
  const cat = (k: string) => prefs.data?.notifications.categories.find((c) => c.key === k);
  const rows: { label: string; detail: string; keys: string[]; locked?: boolean }[] = [
    {
      label: 'Security alerts',
      detail: 'Always on — sign-ins, 2FA and withdrawal-address changes',
      keys: ['security_signins', 'security_changes'],
      locked: true,
    },
    {
      label: 'Deposits & withdrawals',
      detail: 'Detected, confirmed, under review, completed',
      keys: ['wallet_deposits', 'wallet_withdrawals'],
    },
    {
      label: 'Round results & refunds',
      detail: 'Draw results and refunds for rounds you entered',
      keys: ['pool_results'],
    },
    {
      label: 'Promotions & offers',
      detail: 'Opt-in only: bonuses, tournaments, missions',
      keys: ['offers_promotions'],
    },
  ];
  const isOn = (keys: string[]) => keys.every((k) => cat(k)?.channels.email === true);
  const toggle = (keys: string[], value: boolean) => {
    const categories = Object.fromEntries(keys.map((k) => [k, { email: value }])) as NonNullable<
      Parameters<typeof accountApi.updateNotificationPrefs>[0]['categories']
    >;
    save.mutate({ categories });
  };
  return (
    <Card className="gap-4">
      <div>
        <h2 className="text-h5">What we notify you about</h2>
        <p className="text-caption text-text-tertiary">
          In-app always; email for the ones you keep on.
        </p>
      </div>
      {!prefs.data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const id = `rail-${r.keys[0]}`;
            return (
              <li key={r.label} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={id}
                    className={cn(
                      'text-body-s-strong',
                      r.locked ? 'text-text-tertiary' : 'text-text-primary',
                    )}
                  >
                    {r.label}
                  </label>
                  <p className="text-caption text-text-tertiary">{r.detail}</p>
                </div>
                <Switch
                  id={id}
                  checked={r.locked ? true : isOn(r.keys)}
                  disabled={r.locked || save.isPending}
                  onCheckedChange={(v) => toggle(r.keys, v)}
                  aria-label={`Email: ${r.label}`}
                />
              </li>
            );
          })}
        </ul>
      )}
      <Button
        variant="secondary"
        size="m"
        block
        leadingIcon={<SlidersHorizontal aria-hidden />}
        asChild
      >
        <Link href={ACCOUNT_ROUTES.notificationSettings}>Manage all preferences</Link>
      </Button>
    </Card>
  );
}

export type { PreferencesView };
