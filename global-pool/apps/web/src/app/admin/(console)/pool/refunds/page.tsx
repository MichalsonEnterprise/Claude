import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PoolRefundsPage } from '@/components/admin-b/pool/control-pages';

export const metadata: Metadata = { title: 'Refund status · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <PoolRefundsPage />
    </Suspense>
  );
}
