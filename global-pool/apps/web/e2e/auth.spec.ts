/**
 * AUTH happy path against a running web (DEV MOCK auth) + API:
 * sign-up (email → 6-digit code) → onboarding consents → 2FA enrolment (QR / key → TOTP → backup codes)
 * → step-up challenge, plus the onboarding guard, wrong-code state and the AUTH-21 new-device alert.
 *
 *   E2E_BASE_URL=http://localhost:3101 pnpm --filter @gp/web test:e2e -- e2e/auth.spec.ts
 */
import { createHmac } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

const uniq = () => Math.random().toString(36).slice(2, 8);

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) — `offset` in steps. */
function totp(secretBase32: string, offset = 0): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secretBase32.replace(/[\s=]/g, '').toUpperCase();
  let bits = '';
  for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => Number.parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30) + offset));
  const h = createHmac('sha1', bytes).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, '0');
}

async function signUpWithEmail(page: Page, email: string) {
  await page.goto('/sign-up');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await dialog.getByLabel('Email address').fill(email);
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await expect(dialog.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page).toHaveURL(/\/verify$/);
  return dialog;
}

test.describe('AUTH — Privy flow (DEV MOCK) → onboarding → 2FA → step-up', () => {
  test('new player signs up, onboards, enrols 2FA and passes a step-up challenge', async ({
    page,
  }) => {
    const email = `e2e-${uniq()}@example.com`;
    const dialog = await signUpWithEmail(page, email);

    // AUTH-04: wrong code first (000000 simulates a wrong code in DEV MOCK), then the right one.
    await dialog.getByLabel('Verification code').fill('000000');
    await expect(dialog.getByText(/4 attempts left/)).toBeVisible();
    await dialog.getByLabel('Verification code').fill('482915');
    await expect(dialog.getByRole('heading', { name: 'Email verified' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue to account setup' }).click();

    // Onboarding: consents are never pre-checked; submitting without them shows errors.
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole('heading', { name: 'Finish setting up your account' }),
    ).toBeVisible();
    for (const box of await page.getByRole('checkbox').all()) await expect(box).not.toBeChecked();
    const handle = `e2e_${uniq()}`;
    await page.getByLabel('Public handle').fill(handle);
    await page.getByLabel('Date of birth').fill('1994-03-14');
    await page.getByRole('button', { name: 'Finish setup' }).click();
    await expect(
      page.getByText('Accept the Terms of Service and Privacy Policy', { exact: true }),
    ).toBeVisible();
    await page.getByRole('checkbox', { name: /I accept the Terms of Service/ }).click();
    await page.getByRole('checkbox', { name: /I am 18 or older/ }).click();
    // country: detected from the API (DEV_COUNTRY_OVERRIDE) or chosen
    const trigger = page.getByLabel('Country of residence');
    if ((await trigger.textContent())?.includes('Choose your country')) {
      await trigger.click();
      await page.getByRole('option', { name: 'Portugal' }).click();
    }
    await page.getByRole('button', { name: 'Finish setup' }).click();
    await expect(page.getByRole('heading', { name: 'You’re all set' })).toBeVisible();

    // AUTH-07: enrol TOTP.
    await page.getByRole('link', { name: 'Set up 2FA now' }).click();
    await expect(
      page.getByRole('heading', { name: 'Scan this QR code with your authenticator app' }),
    ).toBeVisible();
    const key = (await page.locator('code').first().textContent())!.replace(/\s/g, '');
    expect(key).toMatch(/^[A-Z2-7]{16,}$/);
    await page.getByRole('button', { name: 'Next: enter code' }).click();
    await page.getByLabel('Authenticator code').fill(totp(key));
    await expect(page.getByRole('heading', { name: 'Save your 10 backup codes' })).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Backup codes' }).getByRole('listitem'),
    ).toHaveCount(10);
    const finish = page.getByRole('button', { name: 'Finish setup' });
    await expect(finish).toBeDisabled();
    await page.getByRole('checkbox', { name: /saved my backup codes/ }).click();
    await finish.click();
    await expect(page).toHaveURL(/\/$/);

    // AUTH-08: step-up challenge (next TOTP step — the confirm step's code can't be replayed).
    await page.goto('/2fa/challenge?purpose=security_settings');
    await expect(page.getByText('Your anti-phishing code')).toBeVisible();
    await page.getByLabel('Authenticator code').fill('000000');
    await expect(page.getByText(/Incorrect or expired code/)).toBeVisible();
    await page.getByLabel('Authenticator code').fill(totp(key, 1));
    await expect(page.getByRole('heading', { name: 'Confirmed' })).toBeVisible();
  });

  test('members who still need consents are sent to /onboarding', async ({ page }) => {
    const dialog = await signUpWithEmail(page, `guard-${uniq()}@example.com`);
    await dialog.getByLabel('Verification code').fill('135790');
    await expect(dialog.getByRole('button', { name: 'Continue to account setup' })).toBeEnabled();
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding\?next=%2F/);
  });

  test('AUTH-21: a sign-in from a new device asks “Was this you?” on the other device', async ({
    browser,
  }) => {
    const email = `device-${uniq()}@example.com`;
    // Device A (default UA): sign up + onboard via the UI.
    const a = await browser.newContext();
    const pa = await a.newPage();
    const dialog = await signUpWithEmail(pa, email);
    await dialog.getByLabel('Verification code').fill('246810');
    await dialog.getByRole('button', { name: 'Continue to account setup' }).click();
    await pa.getByLabel('Public handle').fill(`dev_${uniq()}`);
    await pa.getByLabel('Date of birth').fill('1990-01-02');
    await pa.getByRole('checkbox', { name: /I accept the Terms of Service/ }).click();
    await pa.getByRole('checkbox', { name: /I am 18 or older/ }).click();
    const trigger = pa.getByLabel('Country of residence');
    if ((await trigger.textContent())?.includes('Choose your country')) {
      await trigger.click();
      await pa.getByRole('option', { name: 'Portugal' }).click();
    }
    await pa.getByRole('button', { name: 'Finish setup' }).click();
    await expect(pa.getByRole('heading', { name: 'You’re all set' })).toBeVisible();

    // Device B (Windows · Edge): same email.
    const b = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0',
    });
    const pb = await b.newPage();
    const d2 = await signUpWithEmail(pb, email);
    await d2.getByLabel('Verification code').fill('112233');
    await expect(d2.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();

    // Device A sees the alert and confirms.
    await pa.goto('/');
    const alert = pa.getByRole('dialog', { name: 'Was this you?' });
    await expect(alert).toBeVisible();
    await expect(alert.getByText(/Edge/).first()).toBeVisible();
    await alert.getByRole('button', { name: 'Yes, it was me' }).click();
    await expect(alert).toBeHidden();
    await a.close();
    await b.close();
  });
});
