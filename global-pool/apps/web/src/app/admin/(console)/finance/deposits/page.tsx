import type { Metadata } from 'next';

import { DepositsPage } from '@/components/admin-b/finance/deposits-page';

export const metadata: Metadata = { title: 'Deposits · Finance' };

export default function Page() {
  return <DepositsPage />;
}
