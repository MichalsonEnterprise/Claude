import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import {
  bearer,
  createTestApp,
  demoDeposit,
  newPlayer,
  openRound,
  uid,
  type TestApp,
} from './helpers';

/** GET /pool/me/entries (GP-10 entry history) and the additive ?status / ?number filters of GET /pool/rounds. */
let t: TestApp;
let lifecycle: RoundLifecycleService;

beforeAll(async () => {
  t = await createTestApp();
  lifecycle = t.app.get(RoundLifecycleService);
});
afterAll(async () => {
  await t?.close();
});

const enter = (token: string, roundId: string, entries: number) =>
  t
    .http()
    .post(`/pool/rounds/${roundId}/entries`)
    .set(bearer(token))
    .send({ entries, idempotencyKey: `h-${uid()}` })
    .expect(201);

interface HistoryItem {
  reference: string;
  roundNumber: number;
  roundStatus: string;
  entries: number;
  entryAmount: string;
  platformFee: string;
  networkFee: string;
  total: string;
  result: { kind: string; prize: string | null; refund: string | null; winningEntryIds: string[] };
}

describe('GET /pool/me/entries', () => {
  it('requires a player token', async () => {
    await t.http().get('/pool/me/entries').expect(401);
  });

  it('lists purchases with separate fee lines and their results (in draw → won/not selected, cancelled → refund owed)', async () => {
    const p = await newPlayer(t);
    const other = await newPlayer(t);
    await demoDeposit(t, p, '500.00');
    await demoDeposit(t, other, '500.00');

    const drawn = await openRound(t, { minParticipants: 2, minPool: '50.00' });
    await enter(p.token, drawn.id, 4);
    await enter(other.token, drawn.id, 10);
    const cancelled = await openRound(t); // default thresholds → cancelled at close
    await enter(p.token, cancelled.id, 3);

    let res = await t.http().get('/pool/me/entries').set(bearer(p.token)).expect(200);
    expect(res.body.summary).toMatchObject({
      purchases: 2,
      qualifyingEntries: 7,
      activeEntries: 7,
      platformFeesPaid: '0.35',
      prizesWon: '0.00',
      refundOwed: '0.00',
    });
    expect(res.body.total).toBe(2);
    const first = (res.body.items as HistoryItem[]).find((i) => i.roundNumber === drawn.number)!;
    expect(first).toMatchObject({
      entries: 4,
      entryAmount: '40.00',
      platformFee: '0.20',
      networkFee: '0.00',
      total: '40.20',
      result: { kind: 'in_draw', prize: null, refund: null },
    });

    await lifecycle.close(drawn.id);
    expect(await lifecycle.startDraw(drawn.id)).toBe('drawing');
    expect(await lifecycle.pollAndSettle(drawn.id)).toBe('settled');
    await lifecycle.close(cancelled.id);
    expect(await lifecycle.startDraw(cancelled.id)).toBe('cancelled');

    res = await t.http().get('/pool/me/entries').set(bearer(p.token)).expect(200);
    const items = res.body.items as HistoryItem[];
    const settledRow = items.find((i) => i.roundNumber === drawn.number)!;
    const cancelledRow = items.find((i) => i.roundNumber === cancelled.number)!;
    // 13 prizes over 14 entries: at least 3 of p's 4 entries must win
    expect(settledRow.result.kind).toBe('won');
    expect(settledRow.result.winningEntryIds.length).toBeGreaterThanOrEqual(3);
    expect(Number(settledRow.result.prize)).toBeGreaterThan(0);
    expect(cancelledRow).toMatchObject({
      roundStatus: 'cancelled',
      result: { kind: 'refund_owed', refund: '30.00', prize: null },
    });
    expect(res.body.summary).toMatchObject({
      qualifyingEntries: 4,
      activeEntries: 0,
      refundOwed: '30.00',
      platformFeesPaid: '0.35',
    });
    expect(res.body.summary.prizesWon).toBe(settledRow.result.prize);

    // paging
    const page = await t
      .http()
      .get('/pool/me/entries?page=2&pageSize=1')
      .set(bearer(p.token))
      .expect(200);
    expect(page.body).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
    expect(page.body.items).toHaveLength(1);
  });
});

describe('GET /pool/me/entries — results are scoped to each purchase (R16)', () => {
  it('two purchases in one cancelled round each show only their own refund', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '500.00');
    const round = await openRound(t); // default thresholds → cancelled at close
    await enter(p.token, round.id, 35);
    await enter(p.token, round.id, 10);
    await lifecycle.close(round.id);
    expect(await lifecycle.startDraw(round.id)).toBe('cancelled');

    const res = await t.http().get('/pool/me/entries').set(bearer(p.token)).expect(200);
    const rows = (res.body.items as HistoryItem[]).filter((i) => i.roundNumber === round.number);
    expect(rows.map((r) => [r.entries, r.result.kind, r.result.refund]).sort()).toEqual([
      [10, 'refund_owed', '100.00'],
      [35, 'refund_owed', '350.00'],
    ]);
    expect(res.body.summary.refundOwed).toBe('450.00');
  });

  it('a win is shown only on the purchase whose entry won', async () => {
    const p = await newPlayer(t);
    const other = await newPlayer(t);
    await demoDeposit(t, p, '500.00');
    await demoDeposit(t, other, '500.00');
    const round = await openRound(t, { minParticipants: 2, minPool: '50.00' });
    await enter(p.token, round.id, 1);
    await enter(p.token, round.id, 3);
    await enter(other.token, round.id, 10);
    await lifecycle.close(round.id);
    expect(await lifecycle.startDraw(round.id)).toBe('drawing');
    expect(await lifecycle.pollAndSettle(round.id)).toBe('settled');

    const res = await t.http().get('/pool/me/entries').set(bearer(p.token)).expect(200);
    const rows = (
      res.body.items as (HistoryItem & { firstEntryId: string; lastEntryId: string })[]
    ).filter((i) => i.roundNumber === round.number);
    expect(rows).toHaveLength(2);
    const winners = await t.prisma.winner.findMany({
      where: { roundId: round.id, userId: p.userId },
      include: { entry: { select: { code: true, transactionId: true } } },
    });
    const purchases = await t.prisma.transaction.findMany({
      where: { roundId: round.id, userId: p.userId, type: 'entry_purchase' },
    });
    let prizeSum = 0n;
    for (const row of rows) {
      const tx = purchases.find((x) => x.reference === row.reference)!;
      const own = winners.filter((w) => w.entry?.transactionId === tx.id);
      expect([...row.result.winningEntryIds].sort()).toEqual(own.map((w) => w.entry!.code).sort());
      expect(row.result.kind).toBe(own.length > 0 ? 'won' : 'not_selected');
      if (row.result.prize) prizeSum += BigInt(row.result.prize.replace('.', ''));
    }
    // Σ of the per-purchase prizes equals the player's prizes in the round (no row repeats another's prize)
    const total = winners.reduce((a, w) => a + BigInt(w.amount.toFixed(2).replace('.', '')), 0n);
    expect(prizeSum).toBe(total);
  });
});

describe('GET /pool/rounds/:roundId/my-entries odds (R48)', () => {
  it('discloses odds rounded DOWN with 6 decimals', async () => {
    const p = await newPlayer(t);
    const other = await newPlayer(t);
    await demoDeposit(t, p, '100.00');
    await demoDeposit(t, other, '100.00');
    const round = await openRound(t);
    await enter(p.token, round.id, 2);
    await enter(other.token, round.id, 1);
    const res = await t
      .http()
      .get(`/pool/rounds/${round.id}/my-entries`)
      .set(bearer(p.token))
      .expect(200);
    // 2 of 3 entries: exact 66.666…% — half-up would overstate it as 66.667%
    expect(res.body.odds.firstPrizePercent).toBe('66.666666');
  });
});

describe('GET /pool/rounds filters', () => {
  it('filters by status and by round number; rejects unknown statuses', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '50.00');
    const round = await openRound(t);
    await enter(p.token, round.id, 1);
    await lifecycle.close(round.id);
    await lifecycle.startDraw(round.id); // → cancelled (thresholds not met)

    const byNumber = await t.http().get(`/pool/rounds?number=${round.number}`).expect(200);
    expect(byNumber.body.total).toBe(1);
    expect(byNumber.body.items[0]).toMatchObject({ number: round.number, status: 'cancelled' });

    const cancelled = await t
      .http()
      .get(`/pool/rounds?status=cancelled&number=${round.number}`)
      .expect(200);
    expect(cancelled.body.total).toBe(1);
    const settledOnly = await t
      .http()
      .get(`/pool/rounds?status=settled&number=${round.number}`)
      .expect(200);
    expect(settledOnly.body.total).toBe(0);

    const all = await t.http().get('/pool/rounds?status=settled,cancelled&pageSize=50').expect(200);
    for (const r of all.body.items as { status: string }[]) {
      expect(['settled', 'cancelled']).toContain(r.status);
    }
    await t.http().get('/pool/rounds?status=open').expect(400);
  });
});
