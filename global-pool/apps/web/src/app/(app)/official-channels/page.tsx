import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'Official channels (DEMO)' };

/** Planned route linked from the navigation: an honest "not in this build yet" state (no dead link). */
export default function OfficialChannelsPage() {
  return (
    <ComingSoonPage
      title="Official channels"
      description="The list of official GLOBAL POOL channels is planned. Until then, treat any account that is not linked from this site as unofficial."
      alternatives={[
        { label: 'Support', href: '/support' },
        { label: 'Security tips', href: '/support#security' },
      ]}
    />
  );
}
