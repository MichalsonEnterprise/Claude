'use client';

import { formatUSDT } from '@gp/shared/money';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { Avatar } from '@/components/ui/avatar';
import { AgeBadge, CountBadge, VipBadge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { ROUTES, TAB_NAV, isActive } from './nav-config';
import { BalancePill, LanguageMenu, LicenceNotice, type ShellMember } from './shell-parts';
import { SidebarNav, SidebarPromoTiles, type ShellAuth, type SidebarCounts } from './sidebar';

// ── MobileTopbar (Shell/Topbar Mobile, 390×56) ──────────────────────────────────────────────────

export function MobileTopbar({
  auth,
  member,
  onMenuClick,
  menuExpanded,
  onSignIn,
  onSignUp,
  restricted = false,
  embedded = false,
  className,
}: {
  auth: ShellAuth;
  member?: ShellMember | null;
  onMenuClick: () => void;
  menuExpanded?: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  restricted?: boolean;
  embedded?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-base/95 px-3 backdrop-blur-md',
        !embedded && 'sticky top-[var(--gp-shell-top,0px)]',
        className,
      )}
    >
      <Link
        href="/"
        aria-label="GLOBAL POOL — lobby"
        className="flex shrink-0 items-center rounded-sm p-1"
      >
        <Logo variant="mark" height={26} title="" />
      </Link>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {auth === 'loading' && <Skeleton className="h-10 w-40 rounded-md" />}
        {auth === 'guest' && (
          <>
            <Button variant="ghost" size="m" className="px-3" onClick={onSignIn}>
              Sign in
            </Button>
            <Button size="m" className="px-3" onClick={onSignUp} disabled={restricted}>
              Sign up
            </Button>
          </>
        )}
        {auth === 'member' && member && (
          <BalancePill member={member} depositDisabled={restricted} compact />
        )}
      </div>
      <IconButton
        label="Open menu"
        aria-expanded={menuExpanded}
        size="l"
        className="-mr-1 size-11"
        onClick={onMenuClick}
      >
        <Menu aria-hidden />
      </IconButton>
    </header>
  );
}

// ── MobileTabBar (Nav/Mobile Tab Bar) ───────────────────────────────────────────────────────────

export function MobileTabBar({
  pathname,
  notifications = 0,
  embedded = false,
  className,
}: {
  pathname: string;
  notifications?: number;
  embedded?: boolean;
  className?: string;
}) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'z-30 border-t border-border-subtle bg-bg-secondary/95 pb-safe backdrop-blur-md',
        !embedded && 'fixed inset-x-0 bottom-0',
        className,
      )}
    >
      <ul className="grid h-14 grid-cols-5">
        {TAB_NAV.map((tab) => {
          const active = [tab.href, ...(tab.match ?? [])].some((h) => isActive(h, pathname));
          const Icon = tab.icon;
          const count = tab.countKey === 'notifications' ? notifications : 0;
          return (
            <li key={tab.id} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-text-brand' : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                {active && (
                  <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand" />
                )}
                <span className="relative">
                  <Icon aria-hidden className="size-[22px]" />
                  {count > 0 && (
                    <CountBadge
                      count={count}
                      className="absolute -top-1.5 -right-2.5"
                      aria-label={`${count} unread`}
                    />
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── MobileDrawer (Shell/Mobile Drawer) ──────────────────────────────────────────────────────────

export interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auth: ShellAuth;
  member?: ShellMember | null;
  activeHref: string | null;
  counts?: SidebarCounts;
  /** null = loading (skeleton) · false = couldn't be loaded ("—"). */
  poolAmount: string | null | false;
  demo?: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  restricted?: boolean;
}

/** Full-height navigation sheet (< 1024 px): header, account block, 44px nav items, pinned footer. */
export function MobileDrawer({
  open,
  onOpenChange,
  auth,
  member,
  activeHref,
  counts,
  poolAmount,
  demo = true,
  onSignIn,
  onSignUp,
  restricted = false,
}: MobileDrawerProps) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="max-w-[390px]">
        <div className="flex h-14 shrink-0 items-center border-b border-border-subtle px-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation and account</SheetDescription>
          <Logo height={30} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border-subtle p-4">
            {auth === 'member' && member ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={member.initials} size="l" tone="brand" />
                  <div className="min-w-0">
                    <p className="truncate text-label-m">{member.handle}</p>
                    {member.vipTier && <VipBadge tier={member.vipTier} className="mt-1" />}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md bg-surface-default px-3 py-2.5">
                  <div>
                    <p className="text-caption text-text-tertiary">Available</p>
                    <p className="flex items-center gap-2 text-number-s tabular-nums">
                      {member.available === null ? (
                        <Skeleton className="h-5 w-24" />
                      ) : member.available === false ? (
                        <span className="text-text-tertiary">Couldn’t load</span>
                      ) : (
                        formatUSDT(member.available)
                      )}
                      {member.demo && <DemoBadge size="xs" />}
                    </p>
                  </div>
                  <Button asChild={!restricted} size="m" disabled={restricted}>
                    {restricted ? (
                      'Deposit'
                    ) : (
                      <Link href={ROUTES.deposit} onClick={close}>
                        Deposit
                      </Link>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  size="l"
                  onClick={() => {
                    close();
                    onSignIn();
                  }}
                >
                  Sign in
                </Button>
                <Button
                  size="l"
                  disabled={restricted}
                  onClick={() => {
                    close();
                    onSignUp();
                  }}
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>
          <div className="px-4 pt-4">
            <SidebarPromoTiles poolAmount={poolAmount} demo={demo} />
          </div>
          <nav aria-label="Main" className="px-4 py-3">
            <SidebarNav
              auth={auth}
              activeHref={activeHref}
              counts={counts}
              density="drawer"
              onNavigate={close}
            />
          </nav>
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-t border-border-subtle p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <LanguageMenu />
          <div className="flex items-center gap-2">
            <AgeBadge />
            <LicenceNotice className="flex-1" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
