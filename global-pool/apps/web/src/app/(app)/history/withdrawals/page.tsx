import type { Metadata } from 'next';

import { HistoryWithdrawals } from '@/components/rg-history/finance';

export const metadata: Metadata = { title: 'Withdrawals · GLOBAL POOL' };

/** USR-F2 — Withdrawal history. */
export default function Page() {
  return <HistoryWithdrawals />;
}
