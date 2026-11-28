/**
 * Web close-out regressions against a running web (DEV MOCK auth, NEXT_PUBLIC_DATA_SOURCE=api) + API, with fresh
 * DEMO players (and the shared DEMO admins via adminCode() — never a replayed TOTP step):
 *  R36  /sign-in?next=/<TAB>/host never leaves the site for a signed-in member
 *  R20  /admin/login?next=<external | javascript:> never leaves the admin origin for a signed-in admin
 *  R38  signing out and in as another player in the same tab shows the new player's data, not the previous one's
 *  R39  a deposit credited outside this page (watcher / DEMO API) shows the real post-credit Available
 *  R41  a purchase whose response is lost says "couldn't confirm", locks the count, and the retry reuses the key
 *  R42  while RG limits are loading / failed the modal never says "No participation limit set" and Confirm is off
 *  R37  the shell shows the member's real Available (not the DEMO 9,215.30)
 *  R11  consent documents, support and bonus terms render (no 404)
 *
 *   E2E_BASE_URL=http://localhost:3312 E2E_API_URL=http://localhost:4312 \
 *     pnpm --filter @gp/web test:e2e -- e2e/web-closeout.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';

import {
  API,
  admin,
  adminSignIn,
  acceptsEntries,
  bearer,
  createPlayer,
  currentRound,
  json,
  mockDidForEmail,
  signIn,
  uniq,
} from './integration/_journey';

const fmt = (v: string) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });

/** DEV MOCK session for an API-created player, set ONCE (no init script that would re-apply it on every load). */
async function signInOnce(page: Page, did: string) {
  await page.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/legal/cookies');
  await page.evaluate((d) => {
    window.localStorage.setItem(
      'gp.devMockSession',
      JSON.stringify({ did: d, email: null, wallet: null }),
    );
  }, did);
}

async function expectOnSite(page: Page) {
  const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).origin).toBe(base.origin);
}

test.describe('web close-out', () => {
  test.setTimeout(180_000);

  test('R11 · legal, support and promotions targets render', async ({ page }) => {
    for (const [path, heading] of [
      ['/legal/terms', 'Terms of service'],
      ['/legal/privacy', 'Privacy policy'],
      ['/legal/aml', 'AML / KYC policy'],
      ['/legal/restricted-countries', 'Restricted countries'],
      ['/legal/licence', 'Licence details'],
      ['/support', 'Support'],
      ['/promotions', 'Promotions'],
      ['/winners', 'Winners'],
    ] as const) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    expect((await page.goto('/legal/not-a-document'))?.status()).toBe(404);
  });

  test('R36 · a TAB-smuggled next= never leaves the site after sign-in', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'r36');
    await signIn(page, p);
    await page.goto('/sign-in?next=%2F%09%2Fevil.example%2Flogin');
    await expectOnSite(page);
    // Closing the step-up page runs its leave() → `next` (window.location.assign before the fix).
    await page.goto('/2fa/challenge?purpose=withdrawal&next=%2F%09%2Fevil.example%2Flogin');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await expectOnSite(page);
  });

  test('R20 · admin login with a session never follows an external or javascript: next', async ({
    page,
  }) => {
    await adminSignIn(page, admin('k.osei'));
    for (const next of ['https://evil.example/admin/login', 'javascript:alert(document.domain)']) {
      let dialog = false;
      page.once('dialog', (d) => {
        dialog = true;
        void d.dismiss();
      });
      await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
      await expect(page).toHaveURL(/\/admin$/);
      expect(dialog).toBe(false);
    }
  });

  test('R38 · the next player in the same tab never sees the previous player’s data', async ({
    page,
    request,
  }) => {
    const a = await createPlayer(request, 'r38a', { deposit: '250.00', twoFactor: true });
    const emailB = `r38b-${uniq()}@example.com`;
    await createPlayer(request, 'r38b', { email: emailB });
    expect(mockDidForEmail(emailB)).toMatch(/^did:privy:mock-/);
    await signInOnce(page, a.did);
    await page.goto('/wallet/withdraw');
    await expect(page.getByRole('heading', { name: 'What do you want to withdraw?' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('2FA on').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Available balance 250\.00/ }).first(),
    ).toBeVisible();

    // Sign out (no reload), then sign in as B in the same tab.
    await page.getByRole('button', { name: /Account menu for/ }).click();
    await page.getByRole('menuitem', { name: /Log out/ }).click();
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Sign in' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Email address').fill(emailB);
    await dialog.getByRole('button', { name: 'Sign in' }).click();
    await dialog.getByLabel('Verification code').fill('135790');
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

    // Same tab, no reload, within A's cache lifetime (useMe staleTime 60 s): B sees B's own profile and balance.
    await expect(page).toHaveURL(/\/wallet\/withdraw/);
    await expect(page.getByText('2FA off').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('2FA on')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Available balance 0\.00/ }).first()).toBeVisible();
  });

  test('R39 · a deposit credited outside this page shows the real Available after', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'r39');
    const sim = await request.post(`${API}/dev/deposits/simulate`, {
      headers: bearer(p.token),
      data: {
        network: 'arbitrum',
        amount: '250.00',
        idempotencyKey: `r39-${uniq()}`,
        mode: 'progressive',
      },
    });
    expect(sim.status(), await sim.text()).toBe(200);
    const { reference } = await json<{ reference: string }>(sim);
    await signIn(page, p);
    await page.goto(`/wallet/deposit?step=pending&ref=${reference}`);
    await expect(page.getByText(/0 \/ 20 confirmations/).first()).toBeVisible({ timeout: 60_000 });
    // Credited by the API (as the chain watcher would), not by this page's DEMO control.
    const adv = await request.post(`${API}/dev/deposits/${reference}/confirmations`, {
      headers: bearer(p.token),
      data: { confirmations: 20 },
    });
    expect(adv.status(), await adv.text()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Deposit credited' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('row', { name: /Available\s+0\.00\s+250\.00/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Pending\s+250\.00\s+0\.00/ })).toBeVisible();
  });

  test('R41 · a lost purchase response is "unknown", the count is locked and the retry reuses the key', async ({
    page,
    request,
  }) => {
    const round = await currentRound(request);
    test.skip(!acceptsEntries(round), `round ${round.number} is not accepting entries right now`);
    const p = await createPlayer(request, 'r41', { deposit: '100.00' });
    await signIn(page, p);
    const keys: string[] = [];
    let drop = true;
    await page.route(`**/pool/rounds/${round.id}/entries`, async (route) => {
      const body = route.request().postDataJSON() as { idempotencyKey: string };
      keys.push(body.idempotencyKey);
      if (drop) {
        drop = false;
        // The server commits, but the response never reaches the browser.
        await route.fetch();
        await route.abort('connectionreset');
        return;
      }
      await route.continue();
    });
    await page.goto('/pool');
    await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
    await dialog.getByRole('button', { name: 'One more entry' }).click();
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    await dialog.getByRole('button', { name: 'Confirm 2 entries · 20.10 USDT' }).click();

    await expect(dialog.getByText('We couldn’t confirm your entries')).toBeVisible({
      timeout: 30_000,
    });
    await expect(dialog.getByText(/Nothing was charged/)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'One more entry' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'One entry fewer' })).toBeDisabled();
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    await dialog.getByRole('button', { name: /Try again · 2 entries · 20\.10 USDT/ }).click();
    await expect(page.getByRole('dialog', { name: /Entries confirmed/ })).toBeVisible({
      timeout: 30_000,
    });
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    // Exactly one purchase was booked.
    const mine = await json<{ entries: number }>(
      await request.get(`${API}/pool/rounds/${round.id}/my-entries`, { headers: bearer(p.token) }),
    );
    expect(mine.entries).toBe(2);
  });

  test('R42 · unknown RG limits are never shown as "no limit" and block Confirm', async ({
    page,
    request,
  }) => {
    const round = await currentRound(request);
    test.skip(!acceptsEntries(round), `round ${round.number} is not accepting entries right now`);
    const p = await createPlayer(request, 'r42', { deposit: '50.00' });
    await signIn(page, p);
    await page.route('**/responsible-gaming', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"error":{"code":"SERVICE_UNAVAILABLE","message":"down","statusCode":503}}',
          })
        : route.continue(),
    );
    await page.goto('/pool');
    await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
    await expect(dialog.getByText('We couldn’t load your limits')).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText('No participation limit set')).toHaveCount(0);
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    await expect(dialog.getByRole('button', { name: /^Confirm 1 entry/ })).toBeDisabled();
  });

  test('R37 · the shell shows the member’s own Available balance', async ({ page, request }) => {
    const p = await createPlayer(request, 'r37', { deposit: '100.00' });
    await signIn(page, p);
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Available balance 100\.00/ }).first()).toBeVisible(
      {
        timeout: 60_000,
      },
    );
    await expect(page.getByText(fmt('9215.30'))).toHaveCount(0);
  });
});
