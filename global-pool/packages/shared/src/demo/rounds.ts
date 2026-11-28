/**
 * Global Pool DEMO rounds (demo-data.md → "Global Pool — current round"). Rounds run daily 08:00–20:00 UTC
 * (schedule from the Figma build notes: #1,245 closed 24 Nov 2026, 20:00 UTC).
 */
import { ENTRY_PRICE, PLATFORM_FEE_PER_ENTRY } from '../fees';
import {
  ROUND_THRESHOLDS,
  feesForEntries,
  oddsDisclosure,
  poolForEntries,
  prizeBreakdown,
} from '../pool';
import type {
  DemoFlag,
  EntryPurchase,
  FeedEntry,
  OddsExample,
  Round,
  RoundDraw,
  RoundWinner,
  Winner,
} from '../types';
import { demoId } from './ids';
import { demo } from './meta';

const thresholds = (met: boolean | null) => ({
  minParticipants: ROUND_THRESHOLDS.minParticipants,
  minPool: ROUND_THRESHOLDS.minPool,
  met,
});

/** Current round #1,248 — Open, closes 27 Nov 2026 20:00 UTC (real close time; derive countdowns from it). */
export const DEMO_CURRENT_ROUND: Round & DemoFlag = demo({
  id: demoId('round', 1248),
  number: 1248,
  status: 'open' as const,
  openedAt: '2026-11-27T08:00:00Z',
  closesAt: '2026-11-27T20:00:00Z',
  entryPrice: ENTRY_PRICE,
  platformFeePerEntry: PLATFORM_FEE_PER_ENTRY,
  participants: 3412,
  entries: 18640,
  poolBalance: '186400.00',
  platformFees: '932.00',
  thresholds: thresholds(true),
  prizeDistribution: prizeBreakdown('186400.00').tiers,
  draw: null,
  winners: [],
  cancellation: null,
});

/** VRF draw for round #1,248 (post-close scenario from demo-data.md). */
export const DEMO_ROUND_1248_DRAW: RoundDraw & DemoFlag = demo({
  provider: 'chainlink_vrf_v2_5' as const,
  network: 'arbitrum' as const,
  requestId: '0x9f2c…e71a',
  requestIdDisplay: '0x9f2c…e71a',
  requestedAt: '2026-11-27T20:00:04Z',
  fulfilledAt: '2026-11-27T20:00:41Z',
  confirmations: 3,
  settledAt: '2026-11-27T20:02:10Z',
});

const p = prizeBreakdown('186400.00').tiers;
const amountFor = (tier: RoundWinner['tier']) => p.find((t) => t.tier === tier)!.amountEach;
const RUNNER_UPS = [
  ['lumen.eth', 'E-1248-11502'],
  ['atlas_q', null],
  ['juno88', null],
  ['sable', null],
  ['pixelfox', null],
  ['tidewalker', null],
  ['quasar_9', null],
  ['velvet.io', null],
  ['ember_ray', null],
  ['northwind', null],
] as const;

/**
 * Round #1,248 after settlement (results scenario from the Figma build notes). Use only for result/verify screens;
 * the "current" state is DEMO_CURRENT_ROUND.
 */
export const DEMO_ROUND_1248_SETTLED: Round & DemoFlag = demo({
  ...DEMO_CURRENT_ROUND,
  status: 'settled' as const,
  draw: DEMO_ROUND_1248_DRAW,
  winners: [
    {
      place: 1,
      tier: 'first' as const,
      handle: 'orbit_77',
      entryId: 'E-1248-07734',
      amount: amountFor('first'),
    },
    {
      place: 2,
      tier: 'second' as const,
      handle: 'mira.sol',
      entryId: 'E-1248-04417',
      amount: amountFor('second'),
    },
    {
      place: 3,
      tier: 'third' as const,
      handle: 'kestrel',
      entryId: 'E-1248-16033',
      amount: amountFor('third'),
    },
    ...RUNNER_UPS.map(([handle, entryId], i) => ({
      place: 4 + i,
      tier: 'runner_up' as const,
      handle,
      entryId,
      amount: amountFor('runner_up'),
    })),
  ],
});

function settledRound(
  n: number,
  day: string,
  pool: string,
  firstHandle: string,
  extra: RoundWinner[] = [],
) {
  const entries = Number(BigInt(pool.split('.')[0]!) / 10n);
  const prizes = prizeBreakdown(pool).tiers;
  return demo({
    id: demoId('round', n),
    number: n,
    status: 'settled' as const,
    openedAt: `${day}T08:00:00Z`,
    closesAt: `${day}T20:00:00Z`,
    entryPrice: ENTRY_PRICE,
    platformFeePerEntry: PLATFORM_FEE_PER_ENTRY,
    participants: null,
    entries,
    poolBalance: pool,
    platformFees: feesForEntries(entries),
    thresholds: thresholds(true),
    prizeDistribution: prizes,
    draw: null,
    winners: [
      {
        place: 1,
        tier: 'first' as const,
        handle: firstHandle,
        entryId: null,
        amount: prizes[0]!.amountEach,
      },
      ...extra,
    ],
    cancellation: null,
  });
}

/** Previous rounds #1,247 … #1,244 (newest first). #1,245 was cancelled (threshold not met → refunds owed). */
export const DEMO_PREVIOUS_ROUNDS: (Round & DemoFlag)[] = [
  settledRound(1247, '2026-11-26', '172950.00', 'orbit_77'),
  settledRound(1246, '2026-11-25', '168420.00', 'mira.sol'),
  demo({
    id: demoId('round', 1245),
    number: 1245,
    status: 'cancelled' as const,
    openedAt: '2026-11-24T08:00:00Z',
    closesAt: '2026-11-24T20:00:00Z',
    entryPrice: ENTRY_PRICE,
    platformFeePerEntry: PLATFORM_FEE_PER_ENTRY,
    // participants / pool from the Figma build notes (both below the thresholds)
    participants: 412,
    entries: 4120,
    poolBalance: poolForEntries(4120),
    platformFees: feesForEntries(4120),
    thresholds: thresholds(false),
    prizeDistribution: null,
    draw: null,
    winners: [],
    cancellation: { reason: 'threshold_not_met' as const, refundsTo: 'owed' as const },
  }),
  settledRound(1244, '2026-11-23', '181030.00', 'kestrel', [
    // @nova.k runner-up in #1,244: 2% of 181,030.00
    { place: 4, tier: 'runner_up', handle: 'nova.k', entryId: null, amount: '3620.60' },
  ]),
];

const firstEntry = 981;
const lastEntry = 1015;
const entryId = (n: number) => `E-1248-${String(n).padStart(5, '0')}`;

/** @nova.k's 35 entries in round #1,248: 350.00 + 1.75 fees = 351.75 USDT. */
export const DEMO_MY_ENTRIES: EntryPurchase & DemoFlag = demo({
  roundId: DEMO_CURRENT_ROUND.id,
  roundNumber: 1248,
  entries: 35,
  firstEntryId: entryId(firstEntry),
  lastEntryId: entryId(lastEntry),
  entryAmount: '350.00',
  platformFee: '1.75',
  networkFee: '0.00',
  total: '351.75',
  txHashDisplay: '0x3a7c…9e02',
  // time from the Figma build notes
  purchasedAt: '2026-11-27T14:06:00Z',
  status: 'active' as const,
});

/** E-1248-00981 … E-1248-01015 */
export const DEMO_MY_ENTRY_IDS: readonly string[] = Array.from(
  { length: lastEntry - firstEntry + 1 },
  (_, i) => entryId(firstEntry + i),
);

/** Odds disclosure example (35 of 18,640 entries, 13 prizes). */
export const DEMO_ODDS_EXAMPLE: OddsExample & DemoFlag = (() => {
  const o = oddsDisclosure(35, 18640);
  return demo({
    myEntries: 35,
    totalEntries: 18640,
    prizes: o.prizes,
    anyPrizeApproxPercent: '2.44',
    anyPrizeExactPercent: o.anyPrizePercent,
    firstPrizePercent: '0.188',
  });
})();

/** "Latest entries" feed rows (rows from the Figma build notes; timestamps illustrative). null handle = Hidden. */
export const DEMO_ENTRIES_FEED: (FeedEntry & DemoFlag)[] = (
  [
    ['juno88', 5, '2026-11-27T18:44:12Z'],
    ['atlas_q', 2, '2026-11-27T18:43:58Z'],
    [null, 10, '2026-11-27T18:43:31Z'],
    ['pixelfox', 1, '2026-11-27T18:43:05Z'],
    ['tidewalker', 20, '2026-11-27T18:42:47Z'],
  ] as const
).map(([handle, entries, at], i) =>
  demo({
    id: demoId('feed', i + 1),
    handle,
    roundNumber: 1248,
    entries,
    amount: poolForEntries(entries),
    at,
  }),
);

/** Recent Global Pool winners (from the previous rounds). */
export const DEMO_RECENT_WINNERS: (Winner & DemoFlag)[] = [
  demo({
    id: demoId('winner', 1),
    handle: 'orbit_77',
    roundNumber: 1247,
    tier: 'first' as const,
    label: '1st prize',
    amount: '86475.00',
    settledAt: null,
  }),
  demo({
    id: demoId('winner', 2),
    handle: 'mira.sol',
    roundNumber: 1246,
    tier: 'first' as const,
    label: '1st prize',
    amount: '84210.00',
    settledAt: null,
  }),
  demo({
    id: demoId('winner', 3),
    handle: 'kestrel',
    roundNumber: 1244,
    tier: 'first' as const,
    label: '1st prize',
    amount: '90515.00',
    settledAt: null,
  }),
  demo({
    id: demoId('winner', 4),
    handle: 'nova.k',
    roundNumber: 1244,
    tier: 'runner_up' as const,
    label: 'Runner-up',
    amount: '3620.60',
    settledAt: null,
  }),
];

/** Fictional handles used in feeds / winners (demo-data.md). */
export const DEMO_HANDLES: readonly string[] = [
  'orbit_77',
  'mira.sol',
  'kestrel',
  'lumen.eth',
  'atlas_q',
  'nova.k',
  'juno88',
  'sable',
  'pixelfox',
  'tidewalker',
  'quasar_9',
  'velvet.io',
  'ember_ray',
  'northwind',
  'cobalt.k',
  'zephyr21',
  'halcyon',
  'rook.eth',
  'lyra_v',
  'drift.sol',
];
