import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PolicyPage } from '@/components/admin-b/pool/control-pages';

export const metadata: Metadata = { title: 'Policy & circuit breaker · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <PolicyPage />
    </Suspense>
  );
}
