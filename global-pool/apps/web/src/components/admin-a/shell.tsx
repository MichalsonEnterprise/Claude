'use client';

/**
 * Admin shell (ADM-00): Nav/Admin Sidebar 248 (dense groups, role-based lock state, signed-in admin card) +
 * Nav/Admin Topbar 64 (environment badge, ⌘K command palette, four-eyes approvals count, alerts, admin menu).
 * < 1280: the sidebar becomes a drawer (burger in the top bar). < 768: mobile admin top bar + Admin Tab Bar
 * (Overview · Approvals · KYC · Alerts · More) — the MOB-11 subset.
 */
import { formatTimeUTC } from '@gp/shared/format';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  IdCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  Timer,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { Avatar } from '@/components/ui/avatar';
import { CountBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge, DemoBar } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { statePreviewEnabled } from '@/lib/home-preview';
import { cn } from '@/lib/utils';

import { CommandPalette, useCommandPaletteShortcut } from './command-palette';
import { useAlerts, useApprovalsInbox, useDashboard, useSystemHealth } from './hooks';
import { ADMIN_NAV, resolveAdminNav, type AdminNavChild, type AdminNavGroup } from './nav-config';
import { initialsOf, RoleChip } from './primitives';
import { ADMIN_WARNING_SECONDS, useAdminSession } from './session';

// ── live counts ─────────────────────────────────────────────────────────────────────────────────

export interface AdminCounts {
  approvals?: number;
  alerts?: number;
  kycPending?: number;
  amlOpen?: number;
  underReview?: number;
}

function useAdminCounts(): AdminCounts {
  const { can } = useAdminSession();
  const inbox = useApprovalsInbox('open', can('dashboard.read'));
  const alerts = useAlerts(can('dashboard.read'));
  const dash = useDashboard(can('dashboard.read'));
  return {
    approvals: inbox.data?.counts.waiting_for_me,
    alerts: alerts.data?.counts.unacknowledged,
    kycPending: dash.data?.kycPending,
    amlOpen: dash.data?.amlOpenAlerts,
    underReview: dash.data?.withdrawalsUnderReview,
  };
}

function useEnvLabel() {
  const health = useSystemHealth();
  const env = health.data?.environment ?? 'development';
  return {
    short: env === 'production' ? 'PROD' : 'DEMO',
    long: env === 'production' ? 'Production · testnet' : `DEMO · ${env} · testnet`,
    version: health.data?.version ?? '0.1.0',
  };
}

// ── sidebar ─────────────────────────────────────────────────────────────────────────────────────

const groupBase =
  'group/nav flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-body-s-strong transition-colors duration-150 ease-standard';

function SidebarGroup({
  group,
  pathname,
  counts,
  onNavigate,
}: {
  group: AdminNavGroup;
  pathname: string;
  counts: AdminCounts;
  onNavigate?: () => void;
}) {
  const { canAny } = useAdminSession();
  const allowed = canAny(group.anyOf);
  const { group: activeGroup, child: activeChild } = resolveAdminNav(pathname);
  const active = activeGroup?.key === group.key;
  const [open, setOpen] = React.useState(active);
  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);
  const Icon = group.icon;
  const count = group.countKey ? counts[group.countKey] : undefined;
  const hasChildren = (group.children?.length ?? 0) > 1 && allowed;

  if (!allowed) {
    return (
      <li>
        <Link
          href={`/admin/no-access?area=${group.key}`}
          onClick={onNavigate}
          aria-label={`${group.label} — no access for your role`}
          className={cn(groupBase, 'text-text-disabled hover:bg-surface-hover')}
        >
          <Icon aria-hidden className="size-[18px] shrink-0" />
          <span className="flex-1 truncate">{group.label}</span>
          <Lock aria-hidden className="size-3.5 shrink-0" />
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={group.href}
          onClick={onNavigate}
          aria-current={active && !activeChild ? 'page' : undefined}
          className={cn(
            groupBase,
            active
              ? 'bg-brand-tint text-text-brand'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
          )}
        >
          <Icon
            aria-hidden
            className={cn('size-[18px] shrink-0', active ? 'text-icon-brand' : 'text-icon-muted')}
          />
          <span className="flex-1 truncate">{group.label}</span>
          {count !== undefined && count > 0 && <CountBadge count={count} size="m" />}
          {!hasChildren && <ChevronRight aria-hidden className="size-4 shrink-0 text-icon-muted" />}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${group.label}`}
            className="ml-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover hover:text-icon-default"
          >
            <ChevronDown
              aria-hidden
              className={cn('size-4 transition-transform', !open && '-rotate-90')}
            />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul className="mt-0.5 ml-[26px] flex flex-col gap-0.5 border-l border-border-subtle pl-2">
          {group.children!.map((c) => (
            <SidebarChild
              key={c.href + c.label}
              child={c}
              active={activeChild?.href === c.href}
              counts={counts}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SidebarChild({
  child,
  active,
  counts,
  onNavigate,
}: {
  child: AdminNavChild;
  active: boolean;
  counts: AdminCounts;
  onNavigate?: () => void;
}) {
  const { canAny } = useAdminSession();
  const allowed = canAny(child.anyOf);
  const count = child.countKey ? counts[child.countKey] : undefined;
  return (
    <li>
      <Link
        href={allowed ? child.href : `/admin/no-access?page=${encodeURIComponent(child.href)}`}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-8 items-center gap-2 rounded-sm px-2 text-body-s transition-colors',
          !allowed
            ? 'text-text-disabled'
            : active
              ? 'bg-surface-raised text-text-primary'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
      >
        <span className="flex-1 truncate">{child.label}</span>
        {!allowed && <Lock aria-hidden className="size-3" />}
        {allowed && count !== undefined && count > 0 && (
          <CountBadge count={count} tone="neutral" size="m" />
        )}
      </Link>
    </li>
  );
}

function SignedInCard() {
  const { admin, idleDeadline, canAny } = useAdminSession();
  if (!admin) return null;
  const modules = ADMIN_NAV.filter((g) => canAny(g.anyOf)).length;
  const role = admin.roles[0] ?? 'read_only';
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-3"
      data-testid="admin-signed-in"
    >
      <div className="flex items-center gap-2.5">
        <Avatar initials={initialsOf(admin.name)} size="m" status="online" tone="brand" />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 text-label-m text-text-primary">
            <span className="truncate">{admin.name}</span>
            {admin.isDemo && <DemoBadge size="xs" />}
          </span>
          <span className="text-caption text-text-tertiary">
            {idleDeadline
              ? `Session · idle sign-out ${formatTimeUTC(new Date(idleDeadline))}`
              : 'Session active'}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RoleChip role={role} />
        <span className="text-caption text-text-tertiary">
          {modules} of {ADMIN_NAV.length} modules
        </span>
      </div>
    </div>
  );
}

export function AdminSidebar({
  onNavigate,
  embedded = false,
}: {
  onNavigate?: () => void;
  embedded?: boolean;
}) {
  const pathname = usePathname() ?? '/admin';
  const counts = useAdminCounts();
  const env = useEnvLabel();
  return (
    <nav
      aria-label="Admin navigation"
      className={cn(
        'flex h-full w-full flex-col bg-bg-secondary',
        !embedded && 'border-r border-border-subtle',
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="GLOBAL POOL admin console — overview"
        >
          <Logo variant="mark" height={22} title="" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-label-m font-bold text-text-primary">GLOBAL POOL</span>
            <span className="text-caption text-text-tertiary">Admin console</span>
          </span>
        </Link>
        <span className="ml-auto rounded-xs border border-status-warning/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-text-warning">
          {env.short}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {ADMIN_NAV.map((g) => (
          <SidebarGroup
            key={g.key}
            group={g}
            pathname={pathname}
            counts={counts}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      <div className="flex shrink-0 flex-col gap-2 p-2">
        <SignedInCard />
        <p className="flex items-center gap-1.5 px-1 pb-1 text-caption text-text-tertiary">
          <span aria-hidden className="size-1.5 rounded-full bg-status-warning" />
          {env.long} · v{env.version}
        </p>
      </div>
    </nav>
  );
}

// ── topbar ──────────────────────────────────────────────────────────────────────────────────────

function AdminMenu() {
  const { admin, logout } = useAdminSession();
  if (!admin) return null;
  const role = admin.roles[0] ?? 'read_only';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-11 items-center gap-2 rounded-md px-1.5 hover:bg-surface-hover"
        aria-label={`Admin menu — ${admin.name}`}
        data-testid="admin-menu"
      >
        <Avatar initials={initialsOf(admin.name)} size="m" status="online" tone="brand" />
        <span className="hidden flex-col items-start leading-tight laptop:flex">
          <span className="flex items-center gap-1.5 text-label-m text-text-primary">
            {admin.name} {admin.isDemo && <DemoBadge size="xs" />}
          </span>
          <span className="text-caption text-text-tertiary">{admin.title ?? role}</span>
        </span>
        <ChevronDown aria-hidden className="hidden size-4 text-icon-muted laptop:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-label-m text-text-primary">{admin.name}</span>
          <span className="text-caption text-text-tertiary">{admin.email}</span>
          <span className="pt-1">
            <RoleChip role={role} />
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/permissions">My role permissions</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/audit?actorId=${admin.id}`}>My audit trail</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void logout()} data-testid="admin-sign-out">
          <LogOut aria-hidden className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ApprovalsButton({ count }: { count?: number }) {
  return (
    <Button
      asChild
      variant="secondary"
      size="m"
      className="border-border-brand bg-brand-tint-subtle hover:bg-brand-tint"
    >
      <Link href="/admin/approvals" aria-label={`Approvals — ${count ?? 0} waiting for you`}>
        <UserCheck aria-hidden className="text-icon-brand" />
        <span className="hidden tablet:inline">Approvals</span>
        <span className="hidden text-caption font-normal text-text-tertiary desktop:inline">
          4-eyes
        </span>
        {count !== undefined && count > 0 && <CountBadge count={count} size="m" />}
      </Link>
    </Button>
  );
}

function AlertsButton({ count }: { count?: number }) {
  return (
    <Link
      href="/admin/alerts"
      aria-label={`Alerts — ${count ?? 0} unacknowledged`}
      className="relative flex size-11 items-center justify-center rounded-md text-icon-default hover:bg-surface-hover"
    >
      <ShieldAlert aria-hidden className="size-5" />
      {count !== undefined && count > 0 && (
        <CountBadge count={count} className="absolute top-1 right-1" />
      )}
    </Link>
  );
}

export function AdminTopbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const counts = useAdminCounts();
  const env = useEnvLabel();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-subtle bg-bg-base/95 px-4 backdrop-blur laptop:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open admin navigation"
        className="flex size-11 items-center justify-center rounded-md text-icon-default hover:bg-surface-hover laptop:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <span
        className="hidden h-7 shrink-0 items-center gap-1.5 rounded-full border border-status-warning/60 bg-status-warning-tint px-3 text-label-s text-text-warning tablet:inline-flex"
        title="Environment"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-status-warning" />
        {env.long}
      </span>
      <button
        type="button"
        onClick={onSearch}
        data-testid="admin-search-trigger"
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border-default bg-surface-default px-3 text-left text-body-s text-text-tertiary hover:border-border-strong laptop:max-w-[420px]"
      >
        <Search aria-hidden className="size-[18px] shrink-0 text-icon-muted" />
        <span className="truncate">Search users, pages…</span>
        <kbd className="ml-auto hidden rounded-xs border border-border-default px-1.5 font-mono text-mono-s tablet:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <ApprovalsButton count={counts.approvals} />
        <AlertsButton count={counts.alerts} />
        <AdminMenu />
      </div>
    </header>
  );
}

// ── mobile chrome (MOB-11) ──────────────────────────────────────────────────────────────────────

function MobileTopbar({ onSearch }: { onSearch: () => void }) {
  const counts = useAdminCounts();
  const env = useEnvLabel();
  const { admin } = useAdminSession();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-subtle bg-bg-secondary px-3">
      <Link href="/admin" className="flex items-center gap-2" aria-label="Admin overview">
        <Logo variant="mark" height={22} title="" />
        <span className="text-label-l text-text-primary">Admin</span>
      </Link>
      <span className="rounded-xs border border-status-warning/60 px-1.5 py-0.5 text-[10px] font-semibold text-text-warning">
        {env.short}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search"
          className="flex size-11 items-center justify-center rounded-md text-icon-default hover:bg-surface-hover"
        >
          <Search aria-hidden className="size-5" />
        </button>
        <Link
          href="/admin/alerts"
          aria-label={`Alerts — ${counts.alerts ?? 0} unacknowledged`}
          className="relative flex size-11 items-center justify-center rounded-md text-icon-default hover:bg-surface-hover"
        >
          <Bell aria-hidden className="size-5" />
          {counts.alerts !== undefined && counts.alerts > 0 && (
            <CountBadge count={counts.alerts} className="absolute top-1.5 right-1.5" />
          )}
        </Link>
        {admin && <AdminMenuCompact />}
      </div>
    </header>
  );
}

function AdminMenuCompact() {
  const { admin, logout } = useAdminSession();
  if (!admin) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-11 items-center justify-center rounded-md hover:bg-surface-hover"
        aria-label={`Admin menu — ${admin.name}`}
      >
        <Avatar initials={initialsOf(admin.name)} size="s" tone="brand" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-label-m">{admin.name}</span>
          <RoleChip role={admin.roles[0] ?? 'read_only'} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void logout()}>
          <LogOut aria-hidden className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname() ?? '/admin';
  const counts = useAdminCounts();
  const tabs = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard, count: undefined },
    { label: 'Approvals', href: '/admin/approvals', icon: UserCheck, count: counts.approvals },
    { label: 'KYC', href: '/admin/compliance/kyc', icon: IdCard, count: counts.kycPending },
    { label: 'Alerts', href: '/admin/alerts', icon: ShieldAlert, count: counts.alerts },
  ];
  const isActive = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav
      aria-label="Admin sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg-secondary pb-safe tablet:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const on = isActive(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className="flex h-14 flex-col items-center justify-center gap-0.5"
              >
                <span className="relative">
                  <t.icon
                    aria-hidden
                    className={cn('size-6', on ? 'text-icon-brand' : 'text-icon-muted')}
                  />
                  {t.count !== undefined && t.count > 0 && (
                    <CountBadge count={t.count} className="absolute -top-1.5 -right-3" />
                  )}
                </span>
                <span className={cn('text-label-s', on ? 'text-text-brand' : 'text-text-tertiary')}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex h-14 w-full flex-col items-center justify-center gap-0.5"
          >
            <Menu aria-hidden className="size-6 text-icon-muted" />
            <span className="text-label-s text-text-tertiary">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

// ── session timeout warning (ADM-01) ────────────────────────────────────────────────────────────

function useNow(active: boolean) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/**
 * `preview` (dev / NEXT_PUBLIC_STATE_PREVIEW builds only, `?preview=timeout`): shows the warning with a deadline
 * 1 min 42 s ahead for visual QA; its buttons only close the preview.
 */
export function SessionTimeoutDialog({ preview = false }: { preview?: boolean }) {
  const session = useAdminSession();
  const [previewDeadline] = React.useState(() => Date.now() + 102_000);
  const [previewOpen, setPreviewOpen] = React.useState(preview);
  const warningOpen = preview ? previewOpen : session.warningOpen;
  const idleDeadline = preview ? previewDeadline : session.idleDeadline;
  const staySignedIn = preview
    ? () => Promise.resolve(setPreviewOpen(false))
    : session.staySignedIn;
  const logout = preview ? () => Promise.resolve(setPreviewOpen(false)) : session.logout;
  const now = useNow(warningOpen);
  const [busy, setBusy] = React.useState(false);
  const left = Math.max(0, Math.floor(((idleDeadline ?? now) - now) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = Math.min(100, (left / ADMIN_WARNING_SECONDS) * 100);
  return (
    <Dialog open={warningOpen}>
      <DialogContent
        size="s"
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        data-testid="admin-timeout-warning"
      >
        <div className="flex flex-col gap-4 px-7 pt-7 pb-6">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-md bg-status-warning-tint text-text-warning">
              <Timer aria-hidden className="size-[22px]" />
            </span>
            <DemoBadge size="s" />
          </div>
          <DialogTitle className="text-h4">Still there?</DialogTitle>
          <p className="flex items-baseline gap-2" aria-live="polite">
            <span className="font-mono text-number-xl tabular-nums text-text-primary">
              {mm}:{ss}
            </span>
            <span className="text-body-s text-text-secondary">
              until sign-out at{' '}
              {idleDeadline ? formatTimeUTC(new Date(idleDeadline), { seconds: true }) : '—'}
            </span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
            <div className="h-full rounded-full bg-status-warning" style={{ width: `${pct}%` }} />
          </div>
          <DialogDescription>
            Admin sessions end after 15 minutes without activity. Unsent dialogs are discarded at
            sign-out — nothing is submitted for you.
          </DialogDescription>
          <p className="rounded-md bg-surface-raised px-3 py-2.5 text-caption text-text-secondary">
            Staying signed in needs no new code. Approvals, restrictions and exports still ask for a
            fresh 2FA code.
          </p>
        </div>
        <DialogFooter className="px-7">
          <Button
            variant="secondary"
            size="l"
            block
            leadingIcon={<LogOut aria-hidden />}
            onClick={() => void logout()}
          >
            Sign out now
          </Button>
          <Button
            size="l"
            block
            loading={busy}
            onClick={() => {
              setBusy(true);
              void staySignedIn().finally(() => setBusy(false));
            }}
          >
            Stay signed in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── frame ───────────────────────────────────────────────────────────────────────────────────────

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  const openPalette = React.useCallback(() => setPalette(true), []);
  useCommandPaletteShortcut(openPalette);
  const pathname = usePathname();
  React.useEffect(() => setDrawer(false), [pathname]);
  const [timeoutPreview, setTimeoutPreview] = React.useState(false);
  React.useEffect(() => {
    if (
      statePreviewEnabled &&
      new URLSearchParams(window.location.search).get('preview') === 'timeout'
    ) {
      setTimeoutPreview(true);
    }
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg-base" data-admin-shell>
      <DemoBar />
      <div className="flex flex-1">
        <aside className="hidden w-[248px] shrink-0 border-r border-border-subtle bg-bg-secondary laptop:block">
          <div className="sticky top-0 h-dvh">
            <AdminSidebar embedded />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="hidden tablet:block">
            <AdminTopbar onMenu={() => setDrawer(true)} onSearch={openPalette} />
          </div>
          <div className="tablet:hidden">
            <MobileTopbar onSearch={openPalette} />
          </div>
          <main
            id="main"
            className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-5 pb-24 tablet:px-6 tablet:pb-12 laptop:px-7 laptop:pt-6"
          >
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar onMore={() => setDrawer(true)} />
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SheetDescription className="sr-only">
            All admin modules available to your role
          </SheetDescription>
          <AdminSidebar embedded onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>
      <CommandPalette open={palette} onOpenChange={setPalette} />
      <SessionTimeoutDialog />
      {timeoutPreview && <SessionTimeoutDialog preview />}
    </div>
  );
}
