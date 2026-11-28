/**
 * Homepage data layer with NEXT_PUBLIC_DATA_SOURCE=api (the QA / integration build), against a stubbed fetch:
 * - R30: between rounds `last` is the previous closed / drawing / settled round, never the next scheduled one;
 * - R37: the viewer's balance and entries come from the API (their real data), never the DEMO 9,215.30 / 35.
 */
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SCENARIO } from '@/lib/data/types';

import type * as QueriesModule from '@/lib/data/queries';

let q: typeof QueriesModule;

const round = (over: Record<string, unknown>) => ({
  id: '00000000-0000-4000-8000-000000001249',
  number: 1249,
  status: 'scheduled',
  opensAt: '2026-11-29T08:00:00.000Z',
  openedAt: '2026-11-29T08:00:00.000Z',
  closesAt: '2026-11-29T20:00:00.000Z',
  poolBalance: '0.00',
  winners: [],
  draw: null,
  isDemo: true,
  ...over,
});

function stubApi(routes: Record<string, unknown>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = new URL(String(input));
      const key = `${url.pathname}${url.search}`;
      calls.push(key);
      if (!(key in routes)) return Promise.resolve(new Response('{}', { status: 404 }));
      return Promise.resolve(
        new Response(JSON.stringify(routes[key]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }),
  );
  return calls;
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_DATA_SOURCE = 'api';
  process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
  q = await import('@/lib/data/queries');
});
afterEach(() => vi.unstubAllGlobals());

const scenario = DEFAULT_SCENARIO;

describe('homepage snapshot between rounds (R30)', () => {
  it('keeps the previous round (settled with winners) as `last` while the next one is scheduled', async () => {
    const calls = stubApi({
      '/pool/rounds/current': round({}),
      '/pool/rounds?pageSize=1': {
        items: [
          round({ id: 'r1248', number: 1248, status: 'settled', winners: new Array(13).fill({}) }),
        ],
        total: 1,
      },
    });
    const snap = await new QueryClient().fetchQuery(q.poolSnapshotQuery(scenario));
    expect(snap.current).toBeNull();
    expect(snap.last.number).toBe(1248);
    expect(snap.last.status).toBe('settled');
    expect(snap.next.number).toBe(1249);
    expect(calls).toContain('/pool/rounds?pageSize=1');
  });

  it('does not fetch history while a round is open', async () => {
    const calls = stubApi({ '/pool/rounds/current': round({ status: 'open' }) });
    const snap = await new QueryClient().fetchQuery(q.poolSnapshotQuery(scenario));
    expect(snap.current?.number).toBe(1249);
    expect(calls).toEqual(['/pool/rounds/current']);
  });
});

describe('homepage viewer data (R37)', () => {
  it('reads the member’s real Available balance', async () => {
    stubApi({ '/wallet/balances': { available: '100.00', locked: '0.00' } });
    const b = await new QueryClient().fetchQuery(q.viewerBalanceQuery());
    expect(b.available).toBe('100.00');
  });

  it('shows no entries row for a member without entries, and real entries otherwise', async () => {
    const id = '00000000-0000-4000-8000-000000001249';
    stubApi({
      [`/pool/rounds/${id}/my-entries`]: {
        roundId: id,
        roundNumber: 1249,
        entries: 0,
        firstEntryId: null,
        lastEntryId: null,
        entryAmount: '0.00',
        platformFee: '0.00',
        purchases: [],
        odds: null,
      },
    });
    expect(await new QueryClient().fetchQuery(q.myEntriesQuery(1249, id))).toBeNull();

    stubApi({
      [`/pool/rounds/${id}/my-entries`]: {
        roundId: id,
        roundNumber: 1249,
        entries: 3,
        firstEntryId: 'GP-1249-00001',
        lastEntryId: 'GP-1249-00003',
        entryAmount: '30.00',
        platformFee: '0.15',
        purchases: [{ reference: 'EP-1', total: '30.15', at: '2026-11-29T09:00:00.000Z' }],
        odds: { anyPrizeApproxPercent: '1.2', firstPrizePercent: '0.1' },
      },
    });
    const mine = await new QueryClient().fetchQuery(q.myEntriesQuery(1249, id));
    expect(mine?.entries).toBe(3);
    expect(mine?.total).toBe('30.15');
    expect(mine?.firstEntryId).toBe('GP-1249-00001');
  });
});
