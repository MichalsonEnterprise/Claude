/**
 * Where the auth dialog sends a member after a successful sign-in (AUTH-04 success → onboarding / lobby / AUTH-18).
 * Pure and unit-tested (test/closeout-pass2-web.test.tsx).
 *
 * - Consents still missing → /onboarding (with `next`).
 * - Gaming paused by the account gate (self-exclusion or cooling-off, suspension, region, gaming hold) and the
 *   destination is a gambling surface (the lobby, Global Pool, games, promotions, new deposits) → the matching
 *   /restricted/* page instead, so the player never lands on Participate / Enter round CTAs (Q15). Non-gambling
 *   destinations (withdraw, wallet, history, account, RG, support, legal) are honoured: withdrawals stay available.
 * - Otherwise `next`, then the page the dialog returns to; null = stay where the dialog opened.
 */
import { isAgeGated } from '@/components/compliance/routes';
import { routeForGate, type AccountStatus } from '@/lib/api/auth';

export interface LandingInput {
  needsOnboarding: boolean;
  /** Validated `?next=` (safeNext) the dialog was opened with. */
  next?: string | null;
  /** Page the dialog returns to when it closes (the /sign-in route's lobby behind). */
  returnTo?: string | null;
  /** Page the dialog is open on. */
  pathname: string;
  /** GET /auth/account-status; undefined when it could not be loaded (the API still refuses gaming). */
  status?: Pick<AccountStatus, 'gate' | 'paused'> | null;
}

export type Landing = { to: string; mode: 'push' | 'replace' } | null;

export function postSignInLanding({
  needsOnboarding,
  next,
  returnTo,
  pathname,
  status,
}: LandingInput): Landing {
  if (needsOnboarding)
    return { to: `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ''}`, mode: 'push' };
  const destination = next ?? returnTo ?? pathname;
  const restricted = status?.paused.gaming ? routeForGate(status.gate) : null;
  if (restricted && restricted !== '/onboarding' && isAgeGated(destination))
    return { to: restricted, mode: 'replace' };
  if (next) return { to: next, mode: 'push' };
  if (returnTo) return { to: returnTo, mode: 'replace' };
  return null;
}
