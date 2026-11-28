import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserWalletsTab } from '@/components/admin-a/user-tabs';
import { TabGate } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'Wallet addresses' };

export default function AdminUserUserWalletsTabRoute() {
  return (
    <TabGate tab="wallets">
      <Suspense>
        <UserWalletsTab />
      </Suspense>
    </TabGate>
  );
}
