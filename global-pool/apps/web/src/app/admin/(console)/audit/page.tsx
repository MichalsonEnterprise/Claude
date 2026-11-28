import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuditLogPage } from '@/components/admin-a/audit';

export const metadata: Metadata = { title: 'Audit logs' };

export default function AdminAuditRoute() {
  return (
    <Suspense>
      <AuditLogPage />
    </Suspense>
  );
}
