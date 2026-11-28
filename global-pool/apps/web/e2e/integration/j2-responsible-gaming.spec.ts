/**
 * J2 — responsible gaming (rg-history × pool × wallet × API enforcement), fresh player every run:
 * set a daily participation limit 20.00 → try 3 entries (30.15 incl. fees) → blocked with the limit state in the
 * participation dialog AND server-side (API 422 RG_LIMIT_EXCEEDED) → raise the limit → pending 24 h, not applied →
 * 24 h cooling-off → Global Pool participation and deposits blocked (UI + API 403 SELF_EXCLUDED) → a withdrawal can
 * still be started and submitted.
 *
 * Steps that need an OPEN round (opensAt ≤ now < closesAt) fail with an explicit message when none is open.
 */
import { expect, test } from '@playwright/test';

import {
  API,
  acceptsEntries,
  balances,
  bearer,
  createPlayer,
  currentRound,
  json,
  playerCode,
  shot,
  signIn,
  startWithdrawal,
  uniq,
  watch,
  VIEWPORT,
} from './_journey';

const J = 'j2';

interface RgLimit {
  type: string;
  period: string;
  limit: string | null;
  used: string | null;
  pendingIncrease: { amount: string | null; effectiveAt: string } | null;
}

test.describe('J2 — participation limit → server-enforced block → pending increase → cooling-off', () => {
  test.use({ viewport: VIEWPORT });
  test.setTimeout(360_000);

  test('limits and breaks are enforced in the UI and by the API; withdrawals stay open', async ({ page, request }, testInfo) => {
    const signals = watch(page, J);
    const player = await createPlayer(request, J, { kyc: 'level_1', deposit: '100.00', twoFactor: true });
    const headers = bearer(player.token);
    await signIn(page, player);
    const rgState = async () =>
      json<{ limits: RgLimit[]; exclusion: { active: boolean; kind: string | null; endsAt: string | null } }>(
        await request.get(`${API}/responsible-gaming`, { headers }),
      );

    try {
      await test.step('RG3: set a daily participation limit of 20.00 (applies now)', async () => {
        await page.goto('/responsible-gaming/participation-limits');
        await expect(page.getByRole('heading', { name: 'Participation limits', level: 1 })).toBeVisible({ timeout: 60_000 });
        const setter = page.locator('[data-slot="card"], div').filter({ has: page.getByLabel('Participation limit in USDT') }).filter({ has: page.getByRole('radiogroup') }).last();
        await setter.getByRole('radio', { name: /^Daily/ }).click();
        await setter.getByLabel('Participation limit in USDT').fill('20.00');
        await setter.getByRole('button', { name: 'Set limit' }).click();
        await expect(page.getByText('Applied immediately.').first()).toBeVisible();
        await shot(page, J, '01_limit_set');
        const l = (await rgState()).limits.find((x) => x.type === 'participation' && x.period === 'day');
        expect(l).toMatchObject({ limit: '20.00', used: '0.00', pendingIncrease: null });
      });

      const round = await currentRound(request);
      await test.step('3 entries (30.15) are blocked by the limit — UI state + API 422 RG_LIMIT_EXCEEDED', async () => {
        if (!acceptsEntries(round)) {
          // Recorded as a failure, but the rest of the journey (pending increase, break, withdrawal) still runs.
          expect
            .soft(
              acceptsEntries(round),
              `round #${round.number} must accept entries now (status ${round.status}, opensAt ${round.opensAt}, now ${new Date().toISOString()})`,
            )
            .toBe(true);
          return;
        }
        await page.goto('/pool');
        await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
        await expect(dialog).toBeVisible();
        const entries = dialog.getByLabel('Entries', { exact: true });
        while ((await entries.inputValue()) !== '3') await dialog.getByRole('button', { name: 'One more entry' }).click();
        await expect(dialog).toContainText(
          'This would exceed your daily participation limit: 0.00 + 30.15 = 30.15 of 20.00 USDT.',
        );
        await expect(dialog.getByRole('button', { name: 'Reduce to 1 entry' })).toBeVisible();
        const consent = dialog.getByRole('checkbox', { name: /entries are final/ });
        if (await consent.isEnabled()) await consent.click();
        await expect(dialog.getByRole('button', { name: /Confirm 3 entries/ })).toBeDisabled();
        await shot(page, J, '02_limit_blocks_3_entries');
        await page.keyboard.press('Escape');

        const res = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
          headers,
          data: { entries: 3, idempotencyKey: `qa-j2-e3-${uniq()}` },
        });
        expect(res.status()).toBe(422);
        expect((await json<{ error: { code: string } }>(res)).error.code).toBe('RG_LIMIT_EXCEEDED');
        expect(await balances(request, player)).toMatchObject({ available: '100.00', locked: '0.00' });
      });

      await test.step('raise to 50.00 → pending 24 h, not applied (UI + API)', async () => {
        await page.goto('/responsible-gaming/participation-limits');
        await expect(page.getByRole('heading', { name: 'Participation limits', level: 1 })).toBeVisible({ timeout: 60_000 });
        const setter = page.locator('form').filter({ has: page.getByLabel('Participation limit in USDT') });
        await setter.getByLabel('Participation limit in USDT').fill('50.00');
        await setter.getByRole('button', { name: 'Save limit' }).click();
        await expect(page.getByText(/24-hour cool-down/).first()).toBeVisible();
        await shot(page, J, '03_increase_pending');
        const l = (await rgState()).limits.find((x) => x.type === 'participation' && x.period === 'day')!;
        expect(l.limit).toBe('20.00');
        expect(l.pendingIncrease?.amount).toBe('50.00');
        const hours = (Date.parse(l.pendingIncrease!.effectiveAt) - Date.now()) / 3_600_000;
        expect(hours).toBeGreaterThan(23.9);
        expect(hours).toBeLessThanOrEqual(24);
        if (acceptsEntries(round)) {
          const res = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
            headers,
            data: { entries: 3, idempotencyKey: `qa-j2-e3b-${uniq()}` },
          });
          expect(res.status(), 'pending increase must not apply yet').toBe(422);
        }
      });

      await test.step('RG6: start a 24 h cooling-off', async () => {
        await page.goto('/responsible-gaming/cooling-off');
        await expect(page.getByRole('heading', { name: 'Cooling-off period', level: 1 })).toBeVisible();
        await page.getByText('24 hours', { exact: true }).click();
        await page.getByRole('button', { name: 'Start break' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Start a 24-hour break?' })).toBeVisible();
        await dialog.getByRole('button', { name: 'Start 24-hour break' }).click();
        await expect(page.getByText(/Your 24-hour break is on until/).first()).toBeVisible();
        await shot(page, J, '04_break_on');
        expect((await rgState()).exclusion).toMatchObject({ active: true, kind: 'cooling_off' });
      });

      await test.step('during the break: entries + deposits refused (API 403) and blocked in the UI', async () => {
        const e = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
          headers,
          data: { entries: 1, idempotencyKey: `qa-j2-e1-${uniq()}` },
        });
        expect(e.status()).toBe(403);
        expect((await json<{ error: { code: string; details: { kind: string } } }>(e)).error).toMatchObject({
          code: 'SELF_EXCLUDED',
          details: { kind: 'cooling_off' },
        });
        const d = await request.post(`${API}/dev/deposits/simulate`, {
          headers,
          data: { network: 'arbitrum', amount: '10.00', idempotencyKey: `qa-j2-d-${uniq()}` },
        });
        expect(d.status()).toBe(403);

        await page.goto('/pool');
        await expect(page.getByRole('heading', { level: 1, name: 'Global Pool' })).toBeVisible();
        await shot(page, J, '05_pool_during_break');
        const participate = page.getByRole('button', { name: 'Participate', exact: true });
        if ((await participate.count()) > 0 && (await participate.first().isEnabled())) {
          await participate.first().click();
          const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
          await expect(dialog).toBeVisible();
          await shot(page, J, '05b_participate_dialog_during_break');
          await expect
            .soft(dialog.getByText(/break|self-exclu|paused/i).first(), 'participation dialog explains the break')
            .toBeVisible({ timeout: 5_000 });
          await page.keyboard.press('Escape');
        }
        await expect
          .soft(participate.filter({ visible: true }), 'no enabled Participate button during a break')
          .toHaveCount(0);

        await page.goto('/wallet/deposit');
        await expect(page.getByRole('heading', { name: 'Choose a network' })).toBeVisible({ timeout: 60_000 });
        await expect
          .soft(page.getByRole('button', { name: 'Continue' }), 'deposit flow blocked up front during a break')
          .toBeDisabled({ timeout: 5_000 });
        await shot(page, J, '06_deposit_during_break');
      });

      await test.step('a withdrawal can still be started and submitted during the break', async () => {
        await startWithdrawal(page, '0x5151515151515151515151515151515151515151', '25.00');
        await expect(page.getByRole('heading', { name: 'Almost there — this one needs a manual review' })).toBeVisible({
          timeout: 30_000,
        });
        await page.getByRole('button', { name: 'Continue to 2FA' }).click();
        await page.getByLabel('Authenticator code').fill(await playerCode(player.userId, player.totpSecret!));
        await page.getByRole('button', { name: /Confirm withdrawal · 25\.00 USDT/ }).click();
        await expect(page.getByRole('heading', { name: /Under review/ })).toBeVisible({ timeout: 30_000 });
        await shot(page, J, '07_withdrawal_during_break');
        expect(await balances(request, player)).toMatchObject({ available: '75.00', locked: '25.00' });
      });
    } finally {
      signals.flush(testInfo);
    }
  });
});
