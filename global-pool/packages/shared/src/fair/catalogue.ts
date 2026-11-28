/**
 * Published rules per playable game (identical for every player — there are no per-user odds, no "hot/cold"
 * adjustments and no code path that can choose, edit, re-roll or bias an outcome). Amounts are DEMO credits.
 */
export type FairGameKind =
  | 'dice'
  | 'coinflip'
  | 'roulette'
  | 'limbo'
  | 'wheel'
  | 'keno'
  | 'plinko'
  | 'mines'
  | 'hilo'
  | 'blackjack'
  | 'crash';

/** instant = settles in the bet request · stateful = a round the player steps through · round = shared crash rounds */
export type FairGameMode = 'instant' | 'stateful' | 'round';

export interface FairGameInfo {
  slug: string;
  name: string;
  kind: FairGameKind;
  mode: FairGameMode;
  /** Published house edge in percent ('1.00'); Twenty-One is ≈ with basic strategy. */
  houseEdgePercent: string;
  rtpPercent: string;
  minBet: string;
  maxBet: string;
  /** Roulette: total stake per spin across the table. */
  tableMax?: string;
  /** Mines / hi-lo: maximum payout per bet. */
  maxPayout?: string;
  rulesVersion: string;
  /** Plain-language rule lines (published with the game). */
  rules: string[];
}

const g = (info: FairGameInfo) => info;

export const FAIR_GAMES = {
  'pool-dice': g({
    slug: 'pool-dice',
    name: 'Pool Dice',
    kind: 'dice',
    mode: 'instant',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'pool-dice/1',
    rules: [
      'Each roll is a number from 0.00 to 99.99; every value is equally likely.',
      'Roll over T wins on T…99.99 (win chance 100 − T %); roll under T wins on 0.00…T − 0.01 (win chance T %).',
      'Multiplier = 99 ÷ win chance, truncated to 4 decimals. Win chance 0.01 % – 98.00 %.',
    ],
  }),
  'double-side': g({
    slug: 'double-side',
    name: 'Double Side',
    kind: 'coinflip',
    mode: 'instant',
    houseEdgePercent: '2.00',
    rtpPercent: '98.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'double-side/1',
    rules: ['Heads or tails, 50.00 % each. A correct call pays 1.96× (house edge 2.00 %).'],
  }),
  'pool-roulette': g({
    slug: 'pool-roulette',
    name: 'Pool Roulette',
    kind: 'roulette',
    mode: 'instant',
    houseEdgePercent: '2.70',
    rtpPercent: '97.30',
    minBet: '0.10',
    maxBet: '1000.00',
    tableMax: '5000.00',
    rulesVersion: 'pool-roulette/1',
    rules: [
      'European wheel: 0–36, single zero. Straight 35:1, split 17:1, street 11:1, corner 8:1, six line 5:1, dozen / column 2:1, even money 1:1.',
      'Outside bets lose on 0. Limits 0.10–1,000.00 per spot, 5,000.00 per spin.',
    ],
  }),
  skyline: g({
    slug: 'skyline',
    name: 'Skyline',
    kind: 'limbo',
    mode: 'instant',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'skyline/1',
    rules: ['Pick a target from 1.01× to 1,000.00×. Win chance = 99 ÷ target %. A win pays bet × target.'],
  }),
  'fortune-ring': g({
    slug: 'fortune-ring',
    name: 'Fortune Ring',
    kind: 'wheel',
    mode: 'instant',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'fortune-ring/1',
    rules: ['Risk low / medium / high, 10–50 segments, every segment equally likely; every ring returns 99.00 %.'],
  }),
  'pool-keno': g({
    slug: 'pool-keno',
    name: 'Pool Keno',
    kind: 'keno',
    mode: 'instant',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'pool-keno/1',
    rules: ['Pick 1–10 numbers from 1–40; 10 are drawn. The payout table for your picks and risk is shown before you bet (exact RTP 98.65–99.00 % per table).'],
  }),
  pinfall: g({
    slug: 'pinfall',
    name: 'Pinfall',
    kind: 'plinko',
    mode: 'instant',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'pinfall/1',
    rules: ['8–16 rows, risk low / medium / high; each peg bounces left or right with equal chance (exact RTP per board 98.98–99.02 %).'],
  }),
  'vault-sweeper': g({
    slug: 'vault-sweeper',
    name: 'Vault Sweeper',
    kind: 'mines',
    mode: 'stateful',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    maxPayout: '100000.00',
    rulesVersion: 'vault-sweeper/1',
    rules: ['1–24 mines on a 5×5 board. Multiplier = 0.99 ÷ chance that all your picks are gems (2 decimals). Max payout 100,000.00.'],
  }),
  'high-card': g({
    slug: 'high-card',
    name: 'High Card',
    kind: 'hilo',
    mode: 'stateful',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    maxPayout: '100000.00',
    rulesVersion: 'high-card/1',
    rules: ['Ace low, King high, fresh 52-card deck each draw. Each right call multiplies the run by 0.99 ÷ chance (1.00 % edge per call). Skips are free.'],
  }),
  'twenty-one': g({
    slug: 'twenty-one',
    name: 'Twenty-One',
    kind: 'blackjack',
    mode: 'stateful',
    houseEdgePercent: '0.50',
    rtpPercent: '99.50',
    minBet: '1.00',
    maxBet: '1000.00',
    rulesVersion: 'twenty-one/1',
    rules: [
      '6 decks shuffled from your seeds for every hand. Dealer stands on soft 17. Blackjack pays 3:2.',
      'Double on any first two cards (also after a split). Split a pair once; split Aces get one card each.',
      'Dealer peeks with an Ace or 10 showing. Insurance costs half the bet and pays 2:1. No surrender.',
      'House edge ≈ 0.50 % with perfect basic strategy; your return depends on your decisions.',
    ],
  }),
  'orbit-rush': g({
    slug: 'orbit-rush',
    name: 'Orbit Rush',
    kind: 'crash',
    mode: 'round',
    houseEdgePercent: '1.00',
    rtpPercent: '99.00',
    minBet: '0.10',
    maxBet: '1000.00',
    rulesVersion: 'orbit-rush/1',
    rules: [
      'One crash point per round, fixed by a hash-chain seed committed before betting opens.',
      'About 1 in 100 rounds crashes instantly at 1.00×. Multipliers are capped at 1,000.00×; open bets cash out there.',
      'Auto cash-out (1.01×–1,000.00×) runs on the server, so it still works if your connection drops.',
    ],
  }),
} as const satisfies Record<string, FairGameInfo>;

export type FairGameSlug = keyof typeof FAIR_GAMES;
export const FAIR_GAME_SLUGS = Object.keys(FAIR_GAMES) as FairGameSlug[];
export const INSTANT_GAME_SLUGS = FAIR_GAME_SLUGS.filter((s) => FAIR_GAMES[s].mode === 'instant');

export function isFairGameSlug(slug: string): slug is FairGameSlug {
  return Object.prototype.hasOwnProperty.call(FAIR_GAMES, slug);
}

export function fairGame(slug: string): FairGameInfo | null {
  return isFairGameSlug(slug) ? FAIR_GAMES[slug] : null;
}
