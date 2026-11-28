'use client';

import type { AdminApprovalView, AdminUsersQuery } from '@gp/shared/schemas';
import type { TxType } from '@gp/shared/enums';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import * as api from '@/lib/api/admin-a';

import { useAdminSession } from './session';

/** All admin query keys start with 'admin' so a sign-out can drop every cached admin response at once. */
export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  health: ['admin', 'system-health'] as const,
  alerts: ['admin', 'alerts'] as const,
  inbox: (view: AdminApprovalView) => ['admin', 'approvals', 'inbox', view] as const,
  approval: (id: string) => ['admin', 'approvals', 'detail', id] as const,
  approvals: ['admin', 'approvals'] as const,
  rounds: ['admin', 'rounds'] as const,
  users: (q: Partial<AdminUsersQuery>) => ['admin', 'users', 'list', q] as const,
  userStats: ['admin', 'users', 'stats'] as const,
  user: (id: string) => ['admin', 'users', id] as const,
  userTab: (id: string, tab: string, extra?: unknown) =>
    ['admin', 'users', id, tab, extra] as const,
  audit: (q: api.AuditQuery) => ['admin', 'audit', q] as const,
  auditVerify: ['admin', 'audit', 'verify'] as const,
  roles: ['admin', 'roles'] as const,
  permissions: ['admin', 'permissions'] as const,
};

type Opts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>;

/** useQuery that only runs while an admin is signed in (no token → no request). */
export function useAdminQuery<T>(
  key: readonly unknown[],
  fn: () => Promise<T>,
  opts: Opts<T> = {},
) {
  const { status } = useAdminSession();
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: key,
    queryFn: fn,
    retry: (count, err) =>
      count < 1 &&
      !(
        err instanceof Error &&
        'status' in err &&
        [401, 403, 404].includes((err as { status: number }).status)
      ),
    ...opts,
    enabled: status === 'signed_in' && (opts.enabled ?? true),
  });
}

export const useDashboard = (enabled = true) =>
  useAdminQuery(adminKeys.dashboard, api.getDashboard, { enabled, refetchInterval: 60_000 });
export const useSystemHealth = (enabled = true) =>
  useAdminQuery(adminKeys.health, api.getSystemHealth, { enabled, refetchInterval: 60_000 });
export const useAlerts = (enabled = true) =>
  useAdminQuery(adminKeys.alerts, api.getAlerts, { enabled, refetchInterval: 60_000 });
export const useApprovalsInbox = (view: AdminApprovalView = 'open', enabled = true) =>
  useAdminQuery(adminKeys.inbox(view), () => api.getApprovalsInbox(view), {
    enabled,
    refetchInterval: 30_000,
  });
export const useApproval = (id: string | null) =>
  useAdminQuery(adminKeys.approval(id ?? 'none'), () => api.getApproval(id!), {
    enabled: Boolean(id),
  });
export const useAdminRounds = (enabled = true) =>
  useAdminQuery(adminKeys.rounds, () => api.getAdminRounds(5), {
    enabled,
    refetchInterval: 60_000,
  });
export const useUsers = (q: Partial<AdminUsersQuery>, enabled = true) =>
  useAdminQuery(adminKeys.users(q), () => api.getUsers(q), { enabled, placeholderData: (p) => p });
export const useUserStats = (enabled = true) =>
  useAdminQuery(adminKeys.userStats, api.getUserStats, { enabled });
export const useUser = (id: string) => useAdminQuery(adminKeys.user(id), () => api.getUser(id));
export const useUserAccount = (id: string) =>
  useAdminQuery(adminKeys.userTab(id, 'account'), () => api.getUserAccount(id));
export const useUserWallets = (id: string) =>
  useAdminQuery(adminKeys.userTab(id, 'wallets'), () => api.getUserWallets(id));
export const useUserKyc = (id: string, enabled = true) =>
  useAdminQuery(adminKeys.userTab(id, 'kyc'), () => api.getUserKyc(id), { enabled });
export const useUserAml = (id: string, enabled = true) =>
  useAdminQuery(adminKeys.userTab(id, 'aml'), () => api.getUserAml(id), { enabled });
export const useUserTransactions = (
  id: string,
  q: { page: number; pageSize: number; type?: TxType },
) =>
  useAdminQuery(adminKeys.userTab(id, 'transactions', q), () => api.getUserTransactions(id, q), {
    placeholderData: (p) => p,
  });
export const useUserRg = (id: string, enabled = true) =>
  useAdminQuery(adminKeys.userTab(id, 'rg'), () => api.getUserRg(id), { enabled });
export const useAuditLogs = (q: api.AuditQuery, enabled = true) =>
  useAdminQuery(adminKeys.audit(q), () => api.getAuditLogs(q), {
    enabled,
    placeholderData: (p) => p,
  });
export const useRoles = (enabled = true) =>
  useAdminQuery(adminKeys.roles, api.getRoles, { enabled });
export const usePermissionsCatalogue = (enabled = true) =>
  useAdminQuery(adminKeys.permissions, api.getPermissions, { enabled });
