import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserAmlTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'AML risk' };

export default function AdminUserUserAmlTabRoute() {
  return (
    <TabGate tab="aml">
      <Suspense>
        <UserAmlTab />
      </Suspense>
    </TabGate>
  );
}
