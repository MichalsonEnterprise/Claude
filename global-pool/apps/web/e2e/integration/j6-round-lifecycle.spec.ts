/**
 * J6 — Global Pool round lifecycle (pool × randomness × ledger × history × web verifier).
 *
 * The API has NO DEMO/dev helper to close / draw / settle a round: the lifecycle runs only from the BullMQ `rounds`
 * queue tick (JOBS_ENABLED=true, at the round's real closesAt), and DEMO rounds are never drawn unless
 * DEMO_ROUNDS_AUTO_SETTLE=true (RoundLifecycleService.autoSettle). The middle part of the journey is therefore skipped
 * with that reason; the parts that can run against the shared dev DB are asserted:
 *   1. a fresh player enters the open round and sees the entries on the round page + history (needs an open round);
 *   2. close → draw (mock VRF) → settle — skipped (no helper; endpoints probed → 404);
 *   3. the latest settled round shows its results and the in-browser verifier (GP-12) passes.
 */
import { expect, test } from '@playwright/test';

import {
  API,
  acceptsEntries,
  balances,
  bearer,
  createPlayer,
  currentRound,
  json,
  shot,
  signIn,
  uniq,
  watch,
  VIEWPORT,
} from './_journey';

const J = 'j6';

test.describe('J6 — round lifecycle: enter → close → draw → settle → results + verifier', () => {
  test.use({ viewport: VIEWPORT });
  test.setTimeout(240_000);

  test('1. a fresh player enters the open round and sees the entries on the round page and in history', async ({
    page,
    request,
  }, testInfo) => {
    const signals = watch(page, J);
    try {
      const round = await currentRound(request);
      expect(
        acceptsEntries(round),
        `round #${round.number} must accept entries now (status ${round.status}, opensAt ${round.opensAt}, now ${new Date().toISOString()})`,
      ).toBe(true);
      const player = await createPlayer(request, J, { deposit: '50.00' });
      const headers = bearer(player.token);
      const res = await request.post(`${API}/pool/rounds/${round.id}/entries`, {
        headers,
        data: { entries: 2, idempotencyKey: `qa-j6-${uniq()}` },
      });
      expect(res.status(), await res.text()).toBe(201);
      const buy = await json<{ entries: number; entryAmount: string; platformFee: string; networkFee: string; total: string; firstEntryId: string; lastEntryId: string }>(res);
      expect(buy).toMatchObject({ entries: 2, entryAmount: '20.00', platformFee: '0.10', networkFee: '0.00', total: '20.10' });
      expect(await balances(request, player)).toMatchObject({ available: '29.90', locked: '20.00', total: '49.90' });

      await signIn(page, player);
      await page.goto(`/pool/rounds/${round.number}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('main')).toContainText(buy.firstEntryId);
      await shot(page, J, '01_round_page_with_entries');
      const active = await json<{ items?: { roundNumber: number }[] } | { roundNumber: number }[]>(
        await request.get(`${API}/history/rounds/active`, { headers }),
      );
      expect(JSON.stringify(active)).toContain(String(round.number));
      await page.goto('/history/games/active');
      await expect(page.locator('main')).toContainText(round.number.toLocaleString('en-US'));
      await shot(page, J, '02_history_active');
    } finally {
      signals.flush(testInfo);
    }
  });

  test('2. close → draw (mock VRF) → settle via a DEMO helper', async ({ request }) => {
    // Probe the endpoints a DEMO helper would live at — none exists (documented capability gap).
    const round = await currentRound(request);
    const probes = [
      `/dev/rounds/${round.id}/close`,
      `/dev/rounds/${round.number}/close`,
      `/dev/pool/rounds/${round.id}/close`,
      `/admin/rounds/${round.number}/close`,
      `/admin/pool/rounds/${round.number}/draw`,
    ];
    const statuses: string[] = [];
    for (const p of probes) statuses.push(`${p} → ${(await request.post(`${API}${p}`, { data: {} })).status()}`);
    test.info().annotations.push({ type: 'lifecycle helper probes', description: statuses.join(' · ') });
    expect(statuses.every((s) => / → (404|401)$/.test(s))).toBe(true);
    test.skip(
      true,
      'No DEMO/dev helper for close/draw/settle: the lifecycle runs only from the BullMQ rounds tick at closesAt, and DEMO rounds are drawn only with DEMO_ROUNDS_AUTO_SETTLE=true.',
    );
  });

  test('3. the latest settled round shows its results and the in-browser verifier passes', async ({ page, request }, testInfo) => {
    const signals = watch(page, `${J}_verify`);
    try {
      const list = await json<{ items: { number: number; status: string; isDemo: boolean }[] }>(
        await request.get(`${API}/pool/rounds?status=settled`),
      );
      expect(list.items.length).toBeGreaterThan(0);
      const n = list.items[0]!.number;
      const bundle = await json<{ randomness: unknown; recomputed: { matches?: boolean } | null; winners: unknown[] }>(
        await request.get(`${API}/pool/rounds/${n}/verify`),
      );
      testInfo.annotations.push({
        type: `verify bundle #${n}`,
        description: `randomness=${JSON.stringify(bundle.randomness)} recomputed=${JSON.stringify(bundle.recomputed)} winners=${bundle.winners.length}`,
      });

      await page.goto(`/pool/rounds/${n}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
      await shot(page, J, '03_settled_round_page');
      await expect(page.locator('main')).toContainText(/winner|prize/i);

      await page.goto(`/pool/rounds/${n}/verify`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(2_000);
      await shot(page, J, '04_verify_page');
      expect.soft(bundle.randomness, `settled round #${n} must carry its VRF word in /verify`).not.toBeNull();
      await expect(page.getByText('Verified — this draw matches the recorded result.')).toBeVisible({ timeout: 30_000 });
    } finally {
      signals.flush(testInfo);
    }
  });
});
