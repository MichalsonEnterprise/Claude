/**
 * ACCOUNT happy path against a running web (DEV MOCK auth) + API, with a fresh DEMO player:
 * new-user dashboard (setup checklist) → KYC Level 1 (details with validation errors → instant approval) →
 * KYC Level 2 (ID card upload with a blurry back photo → retake, mock liveness, review, submit) → DEMO reject →
 * resubmit only the failed item → DEMO approve → KYC status + documents → notification centre → security,
 * notification preferences and sessions pages.
 *
 *   E2E_BASE_URL=http://localhost:3102 E2E_API_URL=http://localhost:4102 pnpm --filter @gp/web test:e2e -- e2e/account.spec.ts
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

interface Player {
  did: string;
  token: string;
  handle: string;
}

/** Fresh onboarded DEMO player (Portugal) via the API — no KYC, no deposit, no 2FA. */
async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-account-${uniq()}`;
  const tok = await request.post(`${API}/auth/dev/token`, { data: { did } });
  expect(tok.ok()).toBeTruthy();
  const { token } = (await tok.json()) as { token: string };
  const auth = { authorization: `Bearer ${token}` };
  await request.post(`${API}/auth/session`, { headers: auth });
  const handle = `e2e_${uniq()}`;
  const onboard = await request.post(`${API}/auth/onboarding`, {
    headers: auth,
    data: {
      handle,
      country: 'PT',
      consents: {
        ageConfirmed: true,
        jurisdictionConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        marketingOptIn: false,
      },
    },
  });
  expect(onboard.ok()).toBeTruthy();
  return { did, token, handle };
}

async function signIn(page: Page, p: Player) {
  await page.addInitScript((did) => {
    window.localStorage.setItem(
      'gp.devMockSession',
      JSON.stringify({ did, email: null, wallet: null }),
    );
  }, p.did);
  // The auth module's new-device prompt is covered by e2e/auth.spec.ts; keep it out of this flow.
  await page.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

const photo = (name: string, kb: number) => ({
  name,
  mimeType: 'image/jpeg',
  // deterministic bytes; the mock provider only looks at size (small = too blurry to read)
  buffer: Buffer.alloc(kb * 1024, name.length),
});

test.describe('ACCOUNT — dashboard → KYC L1 → KYC L2 (reject → resubmit → approve) → security pages (DEMO)', () => {
  test.setTimeout(300_000);

  test('a new player completes identity verification from the dashboard checklist', async ({
    page,
    request,
  }) => {
    const player = await createPlayer(request);
    await signIn(page, player);

    // ── USR-01 new-user dashboard ───────────────────────────────────────────────────────────
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { level: 1, name: /Welcome to GLOBAL POOL/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Finish setting up your account' }),
    ).toBeVisible();
    await expect(page.getByText('No transactions yet')).toBeVisible();
    await expect(page.getByText(/You can lose your stake/).first()).toBeVisible();
    await page.getByRole('link', { name: 'Start verification' }).first().click();

    // ── AUTH-11 intro → AUTH-12 details (validation) → instant Level 1 ───────────────────────
    await expect(page).toHaveURL(/\/account\/kyc\/verify/);
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Verify your identity to raise your limits' }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Start Level 1' }).click();
    await expect(
      dialog.getByRole('heading', { name: 'Confirm your personal details' }),
    ).toBeVisible();
    await dialog.getByLabel('Last name(s)').fill('K.');
    await dialog.getByLabel('Date of birth').fill('2010-03-14');
    await dialog.getByLabel('Postal code').fill('1100');
    await dialog.getByRole('button', { name: 'Save and continue' }).click();
    const summary = dialog.getByRole('alert');
    await expect(summary).toContainText(/Please fix \d+ fields/);
    await expect(summary).toContainText('You must be 18 or older');
    await expect(summary).toContainText('0000-000');

    await dialog.getByLabel('First name(s)').fill('Nova');
    await dialog.getByLabel('Last name(s)').fill('Kade');
    await dialog.getByLabel('Date of birth').fill('1994-03-14');
    await dialog.getByLabel('Residential address').fill('Rua do Exemplo 12, 3.º Esq.');
    await dialog.getByLabel('City').fill('Lisboa');
    await dialog.getByLabel('Postal code').fill('1100-001');
    await dialog.getByLabel('Occupation').fill('Software developer');
    await dialog.getByRole('radio', { name: 'I am not a PEP' }).check();
    await dialog.getByRole('checkbox', { name: /details are accurate/ }).click();
    await dialog.getByRole('button', { name: 'Save and continue' }).click();

    await expect(dialog.getByRole('heading', { name: 'Check and submit' })).toBeVisible();
    const submitL1 = dialog.getByRole('button', { name: 'Submit for review' });
    await expect(submitL1).toBeDisabled(); // confirmation is never pre-checked
    await dialog.getByRole('checkbox', { name: /accurate and belong to me/ }).click();
    await submitL1.click();
    await expect(dialog.getByRole('heading', { name: /You’re verified — Level 1/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();

    // ── A4 → Level 2: document (blurry back → retake) → liveness (mock) → review → submit ─────
    await expect(page).toHaveURL(/\/account\/kyc$/);
    await expect(page.getByRole('heading', { name: /You’re verified — Level 1/ })).toBeVisible();
    await page.getByRole('link', { name: 'Upgrade to Level 2' }).click();
    await dialog.getByRole('button', { name: 'Start Level 2' }).click();
    // details carried over from Level 1 → straight to the document step
    await expect(
      dialog.getByRole('heading', { name: 'Upload your identity document' }),
    ).toBeVisible();
    await dialog.getByRole('radio', { name: 'National ID card' }).check();
    await dialog.locator('#kyc-file-front').setInputFiles(photo('id_front.jpg', 900));
    await expect(dialog.getByText('Passed quality check')).toHaveCount(1);
    await dialog.locator('#kyc-file-back').setInputFiles(photo('id_back.jpg', 12));
    await expect(dialog.getByText('This photo is too blurry to read')).toBeVisible();
    const toSelfie = dialog.getByRole('button', { name: 'Continue to selfie' });
    await expect(toSelfie).toBeDisabled();
    await dialog.locator('#kyc-file-back').setInputFiles(photo('id_back_2.jpg', 800));
    await expect(dialog.getByText('Passed quality check')).toHaveCount(2);
    await expect(dialog.getByText('We read these details from your document')).toBeVisible();
    await toSelfie.click();

    await expect(
      dialog.getByRole('heading', { name: 'Record a short selfie video' }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Use DEMO capture (no camera)' }).click();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 30_000 });

    await expect(dialog.getByRole('heading', { name: 'Check and submit' })).toBeVisible();
    await dialog.getByRole('checkbox', { name: /accurate and belong to me/ }).click();
    await dialog.getByRole('button', { name: 'Submit for review' }).click();
    await expect(
      dialog.getByRole('heading', { name: /reviewing your documents/i }),
    ).toBeVisible();

    // ── AUTH-17 rejected (mock provider) → resubmit only the failed item ────────────────────
    await dialog.getByRole('button', { name: 'Reject (blurry photo)' }).click();
    await expect(
      dialog.getByRole('heading', { name: 'We couldn’t verify your ID yet' }),
    ).toBeVisible();
    await expect(dialog.getByText('Needs fixing')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Fix and resubmit' }).click();
    await expect(dialog.getByRole('heading', { name: 'Retake only what failed' })).toBeVisible();
    await dialog.locator('#kyc-file-back').setInputFiles(photo('id_back_3.jpg', 850));
    await expect(dialog.getByText('Passed quality check')).toHaveCount(2);
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    const again = dialog.getByRole('button', { name: 'Submit again' });
    await expect(again).toBeDisabled();
    await dialog.getByRole('checkbox', { name: /accurate and belong to me/ }).click();
    await again.click();
    await dialog.getByRole('button', { name: 'Approve' }).click();
    await expect(dialog.getByRole('heading', { name: /You’re verified — Level 2/ })).toBeVisible();
    await expect(dialog.getByText('25,000.00 USDT')).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();

    // ── A4 / A5 / USR-02 ───────────────────────────────────────────────────────────────────
    await expect(page.getByRole('heading', { name: /You’re verified — Level 2/ })).toBeVisible();
    await page.goto('/account/documents');
    await expect(page.getByText(/2 approved/)).toBeVisible();
    await expect(page.getByText('National ID card — back').first()).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(page.getByText('Verification needs a fix')).toBeVisible();
    await expect(page.getByText('Verification submitted').first()).toBeVisible();
    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(page.getByText(/^0 unread/)).toBeVisible();

    // ── A2 / A9 / A8 ───────────────────────────────────────────────────────────────────────
    await page.goto('/account/security');
    await expect(page.getByRole('img', { name: /Security score \d+ of 100/ })).toBeVisible();
    await expect(page.getByText('Authenticator 2FA on')).toBeVisible();

    await page.goto('/account/notifications');
    const promo = page.getByRole('switch', { name: 'Promotions, bonuses and news: Email' });
    await expect(promo).not.toBeChecked(); // marketing is opt-in only
    await expect(
      page.getByRole('switch', { name: 'New sign-ins and devices: Email' }),
    ).toBeDisabled();
    await promo.click();
    await page.getByRole('button', { name: 'Save preferences' }).first().click();
    await expect(page.getByText('Opted in')).toBeVisible();

    await page.goto('/account/sessions');
    await expect(page.getByText(/This browser —/)).toBeVisible();
  });
});
