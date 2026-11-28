'use client';

import * as React from 'react';

/**
 * Page → shell overrides. A page inside the (app) layout renders <ShellOverride …/> to tell the shell about
 * state the layout cannot know: the region gate (from GET /compliance/region) and the dev-only state preview
 * (`?state=member` shows the DEMO member chrome without signing in).
 */
export interface ShellOverrides {
  /** Region restricted: gating banner, Sign up / Deposit disabled. */
  restricted?: boolean;
  /** Preview the shell as the DEMO member (dev-only state preview). */
  previewMember?: boolean;
  /** Preview the shell as a guest even when signed in (dev-only state preview). */
  previewGuest?: boolean;
}

interface Ctx {
  overrides: ShellOverrides;
  setOverrides: (o: ShellOverrides) => void;
}

const ShellOverridesContext = React.createContext<Ctx | null>(null);

export function ShellOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = React.useState<ShellOverrides>({});
  const value = React.useMemo(() => ({ overrides, setOverrides }), [overrides]);
  return <ShellOverridesContext value={value}>{children}</ShellOverridesContext>;
}

export function useShellOverrides(): ShellOverrides {
  return React.useContext(ShellOverridesContext)?.overrides ?? {};
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/** Declarative override; cleared when the page unmounts. Renders nothing. */
export function ShellOverride({ restricted, previewMember, previewGuest }: ShellOverrides) {
  const set = React.useContext(ShellOverridesContext)?.setOverrides;
  useIsomorphicLayoutEffect(() => {
    if (!set) return;
    set({ restricted, previewMember, previewGuest });
    return () => set({});
  }, [set, restricted, previewMember, previewGuest]);
  return null;
}
