'use client';

import type { Permission } from '@gp/shared/enums';
import {
  Ban,
  Check,
  Construction,
  KeyRound,
  Lock,
  Minus,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

import { ADMIN_NAV, resolveAdminNav } from './nav-config';
import { AdminPageHeader, NoPermission, Panel, RoleChip, roleLabel } from './primitives';
import { useAdminSession } from './session';

/** What "act" / "approve" mean per module (permissions from @gp/shared; four-eyes where the policy says so). */
const MODULE_ACTIONS: Record<
  string,
  { act: readonly Permission[]; approve: readonly Permission[] }
> = {
  overview: { act: [], approve: [] },
  users: { act: ['users.restrict', 'users.pii.read'], approve: ['users.restrict'] },
  finance: { act: ['withdrawals.reject', 'reports.export'], approve: ['withdrawals.approve'] },
  games: { act: ['games.configure'], approve: [] },
  pool: { act: ['rounds.schedule'], approve: [] },
  blockchain: { act: [], approve: [] },
  compliance: { act: ['kyc.review', 'aml.resolve'], approve: ['compliance.geo_rules.manage'] },
  affiliates: { act: ['affiliates.manage'], approve: ['affiliates.payouts.approve'] },
  marketing: {
    act: ['marketing.promotions.manage', 'marketing.cms.manage'],
    approve: ['marketing.promotions.review'],
  },
  system: { act: ['system.feature_flags.manage'], approve: ['admins.manage'] },
};

function Cell({ state }: { state: 'allowed' | 'denied' | 'na' | 'approval' }) {
  const spec = {
    allowed: { icon: Check, label: 'Allowed', cls: 'text-text-success' },
    approval: { icon: Users, label: 'Needs approval', cls: 'text-text-warning' },
    denied: { icon: Ban, label: 'Denied', cls: 'text-text-danger' },
    na: { icon: Minus, label: 'N/A', cls: 'text-text-tertiary' },
  }[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-label-s', spec.cls)}>
      <spec.icon aria-hidden className="size-3.5" />
      {spec.label}
    </span>
  );
}

/** ADM-00 "No permission": a locked sidebar group or page was opened. Nothing of the module is loaded. */
export function NoAccessPage() {
  const params = useSearchParams();
  const { admin, canAny, can } = useAdminSession();
  const area = params.get('area');
  const page = params.get('page');
  const group =
    ADMIN_NAV.find((g) => g.key === area) ?? (page ? resolveAdminNav(page).group : null);
  const child = page ? resolveAdminNav(page).child : null;
  const name = child?.label ?? group?.label ?? 'this area';
  const role = admin?.roles[0] ?? 'read_only';
  return (
    <div className="flex flex-col gap-5" data-testid="admin-no-access">
      <AdminPageHeader
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: group?.label ?? 'Restricted' },
          ...(child ? [{ label: child.label }] : []),
        ]}
        title={name}
        description="Role-based access: what you can open depends on your role. The API checks every request again."
        demo={false}
      />
      <section className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-default px-6 py-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-lg bg-gold-tint-strong text-icon-gold">
          <Lock aria-hidden className="size-7" />
        </span>
        <h2 className="text-h3 text-text-primary">
          You don&apos;t have access to {group?.label ?? name}
        </h2>
        <p className="max-w-[640px] text-body-m text-text-secondary">
          Your role, {roleLabel(role)}, doesn&apos;t include {name}. Nothing of this module was
          loaded for you — its figures, players and actions stay out of your screen.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild leadingIcon={<User aria-hidden />}>
            <Link href="/admin">Back to overview</Link>
          </Button>
          <Button asChild variant="secondary" leadingIcon={<KeyRound aria-hidden />}>
            <Link href="/admin/permissions">Role permissions</Link>
          </Button>
        </div>
        {group && (
          <p className="flex flex-wrap items-center justify-center gap-2 text-caption text-text-tertiary">
            Needs any of:
            {group.anyOf.map((p) => (
              <code
                key={p}
                className="rounded-xs bg-surface-raised px-1.5 py-0.5 font-mono text-mono-s text-text-secondary"
              >
                {p}
              </code>
            ))}
          </p>
        )}
      </section>
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title={`Your access — ${roleLabel(role)}`}
          icon={ShieldCheck}
          demo
          actions={<RoleChip role={role} />}
        >
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[520px] text-body-s" aria-label="Your access by module">
              <thead className="bg-bg-secondary">
                <tr>
                  {['Module', 'View', 'Act', 'Approve'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-2.5 text-left text-overline uppercase text-text-tertiary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ADMIN_NAV.map((g) => {
                  const view = canAny(g.anyOf);
                  const a = MODULE_ACTIONS[g.key] ?? { act: [], approve: [] };
                  const act =
                    a.act.length === 0 ? 'na' : a.act.some((p) => can(p)) ? 'allowed' : 'denied';
                  const approve =
                    a.approve.length === 0
                      ? 'na'
                      : a.approve.some((p) => can(p))
                        ? 'approval'
                        : 'denied';
                  const current = g.key === group?.key;
                  return (
                    <tr key={g.key} className="border-t border-border-subtle">
                      <th
                        scope="row"
                        className={cn(
                          'px-3 py-2.5 text-left text-label-m',
                          current
                            ? 'bg-gold-tint text-text-gold'
                            : view
                              ? 'text-text-primary'
                              : 'text-text-tertiary',
                        )}
                      >
                        {g.label}
                      </th>
                      <td className="px-3 py-2.5">
                        <Cell state={view ? 'allowed' : 'denied'} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Cell state={view ? act : act === 'na' ? 'na' : 'denied'} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Cell state={view ? approve : approve === 'na' ? 'na' : 'denied'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-caption text-text-tertiary">
            “Approve” means taking part in four-eyes decisions — always as the second admin, never
            on your own request.
          </p>
        </Panel>
        <Panel title="Who can grant access" icon={KeyRound}>
          <p className="text-body-s text-text-secondary">
            Role changes are made by a Super Admin in System › Permissions and need a second Super
            Admin to approve them (four-eyes). Every change is hash-chained in the audit log.
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-body-s text-text-secondary">
            {[
              'The module and scope you need (e.g. Finance › Withdrawals, view only)',
              'A reason linked to a ticket',
              'How long you need it',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
                {t}
              </li>
            ))}
          </ul>
          <DemoBadge size="xs" className="mt-3" />
        </Panel>
      </div>
    </div>
  );
}

/** Honest state for admin modules that are not part of this build (no fake screens). */
export function ModuleNotBuilt() {
  const path = usePathname() ?? '/admin';
  const { canAny, admin } = useAdminSession();
  const { group } = resolveAdminNav(path);
  if (group && !canAny(group.anyOf)) {
    return (
      <NoPermission
        title={`Your role doesn't include ${group.label}`}
        permissions={group.anyOf}
        role={admin?.roles[0] ?? null}
      />
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: group?.label ?? 'Not found' }]}
        title={group?.label ?? 'Page not found'}
        demo={false}
      />
      <div
        role="status"
        className="flex flex-col items-start gap-4 rounded-lg border border-border-subtle bg-surface-default p-8"
      >
        <span className="flex size-12 items-center justify-center rounded-md bg-surface-raised text-icon-muted">
          <Construction aria-hidden className="size-6" />
        </span>
        <div className="flex max-w-[640px] flex-col gap-1.5">
          <p className="text-h5 text-text-primary">
            {group
              ? `${group.label} isn't available in this build yet`
              : 'This admin page does not exist'}
          </p>
          <p className="text-body-s text-text-secondary">
            <code className="font-mono text-mono-s">{path}</code> has no screen in this build.
            Nothing is shown in its place — the console never fills gaps with illustrative figures.
          </p>
        </div>
        <Button asChild variant="secondary" size="s">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
