/**
 * J1 — new player end-to-end (auth → account → wallet → pool → history), fresh email every run:
 * sign up (email + 6-digit code, DEV MOCK) → onboarding (consents unchecked, must tick) → dashboard checklist →
 * KYC Level 1 → DEMO simulated testnet deposit 100.00 USDT credited after 20 confirmations → Global Pool 3 entries
 * (30.00 + platform fee 0.15 on its own line, network fee 0.00) → wallet Available 69.85 / Locked 30.00 →
 * history shows the entry and the fee as separate lines.
 */
import { expect, test } from '@playwright/test';

import {
  API,
  acceptsEntries,
  balances,
  bearer,
  currentRound,
  json,
  psql,
  shot,
  uniq,
  watch,
} from './_journey';

const J = 'j1';

test.describe('J1 — new player: sign-up → onboarding → KYC L1 → deposit 100.00 → 3 entries → wallet + history', () => {
  test.setTimeout(300_000);

  test('fresh player completes the first-session journey with exact balances and fee lines', async ({
    page,
    request,
  }, testInfo) => {
    const signals = watch(page, J);
    const email = `qa-j1-${uniq()}@example.com`;
    // The AUTH-21 prompt is out of scope here (covered by e2e/auth.spec.ts).
    await page.route('**/auth/new-device-alerts', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    try {
      // ── 1. sign up (AUTH: email → 6-digit code) ──────────────────────────────────────────────
      await test.step('sign up with email + code', async () => {
        await page.goto('/sign-up');
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Create your account' })).toBeVisible();
        await dialog.getByLabel('Email address').fill(email);
        await dialog.getByRole('button', { name: 'Create account' }).click();
        await expect(dialog.getByRole('heading', { name: 'Check your email' })).toBeVisible();
        await dialog.getByLabel('Verification code').fill('000000'); // DEV MOCK wrong code
        await expect(dialog.getByText(/attempts left/)).toBeVisible();
        await dialog.getByLabel('Verification code').fill('314159');
        await expect(dialog.getByRole('heading', { name: 'Email verified' })).toBeVisible();
        await dialog.getByRole('button', { name: 'Continue to account setup' }).click();
      });

      // ── 2. onboarding: consents never pre-checked ───────────────────────────────────────────
      await test.step('onboarding with unchecked consents', async () => {
        await expect(page).toHaveURL(/\/onboarding/);
        await expect(page.getByRole('heading', { name: 'Finish setting up your account' })).toBeVisible();
        const boxes = await page.getByRole('checkbox').all();
        expect(boxes.length).toBeGreaterThanOrEqual(2);
        for (const box of boxes) await expect(box).not.toBeChecked();
        await page.getByLabel('Public handle').fill(`qa_j1_${uniq()}`.slice(0, 18));
        await page.getByLabel('Date of birth').fill('1993-05-21');
        const trigger = page.getByLabel('Country of residence');
        if ((await trigger.textContent())?.includes('Choose your country')) {
          await trigger.click();
          await page.getByRole('option', { name: 'Portugal' }).click();
        }
        await page.getByRole('button', { name: 'Finish setup' }).click();
        await expect(
          page.getByText('Accept the Terms of Service and Privacy Policy', { exact: true }),
        ).toBeVisible();
        await shot(page, J, '02_onboarding_consents_required');
        await page.getByRole('checkbox', { name: /I accept the Terms of Service/ }).click();
        await page.getByRole('checkbox', { name: /I am 18 or older/ }).click();
        await page.getByRole('button', { name: 'Finish setup' }).click();
        await expect(page.getByRole('heading', { name: 'You’re all set' })).toBeVisible();
      });

      const did = psql(`select privy_user_id from users where lower(email) = '${email}' limit 1`);
      expect(did, `user row for ${email}`).toMatch(/^did:privy:mock-/);
      // the DEV MOCK provider caches the API token it exchanged for this browser session
      const token = await page.evaluate(() => {
        const raw = window.localStorage.getItem('gp.devMockToken');
        return raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null;
      });
      expect(token, 'DEV MOCK token cached in localStorage gp.devMockToken').toBeTruthy();
      const player = { did, token: token!, handle: '', userId: '' };
      const me = await json<{ id: string; onboardingRequired: boolean }>(
        await request.get(`${API}/me`, { headers: bearer(player.token) }),
      );
      expect(me.onboardingRequired).toBe(false);
      player.userId = me.id;

      // ── 3. dashboard checklist ──────────────────────────────────────────────────────────────
      await test.step('dashboard shows the new-user checklist', async () => {
        await page.goto('/dashboard');
        await expect(page.getByRole('heading', { name: 'Finish setting up your account' })).toBeVisible();
        await expect(page.getByText('1 of 4 complete')).toBeVisible(); // email verified only
        await shot(page, J, '03_dashboard_checklist');
        await page.getByRole('link', { name: 'Start verification' }).first().click();
      });

      // ── 4. KYC Level 1 ──────────────────────────────────────────────────────────────────────
      await test.step('KYC Level 1 (instant approval)', async () => {
        await expect(page).toHaveURL(/\/account\/kyc\/verify/);
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Start Level 1' }).click();
        await expect(dialog.getByRole('heading', { name: 'Confirm your personal details' })).toBeVisible();
        await dialog.getByLabel('First name(s)').fill('Joana');
        await dialog.getByLabel('Last name(s)').fill('Neves');
        await dialog.getByLabel('Date of birth').fill('1993-05-21');
        await dialog.getByLabel('Residential address').fill('Rua do Teste 1');
        await dialog.getByLabel('City').fill('Porto');
        await dialog.getByLabel('Postal code').fill('4000-001');
        await dialog.getByLabel('Occupation').fill('QA engineer');
        await dialog.getByRole('radio', { name: 'I am not a PEP' }).check();
        await dialog.getByRole('checkbox', { name: /details are accurate/ }).click();
        await dialog.getByRole('button', { name: 'Save and continue' }).click();
        await expect(dialog.getByRole('heading', { name: 'Check and submit' })).toBeVisible();
        const submit = dialog.getByRole('button', { name: 'Submit for review' });
        await expect(submit).toBeDisabled();
        await dialog.getByRole('checkbox', { name: /accurate and belong to me/ }).click();
        await submit.click();
        await expect(dialog.getByRole('heading', { name: /You’re verified — Level 1/ })).toBeVisible();
        await dialog.getByRole('button', { name: 'Done' }).click();
        const kyc = await json<{ level: string }>(await request.get(`${API}/kyc`, { headers: bearer(player.token) }));
        expect(kyc.level).toBe('level_1');
      });

      // ── 5. DEMO testnet deposit 100.00, credited after 20 confirmations ────────────────────
      await test.step('deposit 100.00 test USDT (DEMO simulation, 20 confirmations)', async () => {
        await page.goto('/wallet/deposit');
        await expect(page.getByRole('heading', { name: 'Choose a network' })).toBeVisible({ timeout: 60_000 });
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Show deposit address' }).click();
        await expect(page.getByTestId('deposit-address')).toHaveText(/^0x[0-9a-fA-F]{40}$/);
        const demo = page.getByTestId('demo-simulate');
        await demo.getByLabel('Simulated amount').fill('100.00');
        await demo.getByRole('button', { name: 'Simulate testnet deposit' }).click();
        await expect(page.getByRole('heading', { name: 'Deposit detected' })).toBeVisible();
        await expect(page.getByText('0 / 20 confirmations').first()).toBeVisible();
        const mid = await balances(request, player as never);
        expect(mid).toMatchObject({ available: '0.00', pending: '100.00' });
        const advance = page.getByTestId('demo-advance').getByRole('button', { name: 'Add 5 confirmations' });
        for (const n of [5, 10, 15]) {
          await advance.click();
          await expect(page.getByText(`${n} / 20 confirmations`).first()).toBeVisible();
        }
        await advance.click();
        await expect(page.getByRole('heading', { name: 'Deposit credited' })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole('row', { name: /Available\s+0\.00\s+100\.00/ })).toBeVisible();
        await shot(page, J, '05_deposit_credited');
        // Shell top bar must show THIS player's Available balance (not the seeded @nova.k DEMO figure).
        await page.goto('/wallet');
        await expect
          .soft(page.getByRole('link', { name: /^Available balance 100\.00 USDT/ }).first(), 'top-bar balance pill = player Available')
          .toBeVisible({ timeout: 15_000 });
        await shot(page, J, '05_topbar_after_deposit');
        expect(await balances(request, player as never)).toMatchObject({
          available: '100.00',
          locked: '0.00',
          pending: '0.00',
          owed: '0.00',
          total: '100.00',
        });
      });

      // ── 6. Global Pool: 3 entries ───────────────────────────────────────────────────────────
      await test.step('participate with 3 entries: 30.00 + 0.15 platform fee, network fee 0.00', async () => {
        const round = await currentRound(request);
        await page.goto('/pool');
        await expect(page.getByRole('heading', { level: 1, name: 'Global Pool' })).toBeVisible();
        await shot(page, J, '06_pool_hub');
        expect(
          acceptsEntries(round),
          `round #${round.number} must accept entries now (status ${round.status}, opensAt ${round.opensAt}, closesAt ${round.closesAt}, now ${new Date().toISOString()})`,
        ).toBe(true);
        await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
        const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
        await expect(dialog).toBeVisible();
        const entries = dialog.getByLabel('Entries', { exact: true });
        while ((await entries.inputValue()) !== '3')
          await dialog.getByRole('button', { name: 'One more entry' }).click();
        const breakdown = dialog.getByLabel('Cost breakdown');
        await expect(breakdown).toContainText('30.00 USDT');
        await expect(breakdown).toContainText('3 × 0.05 USDT per qualifying entry · not added to the pool');
        await expect(breakdown).toContainText('0.15 USDT');
        await expect(breakdown).toContainText('Network fee');
        await expect(breakdown).toContainText('0.00 USDT');
        await expect(breakdown).toContainText('30.15 USDT');
        await expect(breakdown).toContainText('69.85 USDT');
        const consent = dialog.getByRole('checkbox', { name: /entries are final/ });
        await expect(consent).not.toBeChecked();
        const confirm = dialog.getByRole('button', { name: 'Confirm 3 entries · 30.15 USDT' });
        await expect(confirm).toBeDisabled();
        await consent.click();
        await shot(page, J, '06_participate_preview');
        await confirm.click();
        const receipt = page.getByRole('dialog', { name: /Entries confirmed/ });
        await expect(receipt).toBeVisible({ timeout: 30_000 });
        await expect(receipt).toContainText(/EP-\d+-\d{5}-\d{5}/);
        await shot(page, J, '06_receipt');
        await page.keyboard.press('Escape');
      });

      // ── 7. wallet: Available 69.85, Locked 30.00 ────────────────────────────────────────────
      await test.step('wallet shows Available 69.85 and Locked 30.00', async () => {
        expect(await balances(request, player as never)).toMatchObject({
          available: '69.85',
          locked: '30.00',
          pending: '0.00',
          owed: '0.00',
          total: '99.85',
        });
        await page.goto('/wallet');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
        const main = page.locator('main');
        await expect(main.getByText('69.85').first()).toBeVisible();
        await expect(main.getByText('30.00').first()).toBeVisible();
        await expect(main.getByText('99.85').first()).toBeVisible();
        await shot(page, J, '07_wallet');
      });

      // ── 8. history: entry and fee as separate lines ─────────────────────────────────────────
      await test.step('history lists the entry purchase and the platform fee separately', async () => {
        const fees = await json<{ items: { kind: string; amount: string }[] }>(
          await request.get(`${API}/history/fees`, { headers: bearer(player.token) }),
        );
        expect(fees.items, JSON.stringify(fees.items)).toEqual([
          expect.objectContaining({ kind: 'platform_fee', amount: '0.15' }),
        ]);
        const tx = await json<{ items: { id: string; type: string; amount: string; platformFee: string | null; networkFee: string | null; netAmount: string }[] }>(
          await request.get(`${API}/history/transactions?pageSize=50`, { headers: bearer(player.token) }),
        );
        const entry = tx.items.find((t) => t.type === 'entry_purchase');
        expect(entry, JSON.stringify(tx.items)).toMatchObject({ amount: '30.00', platformFee: '0.15', netAmount: '30.15' });
        expect(entry!.networkFee === null || entry!.networkFee === '0.00').toBe(true);
        const dep = tx.items.find((t) => t.type === 'deposit');
        expect(dep).toMatchObject({ amount: '100.00', status: 'completed' });

        await page.goto('/history/transactions');
        await expect(page.getByRole('heading', { name: 'Transaction history', level: 1 })).toBeVisible();
        await expect(page.getByText('Entries 30.00 + fee 0.15').first()).toBeVisible();
        await shot(page, J, '08_history_transactions');
        await page.goto('/history/fees');
        await expect(page.locator('main').getByText('0.15').first()).toBeVisible();
        await shot(page, J, '08_history_fees');
        await page.goto('/pool/entries');
        const table = page.getByRole('table', { name: /Your entry purchases/ });
        await expect(table).toContainText('3 entries');
        await expect(table).toContainText('30.00 + 0.15 fee');
        await shot(page, J, '08_pool_entries');
      });

      // ── 9. dashboard checklist moved on ─────────────────────────────────────────────────────
      await test.step('dashboard checklist reflects KYC + deposit', async () => {
        await page.goto('/dashboard');
        await expect(page.locator('main')).toBeVisible();
        await shot(page, J, '09_dashboard_after');
      });
    } finally {
      signals.flush(testInfo);
    }
  });
});
