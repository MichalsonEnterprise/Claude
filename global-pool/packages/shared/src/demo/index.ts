/**
 * Typed DEMO data — the single source for every screen (mirrors design/figma-build/demo-data.md).
 * Every record carries `isDemo: true`; the UI must show the DEMO badge wherever it renders these values.
 */
import { DEMO_BALANCES, DEMO_LIFETIME } from './balances';
import {
  DEMO_DAILY_STREAK,
  DEMO_GAMES,
  DEMO_PROMOTIONS,
  DEMO_TOURNAMENT_PRIZES,
  DEMO_VIP_TIERS,
} from './catalogue';
import { DEMO_ADMIN_KPIS, DEMO_ADMINS, DEMO_CONTRACTS, DEMO_RG } from './compliance';
import { DEMO_AS_OF } from './meta';
import {
  DEMO_CURRENT_ROUND,
  DEMO_ENTRIES_FEED,
  DEMO_MY_ENTRIES,
  DEMO_ODDS_EXAMPLE,
  DEMO_PREVIOUS_ROUNDS,
  DEMO_RECENT_WINNERS,
  DEMO_ROUND_1248_DRAW,
  DEMO_ROUND_1248_SETTLED,
} from './rounds';
import { DEMO_TRANSACTIONS } from './transactions';
import {
  DEMO_DEVICES,
  DEMO_NEW_ADDRESS_EXAMPLE,
  DEMO_RESTRICTED_COUNTRY,
  DEMO_USER,
  DEMO_WALLETS,
} from './user';

export * from './balances';
export * from './catalogue';
export * from './compliance';
export * from './ids';
export * from './meta';
export * from './rounds';
export * from './transactions';
export * from './user';

/** Everything in one object (handy for mock fetchers and the API seed). */
export const DEMO = {
  asOf: DEMO_AS_OF,
  user: DEMO_USER,
  restrictedCountry: DEMO_RESTRICTED_COUNTRY,
  wallets: DEMO_WALLETS,
  newAddressExample: DEMO_NEW_ADDRESS_EXAMPLE,
  devices: DEMO_DEVICES,
  balances: DEMO_BALANCES,
  lifetime: DEMO_LIFETIME,
  currentRound: DEMO_CURRENT_ROUND,
  round1248Draw: DEMO_ROUND_1248_DRAW,
  round1248Settled: DEMO_ROUND_1248_SETTLED,
  previousRounds: DEMO_PREVIOUS_ROUNDS,
  myEntries: DEMO_MY_ENTRIES,
  odds: DEMO_ODDS_EXAMPLE,
  entriesFeed: DEMO_ENTRIES_FEED,
  recentWinners: DEMO_RECENT_WINNERS,
  transactions: DEMO_TRANSACTIONS,
  games: DEMO_GAMES,
  promotions: DEMO_PROMOTIONS,
  dailyStreak: DEMO_DAILY_STREAK,
  tournamentPrizes: DEMO_TOURNAMENT_PRIZES,
  vipTiers: DEMO_VIP_TIERS,
  responsibleGaming: DEMO_RG,
  admins: DEMO_ADMINS,
  adminKpis: DEMO_ADMIN_KPIS,
  contracts: DEMO_CONTRACTS,
} as const;
