import type { Metadata } from 'next';

import { EntriesPage } from '@/components/pool/entries-page';

export const metadata: Metadata = {
  title: 'My Global Pool entries (DEMO)',
  description:
    'Your Global Pool purchases: entry IDs, entry amounts, the separate 0.05 USDT platform fee and each result. DEMO / testnet only.',
};

/** GP-10 Entry history. */
export default function Page() {
  return <EntriesPage />;
}
