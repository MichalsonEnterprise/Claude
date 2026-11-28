import {
  ArrowLeftRight,
  Bell,
  Crown,
  Fingerprint,
  FileText,
  Gamepad2,
  HeartHandshake,
  History,
  IdCard,
  KeyRound,
  LayoutDashboard,
  Mail,
  Monitor,
  MonitorSmartphone,
  Shield,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from '@/components/shell/nav-config';

/** Routes owned by the account module (USR-00/01/02, USR-A1…A10, AUTH-11…17). */
export const ACCOUNT_ROUTES = {
  dashboard: '/dashboard',
  notifications: '/notifications',
  profile: '/account',
  security: '/account/security',
  twoFactor: '/account/2fa',
  kyc: '/account/kyc',
  kycVerify: '/account/kyc/verify',
  documents: '/account/documents',
  loginHistory: '/account/login-history',
  devices: '/account/devices',
  sessions: '/account/sessions',
  notificationSettings: '/account/notifications',
  antiPhishing: '/account/anti-phishing',
} as const;

/** Routes owned by the rg-history module (USR-F1…F6 financial history, USR-G1…G7 gaming history). */
export const HISTORY_ROUTES = {
  financial: '/history',
  transactions: '/history/transactions',
  games: '/history/games',
} as const;

export interface DashboardTab {
  id: DashboardTabId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Paths that also mark this tab active (sub-sections). */
  match?: string[];
}

export type DashboardTabId =
  | 'overview'
  | 'gaming'
  | 'wallet'
  | 'account'
  | 'history'
  | 'vip'
  | 'referrals'
  | 'rg'
  | 'notifications';

/** In-page dashboard sub-nav (USR-00): the same order as the Figma "Dashboard sections" sheet. */
export const DASHBOARD_TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', href: ACCOUNT_ROUTES.dashboard, icon: LayoutDashboard },
  { id: 'gaming', label: 'Gaming', href: HISTORY_ROUTES.games, icon: Gamepad2 },
  { id: 'wallet', label: 'Wallet', href: ROUTES.wallet, icon: Wallet },
  {
    id: 'account',
    label: 'Account & security',
    href: ACCOUNT_ROUTES.profile,
    icon: Shield,
    match: ['/account'],
  },
  {
    id: 'history',
    label: 'Financial history',
    href: HISTORY_ROUTES.financial,
    icon: ArrowLeftRight,
  },
  { id: 'vip', label: 'VIP', href: ROUTES.vip, icon: Crown },
  { id: 'referrals', label: 'Referrals', href: ROUTES.affiliates, icon: Users },
  { id: 'rg', label: 'Responsible gaming', href: ROUTES.responsibleGaming, icon: HeartHandshake },
  { id: 'notifications', label: 'Notifications', href: ACCOUNT_ROUTES.notifications, icon: Bell },
];

export type AccountTabId =
  | 'profile'
  | 'security'
  | '2fa'
  | 'kyc'
  | 'documents'
  | 'login-history'
  | 'devices'
  | 'sessions'
  | 'notification-settings'
  | 'anti-phishing';

export interface AccountTab {
  id: AccountTabId;
  label: string;
  /** Longer name used in breadcrumbs / the mobile sheet. */
  title: string;
  href: string;
  icon: LucideIcon;
  group: 'Profile' | 'Security' | 'Verification';
}

/** Account & security pills (USR-A1…A10), grouped like the Figma account sub-nav. */
export const ACCOUNT_TABS: AccountTab[] = [
  {
    id: 'profile',
    label: 'Profile',
    title: 'Personal information',
    href: ACCOUNT_ROUTES.profile,
    icon: User,
    group: 'Profile',
  },
  {
    id: 'security',
    label: 'Security',
    title: 'Security settings',
    href: ACCOUNT_ROUTES.security,
    icon: Shield,
    group: 'Security',
  },
  {
    id: '2fa',
    label: '2FA',
    title: 'Two-factor authentication',
    href: ACCOUNT_ROUTES.twoFactor,
    icon: KeyRound,
    group: 'Security',
  },
  {
    id: 'kyc',
    label: 'KYC',
    title: 'KYC status',
    href: ACCOUNT_ROUTES.kyc,
    icon: IdCard,
    group: 'Verification',
  },
  {
    id: 'documents',
    label: 'Documents',
    title: 'Verification documents',
    href: ACCOUNT_ROUTES.documents,
    icon: FileText,
    group: 'Verification',
  },
  {
    id: 'login-history',
    label: 'Login history',
    title: 'Login history',
    href: ACCOUNT_ROUTES.loginHistory,
    icon: History,
    group: 'Security',
  },
  {
    id: 'devices',
    label: 'Devices',
    title: 'Connected devices',
    href: ACCOUNT_ROUTES.devices,
    icon: Monitor,
    group: 'Security',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    title: 'Session management',
    href: ACCOUNT_ROUTES.sessions,
    icon: MonitorSmartphone,
    group: 'Security',
  },
  {
    id: 'notification-settings',
    label: 'Notification settings',
    title: 'Notification preferences',
    href: ACCOUNT_ROUTES.notificationSettings,
    icon: Bell,
    group: 'Profile',
  },
  {
    id: 'anti-phishing',
    label: 'Anti-phishing',
    title: 'Anti-phishing code',
    href: ACCOUNT_ROUTES.antiPhishing,
    icon: Mail,
    group: 'Security',
  },
];

/** Icon for the liveness / biometric step (KYC). */
export const LivenessIcon = Fingerprint;

export function isTabActive(tab: Pick<DashboardTab, 'href' | 'match'>, pathname: string): boolean {
  const hits = [tab.href, ...(tab.match ?? [])];
  return hits.some((h) => pathname === h || pathname.startsWith(`${h}/`));
}
