import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SettlementPage } from '@/components/admin-b/pool/rounds-pages';

export const metadata: Metadata = { title: 'Settlement · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <SettlementPage />
    </Suspense>
  );
}
