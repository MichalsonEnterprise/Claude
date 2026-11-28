import type { Metadata } from 'next';

import { SecurityOverview } from '@/components/account/security-overview';

export const metadata: Metadata = { title: 'Security settings' };

/** USR-A2 Security settings (security score, review banner, protections, recent activity). */
export default function Page() {
  return <SecurityOverview />;
}
