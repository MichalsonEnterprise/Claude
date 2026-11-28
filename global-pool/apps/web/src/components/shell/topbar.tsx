'use client';

import { Menu, Search } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { NetworkPill } from '@/components/domain/network-pill';
import { Button, IconButton } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { ROUTES } from './nav-config';
import type { ShellAuth } from './sidebar';
import {
  BalancePill,
  LanguageMenu,
  NotificationsButton,
  UserMenu,
  WrongNetworkButton,
  type ShellMember,
} from './shell-parts';

export interface TopbarProps {
  auth: ShellAuth;
  member?: ShellMember | null;
  onMenuClick: () => void;
  /** aria-expanded for the burger (sidebar expanded / drawer open). */
  menuExpanded?: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  wrongNetwork?: boolean;
  onSwitchNetwork?: () => void;
  /** Restricted region: Sign up / Deposit disabled. */
  restricted?: boolean;
  /** Not sticky (design-system previews). */
  embedded?: boolean;
  className?: string;
}

/**
 * Shell/Topbar Desktop (64 high, FILL): burger + logo | search (min 240 / max 400) | guest: Sign in, Sign up,
 * language · member: balance pill + Deposit, network pill (or Wrong network), notifications, avatar menu.
 * Shown from 768 px; below that the MobileTopbar takes over.
 */
export function Topbar({
  auth,
  member,
  onMenuClick,
  menuExpanded,
  onSignIn,
  onSignUp,
  onSignOut,
  wrongNetwork = false,
  onSwitchNetwork,
  restricted = false,
  embedded = false,
  className,
}: TopbarProps) {
  const [query, setQuery] = React.useState('');
  return (
    <header
      className={cn(
        'z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-border-subtle bg-bg-base/95 px-4 backdrop-blur-md laptop:gap-4 laptop:px-8',
        !embedded && 'sticky top-[var(--gp-shell-top,0px)]',
        className,
      )}
    >
      <IconButton label="Toggle navigation" aria-expanded={menuExpanded} onClick={onMenuClick}>
        <Menu aria-hidden />
      </IconButton>
      <Link
        href="/"
        aria-label="GLOBAL POOL — lobby"
        className="flex shrink-0 items-center rounded-sm"
      >
        <Logo height={34} title="" />
      </Link>

      <form
        role="search"
        className="mx-auto hidden w-full max-w-[400px] min-w-[200px] flex-1 lg:block"
        // Searches the games lobby (`/games?q=…`), which filters by name.
        action={ROUTES.games}
        method="get"
      >
        <SearchInput
          shortcut
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          aria-label="Search games and rounds"
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2 laptop:gap-3">
        <IconButton label="Search games and rounds" asChild className="lg:hidden">
          <Link href={ROUTES.games}>
            <Search aria-hidden />
          </Link>
        </IconButton>
        {auth === 'loading' && (
          <>
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </>
        )}
        {auth === 'guest' && (
          <>
            <Button variant="ghost" onClick={onSignIn}>
              Sign in
            </Button>
            <Button
              onClick={onSignUp}
              disabled={restricted}
              title={restricted ? 'Not available in your region' : undefined}
            >
              Sign up
            </Button>
            <LanguageMenu variant="icon" />
          </>
        )}
        {auth === 'member' && member && (
          <>
            <BalancePill member={member} depositDisabled={restricted} />
            {wrongNetwork ? (
              <WrongNetworkButton onSwitch={onSwitchNetwork} compact />
            ) : (
              <NetworkPill chain="arbitrum" className="hidden laptop:inline-flex" />
            )}
            <NotificationsButton count={member.notifications} />
            <UserMenu member={member} onSignOut={onSignOut} />
          </>
        )}
      </div>
    </header>
  );
}
