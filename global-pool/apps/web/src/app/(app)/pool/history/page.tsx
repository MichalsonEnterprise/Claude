import type { Metadata } from 'next';

import { HistoryPage } from '@/components/pool/history-page';

export const metadata: Metadata = {
  title: 'Global Pool round history — pools, results and proofs (DEMO)',
  description:
    'Every Global Pool round with its pool, winners or refunds, and a link to verify the draw. DEMO / testnet only.',
};

/** GP-08 Round history (filters: status, round #, rounds I entered). */
export default function Page() {
  return <HistoryPage />;
}
