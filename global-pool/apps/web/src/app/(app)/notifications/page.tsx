import type { Metadata } from 'next';

import { NotificationCenter } from '@/components/account/notifications-center';

export const metadata: Metadata = { title: 'Notifications' };

/** USR-02 Notification Center (unread / empty states from GET /notifications). */
export default function Page() {
  return <NotificationCenter />;
}
