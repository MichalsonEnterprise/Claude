/**
 * Games kit registry: which games have a play screen in this build, routes, motion tokens and fixed copy.
 * NON-MONETARY SIMULATION — every game here is played with DEMO credits (no cash value).
 */
import { DEMO_CREDITS_LABEL, fairGame, type FairGameInfo } from '@gp/shared/fair';
import { tokens } from '@gp/tokens';

/** Label every surface shows next to DEMO credit amounts. */
export const CREDITS_LABEL = DEMO_CREDITS_LABEL;
/** Short unit shown after amounts ("10.00 DEMO"). */
export const CREDITS_UNIT = 'DEMO';

/**
 * Engine games that have a play screen at `/games/<slug>` (static route). Other engine games render the details page
 * (PUB-04) at `/games/<slug>` with an honest "Play screen coming soon"; non-engine catalogue titles are "Coming soon".
 * Game agents: add your slug here when your play page lands (additive).
 */
export const PLAY_SCREENS: ReadonlySet<string> = new Set([
  'pool-dice',
  'double-side',
  'pool-roulette',
  'orbit-rush',
  'twenty-one',
]);

export const GAMES_ROUTES = {
  lobby: '/games',
  /** Play screen (static route per game) — falls back to the details page when the game has none. */
  play: (slug: string) => (slug === 'global-pool' ? '/pool' : `/games/${slug}`),
  /** Details page (PUB-04) — reachable for every game, also those with a play screen. */
  details: (slug: string) => `/games/${slug}/details`,
  provablyFair: '/provably-fair',
  responsibleGaming: '/responsible-gaming',
  lossLimits: '/responsible-gaming/participation-limits',
  coolingOff: '/responsible-gaming/cooling-off',
  realityChecks: '/responsible-gaming/reality-checks',
  history: '/history/games',
  wallet: '/wallet',
  restrictedCountries: '/legal/restricted-countries',
  support: '/support',
} as const;

export type PlayState = 'playable' | 'engine-only' | 'coming-soon';

/** playable = engine + play screen · engine-only = engine, no play screen yet · coming-soon = no engine. */
export function playStateOf(slug: string): PlayState {
  if (!fairGame(slug)) return 'coming-soon';
  return PLAY_SCREENS.has(slug) ? 'playable' : 'engine-only';
}

export function gameInfo(slug: string): FairGameInfo | null {
  return fairGame(slug);
}

/** Animation durations (ms) from the motion tokens. Reduced motion = 0 (instant result). */
export const GAME_MOTION = {
  wheelSpin: tokens.motion.duration['wheel-spin'],
  coinFlip: tokens.motion.duration['coin-flip'],
  cardDeal: tokens.motion.duration['card-deal'],
  crashFrame: tokens.motion.duration['crash-frame'],
  fast: tokens.motion.duration.fast,
  base: tokens.motion.duration.base,
  slow: tokens.motion.duration.slow,
  deliberate: tokens.motion.duration.deliberate,
} as const;

/** Fixed compliance copy shared by every bet surface. */
export const GAME_COPY = {
  stakeRisk: 'You can lose your stake.',
  noCashValue:
    'DEMO credits have no cash value. They are never bought, withdrawn or exchanged for USDT or anything else.',
  fee: 'No fee on game bets — the house edge is already in the multiplier. (The 0.05 USDT platform fee applies to Global Pool entries only.)',
  licence:
    'Simulation mode: games use DEMO credits only. Real-money play would need an applicable licence and is offered only in permitted jurisdictions (licence: DEMO placeholder). 18+.',
  independent: 'Each bet is independent — past results never change the odds.',
} as const;
