import type { Balances, DemoFlag, LifetimeStats } from '../types';
import { demo } from './meta';

/**
 * Balances (USDT) — must reconcile everywhere: 12,480.50 = 9,215.30 + 1,850.00 + 1,000.00 + 415.20.
 * Locked = 350.00 (35 entries, round #1,248) + 1,500.00 (WD-20931); Pending = DP-77412;
 * Owed = 300.00 refund (#1,245) + 115.20 VIP weekly reward.
 */
export const DEMO_BALANCES: Balances & DemoFlag = demo({
  currency: 'USDT' as const,
  total: '12480.50',
  available: '9215.30',
  locked: '1850.00',
  pending: '1000.00',
  owed: '415.20',
  breakdown: {
    locked: [
      { label: '35 active entries — round #1,248', amount: '350.00', reference: 'round:1248' },
      { label: 'Pending withdrawal WD-20931', amount: '1500.00', reference: 'WD-20931' },
    ],
    pending: [
      {
        label: 'Deposit DP-77412 · Ethereum · 7 / 12 confirmations',
        amount: '1000.00',
        reference: 'DP-77412',
      },
    ],
    owed: [
      {
        label: 'Refund — cancelled round #1,245 (30 entries)',
        amount: '300.00',
        reference: 'round:1245',
      },
      { label: 'VIP Gold weekly reward', amount: '115.20', reference: 'vip:weekly:2026-11-16' },
    ],
  },
});

export const DEMO_LIFETIME: LifetimeStats & DemoFlag = demo({
  deposits: '24600.00',
  withdrawals: '11950.00',
  entries: 1284,
  /** 1,284 × 0.05 */
  platformFeesPaid: '64.20',
  rewards: '1842.60',
});
