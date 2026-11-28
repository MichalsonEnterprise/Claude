import type { Metadata } from 'next';

import { TabGate, UserSummaryTab } from '@/components/admin-a/user-detail';

export const metadata: Metadata = { title: 'User profile' };

export default function AdminUserSummaryRoute() {
  return (
    <TabGate tab="summary">
      <UserSummaryTab />
    </TabGate>
  );
}
