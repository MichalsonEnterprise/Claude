/**
 * Close-out pass 2 (web) with NEXT_PUBLIC_DATA_SOURCE=api (the QA / integration build), against a stubbed fetch:
 * - Q03: a round whose status is `open` but whose `opensAt` is still in the future is the NEXT round on the homepage
 *   (no "Closes in … / Enter round" while the API refuses entries);
 * - R37b / Q02: the mock-only member figures (live-bets "YOU" row, rakeback amount, VIP "You're here") are never shown
 *   as a real member's own.
 * Every module is imported after the env is set (DATA_SOURCE is read at import time).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type * as HomeContextModule from '@/components/home/home-context';
import type * as QueriesModule from '@/lib/data/queries';
import type * as TypesModule from '@/lib/data/types';

let q: typeof QueriesModule;
let ctx: typeof HomeContextModule;
let types: typeof TypesModule;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_DATA_SOURCE = 'api';
  process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
  q = await import('@/lib/data/queries');
  ctx = await import('@/components/home/home-context');
  types = await import('@/lib/data/types');
});
afterEach(() => vi.unstubAllGlobals());

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

const HOUR = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();

describe('homepage snapshot: a round that has not opened yet (Q03)', () => {
  it('status open + future opensAt → no current round; it is the next round, the previous one is `last`', async () => {
    const now = Date.now();
    const notYet = {
      id: '00000000-0000-4000-8000-000000001248',
      number: 1248,
      status: 'open',
      statusLabel: 'Open',
      opensAt: iso(now + 2 * HOUR),
      openedAt: iso(now + 2 * HOUR),
      closesAt: iso(now + 14 * HOUR),
      poolBalance: '186970.00',
      winners: [],
      draw: null,
      isDemo: true,
    };
    const previous = {
      ...notYet,
      id: 'prev',
      number: 1247,
      status: 'settled',
      closesAt: iso(now - 10 * HOUR),
    };
    const calls = stubApi({
      '/pool/rounds/current': notYet,
      '/pool/rounds?pageSize=1': { items: [previous] },
    });
    const qc = new QueryClient();
    const snap = await qc.fetchQuery(q.poolSnapshotQuery(types.DEFAULT_SCENARIO));
    expect(snap.current).toBeNull();
    expect(snap.next).toEqual({ number: 1248, opensAt: notYet.opensAt, closesAt: notYet.closesAt });
    expect(snap.last.number).toBe(1247);
    expect(calls).toContain('/pool/rounds?pageSize=1');
  });

  it('an open round whose window has started is still the current round', async () => {
    const now = Date.now();
    const open = {
      id: 'r-open',
      number: 1249,
      status: 'open',
      opensAt: iso(now - HOUR),
      openedAt: iso(now - HOUR),
      closesAt: iso(now + 11 * HOUR),
      poolBalance: '10.00',
      winners: [],
      draw: null,
      isDemo: true,
    };
    stubApi({ '/pool/rounds/current': open });
    const snap = await new QueryClient().fetchQuery(q.poolSnapshotQuery(types.DEFAULT_SCENARIO));
    expect(snap.current?.number).toBe(1249);
  });
});

describe('mock-only member figures are never a real member’s own (R37b · Q02)', () => {
  it('viewerIsDemoPlayer is false for every API-mode viewer', () => {
    expect(ctx.viewerIsDemoPlayer('member')).toBe(false);
    expect(ctx.viewerIsDemoPlayer('guest')).toBe(false);
  });

  it('live bets, rakeback and VIP tiers render without the DEMO player’s "YOU" row, 3.42 USDT or 12,840 pts', async () => {
    const { ActivitySection } = await import('@/components/home/activity');
    const { HeroSection } = await import('@/components/home/hero');
    const { VipSection } = await import('@/components/home/programs');
    const { TooltipProvider } = await import('@/components/ui/tooltip');
    const { mockPoolSnapshot } = await import('@/lib/data/mock-home');
    const scenario = types.DEFAULT_SCENARIO;
    const qc = new QueryClient();
    // mock-only feeds (no API endpoint yet): the same fetchers the homepage uses in API mode
    await Promise.all([
      qc.prefetchQuery(q.liveBetsQuery('latest', scenario)),
      qc.prefetchQuery(q.recentWinsQuery()),
      qc.prefetchQuery(q.vipTiersQuery()),
    ]);
    const snapshot = mockPoolSnapshot(scenario);
    // the feed still holds the DEMO player's row — it must not be presented as this member's
    expect(
      qc
        .getQueryData<{ handle: string | null }[]>(q.queryKeys.liveBets('latest', scenario))
        ?.some((b) => b.handle === 'nova.k'),
    ).toBe(true);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <ctx.HomeViewProvider
            value={{
              viewer: 'member',
              restricted: false,
              countryName: 'Portugal',
              scenario,
              snapshot,
              demoNow: snapshot.serverNow,
              now: new Date(snapshot.serverNow).getTime(),
              myEntries: undefined,
              balance: { available: '100.00', isDemo: true },
              signIn: () => undefined,
              signUp: () => undefined,
            }}
          >
            {React.createElement(HeroSection)}
            {React.createElement(ActivitySection)}
            {React.createElement(VipSection)}
          </ctx.HomeViewProvider>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    expect(html).toContain('@nova.k'); // the public feed row is still listed …
    expect(html).not.toMatch(/>You</); // … but never tagged as the viewer's
    expect(html).not.toContain('3.42 USDT claimable now');
    expect(html).toContain('Rakeback isn’t live in this build yet');
    expect(html).not.toContain('You’re here');
  });
});
