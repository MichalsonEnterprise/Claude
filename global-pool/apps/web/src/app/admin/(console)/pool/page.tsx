import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PoolOverviewPage } from '@/components/admin-b/pool/overview-page';

export const metadata: Metadata = { title: 'Overview · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <PoolOverviewPage />
    </Suspense>
  );
}
