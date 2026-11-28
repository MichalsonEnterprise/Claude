import type { Metadata } from 'next';
import { Suspense } from 'react';

import { KycQueuePage } from '@/components/admin-b/compliance/kyc-pages';

export const metadata: Metadata = { title: 'KYC queue · Compliance' };

export default function Page() {
  return (
    <Suspense>
      <KycQueuePage />
    </Suspense>
  );
}
