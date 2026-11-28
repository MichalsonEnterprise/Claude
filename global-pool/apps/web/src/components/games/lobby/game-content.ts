/**
 * PUB-04 Game Details copy (design/figma-build/pending/pub-04/data/*.js), adapted to the owner instruction: games use
 * DEMO credits only (no cash value) — the Figma copy shows USDT from the wallet. Payout tables are COMPUTED with the
 * same rule functions the server settles with (@gp/shared/fair), never typed by hand.
 */
import { FAIR_GAMES, dice, percentString } from '@gp/shared/fair';
import { formatAmount, money } from '@gp/shared/money';

import { payoutPreview } from '@/components/games/kit/amount';

export interface GameContent {
  tagline: string;
  heroFacts: string[];
  facts: [label: string, value: string, sub: string][];
  steps: [title: string, body: string][];
  rules: string[];
  payouts?: { headers: [string, string, string, string]; unit: string; rows: string[][]; foot: string };
  pf: { title: string; body: string; steps: string[]; noun: string };
}

const fmt = (v: string) => formatAmount(v);

function diceRows(): string[][] {
  return ['2.00', '25.00', '34.00', '50.50', '75.25', '90.10', '99.00'].map((t) => {
    const params = { target: t, condition: 'over' as const };
    const m = dice.diceMultiplier(params);
    return [`Over ${t}`, `${dice.diceWinChance(params).toFixed(2)}%`, `${m}×`, `${fmt(payoutPreview('10.00', m))} DEMO`];
  });
}

const ROULETTE: [string, string, number, number][] = [
  ['Straight up', '1 number', 35, 1],
  ['Split', '2 adjacent numbers', 17, 2],
  ['Street', '3 numbers in a row', 11, 3],
  ['Corner', '4 numbers in a square', 8, 4],
  ['Six line', '6 numbers (2 rows)', 5, 6],
  ['Dozen', '1–12, 13–24 or 25–36', 2, 12],
  ['Column', '12 numbers in a column', 2, 12],
  ['Red / Black', '18 numbers', 1, 18],
  ['Odd / Even', '18 numbers', 1, 18],
  ['1–18 / 19–36', '18 numbers', 1, 18],
];

function crashRows(): string[][] {
  return ['1.10', '1.50', '2.00', '3.00', '5.00', '10.00', '100.00', '1000.00'].map((m) => [
    `${fmt(m)}×`,
    `${fmt(payoutPreview('10.00', m))} DEMO`,
    `+${fmt(money(payoutPreview('10.00', m)).minus(10).toFixed(2))}`,
    `${money(99).div(money(m)).toDecimalPlaces(3, 1).toFixed(m === '1000.00' ? 3 : 2)}%`,
  ]);
}

const PF_STEPS = (noun: string, what: string) => [
  `Commit — the server seed hash is shown before you ${noun}.`,
  `${noun[0]!.toUpperCase()}${noun.slice(1)} — server seed + client seed + nonce → ${what}.`,
  `Verify — rotate your seed pair to reveal it and recompute any past ${noun} in the verifier.`,
];

export const GAME_CONTENT: Record<string, GameContent> = {
  'pool-dice': {
    tagline:
      'Pick a target between 0.00 and 99.99, choose Roll over or Roll under, and see your exact win chance, multiplier and payout before you roll.',
    heroFacts: ['House edge 1.00%', 'RTP 99.00%', 'Win chance 0.01–98.00%'],
    facts: [
      ['House edge', '1.00%', 'built into every multiplier'],
      ['Return to player', '99.00%', 'theoretical, over the long run'],
      ['Min bet', '0.10', 'DEMO credits per roll'],
      ['Max bet', '1,000.00', 'DEMO credits per roll'],
      ['Win chance', '0.01–98%', 'you choose it with the slider'],
      ['Max multiplier', '9,900.0000×', 'at a 0.01% win chance'],
    ],
    steps: [
      ['Set your bet', 'Enter a stake from 0.10 to 1,000.00 DEMO credits (no cash value).'],
      ['Choose over or under', 'Drag the slider to a target. Roll over 50.50 wins on 50.50–99.99; Roll under wins below your target.'],
      ['Check the odds', 'Win chance, multiplier and payout update live — e.g. 49.50% → 2.0000× → 20.00 DEMO on a 10.00 bet.'],
      ['Roll and verify', 'The roll lands between 0.00 and 99.99. Open the result to check it against your seeds.'],
    ],
    rules: [
      ...FAIR_GAMES['pool-dice'].rules,
      'Payout = stake × multiplier. If the roll misses your target, you lose your stake.',
      'Each roll is fixed by a committed server seed, your client seed and a nonce — check any roll in the verifier.',
    ],
    payouts: {
      headers: ['Roll over', 'Win chance', 'Multiplier', '10.00 bet returns'],
      unit: 'Example for a 10.00 DEMO bet',
      rows: diceRows(),
      foot: 'Roll under works the same way with win chance = target (e.g. under 49.50 → 49.50% → 2.0000×). Multipliers are truncated to 4 decimals, so the 1.00% edge is never undercut.',
    },
    pf: {
      title: 'Provably fair — check any roll',
      body: 'Your roll comes from a server seed (hashed and shown before you bet), your own client seed and a nonce that counts your bets. Change your client seed any time; rotate the server seed to reveal it.',
      steps: PF_STEPS('roll', 'a roll from 0.00 to 99.99'),
      noun: 'roll',
    },
  },
  'double-side': {
    tagline:
      'Call heads or tails and flip. A correct call pays 1.96× your stake — the simplest game on GLOBAL POOL, and every flip is verifiable.',
    heroFacts: ['Pays 1.96×', 'House edge 2.00%', 'Win chance 50.00%'],
    facts: [
      ['Payout', '1.96×', 'your stake on a correct call'],
      ['House edge', '2.00%', 'RTP 98.00%'],
      ['Win chance', '50.00%', 'heads or tails'],
      ['Min bet', '0.10', 'DEMO credits per flip'],
      ['Max bet', '1,000.00', 'DEMO credits per flip'],
      ['Max profit', '960.00', 'DEMO credits on a 1,000.00 bet'],
    ],
    steps: [
      ['Choose a side', 'Pick Heads or Tails. Nothing is pre-selected — you always make the call.'],
      ['Enter your bet', 'Stake 0.10–1,000.00 DEMO credits. The payout shows before you flip: 10.00 → 19.60.'],
      ['Flip', 'The side is fixed by your seeds the moment you confirm. The animation only reveals it.'],
      ['Win or lose', 'Correct call: stake × 1.96. Wrong call: you lose your stake. Verify the flip any time.'],
    ],
    rules: [
      ...FAIR_GAMES['double-side'].rules,
      'There is no edge-landing outcome. Previous flips don’t affect the next.',
      'Each flip is fixed by a committed server seed, your client seed and a nonce.',
    ],
    payouts: {
      headers: ['Your call', 'Win chance', 'Pays', '10.00 bet returns'],
      unit: 'Example for a 10.00 DEMO bet',
      rows: [
        ['Heads — correct', '50.00%', '1.96×', '19.60 DEMO'],
        ['Tails — correct', '50.00%', '1.96×', '19.60 DEMO'],
        ['Wrong call', '50.00%', '0×', '0.00 — stake lost'],
      ],
      foot: 'Expected return is 98.00% of stakes over the long run.',
    },
    pf: {
      title: 'Provably fair — every flip is checkable',
      body: 'The side comes from a hashed server seed you see before flipping, your client seed and the flip’s nonce: heads when the first 4 bytes are below 2³¹.',
      steps: PF_STEPS('flip', 'heads or tails'),
      noun: 'flip',
    },
  },
  'pool-roulette': {
    tagline:
      'European single-zero roulette with 37 pockets. Place inside and outside bets, spin, and check every result against seeds you can verify yourself.',
    heroFacts: ['House edge 2.70%', 'RTP 97.30%', '0.10–1,000.00 per spot'],
    facts: [
      ['House edge', '2.70%', 'single zero — 1 in 37 on every bet'],
      ['Return to player', '97.30%', 'theoretical, over the long run'],
      ['Min bet', '0.10', 'DEMO credits per spot'],
      ['Max bet', '1,000.00', 'DEMO credits per spot'],
      ['Table max', '5,000.00', 'DEMO credits per spin'],
      ['Top payout', '35 : 1', 'straight up on one number'],
    ],
    steps: [
      ['Pick a chip', 'Choose a chip. Your DEMO balance and the table limits stay visible on the bet slip.'],
      ['Place your bets', 'Inside bets on numbers, or outside boxes for Red/Black, Odd/Even, 1–18/19–36, dozens and columns.'],
      ['Spin', 'Confirm the bet slip: total stake, maximum payout and the 2.70% house edge are shown first.'],
      ['Collect and verify', 'Winning bets are paid instantly. Open the result to check the seeds behind the spin.'],
    ],
    rules: [
      ...FAIR_GAMES['pool-roulette'].rules,
      'La Partage and En Prison are not offered. A spin can’t be cancelled once it is requested.',
    ],
    payouts: {
      headers: ['Bet', 'Covers', 'Pays', 'Win chance'],
      unit: 'Pays = winnings to 1, plus your stake back',
      rows: ROULETTE.map(([b, c, pays, n]) => [b, c, `${pays} : 1`, `${percentString(money(n).times(100).div(37))}%`]),
      foot: 'House edge is 2.70% on every bet (1/37). Win chance = numbers covered ÷ 37.',
    },
    pf: {
      title: 'Provably fair — check every spin',
      body: 'Before you bet we show a hash of the server seed. The pocket = floor(f × 37) from that seed, your client seed and the spin’s nonce, so the result is fixed in advance.',
      steps: PF_STEPS('spin', 'the pocket (0–36)'),
      noun: 'spin',
    },
  },
  'orbit-rush': {
    tagline:
      'Watch the multiplier climb from 1.00× and cash out before it crashes. Set an auto cash-out to lock in your target — every crash point is fixed before the round starts.',
    heroFacts: ['House edge 1.00%', 'RTP 99.00%', 'Up to 1,000.00×'],
    facts: [
      ['House edge', '1.00%', 'at every cash-out target'],
      ['Return to player', '99.00%', 'theoretical, over the long run'],
      ['Min bet', '0.10', 'DEMO credits per round'],
      ['Max bet', '1,000.00', 'DEMO credits per round'],
      ['Max multiplier', '1,000.00×', 'cap — open bets cash out there'],
      ['Auto cash-out', '1.01×', 'lowest target you can set'],
    ],
    steps: [
      ['Place a bet', 'Enter your stake (0.10–1,000.00 DEMO credits) while the betting window is open.'],
      ['Set auto cash-out (optional)', 'Type a target such as 2.00×. The server cashes you out the moment the multiplier reaches it.'],
      ['Watch it climb', 'The multiplier rises from 1.00×. Press Cash out at any time to take stake × current multiplier.'],
      ['Crash', 'If the round crashes before you cash out, your stake is lost. The crash point is then revealed and verifiable.'],
    ],
    rules: FAIR_GAMES['orbit-rush'].rules,
    payouts: {
      headers: ['Cash out at', '10.00 bet returns', 'Profit', 'Chance to reach'],
      unit: 'Example for a 10.00 DEMO bet',
      rows: crashRows(),
      foot: 'Chance to reach = 99% ÷ target. Each round is independent — a long run without a high multiplier doesn’t make one more likely.',
    },
    pf: {
      title: 'Provably fair — crash points are fixed in advance',
      body: 'Every crash point comes from a chain of hashed seeds committed before play. After the round the seed is revealed, so anyone can recompute the crash point.',
      steps: [
        'Commit — the round hash is published before betting opens.',
        'Play — the multiplier runs until the committed crash point.',
        'Verify — the seed is revealed after the crash; recompute it in the verifier.',
      ],
      noun: 'round',
    },
  },
  'twenty-one': {
    tagline:
      'Classic blackjack against the dealer with six decks. Blackjack pays 3:2, the dealer stands on soft 17, and with basic strategy the house edge is about 0.50%.',
    heroFacts: ['Blackjack pays 3:2', 'Dealer stands on soft 17', 'House edge ≈ 0.50%'],
    facts: [
      ['House edge', '≈ 0.50%', 'with perfect basic strategy'],
      ['Return to player', '≈ 99.50%', 'depends on your decisions'],
      ['Decks', '6', '312 cards, shuffled for every hand'],
      ['Min bet', '1.00', 'DEMO credits per hand'],
      ['Max bet', '1,000.00', 'DEMO credits per hand'],
      ['Blackjack pays', '3 : 2', 'dealer stands on soft 17'],
    ],
    steps: [
      ['Place your bet', 'Choose chips from 1.00 to 1,000.00 DEMO credits and press Deal.'],
      ['Read the hands', 'You get two cards face up. The dealer shows one card and keeps the hole card face down.'],
      ['Make your move', 'Hit, Stand, Double on any first two cards, or Split a pair. Insurance is offered when the dealer shows an Ace.'],
      ['Dealer plays, you get paid', 'The dealer draws to 17 and stands on soft 17. Wins pay 1:1, blackjack pays 3:2, ties push.'],
    ],
    rules: FAIR_GAMES['twenty-one'].rules,
    payouts: {
      headers: ['Outcome', 'When', 'Pays', '10.00 bet returns'],
      unit: 'Example for a 10.00 DEMO bet',
      rows: [
        ['Blackjack', 'Ace + a 10-value card as your first two cards', '3 : 2', '25.00 DEMO'],
        ['Win', 'Your total beats the dealer’s, or the dealer busts', '1 : 1', '20.00 DEMO'],
        ['Double down win', 'You doubled to 20.00 and won', '1 : 1', '40.00 DEMO'],
        ['Push', 'Same total as the dealer', 'Stake back', '10.00 DEMO'],
        ['Insurance', 'Dealer has blackjack (insurance 5.00)', '2 : 1', '15.00 DEMO'],
        ['Lose / bust', 'Over 21, or the dealer’s total is higher', '—', '0.00 DEMO'],
      ],
      foot: 'House edge ≈ 0.50% assumes perfect basic strategy; your actual return depends on your decisions.',
    },
    pf: {
      title: 'Provably fair — every shuffle is checkable',
      body: 'Each hand’s six-deck shuffle comes from a hashed server seed shown before you deal, your client seed and a nonce. After rotation, reveal the seed to re-create the exact card order.',
      steps: PF_STEPS('deal', 'the 312-card order'),
      noun: 'hand',
    },
  },
};

/** Generic details for engine games without designed copy, and for catalogue titles without an engine. */
export function contentFor(slug: string, mechanic: string, edgeLabel: string): GameContent {
  const known = GAME_CONTENT[slug];
  if (known) return known;
  const info = FAIR_GAMES[slug as keyof typeof FAIR_GAMES];
  if (info) {
    return {
      tagline: `${mechanic}. Provably fair, ${info.houseEdgePercent}% house edge, DEMO credits only.`,
      heroFacts: [`House edge ${info.houseEdgePercent}%`, `RTP ${info.rtpPercent}%`, `${fmt(info.minBet)}–${fmt(info.maxBet)} per bet`],
      facts: [
        ['House edge', `${info.houseEdgePercent}%`, 'published, identical for every player'],
        ['Return to player', `${info.rtpPercent}%`, 'theoretical, over the long run'],
        ['Min bet', fmt(info.minBet), 'DEMO credits per bet'],
        ['Max bet', fmt(info.maxBet), 'DEMO credits per bet'],
        ...(info.maxPayout ? [['Max payout', fmt(info.maxPayout), 'DEMO credits per bet'] as [string, string, string]] : []),
        ['Rules version', info.rulesVersion, 'stored on every bet'],
      ],
      steps: [
        ['Set your bet', `Enter a stake from ${fmt(info.minBet)} to ${fmt(info.maxBet)} DEMO credits (no cash value).`],
        ['Make your choice', 'The odds and payout are shown before you confirm.'],
        ['Play', 'The result is fixed by your seeds when you confirm — the animation only reveals it.'],
        ['Verify', 'Rotate your seed pair to reveal the server seed and recompute any bet.'],
      ],
      rules: info.rules,
      pf: {
        title: 'Provably fair',
        body: 'Every result comes from a hashed server seed shown before you bet, your client seed and a nonce (HMAC-SHA256).',
        steps: PF_STEPS('bet', 'the result'),
        noun: 'bet',
      },
    };
  }
  return {
    tagline: `${mechanic}. ${edgeLabel}.`,
    heroFacts: [edgeLabel],
    facts: [],
    steps: [],
    rules: [
      'This title is not playable in this build — there is no game engine for it yet.',
      'When it launches, its house edge or RTP, limits and rules will be published here before you can play.',
    ],
    pf: {
      title: 'Fairness',
      body: 'Every GLOBAL POOL game publishes its odds and uses verifiable randomness. This title will follow the same rules when it launches.',
      steps: [],
      noun: 'bet',
    },
  };
}
