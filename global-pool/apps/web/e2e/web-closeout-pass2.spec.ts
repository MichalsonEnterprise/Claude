/**
 * Web close-out pass 2 against a running web (DEV MOCK auth, NEXT_PUBLIC_DATA_SOURCE=api) + API, fresh DEMO players
 * and the shared DEMO admins (adminCode() — never a replayed TOTP step):
 *  R38b  a page that stays mounted across sign-out never shows the previous player's rows to the next player, even
 *        while the next player's own request is still in flight (keepPreviousData observers)
 *  Q15   a self-excluded / on-a-break player who signs in lands on /restricted/self-excluded, not on the lobby
 *  R36b  /sign-in?next=/.//host and /2fa/challenge?next=/.//host never leave the site
 *  Q01   the shell names the member by their own @handle (never @nova.k's profile / money)
 *  R37b  the homepage never tags the DEMO feed row "YOU" or shows the DEMO rakeback amount to a real member
 *  Q10   guests get a sign-in prompt (no endless skeleton) on /restricted and in the KYC dialog
 *  Q05 · Q09 · R11b  link targets that used to 404 render; the geo-block entries CTA opens My entries
 *  Q08   Compliance / Support open Global Pool → Refunds (rounds.read), no "can't open this page", no pointless retry
 *  Q11   Finance's mobile admin tab bar has no KYC tab
 *  Q13   modules that are not built are "Soon" in the admin sidebar, not links
 *
 *   E2E_BASE_URL=http://localhost:3312 E2E_API_URL=http://localhost:4312 \
 *     pnpm --filter @gp/web test:e2e -- e2e/web-closeout-pass2.spec.ts
 */
import type { Page } from '@playwright/test';

import {
  API,
  acceptsEntries,
  admin,
  adminSignIn,
  bearer,
  createPlayer,
  currentRound,
  expect,
  json,
  mockDidForEmail,
  presetAgeGate,
  signIn,
  test,
  uniq,
} from './integration/_journey';

/** DEV MOCK session for an API-created player, set ONCE (no init script that re-applies it on every load). */
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

/** The GLOBAL POOL dialog's email → code sign-in (DEV MOCK: any 6 digits work). */
async function dialogSignIn(page: Page, email: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email address').fill(email);
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  await dialog.getByLabel('Verification code').fill('135790');
  const cont = dialog.getByRole('button', { name: 'Continue', exact: true });
  await expect(cont).toBeEnabled({ timeout: 30_000 });
  await cont.click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}

async function expectOnSite(page: Page) {
  const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).origin).toBe(base.origin);
}

const skeletons = (page: Page) =>
  page.locator('[data-slot="skeleton"]').evaluateAll(
    (els) =>
      els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length,
  );

test.describe('web close-out pass 2', () => {
  test.setTimeout(240_000);

  test('R38b · a mounted keepPreviousData page never shows player A’s rows to player B', async ({
    page,
    request,
  }) => {
    const round = await currentRound(request);
    test.skip(!acceptsEntries(round), 'the current round is not accepting entries right now');
    const a = await createPlayer(request, 'r38ba', { deposit: '100.00' });
    const buy = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
      headers: bearer(a.token),
      data: { entries: 2, idempotencyKey: `r38b-${uniq()}` },
    });
    expect(buy.status(), await buy.text()).toBeLessThan(300);
    const emailB = `r38bb-${uniq()}@example.com`;
    await createPlayer(request, 'r38bb', { email: emailB });
    expect(mockDidForEmail(emailB)).toMatch(/^did:privy:mock-/);

    await signInOnce(page, a.did);
    await page.goto('/pool/history');
    await expect(page.getByText('1 rounds entered · prizes won')).toBeVisible({ timeout: 60_000 });

    // From now on B's /pool/me/entries answers late (real-world latency, made visible).
    let held = 0;
    await page.route('**/pool/me/entries**', async (route) => {
      held++;
      await new Promise((r) => setTimeout(r, 6000));
      await route.continue();
    });

    await page.getByRole('button', { name: /Account menu for/ }).click();
    await page.getByRole('menuitem', { name: /Log out/ }).click();
    await expect(page.getByText('Sign in to see your rounds')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('1 rounds entered · prizes won')).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign in' }).first().click();
    await dialogSignIn(page, emailB);
    await expect(page).toHaveURL(/\/pool\/history/);

    // While B's request is in flight A's figures must never be on screen — sampled with instant (non-retrying) counts,
    // because an auto-retrying assertion would wait the flash out.
    const seen: string[] = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 4500) {
      if ((await page.getByText('1 rounds entered · prizes won').count()) > 0)
        seen.push(`${Date.now() - t0} ms: A's "1 rounds entered"`);
      if ((await page.getByText(/2 entries · 20\.10 USDT/).count()) > 0)
        seen.push(`${Date.now() - t0} ms: A's "2 entries · 20.10 USDT"`);
      await page.waitForTimeout(150);
    }
    expect(held).toBeGreaterThan(0);
    expect(seen, 'player A’s data shown to player B').toEqual([]);
    await expect(page.getByText('0 rounds entered · prizes won')).toBeVisible({ timeout: 30_000 });
  });

  test('Q15 · a player on a break who signs in lands on /restricted/self-excluded', async ({
    page,
    request,
  }) => {
    const email = `q15-${uniq()}@example.com`;
    const p = await createPlayer(request, 'q15', { email, deposit: '20.00' });
    const brk = await request.post(`${API}/responsible-gaming/cooling-off`, {
      headers: bearer(p.token),
      data: { duration: '24h', confirm: true },
    });
    expect(brk.status(), await brk.text()).toBeLessThan(300);
    const st = await json<{ gate: string; paused: { gaming: boolean } }>(
      await request.get(`${API}/auth/account-status`, { headers: bearer(p.token) }),
    );
    expect(st).toMatchObject({ gate: 'self_excluded', paused: { gaming: true } });

    await page.route('**/auth/new-device-alerts', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/sign-in');
    await dialogSignIn(page, email);
    await expect(page).toHaveURL(/\/restricted\/self-excluded/, { timeout: 30_000 });
    await expect(page.locator('main')).toContainText(/break|self-exclu/i);
    await expect(page.getByRole('button', { name: /Participate/ })).toHaveCount(0);

    // A non-gambling next= (withdraw) is honoured: withdrawals stay available during a break.
    await page.getByRole('button', { name: /Account menu for/ }).click();
    await page.getByRole('menuitem', { name: /Log out/ }).click();
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
    await page.goto('/sign-in?next=%2Fwallet%2Fwithdraw');
    await dialogSignIn(page, email);
    await expect(page).toHaveURL(/\/wallet\/withdraw/, { timeout: 30_000 });
  });

  test('R36b · dot-segment next= values never leave the site (sign-in and 2FA step-up)', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'r36b');
    await signInOnce(page, p.did);
    for (const next of ['/.//evil.example/login', '/pool/..//evil.example', '/%2e//evil.example']) {
      await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
      await expectOnSite(page);
      await page.goto(`/2fa/challenge?purpose=withdrawal&next=${encodeURIComponent(next)}`);
      await expectOnSite(page);
      const leave = page.getByRole('button', { name: /Cancel|Continue|Back|Set up/ }).first();
      if (await leave.isVisible().catch(() => false)) {
        await leave.click();
        await expectOnSite(page);
      }
    }
  });

  test('Q01 · R37b · the shell and homepage show the member’s own identity, never the DEMO player’s', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'q01');
    await signInOnce(page, p.did);
    await page.goto('/');
    const menu = page.getByRole('button', { name: `Account menu for @${p.handle}` }).first();
    await expect(menu).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /Account menu for @nova\.k/ })).toHaveCount(0);
    await expect(page.getByText('9,215.30')).toHaveCount(0);
    await expect(page.getByText('3.42 USDT claimable now')).toHaveCount(0);
    await expect(page.getByText('You’re here · 12,840 pts')).toHaveCount(0);
    const table = page.locator('table').filter({ hasText: 'Payout / Result' }).first();
    await table.scrollIntoViewIfNeeded();
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
    await expect(table.getByText('You', { exact: true })).toHaveCount(0);
  });

  test('Q10 · guests get a sign-in prompt, not an endless skeleton, on /restricted and in the KYC dialog', async ({
    page,
  }) => {
    for (const [path, prompt] of [
      ['/restricted', 'Sign in to see your account status'],
      ['/restricted/self-excluded', 'Sign in to see your account status'],
      ['/account/kyc/verify', 'Sign in to verify your identity'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByText(prompt).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(2_000);
      expect(await skeletons(page), path).toBe(0);
    }
  });

  test('Q05 · Q09 · R11b · link targets that used to 404 render', async ({ page, context }) => {
    await presetAgeGate(context);
    for (const path of [
      '/legal/terms',
      '/legal/privacy',
      '/legal/aml-kyc',
      '/legal/cookies',
      '/legal/fees',
      '/legal/licence',
      '/legal/restricted-countries',
      '/support',
      '/promotions',
      '/vip',
      '/winners',
      '/affiliates',
      '/about',
      '/official-channels',
      '/status',
      '/security',
      '/games',
      '/games/orbit-rush',
      '/pool/history',
      '/history/refunds',
      '/history/games/entries',
    ]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0);
    }
    for (const gone of ['/originals', '/history/entries', '/pool/rounds', '/pool/refunds'])
      expect((await page.goto(gone))?.status(), gone).toBe(404);
  });

  test('R11b · a member abroad follows “See your entries and history” to a real page (not a 404, not the gate)', async ({
    page,
    context,
    request,
  }) => {
    // API started with TRUST_PROXY=true GEO_COUNTRY_HEADER=x-country (as for e2e/gates.spec.ts).
    const p = await createPlayer(request, 'r11b');
    await signIn(page, p);
    await context.route(`${API}/**`, (route) =>
      route.continue({ headers: { ...route.request().headers(), 'x-country': 'US' } }),
    );
    await page.goto('/games');
    const gate = page.locator('[data-gate="geo-block"]');
    await expect(gate).toBeVisible({ timeout: 30_000 });
    await gate
      .getByRole('link', { name: /See your entries and history/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/history\/games\/entries/);
    await expect(page.getByRole('heading', { name: 'My entries', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0);
    await expect(page.locator('[data-gate="geo-block"]')).toHaveCount(0);
  });

  test('Q08 · Q13 · Support opens Global Pool → Refunds; unbuilt modules are “Soon”, not links', async ({
    page,
  }) => {
    await adminSignIn(page, admin('r.duarte'));
    await page.goto('/admin/pool/refunds');
    await expect(page.getByRole('heading', { name: 'Refund status', level: 1 })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/can.t open this page/i)).toHaveCount(0);
    await expect(page.getByText(/No cancelled rounds|no manual refund/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Admin navigation' });
    for (const label of [
      'Game Management',
      'Blockchain Management',
      'Affiliate Management',
      'Marketing',
    ]) {
      await expect(nav.getByLabel(`${label} — not in this build yet`)).toBeVisible();
      await expect(nav.getByRole('link', { name: new RegExp(label) })).toHaveCount(0);
    }
  });

  test('Q11 · Finance’s mobile admin tab bar has no KYC tab', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await adminSignIn(page, admin('a.marin'));
    const tabs = page.getByRole('navigation', { name: 'Admin sections' });
    await expect(tabs.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Approvals' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Alerts' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'KYC' })).toHaveCount(0);
  });
});
