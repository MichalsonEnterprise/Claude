import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ApprovalsPage } from '@/components/admin-a/approvals';

export const metadata: Metadata = { title: 'Approvals' };

export default function AdminApprovalsRoute() {
  return (
    <Suspense>
      <ApprovalsPage />
    </Suspense>
  );
}
