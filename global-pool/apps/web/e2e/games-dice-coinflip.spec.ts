/**
 * Double Side happy path (key "dice-coinflip") against a running web (DEV MOCK auth) + API, with a fresh DEMO player:
 * lobby → Double Side (CF-01: DEMO credits · no cash value, Fees 0.00, "You can lose your stake", RG/Session bar) →
 * pick Tails with the keyboard → flip (CF-02/03: one bet, real server side, balance = 1,000.00 + net, USDT wallet
 * untouched) → dropped response replayed with the same idempotency key (CF-06 connection lost: exactly one bet) →
 * auto-play guardrails → My flips (CF-04: filters, expandable detail) → Fairness (CF-05: rotate & reveal, browser
 * re-derivation with @gp/shared/fair, truncated seed = failed state). Also: REAL_MONEY_ENABLED=false → 403.
 *
 *   E2E_BASE_URL=http://localhost:3113 E2E_API_URL=http://localhost:4213 pnpm --filter @gp/web test:e2e -- e2e/games-dice-coinflip.spec.ts
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

interface Player {
  did: string;
  token: string;
}

interface FlipBet {
  id: string;
  ref: string;
  win: boolean;
  net: string;
  fee: string;
  currency: string;
  params: { pick: 'heads' | 'tails' };
  outcome: { side: 'heads' | 'tails'; pick: 'heads' | 'tails'; u32: number };
  fairness: { nonce: number };
}

async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-cf-${uniq()}`;
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
  return { did, token };
}

async function signIn(page: Page, p: Player) {
  const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  await page.context().addCookies([{ name: 'privy-token', value: p.token, domain: base.hostname, path: '/' }]);
  await page.addInitScript((did) => {
    window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null }));
  }, p.did);
  await page.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

const sideWord = (s: 'heads' | 'tails') => (s === 'heads' ? 'Heads' : 'Tails');

test.describe('Double Side — flip → history → verify (DEMO credits only)', () => {
  test.setTimeout(300_000);

  test('a new player flips Double Side with DEMO credits and verifies the flip in the browser', async ({ page, request }) => {
    const player = await createPlayer(request);
    const headers = { authorization: `Bearer ${player.token}` };
    const walletBefore: unknown = await (await request.get(`${API}/wallet/balances`, { headers })).json();
    const bets = async () =>
      ((await (await request.get(`${API}/games/double-side/bets?pageSize=50`, { headers })).json()) as { items: FlipBet[] })
        .items;

    // Server-side guard: a real-money currency is impossible (REAL_MONEY_ENABLED=false).
    const realMoney = await request.post(`${API}/games/double-side/bets`, {
      headers,
      data: { stake: '1.00', currency: 'USDT', params: { pick: 'heads' }, idempotencyKey: `e2e-rm-${uniq()}` },
    });
    expect(realMoney.status()).toBe(403);
    expect(((await realMoney.json()) as { error: { code: string } }).error.code).toBe('REAL_MONEY_DISABLED');
    expect(await bets()).toHaveLength(0);

    await signIn(page, player);

    // lobby → Double Side tile
    await page.goto('/games');
    await page.getByRole('link', { name: /^Double Side — / }).first().click();
    await expect(page).toHaveURL(/\/games\/double-side$/);

    // CF-01 bet interface
    await expect(page.getByRole('heading', { level: 1, name: 'Double Side' })).toBeVisible();
    const visible = (text: string | RegExp) => page.getByText(text).locator('visible=true').first();
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText('1,000.00');
    await expect(visible('DEMO credits · no cash value')).toBeVisible();
    await expect(page.getByTestId('coinflip-fees')).toContainText('Fees 0.00 DEMO');
    await expect(visible('You can lose your stake.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your session' })).toBeVisible();
    const heads = page.getByRole('radio', { name: /^Heads — win chance 50.00%, pays 1.96×/ });
    const tails = page.getByRole('radio', { name: /^Tails — win chance 50.00%, pays 1.96×/ });
    await expect(heads).toHaveAttribute('aria-checked', 'true');

    // keyboard: arrow keys inside the radio group, then the T shortcut
    await heads.focus();
    await page.keyboard.press('ArrowRight');
    await expect(tails).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(heads).toHaveAttribute('aria-checked', 'true');
    await page.locator('h1').click();
    await page.keyboard.press('t');
    await expect(tails).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('coin-title')).toHaveText('You’re on Tails');

    // auto-play needs an UNTICKED confirmation + stop-loss
    await page.getByRole('radio', { name: 'auto' }).click();
    await expect(page.getByRole('checkbox', { name: /I understand auto-play/ })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Start auto-play' })).toBeDisabled();
    await page.getByRole('radio', { name: 'manual' }).click();

    // CF-02/03: flip once
    const flip = page.getByTestId('coinflip-flip').locator('visible=true').first();
    await expect(flip).toHaveText(/Flip for Tails · 10.00 DEMO/);
    await flip.click();
    const banner = page.getByTestId('result-banner');
    await expect(banner).toBeVisible();
    const [bet] = await bets();
    expect(bet).toBeDefined();
    expect(bet!.params.pick).toBe('tails');
    expect(bet!.fee).toBe('0.00');
    expect(bet!.currency).toBe('DEMO');
    expect(bet!.win).toBe(bet!.outcome.side === 'tails');
    await expect(banner).toHaveAttribute('data-result', bet!.win ? 'win' : 'lose');
    await expect(page.getByTestId('coin-title')).toHaveText(`Landed ${sideWord(bet!.outcome.side)}`);
    await expect(page.getByTestId('coin')).toHaveAttribute('data-side', bet!.outcome.side);
    const credits = (await (await request.get(`${API}/games/credits`, { headers })).json()) as {
      balance: string;
      currency: string;
      cashValue: boolean;
    };
    expect(credits).toMatchObject({ currency: 'DEMO', cashValue: false });
    expect(credits.balance).toBe(bet!.win ? '1009.60' : '990.00');
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText(
      bet!.win ? '1,009.60' : '990.00',
    );

    // USDT wallet untouched by game play
    expect(await (await request.get(`${API}/wallet/balances`, { headers })).json()).toEqual(walletBefore);

    // CF-06 connection lost: the response is dropped once → the retry reuses the SAME idempotency key → one bet
    const keys: string[] = [];
    let dropped = false;
    await page.route('**/games/double-side/bets', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      keys.push((route.request().postDataJSON() as { idempotencyKey: string }).idempotencyKey);
      if (!dropped) {
        dropped = true;
        await route.fetch(); // the server settles the flip …
        return route.abort('connectionreset'); // … but the browser never sees the answer
      }
      return route.continue();
    });
    await page.locator('h1').click();
    await page.keyboard.press('h');
    await flip.click();
    await expect(page.getByTestId('result-banner')).toBeVisible({ timeout: 30_000 });
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(new Set(keys).size).toBe(1);
    const after = await bets();
    expect(after).toHaveLength(2);
    expect(after[0]!.params.pick).toBe('heads');
    await page.unroute('**/games/double-side/bets');

    // CF-04 My flips (from "View all")
    await page.getByRole('link', { name: /View all/ }).click();
    await expect(page).toHaveURL(/\/games\/double-side\/my-flips$/);
    await expect(page.getByRole('heading', { level: 1, name: 'My flips' })).toBeVisible();
    const row = (ref: string) => page.getByRole('button', { name: `Verify ${ref}` });
    await expect(row(bet!.ref)).toBeVisible();
    await expect(row(after[0]!.ref)).toBeVisible();
    await page.getByRole('button', { name: 'Picked Heads' }).click();
    await expect(row(bet!.ref)).toHaveCount(0);
    await expect(row(after[0]!.ref)).toBeVisible();
    await page.getByRole('button', { name: 'Picked Tails' }).click();
    await expect(row(bet!.ref)).toBeVisible();
    await expect(row(after[0]!.ref)).toHaveCount(0);
    await row(bet!.ref).click();
    const detail = page.getByTestId(`flip-detail-${bet!.ref}`);
    await expect(detail).toContainText(`${bet!.fairness.nonce}`);
    await expect(detail).toContainText(`→ ${sideWord(bet!.outcome.side)}`);

    // CF-05 Fairness: secret seed → rotate & reveal → re-derived in the browser → tamper → restore
    await detail.getByRole('link', { name: 'Verify this flip' }).click();
    await expect(page).toHaveURL(new RegExp(`/games/double-side/fairness\\?bet=${bet!.id}`));
    await expect(page.getByText('The server seed of this pair is still secret.')).toBeVisible();
    await page.getByRole('button', { name: 'Rotate seeds & reveal' }).click();
    await expect(page.getByTestId('verify-ok')).toBeVisible();
    await expect(page.getByTestId('verify-computed')).toHaveText(sideWord(bet!.outcome.side));
    const seed = page.getByTestId('verify-server-seed');
    const full = await seed.inputValue();
    expect(full).toMatch(/^[0-9a-f]{64}$/);
    await seed.fill(full.slice(0, 63));
    await expect(page.getByTestId('verify-failed')).toContainText('63 characters');
    await page.getByRole('button', { name: `Use the seeds of ${bet!.ref}` }).click();
    await expect(page.getByTestId('verify-ok')).toBeVisible();

    // Rules & payouts (PUB-04 details page)
    await page.getByRole('link', { name: 'Rules & payouts' }).first().click();
    await expect(page).toHaveURL(/\/games\/double-side\/details$/);
    await expect(page.getByText(/1\.96×/).first()).toBeVisible();
  });
});
