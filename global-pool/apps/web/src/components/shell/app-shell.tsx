'use client';

import { DEMO_BALANCES, DEMO_CURRENT_ROUND, DEMO_MY_ENTRIES, DEMO_USER } from '@gp/shared/demo';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DemoBar } from '@/components/ui/demo-badge';
import { SecurityWarning } from '@/components/ui/security-warning';
import { toast } from '@/components/ui/sonner';
import { accountApi, accountKeys } from '@/lib/api/account';
import { useApiConnectivity } from '@/lib/api/connectivity';
import { getCurrentRound, getMyRoundEntries } from '@/lib/api/pool';
import { walletApi, walletKeys } from '@/lib/api/wallet';
import { useAuth } from '@/lib/auth';
import { DATA_SOURCE } from '@/lib/data/source';
import { publicEnv } from '@/lib/env';
import { MQ } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { isWrongNetwork, switchToMvpChain, useInjectedWallet } from '@/lib/wallet/injected';

import { FooterMega } from './footer-mega';
import { MobileDrawer, MobileTabBar, MobileTopbar } from './mobile';
import { ROUTES } from './nav-config';
import type { ShellMember } from './shell-parts';
import { Sidebar, resolveActiveHref, type ShellAuth, type SidebarMode } from './sidebar';
import { ShellOverridesProvider, useShellOverrides } from './shell-overrides';
import { Topbar } from './topbar';

const SIDEBAR_PREF_KEY = 'gp.sidebar';

/**
 * DEMO member chrome: the dev `?state=member` preview and the mock data source (NEXT_PUBLIC_DATA_SOURCE ≠ api).
 * With the API, signed-in members see their own balance, entries and unread notifications (`useLiveShell`).
 */
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
  /** ERR-07: the member's linked wallet is connected on another chain (topbar button ≥ 768, banner below). */
  wrongNetwork?: boolean;
  /** "Switch to Arbitrum" on the wrong-network button / banner. */
  onSwitchNetwork?: () => void;
  /** Chain id the wallet is on (named in the wrong-network banner). */
  walletChainId?: number | null;
  restricted?: boolean;
  /** Country named in the region banner (from the page's region check); omitted → no country is named. */
  regionName?: string | null;
  demoBar?: boolean;
  /** null = the live round is still loading; false = it couldn't be loaded. */
  poolAmount?: string | null | false;
  /** Game pages: start with the 72 px rail (≥ 1024); the burger expands it for this visit only. */
  collapseSidebar?: boolean;
  /** API reachability (`useApiConnectivity`): shows the ERR-02 connection banner with Try again. */
  connection?: { unreachable: boolean; offline: boolean; retry: () => void; retrying: boolean };
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
  onSwitchNetwork,
  walletChainId = null,
  restricted = false,
  regionName = null,
  demoBar = publicEnv.demoMode,
  poolAmount = DEMO_CURRENT_ROUND.poolBalance ?? '0.00',
  collapseSidebar = false,
  connection,
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
                <Link href="/legal/restricted-countries">Restricted countries</Link>
              </Button>
            </>
          }
        >
          GLOBAL POOL games are not available in your region{regionName ? ` (${regionName})` : ''}.
          You can still view your account and withdraw funds.
        </Alert>
      )}
      {connection?.unreachable && (
        <Alert
          type="warning"
          layout="full"
          data-testid="connection-banner"
          title={connection.offline ? 'You’re offline' : 'Can’t reach GLOBAL POOL right now'}
          actions={
            <Button
              size="s"
              variant="secondary"
              onClick={connection.retry}
              loading={connection.retrying}
            >
              Try again
            </Button>
          }
        >
          Check your internet connection. Figures on this page may be out of date until we reconnect
          — your balance and entries are safe.
        </Alert>
      )}
      {wrongNetwork && (
        <SecurityWarning
          kind="wrong-network"
          currentChainId={walletChainId}
          layout="full"
          className="tablet:hidden"
          actions={
            onSwitchNetwork ? (
              <Button size="s" variant="secondary" onClick={onSwitchNetwork}>
                Switch to Arbitrum
              </Button>
            ) : undefined
          }
        />
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
            onSwitchNetwork={onSwitchNetwork}
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

/** Same query keys as the pool module (`poolKeys.current()` / `poolKeys.myRound(id)`), so caches are shared. */
export const SHELL_POOL_KEYS = {
  current: () => ['pool', 'round', 'current'] as const,
  myRound: (roundId: string) => ['pool', 'me', 'round', roundId] as const,
};
const UNREAD_QUERY = { page: 1, pageSize: 1, unread: true };

/**
 * Shell figure from a query: the value · null while loading (skeleton) · false when the request failed ("—", never an
 * endless skeleton — ERR-03). A failed refetch keeps showing the last good value.
 */
export function shellValue<T>(
  query: { data: T | undefined; isError: boolean },
  pick: (data: T) => string,
): string | null | false {
  if (query.data !== undefined) return pick(query.data);
  return query.isError ? false : null;
}

/**
 * The member's public handle as the shell shows it: always with the leading "@" (`@nova.k`), from the API profile's
 * `displayHandle` when it is loaded; "Player" before onboarding (no handle yet).
 */
export function shellHandle(
  profile: { displayHandle?: string | null; handle?: string | null } | null | undefined,
  handle: string | null | undefined,
): string {
  if (profile?.displayHandle) return profile.displayHandle;
  const raw = profile?.handle ?? handle;
  if (!raw) return 'Player';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

/**
 * The signed-in member's own shell data in API mode — Available (GET /wallet/balances, shared with the wallet
 * pages), entries in the open round, unread notifications — and the live pool amount for everyone. Keys are the
 * modules' own, so every financial write that refreshes them (player-cache.ts) refreshes the shell too.
 */
function useLiveShell(member: boolean) {
  const api = DATA_SOURCE === 'api';
  const live = api && member;
  const round = useQuery({
    queryKey: SHELL_POOL_KEYS.current(),
    queryFn: getCurrentRound,
    enabled: api,
    staleTime: 30_000,
  });
  const open = round.data?.status === 'open' ? round.data : null;
  const balances = useQuery({
    queryKey: walletKeys.balances(),
    queryFn: ({ signal }) => walletApi.balances(signal),
    enabled: live,
  });
  const mine = useQuery({
    queryKey: SHELL_POOL_KEYS.myRound(open?.id ?? 'none'),
    queryFn: () => getMyRoundEntries(open!),
    enabled: live && Boolean(open),
  });
  const unread = useQuery({
    queryKey: accountKeys.notifications(UNREAD_QUERY),
    queryFn: ({ signal }) => accountApi.notifications(UNREAD_QUERY, signal),
    enabled: live,
    staleTime: 60_000,
  });
  return {
    api,
    // no round yet (null) → 0.00, never an endless skeleton
    poolAmount: api ? shellValue(round, (r) => r?.poolBalance ?? '0.00') : undefined,
    available: shellValue(balances, (b) => b.available),
    activeEntries: open ? (mine.data?.entries ?? 0) : 0,
    notifications: unread.data?.unread ?? 0,
  };
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
  const user = auth.status === 'member' ? auth.user : null;
  const signedIn = Boolean(user);
  const live = useLiveShell(signedIn && !overrides.previewGuest);
  const connection = useApiConnectivity();
  // ERR-07: the member's own linked wallet, connected to this site, is on another chain (read-only, no prompt).
  const injected = useInjectedWallet(signedIn);
  const autoWrongNetwork = signedIn && isWrongNetwork(injected, user?.walletAddress);
  const onSwitchNetwork = React.useCallback(() => {
    void switchToMvpChain().then((ok) => {
      if (!ok)
        toast({
          type: 'error',
          title: 'Couldn’t switch the network',
          description: 'Open your wallet app and switch to Arbitrum Sepolia.',
        });
    });
  }, []);
  // API mode: the member's real data. Mock data source: the DEMO profile (with DEMO markers), like every mock view.
  const member: ShellMember | null = overrides.previewGuest
    ? null
    : user
      ? live.api
        ? {
            handle: shellHandle(auth.profile, user.handle),
            initials: user.initials,
            publicId: auth.profile?.publicId,
            available: live.available,
            notifications: live.notifications,
            activeEntries: live.activeEntries,
            demo: publicEnv.demoMode,
          }
        : {
            ...DEMO_SHELL_MEMBER,
            handle: user.handle ? shellHandle(auth.profile, user.handle) : DEMO_SHELL_MEMBER.handle,
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
      wrongNetwork={wrongNetwork ?? autoWrongNetwork}
      onSwitchNetwork={onSwitchNetwork}
      walletChainId={autoWrongNetwork ? injected.chainId : null}
      restricted={restricted ?? overrides.restricted}
      regionName={overrides.regionName}
      poolAmount={live.poolAmount}
      collapseSidebar={overrides.collapseSidebar}
      connection={connection}
    >
      {children}
    </AppShellFrame>
  );
}
