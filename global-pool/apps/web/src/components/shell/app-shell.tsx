'use client';

import { DEMO_BALANCES, DEMO_CURRENT_ROUND, DEMO_MY_ENTRIES, DEMO_USER } from '@gp/shared/demo';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DemoBar } from '@/components/ui/demo-badge';
import { useAuth } from '@/lib/auth';
import { publicEnv } from '@/lib/env';
import { MQ } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { FooterMega } from './footer-mega';
import { MobileDrawer, MobileTabBar, MobileTopbar } from './mobile';
import { ROUTES } from './nav-config';
import type { ShellMember } from './shell-parts';
import { Sidebar, resolveActiveHref, type ShellAuth, type SidebarMode } from './sidebar';
import { ShellOverridesProvider, useShellOverrides } from './shell-overrides';
import { Topbar } from './topbar';

const SIDEBAR_PREF_KEY = 'gp.sidebar';

/** DEMO member data for the shell until the API profile/balance endpoints exist. */
export const DEMO_SHELL_MEMBER: ShellMember = {
  handle: DEMO_USER.displayHandle,
  initials: 'NK',
  publicId: DEMO_USER.publicId,
  vipTier: 'gold',
  available: DEMO_BALANCES.available,
  notifications: 3,
  activeEntries: DEMO_MY_ENTRIES.entries,
  demo: true,
};

export interface AppShellFrameProps {
  auth: ShellAuth;
  member?: ShellMember | null;
  pathname: string;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  wrongNetwork?: boolean;
  restricted?: boolean;
  demoBar?: boolean;
  poolAmount?: string;
  /** Game pages: start with the 72 px rail (≥ 1024); the burger expands it for this visit only. */
  collapseSidebar?: boolean;
  children: React.ReactNode;
}

/**
 * Responsive casino shell (Shell/Page Layout):
 * ≥1280 expanded sidebar 240 · 1024–1279 rail 72 · <1024 drawer (burger) · <768 mobile top bar + tab bar.
 * Landmarks: skip link → <main id="main">, sidebar <aside>/<nav>, <header>, <footer>.
 */
export function AppShellFrame({
  auth,
  member,
  pathname,
  onSignIn,
  onSignUp,
  onSignOut,
  wrongNetwork = false,
  restricted = false,
  demoBar = publicEnv.demoMode,
  poolAmount = DEMO_CURRENT_ROUND.poolBalance ?? '0.00',
  collapseSidebar = false,
  children,
}: AppShellFrameProps) {
  const [mode, setMode] = React.useState<SidebarMode>('auto');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Game pages: rail by default; the burger toggles a per-visit expansion (the saved preference is untouched).
  const [gameExpanded, setGameExpanded] = React.useState(false);
  React.useEffect(() => setGameExpanded(false), [collapseSidebar]);
  const sidebarMode: SidebarMode = collapseSidebar
    ? gameExpanded
      ? 'expanded'
      : 'collapsed'
    : mode;
  const activeHref = resolveActiveHref(pathname);
  const counts = { entries: member?.activeEntries, notifications: member?.notifications };

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_PREF_KEY);
      if (saved === 'expanded' || saved === 'collapsed') setMode(saved);
    } catch {
      /* storage unavailable — keep auto */
    }
  }, []);

  React.useEffect(() => setDrawerOpen(false), [pathname]);

  const onMenuClick = () => {
    if (!window.matchMedia(MQ.lg).matches) {
      setDrawerOpen(true);
      return;
    }
    if (collapseSidebar) {
      setGameExpanded((v) => !v);
      return;
    }
    const laptop = window.matchMedia(MQ.laptop).matches;
    const next: SidebarMode = mode !== 'auto' ? 'auto' : laptop ? 'collapsed' : 'expanded';
    setMode(next);
    try {
      if (next === 'auto') window.localStorage.removeItem(SIDEBAR_PREF_KEY);
      else window.localStorage.setItem(SIDEBAR_PREF_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ '--gp-shell-top': demoBar ? '36px' : '0px' } as React.CSSProperties}
    >
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-brand px-4 py-2 text-label-m text-text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      {/* The DEMO notice stays pinned (36px); sticky shell parts offset by --gp-shell-top. */}
      {demoBar && <DemoBar className="sticky top-0 z-40" />}
      {restricted && (
        <Alert
          type="restricted"
          layout="full"
          title="Not available in your region"
          actions={
            <>
              <Button size="s" variant="secondary" asChild>
                <a href={ROUTES.wallet}>Withdraw funds</a>
              </Button>
              <Button size="s" variant="ghost" asChild>
                <a href="/legal/restricted-countries">Restricted countries</a>
              </Button>
            </>
          }
        >
          GLOBAL POOL games are not available in your region (United States). You can still view
          your account and withdraw funds.
        </Alert>
      )}
      <div className="flex flex-1">
        <Sidebar
          auth={auth}
          mode={sidebarMode}
          activeHref={activeHref}
          counts={counts}
          poolAmount={poolAmount}
          demo={publicEnv.demoMode}
          className="hidden lg:flex"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            auth={auth}
            member={member}
            onMenuClick={onMenuClick}
            menuExpanded={drawerOpen || sidebarMode === 'expanded'}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            onSignOut={onSignOut}
            wrongNetwork={wrongNetwork}
            restricted={restricted}
            className="hidden tablet:flex"
          />
          <MobileTopbar
            auth={auth}
            member={member}
            onMenuClick={() => setDrawerOpen(true)}
            menuExpanded={drawerOpen}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            restricted={restricted}
            className="tablet:hidden"
          />
          <main
            id="main"
            tabIndex={-1}
            className={cn('flex-1 px-4 pt-6 pb-16 outline-none tablet:px-6 laptop:px-8')}
          >
            <div className="mx-auto w-full max-w-desktop">{children}</div>
          </main>
          <FooterMega className="pb-[calc(var(--gp-tabbar-h)+32px)] tablet:pb-8" />
        </div>
      </div>
      <MobileTabBar
        pathname={pathname}
        notifications={member?.notifications}
        className="tablet:hidden"
      />
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        auth={auth}
        member={member}
        activeHref={activeHref}
        counts={counts}
        poolAmount={poolAmount}
        demo={publicEnv.demoMode}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        restricted={restricted}
      />
    </div>
  );
}

/** Shell wired to auth + router + page overrides (region gate, dev state preview). Used by app/(app)/layout.tsx. */
export function AppShell({
  children,
  wrongNetwork,
  restricted,
}: {
  children: React.ReactNode;
  wrongNetwork?: boolean;
  restricted?: boolean;
}) {
  return (
    <ShellOverridesProvider>
      <ConnectedShell wrongNetwork={wrongNetwork} restricted={restricted}>
        {children}
      </ConnectedShell>
    </ShellOverridesProvider>
  );
}

function ConnectedShell({
  children,
  wrongNetwork,
  restricted,
}: {
  children: React.ReactNode;
  wrongNetwork?: boolean;
  restricted?: boolean;
}) {
  const auth = useAuth();
  const pathname = usePathname();
  const overrides = useShellOverrides();
  // Until the API profile/balance endpoints exist, members see the DEMO profile (with DEMO markers).
  const user = auth.status === 'member' ? auth.user : null;
  const signedIn = Boolean(user);
  const member: ShellMember | null = overrides.previewGuest
    ? null
    : user
      ? {
          ...DEMO_SHELL_MEMBER,
          handle: user.handle ?? DEMO_SHELL_MEMBER.handle,
          initials: user.isDemo ? DEMO_SHELL_MEMBER.initials : user.initials,
        }
      : overrides.previewMember
        ? DEMO_SHELL_MEMBER
        : null;
  const status = overrides.previewGuest
    ? 'guest'
    : overrides.previewMember && !signedIn
      ? 'member'
      : auth.status;
  return (
    <AppShellFrame
      auth={status}
      member={member}
      pathname={pathname}
      onSignIn={auth.signIn}
      onSignUp={auth.signUp}
      onSignOut={() => void auth.signOut()}
      wrongNetwork={wrongNetwork}
      restricted={restricted ?? overrides.restricted}
      collapseSidebar={overrides.collapseSidebar}
    >
      {children}
    </AppShellFrame>
  );
}
