import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'Status page (DEMO)' };

/** Planned route linked from the navigation: an honest "not in this build yet" state (no dead link). */
export default function StatusPage() {
  return (
    <ComingSoonPage
      title="Status page"
      description="Live service and network status is planned."
      alternatives={[
        { label: 'Supported networks', href: '/#networks' },
        { label: 'Support', href: '/support' },
      ]}
    />
  );
}
