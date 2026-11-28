import type { Metadata } from 'next';

import { DevicesPage } from '@/components/account/devices-sessions';

export const metadata: Metadata = { title: 'Connected devices' };

/** USR-A7 Connected devices (revoke, review new device). */
export default function Page() {
  return <DevicesPage />;
}
