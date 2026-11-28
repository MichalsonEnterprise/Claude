import type { Metadata } from 'next';

import { ReconciliationPage } from '@/components/admin-b/finance/reconciliation-page';

export const metadata: Metadata = { title: 'Reconciliation · Finance' };

export default function Page() {
  return <ReconciliationPage />;
}
