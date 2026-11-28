/**
 * PUB-22 age gate for QA scripts: pre-set the confirmation a visitor has after answering "Yes, I am 18+" and Enter
 * (first-party cookie `gp_age_ok=<epoch s>.<country>`, src/components/compliance/storage.ts), so guest screenshots of
 * gambling pages (the lobby, /pool, /games, promotions) show the page instead of the age-gate modal. Members never
 * get the browser gate. Scripts that capture the gate itself (gates-qa.mjs) must not call this.
 *
 *   import { presetAgeGate } from './lib/age-gate.mjs';
 *   const context = await browser.newContext({ … });
 *   await presetAgeGate(context, BASE);
 */
export const AGE_COOKIE = 'gp_age_ok';

export function ageGateCookie(baseUrl, country = 'PT') {
  return { name: AGE_COOKIE, value: `${Math.floor(Date.now() / 1000)}.${country}`, url: baseUrl };
}

export async function presetAgeGate(context, baseUrl, country = 'PT') {
  await context.addCookies([ageGateCookie(baseUrl, country)]);
}
