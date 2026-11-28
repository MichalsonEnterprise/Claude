import type { Metadata } from 'next';

import { NotificationPrefsPage } from '@/components/account/notification-prefs';

export const metadata: Metadata = { title: 'Notification preferences' };

/** USR-A9 Notification preferences (channel matrix, locked security/RG). */
export default function Page() {
  return <NotificationPrefsPage />;
}
