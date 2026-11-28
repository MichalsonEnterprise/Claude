import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CoinflipFairnessPage } from '@/components/games/coinflip/fairness';
import { GameSkeleton } from '@/components/games/kit';

export const metadata: Metadata = {
  title: 'Provably fair — Double Side · GLOBAL POOL',
  description:
    'Verify any Double Side flip in your browser: commitment, revealed server seed, client seed, nonce and HMAC-SHA256. DEMO credits only.',
};

/** CF-05 — Double Side provably-fair verification (`?bet=<id>` focuses one flip). */
export default function DoubleSideFairnessPage() {
  return (
    <Suspense fallback={<GameSkeleton label="Loading the verifier…" />}>
      <CoinflipFairnessPage />
    </Suspense>
  );
}
