/**
 * Twenty-One happy path (key "blackjack") against a running web (DEV MOCK auth) + API, with a fresh DEMO player:
 * REAL_MONEY guard (403) → lobby → Twenty-One (BJ-01: DEMO credits · no cash value, Fees 0.00, "You can lose your
 * stake", RG/Session bar, chips + bet spot + Undo) → deal and play a real hand with the keyboard (BJ-02 … BJ-05: only
 * legal actions enabled, result from the server, balance = 1,000.00 + net, USDT wallet untouched) → an open hand is
 * restored after a reload (BJ-09) and a dropped decision response is replayed with the SAME idempotency key (exactly
 * one stand applied) → My hands (BJ-06: outcome filters, row details) → Rules (BJ-07) → Fairness (BJ-08: rotate &
 * reveal, shoe re-created in the browser, edited seed = failed).
 *
 *   E2E_BASE_URL=http://localhost:3116 E2E_API_URL=http://localhost:4216 pnpm --filter @gp/web exec playwright test e2e/games-blackjack.spec.ts
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const uniq = () => Math.random().toString(36).slice(2, 10);

interface Player {
  did: string;
  token: string;
}

interface HandView {
  id: string;
  ref: string;
  status: 'active' | 'settled';
  stake: string;
  payout: string;
  net: string;
  fee: string;
  currency: string;
  outcome: { log?: { action: string }[]; hands?: { result: string | null }[] };
  round?: { phase: string; allowedActions: string[]; hands: { total: number }[]; active: number };
}

async function createPlayer(request: APIRequestContext): Promise<Player> {
  const did = `did:privy:e2e-bj-${uniq()}`;
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

/** decimal string → integer cents (no floats) */
const cents = (v: string) => {
  const neg = v.startsWith('-');
  const [w, f = ''] = v.replace(/^[-+]/, '').replace(/,/g, '').split('.');
  const c = BigInt(w!) * 100n + BigInt((f + '00').slice(0, 2));
  return neg ? -c : c;
};
const fmt = (c: bigint) => {
  const abs = c < 0n ? -c : c;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${c < 0n ? '−' : ''}${whole}.${String(abs % 100n).padStart(2, '0')}`;
};

test.describe('Twenty-One — deal → decisions → history → verify (DEMO credits only)', () => {
  test.setTimeout(300_000);

  test('a new player plays Twenty-One with DEMO credits, recovers an open hand and verifies the shoe', async ({
    page,
    request,
  }) => {
    const player = await createPlayer(request);
    const headers = { authorization: `Bearer ${player.token}` };
    const hands = async () =>
      (
        (await (await request.get(`${API}/games/twenty-one/bets?pageSize=50`, { headers })).json()) as {
          items: HandView[];
        }
      ).items;
    const walletBefore: unknown = await (await request.get(`${API}/wallet/balances`, { headers })).json();

    // Server-side guard: a real-money currency is impossible (REAL_MONEY_ENABLED=false).
    const realMoney = await request.post(`${API}/games/twenty-one/hands`, {
      headers,
      data: { stake: '1.00', currency: 'USDT', idempotencyKey: `e2e-rm-${uniq()}` },
    });
    expect(realMoney.status()).toBe(403);
    expect(((await realMoney.json()) as { error: { code: string } }).error.code).toBe('REAL_MONEY_DISABLED');
    expect(await hands()).toHaveLength(0);

    await signIn(page, player);

    // lobby → Twenty-One tile
    await page.goto('/games');
    await page.getByRole('link', { name: /^Twenty-One — / }).first().click();
    await expect(page).toHaveURL(/\/games\/twenty-one$/);

    // BJ-01 table + betting
    await expect(page.getByRole('heading', { level: 1, name: 'Twenty-One' })).toBeVisible();
    const visible = (text: string | RegExp) => page.getByText(text).locator('visible=true').first();
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText('1,000.00');
    await expect(visible('DEMO credits · no cash value')).toBeVisible();
    await expect(page.getByTestId('bj-payouts').locator('visible=true').first()).toContainText('0.00 DEMO');
    await expect(visible('You can lose your stake.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your session' })).toBeVisible();
    const amount = page.getByRole('textbox', { name: /bet amount in demo credits/i }).locator('visible=true').first();
    await expect(amount).toHaveValue('10.00');

    // chips: pick 5, tap the bet spot → 15.00; Undo → 10.00
    await page.getByRole('radio', { name: 'Chip value 5 DEMO credits' }).locator('visible=true').first().click();
    await page.getByTestId('bj-bet-spot').click();
    await expect(amount).toHaveValue('15.00');
    await page.getByRole('button', { name: 'Undo' }).locator('visible=true').first().click();
    await expect(amount).toHaveValue('10.00');
    await expect(page.getByTestId('bj-felt-status')).toContainText('Bet 10.00 DEMO placed');

    // BJ-02 … BJ-05: deal with the keyboard, then play: decline insurance, H below 17, S otherwise
    await page.locator('h1').first().click();
    await page.keyboard.press('Space');
    const result = page.getByTestId('bj-result').locator('visible=true').first();
    for (let i = 0; i < 12; i++) {
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="bj-result"]') ||
          document.querySelector('[data-testid="bj-stand"]:not([disabled])') ||
          document.querySelector('[data-testid="bj-insurance-no"]:not([disabled])'),
        null,
        { timeout: 30_000 },
      );
      if (await result.count()) break;
      if (await page.locator('[data-testid="bj-insurance-no"]:not([disabled])').count()) {
        await page.getByTestId('bj-insurance-no').locator('visible=true').first().click();
        continue;
      }
      // only legal actions are enabled: Split needs a pair, Double only on two cards
      const open = (await hands()).find((h) => h.status === 'active');
      if (open?.round) {
        for (const a of ['double', 'split'] as const)
          if (!open.round.allowedActions.includes(a)) await expect(page.getByTestId(`bj-${a}`).first()).toBeDisabled();
      }
      const total = Number(await page.getByTestId('bj-hand-0').getAttribute('data-total'));
      await page.keyboard.press(total < 17 ? 'h' : 's');
      await page.waitForTimeout(300);
    }
    await expect(result).toBeVisible();
    const [first] = await hands();
    expect(first?.status).toBe('settled');
    expect(first?.currency).toBe('DEMO');
    expect(first?.fee).toBe('0.00');
    await expect(result).toContainText(first!.ref);
    const expected = fmt(100000n + cents(first!.net));
    await expect(page.getByTestId('demo-credits-balance').locator('visible=true').first()).toContainText(expected);
    // DEMO credits never touch the USDT wallet
    expect(await (await request.get(`${API}/wallet/balances`, { headers })).json()).toEqual(walletBefore);

    // BJ-09 recovery: an open hand on the server is restored after a reload
    let open: HandView | null = null;
    for (let i = 0; i < 30 && !open; i++) {
      let h = (await (
        await request.post(`${API}/games/twenty-one/hands`, {
          headers,
          data: { stake: '2.00', idempotencyKey: `e2e-bj-${uniq()}` },
        })
      ).json()) as HandView;
      if (h.status === 'active' && h.round?.phase === 'insurance')
        h = (await (
          await request.post(`${API}/games/twenty-one/hands/${h.id}/action`, {
            headers,
            data: { action: 'insurance', accept: false, idempotencyKey: `e2e-bj-${uniq()}` },
          })
        ).json()) as HandView;
      if (h.status === 'active' && h.round?.phase === 'player') open = h;
    }
    expect(open).not.toBeNull();
    await page.reload();
    await expect(page.getByTestId('bj-restored')).toContainText(`Reconnected — hand ${open!.ref} restored`);

    // a dropped response: the stand reaches the server, the answer is lost, the client retries with the SAME key
    const keys: string[] = [];
    let dropped = false;
    await page.route('**/games/twenty-one/hands/*/action', async (route) => {
      keys.push((route.request().postDataJSON() as { idempotencyKey: string }).idempotencyKey);
      if (!dropped) {
        dropped = true;
        await route.fetch(); // the server applies the stand …
        await route.abort('connectionreset'); // … but the browser never sees the answer
        return;
      }
      await route.continue();
    });
    await page.getByTestId('bj-stand').locator('visible=true').first().click();
    await expect(result).toBeVisible({ timeout: 60_000 });
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(new Set(keys).size).toBe(1);
    const restored = (await hands()).find((h) => h.id === open!.id)!;
    expect(restored.status).toBe('settled');
    expect((restored.outcome.log ?? []).filter((e) => e.action === 'stand')).toHaveLength(1);
    await page.unroute('**/games/twenty-one/hands/*/action');

    // BJ-06 My hands
    await page.getByRole('link', { name: 'My hands' }).first().click();
    await expect(page).toHaveURL(/\/games\/twenty-one\/my-hands$/);
    const all = await hands();
    await expect(page.getByText(`${all.length} hand`).first()).toBeVisible();
    await page.getByRole('button', { name: /^Show details of BJ-/ }).first().click();
    await expect(page.getByText('What happened').first()).toBeVisible();
    const losses = all.filter((h) => cents(h.net) < 0n).length;
    await page.getByRole('button', { name: 'Losses', exact: true }).click();
    if (losses) await expect(page.getByText(`${losses} hand`).first()).toBeVisible();
    else await expect(page.getByText('No hands match these filters')).toBeVisible();

    // BJ-07 Rules
    await page.goto('/games/twenty-one/rules');
    await expect(page.getByTestId('bj-payout-table')).toContainText('25.00');
    await expect(page.getByRole('table', { name: 'Basic strategy for hard totals' })).toBeVisible();

    // BJ-08 Fairness: rotate & reveal, the shoe is re-created in the browser
    await page.goto(`/games/twenty-one/fairness?bet=${first!.id}`);
    await page.getByRole('button', { name: 'Rotate seeds & reveal' }).click();
    await expect(page.getByTestId('bj-verified')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('bj-shoe-order')).toContainText('#1 · You');
    const seed = page.getByRole('textbox', { name: 'Server seed (revealed)' });
    const v = await seed.inputValue();
    await seed.fill(v.slice(0, 63));
    await expect(page.getByTestId('bj-verify-failed')).toBeVisible();
  });
});
