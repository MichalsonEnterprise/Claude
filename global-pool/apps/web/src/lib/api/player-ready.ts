/**
 * When may a page fire the signed-in player's onboarding-gated queries (wallet, history, pool/me, …)?
 *
 * The session layer sends a member who still has to onboard to /onboarding (except on exempt pages such as
 * /responsible-gaming), but only once `GET /me` has answered — and children render (and fire their queries) before
 * that redirect. Those requests can only come back 403 ONBOARDING_REQUIRED (Q12). So player data waits while the
 * profile is still syncing, and stays off while the redirect is pending. Responsible-gaming, 2FA and the account
 * gate are open before onboarding on the API and keep using `status === 'member'`.
 */
import { usePathname } from 'next/navigation';

import { onboardingExempt, useAuth, type AuthContextValue } from '@/lib/auth';

export function playerDataReady(
  auth: Pick<AuthContextValue, 'status' | 'profile' | 'syncing'>,
  pathname: string | null,
): boolean {
  if (auth.status !== 'member') return false;
  // Profile still loading: the onboarding redirect may be about to happen. A failed load lets queries run (and show
  // their own errors) instead of waiting forever.
  if (auth.syncing) return false;
  if (auth.profile?.onboardingRequired && !onboardingExempt(pathname ?? '/')) return false;
  return true;
}

/** Hook form of `playerDataReady` for the current page. */
export function usePlayerDataReady(): boolean {
  const auth = useAuth();
  const pathname = usePathname();
  return playerDataReady(auth, pathname);
}
