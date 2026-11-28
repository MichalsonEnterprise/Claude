import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserAuditTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'Audit history' };

export default function AdminUserUserAuditTabRoute() {
  return (
    <TabGate tab="audit">
      <Suspense>
        <UserAuditTab />
      </Suspense>
    </TabGate>
  );
}
