import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserAccountTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'Account details' };

export default function AdminUserUserAccountTabRoute() {
  return (
    <TabGate tab="account">
      <Suspense>
        <UserAccountTab />
      </Suspense>
    </TabGate>
  );
}
