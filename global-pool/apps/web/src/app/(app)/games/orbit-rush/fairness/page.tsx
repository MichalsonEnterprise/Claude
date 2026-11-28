import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CrashFairnessPage, CrashSubpage } from '@/components/games/crash/crash-pages';
import { GameSkeleton } from '@/components/games/kit';

export const metadata: Metadata = {
  title: 'Verify a round · Orbit Rush — GLOBAL POOL',
  description: 'Recompute any Orbit Rush crash point in your browser from its revealed seed, the published commitment and the hash chain.',
};

/** CR-07 — Provably-fair verification of one round (browser re-derivation with @gp/shared/fair). */
export default function OrbitRushFairnessPage() {
  return (
    <CrashSubpage>
      <Suspense fallback={<GameSkeleton label="Loading the verifier…" />}>
        <CrashFairnessPage />
      </Suspense>
    </CrashSubpage>
  );
}
