import type { Metadata } from 'next';

import { HistoryTransactions } from '@/components/rg-history/finance';

export const metadata: Metadata = { title: 'Transaction history · GLOBAL POOL' };

/** USR-F6 — Complete transaction history with filters + CSV export. */
export default function Page() {
  return <HistoryTransactions />;
}
