import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { HeroSection } from '@/components/home/hero';
import { HomeViewProvider, type HomeView } from '@/components/home/home-context';
import { NetworksSection } from '@/components/home/info-sections';
import { niceCeil, monotonePath } from '@/components/home/pool-chart';
import { PoolLiveSection } from '@/components/home/pool-live';
import { initialsOf } from '@/components/home/primitives';
import { affiliateEstimate } from '@/components/home/programs';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  mockLiveBets,
  mockNetworks,
  mockPoolHistory,
  mockPoolSnapshot,
  mockVerifierSample,
} from '@/lib/data/mock-home';
import { prefetchHome, queryKeys } from '@/lib/data/queries';
import { DEFAULT_SCENARIO, type HomeScenario } from '@/lib/data/types';
import { rollFromDigest, verifyDiceRoll } from '@/lib/fairness/dice';
import { parseHomePreview } from '@/lib/home-preview';

// The mock data follows the real clock (shifted to the next 20:00 UTC close). Pin "now" to the unshifted DEMO
// snapshot moment so the absolute dates below stay deterministic (shift = 0 days).
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-27T18:44:30Z') });
});
afterAll(() => {
  vi.useRealTimers();
});

describe('dev state preview (?state=)', () => {
  it('parses comma-separated flags', () => {
    const p = parseHomePreview('member,no-round', true);
    expect(p.viewer).toBe('member');
    expect(p.scenario).toEqual({ round: 'none', region: 'permitted' });
    expect(parseHomePreview(['restricted'], true).scenario.region).toBe('restricted');
    expect(parseHomePreview('nonsense', true).flags).toEqual([]);
  });
  it('is ignored when the preview is disabled (production)', () => {
    const p = parseHomePreview('member,restricted', false);
    expect(p.viewer).toBeNull();
    expect(p.scenario).toEqual(DEFAULT_SCENARIO);
  });
});

describe('homepage DEMO data layer', () => {
  it('pool snapshot: active round #1,248 vs between rounds', () => {
    const active = mockPoolSnapshot(DEFAULT_SCENARIO);
    expect(active.current?.number).toBe(1248);
    expect(active.current?.poolBalance).toBe('186400.00');
    expect(active.current?.platformFees).toBe('932.00');
    expect(active.isDemo).toBe(true);
    const none = mockPoolSnapshot({ round: 'none', region: 'permitted' });
    expect(none.current).toBeNull();
    expect(none.last.status).toBe('settled');
    expect(none.next.opensAt).toBe('2026-11-28T08:00:00Z');
  });
  it('14-day history ends with the live pool and marks #1,245 cancelled', () => {
    const h = mockPoolHistory(DEFAULT_SCENARIO);
    expect(h.points).toHaveLength(14);
    expect(h.points.at(-1)).toMatchObject({ roundNumber: 1248, pool: '186400.00', status: 'open' });
    expect(h.points.find((p) => p.roundNumber === 1245)?.status).toBe('cancelled');
    expect(h.points.every((p) => p.isDemo)).toBe(true);
  });
  it('networks follow the chain config: only Arbitrum is live in the MVP', () => {
    const n = mockNetworks();
    expect(n.map((x) => x.key)).toEqual(['bnb', 'polygon', 'arbitrum', 'ethereum', 'solana']);
    expect(n.filter((x) => x.enabled).map((x) => x.key)).toEqual(['arbitrum']);
  });
  it('live bets: pool entries await the draw while a round is open, then show settled', () => {
    const open = mockLiveBets('latest', DEFAULT_SCENARIO);
    expect(open).toHaveLength(10);
    expect(open[0]?.result).toMatchObject({ type: 'status', status: 'awaiting_draw' });
    const closed = mockLiveBets('latest', { round: 'none', region: 'permitted' });
    expect(closed[0]?.result).toMatchObject({ type: 'status', status: 'settled' });
    expect(
      mockLiveBets('rounds', DEFAULT_SCENARIO).find((b) => b.detail.includes('#1,245'))?.result,
    ).toMatchObject({ status: 'cancelled' });
  });
  it('server prefetch fills the hydration cache', async () => {
    const qc = new QueryClient();
    await prefetchHome(qc, DEFAULT_SCENARIO);
    expect(qc.getQueryData(queryKeys.poolSnapshot(DEFAULT_SCENARIO))).toBeTruthy();
    expect(qc.getQueryData(queryKeys.entriesFeed(1248))).toHaveLength(5);
    expect(qc.getQueryData(queryKeys.networks())).toHaveLength(5);
  });
});

describe('provably-fair verifier sample', () => {
  it('really recomputes: SHA-256 matches the commitment and HMAC gives roll 73.21', async () => {
    const s = mockVerifierSample();
    const v = await verifyDiceRoll({ ...s });
    expect(v.hashMatches).toBe(true);
    expect(v.roll).toBe('73.21');
    expect(v.resultMatches).toBe(true);
  });
  it('different inputs give a different roll (no fake "verified")', async () => {
    const s = mockVerifierSample();
    const v = await verifyDiceRoll({ ...s, nonce: 418 });
    expect(v.hashMatches).toBe(true);
    expect(v.resultMatches).toBe(false);
  });
  it('maps digest bytes to 0.00–99.99 with integer math', () => {
    expect(rollFromDigest(new Uint8Array([0, 0, 0, 0]))).toBe('0.00');
    expect(rollFromDigest(new Uint8Array([255, 255, 255, 255]))).toBe('99.99');
    expect(rollFromDigest(new Uint8Array([128, 0, 0, 0]))).toBe('50.00');
  });
});

describe('homepage helpers', () => {
  it('affiliate estimate = players × entries × 0.05 × 20%', () => {
    expect(affiliateEstimate(40, 120)).toEqual({ fees: '240.00', commission: '48.00' });
    expect(affiliateEstimate(0, 120)).toEqual({ fees: '0.00', commission: '0.00' });
  });
  it('initials from handles', () => {
    expect(['mira.sol', 'atlas_q', 'juno88', 'kestrel', 'orbit_77'].map(initialsOf)).toEqual([
      'MS',
      'AQ',
      'JU',
      'KE',
      'OR',
    ]);
  });
  it('chart geometry helpers', () => {
    expect(niceCeil(186400)).toBe(200000);
    expect(niceCeil(3412)).toBe(4000);
    expect(
      monotonePath([
        [0, 10],
        [10, 0],
        [20, 10],
      ]),
    ).toMatch(/^M0,10C/);
  });
});

// ── server-rendered sections ────────────────────────────────────────────────────────────────────

async function renderSections(
  scenario: HomeScenario,
  overrides: Partial<HomeView>,
  node: React.ReactElement,
) {
  const qc = new QueryClient();
  await prefetchHome(qc, scenario);
  const snapshot = mockPoolSnapshot(scenario);
  const view: HomeView = {
    viewer: 'guest',
    restricted: scenario.region === 'restricted',
    countryName: scenario.region === 'restricted' ? 'United States' : 'Portugal',
    scenario,
    snapshot,
    demoNow: snapshot.serverNow,
    now: new Date(snapshot.serverNow).getTime(),
    myEntries: undefined,
    balance: undefined,
    signIn: () => {},
    signUp: () => {},
    ...overrides,
  };
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <HomeViewProvider value={view}>{node}</HomeViewProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('homepage sections (SSR)', () => {
  it('hero: headline, real close time, fee line and DEMO markers', async () => {
    const out = await renderSections(DEFAULT_SCENARIO, {}, <HeroSection />);
    expect(out).toContain('One global pool.');
    expect(out).toContain('186,400.00 USDT');
    expect(out).toContain('27 Nov 2026, 20:00 UTC');
    expect(out).toContain(
      'Entry 10.00 + fee 0.05 USDT · 18+ · You can lose your stake · Terms apply',
    );
    expect(out).toContain('Platform fees (932.00 USDT) are not part of the pool');
    expect(out).toMatch(/role="timer"/);
    expect(out).toContain('Demo');
  });
  it('restricted region: CTAs disabled, promotions removed, withdrawal still offered, no bypass hints', async () => {
    const out = await renderSections(
      { round: 'active', region: 'restricted' },
      {},
      <HeroSection />,
    );
    expect(out).toContain('Not available in your region (United States)');
    expect(out).toMatch(/<button[^>]*disabled[^>]*>.*?Enter round/s);
    expect(out).not.toContain('Welcome offer');
    expect(out).toContain('Sign in to withdraw');
    expect(out.toLowerCase()).not.toContain('vpn');
  });
  it('member: shows the player’s 35 entries and odds', async () => {
    const out = await renderSections(
      DEFAULT_SCENARIO,
      {
        viewer: 'member',
        myEntries: {
          ...(await import('@/lib/data/mock-home')).mockMyEntries(),
        },
        balance: { available: '9215.30', isDemo: true },
      },
      <HeroSection />,
    );
    expect(out).toContain('Your 35 entries');
    expect(out).toContain('351.75 USDT');
    expect(out).toContain('2.44%');
    expect(out).toContain('9,215.30 USDT');
  });
  it('no active round: next opening time instead of a close countdown', async () => {
    const out = await renderSections({ round: 'none', region: 'permitted' }, {}, <HeroSection />);
    expect(out).toContain('Round #1,249 opens');
    expect(out).toContain('28 Nov 2026, 08:00 UTC');
    expect(out).toContain('Notify me');
    expect(out).not.toContain('Closes in');
  });
  it('pool live: per-entry cost breakdown 10.00 + 0.05 + 0.00 = 10.05', async () => {
    const out = await renderSections(DEFAULT_SCENARIO, {}, <PoolLiveSection />);
    expect(out).toContain('Entry price');
    expect(out).toContain('10.00 USDT');
    expect(out).toContain('0.05 USDT');
    expect(out).toContain('0.00 USDT');
    expect(out).toContain('10.05 USDT');
    expect(out).toContain('3.7× the minimum');
    expect(out).toContain('6.8× the minimum');
  });
  it('networks: Arbitrum live, the rest marked coming soon', async () => {
    const out = await renderSections(DEFAULT_SCENARIO, {}, <NetworksSection />);
    expect(out).toContain('Deposit USDT on Arbitrum');
    expect(out).toContain('Coming soon');
    expect(out).toContain('Operational');
  });
});
