import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserRgTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'Responsible gaming' };

export default function AdminUserUserRgTabRoute() {
  return (
    <TabGate tab="rg">
      <Suspense>
        <UserRgTab />
      </Suspense>
    </TabGate>
  );
}
