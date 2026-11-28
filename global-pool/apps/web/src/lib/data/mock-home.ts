/**
 * Homepage DEMO extras that are not (yet) in @gp/shared/demo: the 14-day pool chart, the recent-wins strip,
 * the live-bets table, VIP weekly rates, the verifier sample and the VRF timeline copy. Values come from the
 * PUB-01 Figma build notes (design/figma-build/results/screens-1-public.json) and reuse the shared DEMO records
 * wherever one exists. Every record is `isDemo: true`.
 *
 * TODO(api): move these into @gp/shared/demo once the API seeds / serves them (pool history, live bets).
 */
import { CHAIN_DISPLAY_ORDER, CHAINS } from '@gp/shared/chains';
import {
  DEMO_AS_OF,
  DEMO_CURRENT_ROUND,
  DEMO_ENTRIES_FEED,
  DEMO_MY_ENTRIES,
  DEMO_ODDS_EXAMPLE,
  DEMO_PREVIOUS_ROUNDS,
  DEMO_ROUND_1248_DRAW,
  DEMO_ROUND_1248_SETTLED,
  DEMO_VIP_TIERS,
  demoId,
} from '@gp/shared/demo';
import { formatCount, formatRoundNumber } from '@gp/shared/format';
import { ROUND_THRESHOLDS } from '@gp/shared/pool';

import type {
  DrawRandomnessView,
  HomeScenario,
  LiveBet,
  LiveBetTab,
  MyEntriesView,
  NetworkView,
  PoolHistory,
  PoolSnapshot,
  RecentWin,
  RegionStatus,
  VerifierSample,
  VipTierView,
} from './types';

/** DEMO "now" between rounds (no-round scenario): round #1,248 settled at 20:02:10, #1,249 opens at 08:00. */
export const DEMO_BETWEEN_ROUNDS_NOW = '2026-11-27T21:12:40Z';

const prev = (n: number) => {
  const r = DEMO_PREVIOUS_ROUNDS.find((x) => x.number === n);
  if (!r) throw new Error(`DEMO round #${n} missing`);
  return r;
};

// ── pool snapshot ───────────────────────────────────────────────────────────────────────────────

export function mockPoolSnapshot(scenario: HomeScenario): PoolSnapshot {
  const active = scenario.round === 'active';
  return {
    serverNow: active ? DEMO_AS_OF : DEMO_BETWEEN_ROUNDS_NOW,
    current: active ? DEMO_CURRENT_ROUND : null,
    last: active ? prev(1247) : DEMO_ROUND_1248_SETTLED,
    // Daily schedule 08:00–20:00 UTC: #1,249 runs on 28 Nov 2026.
    next: { number: 1249, opensAt: '2026-11-28T08:00:00Z', closesAt: '2026-11-28T20:00:00Z' },
    participantsLastHour: active ? 128 : null,
    recentHandles: ['orbit_77', 'mira.sol', 'kestrel', 'lumen.eth', 'atlas_q'],
    isDemo: true,
  };
}

// ── 14-day pool history (closing pool per daily round, 14 – 27 Nov 2026) ─────────────────────────

/** Rounds #1,235 – #1,243 are chart-only DEMO values; #1,244 – #1,248 come from @gp/shared/demo. */
const CHART_ONLY: [number, string][] = [
  [1235, '151320.00'],
  [1236, '158960.00'],
  [1237, '150410.00'],
  [1238, '161870.00'],
  [1239, '169540.00'],
  [1240, '165230.00'],
  [1241, '174880.00'],
  [1242, '179060.00'],
  [1243, '176520.00'],
];

const closeOf = (roundNumber: number) => {
  // #1,248 closes 27 Nov 2026 20:00 UTC; one round per day.
  const d = new Date(Date.UTC(2026, 10, 27, 20, 0, 0));
  d.setUTCDate(d.getUTCDate() - (1248 - roundNumber));
  return d.toISOString().replace('.000Z', 'Z');
};

export function mockPoolHistory(scenario: HomeScenario): PoolHistory {
  const shared = [prev(1244), prev(1245), prev(1246), prev(1247)].map((r) => ({
    roundNumber: r.number,
    closesAt: r.closesAt,
    pool: r.poolBalance ?? '0.00',
    status: r.status === 'cancelled' ? ('cancelled' as const) : ('settled' as const),
    isDemo: true,
  }));
  return {
    points: [
      ...CHART_ONLY.map(([n, pool]) => ({
        roundNumber: n,
        closesAt: closeOf(n),
        pool,
        status: 'settled' as const,
        isDemo: true,
      })),
      ...shared,
      {
        roundNumber: 1248,
        closesAt: DEMO_CURRENT_ROUND.closesAt,
        pool: DEMO_CURRENT_ROUND.poolBalance ?? '0.00',
        status: scenario.round === 'active' ? ('open' as const) : ('settled' as const),
        isDemo: true,
      },
    ],
    minPool: ROUND_THRESHOLDS.minPool,
    isDemo: true,
  };
}

// ── feeds ───────────────────────────────────────────────────────────────────────────────────────

export const mockEntriesFeed = () => DEMO_ENTRIES_FEED;

export const mockMyEntries = (): MyEntriesView => ({
  ...DEMO_MY_ENTRIES,
  odds: {
    anyPrizeApproxPercent: DEMO_ODDS_EXAMPLE.anyPrizeApproxPercent,
    firstPrizePercent: DEMO_ODDS_EXAMPLE.firstPrizePercent,
  },
});

const win = (
  n: number,
  gameSlug: string,
  gameName: string,
  handle: string | null,
  amount: string,
  kind: RecentWin['kind'] = 'game',
): RecentWin => ({
  id: demoId('winner', 100 + n),
  gameSlug,
  gameName,
  handle,
  amount,
  kind,
  isDemo: true,
});

/** Recent wins strip. Global Pool prizes are round #1,247's 1st/2nd/3rd (50/20/10% of 172,950.00). */
export const mockRecentWins = (): RecentWin[] => [
  win(1, 'global-pool', 'Global Pool', 'orbit_77', '86475.00', 'pool'),
  win(2, 'orbit-rush', 'Orbit Rush', 'mira.sol', '1240.00'),
  win(3, 'pool-roulette', 'Pool Roulette', null, '900.00'),
  win(4, 'pool-dice', 'Pool Dice', 'kestrel', '196.00'),
  win(5, 'global-pool', 'Global Pool', 'atlas_q', '34590.00', 'pool'),
  win(6, 'twenty-one', 'Twenty-One', 'lumen.eth', '250.00'),
  win(7, 'double-side', 'Double Side', 'juno88', '196.00'),
  win(8, 'orbit-rush', 'Orbit Rush', 'sable', '3105.00'),
  win(9, 'global-pool', 'Global Pool', 'tidewalker', '17295.00', 'pool'),
  win(10, 'pool-dice', 'Pool Dice', 'pixelfox', '49.50'),
  win(11, 'pool-roulette', 'Pool Roulette', 'northwind', '360.00'),
  win(12, 'skyline', 'Skyline', 'quasar_9', '75.20'),
];

const bet = (
  n: number,
  gameSlug: string,
  gameName: string,
  handle: string | null,
  amount: string,
  detail: string,
  result: LiveBet['result'],
): LiveBet => ({
  id: demoId('feed', 100 + n),
  gameSlug,
  gameName,
  handle,
  amount,
  detail,
  result,
  isDemo: true,
});

const payout = (amount: string, win: boolean): LiveBet['result'] => ({
  type: 'payout',
  amount,
  win,
});

export function mockLiveBets(tab: LiveBetTab, scenario: HomeScenario): LiveBet[] {
  const poolStatus: LiveBet['result'] =
    scenario.round === 'active'
      ? { type: 'status', status: 'awaiting_draw', label: 'Awaiting draw' }
      : { type: 'status', status: 'settled', label: 'Settled' };
  if (tab === 'rounds') {
    return [1247, 1246, 1245, 1244].map((n, i) => {
      const r = prev(n);
      const first = r.winners[0];
      return bet(
        30 + i,
        'global-pool',
        'Global Pool',
        first?.handle ?? null,
        r.poolBalance ?? '0.00',
        `Round ${formatRoundNumber(n)} · ${formatCount(r.entries ?? 0)} entries`,
        r.status === 'cancelled'
          ? { type: 'status', status: 'cancelled', label: 'Cancelled · refunded' }
          : payout(first?.amount ?? '0.00', true),
      );
    });
  }
  if (tab === 'big') {
    return [
      bet(
        20,
        'global-pool',
        'Global Pool',
        'orbit_77',
        '172950.00',
        'Round #1,247 · 1st prize',
        payout('86475.00', true),
      ),
      bet(
        21,
        'global-pool',
        'Global Pool',
        'atlas_q',
        '172950.00',
        'Round #1,247 · 2nd prize',
        payout('34590.00', true),
      ),
      bet(
        22,
        'global-pool',
        'Global Pool',
        'tidewalker',
        '172950.00',
        'Round #1,247 · 3rd prize',
        payout('17295.00', true),
      ),
      bet(23, 'orbit-rush', 'Orbit Rush', 'sable', '150.00', '20.70×', payout('3105.00', true)),
      bet(24, 'orbit-rush', 'Orbit Rush', 'mira.sol', '200.00', '6.20×', payout('1240.00', true)),
      bet(25, 'pool-roulette', 'Pool Roulette', null, '25.00', '36.00×', payout('900.00', true)),
    ];
  }
  return [
    bet(
      1,
      'global-pool',
      'Global Pool',
      'nova.k',
      '350.00',
      'Round #1,248 · 35 entries',
      poolStatus,
    ),
    bet(2, 'orbit-rush', 'Orbit Rush', 'mira.sol', '100.00', '2.41×', payout('241.00', true)),
    bet(3, 'pool-roulette', 'Pool Roulette', null, '25.00', '36.00×', payout('900.00', true)),
    bet(4, 'pool-dice', 'Pool Dice', 'kestrel', '50.00', '2.0000×', payout('0.00', false)),
    bet(5, 'twenty-one', 'Twenty-One', 'lumen.eth', '40.00', '2.50×', payout('100.00', true)),
    bet(6, 'double-side', 'Double Side', 'juno88', '20.00', '1.96×', payout('39.20', true)),
    bet(
      7,
      'global-pool',
      'Global Pool',
      'atlas_q',
      '100.00',
      'Round #1,248 · 10 entries',
      poolStatus,
    ),
    bet(8, 'orbit-rush', 'Orbit Rush', null, '15.00', '1.00×', payout('0.00', false)),
    bet(9, 'pool-dice', 'Pool Dice', 'pixelfox', '10.00', '4.9500×', payout('49.50', true)),
    bet(10, 'pool-roulette', 'Pool Roulette', 'sable', '30.00', '0.00×', payout('0.00', false)),
  ];
}

// ── networks ────────────────────────────────────────────────────────────────────────────────────

/** Network cards from the shared chain config (MVP: only Arbitrum Sepolia is enabled). */
export const mockNetworks = (): NetworkView[] =>
  // Homepage order (Figma H6): BNB, Polygon, Arbitrum, Ethereum, Solana.
  (['bnb', 'polygon', 'arbitrum', 'ethereum', 'solana'] as const)
    .filter((k) => CHAIN_DISPLAY_ORDER.includes(k))
    .map((k) => {
      const c = CHAINS[k];
      return {
        key: k,
        name: c.name,
        standard: c.usdtStandard,
        confirmationsLabel: c.confirmationsLabel,
        withdrawalNetworkFee: c.typicalNetworkFee,
        minDeposit: c.minDeposit,
        enabled: c.enabled,
        statusLabel: c.statusLabel,
        health: c.health,
        healthLabel: c.healthLabel,
        isDemo: true,
      };
    });

// ── fairness ────────────────────────────────────────────────────────────────────────────────────

/**
 * A real, recomputable sample: SHA-256(serverSeed) = serverSeedHash, and
 * HMAC-SHA256(serverSeed, "clientSeed:nonce") → roll 73.21 (see src/lib/fairness/dice.ts).
 */
export const mockVerifierSample = (): VerifierSample => ({
  game: 'Pool Dice',
  gameSlug: 'pool-dice',
  roundId: 'D-88213',
  serverSeed: 'c71d0a58e94f3b26a18d5e07f2c94b6d1e83a5f07c29d4b81e6f3a90d5c27b14',
  serverSeedHash: '9687fca9c8212b9cbd471ca75ad056fb52a4c20105aafba4c91c110077ac4018',
  clientSeed: 'nova-k-7f30fa',
  nonce: 417,
  recordedRoll: '73.21',
  target: { over: '50.50' },
  isDemo: true,
});

/**
 * Latest VRF draw. While round #1,248 is open the latest draw is #1,247 (26 Nov; request id is a chart-only
 * DEMO value); between rounds it is #1,248 from @gp/shared/demo.
 */
export const mockDrawRandomness = (scenario: HomeScenario): DrawRandomnessView => {
  const d = DEMO_ROUND_1248_DRAW;
  const latest = scenario.round === 'none';
  return {
    roundNumber: latest ? 1248 : 1247,
    network: 'Arbitrum One',
    requestIdDisplay: latest ? d.requestIdDisplay : '0x4b7e…a913',
    explorerUrl: null,
    status: 'settled',
    steps: [
      {
        id: 'requested',
        title: 'Randomness requested',
        description: 'Round closed at 20:00:00 UTC; the contract requested randomness.',
        meta: '20:00:04 UTC',
      },
      {
        id: 'awaiting',
        title: 'Awaiting VRF response',
        description: 'Response delivered by the Chainlink oracle network.',
        meta: '37 s',
      },
      {
        id: 'fulfilled',
        title: 'Randomness fulfilled',
        description: 'Random words verified on-chain — they can’t be altered.',
        meta: `20:00:41 UTC · ${d.confirmations} confirmations`,
      },
      {
        id: 'settled',
        title: 'Round settled',
        description: '13 winning entries selected by the contract; prizes credited to Owed.',
        meta: '20:02:10 UTC',
      },
    ],
    isDemo: true,
  };
};

// ── VIP ─────────────────────────────────────────────────────────────────────────────────────────

const VIP_EXTRAS: Record<VipTierView['tier'], [rate: string, perk: string]> = {
  bronze: ['0.1', 'Weekly reward 0.1% of entries'],
  silver: ['0.2', 'Weekly 0.2% · birthday reward'],
  gold: ['0.3', 'Weekly 0.3% · priority withdrawal review'],
  platinum: ['0.4', 'Weekly 0.4% · personal host'],
  diamond: ['0.5', 'Weekly 0.5% · tailored limits on request'],
};

export const mockVipTiers = (): VipTierView[] =>
  DEMO_VIP_TIERS.map((t, i) => ({
    tier: t.tier,
    name: t.name,
    index: i + 1,
    minPoints: t.minPoints,
    weeklyRatePercent: VIP_EXTRAS[t.tier][0],
    perk: VIP_EXTRAS[t.tier][1],
    isDemo: true,
  }));

// ── region ──────────────────────────────────────────────────────────────────────────────────────

export const mockRegion = (scenario: HomeScenario): RegionStatus =>
  scenario.region === 'restricted'
    ? { country: 'US', countryName: 'United States', permitted: false, isDemo: true }
    : { country: 'PT', countryName: 'Portugal', permitted: true, isDemo: true };
