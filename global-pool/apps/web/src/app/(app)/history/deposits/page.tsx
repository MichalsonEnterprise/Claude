import type { Metadata } from 'next';

import { HistoryDeposits } from '@/components/rg-history/finance';

export const metadata: Metadata = { title: 'Deposits · GLOBAL POOL' };

/** USR-F1 — Deposit history. */
export default function Page() {
  return <HistoryDeposits />;
}
