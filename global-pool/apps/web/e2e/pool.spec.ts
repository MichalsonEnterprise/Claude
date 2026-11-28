/**
 * GLOBAL POOL happy path against a running web (DEV MOCK auth) + API, with a fresh DEMO player:
 * hub (GP-01) → participation preview (GP-02: entries stepper, 10.00 × n + 0.05 × n platform fee as its own line,
 * network fee 0.00, odds, unchecked consent) → confirm (GP-03 pending) → receipt (GP-04) → entry history (GP-10),
 * and the ledger effect checked through the API (Available −10.05 × n, fees separate from the pool).
 *
 * Needs a round that is OPEN for entries right now (opensAt ≤ now < closesAt).
 *   E2E_BASE_URL=http://localhost:3105 E2E_API_URL=http://localhost:4105 pnpm --filter @gp/web test:e2e -- e2e/pool.spec.ts
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

interface Player {
  did: string;
  token: string;
}

/** Fresh DEMO player via the API: DEV MOCK token → session → onboarding → simulated 100.00 test-USDT deposit. */
async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-pool-${uniq()}`;
  const tok = await request.post(`${API}/auth/dev/token`, { data: { did } });
  expect(tok.ok()).toBeTruthy();
  const { token } = (await tok.json()) as { token: string };
  const headers = { authorization: `Bearer ${token}` };
  await request.post(`${API}/auth/session`, { headers });
  const onboard = await request.post(`${API}/auth/onboarding`, {
    headers,
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
  const dep = await request.post(`${API}/dev/deposits/simulate`, {
    headers,
    data: { network: 'arbitrum', amount: '100.00', idempotencyKey: `e2e-dep-${uniq()}` },
  });
  expect(dep.ok()).toBeTruthy();
  return { did, token };
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
  // The new-device prompt belongs to the auth module (e2e/auth.spec.ts); keep it out of this flow.
  await page.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('GLOBAL POOL — participate in the open round (DEMO / testnet)', () => {
  test.setTimeout(240_000);

  test('a new player buys 3 entries: preview → consent → receipt → entry history; fees are their own line', async ({
    page,
    request,
  }) => {
    const current = (await (await request.get(`${API}/pool/rounds/current`)).json()) as {
      id: string;
      number: number;
      status: string;
      opensAt: string;
      closesAt: string;
    };
    const now = Date.now();
    expect(
      current.status === 'open' &&
        Date.parse(current.opensAt) <= now &&
        now < Date.parse(current.closesAt),
      `round ${current.number} must be open for entries right now (status ${current.status}, opens ${current.opensAt})`,
    ).toBeTruthy();

    const player = await createPlayer(request);
    await signIn(page, player);
    const headers = { authorization: `Bearer ${player.token}` };

    // GP-01 hub
    await page.goto('/pool');
    await expect(page.getByRole('heading', { level: 1, name: 'Global Pool' })).toBeVisible();
    await expect(
      page.getByText(`Global Pool · Round #${current.number.toLocaleString('en-US')}`),
    ).toBeVisible();
    await expect(page.getByText(/0\.05 USDT platform fee per entry/).first()).toBeVisible();

    // GP-02 preview
    const participate = page.getByRole('button', { name: 'Participate', exact: true }).first();
    await expect(participate).toBeEnabled();
    await participate.click();
    const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'One more entry' }).click();
    await dialog.getByRole('button', { name: 'One more entry' }).click();
    await expect(dialog.getByLabel('Entries', { exact: true })).toHaveValue('3');
    const breakdown = dialog.getByLabel('Cost breakdown');
    await expect(breakdown).toContainText('30.00 USDT');
    await expect(breakdown).toContainText('Platform fee');
    await expect(breakdown).toContainText(
      '3 × 0.05 USDT per qualifying entry · not added to the pool',
    );
    await expect(breakdown).toContainText('0.15 USDT');
    await expect(breakdown).toContainText('Network fee');
    await expect(breakdown).toContainText('30.15 USDT');
    await expect(breakdown).toContainText('69.85 USDT'); // Available after
    await expect(dialog).toContainText('You can lose your stake');
    await expect(dialog).toContainText('Your odds');

    // consent is never pre-checked; confirm stays disabled until it is ticked
    const consent = dialog.getByRole('checkbox', { name: /entries are final/ });
    await expect(consent).not.toBeChecked();
    const confirm = dialog.getByRole('button', { name: 'Confirm 3 entries · 30.15 USDT' });
    await expect(confirm).toBeDisabled();
    await consent.click();
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // GP-04 receipt (GP-03 pending is shown while the single DB transaction runs)
    const receipt = page.getByRole('dialog', { name: /Entries confirmed/ });
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText(/EP-\d+-\d{5}-\d{5}/);
    await expect(receipt).toContainText('Locked until the draw');
    await expect(receipt).toContainText('30.15 USDT');

    // ledger effect via the API: Available −30.15, Locked +30.00 (fees never enter the pool)
    const bal = (await (await request.get(`${API}/wallet/balances`, { headers })).json()) as {
      available: string;
      locked: string;
    };
    expect(bal.available).toBe('69.85');
    expect(bal.locked).toBe('30.00');
    const hist = (await (await request.get(`${API}/pool/me/entries`, { headers })).json()) as {
      summary: { qualifyingEntries: number; platformFeesPaid: string };
      items: { entries: number; platformFee: string; total: string; result: { kind: string } }[];
    };
    expect(hist.summary).toMatchObject({ qualifyingEntries: 3, platformFeesPaid: '0.15' });
    expect(hist.items[0]).toMatchObject({
      entries: 3,
      platformFee: '0.15',
      total: '30.15',
      result: { kind: 'in_draw' },
    });

    // GP-10 entry history
    await receipt.getByRole('link', { name: /View my entries/ }).click();
    await expect(page).toHaveURL(/\/pool\/entries$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Entry history' })).toBeVisible();
    await expect(page.getByRole('table', { name: /Your entry purchases/ })).toContainText(
      '3 entries',
    );
    await expect(page.getByRole('table', { name: /Your entry purchases/ })).toContainText(
      'In the draw',
    );
    await expect(page.getByRole('table', { name: /Your entry purchases/ })).toContainText(
      '30.00 + 0.15 fee',
    );
  });
});
