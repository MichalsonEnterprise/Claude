import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ActiveRoundPage } from '@/components/admin-b/pool/active-round-page';

export const metadata: Metadata = { title: 'Active round · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <ActiveRoundPage />
    </Suspense>
  );
}
