import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserTransactionsTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'Transaction history' };

export default function AdminUserUserTransactionsTabRoute() {
  return (
    <TabGate tab="transactions">
      <Suspense>
        <UserTransactionsTab />
      </Suspense>
    </TabGate>
  );
}
