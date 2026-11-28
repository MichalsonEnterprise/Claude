import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserRestrictionsTab } from '@/components/admin-a/user-restrictions';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'Account restrictions' };

export default function AdminUserUserRestrictionsTabRoute() {
  return (
    <TabGate tab="restrictions">
      <Suspense>
        <UserRestrictionsTab />
      </Suspense>
    </TabGate>
  );
}
