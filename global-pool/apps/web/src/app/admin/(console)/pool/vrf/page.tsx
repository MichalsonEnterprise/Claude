import type { Metadata } from 'next';
import { Suspense } from 'react';

import { VrfPage } from '@/components/admin-b/pool/control-pages';

export const metadata: Metadata = { title: 'VRF status · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <VrfPage />
    </Suspense>
  );
}
