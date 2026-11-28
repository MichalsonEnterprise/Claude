import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserKycTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'KYC status' };

export default function AdminUserUserKycTabRoute() {
  return (
    <TabGate tab="kyc">
      <Suspense>
        <UserKycTab />
      </Suspense>
    </TabGate>
  );
}
