/**
 * RG-HISTORY happy path against a running web (DEV MOCK auth, NEXT_PUBLIC_DATA_SOURCE=api) + API, with a fresh,
 * throwaway DEMO player (never @nova.k — breaks cannot be undone):
 * DEMO deposit → set / raise (24 h cool-down) / cancel a weekly deposit limit → transaction history + CSV export →
 * the app-wide reality check when due (session backdated in the dev DB) → a 24-hour break that blocks deposits
 * but never withdrawals.
 *
 *   E2E_BASE_URL=http://localhost:3103 E2E_API_URL=http://localhost:4103 pnpm --filter @gp/web test:e2e -- e2e/rg-history.spec.ts
 */
import { execFileSync } from 'node:child_process';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/globalpool';
const uniq = Math.random().toString(36).slice(2, 10);
const did = `did:privy:e2e-rgh-${uniq}`;
const email = `e2e-rgh-${uniq}@example.com`;

interface RgLimit {
  type: string;
  limit: string | null;
  pendingIncrease: { amount: string | null } | null;
}

async function freshPlayer(request: APIRequestContext): Promise<{ token: string; userId: string }> {
  const t = await request.post(`${API}/auth/dev/token`, { data: { did, email } });
  expect(t.ok()).toBeTruthy();
  const body = (await t.json()) as { token?: string; accessToken?: string };
  const token = body.token ?? body.accessToken ?? '';
  const onboard = await request.post(`${API}/auth/onboarding`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      handle: `e2e_${uniq}`,
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
  expect(onboard.status()).toBe(200);
  const dep = await request.post(`${API}/dev/deposits/simulate`, {
    headers: { authorization: `Bearer ${token}` },
    data: { network: 'arbitrum', amount: '250.00', idempotencyKey: `e2e-rgh-${uniq}` },
  });
  expect(dep.status()).toBe(200);
  const userId = execFileSync(
    'psql',
    [DB, '-At', '-c', `select id from users where privy_user_id = '${did}'`],
    { encoding: 'utf8' },
  ).trim();
  expect(userId).toMatch(/^[0-9a-f-]{36}$/);
  return { token, userId };
}

async function signIn(page: Page) {
  await page.addInitScript(
    ([d, e]) => {
      window.localStorage.setItem(
        'gp.devMockSession',
        JSON.stringify({ did: d, email: e, wallet: null }),
      );
    },
    [did, email] as const,
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('RG-HISTORY — limits, history export, reality check, cooling-off', () => {
  let token = '';
  let userId = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  test.beforeAll(async ({ request }) => {
    ({ token, userId } = await freshPlayer(request));
  });

  test('weekly deposit limit: set now, increase waits 24 h, cancel keeps the limit', async ({
    page,
    request,
  }) => {
    await signIn(page);
    await page.goto('/responsible-gaming/deposit-limits');
    await expect(page.getByRole('heading', { name: 'Deposit limits', level: 1 })).toBeVisible();
    await page.getByRole('radio', { name: /Weekly/ }).click();
    const input = page.getByLabel('Deposit limit in USDT');
    await input.fill('500.00');
    await page.getByRole('button', { name: 'Set limit' }).click();
    await expect(page.getByText('Applied immediately.').first()).toBeVisible();

    await input.fill('900.00');
    await page.getByRole('button', { name: 'Save limit' }).click();
    await expect(page.getByText(/is in its 24-hour cool-down/)).toBeVisible();
    const state = (await (
      await request.get(`${API}/responsible-gaming`, { headers: auth() })
    ).json()) as {
      limits: RgLimit[];
    };
    const dep = state.limits.find((l) => l.type === 'deposit');
    expect(dep?.limit).toBe('500.00'); // server-side cool-down: the higher limit is not active yet
    expect(dep?.pendingIncrease?.amount).toBe('900.00');

    await page.getByRole('button', { name: 'Cancel increase' }).first().click();
    await expect(page.getByText('Your current limit stays.').first()).toBeVisible();
    await expect(page.getByText('Weekly deposit limit change cancelled')).toBeVisible(); // limit history
    const after = (await (
      await request.get(`${API}/responsible-gaming`, { headers: auth() })
    ).json()) as {
      limits: RgLimit[];
    };
    expect(after.limits.find((l) => l.type === 'deposit')?.pendingIncrease).toBeNull();
  });

  test('transaction history lists the deposit and exports a CSV', async ({ page }) => {
    await signIn(page);
    await page.goto('/history/transactions');
    await expect(
      page.getByRole('heading', { name: 'Transaction history', level: 1 }),
    ).toBeVisible();
    await expect(
      page
        .locator('table')
        .getByText(/^DP-\d+/)
        .first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Export CSV' }).first().click();
    await expect(page.getByRole('heading', { name: 'Export as CSV' })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export \d+ rows?$/ }).click();
    expect((await download).suggestedFilename()).toMatch(/^globalpool_transactions_.*\.csv$/);
  });

  test('reality check opens app-wide when due; a choice is required and recorded', async ({
    page,
    request,
  }) => {
    await request.post(`${API}/responsible-gaming/session/heartbeat`, {
      headers: auth(),
      data: {},
    });
    execFileSync('psql', [
      DB,
      '-c',
      `update responsible_gaming_settings set session_started_at = now() - interval '61 minutes', last_activity_at = now() where user_id = '${userId}'`,
    ]);
    await signIn(page);
    await page.goto('/history/games');
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: /You have been playing for 1 h/ }),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCount(0);
    await page.keyboard.press('Escape'); // cannot be dismissed without a choice
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue playing' }).click();
    await expect(dialog).toBeHidden();
    const log = (await (
      await request.get(`${API}/responsible-gaming/history?kind=reality_checks`, {
        headers: auth(),
      })
    ).json()) as { label: string }[];
    expect(log[0]?.label).toBe('Continued');
  });

  test('24-hour break: blocks deposits, never withdrawals', async ({ page, request }) => {
    await signIn(page);
    await page.goto('/responsible-gaming/cooling-off');
    await expect(page.getByRole('heading', { name: 'Cooling-off period', level: 1 })).toBeVisible();
    await page.getByText('24 hours', { exact: true }).click();
    await page.getByRole('button', { name: 'Start break' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Start a 24-hour break?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Start 24-hour break' }).click();
    await expect(page.getByText(/Your 24-hour break is on until/).first()).toBeVisible();

    const dep = await request.post(`${API}/dev/deposits/simulate`, {
      headers: auth(),
      data: { network: 'arbitrum', amount: '20.00', idempotencyKey: `e2e-rgh-2-${uniq}` },
    });
    expect(dep.status()).toBe(403);
    expect(((await dep.json()) as { error: { code: string } }).error.code).toBe('SELF_EXCLUDED');
    expect((await request.get(`${API}/withdrawals`, { headers: auth() })).status()).toBe(200);
  });
});
