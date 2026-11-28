import type { Metadata } from 'next';

import { OverviewPage } from '@/components/admin-a/overview';

export const metadata: Metadata = { title: 'Overview' };

export default function AdminOverviewRoute() {
  return <OverviewPage />;
}
