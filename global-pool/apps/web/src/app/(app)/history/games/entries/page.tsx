import type { Metadata } from 'next';

import { MyEntries } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'My entries · GLOBAL POOL' };

/** USR-G2 — My entries. */
export default function Page() {
  return <MyEntries />;
}
