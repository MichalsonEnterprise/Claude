'use client';

import { money } from '@gp/shared/money';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import { authApi, authKeys } from '@/lib/api/auth';
import { classifyGameError, useDemoCredits, type DemoCreditsView } from '@/lib/api/games';
import { useRgState } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';

/**
 * Who may place a NEW bet right now — mirrors the server's GAMING_POLICY so the UI can explain it up front.
 * The server stays the authority: every bet is re-checked there (region, self-exclusion, limits, reality checks).
 */
export type GameGate =
  | 'loading'
  | 'guest'
  | 'onboarding'
  | 'region'
  | 'self_excluded'
  | 'blocked'
  | 'time_limit'
  | 'loss_limit'
  | 'offline'
  | 'ok';

export interface DemoLossLimit {
  period: 'day' | 'week' | 'month';
  limit: string;
  /** DEMO credits lost in the period (stakes − returns, ≥ 0) — only known for daily limits from /games/credits. */
  used: string | null;
  share: number;
  resetsAt: string | null;
}

export interface GameGateState {
  gate: GameGate;
  credits: DemoCreditsView | undefined;
  creditsError: boolean;
  lossLimit: DemoLossLimit | null;
  /** Detected / declared country name for the region notice (no bypass hints). */
  regionName: string | null;
  exclusionEndsAt: string | null;
  online: boolean;
  refetch: () => void;
}

/** navigator.onLine with change events (connection-lost state). */
export function useOnline(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

function ratio(used: string | null, limit: string): number {
  try {
    if (used === null) return 0;
    const l = money(limit);
    if (l.lte(0)) return 0;
    const r = money(used).div(l);
    return r.gt(1) ? 1 : Number(r.toFixed(4));
  } catch {
    return 0;
  }
}

export function useGameGate(): GameGateState {
  const auth = useAuth();
  const member = auth.status === 'member';
  const online = useOnline();
  const credits = useDemoCredits();
  const rg = useRgState();
  const account = useQuery({
    queryKey: authKeys.accountStatus,
    queryFn: authApi.accountStatus,
    enabled: member,
    staleTime: 60_000,
  });

  const lossLimit = React.useMemo<DemoLossLimit | null>(() => {
    const l = rg.data?.limits.find((x) => x.type === 'loss' && x.limit !== null);
    if (!l || !l.limit) return null;
    const period = l.period;
    let used: string | null = null;
    if (period === 'day' && credits.data) {
      const net = money(credits.data.session.today.net);
      used = net.lt(0) ? net.negated().toFixed(2) : '0.00';
    }
    return { period, limit: l.limit, used, share: ratio(used, l.limit), resetsAt: l.resetsAt ?? null };
  }, [rg.data, credits.data]);

  let gate: GameGate = 'ok';
  const acc = account.data;
  const blocked = credits.data?.session.blockedReason ?? null;
  if (auth.status === 'loading') gate = 'loading';
  else if (!member) gate = 'guest';
  else if (auth.profile?.onboardingRequired || acc?.gate === 'onboarding') gate = 'onboarding';
  else if (acc?.gate === 'region' || acc?.region.permitted === false) gate = 'region';
  else if (acc?.gate === 'self_excluded' || acc?.selfExclusion.active || blocked === 'excluded')
    gate = 'self_excluded';
  else if (acc?.gate === 'suspended' || acc?.gate === 'under_review' || acc?.paused.gaming)
    gate = 'blocked';
  else if (!online) gate = 'offline';
  else if (blocked) gate = 'time_limit';
  else if (lossLimit && lossLimit.used !== null && lossLimit.share >= 1) gate = 'loss_limit';
  else if (credits.isPending || account.isPending) gate = 'loading';
  else if (credits.isError && classifyGameError(credits.error).kind === 'network') gate = 'offline';

  const region = acc?.region.current ?? acc?.region.declared ?? null;
  return {
    gate,
    credits: credits.data,
    creditsError: credits.isError,
    lossLimit,
    regionName: region?.name ?? region?.code ?? null,
    exclusionEndsAt: acc?.selfExclusion.endsAt ?? rg.data?.exclusion.endsAt ?? null,
    online,
    refetch: () => {
      void credits.refetch();
      void account.refetch();
      void rg.refetch();
    },
  };
}
