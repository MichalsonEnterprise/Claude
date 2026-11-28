/**
 * WALLET happy path against a running web (DEV MOCK auth) + API, with a fresh DEMO player:
 * deposit flow (network → token → address + QR → DEMO simulated transfer → confirmations n / 20 → credited → receipt)
 * → withdraw flow (asset → network → new address → amount → fees → risk check (manual review) → 2FA → pending)
 * → cancel (funds back to Available) → history + transaction detail drawer.
 *
 *   E2E_BASE_URL=http://localhost:3104 E2E_API_URL=http://localhost:4104 pnpm --filter @gp/web test:e2e -- e2e/wallet.spec.ts
 */
import { createHmac } from 'node:crypto';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) at an absolute time step. */
function totpAt(secretBase32: string, step: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secretBase32.replace(/[\s=]/g, '').toUpperCase())
    bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => Number.parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, '0');
}
const timeStep = () => Math.floor(Date.now() / 30_000);

interface Player {
  did: string;
  token: string;
  secret: string;
  /** TOTP step consumed by the 2FA enrolment (each step is accepted once). */
  usedStep: number;
}

/** Fresh DEMO player via the API: DEV MOCK token → onboarding → KYC L2 (mock provider) → 2FA. */
async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-wallet-${uniq()}`;
  const tok = await request.post(`${API}/auth/dev/token`, { data: { did } });
  expect(tok.ok()).toBeTruthy();
  const { token } = (await tok.json()) as { token: string };
  const auth = { authorization: `Bearer ${token}` };
  await request.post(`${API}/auth/session`, { headers: auth });
  const onboard = await request.post(`${API}/auth/onboarding`, {
    headers: auth,
    data: {
      handle: `e2e_${uniq()}`,
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
  expect(
    (
      await request.post(`${API}/dev/kyc/approve`, { headers: auth, data: { level: 'level_2' } })
    ).ok(),
  ).toBeTruthy();
  const enrol = await request.post(`${API}/auth/2fa/enroll`, { headers: auth });
  const { secret } = (await enrol.json()) as { secret: string };
  const usedStep = timeStep();
  const confirm = await request.post(`${API}/auth/2fa/confirm`, {
    headers: auth,
    data: { code: totpAt(secret, usedStep) },
  });
  expect(confirm.ok()).toBeTruthy();
  return { did, token, secret, usedStep };
}

async function signIn(page: Page, p: Player) {
  const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  await page
    .context()
    .addCookies([{ name: 'privy-token', value: p.token, domain: base.hostname, path: '/' }]);
  await page.addInitScript((did) => {
    window.localStorage.setItem(
      'gp.devMockSession',
      JSON.stringify({ did, email: null, wallet: null }),
    );
  }, p.did);
  // The auth module's new-device prompt is covered by e2e/auth.spec.ts; keep it out of the wallet flow.
  await page.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('WALLET — deposit → withdraw → cancel → history (DEMO / testnet)', () => {
  test.setTimeout(240_000);

  test('a new player deposits test USDT, requests a withdrawal, cancels it and sees both in history', async ({
    page,
    request,
  }) => {
    const player = await createPlayer(request);
    await signIn(page, player);

    // ── Deposit (WAL-03 … WAL-09) ────────────────────────────────────────────────────────────
    await page.goto('/wallet/deposit');
    await expect(page.getByRole('heading', { name: 'Choose a network' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('radio', { name: /Arbitrum Sepolia/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /BNB Chain/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Choose the token' })).toBeVisible();
    await page.getByRole('button', { name: 'Show deposit address' }).click();
    await expect(page.getByRole('heading', { name: 'Send USDT to this address' })).toBeVisible();
    await expect(page.getByTestId('deposit-address')).toHaveText(/^0x[0-9a-fA-F]{40}$/);
    await expect(
      page.getByRole('img', { name: /QR code of your Arbitrum Sepolia deposit address/ }),
    ).toBeVisible();
    await expect(page.getByText('Send only Test USDT on Arbitrum Sepolia.')).toBeVisible();

    // Clearly-labelled DEMO control: a simulated transfer with 0 / 20 confirmations.
    const demo = page.getByTestId('demo-simulate');
    await expect(demo.getByText('DEMO control — simulate a testnet deposit')).toBeVisible();
    await demo.getByLabel('Simulated amount').fill('250.00');
    await demo.getByRole('button', { name: 'Simulate testnet deposit' }).click();
    await expect(page.getByRole('heading', { name: 'Deposit detected' })).toBeVisible();
    await expect(page.getByText('0 / 20 confirmations').first()).toBeVisible();
    const advance = page
      .getByTestId('demo-advance')
      .getByRole('button', { name: 'Add 5 confirmations' });
    for (const n of [5, 10, 15]) {
      await advance.click();
      await expect(page.getByText(`${n} / 20 confirmations`).first()).toBeVisible();
    }
    await advance.click();
    await expect(page.getByRole('heading', { name: 'Deposit credited' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('row', { name: /Available\s+0\.00\s+250\.00/ })).toBeVisible();
    await page.getByRole('button', { name: 'See receipt' }).click();
    await expect(page.getByRole('heading', { name: 'Deposit successful' })).toBeVisible();
    await expect(page.getByText('GLOBAL POOL deposit fee').first()).toBeVisible();

    // ── Withdraw (WAL-10 … WAL-17) ───────────────────────────────────────────────────────────
    await page.goto('/wallet/withdraw');
    await expect(page.getByRole('heading', { name: 'What do you want to withdraw?' })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Choose the network' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Where should we send it?' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Use a new address/ })).toBeChecked(); // no saved address yet
    await page.getByLabel('Withdrawal address').fill('0x5555555555555555555555555555555555555555');
    await expect(page.getByText('New address — choose how to continue')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByRole('heading', { name: 'How much do you want to withdraw?' }),
    ).toBeVisible();
    await page.getByLabel('Amount to withdraw').fill('300.00');
    await expect(page.getByText('Exceeds your available balance (250.00 USDT)')).toBeVisible();
    await page.getByLabel('Amount to withdraw').fill('100.00');
    await expect(page.getByText(/updated \d{2}:\d{2}:\d{2} UTC/)).toBeVisible();
    await page.getByRole('button', { name: 'Review fees' }).click();

    await expect(page.getByRole('heading', { name: 'Review your withdrawal' })).toBeVisible();
    const next = page.getByRole('button', { name: 'Continue to security check' });
    await expect(next).toBeDisabled(); // the confirmation box is never ticked for the player
    await page.getByRole('checkbox', { name: /I’ve checked the address and network/ }).click();
    await next.click();

    // Risk validation: a new destination → routine manual AML review (the player can still continue).
    await expect(
      page.getByRole('heading', { name: 'Almost there — this one needs a manual review' }),
    ).toBeVisible();
    await expect(
      page.getByText('Routine AML screening for new destinations — usually under 4 h'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continue to 2FA' }).click();

    await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
    if (timeStep() <= player.usedStep)
      await page.waitForTimeout((player.usedStep + 1) * 30_000 - Date.now() + 500);
    await page.getByLabel('Authenticator code').fill(totpAt(player.secret, timeStep()));
    await page.getByRole('button', { name: /Confirm withdrawal · 100\.00 USDT/ }).click();

    await expect(
      page.getByRole('heading', { name: 'Under review — usually under 4 h' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('99.92').first()).toBeVisible(); // 100.00 − 0.08 network fee, platform fee 0.00
    await expect(page).toHaveURL(/ref=WD-\d+/);

    // Cancel before it is sent → the full amount returns to Available.
    await page.getByRole('button', { name: 'Cancel withdrawal' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel withdrawal' }).click();
    await expect(
      page.getByRole('heading', { name: 'Withdrawal cancelled — your funds are back' }),
    ).toBeVisible({ timeout: 20_000 });

    const balances = await request.get(`${API}/wallet/balances`, {
      headers: { authorization: `Bearer ${player.token}` },
    });
    expect(await balances.json()).toMatchObject({
      available: '250.00',
      locked: '0.00',
      pending: '0.00',
    });

    // ── History + detail drawer (WAL-20 / WAL-21) ────────────────────────────────────────────
    await page.goto('/wallet/history');
    await expect(page.getByRole('heading', { name: 'Transaction history' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('2 transactions')).toBeVisible();
    await page.getByRole('button', { name: 'Withdrawals', exact: true }).click();
    await expect(page.getByText('1 transaction match your filters')).toBeVisible();
    await page.getByRole('button', { name: /Withdrawal WD-\d+, open details/ }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Status timeline')).toBeVisible();
    await expect(drawer.getByText('Cancelled by you — funds returned to Available')).toBeVisible();
  });
});
