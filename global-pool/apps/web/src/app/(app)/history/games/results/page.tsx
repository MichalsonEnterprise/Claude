import type { Metadata } from 'next';

import { RoundResults } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'My results · GLOBAL POOL' };

/** USR-G4 — My results. */
export default function Page() {
  return <RoundResults />;
}
