import type { Metadata } from 'next';

import { CrashSubpage, MyCrashBetsPage } from '@/components/games/crash/crash-pages';

export const metadata: Metadata = {
  title: 'My bets · Orbit Rush — GLOBAL POOL',
  description: 'Your Orbit Rush bets, cash-outs and results in DEMO credits (no cash value), each with a link to verify the round.',
};

/** CR-05 "My bets" tab — the player's crash bets (GET /games/orbit-rush/bets). */
export default function OrbitRushMyBetsPage() {
  return (
    <CrashSubpage>
      <MyCrashBetsPage />
    </CrashSubpage>
  );
}
