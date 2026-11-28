import type { Metadata } from 'next';

import { HistoryRewards } from '@/components/rg-history/finance';

export const metadata: Metadata = { title: 'Rewards · GLOBAL POOL' };

/** USR-F4 — Rewards. */
export default function Page() {
  return <HistoryRewards />;
}
