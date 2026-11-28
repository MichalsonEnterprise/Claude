/**
 * Close-out pass 2 (web-money) against a running web (DEV MOCK auth, NEXT_PUBLIC_DATA_SOURCE=api) + API, with fresh
 * DEMO players:
 *  Q12  a player who still has to onboard is sent to /onboarding without the pages firing their 403 data queries
 *  Q16  during a break the hub shows the break, offers no "Take a break" and no enabled Participate
 *  Q17  during a break the deposit flow says deposits are paused on step 1 (no address request)
 *  Q19  a withdrawals hold is said up front, and a refused fee quote is shown instead of "You receive —"
 *  Q21  "Add to whitelist" enables with address + ownership + code and NO label
 *  Q26  All activity lists the platform fee of a purchase as its own line
 *  R39b while GET /wallet/balances keeps failing after a credit, the confirmation step does not hammer the API
 *  R41b a purchase / withdrawal whose response was lost stays "couldn't confirm" when the retry gets a 429
 *  R42b ticking consent while RG limits load (or after a failed load + Try again) leaves Confirm enabled
 *
 *   E2E_BASE_URL=http://localhost:3317 E2E_API_URL=http://localhost:4317 \
 *     pnpm --filter @gp/web exec playwright test e2e/web-money-pass2.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';

import {
  API,
  acceptsEntries,
  bearer,
  createPlayer,
  currentRound,
  enrolTotp,
  json,
  playerCode,
  signIn,
  startWithdrawal,
  uniq,
  type Player,
} from './integration/_journey';

const RATE_LIMITED = {
  status: 429,
  contentType: 'application/json',
  body: JSON.stringify({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests — please slow down',
      statusCode: 429,
      requestId: 'e2e-429',
    },
  }),
};

async function startBreak(request: Parameters<typeof createPlayer>[0], p: Player) {
  const r = await request.post(`${API}/responsible-gaming/cooling-off`, {
    headers: bearer(p.token),
    data: { duration: '24h', confirm: true },
  });
  expect(r.status(), await r.text()).toBeLessThan(300);
}

/** API answers of one kind seen by the page (url path + code), e.g. every 403 ONBOARDING_REQUIRED. */
function collectApiErrors(page: Page, code: string) {
  const seen: string[] = [];
  page.on('response', async (r) => {
    if (!r.url().startsWith(API) || r.status() < 400) return;
    try {
      const body = (await r.json()) as { error?: { code?: string } };
      if (body.error?.code === code) seen.push(new URL(r.url()).pathname);
    } catch {
      /* not JSON */
    }
  });
  return seen;
}

test.describe('web-money close-out pass 2', () => {
  test('Q12 · a player who still has to onboard is redirected without 403 data requests', async ({
    page,
    request,
  }) => {
    const did = `did:privy:qa-q12-${uniq()}`;
    const tok = await request.post(`${API}/auth/dev/token`, { data: { did } });
    expect(tok.status()).toBe(200);
    const { token } = await json<{ token: string }>(tok);
    expect((await request.post(`${API}/auth/session`, { headers: bearer(token) })).ok()).toBe(true);
    const refused = collectApiErrors(page, 'ONBOARDING_REQUIRED');
    await signIn(page, { did, token });
    for (const path of ['/history/transactions', '/wallet', '/pool/entries', '/wallet/withdraw']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/onboarding\?next=/, { timeout: 30_000 });
      await page.waitForTimeout(1500);
    }
    // The wallet, history and Global Pool modules no longer ask (the shell's own balance pill is the shell's).
    const mine = refused.filter((p) =>
      /^\/(history\/|transactions|deposits|withdrawals|wallet\/(status|lifetime|linked)|pool\/me\/|responsible-gaming)/.test(
        p,
      ),
    );
    expect(mine, mine.join(', ')).toEqual([]);
  });

  test('Q16 · during a break the hub shows it and never offers Participate or "Take a break"', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'q16', { deposit: '100.00' });
    await startBreak(request, p);
    await signIn(page, p);
    await page.goto('/pool');
    await expect(page.getByText(/You’re on a break until/).first()).toBeVisible({ timeout: 60_000 });
    const strip = page.getByRole('region', { name: 'Responsible gaming' });
    await expect(strip.getByText(/On a break until/)).toBeVisible();
    await expect(strip.getByRole('link', { name: 'Take a break' })).toHaveCount(0);
    const round = await currentRound(request);
    if (acceptsEntries(round)) {
      await expect(page.getByRole('button', { name: 'Participate', exact: true })).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Paused during your break' }).first(),
      ).toBeDisabled();
    }
  });

  test('Q17 · during a break the deposit flow says deposits are paused on step 1', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'q17', { deposit: '20.00' });
    await startBreak(request, p);
    await signIn(page, p);
    let addressRequests = 0;
    page.on('request', (r) => {
      if (r.url().startsWith(`${API}/deposits/address`)) addressRequests += 1;
    });
    await page.goto('/wallet/deposit');
    await expect(page.getByRole('heading', { name: 'Choose a network' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/You’re on a break until/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    // A deep link to the address step never requests (or shows) a deposit address.
    await page.goto('/wallet/deposit?step=address');
    await expect(
      page.getByRole('heading', { name: 'Deposits are paused on your account' }),
    ).toBeVisible({ timeout: 30_000 });
    expect(addressRequests).toBe(0);
  });

  test('Q19 · a withdrawals hold is said up front; a refused quote is shown, not swallowed', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'q19', { kyc: 'level_1', deposit: '200.00' });
    await signIn(page, p);
    // The API's own answers for a withdrawals_frozen player (see e2e/integration/j4 for the real restriction).
    const frozen = {
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'This action is restricted on your account — contact support',
          statusCode: 403,
          details: { restriction: 'withdrawals_frozen' },
        },
      }),
    };
    let freeze = true;
    await page.route(`${API}/auth/account-status`, async (route) => {
      const res = await route.fetch();
      const body = (await res.json()) as Record<string, unknown>;
      if (!freeze) return route.fulfill({ response: res, json: body });
      return route.fulfill({
        response: res,
        json: {
          ...body,
          gate: 'under_review',
          restrictions: [
            { type: 'withdrawals_frozen', since: new Date().toISOString(), reference: 'FRZ-E2E001' },
          ],
          paused: { gaming: false, deposits: false, withdrawals: true },
        },
      });
    });
    await page.goto('/wallet/withdraw');
    await expect(page.getByRole('heading', { name: 'What do you want to withdraw?' })).toBeVisible({
      timeout: 60_000,
    });
    // Said on step 1 — with the case reference and the way to support.
    await expect(
      page.getByText('Withdrawals are on hold while we review your account'),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/case FRZ-E2E001/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      '/support',
    );
    // Walking on, the amount step can't be reviewed; a deep link past it shows the hold, never the review.
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    const newAddress = page.getByRole('radio', { name: /Use a new address/ });
    if (!(await newAddress.isChecked()))
      await page.getByText('Use a new address', { exact: true }).click();
    await page.getByLabel('Withdrawal address').fill(`0x${'7c4e'.padEnd(36, '0')}a21d`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Amount to withdraw').fill('60.00');
    await expect(page.getByRole('button', { name: 'Review fees' })).toBeDisabled();
    await page.goto('/wallet/withdraw?step=fees');
    await expect(page.getByRole('heading', { name: 'Withdrawals are on hold' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Review your withdrawal' })).toHaveCount(0);

    // The gate not loaded yet / stale: the amount step's refused quote still explains the hold.
    freeze = false;
    await page.route(`${API}/withdrawals/quote**`, (route) => route.fulfill(frozen));
    await page.goto('/wallet/withdraw');
    await expect(page.getByRole('heading', { name: 'What do you want to withdraw?' })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    const fresh = page.getByRole('radio', { name: /Use a new address/ });
    if (!(await fresh.isChecked())) await page.getByText('Use a new address', { exact: true }).click();
    await page.getByLabel('Withdrawal address').fill(`0x${'7c4e'.padEnd(36, '0')}a21d`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Amount to withdraw').fill('60.00');
    await expect(
      page.getByText('Withdrawals are on hold while we review your account'),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Review fees' })).toBeDisabled();
  });

  test('Q21 · "Add to whitelist" enables without the optional label', async ({ page, request }) => {
    const p = await createPlayer(request, 'q21', { twoFactor: true });
    await signIn(page, p);
    await page.goto('/wallet/whitelist');
    await page.getByRole('button', { name: 'Add address' }).first().click();
    const modal = page.getByRole('dialog', { name: 'Add a withdrawal address' });
    await modal.getByRole('textbox', { name: 'Address' }).fill(`0x${'1b2c'.padEnd(36, '0')}9f3c`);
    await modal.getByRole('checkbox', { name: /I own this address/ }).click();
    await modal.getByLabel('Authenticator code').fill('123456');
    await expect(modal.getByRole('button', { name: 'Add to whitelist' })).toBeEnabled();
  });

  test('Q26 · All activity shows the platform fee of a purchase as its own line', async ({
    page,
    request,
  }) => {
    const round = await currentRound(request);
    test.skip(!acceptsEntries(round), `round ${round.number} is not accepting entries right now`);
    const p = await createPlayer(request, 'q26', { deposit: '50.00' });
    const buy = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
      headers: bearer(p.token),
      data: { entries: 3, idempotencyKey: `q26-${uniq()}` },
    });
    expect(buy.status(), await buy.text()).toBeLessThan(300);
    await signIn(page, p);
    await page.goto('/history/transactions');
    const fee = page.getByTestId('tx-fee-line').filter({ visible: true }).first();
    await expect(fee).toBeVisible({ timeout: 60_000 });
    await expect(fee).toContainText('Platform fee');
    await expect(fee).toContainText('3 qualifying entries × 0.05 USDT');
    await expect(fee).toContainText('−0.15');
    await expect(page.getByText('−30.00').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('−30.15')).toHaveCount(0);
  });

  test('R39b · a failing balances fetch after a credit does not turn into a request storm', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'r39b');
    const sim = await request.post(`${API}/dev/deposits/simulate`, {
      headers: bearer(p.token),
      data: {
        network: 'arbitrum',
        amount: '250.00',
        idempotencyKey: `r39b-${uniq()}`,
        mode: 'progressive',
      },
    });
    expect(sim.status(), await sim.text()).toBe(200);
    const { reference } = await json<{ reference: string }>(sim);
    await signIn(page, p);
    let fail = false;
    let balanceCalls = 0;
    await page.route(`${API}/wallet/balances`, (route) => {
      if (!fail) return route.continue();
      balanceCalls += 1;
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":{"code":"SERVICE_UNAVAILABLE","message":"down","statusCode":503}}',
      });
    });
    await page.goto(`/wallet/deposit?step=pending&ref=${reference}`);
    await expect(page.getByText(/0 \/ 20 confirmations/).first()).toBeVisible({ timeout: 60_000 });
    fail = true;
    const adv = await request.post(`${API}/dev/deposits/${reference}/confirmations`, {
      headers: bearer(p.token),
      data: { confirmations: 20 },
    });
    expect(adv.status(), await adv.text()).toBe(200);
    await expect(page.getByRole('button', { name: /Try again/ }).first()).toBeVisible({
      timeout: 30_000,
    });
    const settled = balanceCalls;
    await page.waitForTimeout(5000);
    // Before the fix: ~1,000 requests in 5 s. Now: the invalidation's fetch + one automatic refetch (+ retries).
    expect(balanceCalls).toBeLessThanOrEqual(6);
    expect(balanceCalls - settled).toBeLessThanOrEqual(1);
    // The player's Try again still works once the API is back.
    fail = false;
    await page.getByRole('button', { name: /Try again/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Deposit credited' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('row', { name: /Available\s+0\.00\s+250\.00/ })).toBeVisible();
  });

  test('R41b · a lost purchase response stays "couldn’t confirm" when the retry is rate-limited', async ({
    page,
    request,
  }) => {
    const round = await currentRound(request);
    test.skip(!acceptsEntries(round), `round ${round.number} is not accepting entries right now`);
    const p = await createPlayer(request, 'r41b', { deposit: '100.00' });
    await signIn(page, p);
    const keys: string[] = [];
    let attempt = 0;
    await page.route(`**/pool/rounds/*/entries`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const body = route.request().postDataJSON() as { idempotencyKey: string };
      keys.push(body.idempotencyKey);
      attempt += 1;
      if (attempt === 1) {
        await route.fetch(); // the server commits …
        await route.abort('connectionreset'); // … but the answer never arrives
        return;
      }
      if (attempt === 2) return route.fulfill(RATE_LIMITED);
      return route.continue();
    });
    await page.goto('/pool');
    await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
    await dialog.getByRole('button', { name: 'One more entry' }).click();
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    await dialog.getByRole('button', { name: 'Confirm 2 entries · 20.10 USDT' }).click();
    await expect(dialog.getByText('We couldn’t confirm your entries')).toBeVisible({
      timeout: 30_000,
    });
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    await dialog.getByRole('button', { name: /Try again · 2 entries/ }).click();
    // The 429 is decided before the key lookup: it says nothing about the first attempt.
    await expect(dialog.getByText(/Your retry didn’t get through: Too many requests/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(dialog.getByText('We couldn’t confirm your entries')).toBeVisible();
    await expect(dialog.getByText(/Nothing was charged/)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'One more entry' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'One entry fewer' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: /^Reduce to/ })).toHaveCount(0);
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    await dialog.getByRole('button', { name: /Try again · 2 entries/ }).click();
    await expect(page.getByRole('dialog', { name: /Entries confirmed/ })).toBeVisible({
      timeout: 30_000,
    });
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
    const mine = await json<{ entries: number }>(
      await request.get(`${API}/pool/rounds/${round.id}/my-entries`, { headers: bearer(p.token) }),
    );
    expect(mine.entries).toBe(2);
  });

  test('R41b · a lost withdrawal response stays "couldn’t confirm" when the retry is rate-limited', async ({
    page,
    request,
  }) => {
    const p = await createPlayer(request, 'r41bw', { kyc: 'level_1', deposit: '200.00' });
    await enrolTotp(request, p);
    await signIn(page, p);
    const keys: string[] = [];
    let attempt = 0;
    await page.route(`${API}/withdrawals`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      keys.push((route.request().postDataJSON() as { idempotencyKey: string }).idempotencyKey);
      attempt += 1;
      if (attempt === 1) {
        await route.fetch();
        await route.abort('connectionreset');
        return;
      }
      if (attempt === 2) return route.fulfill(RATE_LIMITED);
      return route.continue();
    });
    await startWithdrawal(page, `0x${'5d3a'.padEnd(36, '0')}b7e1`, '60.00');
    await page.getByRole('button', { name: 'Continue to 2FA' }).click({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
    const confirm = page.getByRole('button', { name: /Confirm withdrawal · 60\.00 USDT/ });
    await page.getByLabel('Authenticator code').fill(await playerCode(p.userId, p.totpSecret!));
    await confirm.click();
    await expect(page.getByText('We couldn’t confirm your withdrawal')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel('Authenticator code').fill('123456');
    await confirm.click();
    await expect(page.getByText(/Your retry didn’t get through: Too many requests/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('We couldn’t confirm your withdrawal')).toBeVisible();
    await expect(page.getByText('The withdrawal wasn’t requested')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit withdrawal' })).toHaveCount(0);
    // The third attempt re-sends the same key: the API answers with the withdrawal already requested.
    await page.getByLabel('Authenticator code').fill('654321');
    await confirm.click();
    await expect(page).toHaveURL(/ref=WD-\d+/, { timeout: 30_000 });
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
    const list = await json<{ items: unknown[] }>(
      await request.get(`${API}/withdrawals`, { headers: bearer(p.token) }),
    );
    expect(list.items).toHaveLength(1);
  });

  test('R42b · consent ticked while limits load (or after a failed load) still enables Confirm', async ({
    page,
    request,
  }) => {
    const round = await currentRound(request);
    test.skip(!acceptsEntries(round), `round ${round.number} is not accepting entries right now`);
    const p = await createPlayer(request, 'r42b', { deposit: '50.00' });
    await signIn(page, p);
    let release: () => void = () => undefined;
    const held = new Promise<void>((r) => (release = r));
    let failNext = false;
    await page.route(`${API}/responsible-gaming`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      if (failNext) {
        failNext = false;
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":{"code":"SERVICE_UNAVAILABLE","message":"down","statusCode":503}}',
        });
      }
      await held;
      return route.continue();
    });
    await page.goto('/pool');
    await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: /Confirm your entries/ });
    await expect(dialog.getByLabel('Checking your participation limits')).toBeVisible({
      timeout: 30_000,
    });
    await dialog.getByRole('checkbox', { name: /entries are final/ }).click();
    const confirm = dialog.getByRole('button', { name: /^Confirm 1 entry/ });
    await expect(confirm).toBeDisabled();
    release();
    await expect(dialog.getByLabel('Checking your participation limits')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(confirm).toBeEnabled();

    // Error path: the limits fail, the player ticks consent, then Try again loads them.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    failNext = true;
    await page.reload();
    await page.getByRole('button', { name: 'Participate', exact: true }).first().click();
    const again = page.getByRole('dialog', { name: /Confirm your entries/ });
    await expect(again.getByText('We couldn’t load your limits')).toBeVisible({ timeout: 30_000 });
    await again.getByRole('checkbox', { name: /entries are final/ }).click();
    await again.getByRole('button', { name: 'Try again' }).click();
    await expect(again.getByText('We couldn’t load your limits')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(again.getByRole('button', { name: /^Confirm 1 entry/ })).toBeEnabled();
  });
});
