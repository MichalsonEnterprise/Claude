import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'Affiliates (DEMO)' };

/** Planned route linked from the navigation: an honest "not in this build yet" state (no dead link). */
export default function AffiliatesPage() {
  return (
    <ComingSoonPage
      title="Affiliates"
      description="The affiliate programme page is planned."
      alternatives={[
        { label: 'Affiliate overview on the lobby', href: '/#affiliates' },
        { label: 'Support', href: '/support' },
      ]}
    />
  );
}
