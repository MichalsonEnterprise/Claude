import type { Metadata } from 'next';
import { Suspense } from 'react';

import { GamesLobby } from '@/components/games/lobby/games-lobby';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Games lobby — GLOBAL POOL',
  description:
    'GLOBAL POOL originals, table games, slots, live tables and draws. House edge or RTP on every tile; games use DEMO credits (no cash value).',
};

/** PUB-03 Games lobby + GM-02 catalogue (`?category=originals|table|slots|live|draws|jackpot`, `?q=`). */
export default function GamesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-xl" />}>
      <GamesLobby />
    </Suspense>
  );
}
