import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DashboardOverview } from '@/components/account/dashboard/overview';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * USR-01 Dashboard overview (inside the casino shell). States come from the API: Active, New user (setup
 * checklist when there is no deposit yet) and Restricted (GET /auth/account-status). Dev-only preview:
 * `/dashboard?state=restricted`.
 */
export default function Page() {
  return (
    <Suspense>
      <DashboardOverview />
    </Suspense>
  );
}
