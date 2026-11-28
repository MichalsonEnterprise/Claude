import type { Metadata } from 'next';

import { ActiveRounds } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'My active rounds · GLOBAL POOL' };

/** USR-G3 — My active rounds. */
export default function Page() {
  return <ActiveRounds />;
}
