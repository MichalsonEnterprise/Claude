'use client';

/**
 * ADM-U2 User profile: identity header (status, KYC, VIP, 2FA), READ-ONLY ledger balances
 * (Total = Available + Locked + Pending + Owed), a 9-tab bar (section picker below 1024) and the Summary tab.
 * Tabs whose permission the admin lacks show the lock and lead to the no-permission state.
 */
import type { Permission } from '@gp/shared/enums';
import { RESTRICTION_LABEL, TX_TYPE_LABEL } from '@gp/shared/enums';
import { formatDateTimeUTC, formatDateUTC, formatHandle, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import {
  Ban,
  CalendarDays,
  CircleAlert,
  Hash,
  History,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { BALANCE_SPEC } from '@/components/domain/balance-card';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge, VipBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminUserDetail } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { useAuditLogs, useUser, useUserAml, useUserRg, useUserTransactions } from './hooks';
import {
  AdminPageHeader,
  initialsOf,
  KeyValue,
  KycChip,
  Meter,
  NoPermission,
  Panel,
  QueryErrorPanel,
  RiskChip,
} from './primitives';
import { useAdminSession } from './session';
import { UserStatus } from './users-list';

export interface UserTab {
  key: string;
  label: string;
  path: string;
  needs: readonly Permission[];
}

export const USER_TABS: readonly UserTab[] = [
  { key: 'summary', label: 'Summary', path: '', needs: ['users.read'] },
  { key: 'account', label: 'Account details', path: '/account', needs: ['users.read'] },
  { key: 'wallets', label: 'Wallet addresses', path: '/wallets', needs: ['users.read'] },
  { key: 'kyc', label: 'KYC', path: '/kyc', needs: ['kyc.read'] },
  { key: 'aml', label: 'AML risk', path: '/aml', needs: ['aml.read'] },
  { key: 'transactions', label: 'Transactions', path: '/transactions', needs: ['users.read'] },
  { key: 'restrictions', label: 'Restrictions', path: '/restrictions', needs: ['users.read'] },
  { key: 'rg', label: 'Responsible gaming', path: '/responsible-gaming', needs: ['rg.read'] },
  { key: 'audit', label: 'Audit history', path: '/audit', needs: ['audit.read'] },
];

const BUCKETS = ['available', 'locked', 'pending', 'owed'] as const;

function Header({ u }: { u: AdminUserDetail }) {
  const { can } = useAdminSession();
  const active = u.restrictions.filter((r) => !r.liftedAt);
  const name = u.handle ? formatHandle(u.handle) : 'No handle yet';
  return (
    <section
      aria-label="Player"
      className="flex flex-col gap-5 rounded-lg border border-border-subtle bg-surface-default p-5"
    >
      <div className="flex flex-col gap-4 laptop:flex-row laptop:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Avatar
            initials={u.handle ? initialsOf(u.handle.replace(/[_-]+/g, ' ')) : 'GP'}
            size="xl"
            tone="brand"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2 text-h4 text-text-primary">
              {name}
              {u.isDemo && <DemoBadge size="s" />}
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-s text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Hash aria-hidden className="size-3.5 text-icon-muted" />
                <span className="font-mono">{u.publicId}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail aria-hidden className="size-3.5 text-icon-muted" />
                {u.emailMasked ?? 'no email'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden className="size-3.5 text-icon-muted" />
                {u.country ?? 'country not set'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden className="size-3.5 text-icon-muted" />
                {u.onboardedAt
                  ? `Onboarded ${formatDateUTC(u.onboardedAt)}`
                  : 'Onboarding not finished'}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <UserStatus
                u={{
                  status: u.status,
                  restrictions: active.map((r) => r.type),
                  onboarded: Boolean(u.onboardedAt),
                }}
              />
              <KycChip level={u.kycLevel} status={u.kyc[0]?.status} />
              <VipBadge
                tier={u.vip.tier}
                label={`${u.vip.tier[0]!.toUpperCase()}${u.vip.tier.slice(1)} ${u.vip.level}`}
              />
              <StatusBadge
                status={u.twoFactorEnabled ? 'confirmed' : 'expired'}
                label={u.twoFactorEnabled ? '2FA on' : '2FA off'}
              />
              <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                <Smartphone aria-hidden className="size-3.5" /> {u.activeSessions} active session
                {u.activeSessions === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
        {can('users.restrict') && (
          <Button
            asChild
            variant="danger"
            size="s"
            leadingIcon={<Ban aria-hidden />}
            className="self-start"
          >
            <Link href={`/admin/users/${u.id}/restrictions?apply=1`}>Restrict account</Link>
          </Button>
        )}
      </div>
      <div
        className="grid grid-cols-2 gap-4 rounded-md border border-border-subtle bg-bg-secondary p-4 tablet:grid-cols-3 laptop:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.6fr)]"
        data-testid="user-balances"
      >
        {(['total', ...BUCKETS] as const).map((b) => {
          const spec = BALANCE_SPEC[b];
          const Icon = spec.icon;
          return (
            <div key={b} className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-caption text-text-tertiary">
                <Icon aria-hidden className={cn('size-3.5', spec.text)} />
                {b === 'total' ? 'Total balance' : spec.label}
              </span>
              <span
                className={cn(
                  'text-label-l tabular-nums',
                  b === 'total' ? 'text-text-primary' : spec.text,
                )}
              >
                {formatUSDT(u.balances[b], { symbol: false })}
                <span className="ml-1 text-caption text-text-tertiary">USDT</span>
              </span>
            </div>
          );
        })}
        <p className="flex items-start gap-2 border-border-subtle col-span-2 text-caption text-text-tertiary tablet:col-span-3 laptop:col-span-1 laptop:border-l laptop:pl-4">
          <DemoBadge size="xs" />
          <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Read-only. Balances are derived from the append-only ledger — admins cannot edit balances
          or ledger entries.
        </p>
      </div>
    </section>
  );
}

function TabNav({ id }: { id: string }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { canAny } = useAdminSession();
  const base = `/admin/users/${id}`;
  const current =
    [...USER_TABS]
      .reverse()
      .find((t) => (t.path === '' ? pathname === base : pathname.startsWith(base + t.path))) ??
    USER_TABS[0]!;
  return (
    <>
      <nav aria-label="Player sections" className="hidden border-b border-border-subtle lg:block">
        <ul className="no-scrollbar flex gap-5 overflow-x-auto">
          {USER_TABS.map((t) => {
            const allowed = canAny(t.needs);
            const on = t.key === current.key;
            return (
              <li key={t.key}>
                <Link
                  href={base + t.path}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    '-mb-px flex h-11 items-center gap-1.5 border-b-2 px-0.5 text-label-m whitespace-nowrap transition-colors',
                    on
                      ? 'border-brand text-text-primary'
                      : allowed
                        ? 'border-transparent text-text-secondary hover:text-text-primary'
                        : 'border-transparent text-text-disabled',
                  )}
                >
                  {t.label}
                  {!allowed && <Lock aria-label="No access" className="size-3.5" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="lg:hidden">
        <Select
          value={current.key}
          onValueChange={(k) =>
            router.push(base + (USER_TABS.find((t) => t.key === k)?.path ?? ''))
          }
        >
          <SelectTrigger aria-label="Player section" size="l">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_TABS.map((t) => (
              <SelectItem
                key={t.key}
                value={t.key}
                aside={canAny(t.needs) ? undefined : 'No access'}
              >
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

/** Player id from the /admin/users/[id] URL. */
export function useUserId(): string {
  const params = useParams<{ id: string }>();
  return params.id;
}

export function UserDetailLayout({ children }: { children: React.ReactNode }) {
  const id = useUserId();
  const user = useUser(id);
  const { admin } = useAdminSession();
  const name = user.data
    ? user.data.handle
      ? formatHandle(user.data.handle)
      : user.data.publicId
    : 'Player';
  return (
    <div className="flex flex-col gap-5" data-testid="admin-user">
      <AdminPageHeader
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: name },
        ]}
        title="User profile"
        description="Read-only profile. Every sensitive action needs a written reason and a fresh 2FA code and is audit-logged; nothing here can change balances or ledger rows."
      />
      {user.isPending ? (
        <Skeleton className="h-48" />
      ) : user.isError || !user.data ? (
        <QueryErrorPanel
          error={user.error}
          onRetry={() => void user.refetch()}
          role={admin?.roles[0]}
          what="this player"
        />
      ) : (
        <>
          <Header u={user.data} />
          <TabNav id={id} />
          {children}
        </>
      )}
    </div>
  );
}

/** Wrap a tab body: shows the no-permission state instead of the tab when the role lacks its permission. */
export function TabGate({ tab, children }: { tab: UserTab['key']; children: React.ReactNode }) {
  const { canAny, admin } = useAdminSession();
  const spec = USER_TABS.find((t) => t.key === tab)!;
  if (!canAny(spec.needs)) {
    return (
      <NoPermission
        compact
        title={`Your role doesn't include ${spec.label}`}
        permissions={spec.needs}
        role={admin?.roles[0] ?? null}
      />
    );
  }
  return <>{children}</>;
}

// ── U2 Summary tab ──────────────────────────────────────────────────────────────────────────────

export function UserSummaryTab() {
  const id = useUserId();
  const { can } = useAdminSession();
  const user = useUser(id);
  const aml = useUserAml(id, can('aml.read'));
  const rg = useUserRg(id, can('rg.read'));
  const tx = useUserTransactions(id, { page: 1, pageSize: 5 });
  const audit = useAuditLogs({ targetId: id, pageSize: 5 }, can('audit.read'));
  const u = user.data;
  if (!u) return null;
  const activeRestrictions = u.restrictions.filter((r) => !r.liftedAt);
  const openAml = u.amlAlerts.filter((a) =>
    ['open', 'under_review', 'escalated'].includes(a.status),
  );
  const pendingKyc = u.kyc.filter((k) => ['pending', 'in_review'].includes(k.status));

  return (
    <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_380px]" data-testid="user-summary">
      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="Open items" icon={CircleAlert} demo>
          {activeRestrictions.length + openAml.length + pendingKyc.length === 0 ? (
            <p className="text-body-s text-text-secondary">Nothing open for this player.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeRestrictions.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-body-s">
                  <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
                  <span>
                    {RESTRICTION_LABEL[r.type]} since {formatDateUTC(r.appliedAt)}
                    <span className="block text-caption text-text-tertiary">“{r.reason}”</span>
                  </span>
                </li>
              ))}
              {openAml.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-body-s">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-text-warning" />
                  <span>
                    AML alert · {a.rule} <RiskChip level={a.riskLevel as 'low'} />
                  </span>
                </li>
              ))}
              {pendingKyc.map((k) => (
                <li key={k.id} className="flex items-start gap-2 text-body-s">
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-info" />
                  KYC {k.level.replace('level_', 'L')} review {k.status.replace('_', ' ')}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Lifetime activity" icon={History} demo>
          {tx.isPending ? (
            <Skeleton className="h-28" />
          ) : tx.isError ? (
            <QueryErrorPanel error={tx.error} what="lifetime activity" />
          ) : (tx.data?.lifetime.length ?? 0) === 0 ? (
            <p className="text-body-s text-text-secondary">No completed transactions yet.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
              {tx.data.lifetime.map((l) => (
                <div
                  key={l.type}
                  className="flex flex-col rounded-md bg-surface-raised px-3 py-2.5"
                >
                  <dt className="text-caption text-text-tertiary">
                    {TX_TYPE_LABEL[l.type] ?? l.type} · {l.count}
                  </dt>
                  <dd className="text-label-m tabular-nums">{formatUSDT(l.amount)}</dd>
                  {l.type === 'entry_purchase' && (
                    <dd className="text-caption text-text-tertiary">
                      fees {formatUSDT(l.platformFees)}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          )}
        </Panel>

        <Panel
          title="Recent transactions"
          icon={History}
          demo
          actions={
            <Button asChild variant="ghost" size="s">
              <Link href={`/admin/users/${id}/transactions`}>All transactions</Link>
            </Button>
          }
        >
          {u.recentTransactions.length === 0 ? (
            <p className="text-body-s text-text-secondary">No transactions yet.</p>
          ) : (
            <ul className="flex flex-col">
              {u.recentTransactions.slice(0, 6).map((t, i) => (
                <li
                  key={t.reference}
                  className={cn(
                    'flex items-center gap-3 py-2',
                    i > 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body-s text-text-primary">
                      {TX_TYPE_LABEL[t.type] ?? t.type}
                    </span>
                    <span className="font-mono text-mono-s text-text-tertiary">
                      {t.reference} · {formatDateTimeUTC(t.createdAt)}
                    </span>
                  </span>
                  <span className="ml-auto flex flex-col items-end">
                    <span className="text-label-m tabular-nums">{formatUSDT(t.amount)}</span>
                    <span className="text-caption capitalize text-text-tertiary">
                      {t.status.replace('_', ' ')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="AML risk" icon={ShieldCheck} demo>
          {!can('aml.read') ? (
            <p className="flex items-center gap-2 text-body-s text-text-tertiary">
              <Lock aria-hidden className="size-4" /> Needs the aml.read permission.
            </p>
          ) : aml.isPending ? (
            <Skeleton className="h-24" />
          ) : aml.data ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-baseline gap-2">
                <span className="text-number-m tabular-nums">{aml.data.score.score}</span>
                <span className="text-caption text-text-tertiary">/ 100</span>
                <RiskChip level={aml.data.score.level} />
              </p>
              <Meter
                value={aml.data.score.score}
                max={100}
                label="AML risk score"
                tone={
                  aml.data.score.level === 'low'
                    ? 'brand'
                    : aml.data.score.level === 'medium'
                      ? 'warning'
                      : 'danger'
                }
              />
              <p className="text-caption text-text-tertiary">
                Rule-based, read-only model output · no override
              </p>
            </div>
          ) : (
            <QueryErrorPanel error={aml.error} what="AML risk" />
          )}
        </Panel>

        <Panel title="Compliance snapshot" icon={KeyRound} demo>
          <dl className="flex flex-col">
            <KeyValue
              first
              label="KYC"
              value={<KycChip level={u.kycLevel} status={u.kyc[0]?.status} />}
            />
            <KeyValue label="Two-factor" value={u.twoFactorEnabled ? 'On' : 'Off'} />
            <KeyValue
              label="Onboarding"
              value={u.onboardedAt ? formatDateUTC(u.onboardedAt) : 'Not finished'}
            />
            <KeyValue label="Country" value={u.country ?? '—'} />
            <KeyValue
              label="Restrictions"
              value={activeRestrictions.length ? `${activeRestrictions.length} active` : 'None'}
            />
          </dl>
        </Panel>

        <Panel title="Responsible gaming" icon={ShieldCheck} demo>
          {!can('rg.read') ? (
            <p className="flex items-center gap-2 text-body-s text-text-tertiary">
              <Lock aria-hidden className="size-4" /> Needs the rg.read permission.
            </p>
          ) : rg.isPending ? (
            <Skeleton className="h-24" />
          ) : rg.data ? (
            <dl className="flex flex-col">
              <KeyValue
                first
                label="Self-exclusion"
                value={
                  rg.data.selfExclusion.active
                    ? `Active until ${rg.data.selfExclusion.endsAt ? formatDateUTC(rg.data.selfExclusion.endsAt) : 'indefinite'}`
                    : 'Not active'
                }
              />
              <KeyValue label="Limits set" value={String(rg.data.limits.length)} />
              <KeyValue label="Reality check" value={`every ${rg.data.realityCheckMinutes} min`} />
            </dl>
          ) : (
            <QueryErrorPanel error={rg.error} what="RG status" />
          )}
        </Panel>

        <Panel
          title="Admin activity"
          icon={History}
          demo
          actions={
            can('audit.read') ? (
              <Button asChild variant="ghost" size="s">
                <Link href={`/admin/users/${id}/audit`}>Full audit history</Link>
              </Button>
            ) : undefined
          }
        >
          {!can('audit.read') ? (
            <p className="flex items-center gap-2 text-body-s text-text-tertiary">
              <Lock aria-hidden className="size-4" /> Needs the audit.read permission.
            </p>
          ) : audit.isPending ? (
            <Skeleton className="h-20" />
          ) : (audit.data?.items.length ?? 0) === 0 ? (
            <p className="text-body-s text-text-secondary">No admin actions on this player yet.</p>
          ) : (
            <ul className="flex flex-col">
              {(audit.data?.items ?? []).map((r, i) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2',
                    i > 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="font-mono text-mono-s text-text-tertiary">
                    {formatTimeUTC(r.createdAt)}
                  </span>
                  <span className="text-body-s text-text-primary">{r.action}</span>
                  <span className="text-caption text-text-tertiary">
                    {r.actorLabel ?? r.actorType}
                    {r.reason ? ` · “${r.reason}”` : ''}
                  </span>
                  <span className="ml-auto font-mono text-mono-s text-text-tertiary">
                    #{Number(r.seq).toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
