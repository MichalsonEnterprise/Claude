import type { Metadata } from 'next';

import { PoolHub } from '@/components/pool/pool-hub';
import { parsePoolPreview } from '@/components/pool/preview';

export const metadata: Metadata = {
  title: 'Global Pool — live round, prizes and verifiable draws (DEMO)',
  description:
    'One global jackpot round at a time: 10.00 USDT per entry + a separate 0.05 USDT platform fee, 13 prizes, winners drawn with Chainlink VRF on Arbitrum. DEMO / testnet only — no real money. 18+.',
};

/**
 * GP-01 Global Pool hub (MOB-04 on mobile, PUB-02 for signed-out visitors). Client-rendered from the API with
 * TanStack Query + the live `/pool` socket. Dev-only `?state=` preview: guest, restricted, no-round,
 * wrong-network, participate (see components/pool/preview.ts).
 */
export default async function PoolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { state } = await searchParams;
  return <PoolHub previewFlags={parsePoolPreview(state).flags} />;
}
