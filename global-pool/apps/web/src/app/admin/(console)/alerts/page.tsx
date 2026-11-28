import type { Metadata } from 'next';

import { AlertsPage } from '@/components/admin-a/alerts';

export const metadata: Metadata = { title: 'Alerts' };

export default function AdminAlertsRoute() {
  return <AlertsPage />;
}
