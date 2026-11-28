'use client';

/**
 * ADM-00 Approvals inbox + MOB-11 approvals queue: four-eyes requests from every module with the viewer's role per
 * request (can decide / requested by you / role only). Opening a request shows ADM-X1 (review, self-approval blocked
 * or the decision trail). Desktop = dense table; < 768 = cards with full-width actions.
 */
import { ADMIN_APPROVAL_VIEWS, type AdminApprovalView } from '@gp/shared/schemas';
import { PERMISSION_LABEL } from '@gp/shared/enums';
import { formatTimeUTC } from '@gp/shared/format';
import {
  Ban,
  CircleCheck,
  ExternalLink,
  History,
  Hourglass,
  Lock,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApprovalItem } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { approvalStatusBadge, ApprovalReviewDialog } from './four-eyes';
import { useApprovalsInbox } from './hooks';
import {
  AdminPageHeader,
  initialsOf,
  Panel,
  QueryErrorPanel,
  RoleChip,
  roleLabel,
} from './primitives';
import { useAdminSession } from './session';

const VIEW_LABEL: Record<AdminApprovalView, string> = {
  open: 'Open',
  waiting_for_me: 'Waiting for me',
  created_by_me: 'Created by me',
  decided_today: 'Decided today',
  expired: 'Expired',
};

function useNow() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function timeLeft(iso: string | null, now: number) {
  if (!iso) return 'No expiry';
  const m = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60_000));
  if (m === 0) return 'Expiring';
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}

function YourRole({ a }: { a: ApprovalItem }) {
  switch (a.yourRole) {
    case 'can_decide':
      return (
        <span className="inline-flex items-center gap-1.5 text-label-m text-text-success">
          <CircleCheck aria-hidden className="size-4" /> You can decide
        </span>
      );
    case 'requester':
      return (
        <span className="inline-flex items-center gap-1.5 text-label-m text-text-secondary">
          <User aria-hidden className="size-4" /> You requested
        </span>
      );
    case 'not_eligible':
      return (
        <span className="inline-flex items-center gap-1.5 text-label-m text-text-tertiary">
          <Lock aria-hidden className="size-4" />
          {a.requiredPermission
            ? `${PERMISSION_LABEL[a.requiredPermission]} only`
            : 'Not your role'}
        </span>
      );
    case 'external':
      return a.decideAt ? (
        <Link
          href={a.decideAt}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-label-m text-text-brand hover:underline"
        >
          <ExternalLink aria-hidden className="size-4" /> Decide in its module
        </Link>
      ) : null;
    case 'decided':
    default:
      return (
        <span className="text-caption text-text-tertiary">
          {a.decidedBy
            ? `${a.decidedBy.name}${a.decidedAt ? ` · ${formatTimeUTC(a.decidedAt)}` : ''}`
            : '—'}
        </span>
      );
  }
}

export function ApprovalsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { admin } = useAdminSession();
  const raw = params.get('view') ?? 'open';
  const view = (
    (ADMIN_APPROVAL_VIEWS as readonly string[]).includes(raw) ? raw : 'open'
  ) as AdminApprovalView;
  const inbox = useApprovalsInbox(view);
  const decided = useApprovalsInbox('decided_today');
  const [openId, setOpenId] = React.useState<string | null>(params.get('request'));
  const now = useNow();

  const setView = (v: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('view', v);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const items = inbox.data?.items ?? [];
  const counts = inbox.data?.counts;

  return (
    <div className="flex flex-col gap-5" data-testid="admin-approvals">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Approvals' }]}
        title="Approvals"
        description={`Four-eyes requests from every module. You can decide requests your role covers — never your own.${inbox.data ? ` Updated ${formatTimeUTC(inbox.data.generatedAt)} · refreshes every 30 s.` : ''}`}
      />

      <Tabs value={view} onValueChange={setView}>
        <TabsList aria-label="Approval views">
          {ADMIN_APPROVAL_VIEWS.map((v) => (
            <TabsTrigger key={v} value={v} count={counts?.[v]}>
              {VIEW_LABEL[v]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="flex items-start gap-2.5 rounded-md border border-sky-500/20 bg-status-info-tint px-4 py-3 text-body-s text-text-secondary">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-info" />
        Four-eyes policy — the requester can never approve their own request · every decision needs
        a written reason and a fresh 2FA code · requests expire after 4 h and then nothing changes ·
        every step is hash-chained in the audit log.
      </p>

      {inbox.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : inbox.isError ? (
        <QueryErrorPanel
          error={inbox.error}
          onRetry={() => void inbox.refetch()}
          role={admin?.roles[0]}
          what="approvals"
        />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            title={
              view === 'waiting_for_me'
                ? 'Nothing is waiting for you'
                : `No ${VIEW_LABEL[view].toLowerCase()} requests`
            }
            description="Requests appear here when an admin starts a sensitive action that needs a second approver (withdrawal releases, withdrawal holds, account suspensions, role changes)."
          />
        </div>
      ) : (
        <>
          <TableContainer className="hidden tablet:block">
            <Table density="compact" aria-label={`${VIEW_LABEL[view]} requests`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead className="hidden laptop:table-cell">Module</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead className="hidden laptop:table-cell">Requested</TableHead>
                  <TableHead>
                    {view === 'decided_today' || view === 'expired' ? 'Decided' : 'Expires in'}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Your role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow
                    key={a.id}
                    className={cn(
                      'cursor-pointer',
                      a.yourRole === 'can_decide' && 'bg-brand-tint-subtle',
                    )}
                    onClick={() => setOpenId(a.id)}
                  >
                    <TableCell className="h-auto py-2.5 whitespace-normal">
                      <button
                        type="button"
                        className="flex flex-col items-start gap-0.5 text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(a.id);
                        }}
                        aria-label={`Open ${a.ref}: ${a.summary}`}
                      >
                        <span className="font-mono text-mono-s text-text-tertiary">{a.ref}</span>
                        <span className="max-w-[340px] text-body-s text-text-primary">
                          {a.summary}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden laptop:table-cell">{a.module}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Avatar initials={initialsOf(a.requestedBy.name)} size="xs" />
                        <span className="text-body-s">
                          {a.requestedBy.name}
                          <span className="text-text-tertiary">
                            {' '}
                            · {roleLabel(a.requestedBy.roles[0] ?? '')}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden laptop:table-cell">
                      {formatTimeUTC(a.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {view === 'decided_today' || view === 'expired'
                        ? a.decidedAt
                          ? formatTimeUTC(a.decidedAt)
                          : '—'
                        : timeLeft(a.expiresAt, now)}
                    </TableCell>
                    <TableCell>{approvalStatusBadge(a.status)}</TableCell>
                    <TableCell>
                      <YourRole a={a} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="flex items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-caption text-text-tertiary">
              {items.length} request{items.length === 1 ? '' : 's'} · sorted by soonest expiry · a
              request that expires closes automatically and nothing changes <DemoBadge size="xs" />
            </p>
          </TableContainer>

          <ul
            className="flex flex-col gap-3 tablet:hidden"
            aria-label={`${VIEW_LABEL[view]} requests`}
          >
            {items.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-default p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-mono-s text-text-tertiary">{a.ref}</span>
                  {approvalStatusBadge(a.status)}
                  <span className="ml-auto flex items-center gap-1 text-caption text-text-tertiary">
                    <Hourglass aria-hidden className="size-3.5" />
                    {timeLeft(a.expiresAt, now)}
                  </span>
                </div>
                <p className="text-label-l text-text-primary">{a.summary}</p>
                <p className="text-body-s text-text-secondary">
                  {a.module} · {a.actionLabel}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar initials={initialsOf(a.requestedBy.name)} size="xs" />
                  <span className="text-caption text-text-secondary">
                    {a.yourRole === 'requester' ? 'Requested by you' : a.requestedBy.name} ·{' '}
                    {formatTimeUTC(a.createdAt)}
                  </span>
                  <RoleChip role={a.requestedBy.roles[0] ?? 'read_only'} />
                  <DemoBadge size="xs" className="ml-auto" />
                </div>
                {a.yourRole === 'requester' && (
                  <p className="flex items-start gap-2 rounded-md bg-surface-raised px-3 py-2.5 text-caption text-text-secondary">
                    <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
                    Your own request — another admin must decide. You can withdraw it.
                  </p>
                )}
                {a.yourRole === 'not_eligible' && (
                  <p className="flex items-start gap-2 rounded-md bg-surface-raised px-3 py-2.5 text-caption text-text-secondary">
                    <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
                    You can see it, but your role can&apos;t decide it.
                  </p>
                )}
                {a.yourRole === 'external' && a.decideAt ? (
                  <Button asChild size="l" block variant="secondary">
                    <Link href={a.decideAt}>Decide in its module</Link>
                  </Button>
                ) : (
                  <Button
                    size="l"
                    block
                    variant={
                      a.yourRole === 'can_decide'
                        ? 'primary'
                        : a.yourRole === 'requester'
                          ? 'ghost'
                          : 'secondary'
                    }
                    onClick={() => setOpenId(a.id)}
                  >
                    {a.yourRole === 'can_decide'
                      ? 'Review'
                      : a.yourRole === 'requester'
                        ? 'View or withdraw'
                        : 'View details'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="grid gap-4 laptop:grid-cols-[1.6fr_1fr]">
        <Panel title="How four-eyes works" icon={Users}>
          <ol className="grid gap-5 tablet:grid-cols-3">
            {[
              [
                'Requester submits',
                'Picks a reason category, writes the reason and confirms with a fresh 2FA code. Nothing changes yet.',
              ],
              [
                'A different admin decides',
                'Someone with an allowed role — never the requester — reviews, writes their own reason and confirms with 2FA.',
              ],
              [
                'Action runs, both are logged',
                'Only the requested action executes, in the same transaction. Both decisions, reasons and times are hash-chained.',
              ],
            ].map(([t, b], i) => (
              <li key={t} className="flex flex-col gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">
                  {i + 1}
                </span>
                <p className="text-label-l text-text-primary">{t}</p>
                <p className="text-body-s text-text-secondary">{b}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 flex items-start gap-2.5 rounded-md bg-status-danger-tint px-4 py-3 text-body-s text-text-secondary">
            <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
            No role — including Super Admin — can change a draw result, choose winners, pay out from
            a pool or edit ledger entries. These actions do not exist in the console, so they can
            never be requested or approved.
          </p>
        </Panel>
        <Panel title="Decided today" icon={History} demo>
          {decided.isPending ? (
            <Skeleton className="h-32" />
          ) : (decided.data?.items.length ?? 0) === 0 ? (
            <p className="text-body-s text-text-secondary">No decisions yet today (UTC).</p>
          ) : (
            <ul className="flex flex-col">
              {decided.data!.items.slice(0, 6).map((a, i) => (
                <li
                  key={a.id}
                  className={cn('flex gap-3 py-2.5', i > 0 && 'border-t border-border-subtle')}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                    onClick={() => setOpenId(a.id)}
                  >
                    <span className="font-mono text-mono-s text-text-tertiary">{a.ref}</span>
                    <span className="truncate text-body-s text-text-primary">{a.summary}</span>
                  </button>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {approvalStatusBadge(a.status)}
                    <span className="text-caption text-text-tertiary">
                      {a.decidedBy?.name ?? '—'}
                      {a.decidedAt ? ` · ${formatTimeUTC(a.decidedAt)}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ApprovalReviewDialog approvalId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
