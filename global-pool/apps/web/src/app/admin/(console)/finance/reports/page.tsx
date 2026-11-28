import type { Metadata } from 'next';

import { ReportsPage } from '@/components/admin-b/finance/reports-page';

export const metadata: Metadata = { title: 'Revenue reports · Finance' };

export default function Page() {
  return <ReportsPage />;
}
