import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PoolBalancePage } from '@/components/admin-b/pool/balance-page';

export const metadata: Metadata = { title: 'Pool balance · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <PoolBalancePage />
    </Suspense>
  );
}
