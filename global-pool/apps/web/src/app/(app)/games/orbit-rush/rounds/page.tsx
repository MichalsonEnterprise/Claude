import type { Metadata } from 'next';

import { CrashSubpage, RoundHistoryPage } from '@/components/games/crash/crash-pages';

export const metadata: Metadata = {
  title: 'Round history & statistics · Orbit Rush — GLOBAL POOL',
  description: 'Every Orbit Rush round with its revealed seed and crash point, plus statistics against the published 99% ÷ m odds. DEMO credits only.',
};

/** CR-05 — Round history + Game statistics. */
export default function OrbitRushRoundsPage() {
  return (
    <CrashSubpage>
      <RoundHistoryPage />
    </CrashSubpage>
  );
}
