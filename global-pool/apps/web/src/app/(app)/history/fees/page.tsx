import type { Metadata } from 'next';

import { HistoryFees } from '@/components/rg-history/finance';

export const metadata: Metadata = { title: 'Fees · GLOBAL POOL' };

/** USR-F3 — Fee lines (0.05 USDT platform fee per entry, separate from network fees). */
export default function Page() {
  return <HistoryFees />;
}
