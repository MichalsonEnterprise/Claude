'use client';

/**
 * ADM-U1 Users list: KPI tiles, filter bar (search · status · KYC level · restricted), compact table with masked
 * e-mail, KYC chip, status / restrictions, open-AML risk, ledger total and activity. Read-only — there are no balance,
 * bulk-edit or delete actions. Laptop hides Country; tablet hides Country / Balance / Last active; < 768 = cards.
 */
import { KYC_LEVEL_LABEL, RESTRICTION_LABEL, type KycLevel } from '@gp/shared/enums';
import { formatCount, formatDateUTC, formatHandle } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import type { AdminUsersQuery } from '@gp/shared/schemas';
import { Lock, ShieldAlert, UserCheck, Users, UserX } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { AdminUserRow } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { useUsers, useUserStats } from './hooks';
import {
  AdminPageHeader,
  KpiTile,
  initialsOf,
  KycChip,
  Pagination,
  QueryErrorPanel,
  RiskChip,
} from './primitives';
import { useAdminSession } from './session';

const ALL = 'all';

export function relativeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 30 * 86_400) return `${Math.floor(s / 86_400)} d ago`;
  return formatDateUTC(iso);
}

export function UserStatus({
  u,
}: {
  u: Pick<AdminUserRow, 'status' | 'restrictions' | 'onboarded'>;
}) {
  if (u.status !== 'active')
    return (
      <StatusBadge status="restricted" label={u.status === 'suspended' ? 'Suspended' : 'Closed'} />
    );
  if (u.restrictions.length > 0)
    return (
      <span className="flex flex-col gap-0.5">
        <StatusBadge
          status="restricted"
          label={`${u.restrictions.length} restriction${u.restrictions.length > 1 ? 's' : ''}`}
        />
        <span className="text-caption text-text-tertiary">
          {u.restrictions.map((r) => RESTRICTION_LABEL[r] ?? r).join(', ')}
        </span>
      </span>
    );
  if (!u.onboarded) return <StatusBadge status="pending" label="Onboarding" />;
  return <StatusBadge status="confirmed" label="Active" />;
}

function initialsFor(u: AdminUserRow) {
  return u.handle ? initialsOf(u.handle.replace(/[_-]+/g, ' ')) : 'GP';
}

export function UsersListPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { admin } = useAdminSession();
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const status = params.get('status') ?? ALL;
  const kyc = params.get('kyc') ?? ALL;
  const restricted = params.get('restricted') ?? ALL;
  const qParam = params.get('q') ?? '';
  const [q, setQ] = React.useState(qParam);

  const query: Partial<AdminUsersQuery> = {
    page,
    pageSize: 20,
    ...(qParam ? { q: qParam } : {}),
    ...(status !== ALL ? { status: status as AdminUsersQuery['status'] } : {}),
    ...(kyc !== ALL ? { kycLevel: kyc as KycLevel } : {}),
    ...(restricted !== ALL ? { restricted: restricted as 'yes' | 'no' } : {}),
  };
  const users = useUsers(query);
  const stats = useUserStats();

  // Once a player is opened, a late debounced search update must not cancel that navigation.
  const leaving = React.useRef(false);
  const open = React.useCallback(
    (id: string) => {
      leaving.current = true;
      router.push(`/admin/users/${id}`);
    },
    [router],
  );
  const setParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      if (leaving.current) return;
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === ALL) sp.delete(k);
        else sp.set(k, v);
      }
      if (!('page' in patch)) sp.delete('page');
      router.replace(`${pathname}${sp.size ? `?${sp.toString()}` : ''}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounced search → URL
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (q.trim() !== qParam) setParams({ q: q.trim() || null });
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, qParam, setParams]);

  const filtered = qParam || status !== ALL || kyc !== ALL || restricted !== ALL;
  const data = users.data;

  return (
    <div className="flex flex-col gap-5" data-testid="admin-users">
      <AdminPageHeader
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'User Management' },
          { label: 'Users' },
        ]}
        title="Users"
        description="Every player account. Balances are read from the append-only ledger; personal data stays masked unless a reason is logged. No balance edits or bulk actions exist."
      />
      <div className="grid grid-cols-2 gap-4 laptop:grid-cols-4">
        {stats.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)
        ) : stats.data ? (
          <>
            <KpiTile
              icon={Users}
              label="Total users"
              value={formatCount(stats.data.totalUsers)}
              unit="accounts"
              context={`${formatCount(stats.data.newUsers30d)} new · 30 d`}
            />
            <KpiTile
              icon={UserCheck}
              label="Active · 30 d"
              value={formatCount(stats.data.activeUsers30d)}
              unit="signed in"
            />
            <KpiTile
              icon={ShieldAlert}
              label="KYC verified"
              value={formatCount(stats.data.kycVerified)}
              unit="L1 or higher"
            />
            <KpiTile
              icon={UserX}
              label="Restricted accounts"
              value={formatCount(stats.data.restrictedAccounts)}
              unit="with an active restriction"
              href="/admin/users?restricted=yes"
            />
          </>
        ) : (
          <div className="col-span-full">
            <QueryErrorPanel error={stats.error} role={admin?.roles[0]} what="user KPIs" />
          </div>
        )}
      </div>

      <section
        aria-label="Filters"
        className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-4"
      >
        <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center">
          <SearchInput
            size="m"
            groupClassName="laptop:max-w-[420px]"
            aria-label="Search players"
            placeholder="Search @handle, GP-id or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onClear={() => setQ('')}
          />
          <div className="grid grid-cols-1 gap-2 tablet:grid-cols-3 laptop:flex">
            <Select value={status} onValueChange={(v) => setParams({ status: v })}>
              <SelectTrigger aria-label="Account status" className="laptop:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kyc} onValueChange={(v) => setParams({ kyc: v })}>
              <SelectTrigger aria-label="KYC level" className="laptop:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All KYC levels</SelectItem>
                {(['none', 'level_1', 'level_2', 'level_3'] as const).map((l) => (
                  <SelectItem key={l} value={l}>
                    {KYC_LEVEL_LABEL[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={restricted} onValueChange={(v) => setParams({ restricted: v })}>
              <SelectTrigger aria-label="Restrictions" className="laptop:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any restrictions</SelectItem>
                <SelectItem value="yes">Restricted only</SelectItem>
                <SelectItem value="no">No restrictions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-caption text-text-tertiary">
          <span aria-live="polite">
            {data
              ? `${formatCount(data.total)} ${data.total === 1 ? 'player' : 'players'}`
              : 'Loading…'}
          </span>
          <DemoBadge size="xs" />
          <span>· newest first</span>
          {filtered && (
            <Button
              variant="ghost"
              size="s"
              className="ml-auto"
              onClick={() => {
                setQ('');
                router.replace(pathname, { scroll: false });
              }}
            >
              Clear all
            </Button>
          )}
        </div>
      </section>

      {users.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : users.isError ? (
        <QueryErrorPanel
          error={users.error}
          onRetry={() => void users.refetch()}
          role={admin?.roles[0]}
          what="users"
        />
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            type={filtered ? 'no-results' : 'no-data'}
            title={filtered ? 'No players match these filters' : 'No players yet'}
            description={
              filtered
                ? 'Try a different handle, GP-id or email, or clear the filters.'
                : 'Players appear after their first sign-in.'
            }
          />
        </div>
      ) : (
        <>
          <TableContainer className={cn('hidden tablet:block', users.isFetching && 'opacity-80')}>
            <Table density="compact" aria-label="Players">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>AML risk</TableHead>
                  <TableHead className="hidden desktop:table-cell">Country</TableHead>
                  <TableHead align="right" className="hidden laptop:table-cell">
                    Balance (ledger)
                  </TableHead>
                  <TableHead className="hidden laptop:table-cell">Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((u) => (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => open(u.id)}>
                    <TableCell className="h-auto py-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="flex items-center gap-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          leaving.current = true;
                        }}
                      >
                        <Avatar initials={initialsFor(u)} size="m" />
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-label-m text-text-primary">
                            {u.handle ? formatHandle(u.handle) : 'No handle yet'}
                            {u.isDemo && <DemoBadge size="xs" />}
                          </span>
                          <span className="text-caption text-text-tertiary">
                            <span className="font-mono">{u.publicId}</span>
                            {u.emailMasked ? ` · ${u.emailMasked}` : ''}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="h-auto py-2">
                      <UserStatus u={u} />
                    </TableCell>
                    <TableCell>
                      <KycChip level={u.kycLevel} />
                    </TableCell>
                    <TableCell>
                      <RiskChip level={u.amlRiskLevel ?? null} />
                    </TableCell>
                    <TableCell className="hidden desktop:table-cell">{u.country ?? '—'}</TableCell>
                    <TableCell align="right" className="hidden laptop:table-cell">
                      {u.totalBalance !== undefined ? formatUSDT(u.totalBalance) : '—'}
                    </TableCell>
                    <TableCell className="hidden text-text-secondary laptop:table-cell">
                      {relativeAgo(u.lastLoginAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <ul className="flex flex-col gap-3 tablet:hidden" aria-label="Players">
            {data.items.map((u) => (
              <li key={u.id}>
                <Link
                  onClick={() => {
                    leaving.current = true;
                  }}
                  href={`/admin/users/${u.id}`}
                  className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-default p-4 hover:border-border-strong"
                >
                  <span className="flex items-center gap-2.5">
                    <Avatar initials={initialsFor(u)} size="m" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-label-l text-text-primary">
                        {u.handle ? formatHandle(u.handle) : u.publicId}
                      </span>
                      <span className="font-mono text-mono-s text-text-tertiary">{u.publicId}</span>
                    </span>
                    {u.isDemo && <DemoBadge size="xs" className="ml-auto" />}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <KycChip level={u.kycLevel} />
                    <UserStatus u={u} />
                    <RiskChip level={u.amlRiskLevel ?? null} />
                  </span>
                  <span className="flex justify-between text-caption text-text-tertiary">
                    <span>{u.totalBalance !== undefined ? formatUSDT(u.totalBalance) : '—'}</span>
                    <span>{relativeAgo(u.lastLoginAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            label="players"
            onPage={(p) => setParams({ page: String(p) })}
          />
        </>
      )}
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        <Lock aria-hidden className="size-3.5" />
        Read-only list. Balances are computed from the ledger and can never be edited from the
        console.
      </p>
    </div>
  );
}
