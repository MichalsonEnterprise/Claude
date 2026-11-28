/**
 * ADMIN (admin-b) happy path against a running web + API with the DEMO admins (apps/api/.dev/demo-admins.json):
 * a fresh DEMO player submits KYC Level 1 → K. Osei (Compliance) signs in → Compliance › KYC queue → opens the case →
 * approves it with a written reason + a fresh 2FA code → the case shows "Approved" and the audit trail has the entry.
 * Then the read-only Finance / Global Pool pages render for her role, and Finance › Ledger shows the honest
 * no-permission state (Compliance has no `ledger.read`).
 *
 *   E2E_BASE_URL=http://localhost:3107 E2E_API_URL=http://localhost:4107 pnpm --filter @gp/web test:e2e -- e2e/admin-b.spec.ts
 *   (E2E_DATABASE_URL, default postgresql://postgres@127.0.0.1:5432/globalpool, must be the API's database: the
 *   admin TOTP step is chosen after the step last consumed there.)
 */
import { expect, test, type Page } from '@playwright/test';

// Shared DEMO admins: every TOTP step is accepted once per admin, so codes come from adminCode() (next step after
// totp_secrets.last_used_step — never a replay, no lockout). Needs psql + E2E_DATABASE_URL = the API's database.
import { admin, adminCode, type DemoAdmin } from './integration/_journey';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';

/** Fresh onboarded DEMO player (DEV MOCK token) with an open KYC Level 1 case. */
async function playerWithKycCase() {
  const did = `did:privy:e2e-adminb-${Math.random().toString(36).slice(2, 10)}`;
  const tok = (await (
    await fetch(`${API}/auth/dev/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did }),
    })
  ).json()) as { token: string };
  const handle = `e2eb_${Math.random().toString(36).slice(2, 8)}`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${tok.token}` };
  const onboard = await fetch(`${API}/auth/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      handle,
      country: 'PT',
      consents: {
        ageConfirmed: true,
        jurisdictionConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        marketingOptIn: false,
      },
    }),
  });
  expect(onboard.ok).toBe(true);
  const kyc = await fetch(`${API}/kyc/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ level: 'level_1' }),
  });
  expect(kyc.ok).toBe(true);
  return { handle };
}

async function signIn(page: Page, a: DemoAdmin): Promise<void> {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Sign in to the admin console' })).toBeVisible();
  await page.getByLabel('Work email').fill(a.email);
  await page.getByLabel('Password', { exact: true }).fill(a.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
  await page.getByLabel('Authenticator code').fill(await adminCode(a));
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
}

test.describe('ADMIN-B — Compliance KYC decision + Finance / Pool read-only views', () => {
  test('compliance approves a KYC case with reason + 2FA; finance and pool pages respect RBAC', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const player = await playerWithKycCase();
    const osei = admin('k.osei');
    await signIn(page, osei);

    // ADM-C1 KYC queue → the new case
    await page.goto('/admin/compliance/kyc');
    await expect(page.getByRole('heading', { name: 'KYC queue', level: 1 })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search KYC cases' }).fill(player.handle);
    const row = page.getByRole('row', { name: new RegExp(`@${player.handle}`) });
    await expect(row).toHaveCount(1);
    const caseLink = row.getByRole('link', { name: /^KYC-/ });
    await caseLink.click();
    await expect(page.getByText(`KYC review · @${player.handle}`)).toBeVisible();

    // Approve with reason + fresh 2FA (the NEXT time step — the login step can never be replayed)
    await page.getByRole('button', { name: 'Approve L1' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('This action is recorded in the audit log')).toBeVisible();
    await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(dialog.getByText(/min\. 5 characters|reason/i).first()).toBeVisible(); // validation: reason missing
    await dialog
      .getByLabel('Reason (required)')
      .fill('E2E: provider result clear, profile matches, no watchlist hit');
    await dialog.getByLabel('Authenticator code').fill(await adminCode(osei));
    await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Approved').first()).toBeVisible();
    await expect(page.getByText(/kyc\.approve — K\. Osei/)).toBeVisible();

    // ADM-F2 queue (withdrawals.read) and ADM-P10 policy render for Compliance
    await page.goto('/admin/finance/withdrawals');
    await expect(page.getByRole('heading', { name: 'Withdrawals', level: 1 })).toBeVisible();
    await expect(page.getByText('Approval policy FIN-2.3')).toBeVisible();
    await page.goto('/admin/pool/policy');
    await expect(
      page.getByRole('heading', { name: 'Immutable by design', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('Nobody can — by design')).toBeVisible();
    await expect(page.getByText('Edit or choose a draw result').first()).toBeVisible();

    // ADM-F5 ledger needs ledger.read — Compliance gets the honest no-permission state, nothing leaks
    await page.goto('/admin/finance/ledger');
    await expect(page.getByText('Your role can’t open this page').first()).toBeVisible();
  });
});
