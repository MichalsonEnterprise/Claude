import type { Metadata } from 'next';

import { LedgerPage } from '@/components/admin-b/finance/ledger-page';

export const metadata: Metadata = { title: 'Financial ledger · Finance' };

export default function Page() {
  return <LedgerPage />;
}
