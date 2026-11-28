/**
 * Game catalogue (original names) + promotions + VIP tiers — demo-data.md → "Game catalogue", "Promotions".
 * Player counts beyond demo-data.md come from the Figma build notes; null = no value in the designs.
 * Games run as NON-MONETARY simulations until separately approved (mode: 'simulation').
 */
import type { GameCategory, VipTier } from '../enums';
import type { DemoFlag, Game, Promotion } from '../types';
import { demoId } from './ids';
import { demo } from './meta';

type Row = [
  slug: string,
  name: string,
  category: GameCategory,
  mechanic: string,
  houseEdgePercent: string | null,
  edgeLabel: string,
  icon: string,
  players: number | null,
  details?: string[],
];

const edge = (pct: string) => `${pct}% house edge`;

const ROWS: Row[] = [
  [
    'global-pool',
    'Global Pool',
    'jackpot',
    'Progressive pool rounds, Chainlink VRF',
    null,
    '0.05 USDT fee / entry',
    'pool',
    3412,
    [
      'Entry 10.00 USDT + platform fee 0.05 USDT per entry',
      'Prizes: 1st 50% · 2nd 20% · 3rd 10% · 10 × runner-up 2%',
    ],
  ],
  [
    'orbit-rush',
    'Orbit Rush',
    'originals',
    'Crash multiplier',
    '1.00',
    edge('1.00'),
    'crash',
    1062,
    ['Max multiplier cap 1,000.00×', 'Min 0.10 / max 1,000 USDT per bet'],
  ],
  [
    'orbit-rush-duel',
    'Orbit Rush Duel',
    'originals',
    'Two-line crash variant',
    '1.00',
    edge('1.00'),
    'crash-duel',
    null,
  ],
  [
    'vault-sweeper',
    'Vault Sweeper',
    'originals',
    'Mines grid 5×5',
    '1.00',
    edge('1.00'),
    'mines',
    146,
  ],
  [
    'skyline',
    'Skyline',
    'originals',
    'Limbo target multiplier',
    '1.00',
    edge('1.00'),
    'limbo',
    206,
  ],
  ['pinfall', 'Pinfall', 'originals', 'Plinko 8–16 rows', '1.00', edge('1.00'), 'plinko', 100],
  [
    'fortune-ring',
    'Fortune Ring',
    'originals',
    'Wheel — low / medium / high risk',
    '1.00',
    edge('1.00'),
    'wheel',
    34,
  ],
  [
    'pool-dice',
    'Pool Dice',
    'originals',
    'Dice roll over / under (0–99.99)',
    '1.00',
    edge('1.00'),
    'dice',
    66,
    ['Example: roll over 50.50 → win chance 49.50%, payout 2.0000×'],
  ],
  [
    'double-side',
    'Double Side',
    'originals',
    'Coinflip',
    '2.00',
    '2.00% house edge (1.96×)',
    'coin',
    58,
    ['Payout 1.96×'],
  ],
  ['high-card', 'High Card', 'originals', 'Hi-lo card', '1.00', edge('1.00'), 'hilo', null],
  ['ascend', 'Ascend', 'originals', 'Tower climb', '1.00', edge('1.00'), 'tower', null],
  ['pool-keno', 'Pool Keno', 'originals', 'Keno 10/40', '1.00', edge('1.00'), 'keno', null],
  [
    'pool-roulette',
    'Pool Roulette',
    'table',
    'European roulette (single zero)',
    '2.70',
    edge('2.70'),
    'roulette',
    518,
    ['Straight up pays 35:1', 'Min 0.10 / max 1,000 USDT per spot · table max 5,000'],
  ],
  [
    'twenty-one',
    'Twenty-One',
    'table',
    'Blackjack',
    '0.50',
    '≈0.50% house edge (basic strategy)',
    'cards',
    147,
    ['6 decks · dealer stands on soft 17 · blackjack pays 3:2'],
  ],
  [
    'baccarat-lounge',
    'Baccarat Lounge',
    'table',
    'Baccarat',
    '1.06',
    '1.06% house edge (banker)',
    'baccarat',
    96,
  ],
  ['sic-bo-triad', 'Sic Bo Triad', 'table', 'Sic bo', '2.78', edge('2.78'), 'sicbo', 41],
  [
    'dragon-and-phoenix',
    'Dragon & Phoenix',
    'table',
    'Two-card duel',
    '3.73',
    edge('3.73'),
    'duel',
    38,
  ],
  ...(
    [
      ['neon-koi', 'Neon Koi'],
      ['atlas-vault', 'Atlas Vault'],
      ['midnight-orchard', 'Midnight Orchard'],
      ['comet-cascade', 'Comet Cascade'],
      ['desert-relics', 'Desert Relics'],
      ['frost-wolves', 'Frost Wolves'],
      ['lucky-lanterns', 'Lucky Lanterns'],
      ['robo-heist', 'Robo Heist'],
    ] as const
  ).map(([slug, name]): Row => [
    slug,
    name,
    'slots',
    '5×3 / cascade slot — GP Studios original',
    null,
    'RTP 96.0–96.7%',
    'slots',
    null,
  ]),
  [
    'live-pool-roulette',
    'Live Pool Roulette',
    'live',
    'Live roulette (illustrated, no real people)',
    '2.70',
    edge('2.70'),
    'live',
    412,
  ],
  [
    'speed-twenty-one',
    'Speed Twenty-One',
    'live',
    'Live blackjack (illustrated)',
    '0.50',
    '≈0.50% house edge (basic strategy)',
    'live',
    175,
  ],
  [
    'baccarat-lounge-live',
    'Baccarat Lounge Live',
    'live',
    'Live baccarat (illustrated)',
    '1.06',
    '1.06% house edge (banker)',
    'live',
    null,
  ],
  [
    'mega-ring-show',
    'Mega Ring Show',
    'live',
    'Live wheel show (illustrated)',
    null,
    'Disclosed at the table',
    'live',
    512,
  ],
  [
    'keno-express-20-80',
    'Keno Express 20/80',
    'draws',
    'Lottery-style draw at scheduled times',
    null,
    'Disclosed per draw',
    'lottery',
    null,
  ],
  [
    'daily-draw-6-45',
    'Daily Draw 6/45',
    'draws',
    'Lottery-style draw at scheduled times',
    null,
    'Disclosed per draw',
    'lottery',
    null,
  ],
  [
    'bingo-75-night',
    'Bingo 75 Night',
    'bingo',
    'Bingo room (75-ball)',
    null,
    'Disclosed in the room',
    'bingo',
    null,
  ],
  [
    'bingo-90-classic',
    'Bingo 90 Classic',
    'bingo',
    'Bingo room (90-ball)',
    null,
    'Disclosed in the room',
    'bingo',
    null,
  ],
];

export const DEMO_GAMES: (Game & DemoFlag)[] = ROWS.map(
  ([slug, name, category, mechanic, houseEdgePercent, edgeLabel, icon, players, details = []], i) =>
    demo({
      id: demoId('game', i + 1),
      slug,
      name,
      category,
      mechanic,
      houseEdgePercent,
      edgeLabel,
      icon,
      players,
      mode: category === 'jackpot' ? ('pool' as const) : ('simulation' as const),
      details,
    }),
);

export const demoGame = (slug: string): (Game & DemoFlag) | undefined =>
  DEMO_GAMES.find((g) => g.slug === slug);

// ── promotions ────────────────────────────────────────────────────────────────────────────────

export const DEMO_PROMOTIONS: (Promotion & DemoFlag)[] = [
  demo({
    id: demoId('promotion', 1),
    type: 'welcome' as const,
    title: 'Welcome offer',
    summary: '100% match on your first deposit, up to 500 USDT',
    keyTerms: [
      '30× wagering on bonus funds',
      '14 days to complete',
      'Min deposit 20 USDT',
      'Max bet with bonus funds 5.00 USDT',
      'Contribution: Originals / slots 100%, table games 10%, Global Pool 0%',
    ],
    termsApply: true as const,
    startsAt: null,
    endsAt: null,
  }),
  demo({
    id: demoId('promotion', 2),
    type: 'daily_rewards' as const,
    title: 'Daily rewards',
    summary: '7-day streak calendar in bonus funds (day 1 0.50 … day 7 5.00 USDT)',
    keyTerms: ['Resets daily at 00:00 UTC', 'Paid in bonus funds', 'Streak total 13.75 USDT'],
    termsApply: true as const,
    startsAt: null,
    endsAt: null,
  }),
  demo({
    id: demoId('promotion', 3),
    type: 'missions' as const,
    title: 'Missions',
    summary: 'Play 50 rounds of Orbit Rush this week → 2.00 USDT',
    keyTerms: ['Weekly missions reset Monday 00:00 UTC', 'Progress shown per mission'],
    termsApply: true as const,
    startsAt: '2026-11-23T00:00:00Z',
    endsAt: '2026-11-29T23:59:59Z',
  }),
  demo({
    id: demoId('promotion', 4),
    type: 'rakeback' as const,
    title: 'Rakeback',
    summary: '5% of house edge returned, claimable anytime',
    keyTerms: ['Claimable now: 3.42 USDT', 'Calculated from house edge, not from losses'],
    termsApply: true as const,
    startsAt: null,
    endsAt: null,
  }),
  demo({
    id: demoId('promotion', 5),
    type: 'cashback' as const,
    title: 'Weekly cashback',
    summary: '10% of weekly net losses, paid Mondays 10:00 UTC',
    keyTerms: ['Next payout Mon 30 Nov 2026, 10:00 UTC', 'Last payout: 12.80 USDT'],
    termsApply: true as const,
    startsAt: null,
    endsAt: null,
  }),
  demo({
    id: demoId('promotion', 6),
    type: 'tournament' as const,
    title: 'Orbit Rush Sprint',
    summary: 'Weekly tournament — prize pool 2,500.00 USDT, leaderboard top 20',
    keyTerms: [
      '1 point per 1.00 USDT wagered',
      'Prizes: 1st 1,000.00 · 2nd 500.00 · 3rd 250.00 · 4th–10th 75.00 · 11th–20th 22.50',
      'Ends Sun 29 Nov 2026, 23:59 UTC',
    ],
    termsApply: true as const,
    startsAt: '2026-11-23T00:00:00Z',
    endsAt: '2026-11-29T23:59:00Z',
  }),
  demo({
    id: demoId('promotion', 7),
    type: 'vip' as const,
    title: 'VIP Club',
    summary: '29 levels across 5 tiers, with level-up rewards',
    keyTerms: [
      'Status points are a rolling 365-day total',
      'Level-up rewards paid to Available, no wagering',
    ],
    termsApply: true as const,
    startsAt: null,
    endsAt: null,
  }),
];

/** Daily streak amounts in bonus funds (day 1 … day 7, total 13.75). */
export const DEMO_DAILY_STREAK: readonly string[] = [
  '0.50',
  '0.75',
  '1.00',
  '1.50',
  '2.00',
  '3.00',
  '5.00',
];

/** Orbit Rush Sprint prize table (Σ = 2,500.00). */
export const DEMO_TOURNAMENT_PRIZES = demo({
  name: 'Orbit Rush Sprint',
  prizePool: '2500.00',
  places: [
    { from: 1, to: 1, amountEach: '1000.00' },
    { from: 2, to: 2, amountEach: '500.00' },
    { from: 3, to: 3, amountEach: '250.00' },
    { from: 4, to: 10, amountEach: '75.00' },
    { from: 11, to: 20, amountEach: '22.50' },
  ],
});

/** VIP tiers & level ranges (status-point thresholds). */
export const DEMO_VIP_TIERS: ({
  tier: VipTier;
  name: string;
  levels: [number, number];
  minPoints: number;
} & DemoFlag)[] = [
  demo({
    tier: 'bronze' as const,
    name: 'Bronze',
    levels: [1, 5] as [number, number],
    minPoints: 0,
  }),
  demo({
    tier: 'silver' as const,
    name: 'Silver',
    levels: [6, 11] as [number, number],
    minPoints: 2500,
  }),
  demo({
    tier: 'gold' as const,
    name: 'Gold',
    levels: [12, 17] as [number, number],
    minPoints: 8000,
  }),
  demo({
    tier: 'platinum' as const,
    name: 'Platinum',
    levels: [18, 23] as [number, number],
    minPoints: 20000,
  }),
  demo({
    tier: 'diamond' as const,
    name: 'Diamond',
    levels: [24, 29] as [number, number],
    minPoints: 50000,
  }),
];
