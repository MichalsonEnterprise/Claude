import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AmlAlertsPage } from '@/components/admin-b/compliance/aml-page';

export const metadata: Metadata = { title: 'AML alerts · Compliance' };

export default function Page() {
  return (
    <Suspense>
      <AmlAlertsPage />
    </Suspense>
  );
}
