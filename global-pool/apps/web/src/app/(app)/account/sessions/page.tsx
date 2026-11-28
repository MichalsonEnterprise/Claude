import type { Metadata } from 'next';

import { SessionsPage } from '@/components/account/devices-sessions';

export const metadata: Metadata = { title: 'Session management' };

/** USR-A8 Session management (end other sessions). */
export default function Page() {
  return <SessionsPage />;
}
