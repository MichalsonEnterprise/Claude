import type { Metadata } from 'next';

import { CrashGame } from '@/components/games/crash/crash-game';

export const metadata: Metadata = {
  title: 'Orbit Rush — DEMO credits · GLOBAL POOL',
  description:
    'Orbit Rush: cash out before the round crashes. Provably fair hash-chain rounds, 1.00% house edge at every target, auto cash-out on the server. DEMO credits only — no cash value.',
};

/** CR-01 … CR-04, CR-06, CR-08 — Orbit Rush live play screen (socket.io /crash; DEMO credits only). */
export default function OrbitRushPage() {
  return <CrashGame />;
}
