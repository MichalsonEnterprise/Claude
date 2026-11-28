import type { Metadata } from 'next';

import { ProvablyFairPage } from '@/components/pool/provably-fair-page';

export const metadata: Metadata = {
  title: 'Provably Fair — verify Global Pool draws and Originals bets (DEMO)',
  description:
    'Re-derive Global Pool winners from the VRF random word and recompute Originals bets from their seeds — in your browser. DEMO / testnet only.',
};

/** PUB-07 Provably Fair page (explainer + verifier: empty / verified / failed). */
export default function Page() {
  return <ProvablyFairPage />;
}
