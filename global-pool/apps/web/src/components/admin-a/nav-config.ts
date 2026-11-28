/**
 * Admin sidebar (Nav/Admin Sidebar) — the 10 groups of the brief, in order. Access is derived from the signed-in
 * admin's live permissions (RBAC from the API); groups without access show the lock ("No access") state and lead to
 * the no-permission page instead of the module. The API enforces every permission again — this is only a hint.
 *
 * Other admin modules (admin-b: Finance, Global Pool, Compliance, Blockchain, Games …) add their child pages here
 * additively — keep `href` values under /admin and pages under app/admin/(console)/.
 */
import type { Permission } from '@gp/shared/enums';
import {
  BadgePercent,
  Blocks,
  Coins,
  Gamepad2,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavChild {
  label: string;
  href: string;
  /** Any of these permissions grants the page. */
  anyOf: readonly Permission[];
  /** Live count key shown as a badge (from the topbar/sidebar data). */
  countKey?: 'approvals' | 'alerts' | 'kycPending' | 'amlOpen' | 'underReview';
}

export interface AdminNavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  anyOf: readonly Permission[];
  countKey?: AdminNavChild['countKey'];
  children?: AdminNavChild[];
  /** Built by admin-a in this batch (other groups are owned by other modules). */
  owner?: 'admin-a' | 'admin-b';
  /**
   * Module not in this build yet: the sidebar shows it as "Soon" (never as an open, clickable module) and the command
   * palette leaves it out — its URL only reaches the honest "not in this build" state (Q13).
   */
  planned?: true;
}

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    href: '/admin',
    anyOf: ['dashboard.read'],
    owner: 'admin-a',
    children: [
      { label: 'Dashboard', href: '/admin', anyOf: ['dashboard.read'] },
      {
        label: 'Approvals',
        href: '/admin/approvals',
        anyOf: ['dashboard.read'],
        countKey: 'approvals',
      },
      { label: 'Alerts', href: '/admin/alerts', anyOf: ['dashboard.read'], countKey: 'alerts' },
    ],
  },
  {
    key: 'users',
    label: 'User Management',
    icon: Users,
    href: '/admin/users',
    anyOf: ['users.read'],
    owner: 'admin-a',
    children: [{ label: 'Users', href: '/admin/users', anyOf: ['users.read'] }],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: Coins,
    href: '/admin/finance',
    anyOf: ['ledger.read', 'deposits.read', 'withdrawals.read'],
    owner: 'admin-b',
    // admin-b (ADM-F1…F8; F9 Export CSV is a modal on these pages)
    children: [
      { label: 'Deposits', href: '/admin/finance/deposits', anyOf: ['deposits.read'] },
      {
        label: 'Withdrawals',
        href: '/admin/finance/withdrawals',
        anyOf: ['withdrawals.read'],
        countKey: 'underReview',
      },
      { label: 'Platform fees', href: '/admin/finance/fees', anyOf: ['ledger.read'] },
      { label: 'Pool accounting', href: '/admin/finance/pool-accounting', anyOf: ['ledger.read'] },
      { label: 'Ledger', href: '/admin/finance/ledger', anyOf: ['ledger.read'] },
      {
        label: 'Reconciliation',
        href: '/admin/finance/reconciliation',
        anyOf: ['reconciliation.read'],
      },
      { label: 'Refunds', href: '/admin/finance/refunds', anyOf: ['ledger.read'] },
      { label: 'Reports', href: '/admin/finance/reports', anyOf: ['ledger.read'] },
    ],
  },
  {
    key: 'games',
    label: 'Game Management',
    icon: Gamepad2,
    href: '/admin/games',
    anyOf: ['games.read'],
    planned: true,
  },
  {
    key: 'pool',
    label: 'Global Pool Management',
    icon: Waves,
    href: '/admin/pool',
    anyOf: ['rounds.read'],
    owner: 'admin-b',
    // admin-b (ADM-P1…P10)
    children: [
      { label: 'Overview', href: '/admin/pool', anyOf: ['rounds.read'] },
      { label: 'Pool balance', href: '/admin/pool/balance', anyOf: ['rounds.read'] },
      { label: 'Active round', href: '/admin/pool/active', anyOf: ['rounds.read'] },
      { label: 'Historical rounds', href: '/admin/pool/rounds', anyOf: ['rounds.read'] },
      { label: 'Participants', href: '/admin/pool/participants', anyOf: ['rounds.read'] },
      { label: 'Prize distribution', href: '/admin/pool/prizes', anyOf: ['rounds.read'] },
      { label: 'VRF status', href: '/admin/pool/vrf', anyOf: ['rounds.read'] },
      { label: 'Settlement', href: '/admin/pool/settlement', anyOf: ['rounds.read'] },
      { label: 'Refunds', href: '/admin/pool/refunds', anyOf: ['rounds.read'] },
      { label: 'Policy & breaker', href: '/admin/pool/policy', anyOf: ['rounds.read'] },
    ],
  },
  {
    key: 'blockchain',
    label: 'Blockchain Management',
    icon: Blocks,
    href: '/admin/blockchain',
    anyOf: ['system.read', 'deposits.read'],
    planned: true,
  },
  {
    key: 'compliance',
    label: 'Compliance',
    icon: ShieldCheck,
    href: '/admin/compliance',
    anyOf: ['kyc.read', 'aml.read'],
    countKey: 'kycPending',
    owner: 'admin-b',
    // admin-b (ADM-C1, ADM-C2)
    children: [
      {
        label: 'KYC queue',
        href: '/admin/compliance/kyc',
        anyOf: ['kyc.read'],
        countKey: 'kycPending',
      },
      {
        label: 'AML alerts',
        href: '/admin/compliance/aml',
        anyOf: ['aml.read'],
        countKey: 'amlOpen',
      },
    ],
  },
  {
    key: 'affiliates',
    label: 'Affiliate Management',
    icon: BadgePercent,
    href: '/admin/affiliates',
    anyOf: ['affiliates.read'],
    planned: true,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    href: '/admin/marketing',
    anyOf: ['marketing.promotions.read'],
    planned: true,
  },
  {
    key: 'system',
    label: 'System',
    icon: Settings,
    href: '/admin/audit',
    anyOf: ['system.read', 'audit.read'],
    owner: 'admin-a',
    children: [
      { label: 'Admin roles', href: '/admin/roles', anyOf: ['system.read'] },
      { label: 'Permissions', href: '/admin/permissions', anyOf: ['system.read'] },
      { label: 'Audit logs', href: '/admin/audit', anyOf: ['audit.read'] },
    ],
  },
];

/** The group (and child) that owns a pathname — most specific href wins. */
export function resolveAdminNav(pathname: string): {
  group: AdminNavGroup | null;
  child: AdminNavChild | null;
} {
  let best: { group: AdminNavGroup | null; child: AdminNavChild | null; len: number } = {
    group: null,
    child: null,
    len: -1,
  };
  const matches = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);
  for (const g of ADMIN_NAV) {
    if (matches(g.href) && g.href.length > best.len)
      best = { group: g, child: null, len: g.href.length };
    for (const c of g.children ?? []) {
      if (matches(c.href) && c.href.length >= best.len)
        best = { group: g, child: c, len: c.href.length };
    }
  }
  return { group: best.group, child: best.child };
}

/** Command-palette destinations (pages) — filtered by permission at runtime. */
export function adminDestinations(): {
  label: string;
  group: string;
  href: string;
  anyOf: readonly Permission[];
}[] {
  return ADMIN_NAV.filter((g) => !g.planned).flatMap((g) =>
    g.children && g.children.length > 0
      ? g.children.map((c) => ({ label: c.label, group: g.label, href: c.href, anyOf: c.anyOf }))
      : [{ label: g.label, group: g.label, href: g.href, anyOf: g.anyOf }],
  );
}

/** Admin Tab Bar (< 768): Overview · Approvals · KYC · Alerts (+ More). */
export const ADMIN_TABS: readonly { label: string; href: string; anyOf: readonly Permission[] }[] =
  [
    { label: 'Overview', href: '/admin', anyOf: ['dashboard.read'] },
    { label: 'Approvals', href: '/admin/approvals', anyOf: ['dashboard.read'] },
    { label: 'KYC', href: '/admin/compliance/kyc', anyOf: ['kyc.read'] },
    { label: 'Alerts', href: '/admin/alerts', anyOf: ['dashboard.read'] },
  ];

/** The tabs this admin's role can open — permission-aware like the sidebar (Q11: no KYC tab for Finance). */
export function visibleAdminTabs(canAny: (permissions: readonly Permission[]) => boolean) {
  return ADMIN_TABS.filter((t) => canAny(t.anyOf));
}
