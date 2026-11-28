/**
 * Cross-module cache rules for the signed-in player's data.
 *
 * Several modules cache the same server state under their own keys (GET /wallet/balances lives under
 * ['wallet', …], ['pool', 'me', …], ['account', …], ['history', …] and ['auth', 'balances']; RG limits under
 * ['rg'], ['pool', 'me', 'rg'], ['wallet', 'rg'] and ['account', 'rg']). None of these keys carries the user id, so:
 *
 * - every financial or RG write refreshes ALL of them (`invalidatePlayerFinancials`), otherwise another screen keeps
 *   acting on a stale Available balance or limit;
 * - signing out / switching account removes ALL player data (`clearPlayerData`), otherwise the next player in the
 *   same tab is shown the previous player's profile, balances, wallets, limits and history.
 */
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import * as React from 'react';

/** Balances, limits, entries, history and account gate — everything a money or RG write can change. */
export const PLAYER_FINANCIAL_PREFIXES: readonly QueryKey[] = [
  ['wallet'],
  ['account'],
  ['history'],
  ['rg'],
  ['pool', 'me'],
  ['me'],
  ['auth', 'balances'],
  ['auth', 'account-status'],
];

/** Every key root that holds data of the signed-in player (removed on sign-out / account switch). */
export const PLAYER_DATA_PREFIXES: readonly QueryKey[] = [
  ['auth'],
  ['me'],
  ['wallet'],
  ['account'],
  ['rg'],
  ['history'],
  ['pool', 'me'],
  ['games-kit'],
];

/** Refresh every module's copy of the player's balances / limits / history after a financial or RG write. */
export async function invalidatePlayerFinancials(qc: QueryClient): Promise<void> {
  await Promise.all(PLAYER_FINANCIAL_PREFIXES.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

/** Drop every cached query of the signed-in player (sign-out, session expiry, sign-out in another tab). */
export function clearPlayerData(qc: QueryClient): void {
  for (const queryKey of PLAYER_DATA_PREFIXES) {
    void qc.cancelQueries({ queryKey });
    qc.removeQueries({ queryKey });
  }
}

/** Same set, but active queries refetch at once (a different account took over a live session). */
export async function resetPlayerData(qc: QueryClient): Promise<void> {
  await Promise.all(PLAYER_DATA_PREFIXES.map((queryKey) => qc.resetQueries({ queryKey })));
}

/** Hook form of `invalidatePlayerFinancials` (stable callback). */
export function useInvalidatePlayerFinancials(): () => Promise<void> {
  const qc = useQueryClient();
  return React.useCallback(() => invalidatePlayerFinancials(qc), [qc]);
}
