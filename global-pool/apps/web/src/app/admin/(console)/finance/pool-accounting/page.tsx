import type { Metadata } from 'next';

import { PoolAccountingPage } from '@/components/admin-b/finance/pool-accounting-page';

export const metadata: Metadata = { title: 'Pool accounting · Finance' };

export default function Page() {
  return <PoolAccountingPage />;
}
