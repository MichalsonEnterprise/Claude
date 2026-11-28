import type { Metadata } from 'next';

import { ComingSoonPage } from '@/components/legal/info-page';

export const metadata: Metadata = { title: 'About GLOBAL POOL (DEMO)' };

/** Planned route linked from the navigation: an honest "not in this build yet" state (no dead link). */
export default function AboutPage() {
  return (
    <ComingSoonPage
      title="About GLOBAL POOL"
      description="The company page is planned."
      alternatives={[
        { label: 'How the Global Pool works', href: '/#how-it-works' },
        { label: 'Licence details', href: '/legal/licence' },
        { label: 'Terms of service', href: '/legal/terms' },
      ]}
    />
  );
}
