import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ParticipantsPage } from '@/components/admin-b/pool/rounds-pages';

export const metadata: Metadata = { title: 'Participants · Global Pool' };

export default function Page() {
  return (
    <Suspense>
      <ParticipantsPage />
    </Suspense>
  );
}
