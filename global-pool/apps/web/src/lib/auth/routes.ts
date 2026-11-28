/** Paths a member who still has to onboard may stay on (everything else redirects to /onboarding). */
export function onboardingExempt(pathname: string): boolean {
  return /^\/(onboarding|restricted|legal|sign-in|sign-up|verify|design-system|admin|auth-preview|2fa|responsible-gaming|support)(\/|$)/.test(
    pathname,
  );
}
