import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'Security center (DEMO)' };

/** Planned route linked from the homepage security section: an honest "not in this build yet" state. */
export default function SecurityCenterPage() {
  return (
    <ComingSoonPage
      title="Security center"
      description="A page with custody, contract and audit details is planned. Audit reports are DEMO placeholders in this build."
      alternatives={[
        { label: 'Verify a Global Pool draw yourself', href: '/provably-fair' },
        { label: 'Your account security and 2FA', href: '/account/security' },
        { label: 'Whitelisted withdrawal addresses', href: '/wallet/whitelist' },
      ]}
    />
  );
}
