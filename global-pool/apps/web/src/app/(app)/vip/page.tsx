import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'VIP Club (DEMO)' };

/** Planned route linked from the navigation: an honest "not in this build yet" state (no dead link). */
export default function VipPage() {
  return (
    <ComingSoonPage
      title="VIP Club"
      description="The VIP Club page with your level, points and rewards is planned."
      alternatives={[
        { label: 'VIP Club overview on the lobby', href: '/#vip' },
        { label: 'Responsible gaming', href: '/responsible-gaming' },
      ]}
    />
  );
}
