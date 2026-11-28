'use client';

/**
 * Admin session (owner decision #3: admins never use Privy). Email + password + mandatory TOTP in one API call
 * (POST /admin/auth/login), short access JWT (15 min = the idle timeout) held in memory, rotating refresh token in
 * sessionStorage (tab-scoped; reused tokens revoke the whole family server-side). Registers the admin token provider
 * of the shared API client.
 *
 * Idle timeout (ADM-01): 15 minutes without pointer / keyboard activity → the session ends. A warning dialog with a
 * real countdown to the absolute sign-out time appears 2 minutes before; once it is open only "Stay signed in"
 * extends the session (background polling never does). Open dialogs are discarded at sign-out — nothing is
 * submitted on the admin's behalf.
 */
import type { Permission } from '@gp/shared/enums';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import {
  adminLogin,
  adminLogout,
  adminMe,
  adminRefresh,
  type AdminProfile,
  type AdminTokens,
} from '@/lib/api/admin-a';
import { ApiRequestError, setAdminTokenProvider } from '@/lib/api/client';

export const ADMIN_IDLE_MINUTES = 15;
export const ADMIN_WARNING_SECONDS = 120;
const STORAGE_KEY = 'gp.admin.session';
const EXPIRED_KEY = 'gp.admin.expired';

export type AdminSessionStatus = 'loading' | 'signed_out' | 'signed_in';

export interface ExpiredInfo {
  email: string;
  name: string;
  at: string;
  reason: 'idle' | 'revoked' | 'session_ended';
  returnTo: string;
}

interface Stored {
  refreshToken: string;
  sessionExpiresAt: string;
  email: string;
  name: string;
}

export interface AdminSessionValue {
  status: AdminSessionStatus;
  admin: AdminProfile | null;
  /** Absolute idle sign-out time (ms epoch) while signed in. */
  idleDeadline: number | null;
  sessionExpiresAt: string | null;
  /** Last expiry (shown by the "Session ended" sign-in state). */
  expired: ExpiredInfo | null;
  warningOpen: boolean;
  login: (input: { email: string; password: string; totpCode: string }) => Promise<AdminProfile>;
  logout: () => Promise<void>;
  staySignedIn: () => Promise<void>;
  clearExpired: () => void;
  can: (permission: Permission) => boolean;
  canAny: (permissions: readonly Permission[]) => boolean;
}

const AdminSessionContext = React.createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const ctx = React.useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used inside <AdminSessionProvider>');
  return ctx;
}

function readStored(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function writeStored(v: Stored | null) {
  try {
    if (v) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — the session simply does not survive a reload */
  }
}
function readExpired(): ExpiredInfo | null {
  try {
    const raw = window.sessionStorage.getItem(EXPIRED_KEY);
    return raw ? (JSON.parse(raw) as ExpiredInfo) : null;
  } catch {
    return null;
  }
}
function writeExpired(v: ExpiredInfo | null) {
  try {
    if (v) window.sessionStorage.setItem(EXPIRED_KEY, JSON.stringify(v));
    else window.sessionStorage.removeItem(EXPIRED_KEY);
  } catch {
    /* ignore */
  }
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<AdminSessionStatus>('loading');
  const [admin, setAdmin] = React.useState<AdminProfile | null>(null);
  const [idleDeadline, setIdleDeadline] = React.useState<number | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState<ExpiredInfo | null>(null);
  const [warningOpen, setWarningOpen] = React.useState(false);

  const access = React.useRef<{ token: string; exp: number } | null>(null);
  const stored = React.useRef<Stored | null>(null);
  const refreshing = React.useRef<Promise<string | null> | null>(null);
  const lastActivity = React.useRef<number>(Date.now());
  const warningRef = React.useRef(false);
  const pathRef = React.useRef(pathname);
  pathRef.current = pathname;
  const adminRef = React.useRef<AdminProfile | null>(null);
  adminRef.current = admin;

  const applyTokens = React.useCallback((t: AdminTokens, who: { email: string; name: string }) => {
    access.current = { token: t.accessToken, exp: Date.now() + t.expiresIn * 1000 };
    stored.current = {
      refreshToken: t.refreshToken,
      sessionExpiresAt: t.sessionExpiresAt,
      email: who.email,
      name: who.name,
    };
    writeStored(stored.current);
    setSessionExpiresAt(t.sessionExpiresAt);
  }, []);

  const clearLocal = React.useCallback(() => {
    access.current = null;
    stored.current = null;
    refreshing.current = null;
    writeStored(null);
    setAdmin(null);
    setIdleDeadline(null);
    setWarningOpen(false);
    warningRef.current = false;
    queryClient.removeQueries({ queryKey: ['admin'] });
  }, [queryClient]);

  const endSession = React.useCallback(
    (reason: ExpiredInfo['reason']) => {
      const who = stored.current ?? adminRef.current;
      const token = access.current?.token;
      if (token) void adminLogout(token).catch(() => undefined);
      const info: ExpiredInfo | null = who
        ? {
            email: who.email,
            name: who.name,
            at: new Date().toISOString(),
            reason,
            returnTo: pathRef.current?.startsWith('/admin') ? pathRef.current : '/admin',
          }
        : null;
      clearLocal();
      setExpired(info);
      writeExpired(info);
      setStatus('signed_out');
      router.replace('/admin/login?reason=expired');
    },
    [clearLocal, router],
  );

  /** Single-flight refresh (rotation). Returns the new access token or null when the session is over. */
  const refresh = React.useCallback(async (): Promise<string | null> => {
    if (refreshing.current) return refreshing.current;
    const s = stored.current;
    if (!s) return null;
    refreshing.current = (async () => {
      try {
        const t = await adminRefresh(s.refreshToken);
        applyTokens(t, s);
        return t.accessToken;
      } catch {
        return null;
      } finally {
        refreshing.current = null;
      }
    })();
    return refreshing.current;
  }, [applyTokens]);

  // Token provider for every `auth: 'admin'` request. Never refreshes past the idle deadline.
  React.useEffect(() => {
    setAdminTokenProvider(async () => {
      const a = access.current;
      if (a && Date.now() < a.exp - 30_000) return a.token;
      if (!stored.current) return a?.token ?? null;
      const idleOver = Date.now() - lastActivity.current > ADMIN_IDLE_MINUTES * 60_000;
      if (idleOver) return a?.token ?? null;
      return refresh();
    });
    return () => setAdminTokenProvider(() => Promise.resolve(null));
  }, [refresh]);

  // Restore a session after a reload (refresh token in sessionStorage).
  React.useEffect(() => {
    setExpired(readExpired());
    const s = readStored();
    if (!s) {
      setStatus('signed_out');
      return;
    }
    stored.current = s;
    let cancelled = false;
    void (async () => {
      const token = await refresh();
      if (cancelled) return;
      if (!token) {
        clearLocal();
        setStatus('signed_out');
        return;
      }
      try {
        const me = await adminMe();
        if (cancelled) return;
        setAdmin(me);
        lastActivity.current = Date.now();
        setIdleDeadline(lastActivity.current + ADMIN_IDLE_MINUTES * 60_000);
        setStatus('signed_in');
      } catch {
        if (!cancelled) {
          clearLocal();
          setStatus('signed_out');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Activity tracking + idle countdown.
  React.useEffect(() => {
    if (status !== 'signed_in') return;
    let lastMark = 0;
    const mark = () => {
      if (warningRef.current) return; // only "Stay signed in" extends once the warning is open
      const now = Date.now();
      lastActivity.current = now;
      if (now - lastMark > 5_000) {
        lastMark = now;
        setIdleDeadline(now + ADMIN_IDLE_MINUTES * 60_000);
      }
    };
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, mark, { passive: true });
    const timer = window.setInterval(() => {
      const deadline = lastActivity.current + ADMIN_IDLE_MINUTES * 60_000;
      const left = deadline - Date.now();
      if (left <= 0) {
        endSession('idle');
      } else if (left <= ADMIN_WARNING_SECONDS * 1000 && !warningRef.current) {
        warningRef.current = true;
        setIdleDeadline(deadline);
        setWarningOpen(true);
      }
      const s = stored.current;
      if (s && new Date(s.sessionExpiresAt).getTime() <= Date.now()) endSession('session_ended');
    }, 1_000);
    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, mark);
      window.clearInterval(timer);
    };
  }, [status, endSession]);

  // A revoked / expired session answers 401 → end it (any admin query).
  React.useEffect(() => {
    if (status !== 'signed_in') return;
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return;
      const err: unknown = event.action.error;
      if (err instanceof ApiRequestError && err.status === 401 && err.path.startsWith('/admin')) {
        endSession('revoked');
      }
    });
    return unsub;
  }, [status, queryClient, endSession]);

  const login = React.useCallback<AdminSessionValue['login']>(
    async (input) => {
      const res = await adminLogin(input);
      applyTokens(res, { email: res.admin.email, name: res.admin.name });
      lastActivity.current = Date.now();
      setIdleDeadline(lastActivity.current + ADMIN_IDLE_MINUTES * 60_000);
      setAdmin(res.admin);
      setExpired(null);
      writeExpired(null);
      setStatus('signed_in');
      return res.admin;
    },
    [applyTokens],
  );

  const logout = React.useCallback(async () => {
    const token = access.current?.token;
    clearLocal();
    setExpired(null);
    writeExpired(null);
    setStatus('signed_out');
    if (token) await adminLogout(token).catch(() => undefined);
    router.replace('/admin/login');
  }, [clearLocal, router]);

  const staySignedIn = React.useCallback(async () => {
    const token = await refresh();
    if (!token) {
      endSession('session_ended');
      return;
    }
    lastActivity.current = Date.now();
    warningRef.current = false;
    setWarningOpen(false);
    setIdleDeadline(lastActivity.current + ADMIN_IDLE_MINUTES * 60_000);
  }, [refresh, endSession]);

  const clearExpired = React.useCallback(() => {
    setExpired(null);
    writeExpired(null);
  }, []);

  const value = React.useMemo<AdminSessionValue>(() => {
    const perms = new Set(admin?.permissions ?? []);
    return {
      status,
      admin,
      idleDeadline,
      sessionExpiresAt,
      expired,
      warningOpen,
      login,
      logout,
      staySignedIn,
      clearExpired,
      can: (p) => perms.has(p),
      canAny: (ps) => ps.some((p) => perms.has(p)),
    };
  }, [
    status,
    admin,
    idleDeadline,
    sessionExpiresAt,
    expired,
    warningOpen,
    login,
    logout,
    staySignedIn,
    clearExpired,
  ]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}
