import type { Metadata } from 'next';

import { GameHistory } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'Game history · GLOBAL POOL' };

/** USR-G6 — Game history (commit–reveal seeds). */
export default function Page() {
  return <GameHistory />;
}
