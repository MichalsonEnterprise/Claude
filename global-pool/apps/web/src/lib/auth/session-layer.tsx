'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { AuthDialog } from '@/components/auth/auth-dialog';
import { NewDeviceAlertHost } from '@/components/auth/new-device-dialog';
import { SessionExpiredDialog } from '@/components/auth/session-expired-dialog';
import { StepUpProvider } from '@/components/auth/step-up';
import { WalletFlowProvider } from '@/components/auth/wallet-dialogs';
import { authApi, authKeys, isUnauthenticated, type MeProfile } from '@/lib/api/auth';
import { setPlayerTokenProvider } from '@/lib/api/client';
import { clearPlayerData } from '@/lib/api/player-cache';
import { publicEnv } from '@/lib/env';

import { AuthContext, useAuthCore } from './context';
import { onboardingExempt } from './routes';
import { initialsFrom, type AuthContextValue } from './types';
import {
  AuthUiContext,
  type AuthDialogState,
  type AuthUiValue,
  type SessionExpiredState,
} from './ui-context';

/** Inactivity sign-out (Figma AUTH-20, decision #29 — flagged for product review). 0 disables it. */
export const IDLE_TIMEOUT_MINUTES = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ?? '30');
  return Number.isFinite(raw) && raw >= 0 ? raw : 30;
})();

export { onboardingExempt };

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

function useIdle(minutes: number, active: boolean, onIdle: () => void) {
  const cb = React.useRef(onIdle);
  cb.current = onIdle;
  React.useEffect(() => {
    if (!active || minutes <= 0) return;
    const limit = minutes * 60_000;
    let last = Date.now();
    const mark = () => {
      last = Date.now();
    };
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, mark, { passive: true });
    const timer = window.setInterval(() => {
      if (Date.now() - last >= limit) cb.current();
    }, 15_000);
    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, mark);
      window.clearInterval(timer);
    };
  }, [minutes, active]);
}

function accountSnapshot(profile: MeProfile | null | undefined, fallback: string | null) {
  if (!profile && !fallback) return null;
  const name = profile?.displayName ?? profile?.displayHandle ?? fallback ?? 'Player';
  return {
    name,
    detail: [profile?.emailMasked, profile?.publicId].filter(Boolean).join(' · '),
    initials: initialsFrom(profile?.handle ?? name),
    isDemo: profile?.isDemo ?? false,
  };
}

/**
 * Wraps the Privy / DEV MOCK core: registers the player token provider for `apiRequest()`, syncs the API session
 * (`POST /auth/session` once per login, then `GET /me`), sends members who still need consents to /onboarding,
 * signs out after inactivity / on a revoked session (AUTH-20), and mounts the auth dialog, step-up dialog,
 * wallet dialogs and new-device alerts.
 */
export function AuthSessionLayer({ children }: { children: React.ReactNode }) {
  const core = useAuthCore();
  const coreRef = React.useRef(core);
  coreRef.current = core;
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  // Register synchronously (before children's effects fire their first queries).
  React.useState(() => {
    setPlayerTokenProvider(() => coreRef.current.getAccessToken());
    return null;
  });

  const did = core.user?.id ?? null;
  const synced = React.useRef<string | null>(null);
  const member = core.status === 'member' && did !== null;

  const me = useQuery({
    queryKey: [...authKeys.me, did],
    enabled: member,
    staleTime: 60_000,
    retry: (count, err) => !isUnauthenticated(err) && count < 1,
    queryFn: async (): Promise<MeProfile> => {
      if (synced.current !== did) {
        const s = await authApi.session();
        synced.current = did;
        return s.user;
      }
      return authApi.me();
    },
  });
  const profile = member ? (me.data ?? null) : null;

  // ── dialog + session-expired UI state ──────────────────────────────────────────────────────
  const [dialog, setDialog] = React.useState<AuthDialogState | null>(null);
  const [expired, setExpired] = React.useState<SessionExpiredState | null>(null);
  const dialogRef = React.useRef(dialog);
  dialogRef.current = dialog;

  const closeDialog = React.useCallback(
    (reason: 'dismiss' | 'done' = 'dismiss') => {
      const d = dialogRef.current;
      setDialog(null);
      if (reason === 'dismiss' && d?.returnTo) router.replace(d.returnTo);
    },
    [router],
  );

  const ui = React.useMemo<AuthUiValue>(
    () => ({
      dialog,
      openDialog: (state) => {
        setExpired(null);
        setDialog(state);
      },
      setView: (view) => setDialog((d) => (d ? { ...d, view } : d)),
      closeDialog,
      expired,
      showExpired: setExpired,
    }),
    [dialog, expired, closeDialog],
  );

  // ── sign-out helpers ───────────────────────────────────────────────────────────────────────
  // Player query keys are not scoped by user, so every module's player data goes (wallet, account, RG, history,
  // pool/me, …) — not only ['auth'] — or the next account in this tab would see this player's data.
  const clearAuthData = React.useCallback(() => {
    synced.current = null;
    clearPlayerData(qc);
  }, [qc]);

  const signOut = React.useCallback(async () => {
    try {
      if (coreRef.current.status === 'member') await authApi.logout();
    } catch {
      /* best effort — the Privy / mock session is cleared below either way */
    }
    await coreRef.current.signOut();
    clearAuthData();
  }, [clearAuthData]);

  const expire = React.useCallback(
    async (reason: SessionExpiredState['reason']) => {
      if (coreRef.current.status !== 'member') return;
      const snapshot = accountSnapshot(
        qc.getQueryData<MeProfile>([...authKeys.me, coreRef.current.user?.id ?? null]),
        coreRef.current.user?.displayName ?? null,
      );
      if (reason === 'idle') {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
      }
      await coreRef.current.signOut();
      clearAuthData();
      setDialog(null);
      setExpired({ reason, at: new Date().toISOString(), account: snapshot });
    },
    [qc, clearAuthData],
  );

  // AUTH-20: inactivity timeout.
  useIdle(IDLE_TIMEOUT_MINUTES, member, () => void expire('idle'));

  // AUTH-20: any player API call rejected as unauthenticated while signed in → the session was revoked/expired.
  React.useEffect(() => {
    const onError = (error: unknown) => {
      if (isUnauthenticated(error) && coreRef.current.status === 'member') void expire('revoked');
    };
    const unsubQ = qc.getQueryCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') onError(e.action.error);
    });
    const unsubM = qc.getMutationCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') onError(e.action.error);
    });
    return () => {
      unsubQ();
      unsubM();
    };
  }, [qc, expire]);

  // Clear stale API data when the core signs out (e.g. Privy logout in another tab) or another account takes over
  // the session without a sign-out in between.
  //
  // Removing the queries is not enough on its own: an observer that stays mounted keeps a reference to the last query
  // that had data, so a hook with `placeholderData: keepPreviousData` (entry history, game bet lists, …) would show
  // the previous player's rows to the next player until their own request returns (R38). So the player UI (this
  // layer's children) is remounted once the old data is gone: every observer starts empty. Guest → member does not
  // remount, so a sign-in never loses the page the player was on.
  // The admin console (its own session, no player hooks) is never remounted by a player session change.
  const [identityEpoch, setIdentityEpoch] = React.useState(0);
  const pathRef = React.useRef(pathname);
  pathRef.current = pathname;
  const remountPlayerUi = React.useCallback(() => {
    if (!/^\/admin(?:\/|$)/.test(pathRef.current ?? '')) setIdentityEpoch((e) => e + 1);
  }, []);
  const prevStatus = React.useRef(core.status);
  const prevDid = React.useRef(did);
  React.useEffect(() => {
    if (prevStatus.current === 'member' && core.status === 'guest') {
      clearAuthData();
      remountPlayerUi();
    } else if (prevDid.current !== null && did !== null && prevDid.current !== did) {
      // Another account took over: drop the old player's data, then remount so the screens query for the new one.
      synced.current = null;
      clearPlayerData(qc);
      remountPlayerUi();
    }
    prevStatus.current = core.status;
    if (did !== null || core.status === 'guest') prevDid.current = did;
  }, [core.status, did, clearAuthData, qc, remountPlayerUi]);

  // Onboarding guard: members without consents go to /onboarding before anything else.
  React.useEffect(() => {
    if (!profile?.onboardingRequired || dialog) return;
    if (onboardingExempt(pathname)) return;
    router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
  }, [profile?.onboardingRequired, pathname, router, dialog]);

  const value = React.useMemo<AuthContextValue>(() => {
    const user = core.user
      ? {
          ...core.user,
          handle: profile?.handle ?? core.user.handle,
          displayName: profile?.displayName ?? core.user.displayName,
        }
      : null;
    return {
      mode: core.mode,
      status: core.status,
      user,
      signIn: () => ui.openDialog({ view: 'sign-in', intent: 'sign-in' }),
      signUp: () => ui.openDialog({ view: 'sign-up', intent: 'sign-up' }),
      signOut,
      getAccessToken: core.getAccessToken,
      openAuth: (view = 'sign-in', options) =>
        ui.openDialog({
          view,
          intent: view === 'sign-up' ? 'sign-up' : 'sign-in',
          next: options?.next,
        }),
      profile,
      syncing: member && me.isPending,
      sessionError: member && me.isError ? me.error : null,
      refreshProfile: () => void me.refetch(),
    };
  }, [core, profile, ui, signOut, member, me]);

  return (
    <AuthContext.Provider value={value}>
      <AuthUiContext.Provider value={ui}>
        <StepUpProvider>
          <WalletFlowProvider>
            <React.Fragment key={identityEpoch}>{children}</React.Fragment>
            <AuthDialog />
            <SessionExpiredDialog />
            {/* Seeded DEMO accounts (shared by every QA run) never auto-open AUTH-21; see /auth-preview. */}
            {member && profile?.onboarded && !profile.isDemo && <NewDeviceAlertHost />}
          </WalletFlowProvider>
        </StepUpProvider>
      </AuthUiContext.Provider>
    </AuthContext.Provider>
  );
}

/** DEMO mode helper: true when DEMO markers should be shown for this viewer. */
export const showDemoMarkers = publicEnv.demoMode;
