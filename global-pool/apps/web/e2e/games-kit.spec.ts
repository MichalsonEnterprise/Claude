/**
 * Games kit happy path (key "kit") against a running web (DEV MOCK auth) + API, with a fresh DEMO player:
 * lobby (PUB-03) → Pool Dice tile → play screen (DI-01: DEMO credits · no cash value, Fees 0.00, "You can lose your
 * stake", RG/Session bar) → roll (DI-03/04: one bet, real server result, balance = 1,000.00 + net) → My rolls (DI-05)
 * → verify drawer (DI-06: rotate & reveal, re-derived in the browser with @gp/shared/fair) → details page (PUB-04).
 * Also checks: the USDT wallet balances are untouched by game play, the auto-play confirmation starts unticked, and the
 * server refuses any non-DEMO currency (REAL_MONEY_ENABLED=false → 403 REAL_MONEY_DISABLED).
 *
 *   E2E_BASE_URL=http://localhost:3112 E2E_API_URL=http://localhost:4212 pnpm --filter @gp/web test:e2e -- e2e/games-kit.spec.ts
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

interface Player {
  did: string;
  token: string;
}

async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-games-${uniq()}`;
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

test.describe('Games kit — lobby → Pool Dice → roll → verify (DEMO credits only)', () => {
  test.setTimeout(300_000);

  test('a new player rolls Pool Dice with DEMO credits and verifies the roll in the browser', async ({ page, request }) => {
    const player = await createPlayer(request);
    const headers = { authorization: `Bearer ${player.token}` };
    const walletBefore: unknown = await (await request.get(`${API}/wallet/balances`, { headers })).json();

    // Server-side guard: a real-money currency is impossible (REAL_MONEY_ENABLED=false).
    const realMoney = await request.post(`${API}/games/pool-dice/bets`, {
      headers,
      data: { stake: '1.00', currency: 'USDT', params: { target: '50.50', condition: 'over' }, idempotencyKey: `e2e-rm-${uniq()}` },
    });
    expect(realMoney.status()).toBe(403);
    expect(((await realMoney.json()) as { error: { code: string } }).error.code).toBe('REAL_MONEY_DISABLED');

    await signIn(page, player);

    // PUB-03 lobby
    await page.goto('/games');
    await expect(page.getByRole('heading', { name: 'Games lobby' })).toBeVisible();
    await expect(page.getByText('DEMO credits · no cash value').locator('visible=true').first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /Originals · \d+/ })).toBeVisible();
    // honest "coming soon" for titles without an engine
    await expect(page.getByRole('link', { name: /Neon Koi .*Coming soon/ })).toBeVisible();
    await page.getByRole('link', { name: /^Pool Dice — / }).first().click();

    // DI-01 play screen
    await expect(page).toHaveURL(/\/games\/pool-dice$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Pool Dice' })).toBeVisible();
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText('1,000.00');
    const visible = (text: string) => page.getByText(text).locator('visible=true').first();
    await expect(visible('DEMO credits · no cash value')).toBeVisible();
    await expect(visible('0.00 DEMO')).toBeVisible(); // Fees 0.00
    await expect(visible('You can lose your stake.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your session' })).toBeVisible();
    await expect(page.getByRole('slider', { name: /Target — roll over/ })).toHaveAttribute('aria-valuenow', '50.5');

    // keyboard: the slider moves the target by 1.00
    await page.getByRole('slider', { name: /Target — roll over/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('dice-target')).toHaveValue('51.50');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('dice-target')).toHaveValue('50.50');

    // auto-play needs an UNTICKED confirmation + stop-loss
    await page.getByRole('radio', { name: 'auto' }).click();
    const confirm = page.getByRole('checkbox', { name: /I understand auto-play/ });
    await expect(confirm).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Start auto-play' })).toBeDisabled();
    await page.getByRole('radio', { name: 'manual' }).click();

    // DI-03/04: roll once
    const roll = page.getByTestId('dice-roll').locator('visible=true').first();
    await expect(roll).toHaveText(/Roll over 50.50 · 10.00 DEMO/);
    await roll.click();
    const banner = page.getByTestId('result-banner');
    await expect(banner).toBeVisible();
    const credits = (await (await request.get(`${API}/games/credits`, { headers })).json()) as {
      balance: string;
      currency: string;
      cashValue: boolean;
    };
    expect(credits.currency).toBe('DEMO');
    expect(credits.cashValue).toBe(false);
    const bets = (await (await request.get(`${API}/games/pool-dice/bets`, { headers })).json()) as {
      items: { ref: string; net: string; win: boolean; fee: string; currency: string; outcome: { roll: string } }[];
    };
    expect(bets.items).toHaveLength(1);
    const bet = bets.items[0]!;
    expect(bet.fee).toBe('0.00');
    expect(bet.currency).toBe('DEMO');
    expect(credits.balance).toBe(bet.win ? '1010.00' : '990.00');
    await expect(banner).toHaveAttribute('data-result', bet.win ? 'win' : 'lose');
    await expect(page.getByTestId('dice-readout')).toHaveText(bet.outcome.roll);
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText(
      bet.win ? '1,010.00' : '990.00',
    );

    // USDT wallet untouched by game play
    const walletAfter: unknown = await (await request.get(`${API}/wallet/balances`, { headers })).json();
    expect(walletAfter).toEqual(walletBefore);

    // DI-05 history
    const history = page.locator('#my-bets');
    await expect(history.getByRole('cell', { name: bet.ref, exact: true })).toBeVisible();

    // DI-06 verify: seed still secret → rotate & reveal → re-derived in the browser
    await history.getByRole('button', { name: `Verify ${bet.ref}` }).click();
    const drawer = page.getByRole('dialog', { name: `Verify roll ${bet.ref}` });
    await expect(drawer.getByText('The server seed of this pair is still secret.')).toBeVisible();
    await drawer.getByRole('button', { name: 'Rotate seeds & reveal' }).click();
    await expect(drawer.getByText(`Roll ${bet.ref} verified`)).toBeVisible();
    await expect(drawer.getByText(/Recomputed in your browser/)).toBeVisible();
    // editing the server seed shows the mismatch state
    const seedInput = drawer.getByRole('textbox', { name: 'Server seed (revealed)' });
    await seedInput.fill('0'.repeat(64));
    await expect(drawer.getByText('The recomputed roll doesn’t match the recorded roll')).toBeVisible();
    await drawer.getByRole('button', { name: `Use the seeds from ${bet.ref}` }).click();
    await expect(drawer.getByText(`Roll ${bet.ref} verified`)).toBeVisible();
    await page.keyboard.press('Escape');

    // DI-07 connection lost: the server settles the roll, the browser loses the response, the kit retries with the
    // SAME idempotency key → the stored result is replayed (exactly one bet, never charged twice).
    let dropped = false;
    await page.route('**/games/pool-dice/bets', async (route) => {
      if (route.request().method() !== 'POST' || dropped) return route.continue();
      dropped = true;
      await route.fetch(); // reaches the server and settles there
      await route.abort('connectionreset');
    });
    await roll.click();
    await expect(page.getByText('Connection lost — reconnecting')).toBeVisible();
    await expect(banner).toBeVisible({ timeout: 30_000 });
    await page.unroute('**/games/pool-dice/bets');
    const afterReconnect = (await (await request.get(`${API}/games/pool-dice/bets`, { headers })).json()) as {
      total: number;
    };
    expect(afterReconnect.total).toBe(2);

    // Auto-play: 3 rolls, constant stake, stop-loss required, unticked confirmation
    await page.getByRole('radio', { name: 'auto' }).click();
    await page.getByRole('textbox', { name: 'Number of rolls' }).fill('3');
    await page.getByRole('textbox', { name: 'Stop-loss (required)' }).fill('30.00');
    await expect(page.getByRole('button', { name: 'Start auto-play' })).toBeDisabled();
    await page.getByRole('checkbox', { name: /I understand auto-play/ }).check();
    await page.getByRole('button', { name: 'Start auto-play' }).click();
    await expect(page.getByText(/Auto-play (finished all bets|stopped at your stop-loss)/)).toBeVisible({ timeout: 60_000 });
    const all = (await (await request.get(`${API}/games/pool-dice/bets`, { headers })).json()) as {
      total: number;
      items: { stake: string }[];
    };
    expect(all.total).toBeGreaterThanOrEqual(4);
    expect(all.total).toBeLessThanOrEqual(5);
    expect(all.items.every((b) => b.stake === '10.00')).toBe(true); // never raised after a loss
    await page.getByRole('radio', { name: 'manual' }).click();

    // PUB-04 details
    await page.goto('/games/pool-dice/details');
    await expect(page.getByRole('heading', { level: 1, name: 'Pool Dice' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Over 50.50' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play (DEMO credits)' }).first()).toHaveAttribute('href', '/games/pool-dice');
    // an engine game without a play screen falls back to an honest details page
    await page.goto('/games/skyline');
    await expect(page.getByRole('button', { name: 'Play screen coming soon' }).first()).toBeDisabled();
  });
});
