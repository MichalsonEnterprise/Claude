/**
 * J3 — withdrawal + four-eyes (auth 2FA × wallet × admin-b Finance × admin-a approvals × ledger), fresh player:
 * player with balance enrols TOTP (AUTH-07) → whitelists an address (24 h cool-down, 2FA) → requests a withdrawal to
 * a NEW destination, which the AML rules flag for manual review (rule: first withdrawal to a destination; the other
 * triggers are ≥ 10,000.00 USDT or ≥ 5 withdrawals in 24 h) → step-up 2FA → tracker shows manual review →
 * Finance (A. Marin) approves with reason + 2FA = step 1 of 2 → self-approval blocked (UI + API 403) →
 * Compliance (K. Osei) gives the second approval → tracker / history show the final state → DEMO on-chain confirmation
 * → ledger buckets and reconciliation consistent.
 */
import { expect, test } from '@playwright/test';

import {
  API,
  admin,
  adminCode,
  adminSignIn,
  adminToken,
  balances,
  bearer,
  createPlayer,
  json,
  playerCode,
  shot,
  signIn,
  startWithdrawal,
  watch,
  VIEWPORT,
} from './_journey';

const J = 'j3';
const WHITELISTED = '0x2222222222222222222222222222222222222222';
const DESTINATION = '0x3333333333333333333333333333333333333333';

test.describe('J3 — withdrawal flagged for review → four-eyes approval → final state + ledger', () => {
  test.use({ viewport: VIEWPORT });
  test.setTimeout(420_000);

  test('player withdrawal under review is released by two different admins', async ({ page, browser, request }, testInfo) => {
    const signals = watch(page, J);
    const player = await createPlayer(request, J, { kyc: 'level_1', deposit: '500.00' });
    const headers = bearer(player.token);
    await signIn(page, player);
    let reference = '';
    let withdrawalId = '';

    try {
      await test.step('AUTH-07: enrol TOTP through the UI', async () => {
        await page.goto('/2fa/setup?next=%2Fwallet%2Fwhitelist');
        await expect(
          page.getByRole('heading', { name: 'Scan this QR code with your authenticator app' }),
        ).toBeVisible({ timeout: 60_000 });
        const key = (await page.locator('code').first().textContent())!.replace(/\s/g, '');
        expect(key).toMatch(/^[A-Z2-7]{16,}$/);
        player.totpSecret = key;
        await page.getByRole('button', { name: 'Next: enter code' }).click();
        await page.getByLabel('Authenticator code').fill(await playerCode(player.userId, key));
        await expect(page.getByRole('heading', { name: 'Save your 10 backup codes' })).toBeVisible();
        await page.getByRole('checkbox', { name: /saved my backup codes/ }).click();
        await page.getByRole('button', { name: 'Finish setup' }).click();
        await expect(page).toHaveURL(/\/wallet\/whitelist/, { timeout: 30_000 });
        const tfa = await json<{ enabled: boolean }>(await request.get(`${API}/auth/2fa`, { headers }));
        expect(tfa.enabled).toBe(true);
      });

      await test.step('WAL-23: whitelist an address (unchecked ownership box + 2FA) → 24 h cool-down', async () => {
        await expect(page.getByRole('heading', { name: 'Address whitelist' })).toBeVisible();
        await page.getByRole('button', { name: 'Add address' }).first().click();
        const modal = page.getByRole('dialog', { name: 'Add a withdrawal address' });
        await expect(modal).toBeVisible();
        await modal.getByLabel('Address', { exact: true }).fill(WHITELISTED);
        const owner = modal.getByRole('checkbox', { name: /I own this address/ });
        await expect(owner).not.toBeChecked();
        await owner.click();
        await modal.getByLabel('Authenticator code').fill(await playerCode(player.userId, player.totpSecret!));
        const addBtn = modal.getByRole('button', { name: 'Add to whitelist' });
        // Address valid + ownership ticked + 6-digit code: the optional label must not be needed.
        await expect.soft(addBtn, 'Add to whitelist enabled without the optional label').toBeEnabled({ timeout: 5_000 });
        await shot(page, J, '01a_whitelist_modal_ready_but_disabled');
        // Workaround: editing the (optional) label re-runs the form validation and unlocks the button.
        await modal.getByLabel('Label (optional)').fill('QA cold wallet');
        await addBtn.click();
        await expect(modal).toBeHidden({ timeout: 30_000 });
        await expect(page.getByText(/Cooling down/).first()).toBeVisible();
        await shot(page, J, '01_whitelist_cooling_down');
        const wallets = await json<{ whitelist?: { address: string; usableForWithdrawalsFrom: string }[] }>(
          await request.get(`${API}/me/wallets`, { headers }),
        );
        expect(JSON.stringify(wallets).toLowerCase()).toContain(WHITELISTED.toLowerCase());
      });

      await test.step('the whitelisted address is not usable during its cool-down (API)', async () => {
        const res = await request.post(`${API}/withdrawals`, {
          headers,
          data: {
            network: 'arbitrum',
            address: WHITELISTED,
            amount: '100.00',
            idempotencyKey: `qa-j3-wl-${Date.now()}`,
            totpCode: await playerCode(player.userId, player.totpSecret!),
          },
        });
        expect(res.status()).toBe(422);
        expect((await json<{ error: { code: string } }>(res)).error.code).toBe('ADDRESS_NOT_WHITELISTED');
      });

      await test.step('withdraw 150.00 to a new destination → manual review → step-up 2FA', async () => {
        await startWithdrawal(page, DESTINATION, '150.00');
        await expect(
          page.getByRole('heading', { name: 'Almost there — this one needs a manual review' }),
        ).toBeVisible({ timeout: 30_000 });
        await shot(page, J, '02_risk_check_review');
        await page.getByRole('button', { name: 'Continue to 2FA' }).click();
        await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
        await page.getByLabel('Authenticator code').fill('000000');
        await page.getByRole('button', { name: /Confirm withdrawal · 150\.00 USDT/ }).click();
        await expect(page.getByText(/Incorrect or expired code|attempts? left/i).first()).toBeVisible();
        await page.getByLabel('Authenticator code').fill(await playerCode(player.userId, player.totpSecret!));
        await page.getByRole('button', { name: /Confirm withdrawal · 150\.00 USDT/ }).click();
        await expect(page.getByRole('heading', { name: /Under review/ })).toBeVisible({ timeout: 30_000 });
        reference = /WD-\d+/.exec(page.url())?.[0] ?? '';
        expect(reference).toMatch(/^WD-\d+$/);
        await shot(page, J, '03_pending_under_review');
        const w = await json<{ id: string; status: string; amount: string; networkFee: string; youReceive?: string; netAmount?: string }>(
          await request.get(`${API}/withdrawals/ref/${reference}`, { headers }),
        );
        withdrawalId = w.id;
        expect(w).toMatchObject({ status: 'under_review', amount: '150.00', networkFee: '0.08' });
        expect(await balances(request, player)).toMatchObject({ available: '350.00', locked: '150.00', total: '500.00' });
      });

      await test.step('WAL-22 tracker shows manual review', async () => {
        await page.goto(`/wallet/withdraw/${reference}`);
        await expect(page.getByText(/review/i).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, J, '04_tracker_review');
      });

      // ── admins ─────────────────────────────────────────────────────────────────────────────
      const marin = admin('a.marin');
      const osei = admin('k.osei');
      const a = await browser.newContext({ viewport: VIEWPORT });
      const ap = await a.newPage();
      const aSignals = watch(ap, `${J}_finance`);

      await test.step('Finance (A. Marin) approves with reason + 2FA → step 1 of 2', async () => {
        await adminSignIn(ap, marin);
        await ap.goto(`/admin/finance/withdrawals/${withdrawalId}`);
        await expect(ap.getByText(reference).first()).toBeVisible({ timeout: 60_000 });
        await shot(ap, J, '05_finance_review');
        await ap.getByRole('button', { name: /^Approve · (step )?1 of 2$/ }).filter({ visible: true }).first().click();
        const dialog = ap.getByRole('dialog');
        await expect(dialog.getByText('This action is recorded in the audit log', { exact: false })).toBeVisible();
        await dialog.getByLabel('Reason (required)').fill('QA J3: destination checked against chain analytics, no hits');
        await dialog.getByLabel('Authenticator code').fill(await adminCode(marin));
        await shot(ap, J, '06_finance_approve_dialog');
        await dialog.getByRole('button', { name: /Approve/ }).last().click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
        await expect(ap.getByText(/Awaiting 2nd approver|second approver|1 of 2/i).first()).toBeVisible();
        await shot(ap, J, '07_after_first_approval');
        const w = await json<{ status: string }>(await request.get(`${API}/withdrawals/ref/${reference}`, { headers }));
        expect(w.status).toBe('under_review');
      });

      await test.step('self-approval is blocked (UI disabled + API 403)', async () => {
        await ap.reload();
        const again = ap.getByRole('button', { name: /^Approve/ }).filter({ visible: true }).first();
        await expect(again).toBeDisabled({ timeout: 30_000 });
        const token = await adminToken(request, marin);
        const res = await request.post(`${API}/admin/withdrawals/${withdrawalId}/approve`, {
          headers: bearer(token),
          data: { reason: 'QA J3: self-approval attempt (must be refused)', mfaCode: await adminCode(marin) },
        });
        expect(res.status()).toBe(403);
        expect((await json<{ error: { code: string; message: string } }>(res)).error.message).toMatch(/different admin/i);
        await shot(ap, J, '08_self_approval_blocked');
      });
      aSignals.flush(testInfo);
      await a.close();

      const b = await browser.newContext({ viewport: VIEWPORT });
      const bp = await b.newPage();
      const bSignals = watch(bp, `${J}_compliance`);
      await test.step('second admin (K. Osei, Compliance) approves → queued', async () => {
        await adminSignIn(bp, osei);
        await bp.goto(`/admin/finance/withdrawals/${withdrawalId}`);
        await expect(bp.getByText(reference).first()).toBeVisible({ timeout: 60_000 });
        await bp.getByRole('button', { name: /^Approve · (step )?2 of 2$/ }).filter({ visible: true }).first().click();
        const dialog = bp.getByRole('dialog');
        await dialog.getByLabel('Reason (required)').fill('QA J3: second review — evidence matches, release');
        await dialog.getByLabel('Authenticator code').fill(await adminCode(osei));
        await dialog.getByRole('button', { name: /Approve/ }).last().click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
        await shot(bp, J, '09_after_second_approval');
        const w = await json<{ status: string }>(await request.get(`${API}/withdrawals/ref/${reference}`, { headers }));
        expect(w.status).toBe('queued');
      });

      await test.step('player tracker + history reflect the approval; DEMO confirmation settles it', async () => {
        await page.goto(`/wallet/withdraw/${reference}`);
        await expect(page.getByText(/queued|approved|sending/i).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, J, '10_tracker_queued');
        const conf = await request.post(`${API}/dev/withdrawals/${withdrawalId}/simulate-confirm`, { headers });
        expect(conf.status(), await conf.text()).toBe(200);
        const w = await json<{ status: string }>(await request.get(`${API}/withdrawals/ref/${reference}`, { headers }));
        expect(w.status).toBe('confirmed');
        expect(await balances(request, player)).toMatchObject({
          available: '350.00',
          locked: '0.00',
          pending: '0.00',
          owed: '0.00',
          total: '350.00',
        });
        await page.reload();
        await expect(page.getByText(/confirmed|completed|sent/i).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, J, '11_tracker_confirmed');
        const hist = await json<{ items: { id: string; type: string; status: string; amount: string; networkFee: string | null; netAmount: string }[] }>(
          await request.get(`${API}/history/transactions?types=withdrawal`, { headers }),
        );
        expect(hist.items.find((t) => t.id === reference), JSON.stringify(hist.items)).toMatchObject({
          status: 'completed',
          amount: '150.00',
          networkFee: '0.08',
          netAmount: '149.92',
        });
        await page.goto('/wallet/history');
        await expect(page.getByText(reference).filter({ visible: true }).first()).toBeVisible({ timeout: 60_000 });
        await shot(page, J, '12_wallet_history');
      });

      await test.step('ledger: reconciliation intact, admin view shows both approvers', async () => {
        const token = await adminToken(request, osei);
        const detail = await json<Record<string, unknown>>(
          await request.get(`${API}/admin/finance/withdrawals/${withdrawalId}`, { headers: bearer(token) }),
        );
        const txt = JSON.stringify(detail);
        expect(txt).toContain('A. Marin');
        expect(txt).toContain('K. Osei');
        const sToken = await adminToken(request, admin('s.iyer'));
        const rec = await json<Record<string, unknown>>(
          await request.get(`${API}/admin/ledger/reconciliation`, { headers: bearer(sToken) }),
        );
        expect(rec).toMatchObject({ ok: true, ledgerTotal: '0.00', unbalancedPostings: 0, poolMismatches: [] });
      });
      bSignals.flush(testInfo);
      await b.close();
    } finally {
      signals.flush(testInfo);
    }
  });
});
