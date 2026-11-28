'use client';

/**
 * ADM-S1 Admin roles + ADM-S2 Permissions matrix. Live RBAC from the API (roles × permissions × policy). Read-only for
 * everyone except holders of `admins.manage` (Super Admin), who can stage changes and submit them as FOUR-EYES
 * requests (reason + fresh 2FA) — nothing changes until a second Super Admin approves. The Super Admin role is fixed.
 * There is no permission to edit results, choose winners, pay out, edit ledger rows or adjust balances.
 */
import { PERMISSION_LABEL, type Permission } from '@gp/shared/enums';
import { formatDateTimeUTC, formatDateUTC } from '@gp/shared/format';
import { ADMIN_CONSOLE_REASON_CATEGORIES } from '@gp/shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Check,
  Fingerprint,
  Lock,
  MessageSquareText,
  Minus,
  Pencil,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { requestRoleChange, type PermissionView, type RoleView } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { ConfirmWithReasonDialog } from './four-eyes';
import { usePermissionsCatalogue, useRoles } from './hooks';
import {
  AdminPageHeader,
  initialsOf,
  NoPermission,
  Panel,
  QueryErrorPanel,
  RoleChip,
} from './primitives';
import { useAdminSession } from './session';

const ROLE_BLURB: Record<string, string> = {
  super_admin: 'Every permission. Fixed — the role itself cannot be edited.',
  finance: 'Withdrawal decisions, ledger, reconciliation and reports.',
  compliance: 'KYC / AML, restrictions, personal-data reveal, restricted countries.',
  support: 'Read-only player views for support tickets.',
  marketing: 'Promotions, CMS, affiliates and notifications.',
  read_only: 'External auditor: every *.read permission except personal data.',
};

function PolicyChips({ p }: { p: PermissionView['policy'] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {p.requiresReason && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          <MessageSquareText aria-hidden className="size-3" /> Reason
        </span>
      )}
      {p.requiresMfa && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          <Fingerprint aria-hidden className="size-3" /> 2FA
        </span>
      )}
      {p.fourEyes !== 'never' && (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-1.5 py-0.5 text-[10px] font-semibold text-text-brand">
          <Users aria-hidden className="size-3" /> 4-eyes
          {p.fourEyes === 'flagged' ? ' (flagged)' : ''}
        </span>
      )}
      {!p.requiresReason && !p.requiresMfa && p.fourEyes === 'never' && (
        <span className="text-caption text-text-tertiary">—</span>
      )}
    </span>
  );
}

type Staged = Record<string, { grant: Set<Permission>; revoke: Set<Permission> }>;

function useRbac() {
  const { can } = useAdminSession();
  const roles = useRoles(can('system.read'));
  const perms = usePermissionsCatalogue(can('system.read'));
  return { roles, perms };
}

function ChangeRequestDialog({
  staged,
  onClose,
  onDone,
}: {
  staged: Staged | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const entries = Object.entries(staged ?? {}).filter(([, v]) => v.grant.size + v.revoke.size > 0);
  return (
    <ConfirmWithReasonDialog
      open={staged !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Request permission changes"
      description="Nothing changes until a second Super Admin approves. The request expires after 4 hours."
      icon={Pencil}
      categories={ADMIN_CONSOLE_REASON_CATEGORIES.role_change}
      fourEyes
      submitLabel="Submit for approval"
      testId="role-change-dialog"
      onSubmit={async (v) => {
        const [key, ch] = entries[0]!;
        const res = await requestRoleChange(key, {
          grant: [...ch.grant],
          revoke: [...ch.revoke],
          reason: v.reason,
          reasonCategory: v.reasonCategory,
          mfaCode: v.mfaCode,
        });
        await qc.invalidateQueries({ queryKey: ['admin', 'roles'] });
        await qc.invalidateQueries({ queryKey: ['admin', 'approvals'] });
        onDone();
        return {
          kind: 'pending',
          ref: res.approval.ref,
          expiresAt: res.approval.expiresAt,
          auditSeq: res.approval.auditSeq,
        };
      }}
    >
      <div className="flex flex-col gap-2 rounded-md bg-surface-raised p-3">
        <p className="text-overline uppercase text-text-tertiary">Requested changes</p>
        {entries.map(([key, ch]) => (
          <div key={key} className="flex flex-col gap-1">
            <RoleChip role={key} />
            <ul className="flex flex-wrap gap-1.5">
              {[...ch.grant].map((p) => (
                <li
                  key={`g-${p}`}
                  className="rounded-xs bg-status-success-tint px-1.5 py-0.5 font-mono text-mono-s text-text-success"
                >
                  + {p}
                </li>
              ))}
              {[...ch.revoke].map((p) => (
                <li
                  key={`r-${p}`}
                  className="rounded-xs bg-status-danger-tint px-1.5 py-0.5 font-mono text-mono-s text-text-danger"
                >
                  − {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ConfirmWithReasonDialog>
  );
}

// ── S2 matrix ───────────────────────────────────────────────────────────────────────────────────

export function PermissionsMatrixPage() {
  const { can, admin } = useAdminSession();
  const { roles, perms } = useRbac();
  const canManage = can('admins.manage');
  const [edit, setEdit] = React.useState(false);
  const [staged, setStaged] = React.useState<Staged>({});
  const [confirm, setConfirm] = React.useState<Staged | null>(null);

  if (!can('system.read')) {
    return (
      <div className="flex flex-col gap-5">
        <AdminPageHeader
          crumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'System' },
            { label: 'Permissions' },
          ]}
          title="Permissions"
          demo={false}
        />
        <NoPermission permissions={['system.read']} role={admin?.roles[0] ?? null} />
      </div>
    );
  }

  const stagedCount = Object.values(staged).reduce((n, v) => n + v.grant.size + v.revoke.size, 0);
  const toggle = (role: RoleView, p: Permission) => {
    if (role.fixed) return;
    setStaged((prev) => {
      // One role per request: a fresh 2FA code covers one decision (codes are single-use).
      const others = Object.entries(prev).some(
        ([k, v]) => k !== role.key && v.grant.size + v.revoke.size > 0,
      );
      const s: Staged = others ? {} : prev;
      const cur = s[role.key] ?? { grant: new Set<Permission>(), revoke: new Set<Permission>() };
      const next = { grant: new Set(cur.grant), revoke: new Set(cur.revoke) };
      const held = role.permissions.includes(p);
      if (held) {
        if (next.revoke.has(p)) next.revoke.delete(p);
        else next.revoke.add(p);
      } else if (next.grant.has(p)) next.grant.delete(p);
      else next.grant.add(p);
      return { ...s, [role.key]: next };
    });
  };

  const groups = new Map<string, PermissionView[]>();
  for (const p of perms.data ?? []) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);

  return (
    <div className="flex flex-col gap-5" data-testid="admin-permissions">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'System' }, { label: 'Permissions' }]}
        title="Permissions matrix"
        description="Live role-based access, loaded from the API on every request. Changes are requests: a second Super Admin must approve, and every change is hash-chained in the audit log."
        actions={
          canManage ? (
            edit ? (
              <>
                <Button
                  variant="ghost"
                  size="s"
                  onClick={() => {
                    setEdit(false);
                    setStaged({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="s"
                  disabled={stagedCount === 0}
                  onClick={() => setConfirm(staged)}
                  data-testid="request-role-change"
                >
                  Request change{stagedCount ? ` (${stagedCount})` : ''}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="s"
                leadingIcon={<Pencil aria-hidden />}
                onClick={() => setEdit(true)}
              >
                Propose changes
              </Button>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 text-caption text-text-tertiary">
              <Lock aria-hidden className="size-3.5" /> Read-only · changes need admins.manage
            </span>
          )
        }
      />
      {roles.isPending || perms.isPending ? (
        <Skeleton className="h-96" />
      ) : roles.isError || perms.isError || !roles.data || !perms.data ? (
        <QueryErrorPanel
          error={roles.error ?? perms.error}
          onRetry={() => {
            void roles.refetch();
            void perms.refetch();
          }}
          role={admin?.roles[0]}
          what="the permissions matrix"
        />
      ) : (
        <>
          {roles.data.pendingChanges.length > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-border-brand bg-brand-tint-subtle px-4 py-3 text-body-s text-text-secondary">
              <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-brand" />
              {roles.data.pendingChanges.length} pending change request(s) are waiting for a second
              Super Admin in{' '}
              <Link
                href="/admin/approvals"
                className="text-text-brand underline-offset-4 hover:underline"
              >
                Approvals
              </Link>
              .
            </p>
          )}
          <div
            className="flex flex-wrap items-center gap-4 text-caption text-text-tertiary"
            aria-label="Legend"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="size-4 text-text-success" /> Allowed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Minus aria-hidden className="size-4 text-text-disabled" /> Not granted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users aria-hidden className="size-4 text-text-brand" /> Allowed · needs a second
              approver
            </span>
            {edit && (
              <span className="inline-flex items-center gap-1.5 text-text-warning">
                Click cells of ONE role to stage a change (one role per request) · Super Admin is
                fixed
              </span>
            )}
            <DemoBadge size="xs" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-default">
            <table
              className="w-full min-w-[960px] border-collapse text-body-s"
              aria-label="Permissions by role"
            >
              <thead className="sticky top-0 bg-bg-secondary">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-overline uppercase text-text-tertiary"
                  >
                    Permission
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-overline uppercase text-text-tertiary"
                  >
                    Policy
                  </th>
                  {roles.data.roles.map((r) => (
                    <th key={r.key} scope="col" className="px-2 py-3 text-center">
                      <RoleChip role={r.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...groups.entries()].map(([group, list]) => (
                  <React.Fragment key={group}>
                    <tr>
                      <th
                        colSpan={2 + roles.data.roles.length}
                        scope="colgroup"
                        className="border-t border-border-subtle bg-bg-secondary/50 px-4 py-1.5 text-left text-overline uppercase text-text-tertiary"
                      >
                        {group}
                      </th>
                    </tr>
                    {list.map((p) => (
                      <tr key={p.key} className="border-t border-border-subtle">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          <span className="flex flex-col">
                            <span className="text-body-s text-text-primary">{p.label}</span>
                            <code className="font-mono text-mono-s text-text-tertiary">
                              {p.key}
                            </code>
                          </span>
                        </th>
                        <td className="px-3 py-2">
                          <PolicyChips p={p.policy} />
                        </td>
                        {roles.data.roles.map((r) => {
                          const held = r.permissions.includes(p.key);
                          const st = staged[r.key];
                          const changed = st ? st.grant.has(p.key) || st.revoke.has(p.key) : false;
                          const effective = changed ? !held : held;
                          const four = p.policy.fourEyes !== 'never';
                          const label = `${r.label}: ${PERMISSION_LABEL[p.key]} — ${effective ? 'allowed' : 'not granted'}${changed ? ' (staged change)' : ''}`;
                          const icon = effective ? (
                            four ? (
                              <Users aria-hidden className="size-4 text-text-brand" />
                            ) : (
                              <Check aria-hidden className="size-4 text-text-success" />
                            )
                          ) : (
                            <Minus aria-hidden className="size-4 text-text-disabled" />
                          );
                          return (
                            <td key={r.key} className="px-2 py-1 text-center">
                              {edit && !r.fixed ? (
                                <button
                                  type="button"
                                  aria-label={label}
                                  aria-pressed={effective}
                                  onClick={() => toggle(r, p.key)}
                                  className={cn(
                                    'mx-auto flex size-9 items-center justify-center rounded-md border transition-colors',
                                    changed
                                      ? 'border-status-warning bg-status-warning-tint'
                                      : 'border-transparent hover:border-border-strong hover:bg-surface-hover',
                                  )}
                                >
                                  {icon}
                                </button>
                              ) : (
                                <span
                                  className="mx-auto flex size-9 items-center justify-center"
                                  role="img"
                                  aria-label={label}
                                >
                                  {icon}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-start gap-2 rounded-md bg-status-danger-tint px-4 py-3 text-body-s text-text-secondary">
            <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
            No permission exists to edit draw results, choose winners, pay out from a pool, edit
            ledger rows or adjust balances — those capabilities are not in the platform, so no role
            can be granted them.
          </p>
          <ChangeRequestDialog
            staged={confirm}
            onClose={() => setConfirm(null)}
            onDone={() => {
              setStaged({});
              setEdit(false);
            }}
          />
        </>
      )}
    </div>
  );
}

// ── S1 roles ────────────────────────────────────────────────────────────────────────────────────

export function RolesPage() {
  const { can, admin } = useAdminSession();
  const { roles, perms } = useRbac();
  if (!can('system.read')) {
    return (
      <div className="flex flex-col gap-5">
        <AdminPageHeader
          crumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'System' },
            { label: 'Admin roles' },
          ]}
          title="Admin roles"
          demo={false}
        />
        <NoPermission permissions={['system.read']} role={admin?.roles[0] ?? null} />
      </div>
    );
  }
  const total = perms.data?.length ?? 0;
  const sensitive = new Set(
    (perms.data ?? [])
      .filter((p) => p.policy.requiresMfa || p.policy.fourEyes !== 'never')
      .map((p) => p.key),
  );
  return (
    <div className="flex flex-col gap-5" data-testid="admin-roles">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'System' }, { label: 'Admin roles' }]}
        title="Admin roles"
        description="Who can do what in the console. Roles are loaded live by the API on every request, so a revoked permission stops working immediately."
        actions={
          <Button asChild variant="secondary" size="s">
            <Link href="/admin/permissions">
              {can('admins.manage') ? 'Edit in permissions matrix' : 'Open permissions matrix'}
            </Link>
          </Button>
        }
      />
      {roles.isPending ? (
        <div className="grid gap-4 laptop:grid-cols-2 desktop:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : roles.isError || !roles.data ? (
        <QueryErrorPanel
          error={roles.error}
          onRetry={() => void roles.refetch()}
          role={admin?.roles[0]}
          what="roles"
        />
      ) : (
        <ul className="grid gap-4 laptop:grid-cols-2 desktop:grid-cols-3">
          {roles.data.roles.map((r) => {
            const sens = r.permissions.filter((p) => sensitive.has(p));
            const pending = roles.data.pendingChanges.filter((c) => c.roleKey === r.key);
            return (
              <li key={r.key}>
                <Panel
                  as="article"
                  title={r.label}
                  demo
                  className="h-full"
                  actions={
                    r.fixed ? (
                      <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                        <Lock aria-hidden className="size-3.5" /> Fixed
                      </span>
                    ) : undefined
                  }
                >
                  <div className="flex flex-col gap-3">
                    <RoleChip role={r.key} size="m" />
                    <p className="text-body-s text-text-secondary">
                      {ROLE_BLURB[r.key] ?? r.description ?? 'Custom role.'}
                    </p>
                    <p className="text-label-m text-text-primary">
                      {r.permissions.length} of {total} permissions
                      <span className="text-caption text-text-tertiary">
                        {' '}
                        · {sens.length} sensitive (2FA / four-eyes)
                      </span>
                    </p>
                    {sens.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {sens.map((p) => (
                          <li
                            key={p}
                            className="rounded-xs bg-surface-raised px-1.5 py-0.5 font-mono text-mono-s text-text-secondary"
                            title={PERMISSION_LABEL[p]}
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3">
                      <p className="text-overline uppercase text-text-tertiary">
                        Members · {r.members.length}
                      </p>
                      {r.members.length === 0 ? (
                        <p className="text-caption text-text-tertiary">No admins hold this role.</p>
                      ) : (
                        <ul className="flex flex-col gap-1.5">
                          {r.members.slice(0, 4).map((m) => (
                            <li key={m.id} className="flex items-center gap-2">
                              <Avatar initials={initialsOf(m.name)} size="s" />
                              <span className="text-body-s text-text-primary">{m.name}</span>
                              {m.isDemo && <DemoBadge size="xs" />}
                              <span className="ml-auto text-caption text-text-tertiary">
                                {m.status !== 'active'
                                  ? m.status
                                  : m.lastLoginAt
                                    ? `seen ${formatDateUTC(m.lastLoginAt)}`
                                    : 'never signed in'}
                              </span>
                            </li>
                          ))}
                          {r.members.length > 4 && (
                            <li className="text-caption text-text-tertiary">
                              +{r.members.length - 4} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                    {pending.length > 0 && (
                      <p className="rounded-md bg-brand-tint-subtle px-3 py-2 text-caption text-text-secondary">
                        Pending change requested by {pending[0]!.requestedBy} on{' '}
                        {formatDateTimeUTC(pending[0]!.createdAt)} — awaiting a second Super Admin.
                      </p>
                    )}
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
