import type { Metadata } from 'next';

import { MyGames } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'My games · GLOBAL POOL' };

/** USR-G1 — My games. */
export default function Page() {
  return <MyGames />;
}
