import type { Metadata } from 'next';

import { HistoryRefunds } from '@/components/rg-history/finance';

export const metadata: Metadata = { title: 'Refunds · GLOBAL POOL' };

/** USR-F5 — Refunds from cancelled rounds. */
export default function Page() {
  return <HistoryRefunds />;
}
