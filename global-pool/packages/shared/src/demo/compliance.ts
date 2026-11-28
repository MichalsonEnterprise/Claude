/**
 * Responsible-gaming state for @nova.k and DEMO admin data (demo-data.md → "Responsible-gaming limits", "Admin").
 */
import type { AdminUser, DemoFlag, ResponsibleGamingState } from '../types';
import { demoId } from './ids';
import { demo } from './meta';

export const DEMO_RG: ResponsibleGamingState & DemoFlag = demo({
  limits: [
    // Global Pool entries + game stakes; today used 351.75 (the 35-entry purchase)
    {
      type: 'participation' as const,
      period: 'day' as const,
      limit: '500.00',
      used: '351.75',
      pendingIncrease: null,
    },
    // net −24.60 today
    {
      type: 'loss' as const,
      period: 'day' as const,
      limit: '200.00',
      used: '24.60',
      pendingIncrease: null,
    },
    {
      type: 'deposit' as const,
      period: 'week' as const,
      limit: '5000.00',
      // DP-77380 + DP-77412 this week (Figma build notes)
      used: '3500.00',
      // increase to 7,500.00 after the 24 h cool-down (effective time from the Figma build notes)
      pendingIncrease: { amount: '7500.00', effectiveAt: '2026-11-28T21:42:00Z' },
    },
  ],
  realityCheckMinutes: 60,
  // RG session bar: session 00:42:18 · net −24.60 USDT · limit 200.00 USDT/day
  session: { durationSeconds: 2538, net: '-24.60', dailyLossLimit: '200.00' },
  selfExcluded: false,
});

export const DEMO_ADMINS: (AdminUser & DemoFlag)[] = [
  demo({
    id: demoId('admin', 1),
    name: 'S. Iyer',
    title: 'Super Admin',
    role: 'super_admin' as const,
    email: 's.iyer@globalpool.example',
  }),
  demo({
    id: demoId('admin', 2),
    name: 'A. Marin',
    title: 'Finance Lead',
    role: 'finance' as const,
    email: 'a.marin@globalpool.example',
  }),
  demo({
    id: demoId('admin', 3),
    name: 'K. Osei',
    title: 'Compliance Officer',
    role: 'compliance' as const,
    email: 'k.osei@globalpool.example',
  }),
  demo({
    id: demoId('admin', 4),
    name: 'R. Duarte',
    title: 'Support L2',
    role: 'support' as const,
    email: 'r.duarte@globalpool.example',
  }),
  demo({
    id: demoId('admin', 5),
    name: 'L. Moreau',
    title: 'Marketing Lead',
    role: 'marketing' as const,
    email: 'l.moreau@globalpool.example',
  }),
  demo({
    id: demoId('admin', 6),
    name: 'E. Lindqvist',
    title: 'External auditor (read-only)',
    role: 'read_only' as const,
    email: 'e.lindqvist@globalpool.example',
  }),
];

/** Admin dashboard KPIs (30 d). */
export const DEMO_ADMIN_KPIS = demo({
  totalUsers: 184320,
  activeUsers: 41206,
  totalDeposits: '12846500.00',
  totalWithdrawals: '10932140.00',
  /** 1,214,000 entries × 0.05 */
  platformFees: '60700.00',
  poolLiabilities: '186400.00',
  owedPrizes: '52310.40',
  activeRounds: 1,
  pendingWithdrawals: 37,
  kycPending: 214,
  systemHealthPercent: '99.97',
});

/** Smart contracts on Arbitrum (all "Audited — DEMO placeholder"; truncated, never real addresses). */
export const DEMO_CONTRACTS = [
  demo({
    name: 'GlobalPool',
    version: '1.3.0',
    addressDisplay: '0x4b1d…77ce',
    audit: 'Audited — DEMO placeholder',
  }),
  demo({
    name: 'VRFConsumer',
    version: '1.1.2',
    addressDisplay: '0x9e07…2a5f',
    audit: 'Audited — DEMO placeholder',
  }),
  demo({
    name: 'Treasury',
    version: '1.0.4',
    addressDisplay: '0xd3c8…10b9',
    audit: 'Audited — DEMO placeholder',
  }),
];
