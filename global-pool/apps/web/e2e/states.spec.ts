/**
 * STATES (ERR-02 errors · ERR-03 loading · ERR-07 security warnings) against a running web (DEV MOCK auth, API data
 * source) + API, with a fresh onboarded DEMO player per test and request interception for the failure states.
 * The full route × state sweep is scripts/qa-states.mjs (docs/STATES.md); this spec pins the behaviour fixed there.
 *
 *   E2E_BASE_URL=http://localhost:3314 E2E_API_URL=http://localhost:4314 \
 *     pnpm --filter @gp/web exec playwright test e2e/states.spec.ts
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const BASE = (process.env.E2E_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API = (process.env.E2E_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const uniq = () => Math.random().toString(36).slice(2, 10);
const RAW =
  /Failed to fetch|Bad Gateway|HTTP_ERROR|INTERNAL_ERROR|SERVICE_UNAVAILABLE|signal is aborted|<html/;

interface Session {
  did: string;
  email: string;
  wallet: string | null;
}

/** Fresh onboarded player (optionally with a linked DEMO wallet address) → the DEV MOCK session seed. */
async function freshPlayer(request: APIRequestContext, wallet?: string): Promise<Session> {
  const did = `did:privy:e2e-states-${uniq()}`;
  const tok = await request.post(`${API}/auth/dev/token`, {
    data: { did, ...(wallet ? { wallet } : {}) },
  });
  expect(tok.ok()).toBeTruthy();
  const { token } = (await tok.json()) as { token: string };
  const headers = { authorization: `Bearer ${token}` };
  expect((await request.post(`${API}/auth/session`, { headers })).ok()).toBeTruthy();
  const onboard = await request.post(`${API}/auth/onboarding`, {
    headers,
    data: {
      handle: `st_${uniq()}`,
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
  return { did, email: `${did.slice(10)}@example.com`, wallet: wallet ?? null };
}

async function signInAs(page: Page, session: Session) {
  await page.addInitScript((s) => {
    localStorage.setItem('gp.devMockSession', JSON.stringify(s));
    // the PUB-22 age gate has its own spec (gates.spec.ts)
    localStorage.setItem(
      'gp.ageGate',
      JSON.stringify({ confirmedAt: new Date().toISOString(), country: 'PT' }),
    );
  }, session);
}

/** Answer matching API requests with an error envelope (CORS header so the browser exposes the response). */
async function failApi(page: Page, path: RegExp, status: number, code: string, message: string) {
  await page.route(
    (u) => u.href.startsWith(API) && path.test(new URL(u.href).pathname),
    (route) =>
      route.request().method() === 'OPTIONS'
        ? route.continue()
        : route.fulfill({
            status,
            // credentialed requests: without allow-credentials the browser hides the response
            headers: {
              'access-control-allow-origin': BASE,
              'access-control-allow-credentials': 'true',
            },
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code, message, statusCode: status, requestId: `e2e-${status}` },
            }),
          }),
  );
}

/** EIP-1193 stand-in: connected to this site with `accounts`, on `chain`; switching moves it to Arbitrum Sepolia. */
async function injectWallet(page: Page, accounts: string[], chain = '0x1') {
  await page.addInitScript(
    ([accs, start]) => {
      const listeners: Record<string, ((v: unknown) => void)[]> = {};
      let current = start;
      (window as unknown as { ethereum: unknown }).ethereum = {
        request: ({ method }: { method: string }): Promise<unknown> => {
          if (method === 'eth_chainId') return Promise.resolve(current);
          if (method === 'eth_accounts') return Promise.resolve(accs);
          if (method === 'wallet_switchEthereumChain') {
            current = '0x66eee'; // 421614 Arbitrum Sepolia
            for (const cb of listeners.chainChanged ?? []) cb(current);
            return Promise.resolve(null);
          }
          return Promise.reject(new Error(`unsupported ${method}`));
        },
        on: (e: string, cb: (v: unknown) => void) => {
          (listeners[e] ??= []).push(cb);
        },
        removeListener: () => undefined,
      };
    },
    [accounts, chain] as const,
  );
}

test.describe('ERR-07 wrong network', () => {
  const wallet = `0x${'7'.repeat(39)}1`;

  test('desktop: the member’s linked wallet on another chain → topbar "Wrong network"; Switch clears it', async ({
    page,
    request,
  }) => {
    await signInAs(page, await freshPlayer(request, wallet));
    await injectWallet(page, [wallet]);
    await page.goto('/wallet');
    const button = page.getByRole('button', { name: /Wrong network/ });
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toBeHidden();
  });

  test('mobile: the same state is a security banner with "Switch to Arbitrum"', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page, await freshPlayer(request, wallet));
    await injectWallet(page, [wallet]);
    await page.goto('/wallet');
    const banner = page.locator('[data-security-warning="wrong-network"]').first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('chain ID 1');
    await banner.getByRole('button', { name: 'Switch to Arbitrum' }).click();
    await expect(page.locator('[data-security-warning="wrong-network"]:visible')).toHaveCount(0);
  });

  test('a wallet extension that isn’t the member’s linked wallet shows no warning', async ({
    page,
    request,
  }) => {
    await signInAs(page, await freshPlayer(request));
    await injectWallet(page, ['0x9999999999999999999999999999999999999999']);
    await page.goto('/wallet');
    await expect(page.getByRole('heading', { name: 'Wallet', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Wrong network/ })).toHaveCount(0);
  });
});

test.describe('ERR-02 / ERR-03 / ERR-07 per-route fixes', () => {
  test('/restricted as a guest → sign-in prompt, never an endless skeleton (QA Q10)', async ({
    page,
  }) => {
    await page.goto('/restricted');
    await expect(page.getByText('Sign in to see your account status')).toBeVisible();
    await expect(page.locator('main [data-slot="skeleton"]')).toHaveCount(0);
  });

  test('deposit address unavailable (503) → maintenance copy + Try again, no security alert / raw text', async ({
    page,
    request,
  }) => {
    await signInAs(page, await freshPlayer(request));
    await failApi(
      page,
      /^\/deposits\/address$/,
      503,
      'SERVICE_UNAVAILABLE',
      'Deposits is temporarily paused',
    );
    await page.goto('/wallet/deposit?step=address');
    await expect(page.getByText('Deposits are paused for maintenance')).toBeVisible();
    const err = page.locator('[data-error-kind="maintenance"]');
    await expect(err).toContainText('Deposits is temporarily paused.');
    await expect(err.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    expect(await page.locator('main').innerText()).not.toMatch(RAW);
  });

  test('deposit address step: only the official test-USDT contract is credited (ERR-07)', async ({
    page,
    request,
  }) => {
    await signInAs(page, await freshPlayer(request));
    await page.goto('/wallet/deposit?step=address');
    await expect(page.locator('[data-security-warning="unverified-contract"]')).toContainText(
      'is credited',
    );
  });

  test('withdraw step 1 with balances failing (500) → error + Try again, not an endless skeleton', async ({
    page,
    request,
  }) => {
    await signInAs(page, await freshPlayer(request));
    await failApi(
      page,
      /^\/wallet\/balances$/,
      500,
      'INTERNAL_ERROR',
      'Something went wrong. Please try again.',
    );
    await page.goto('/wallet/withdraw');
    await expect(page.getByText('We couldn’t load your Available balance').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Ref e2e-500').first()).toBeVisible();
    expect(await page.locator('main').innerText()).not.toMatch(RAW);
  });

  test('anti-phishing page with the profile failing → error with Try again, never "Not set" (ERR-07)', async ({
    page,
    request,
  }) => {
    await signInAs(page, await freshPlayer(request));
    await failApi(page, /^\/me$/, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    await page.goto('/account/anti-phishing');
    await expect(page.getByText('We couldn’t load your anti-phishing code')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('main').getByText('Not set', { exact: true })).toHaveCount(0);
  });
});
