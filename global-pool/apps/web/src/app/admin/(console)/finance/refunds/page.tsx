import type { Metadata } from 'next';

import { RefundsPage } from '@/components/admin-b/finance/refunds-page';

export const metadata: Metadata = { title: 'Refunds · Finance' };

export default function Page() {
  return <RefundsPage />;
}
