/**
 * Pool Roulette happy path (key "roulette", RL-01 … RL-09) against a running web (DEV MOCK auth) + API, with a fresh
 * DEMO player: lobby tile → table (DEMO credits · no cash value, Fees 0.00, "You can lose your stake", session bar) →
 * chips on a straight, an outside box, a dozen and a split line (edge target) → keyboard bet-type chooser → Undo →
 * Spin (4.5 s wheel, "No more bets", stake locked) → per-bet settlement from the server's real pocket, balance =
 * 1,000.00 + net, USDT wallet untouched → Repeat loads the bets without spinning → a dropped response is replayed with
 * the same idempotency key (exactly one more spin) → My bets (RL-06) → verify in the browser (RL-08) → rules (RL-07).
 * Server guards: a non-DEMO currency is refused (REAL_MONEY_ENABLED=false → 403), table limits are enforced.
 *
 *   E2E_BASE_URL=http://localhost:3114 E2E_API_URL=http://localhost:4214 pnpm --filter @gp/web exec playwright test e2e/games-roulette.spec.ts
 */
import { money } from '@gp/shared/money';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

interface Player {
  did: string;
  token: string;
}

async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-roulette-${uniq()}`;
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
      consents: { ageConfirmed: true, jurisdictionConfirmed: true, termsAccepted: true, privacyAccepted: true, marketingOptIn: false },
    },
  });
  expect(onboard.ok()).toBeTruthy();
  // a daily loss limit (DEMO credits) so the session bar shows its meter — it must not move before the wheel stops
  const limit = await request.put(`${API}/responsible-gaming/limits`, {
    headers,
    data: { type: 'loss', period: 'day', amount: '200.00' },
  });
  expect(limit.ok()).toBeTruthy();
  return { did, token };
}

async function signIn(page: Page, p: Player) {
  const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  await page.context().addCookies([{ name: 'privy-token', value: p.token, domain: base.hostname, path: '/' }]);
  await page.addInitScript((did) => {
    window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null }));
  }, p.did);
  await page.route('**/auth/new-device-alerts', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}

interface SpinView {
  id: string;
  ref: string;
  stake: string;
  payout: string;
  net: string;
  fee: string;
  currency: string;
  outcome: { pocket: number; bets: { type: string; win: boolean; payout: string }[] };
}

test.describe('Pool Roulette — chips → spin → settle → verify (DEMO credits only)', () => {
  test.setTimeout(300_000);
  // exercise the real 4.5 s wheel (the config default is reduced motion)
  test.use({ reducedMotion: 'no-preference' });

  test('a new player bets inside and outside, spins with DEMO credits and verifies the spin in the browser', async ({ page, request }) => {
    const player = await createPlayer(request);
    const headers = { authorization: `Bearer ${player.token}` };
    const walletBefore: unknown = await (await request.get(`${API}/wallet/balances`, { headers })).json();

    // Server-side guards: real money impossible; table limits enforced by the shared rules
    const realMoney = await request.post(`${API}/games/pool-roulette/bets`, {
      headers,
      data: { currency: 'USDT', params: { bets: [{ type: 'red', amount: '1.00' }] }, idempotencyKey: `e2e-rm-${uniq()}` },
    });
    expect(realMoney.status()).toBe(403);
    expect(((await realMoney.json()) as { error: { code: string } }).error.code).toBe('REAL_MONEY_DISABLED');
    const overSpot = await request.post(`${API}/games/pool-roulette/bets`, {
      headers,
      data: { params: { bets: [{ type: 'straight', numbers: [19], amount: '1200.00' }] }, idempotencyKey: `e2e-max-${uniq()}` },
    });
    expect(overSpot.status()).toBe(400);

    await signIn(page, player);

    // lobby → Pool Roulette tile
    await page.goto('/games');
    await page.getByRole('link', { name: /^Pool Roulette — / }).first().click();
    await expect(page).toHaveURL(/\/games\/pool-roulette$/);

    // RL-01 table
    await expect(page.getByRole('heading', { level: 1, name: 'Pool Roulette' })).toBeVisible();
    await expect(page.getByTestId('roulette-stage')).toBeVisible();
    const visible = (text: string | RegExp) => page.getByText(text).locator('visible=true').first();
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText('1,000.00');
    await expect(visible('DEMO credits · no cash value')).toBeVisible();
    await expect(visible('You can lose your stake.')).toBeVisible();
    const session = page.getByRole('region', { name: 'Your session' }).locator('visible=true').first();
    await expect(session).toBeVisible();
    await expect(session).toContainText('0.00 / 200.00 DEMO'); // daily loss limit meter (DEMO credits)
    // textContent (what toHaveText compares), not innerText (which adds line breaks around hidden labels)
    const netBefore = (await session.getByTestId('session-net').textContent()) ?? '';
    const slip = page.getByTestId('bet-slip').locator('visible=true').first();
    await expect(slip.getByText('No bets yet')).toBeVisible();
    await expect(slip.getByText('0.00 DEMO').first()).toBeVisible(); // Fees 0.00

    // RL-02 / RL-03: chips on a straight, the red box and the 2nd dozen (decision #35 demo slip)
    const chip = (v: string) => page.getByRole('radio', { name: `Chip ${v} DEMO credits` }).locator('visible=true').first();
    await expect(chip('5')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('felt-19').click();
    await chip('10').click();
    await page.getByTestId('felt-red').click();
    await chip('5').click();
    await page.getByTestId('felt-dozen:2').click();
    await expect(slip.getByTestId('slip-total')).toContainText('20.00');
    await expect(slip.getByRole('listitem')).toHaveCount(3);
    // the status column describes the hovered spot; with the pointer off the felt it shows the slip's outcome preview
    await slip.getByTestId('slip-total').hover();
    await expect(page.getByTestId('outcome-preview')).toContainText('+195.00');
    await expect(slip.getByText('215.00')).toBeVisible(); // max potential payout if 19 wins

    // a split on the shared line (edge target) + the keyboard bet-type chooser, then Undo both
    await chip('1').click();
    await page.getByTestId('zone-split:17-20').click();
    await expect(slip.getByText('Split · 17 | 20')).toBeVisible();
    await page.getByTestId('felt-19').focus();
    await page.keyboard.press('ArrowRight'); // 19 → 22
    await expect(page.getByTestId('felt-22')).toBeFocused();
    await page.keyboard.press('b');
    const chooser = page.getByRole('dialog', { name: 'Bet on 22' });
    await expect(chooser).toBeVisible();
    await chooser.getByRole('radio', { name: /Street 22–24/ }).click();
    await chooser.getByTestId('bet-type-add').click();
    await expect(slip.getByText('Street · 22–24')).toBeVisible();
    await expect(slip.getByTestId('slip-total')).toContainText('22.00');
    await slip.getByRole('button', { name: 'Undo' }).click();
    await slip.getByRole('button', { name: 'Undo' }).click();
    await chip('5').click();
    await expect(slip.getByTestId('slip-total')).toContainText('20.00');
    await expect(slip.getByRole('listitem')).toHaveCount(3);

    // RL-04 spin: stake locked, "No more bets", the wheel reveals the server's pocket
    const spin = page.getByTestId('roulette-spin').locator('visible=true').first();
    await expect(spin).toHaveText(/Spin · 20.00 DEMO/);
    // the first settled bet sends the RG heartbeat, which refetches /games/credits while the wheel still turns
    const refetched = page.waitForResponse(
      (r) => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/games/credits'),
      { timeout: 4_000 },
    );
    await spin.click();
    const wheelEl = page.locator('[data-testid="roulette-wheel"]').first();
    await expect(page.locator('[data-testid="roulette-wheel"][data-phase="spinning"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('No more bets').locator('visible=true').first()).toBeVisible();
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText('980.00'); // locked
    // no early reveal: the live credits already carry the settled spin, the screen keeps the pre-spin snapshot
    await refetched;
    await page.waitForTimeout(300); // let React render the refetched query
    await expect(wheelEl).toHaveAttribute('data-phase', 'spinning');
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText('980.00');
    await expect(session.getByTestId('session-net')).toHaveText(netBefore);
    await expect(session).toContainText('0.00 / 200.00 DEMO');
    await expect(page.getByTestId('result-banner')).toHaveCount(0);
    const banner = page.getByTestId('result-banner').first();
    await expect(banner).toBeVisible({ timeout: 20_000 });

    // RL-05 result = the server's settled spin
    const list = (await (await request.get(`${API}/games/pool-roulette/bets`, { headers })).json()) as { total: number; items: SpinView[] };
    expect(list.total).toBe(1);
    const bet = list.items[0]!;
    expect(bet.stake).toBe('20.00');
    expect(bet.fee).toBe('0.00');
    expect(bet.currency).toBe('DEMO');
    expect(bet.outcome.bets).toHaveLength(3);
    await expect(page.getByTestId('result-pocket')).toContainText(String(bet.outcome.pocket));
    await expect(page.locator('[data-testid="roulette-wheel"]').first()).toHaveAttribute('data-pocket', String(bet.outcome.pocket));
    await expect(page.getByTestId('settlement').first()).toContainText(bet.payout === '0.00' ? '0.00' : bet.payout.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    const credits = (await (await request.get(`${API}/games/credits`, { headers })).json()) as { balance: string; currency: string; cashValue: boolean };
    expect(credits.currency).toBe('DEMO');
    expect(credits.cashValue).toBe(false);
    expect(money(credits.balance).eq(money('1000.00').plus(money(bet.net)))).toBe(true); // decimal.js, never floats
    const walletAfter: unknown = await (await request.get(`${API}/wallet/balances`, { headers })).json();
    expect(walletAfter).toEqual(walletBefore); // USDT wallet untouched by game play

    // Repeat loads the same bets — it never spins by itself
    await page.getByTestId('roulette-repeat-cta').locator('visible=true').first().click();
    await expect(slip.getByTestId('slip-total')).toContainText('20.00');
    expect(((await (await request.get(`${API}/games/pool-roulette/bets`, { headers })).json()) as { total: number }).total).toBe(1);

    // RL-09 connection lost: the server settles, the browser loses the response, the same key replays it (one spin)
    let dropped = false;
    await page.route('**/games/pool-roulette/bets', async (route) => {
      if (route.request().method() !== 'POST' || dropped) return route.continue();
      dropped = true;
      await route.fetch();
      await route.abort('connectionreset');
    });
    await spin.click();
    await expect(page.getByText('Connection lost — reconnecting')).toBeVisible();
    await expect(page.getByTestId('result-banner').first()).toBeVisible({ timeout: 40_000 });
    await page.unroute('**/games/pool-roulette/bets');
    expect(((await (await request.get(`${API}/games/pool-roulette/bets`, { headers })).json()) as { total: number }).total).toBe(2);

    // RL-06 My bets → RL-08 verify in the browser
    await page.goto('/games/pool-roulette/my-bets');
    await expect(page.getByRole('heading', { level: 1, name: 'My bets' })).toBeVisible();
    await expect(page.getByTestId('spins-kpis')).toContainText('2');
    const row = page.getByRole('row', { name: new RegExp(bet.ref) });
    await row.getByRole('button', { name: /Details/ }).click();
    await page.getByRole('button', { name: 'Verify spin' }).click();
    await expect(page).toHaveURL(/\/games\/pool-roulette\/fairness\?bet=/);
    await expect(page.getByRole('heading', { level: 1, name: 'Verify a spin' })).toBeVisible();
    await expect(page.getByTestId('pf-status')).toHaveText(/Server seed still secret/);
    await page.getByRole('button', { name: 'Rotate seeds & reveal' }).click();
    await expect(page.getByTestId('pf-status')).toHaveText(/Verified/, { timeout: 20_000 });
    await expect(page.getByTestId('pf-steps')).toContainText(`pocket ${bet.outcome.pocket}`);
    // editing the client seed shows the mismatch state (or the same pocket by coincidence)
    await page.getByRole('textbox', { name: 'Client seed' }).fill('someone-else');
    await expect(page.getByTestId('pf-status')).toHaveText(/Doesn’t match|Verified/);
    await page.getByRole('button', { name: 'Restore the recorded seeds' }).click();
    await expect(page.getByTestId('pf-status')).toHaveText(/Verified/);

    // RL-07 rules & payouts (computed from the shared rules)
    await page.getByRole('link', { name: 'Rules & payouts' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Rules & payouts' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inside bets' })).toBeVisible();
    await expect(page.getByText('35:1').first()).toBeVisible();
    await expect(page.getByText('35,000.00 DEMO')).toBeVisible();
  });
});
