import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'Winners (DEMO)' };

/** Planned route linked from the navigation: an honest "not in this build yet" state (no dead link). */
export default function WinnersPage() {
  return (
    <ComingSoonPage
      title="Winners"
      description="Recent big wins across games and the Global Pool will be listed here."
      alternatives={[
        { label: 'Past Global Pool rounds and their winners', href: '/pool/history' },
        { label: 'Provably Fair — verify a draw', href: '/provably-fair' },
      ]}
    />
  );
}
