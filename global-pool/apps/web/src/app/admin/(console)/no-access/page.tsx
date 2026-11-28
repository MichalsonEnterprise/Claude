import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NoAccessPage } from '@/components/admin-a/no-access';

export const metadata: Metadata = { title: 'No permission' };

export default function AdminNoAccessRoute() {
  return (
    <Suspense>
      <NoAccessPage />
    </Suspense>
  );
}
