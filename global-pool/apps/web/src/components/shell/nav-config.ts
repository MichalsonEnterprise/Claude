import {
  ArrowLeftRight,
  ChartSpline,
  CircleDollarSign,
  Coins,
  Crown,
  Dice5,
  Disc3,
  Gamepad2,
  Gift,
  Heart,
  HeartHandshake,
  History,
  House,
  LayoutGrid,
  LifeBuoy,
  ShieldCheck,
  Spade,
  Ticket,
  Trophy,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Casino-shell navigation, exactly as the Figma Shell/Sidebar (CASINO-01). Routes are the planned URL map;
 * pages are added by later agents.
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** LIVE status badge (Global Pool). */
  live?: boolean;
  /** Member-only entries (hidden for guests). */
  memberOnly?: boolean;
  /** Count badge key resolved by the shell (e.g. active entries). */
  countKey?: 'entries' | 'notifications';
  children?: NavItem[];
  defaultOpen?: boolean;
}

export const ROUTES = {
  lobby: '/',
  pool: '/pool',
  originals: '/originals',
  casino: '/casino',
  favourites: '/favourites',
  recent: '/recently-played',
  winners: '/winners',
  provablyFair: '/provably-fair',
  vip: '/vip',
  affiliates: '/affiliates',
  promotions: '/promotions',
  wallet: '/wallet',
  deposit: '/wallet/deposit',
  entries: '/pool/entries',
  transactions: '/transactions',
  responsibleGaming: '/responsible-gaming',
  support: '/support',
  account: '/account',
  game: (slug: string) => `/games/${slug}`,
} as const;

export const PRIMARY_NAV: NavItem[] = [
  { id: 'lobby', label: 'Lobby', href: ROUTES.lobby, icon: House },
  { id: 'pool', label: 'Global Pool', href: ROUTES.pool, icon: CircleDollarSign, live: true },
  {
    id: 'originals',
    label: 'Originals',
    href: ROUTES.originals,
    icon: Gamepad2,
    defaultOpen: true,
    children: [
      { id: 'orbit-rush', label: 'Orbit Rush', href: ROUTES.game('orbit-rush'), icon: ChartSpline },
      { id: 'pool-dice', label: 'Pool Dice', href: ROUTES.game('pool-dice'), icon: Dice5 },
      { id: 'double-side', label: 'Double Side', href: ROUTES.game('double-side'), icon: Coins },
      { id: 'pool-roulette', label: 'Pool Roulette', href: ROUTES.game('pool-roulette'), icon: Disc3 },
      { id: 'twenty-one', label: 'Twenty-One', href: ROUTES.game('twenty-one'), icon: Spade },
    ],
  },
  {
    id: 'casino',
    label: 'Casino games',
    href: ROUTES.casino,
    icon: LayoutGrid,
    children: [
      { id: 'table-games', label: 'Table games', href: `${ROUTES.casino}/table`, icon: Spade },
      { id: 'slots', label: 'GP Studios slots', href: `${ROUTES.casino}/slots`, icon: LayoutGrid },
      { id: 'live', label: 'Live tables', href: `${ROUTES.casino}/live`, icon: Disc3 },
      { id: 'draws', label: 'Draws & bingo', href: `${ROUTES.casino}/draws`, icon: Ticket },
    ],
  },
  { id: 'favourites', label: 'Favourites', href: ROUTES.favourites, icon: Heart },
  { id: 'recent', label: 'Recently played', href: ROUTES.recent, icon: History },
  { id: 'winners', label: 'Winners', href: ROUTES.winners, icon: Trophy },
  { id: 'provably-fair', label: 'Provably Fair', href: ROUTES.provablyFair, icon: ShieldCheck },
  { id: 'vip', label: 'VIP Club', href: ROUTES.vip, icon: Crown },
  { id: 'affiliates', label: 'Affiliates', href: ROUTES.affiliates, icon: Users },
  { id: 'promotions', label: 'Promotions', href: ROUTES.promotions, icon: Gift },
];

export const ACCOUNT_NAV: NavItem[] = [
  { id: 'wallet', label: 'Wallet', href: ROUTES.wallet, icon: Wallet },
  { id: 'entries', label: 'My entries', href: ROUTES.entries, icon: Ticket, memberOnly: true, countKey: 'entries' },
  { id: 'transactions', label: 'Transactions', href: ROUTES.transactions, icon: ArrowLeftRight, memberOnly: true },
  { id: 'rg', label: 'Responsible gaming', href: ROUTES.responsibleGaming, icon: HeartHandshake },
  { id: 'support', label: 'Support', href: ROUTES.support, icon: LifeBuoy },
];

/** Mobile tab bar (Nav/Mobile Tab Bar): Lobby, Pool, Games, Wallet, Account. */
export const TAB_NAV: NavItem[] = [
  { id: 'lobby', label: 'Lobby', href: ROUTES.lobby, icon: House },
  { id: 'pool', label: 'Pool', href: ROUTES.pool, icon: CircleDollarSign },
  { id: 'games', label: 'Games', href: ROUTES.originals, icon: Gamepad2 },
  { id: 'wallet', label: 'Wallet', href: ROUTES.wallet, icon: Wallet },
  { id: 'account', label: 'Account', href: ROUTES.account, icon: User, countKey: 'notifications' },
];

/** True when `href` is the current page or a parent section of it. */
export function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
