import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PrizeDistributionPage } from '@/components/admin-b/pool/rounds-pages';

export const metadata: Metadata = { title: 'Prize distribution · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <PrizeDistributionPage />
    </Suspense>
  );
}
