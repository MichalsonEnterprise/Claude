/**
 * ADMIN (admin-a) happy path against a running web + API with the DEMO admins (apps/api/.dev/demo-admins.json):
 * K. Osei (Compliance) signs in through ADM-01 (password → authenticator code) → Overview → Users → a fresh DEMO
 * player → Restrictions → applies "Withdrawals on hold" (reason + fresh 2FA) → a FOUR-EYES request is created and
 * nothing changes yet → self-approval is blocked → S. Iyer (Super Admin) signs in, opens Approvals → approves with
 * their own reason + 2FA → the restriction is active and the audit chain verifies.
 *
 *   E2E_BASE_URL=http://localhost:3106 E2E_API_URL=http://localhost:4106 pnpm --filter @gp/web test:e2e -- e2e/admin-a.spec.ts
 *   (E2E_DATABASE_URL, default postgresql://postgres@127.0.0.1:5432/globalpool, must be the API's database: the
 *   admin TOTP step is chosen after the step last consumed there.)
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

// The DEMO admins are shared by every agent / run and each TOTP step is accepted ONCE per admin: codes come from
// adminCode(), which reads totp_secrets.last_used_step and picks the next unused step (never a replay → no
// rejected code, no failed-login count, no lockout). Needs psql + E2E_DATABASE_URL = the API's database.
import { admin, adminCode, type DemoAdmin } from './integration/_journey';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';

/** Fresh onboarded DEMO player (DEV MOCK token). */
async function newPlayer() {
  const did = `did:privy:e2e-admin-${Math.random().toString(36).slice(2, 10)}`;
  const tok = (await (
    await fetch(`${API}/auth/dev/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did }),
    })
  ).json()) as { token: string };
  const handle = `e2e_${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${API}/auth/onboarding`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tok.token}` },
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
  expect(res.ok).toBe(true);
  return { handle };
}

/** ADM-01 two-step sign-in through the UI with a never-used TOTP step. */
async function signIn(page: Page, a: DemoAdmin): Promise<void> {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Sign in to the admin console' })).toBeVisible();
  await page.getByLabel('Work email').fill(a.email);
  await page.getByLabel('Password', { exact: true }).fill(a.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
  await page.getByLabel('Authenticator code').fill(await adminCode(a));
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
}

async function pickCategory(page: Page, category: string) {
  await page.getByRole('combobox', { name: 'Reason category' }).click();
  await page.getByRole('option', { name: category }).click();
}

const SHOTS = 'test-results/visual/admin-a';
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/e2e_${name}.png` });

async function newContext(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  return { ctx, page: await ctx.newPage() };
}

test.describe('ADMIN — four-eyes restriction (ADM-01 → U1 → U2 → U8 → X1 → S3)', () => {
  test('compliance requests a withdrawal hold, the Super Admin approves it', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const player = await newPlayer();
    const osei = admin('k.osei');
    const iyer = admin('s.iyer');

    // ── requester: K. Osei ──────────────────────────────────────────────────────────────────────
    const a = await newContext(browser);
    await signIn(a.page, osei);
    await expect(a.page.getByTestId('admin-signed-in')).toContainText('K. Osei');

    await a.page.getByRole('link', { name: 'User Management' }).click();
    await expect(a.page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
    await a.page.getByRole('searchbox', { name: 'Search players' }).fill(player.handle);
    await expect(a.page).toHaveURL(new RegExp(`q=${player.handle}`));
    const row = a.page.getByRole('link', { name: new RegExp(`@${player.handle}`) }).first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(a.page.getByTestId('user-balances')).toContainText(/Total balance\s*0\.00/);

    await a.page
      .getByRole('navigation', { name: 'Player sections' })
      .getByRole('link', { name: 'Restrictions' })
      .click();
    await a.page.getByTestId('apply-restriction').click();
    const dialog = a.page.getByTestId('apply-restriction-dialog');
    await dialog.getByRole('combobox', { name: 'Restriction' }).click();
    await a.page.getByRole('option', { name: /Withdrawals on hold/ }).click();
    await expect(dialog.getByText('What changes for the user')).toBeVisible();
    await expect(dialog.getByText('A second admin must approve')).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Submit for approval' });
    await expect(submit).toBeDisabled(); // Default state: reason + code missing
    await pickCategory(a.page, 'AML — investigation open');
    await dialog
      .getByLabel(/Reason \(required/)
      .fill('E2E: velocity alert under investigation, hold new withdrawals');
    await dialog.getByLabel('Your 2FA code').fill(await adminCode(osei));
    await shot(a.page, 'X1-U8_apply_ready_1440');
    await submit.click();
    await expect(dialog.getByRole('heading', { name: 'Request submitted' })).toBeVisible();
    await shot(a.page, 'X1_request-submitted_1440');
    const refText =
      (await dialog.getByText(/AR-[0-9A-F]{6} · awaiting second approver/).textContent()) ?? '';
    const ref = /AR-[0-9A-F]{6}/.exec(refText)![0];
    await dialog.getByRole('button', { name: 'Done' }).click();

    // Nothing changed yet; the request is listed for this player.
    const restrictions = a.page.getByTestId('user-restrictions');
    await expect(restrictions.getByText('No active restrictions')).toBeVisible();
    await expect(restrictions.getByText(ref)).toBeVisible();

    // Self-approval is blocked (no MFA code is consumed).
    await a.page.goto('/admin/approvals?view=created_by_me');
    await a.page.getByRole('button', { name: new RegExp(`Open ${ref}`) }).click();
    const own = a.page.getByTestId('approval-review');
    await expect(
      own.getByText("You can't approve your own request", { exact: true }),
    ).toBeVisible();
    await expect(own.getByRole('button', { name: 'Approve' })).toBeDisabled();
    await shot(a.page, 'X1_self-approval-blocked_1440');
    await a.ctx.close();

    // ── second approver: S. Iyer ───────────────────────────────────────────────────────────────
    const b = await newContext(browser);
    await signIn(b.page, iyer);
    await b.page.goto('/admin/approvals?view=waiting_for_me');
    await b.page.getByRole('button', { name: new RegExp(`Open ${ref}`) }).click();
    const review = b.page.getByTestId('approval-review');
    await expect(review.getByText('Your decision · second approver')).toBeVisible();
    await pickCategory(b.page, 'Independent review completed');
    await review
      .getByLabel(/Your reason/)
      .fill('E2E: reviewed the alert evidence, hold is proportionate');
    await review.getByLabel('Fresh 2FA code').fill(await adminCode(iyer));
    await shot(b.page, 'X1_second-approver-ready_1440');
    await review.getByTestId('approve-request').click();
    await expect(review.getByRole('heading', { name: `${ref} approved` })).toBeVisible();
    await shot(b.page, 'X1_approved_1440');
    await review.getByRole('button', { name: 'Done' }).click();

    // The restriction is now active on the profile (applied in the decision's transaction).
    await b.page.goto('/admin/users');
    await b.page.getByRole('searchbox', { name: 'Search players' }).fill(player.handle);
    await expect(b.page).toHaveURL(new RegExp(`q=${player.handle}`));
    await b.page
      .getByRole('link', { name: new RegExp(`@${player.handle}`) })
      .first()
      .click();
    await b.page
      .getByRole('navigation', { name: 'Player sections' })
      .getByRole('link', { name: 'Restrictions' })
      .click();
    await expect(
      b.page.getByTestId('user-restrictions').getByText('Withdrawals on hold').first(),
    ).toBeVisible();

    // S3: the audit chain still verifies after both decisions.
    await b.page.goto('/admin/audit');
    await expect(b.page.getByTestId('audit-integrity')).toContainText('Hash chain intact');
    await b.ctx.close();
  });

  test('unauthenticated visitors are sent to the admin sign-in', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fusers/);
    await expect(page.getByText('Staff access only.')).toBeVisible();
  });
});
