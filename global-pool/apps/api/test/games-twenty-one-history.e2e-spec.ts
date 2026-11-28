/**
 * Twenty-One history filters (key "blackjack", BJ-06): GET /games/twenty-one/bets?outcome=… — net win / lose / push
 * (payout vs stake, column to column) and the hand results blackjack / bust / split_double read from the settled
 * outcome. Real hands are played through the API with a fixed strategy; whatever the shuffles were, every filter must
 * return exactly the settled hands that match it, and the summary must follow the filter.
 */
import { DEMO } from '@gp/shared/demo';
import { FAIR_GAME_SLUGS } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bearer, createTestApp, newPlayer, uid, type TestApp, type TestPlayer } from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
  for (const g of DEMO.games.filter((x) => (FAIR_GAME_SLUGS as string[]).includes(x.slug))) {
    await t.prisma.game.upsert({
      where: { slug: g.slug },
      create: {
        slug: g.slug,
        name: g.name,
        category: g.category,
        mechanic: g.mechanic,
        houseEdgePercent: g.houseEdgePercent,
        edgeLabel: g.edgeLabel,
        icon: g.icon,
        details: g.details,
        mode: 'simulation',
        isDemo: true,
      },
      update: { enabled: true, mode: 'simulation' },
    });
  }
});
afterAll(async () => {
  await t.close();
});

interface HandView {
  cards: string[];
  total: number;
  doubled: boolean;
  fromSplit: boolean;
  result: string | null;
}
interface BetView {
  id: string;
  status: 'active' | 'settled';
  stake: string;
  payout: string;
  outcome: { hands?: HandView[] };
  round: { phase: string; hands: HandView[]; active: number; allowedActions: string[] };
}

const key = () => `k-${uid()}`;
const post = (p: TestPlayer, path: string, body: object) =>
  t.http().post(path).set(bearer(p.token)).send(body);
const get = (p: TestPlayer, path: string) => t.http().get(path).set(bearer(p.token));

/** Fixed strategy that reaches splits, doubles, busts and stands: decline insurance, split pairs, double 9–11. */
function nextAction(b: BetView): { action: string; accept?: boolean } {
  const r = b.round;
  if (r.allowedActions.includes('insurance')) return { action: 'insurance', accept: false };
  const h = r.hands[r.active]!;
  if (r.allowedActions.includes('split')) return { action: 'split' };
  if (r.allowedActions.includes('double') && h.total >= 9 && h.total <= 11) return { action: 'double' };
  return h.total < 17 ? { action: 'hit' } : { action: 'stand' };
}

async function playHand(p: TestPlayer): Promise<BetView> {
  let b = (await post(p, '/games/twenty-one/hands', { stake: '1.00', idempotencyKey: key() }).expect(201))
    .body as BetView;
  for (let i = 0; i < 20 && b.status === 'active'; i++) {
    b = (
      await post(p, `/games/twenty-one/hands/${b.id}/action`, {
        ...nextAction(b),
        idempotencyKey: key(),
      }).expect(200)
    ).body as BetView;
  }
  expect(b.status).toBe('settled');
  return b;
}

describe('Twenty-One history — outcome filters (BJ-06)', () => {
  it('filters by net result and by hand result, and the summary follows the filter', async () => {
    const p = await newPlayer(t);
    const played: BetView[] = [];
    for (let i = 0; i < 36; i++) played.push(await playHand(p));

    const all = (await get(p, '/games/twenty-one/bets?pageSize=100').expect(200)).body as {
      items: BetView[];
      summary: { bets: number; outcomes: { win: number; lose: number; push: number } };
    };
    expect(all.items).toHaveLength(played.length);
    const net = (b: BetView) => money(b.payout).minus(money(b.stake));
    const hands = (b: BetView) => b.outcome.hands ?? [];
    const expected: Record<string, (b: BetView) => boolean> = {
      win: (b) => net(b).gt(0),
      lose: (b) => net(b).lt(0),
      push: (b) => net(b).isZero(),
      blackjack: (b) => hands(b).some((h) => h.result === 'blackjack'),
      bust: (b) => hands(b).some((h) => h.result === 'bust'),
      split_double: (b) => hands(b).some((h) => h.fromSplit || h.doubled),
    };
    expect(all.summary.outcomes).toEqual({
      win: all.items.filter(expected.win!).length,
      lose: all.items.filter(expected.lose!).length,
      push: all.items.filter(expected.push!).length,
    });
    expect(all.summary.outcomes.win + all.summary.outcomes.lose + all.summary.outcomes.push).toBe(
      all.summary.bets,
    );

    for (const [outcome, match] of Object.entries(expected)) {
      const res = (
        await get(p, `/games/twenty-one/bets?pageSize=100&outcome=${outcome}`).expect(200)
      ).body as { items: BetView[]; total: number; summary: { bets: number } };
      const want = all.items
        .filter(match)
        .map((b) => b.id)
        .sort();
      expect(res.items.map((b) => b.id).sort(), outcome).toEqual(want);
      expect(res.total, outcome).toBe(want.length);
      expect(res.summary.bets, outcome).toBe(want.length);
    }

    // an unknown value is a validation error, never a silent "all"
    await get(p, '/games/twenty-one/bets?outcome=jackpot').expect(400);
  });
});
