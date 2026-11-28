/**
 * Orbit Rush happy path (key "crash", CR-01 … CR-08) against a running web (DEV MOCK auth) + an API whose crash loop
 * runs (CRASH_LOOP_ENABLED=true), with a fresh DEMO player and REAL rounds over socket.io /crash:
 * lobby tile → play screen (DEMO credits · no cash value, Fees 0.00, "You can lose your stake", 18+, session bar) →
 * betting countdown taken from the SERVER round (no fake timer) → bet with a server-side auto cash-out → result card
 * equal to the server's crash point and my bet (balance = 1,000.00 + net, USDT wallet untouched) → manual cash-out at
 * the server multiplier → live bets = only real bets → round verified in the browser (CR-07) → round history / my bets
 * (CR-05) → auto-play needs an unticked confirmation + stop-loss (CR-06). Server guard: a non-DEMO currency → 403.
 *
 *   E2E_BASE_URL=http://localhost:3115 E2E_API_URL=http://localhost:4215 pnpm --filter @gp/web exec playwright test e2e/games-crash.spec.ts
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
  const did = `did:privy:e2e-crash-${uniq()}`;
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
  return { did, token };
}

async function signIn(page: Page, p: Player) {
  const base = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  await page.context().addCookies([{ name: 'privy-token', value: p.token, domain: base.hostname, path: '/' }]);
  await page.addInitScript((did) => {
    window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null }));
    window.localStorage.setItem('gp.ageGate', JSON.stringify({ confirmedAt: new Date().toISOString(), country: 'PT' }));
  }, p.did);
  await page.route('**/auth/new-device-alerts', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}

interface MyBet {
  id: string;
  ref: string;
  round: { id: string; number: number; status: string };
  stake: string;
  autoCashOut: string | null;
  status: 'active' | 'cashed_out' | 'lost';
  cashOutMultiplier: string | null;
  payout: string;
  net: string;
  cashOutKind: string | null;
}

const game = (page: Page) => page.getByTestId('crash-game');
/** The bet / cash-out button of this width (the < 768 sticky bar has its own copy). */
const ctaOf = (page: Page) => page.getByTestId('crash-cta').filter({ visible: true });

/** Wait for a betting window with at least `minS` seconds left on the SERVER clock. */
async function bettingWindow(page: Page, request: APIRequestContext, minS = 4) {
  for (let i = 0; i < 12; i++) {
    await expect(game(page)).toHaveAttribute('data-phase', 'betting', { timeout: 90_000 });
    const st = (await (await request.get(`${API}/games/orbit-rush/state`)).json()) as {
      round: { status: string; startedAt: string; ref: string };
      serverTime: string;
    };
    const left = Date.parse(st.round.startedAt) - Date.parse(st.serverTime);
    if (st.round.status === 'betting' && left >= minS * 1000) return st;
    await expect(game(page)).not.toHaveAttribute('data-phase', 'betting', { timeout: 30_000 });
  }
  throw new Error('no betting window');
}

async function myBets(request: APIRequestContext, p: Player) {
  const res = await request.get(`${API}/games/orbit-rush/bets?pageSize=10`, { headers: { authorization: `Bearer ${p.token}` } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { items: MyBet[]; summary: { bets: number; net: string } };
}

test.describe('Orbit Rush (DEMO credits)', () => {
  test.setTimeout(420_000);

  test('live round: bet, auto cash-out on the server, manual cash-out, verify, history', async ({ page, request }) => {
    const p = await createPlayer(request);
    const headers = { authorization: `Bearer ${p.token}` };
    const usdtBefore = (await (await request.get(`${API}/wallet/balances`, { headers })).json()) as unknown;
    await signIn(page, p);

    // lobby tile → play screen
    await page.goto('/games');
    const tile = page.locator('a[href="/games/orbit-rush"]').first();
    await expect(tile).toBeVisible({ timeout: 60_000 });
    await tile.click();
    await expect(page).toHaveURL(/\/games\/orbit-rush$/);
    await expect(game(page)).toHaveAttribute('data-link', 'live', { timeout: 60_000 });

    // compliance copy on the bet surface
    await expect(page.getByText('DEMO credits · no cash value').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('You can lose your stake.').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByTestId('crash-fees')).toHaveText(/0\.00/);
    await expect(page.getByText('18+', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your session' })).toBeVisible();
    await expect(page.getByTestId('demo-credits-balance').first()).toContainText('1,000.00');
    await expect(page.getByTestId('win-chance')).toHaveText('49.50%');

    // 1) bet with an auto cash-out (runs on the server) — the countdown comes from the server round
    const st = await bettingWindow(page, request);
    const shown = Number(/([\d.]+) s/.exec((await page.getByTestId('betting-countdown').textContent()) ?? '')?.[1] ?? 'NaN');
    const serverLeft = (Date.parse(st.round.startedAt) - Date.now()) / 1000;
    expect(Math.abs(shown - serverLeft)).toBeLessThan(2.5);
    await page.getByTestId('target-input').fill('1.01');
    await page.getByTestId('target-input').blur();
    await ctaOf(page).click();
    await expect(page.getByTestId('my-live-bet')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('demo-credits-balance').first()).toContainText('990.00');
    // the live list shows only the bets the server sent: as many rows as the server snapshot has bets
    const snap = (await (await request.get(`${API}/games/orbit-rush/state`)).json()) as { bets: { id: string }[] };
    await expect(page.getByTestId('live-players')).toHaveText(new RegExp(`^${snap.bets.length} player`));

    await expect(page.getByTestId('crash-result')).toBeVisible({ timeout: 120_000 });
    const first = (await myBets(request, p)).items[0]!;
    expect(first.status).not.toBe('active');
    const round = (await (await request.get(`${API}/games/orbit-rush/rounds/${first.round.number}`)).json()) as { crashPoint: string };
    if (money(round.crashPoint).gte('1.01')) {
      expect(first).toMatchObject({ status: 'cashed_out', cashOutMultiplier: '1.01', cashOutKind: 'auto' });
      expect(money(first.payout).toFixed(2)).toBe('10.10');
      await expect(page.getByTestId('crash-result')).toHaveAttribute('data-result', 'win');
    } else {
      expect(first.status).toBe('lost');
      await expect(page.getByTestId('crash-result')).toHaveAttribute('data-result', 'lose');
    }
    const after1 = money('1000').plus(money(first.net)).toFixed(2);
    await expect(page.getByTestId('demo-credits-balance').first()).toContainText(after1.replace(/\B(?=(\d{3})+(?!\d))/, ','));

    // 2) manual cash-out at the SERVER multiplier (auto cash-out off) — try a few rounds (1 in ~50 crash at once)
    await page.getByRole('switch', { name: 'Auto cash-out' }).click();
    let cashed: MyBet | null = null;
    for (let attempt = 0; attempt < 6 && !cashed; attempt++) {
      await bettingWindow(page, request);
      await ctaOf(page).click();
      await expect(page.getByTestId('my-live-bet')).toBeVisible({ timeout: 15_000 });
      await expect(game(page)).toHaveAttribute('data-phase', /running|crashed/, { timeout: 30_000 });
      const cta = ctaOf(page);
      if ((await game(page).getAttribute('data-phase')) === 'running') {
        await expect(cta).toContainText('Cash out', { timeout: 5_000 }).catch(() => undefined);
        if ((await cta.textContent())?.includes('Cash out')) await cta.click().catch(() => undefined);
      }
      await expect(game(page)).toHaveAttribute('data-phase', 'crashed', { timeout: 120_000 });
      const b = (await myBets(request, p)).items[0]!;
      expect(b.status).not.toBe('active');
      if (b.status === 'cashed_out') {
        cashed = b;
        expect(b.cashOutKind).toBe('manual');
        expect(money(b.payout).toFixed(2)).toBe(money(b.stake).times(money(b.cashOutMultiplier!)).toDecimalPlaces(2, 1).toFixed(2));
      }
    }
    expect(cashed, 'a manual cash-out within 6 rounds').not.toBeNull();

    // balance = 1,000.00 + Σ net (DEMO credits); the USDT wallet is untouched
    const all = await myBets(request, p);
    const credits = (await (await request.get(`${API}/games/credits`, { headers })).json()) as { balance: string };
    expect(money(credits.balance).toFixed(2)).toBe(money('1000').plus(money(all.summary.net)).toFixed(2));
    expect(await (await request.get(`${API}/wallet/balances`, { headers })).json()).toEqual(usdtBefore);

    // 3) CR-07 — verify the first round in the browser with the shared maths
    await page.goto(`/games/orbit-rush/fairness?round=${first.round.number}`);
    await expect(page.getByTestId('verify-verdict')).toHaveAttribute('data-ok', 'true', { timeout: 60_000 });
    await expect(page.getByTestId('verify-computed')).toHaveText(`Crash point ${money(round.crashPoint).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/, ',')}×`);
    const seed = page.getByTestId('verify-seed');
    const v = await seed.inputValue();
    await seed.fill(`${v.slice(0, -1)}${v.endsWith('0') ? '1' : '0'}`);
    await expect(page.getByTestId('verify-verdict')).toHaveAttribute('data-ok', 'false');
    await page.getByTestId('verify-again').click();
    await expect(page.getByTestId('verify-verdict')).toHaveAttribute('data-ok', 'true');

    // 4) CR-05 — round history + my bets
    await page.goto('/games/orbit-rush/rounds');
    await expect(page.getByTestId('rounds-table')).toBeVisible({ timeout: 60_000 });
    await page.getByLabel('Search round ID (e.g. CR-55102)').fill(`CR-${first.round.number}`);
    await expect(page.getByTestId('rounds-table').getByText(`CR-${first.round.number}`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('rounds-table').locator('tbody tr')).toHaveCount(1);
    await expect(page.getByTestId('crash-stats')).toBeVisible();
    await page.goto('/games/orbit-rush/my-bets');
    await expect(page.getByTestId('my-bets-table').getByText(first.ref)).toBeVisible({ timeout: 60_000 });

    // 5) CR-06 — auto-play needs a stop-loss AND the unticked confirmation; the bet never grows
    await page.goto('/games/orbit-rush');
    await expect(game(page)).toHaveAttribute('data-link', 'live', { timeout: 60_000 });
    await page.getByRole('radio', { name: 'auto' }).click();
    await page.getByTestId('autoplay-open').click();
    const start = page.getByTestId('autoplay-start');
    await expect(page.getByTestId('autoplay-consent')).toHaveAttribute('aria-checked', 'false');
    await expect(start).toBeDisabled();
    await page.getByRole('dialog').getByLabel('Stop-loss in DEMO credits').fill('30.00');
    await expect(start).toBeDisabled();
    await page.getByTestId('autoplay-consent').click();
    await expect(start).toBeEnabled();
    await expect(page.getByRole('dialog').getByText('Auto-play never raises your bet after a loss.')).toBeVisible();
  });

  test('server guards: DEMO credits only, betting window only', async ({ request }) => {
    const p = await createPlayer(request);
    const headers = { authorization: `Bearer ${p.token}` };
    const usdt = await request.post(`${API}/games/orbit-rush/bets`, {
      headers,
      data: { stake: '1.00', autoCashOut: '2.00', currency: 'USDT', idempotencyKey: `e2e-${uniq()}` },
    });
    expect(usdt.status()).toBe(403);
    expect(((await usdt.json()) as { error: { code: string } }).error.code).toBe('REAL_MONEY_DISABLED');
    const bad = await request.post(`${API}/games/orbit-rush/bets`, {
      headers,
      data: { stake: '1.00', autoCashOut: '1.00', idempotencyKey: `e2e-${uniq()}` },
    });
    expect(bad.status()).toBe(400);
    // a public live snapshot never carries the crash point of an unfinished round
    const st = (await (await request.get(`${API}/games/orbit-rush/state`)).json()) as { round: { status: string; crashPoint: string | null; seed: string | null } };
    if (st.round.status !== 'crashed') expect([st.round.crashPoint, st.round.seed]).toEqual([null, null]);
  });
});
