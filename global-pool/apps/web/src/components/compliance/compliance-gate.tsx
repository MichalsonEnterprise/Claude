'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { GeoDecision } from '@/lib/api/compliance';
import { useAuth, useAuthUi } from '@/lib/auth';

import { AgeGateDialog } from './age-gate';
import { GeoBlockInterstitial } from './geo-block';
import { GATE_ROUTES, isAgeGated, isGeoGated } from './routes';
import { markUnderAge, readAgeConfirmation, readUnderAge, saveAgeConfirmation } from './storage';
import { useGeoDecision } from './use-geo';

/**
 * Pure decision of the compliance gates for one render (unit-tested in test/gates.test.tsx):
 * - `geo`  — PUB-21 interstitial instead of the page: a gaming / financial page and the API says the location is
 *   restricted. While the decision loads on such a page the content is held (no gaming UI flashes first); an
 *   unreachable API shows the page — the server refuses every gaming / deposit request anyway.
 * - `age`  — PUB-22 modal over the page: a gambling surface, a guest (a member's onboarding `ageConfirmed` consent
 *   is authoritative), no valid browser confirmation and a permitted (or unknown) location. Members still needing
 *   onboarding are sent to /onboarding by the session layer, which asks for 18+ itself.
 * - `exit` — "I am under 18" was answered in this browser session: gambling surfaces go to the exit page.
 */
export type GateView = 'page' | 'hold' | 'geo' | 'age' | 'exit';

export function gateView(input: {
  pathname: string;
  /** Query string of the page (`null` = not known yet). `/wallet/deposit?ref=DP-…` tracks a sent deposit. */
  search?: string | null;
  geo: { status: 'pending' | 'error' | 'success'; permitted: boolean | null };
  auth: 'loading' | 'guest' | 'member';
  ageConfirmed: boolean | null;
  underAge: boolean;
  /** The GLOBAL POOL sign-in dialog is open (the age question waits behind it). */
  authDialogOpen?: boolean;
}): GateView {
  const geoGated = isGeoGated(input.pathname, input.search);
  const ageGated = isAgeGated(input.pathname);
  if (geoGated) {
    if (input.geo.status === 'pending') return 'hold';
    if (input.geo.status === 'success' && input.geo.permitted === false) return 'geo';
  }
  if (!ageGated || input.auth !== 'guest') return 'page';
  if (input.underAge) return 'exit';
  // Storage not read yet (first client pass) or the location is still being decided: no flash of the modal.
  if (input.ageConfirmed === null || input.geo.status === 'pending') return 'page';
  if (input.ageConfirmed) return 'page';
  // A restricted location offers no gambling to confirm for (the homepage shows its own restricted variant).
  if (input.geo.status === 'success' && input.geo.permitted === false) return 'page';
  return input.authDialogOpen ? 'page' : 'age';
}

const GateContext = React.createContext<{ hold: boolean }>({ hold: false });

/**
 * PUB-21 / PUB-22 gate controller for the player app (`app/(app)/layout.tsx`): renders the geo interstitial INSTEAD
 * of the casino shell + page for a restricted location on gaming / financial pages, and the age gate over gambling
 * surfaces for guests. A courtesy layer only — the API enforces region, age (onboarding) and RG on every request.
 */
export function ComplianceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const auth = useAuth();
  const ui = useAuthUi();
  // The query string comes from <SearchProbe> (inside Suspense, so static pages still prerender); null until read.
  const [search, setSearch] = React.useState<string | null>(null);
  const gated = isGeoGated(pathname, search) || isAgeGated(pathname);
  const geo = useGeoDecision({ enabled: gated });

  // Browser memory is read after mount (cookie / localStorage, try/catch inside) so SSR and hydration match.
  const [memory, setMemory] = React.useState<{ confirmed: boolean | null; underAge: boolean }>({
    confirmed: null,
    underAge: false,
  });
  React.useEffect(() => {
    setMemory({ confirmed: readAgeConfirmation() !== null, underAge: readUnderAge() });
  }, [pathname]);

  const decision: GeoDecision | undefined = geo.data;
  const view = gateView({
    pathname,
    search,
    geo: {
      status: !gated ? 'success' : geo.isError ? 'error' : decision ? 'success' : 'pending',
      permitted: decision ? decision.permitted : null,
    },
    auth: auth.status,
    ageConfirmed: memory.confirmed,
    underAge: memory.underAge,
    authDialogOpen: ui.dialog !== null,
  });

  React.useEffect(() => {
    if (view === 'exit') router.replace(GATE_ROUTES.ageRestricted);
  }, [view, router]);

  const probe = (
    <React.Suspense fallback={null}>
      <SearchProbe onChange={setSearch} />
    </React.Suspense>
  );
  if (view === 'geo' && decision) {
    return (
      <>
        {probe}
        <GeoBlockInterstitial decision={decision} />
      </>
    );
  }

  return (
    <GateContext.Provider value={{ hold: view === 'hold' || view === 'exit' }}>
      {probe}
      {children}
      <AgeGateDialog
        open={view === 'age'}
        detected={decision}
        onEnter={(country) => {
          saveAgeConfirmation(country);
          setMemory({ confirmed: true, underAge: false });
        }}
        onUnderAge={() => {
          markUnderAge();
          setMemory({ confirmed: false, underAge: true });
        }}
        onSignIn={() =>
          auth.openAuth ? auth.openAuth('sign-in', { next: pathname }) : auth.signIn()
        }
      />
    </GateContext.Provider>
  );
}

/** Reports the page's query string to the gate (re-renders on every search change, renders nothing). */
function SearchProbe({ onChange }: { onChange: (search: string) => void }) {
  const search = useSearchParams()?.toString() ?? '';
  React.useEffect(() => onChange(search), [search, onChange]);
  return null;
}

/**
 * Inside the shell's content area: holds a gaming / financial page while the geo decision loads (skeleton, never
 * the gaming UI first) and while an under-18 answer redirects to the exit page.
 */
export function GateContent({ children }: { children: React.ReactNode }) {
  const { hold } = React.useContext(GateContext);
  if (!hold) return <>{children}</>;
  return (
    <div className="flex flex-col gap-6" aria-busy="true" data-gate="hold">
      <p className="sr-only" role="status">
        Checking where GLOBAL POOL is available…
      </p>
      <Skeleton className="h-10 w-72 max-w-full" />
      <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}
