/**
 * J5 — self-exclusion (rg-history × auth × wallet × pool), fresh player every run:
 * self-exclude for 6 months (typed SELF-EXCLUDE + unchecked acknowledgement + 2FA code) → Global Pool entries and
 * deposits blocked (UI + API 403 SELF_EXCLUDED) → withdrawal still possible → cannot shorten (API 409) →
 * signing in again lands on the self-excluded restricted page.
 */

import {
  API,
  balances,
  bearer,
  createPlayer,
  currentRound,
  expect,
  json,
  playerCode,
  shot,
  signIn,
  startWithdrawal,
  test,
  uniq,
  VIEWPORT,
  watch,
} from './_journey';

const J = 'j5';

test.describe('J5 — self-exclusion 6 months: blocks play + deposits, never withdrawals, cannot be shortened', () => {
  test.use({ viewport: VIEWPORT });
  test.setTimeout(300_000);

  test('fresh player self-excludes and every module honours it', async ({ page, request }, testInfo) => {
    const signals = watch(page, J);
    const email = `qa-j5-${uniq()}@example.com`;
    const player = await createPlayer(request, J, {
      email,
      kyc: 'level_1',
      deposit: '100.00',
      twoFactor: true,
    });
    const headers = bearer(player.token);
    await signIn(page, player, email);

    try {
      await test.step('RG7: choose 6 months → consequences → confirm (typed phrase + unchecked acknowledgement)', async () => {
        await page.goto('/responsible-gaming/self-exclusion');
        await expect(page.getByRole('heading', { name: 'Self-exclusion', level: 1 })).toBeVisible({
          timeout: 60_000,
        });
        await page.getByRole('radio', { name: /6 months/ }).click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await expect(page.getByRole('heading', { name: /What changes for 6 months/ })).toBeVisible();
        await page.getByRole('button', { name: 'Continue' }).click();
        await expect(page.getByRole('heading', { name: /Confirm self-exclusion for 6 months/ })).toBeVisible();

        const ack = page.getByRole('checkbox', { name: /I understand this cannot be reversed/ });
        await expect(ack).not.toBeChecked();
        const submit = page.getByRole('button', { name: 'Self-exclude for 6 months' });
        await expect(submit).toBeDisabled();
        await page.getByLabel('Type SELF-EXCLUDE to confirm').fill('self-exclude');
        await ack.click();
        await page.getByLabel('Authenticator code').fill(await playerCode(player.userId, player.totpSecret!));
        await expect(submit).toBeDisabled(); // wrong case → still locked
        await page.getByLabel('Type SELF-EXCLUDE to confirm').fill('SELF-EXCLUDE');
        await expect(submit).toBeEnabled();
        await shot(page, J, '01_confirm_ready');
        await submit.click();
        await expect(page.getByRole('heading', { name: 'Self-exclusion active' })).toBeVisible({ timeout: 30_000 });
        await shot(page, J, '02_self_exclusion_active');

        const rg = await json<{ exclusion: { active: boolean; kind: string; duration: string; endsAt: string } }>(
          await request.get(`${API}/responsible-gaming`, { headers }),
        );
        expect(rg.exclusion).toMatchObject({ active: true, kind: 'self_exclusion', duration: '6m' });
        const days = (Date.parse(rg.exclusion.endsAt) - Date.now()) / 86_400_000;
        expect(days).toBeGreaterThan(179);
        expect(days).toBeLessThan(185);
      });

      await test.step('API: entries and deposits answer 403 SELF_EXCLUDED', async () => {
        const round = await currentRound(request);
        const entry = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
          headers,
          data: { entries: 1, idempotencyKey: `qa-j5-e-${uniq()}` },
        });
        expect(entry.status()).toBe(403);
        expect((await json<{ error: { code: string; details: { kind: string } } }>(entry)).error).toMatchObject({
          code: 'SELF_EXCLUDED',
          details: { kind: 'self_exclusion' },
        });
        const dep = await request.post(`${API}/dev/deposits/simulate`, {
          headers,
          data: { network: 'arbitrum', amount: '10.00', idempotencyKey: `qa-j5-d-${uniq()}` },
        });
        expect(dep.status()).toBe(403);
        expect((await json<{ error: { code: string } }>(dep)).error.code).toBe('SELF_EXCLUDED');
        const addr = await request.get(`${API}/deposits/address?network=arbitrum`, { headers });
        expect(addr.status()).toBe(403);
        expect(await balances(request, player)).toMatchObject({ available: '100.00', locked: '0.00' });
      });

      await test.step('UI: Global Pool participation and deposit are blocked', async () => {
        await page.goto('/pool');
        await expect(page.getByRole('heading', { level: 1, name: 'Global Pool' })).toBeVisible();
        await shot(page, J, '03_pool_blocked');
        // No enabled Participate action for a self-excluded player.
        const participate = page.getByRole('button', { name: 'Participate', exact: true });
        const enabled = (await participate.count()) > 0 && (await participate.first().isEnabled());
        expect.soft(enabled, 'Participate must not be enabled while self-excluded').toBe(false);

        await page.goto('/wallet/deposit');
        await expect(page.getByRole('heading', { name: 'Choose a network' })).toBeVisible({ timeout: 60_000 });
        await shot(page, J, '04_deposit_step1');
        // The deposit flow should tell a self-excluded player up front that deposits are closed.
        // The flow should tell a self-excluded player up front that deposits are closed (not only after step 3).
        const cont = page.getByRole('button', { name: 'Continue' });
        await expect
          .soft(cont, 'deposit step 1 must not let a self-excluded player continue')
          .toBeDisabled({ timeout: 5_000 });
        if (await cont.isEnabled()) {
          await cont.click();
          await page.getByRole('button', { name: 'Show deposit address' }).click();
          await expect(page.getByText('You are self-excluded — gaming and deposits are paused')).toBeVisible({
            timeout: 30_000,
          });
          await expect
            .soft(page.getByRole('heading', { name: 'We couldn’t load your deposit address' }), 'blocked state is shown as a generic error')
            .toHaveCount(0);
        }
        await shot(page, J, '04_deposit_blocked');
        await expect(page.getByTestId('deposit-address')).toHaveCount(0);
      });

      await test.step('withdrawal is still possible (UI flow → manual review, request accepted)', async () => {
        await startWithdrawal(page, '0x7777777777777777777777777777777777777777', '20.00');
        await expect(
          page.getByRole('heading', { name: 'Almost there — this one needs a manual review' }),
        ).toBeVisible({ timeout: 30_000 });
        await page.getByRole('button', { name: 'Continue to 2FA' }).click();
        await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
        await page.getByLabel('Authenticator code').fill(await playerCode(player.userId, player.totpSecret!));
        await page.getByRole('button', { name: /Confirm withdrawal · 20\.00 USDT/ }).click();
        await expect(page.getByRole('heading', { name: /Under review/ })).toBeVisible({ timeout: 30_000 });
        await shot(page, J, '05_withdrawal_under_review');
        expect(await balances(request, player)).toMatchObject({ available: '80.00', locked: '20.00' });
      });

      await test.step('cannot shorten: shorter break / self-exclusion → 409', async () => {
        const cool = await request.post(`${API}/responsible-gaming/cooling-off`, {
          headers,
          data: { duration: '24h', confirm: true },
        });
        expect(cool.status()).toBe(409);
        const se = await request.post(`${API}/responsible-gaming/self-exclusion`, {
          headers,
          data: { duration: '24h', confirm: true },
        });
        expect(se.status()).toBe(409);
        const rg = await json<{ exclusion: { kind: string; duration: string } }>(
          await request.get(`${API}/responsible-gaming`, { headers }),
        );
        expect(rg.exclusion).toMatchObject({ kind: 'self_exclusion', duration: '6m' });
      });

      await test.step('signing in again lands on the self-excluded restricted page', async () => {
        const ctx = await page.context().browser()!.newContext({ viewport: VIEWPORT });
        const p2 = await ctx.newPage();
        const s2 = watch(p2, `${J}_signin`);
        await p2.route('**/auth/new-device-alerts', (r) =>
          r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        );
        await p2.goto('/sign-in');
        const dialog = p2.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
        await dialog.getByLabel('Email address').fill(email);
        await dialog.getByRole('button', { name: 'Sign in' }).click();
        await dialog.getByLabel('Verification code').fill('271828');
        const cont = dialog.getByRole('button', { name: 'Continue', exact: true });
        await expect(cont).toBeEnabled({ timeout: 30_000 });
        await cont.click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
        await p2.waitForTimeout(3_000); // let any post-sign-in redirect settle
        await shot(p2, J, '06_after_sign_in');
        await expect
          .soft(p2, 'after sign-in a self-excluded player should land on /restricted/self-excluded')
          .toHaveURL(/\/restricted\/self-excluded/, { timeout: 15_000 });
        await p2.goto('/restricted');
        await expect(p2).toHaveURL(/\/restricted\/self-excluded/, { timeout: 30_000 });
        await expect(p2.locator('main')).toContainText(/self-exclu/i);
        await shot(p2, J, '07_restricted_self_excluded');
        // mobile check of the same page
        await p2.setViewportSize({ width: 390, height: 844 });
        await p2.reload();
        await expect(p2.locator('main')).toContainText(/self-exclu/i);
        await shot(p2, J, '07_restricted_self_excluded_390');
        s2.flush(testInfo);
        await ctx.close();
      });
    } finally {
      signals.flush(testInfo);
    }
  });
});
