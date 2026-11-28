/**
 * Compliance gates (PUB-21 geo interstitial · PUB-22 age gate · ERR-05) against a running web (API data source,
 * DEV MOCK auth) + API started BEHIND A TRUSTED CDN HEADER, exactly like production behind Cloudflare:
 *
 *   API: TRUST_PROXY=true GEO_COUNTRY_HEADER=x-country API_PORT=4313 … node .dev/dist-co-gates/src/main.js
 *   E2E_BASE_URL=http://localhost:3313 E2E_API_URL=http://localhost:4313 \
 *     pnpm --filter @gp/web test:e2e -- e2e/gates.spec.ts
 *
 * The visitor's country is the CDN header the browser's requests to the API carry (`x-country`, injected at the
 * network layer — the role Cloudflare plays); without it the API falls back to DEV_COUNTRY_OVERRIDE (PT, permitted).
 * The API decides; the web only shows the decision.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { API, BASE, bearer, createPlayer, currentRound, signIn } from './integration/_journey';

const CDN_HEADER = 'x-country';

/** Every request from this browser context to the API arrives "from" `country` (as if set by the CDN). */
async function visitFrom(context: BrowserContext, country: string) {
  await context.route(`${API}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), [CDN_HEADER]: country } }),
  );
}

const ageDialog = (page: Page) => page.locator('[data-gate="age-gate"]');

/** Phrases that would point a visitor at a workaround; the Figma prohibition "don't use a VPN" is allowed. */
const BYPASS =
  /(?<!(?:don[’']t|do not|never|not) )\b(?:use|try|connect (?:via|through|with)|switch to) (?:a |an )?(?:vpn|proxy)|change your (?:location|ip)|bypass/i;

test.describe('PUB-22 age gate + licence notice', () => {
  test('first visit asks 18+ (nothing pre-selected), Enter only after both answers, then remembered', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    const dialog = ageDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Are you 18 or older?' })).toBeVisible();
    // Nothing is pre-selected / pre-checked; Enter is disabled.
    for (const radio of await dialog.getByRole('radio').all())
      await expect(radio).not.toBeChecked();
    const box = dialog.getByRole('checkbox', { name: /I confirm online gambling is legal for me/ });
    await expect(box).not.toBeChecked();
    const enter = dialog.getByRole('button', { name: 'Enter', exact: true });
    await expect(enter).toBeDisabled();
    // Licence notice + links; the detected country (from the API) is prefilled and checked.
    await expect(dialog.getByText('Licence notice')).toBeVisible();
    for (const link of ['Terms', 'Privacy', 'Responsible gaming', 'Restricted countries'])
      await expect(dialog.getByRole('link', { name: link, exact: true })).toBeVisible();
    await expect(dialog.getByText(/Detected from your connection/)).toContainText('Portugal');
    // Esc / outside clicks never dismiss it.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('radio', { name: /Yes, I’m 18 or older/ }).click();
    await expect(enter).toBeDisabled();
    await box.click();
    await expect(enter).toBeEnabled();
    await enter.click();
    await expect(dialog).toBeHidden();

    // Remembered per browser: a first-party cookie (+ localStorage), so the next pages don't ask again.
    const cookie = (await context.cookies()).find((c) => c.name === 'gp_age_ok');
    expect(cookie?.value).toMatch(/^\d+\.PT$/);
    await page.reload();
    await page.goto('/games');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(ageDialog(page)).toHaveCount(0);
  });

  test('"No, I’m under 18" leads to the exit page with help resources and stays there', async ({
    page,
  }) => {
    await page.goto('/games');
    const dialog = ageDialog(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('radio', { name: /No, I’m under 18/ }).click();
    await expect(dialog.getByText('You must be 18+')).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(page).toHaveURL(/\/age-restricted$/);
    await expect(
      page.getByRole('heading', { name: 'You must be 18+ to use GLOBAL POOL' }),
    ).toBeVisible();
    for (const org of ['Gambling Therapy', 'GamCare', 'Gamblers Anonymous'])
      await expect(page.getByRole('link', { name: new RegExp(org) })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leave GLOBAL POOL' })).toBeVisible();
    // No casino navigation on the exit page.
    await expect(page.getByRole('link', { name: /^Games$/ })).toHaveCount(0);

    // Gambling surfaces keep sending this browser session to the exit page.
    await page.goto('/pool');
    await expect(page).toHaveURL(/\/age-restricted$/);
    // Help and legal pages stay reachable.
    await page.goto('/responsible-gaming');
    await expect(page).toHaveURL(/\/responsible-gaming$/);
  });

  test('members are not asked: the onboarding 18+ consent is authoritative', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'gates');
    await signIn(page, p);
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Available balance/ }).first()).toBeVisible();
    await page.goto('/games');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(ageDialog(page)).toHaveCount(0);
  });
});

test.describe('PUB-21 geo-block interstitial (restricted country decided by the API)', () => {
  test('a visitor from a restricted country gets the interstitial before any gaming / deposit page', async ({
    page,
    context,
  }) => {
    await visitFrom(context, 'US');
    for (const path of ['/games', '/pool', '/wallet/deposit']) {
      await page.goto(path);
      const gate = page.locator('[data-gate="geo-block"]');
      await expect(gate, path).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'GLOBAL POOL isn’t available in your region' }),
      ).toBeVisible();
      await expect(gate.getByText('United States').first()).toBeVisible();
      // No age question and no casino navigation on top of it.
      await expect(ageDialog(page)).toHaveCount(0);
      await expect(page.locator('aside nav')).toHaveCount(0);
    }
    const gate = page.locator('[data-gate="geo-block"]');
    await expect(gate.getByRole('button', { name: 'Log in to withdraw' }).first()).toBeVisible();
    await expect(gate.getByRole('link', { name: /Contact support/ })).toBeVisible();
    await expect(gate.getByRole('link', { name: 'Licence information' })).toBeVisible();
    await expect(gate.getByRole('link', { name: /Restricted countries/ }).first()).toBeVisible();
    await expect(gate.getByRole('button', { name: 'Sign up' })).toBeDisabled();
    // An explicit "please don't use a VPN or proxy" — and no hint of any workaround.
    await expect(gate.getByText(/Please don’t use a VPN or proxy/)).toBeVisible();
    expect(await gate.innerText()).not.toMatch(BYPASS);

    // Sign-in to withdraw stays open.
    await gate.getByRole('button', { name: 'Log in to withdraw' }).first().click();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
  });

  test('withdraw, licence and support pages stay reachable; the server refuses gaming / deposits too', async ({
    page,
    context,
    request,
  }) => {
    await visitFrom(context, 'US');
    for (const path of [
      '/wallet/withdraw',
      '/legal/licence',
      '/support',
      '/legal/restricted-countries',
    ]) {
      await page.goto(path);
      await expect(page.locator('[data-gate="geo-block"]'), path).toHaveCount(0);
      await expect(page.locator('main#main'), path).toBeVisible();
    }
    // /region-unavailable shows the same decision as a page.
    await page.goto('/region-unavailable');
    await expect(page.locator('[data-gate="geo-block"]')).toBeVisible();

    // Server-side: the same location is refused on a new entry and a deposit address (451, no hints).
    const p = await createPlayer(request, 'gates');
    const us = { ...bearer(p.token), [CDN_HEADER]: 'US' };
    const round = await currentRound(request);
    if (round) {
      const entry = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
        headers: us,
        data: { entries: 1, idempotencyKey: `gates-e2e-${Date.now()}` },
      });
      expect(entry.status()).toBe(451);
      expect(await entry.text()).not.toMatch(BYPASS);
    }
    const addr = await request.get(`${API}/deposits/address?network=arbitrum`, { headers: us });
    expect(addr.status()).toBe(451);
    expect(((await addr.json()) as { error: { code: string } }).error.code).toBe('GEO_RESTRICTED');
    const wd = await request.get(`${API}/withdrawals`, { headers: us });
    expect(wd.status()).toBe(200);
  });

  test('a member abroad sees "Withdraw funds" and reaches the withdraw page', async ({
    page,
    context,
    request,
  }) => {
    const p = await createPlayer(request, 'gates');
    await signIn(page, p);
    await visitFrom(context, 'US');
    await page.goto('/games');
    const gate = page.locator('[data-gate="geo-block"]');
    await expect(gate).toBeVisible();
    await gate.getByRole('link', { name: 'Withdraw funds' }).first().click();
    await expect(page).toHaveURL(/\/wallet\/withdraw/);
    await expect(page.locator('[data-gate="geo-block"]')).toHaveCount(0);
  });

  test('a permitted country sees the page (no interstitial)', async ({ page, context }) => {
    await visitFrom(context, 'PT');
    await context.addCookies([
      {
        name: 'gp_age_ok',
        value: `${Math.floor(Date.now() / 1000)}.PT`,
        url: BASE,
      },
    ]);
    await page.goto('/games');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('[data-gate="geo-block"]')).toHaveCount(0);
    await expect(ageDialog(page)).toHaveCount(0);
  });
});
