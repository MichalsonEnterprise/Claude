import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RoundHistoryPage } from '@/components/admin-b/pool/rounds-pages';

export const metadata: Metadata = { title: 'Historical rounds · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <RoundHistoryPage />
    </Suspense>
  );
}
