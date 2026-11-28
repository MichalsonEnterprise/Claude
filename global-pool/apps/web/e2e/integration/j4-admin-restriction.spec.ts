/**
 * J4 — admin restriction (admin-a console × four-eyes × auth account gate × wallet × pool × audit), fresh player:
 * Super Admin (S. Iyer) freezes withdrawals (reason + 2FA → pending four-eyes, nothing changes yet, self-approval
 * blocked) → Compliance (K. Osei) approves → the player sees the restricted state on /wallet/withdraw and /restricted,
 * withdrawals are refused by the API, deposits / Global Pool stay as policy says (withdrawals_frozen pauses only
 * withdrawals) → audit log shows both admins and the hash chain verifies.
 */
import type { Page } from '@playwright/test';

import {
  admin,
  adminCode,
  adminSignIn,
  adminToken,
  API,
  bearer,
  createPlayer,
  currentRound,
  expect,
  json,
  playerCode,
  shot,
  signIn,
  test,
  uniq,
  VIEWPORT,
  watch,
} from './_journey';

const J = 'j4';

/** Desktop: inbox row button "Open AR-…"; mobile (< 768): a card with its own action button. */
async function openApproval(page: Page, ref: string) {
  const row = page.getByRole('button', { name: new RegExp(`Open ${ref}`) });
  await expect(page.getByText(ref).filter({ visible: true }).first()).toBeVisible({ timeout: 60_000 });
  if (await row.filter({ visible: true }).count()) {
    await row.filter({ visible: true }).first().click();
    return;
  }
  const card = page
    .locator('article, li, section, div')
    .filter({ has: page.getByText(ref, { exact: true }) })
    .filter({ has: page.getByRole('button') })
    .last();
  await card.getByRole('button').filter({ visible: true }).last().click();
}

async function pickCategory(page: Page, category: string) {
  await page.getByRole('combobox', { name: 'Reason category' }).click();
  await page.getByRole('option', { name: category }).click();
}

test.describe('J4 — Super Admin freezes withdrawals → four-eyes → player restricted → audit chain', () => {
  test.use({ viewport: VIEWPORT });
  test.setTimeout(420_000);

  test('withdrawals_frozen goes through four-eyes and every module reflects it', async ({ page, browser, request }, testInfo) => {
    const signals = watch(page, J);
    const player = await createPlayer(request, J, { kyc: 'level_1', deposit: '100.00', twoFactor: true });
    const headers = bearer(player.token);
    const iyer = admin('s.iyer');
    const osei = admin('k.osei');
    let ref = '';

    try {
      const a = await browser.newContext({ viewport: VIEWPORT });
      const ap = await a.newPage();
      const aSignals = watch(ap, `${J}_superadmin`);
      await test.step('S. Iyer requests "Withdrawals on hold" (reason + 2FA) → pending four-eyes', async () => {
        await adminSignIn(ap, iyer);
        await ap.goto(`/admin/users?q=${player.handle}`);
        const row = ap.getByRole('link', { name: new RegExp(`@${player.handle}`) }).first();
        await expect(row).toBeVisible({ timeout: 60_000 });
        await row.click();
        await expect(ap.getByTestId('user-balances')).toContainText(/Total balance\s*100\.00/);
        // desktop: "Player sections" tabs · mobile: a "Player section" select — open the tab by URL for both
        await expect(ap).toHaveURL(/\/admin\/users\/[0-9a-f-]{36}$/);
        await ap.goto(`${new URL(ap.url()).pathname}/restrictions`);
        await ap.getByTestId('apply-restriction').click();
        const dialog = ap.getByTestId('apply-restriction-dialog');
        await dialog.getByRole('combobox', { name: 'Restriction' }).click();
        await ap.getByRole('option', { name: /Withdrawals on hold/ }).click();
        await expect(dialog.getByText('A second admin must approve')).toBeVisible();
        const submit = dialog.getByRole('button', { name: 'Submit for approval' });
        await expect(submit).toBeDisabled();
        await pickCategory(ap, 'AML — investigation open');
        await dialog.getByLabel(/Reason \(required/).fill('QA J4: velocity pattern under investigation, hold withdrawals');
        await dialog.getByLabel('Your 2FA code').fill(await adminCode(iyer));
        await shot(ap, J, '01_apply_ready');
        await submit.click();
        await expect(dialog.getByRole('heading', { name: 'Request submitted' })).toBeVisible({ timeout: 30_000 });
        const refText = (await dialog.getByText(/AR-[0-9A-F]{6} · awaiting second approver/).textContent()) ?? '';
        ref = /AR-[0-9A-F]{6}/.exec(refText)![0];
        await dialog.getByRole('button', { name: 'Done' }).click();
        await expect(ap.getByTestId('user-restrictions').getByText('No active restrictions')).toBeVisible();
        // nothing changed for the player yet
        const st = await json<{ restrictions: unknown[]; paused: { withdrawals: boolean } }>(
          await request.get(`${API}/auth/account-status`, { headers }),
        );
        expect(st.paused.withdrawals).toBe(false);
        expect(st.restrictions).toEqual([]);
      });

      await test.step('self-approval is blocked for the requester', async () => {
        await ap.goto('/admin/approvals?view=created_by_me');
        await openApproval(ap, ref);
        const own = ap.getByTestId('approval-review');
        await expect(own.getByText("You can't approve your own request", { exact: true })).toBeVisible();
        await expect(own.getByRole('button', { name: 'Approve' })).toBeDisabled();
        await shot(ap, J, '02_self_approval_blocked');
      });
      aSignals.flush(testInfo);
      await a.close();

      const b = await browser.newContext({ viewport: VIEWPORT });
      const bp = await b.newPage();
      const bSignals = watch(bp, `${J}_compliance`);
      await test.step('K. Osei (Compliance) approves with own reason + 2FA', async () => {
        await adminSignIn(bp, osei);
        await bp.goto('/admin/approvals?view=waiting_for_me');
        await openApproval(bp, ref);
        const review = bp.getByTestId('approval-review');
        await expect(review.getByText('Your decision · second approver')).toBeVisible();
        await pickCategory(bp, 'Independent review completed');
        await review.getByLabel(/Your reason/).fill('QA J4: evidence reviewed, hold is proportionate');
        await review.getByLabel('Fresh 2FA code').fill(await adminCode(osei));
        await review.getByTestId('approve-request').click();
        await expect(review.getByRole('heading', { name: `${ref} approved` })).toBeVisible({ timeout: 30_000 });
        await shot(bp, J, '03_second_approval');
        const st = await json<{ gate: string; restrictions: { type: string }[]; paused: Record<string, boolean> }>(
          await request.get(`${API}/auth/account-status`, { headers }),
        );
        expect(st.restrictions.map((r) => r.type)).toEqual(['withdrawals_frozen']);
        expect(st.paused).toEqual({ gaming: false, deposits: false, withdrawals: true });
      });

      await test.step('API: withdrawals refused, deposits + pool not blocked by this restriction', async () => {
        const wd = await request.post(`${API}/withdrawals`, {
          headers,
          data: {
            network: 'arbitrum',
            address: '0x4444444444444444444444444444444444444444',
            amount: '20.00',
            idempotencyKey: `qa-j4-wd-${uniq()}`,
            totpCode: await playerCode(player.userId, player.totpSecret!),
          },
        });
        expect(wd.status()).toBe(403);
        const wdErr = (await json<{ error: { code: string; message: string } }>(wd)).error;
        expect(wdErr.code).not.toBe('STEP_UP_REQUIRED');
        testInfo.annotations.push({ type: 'withdrawal refusal', description: `${wd.status()} ${wdErr.code}: ${wdErr.message}` });

        const dep = await request.post(`${API}/dev/deposits/simulate`, {
          headers,
          data: { network: 'arbitrum', amount: '10.00', idempotencyKey: `qa-j4-dep-${uniq()}` },
        });
        expect(dep.status(), await dep.text()).toBe(200);
        const round = await currentRound(request);
        const entry = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
          headers,
          data: { entries: 1, idempotencyKey: `qa-j4-e-${uniq()}` },
        });
        // withdrawals_frozen must not block entries: either accepted (round open) or ROUND_NOT_OPEN — never a 403.
        expect(entry.status(), await entry.text()).not.toBe(403);
      });

      await test.step('player sees the restricted state on /wallet/withdraw and /restricted', async () => {
        await signIn(page, player);
        await page.goto('/wallet/withdraw');
        await expect(page.getByRole('heading', { name: 'What do you want to withdraw?' })).toBeVisible({ timeout: 60_000 });
        await shot(page, J, '04_wallet_withdraw');
        const flow = page.locator('main');
        await expect
          .soft(flow.getByText(/withdrawals are (on hold|paused)|on hold/i).filter({ visible: true }).first(), '/wallet/withdraw explains the hold up front')
          .toBeVisible({ timeout: 10_000 });
        // Walk the flow: the player must learn about the hold at some step, not be left without a quote.
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByLabel('Withdrawal address').fill('0x4444444444444444444444444444444444444444');
        await page.getByRole('button', { name: 'Continue' }).click();
        await expect(page.getByRole('heading', { name: 'How much do you want to withdraw?' })).toBeVisible();
        const quote = page.waitForResponse((r) => r.url().includes('/withdrawals/quote'));
        await page.getByLabel('Amount to withdraw').fill('20.00');
        const q = await quote;
        testInfo.annotations.push({ type: 'quote for frozen player', description: `${q.status()} ${(await q.text()).slice(0, 200)}` });
        await page.waitForTimeout(3_000);
        await shot(page, J, '04b_withdraw_amount_step');
        await expect
          .soft(page.getByText(/on hold|paused|frozen|restricted on your account/i).filter({ visible: true }).first(), 'amount step explains why no quote / withdrawal is possible')
          .toBeVisible({ timeout: 5_000 });
        await page.goto('/restricted');
        await expect(
          page.getByText('No restrictions on your account').or(page.getByText(/Withdrawals are paused/i)).first(),
        ).toBeVisible({ timeout: 30_000 });
        await shot(page, J, '05_restricted_index');
        await expect.soft(page, '/restricted routes a withdrawals_frozen player to its restricted page').toHaveURL(/\/restricted\/under-review/);
        await expect
          .soft(page.getByText('No restrictions on your account'), '/restricted must not claim "No restrictions" while withdrawals are frozen')
          .toHaveCount(0);
        await page.goto('/restricted/under-review');
        await expect(page.locator('main')).toBeVisible();
        await page.waitForTimeout(2_000);
        await shot(page, J, '05b_restricted_under_review');
        await expect.soft(page.locator('main'), 'under-review page lists withdrawals as paused').toContainText(/Withdrawals are paused/i);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await page.waitForTimeout(2_000);
        await shot(page, J, '05c_restricted_under_review_390');
        await page.setViewportSize({ width: 1440, height: 1024 });
      });

      await test.step('audit log shows both admins; verify-chain intact', async () => {
        await bp.goto('/admin/audit');
        await expect(bp.getByTestId('audit-integrity')).toContainText('Hash chain intact', { timeout: 60_000 });
        await shot(bp, J, '06_audit');
        const token = await adminToken(request, osei);
        const res = await request.get(`${API}/admin/audit-logs?pageSize=100`, { headers: bearer(token) });
        expect(res.status(), await res.text()).toBe(200);
        const logs = await json<{ items: { actorLabel?: string; action: string; targetId?: string; outcome?: string }[] }>(res);
        const mine = logs.items.filter((l) => JSON.stringify(l).includes(player.userId) || JSON.stringify(l).includes(ref));
        testInfo.annotations.push({
          type: 'audit rows',
          description: mine.map((l) => `${l.actorLabel} · ${l.action} · ${l.outcome ?? ''}`).join(' | '),
        });
        const txt = JSON.stringify(mine);
        expect(txt, 'audit rows for this restriction').toContain('S. Iyer');
        expect(txt).toContain('K. Osei');
        const verify = await json<{ ok?: boolean; valid?: boolean; intact?: boolean }>(
          await request.get(`${API}/admin/audit-logs/verify`, { headers: bearer(token) }),
        );
        expect(verify.ok ?? verify.valid ?? verify.intact, JSON.stringify(verify)).toBe(true);
      });
      bSignals.flush(testInfo);
      await b.close();
    } finally {
      signals.flush(testInfo);
    }
  });
});
