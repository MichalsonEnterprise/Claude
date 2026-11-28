'use client';

import {
  Check,
  CircleCheck,
  Download,
  Info,
  LogOut,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLoginHistory,
  useSecurity,
  type LoginFilter,
  type LoginHistoryView,
} from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { deviceIcon } from './devices-sessions';
import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import { CheckLine, Demo, IconTile, QueryState, ToneChip, utc } from './primitives';
import { useDeviceReview } from './security-overview';

const FILTERS: { id: LoginFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Recognised' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'ended', label: 'Signed out' },
];
const PAGE_SIZE = 10;

function csv(rows: LoginHistoryView['items']): string {
  const head = 'signed_in_utc,device,browser,method,location,ip_masked,result,active';
  const esc = (v: string | null | boolean) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    head,
    ...rows.map((r) =>
      [r.signedInAt, r.device, r.browser, r.method, r.location, r.ipMasked, r.result, r.active]
        .map(esc)
        .join(','),
    ),
  ].join('\n');
}

/** USR-A6 Login history: every sign-in (one per session), flagged entries with "Was this you?". */
export function LoginHistoryPage() {
  const [filter, setFilter] = React.useState<LoginFilter>('all');
  const [days, setDays] = React.useState(30);
  const [page, setPage] = React.useState(1);
  const q = useLoginHistory({ filter, days, page, pageSize: PAGE_SIZE });
  const { confirm, secure } = useDeviceReview();
  const data = q.data;
  const security = useSecurity();
  const review = security.data?.devicesToReview[0];
  const flagged = review
    ? {
        id: review.sessionId,
        device: review.device,
        browser: null as string | null,
        location: review.location,
        isDemo: review.isDemo,
        signedInAt: review.signedInAt,
      }
    : null;

  const exportCsv = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([csv(data.items)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-history-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardPage
      tab="account"
      accountTab="login-history"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Login history' },
      ]}
      title="Login history"
      description="Every sign-in to your account in the last 12 months. Flagged entries are unusual for you — check them and tell us if one wasn’t you."
      actions={
        <Button
          variant="secondary"
          size="m"
          leadingIcon={<Download aria-hidden />}
          disabled={!data?.items.length}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      }
    >
      {flagged && (
        <section
          aria-label="Flagged sign-in"
          className="flex flex-col gap-3 rounded-lg border border-status-warning/50 bg-status-warning-tint p-5 tablet:flex-row"
        >
          <IconTile icon={ShieldAlert} tone="warning" size={48} />
          <div className="flex flex-1 flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2 text-body-m-strong">
              Was this you? {flagged.device}
              {flagged.browser ? ` · ${flagged.browser}` : ''}
              {flagged.location ? ` in ${flagged.location}` : ''}
              <Demo show={flagged.isDemo} />
            </p>
            <p className="text-body-s text-text-secondary">
              {utc(flagged.signedInAt)} · first sign-in from this device. The session is still
              active.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="m"
                leadingIcon={<Check aria-hidden />}
                loading={confirm.isPending}
                onClick={() => confirm.mutate(flagged.id)}
              >
                Yes, it was me
              </Button>
              <Button
                variant="danger"
                size="m"
                leadingIcon={<LogOut aria-hidden />}
                loading={secure.isPending}
                onClick={() => secure.mutate(flagged.id)}
              >
                No — secure my account
              </Button>
            </div>
            <p className="text-caption text-text-tertiary">
              Securing your account ends every other session, including this device. Your funds and
              pending withdrawals stay where they are.
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
        <div
          role="group"
          aria-label="Filter sign-ins"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFilter(f.id);
                  setPage(1);
                }}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-label-m',
                  on
                    ? 'border-border-brand bg-brand-tint text-text-brand'
                    : 'border-border-default text-text-secondary hover:bg-surface-hover',
                )}
              >
                {on && <Check aria-hidden className="size-4" />}
                {f.label}
                {data && <span className="tabular-nums">· {data.counts[f.id]}</span>}
              </button>
            );
          })}
        </div>
        <Select
          value={String(days)}
          onValueChange={(v) => {
            setDays(Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger size="m" className="w-[180px] tablet:ml-auto" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <QueryState
        query={q}
        label="your login history"
        skeleton={<Skeleton className="h-96 w-full rounded-lg" />}
      >
        {data && data.items.length === 0 ? (
          <Card padding="l">
            <EmptyState
              title="No sign-ins in this period"
              description="Try a longer period or another filter."
            />
          </Card>
        ) : (
          data && (
            <Card padding="none" className="overflow-hidden">
              <table className="hidden w-full text-left text-body-s tablet:table">
                <caption className="sr-only">Sign-ins, newest first</caption>
                <thead className="bg-surface-raised text-overline uppercase text-text-tertiary">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Date &amp; time
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Device &amp; method
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Location
                    </th>
                    <th scope="col" className="px-4 py-3">
                      IP address
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        'border-t border-border-subtle',
                        r.result === 'flagged' &&
                          'bg-status-warning-tint/50 shadow-[inset_3px_0_0_var(--color-status-warning)]',
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <p>{utc(r.signedInAt).split(',')[0]}</p>
                        <p className="text-caption text-text-tertiary">
                          {utc(r.signedInAt).split(', ')[1]}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p>
                          {r.device}
                          {r.browser ? ` · ${r.browser}` : ''}
                        </p>
                        <p
                          className={cn(
                            'text-caption',
                            r.result === 'flagged' ? 'text-text-warning' : 'text-text-tertiary',
                          )}
                        >
                          {r.method}
                          {r.current ? ' · this browser' : ''}
                          {r.result === 'flagged' ? ' · new device' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">{r.location ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-2 font-mono text-mono-s">
                          {r.ipMasked ?? '—'} <Demo show={r.isDemo} size="xs" />
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <ResultChip r={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="flex flex-col tablet:hidden">
                {data.items.map((r) => {
                  const Icon = deviceIcon(r.device);
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        'flex gap-3 border-t border-border-subtle p-4 first:border-t-0',
                        r.result === 'flagged' && 'bg-status-warning-tint/50',
                      )}
                    >
                      <IconTile
                        icon={Icon}
                        tone={r.result === 'flagged' ? 'warning' : 'neutral'}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-body-s-strong">
                          {r.device}
                          {r.browser ? ` · ${r.browser}` : ''}
                        </p>
                        <p className="text-caption text-text-tertiary">
                          {utc(r.signedInAt)} · {r.location ?? 'Unknown location'} ·{' '}
                          {r.ipMasked ?? '—'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <ResultChip r={r} />
                          <Demo show={r.isDemo} size="xs" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-2 border-t border-border-subtle px-4 py-3">
                <p className="flex-1 text-body-s text-text-secondary">
                  Newest first · {data.items.length} of {data.total} sign-ins
                </p>
                <Button
                  variant="secondary"
                  size="s"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="s"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </Card>
          )
        )}
      </QueryState>

      <div className="grid gap-4 laptop:grid-cols-2">
        <Card padding="l" className="gap-3">
          <h2 className="text-h5">Why we flag a sign-in</h2>
          <CheckLine ok="warn">A device or browser we haven’t seen before</CheckLine>
          <CheckLine ok="warn">A country you haven’t signed in from</CheckLine>
          <CheckLine ok="warn">Several wrong 2FA codes in a row</CheckLine>
        </Card>
        <Card padding="l" className="gap-3">
          <h2 className="flex items-center gap-2 text-h5">
            <Info aria-hidden className="size-5 text-text-info" /> Passwordless sign-in
          </h2>
          <p className="text-body-s text-text-secondary">
            You sign in with a one-time email code, a social login or your wallet — there is no
            password to guess. After 5 wrong 2FA codes we pause sensitive actions for 15 minutes and
            email you.
          </p>
        </Card>
      </div>
    </DashboardPage>
  );
}

function ResultChip({ r }: { r: LoginHistoryView['items'][number] }) {
  if (r.result === 'flagged')
    return (
      <ToneChip tone="warning" icon={TriangleAlert}>
        Flagged
      </ToneChip>
    );
  if (!r.active)
    return (
      <ToneChip tone="neutral" icon={LogOut}>
        Signed out
      </ToneChip>
    );
  return (
    <ToneChip tone="success" icon={CircleCheck}>
      Success
    </ToneChip>
  );
}
