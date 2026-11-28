import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { HomePage } from '@/components/home/home-page';
import { prefetchHome } from '@/lib/data/queries';
import { parseHomePreview, statePreviewEnabled } from '@/lib/home-preview';

export const metadata: Metadata = {
  title: { absolute: 'GLOBAL POOL — one global pool, every entry verifiable (DEMO)' },
  description:
    'One global jackpot round at a time: 10.00 USDT per entry + a separate 0.05 USDT platform fee, winners drawn with Chainlink VRF on Arbitrum. DEMO / testnet build — no real money. 18+.',
};

/**
 * PUB-01 Homepage / public lobby (route "/", inside the casino shell).
 *
 * Data: server-prefetched TanStack queries (src/lib/data/queries.ts → mock DEMO fetchers by default,
 * NEXT_PUBLIC_DATA_SOURCE=api for the NestJS API), hydrated into the client sections.
 *
 * Dev-only state preview — `?state=<flags>` (comma-separated; `next dev` or NEXT_PUBLIC_STATE_PREVIEW=true):
 *   /                          guest, active round (default; signed-in players see the member view)
 *   /?state=member             logged in as DEMO @nova.k: balance chip, "Your 35 entries", odds
 *   /?state=restricted         restricted region (United States): gating banner, disabled CTAs,
 *                              withdraw / self-exclusion still available, no bypass hints
 *   /?state=no-round           between rounds: last result + "Round #1,249 opens 28 Nov 2026, 08:00 UTC"
 *   /?state=guest              force the logged-out view while signed in
 *   combine: /?state=member,no-round · /?state=member,restricted
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { state } = await searchParams;
  const preview = parseHomePreview(state);
  const queryClient = new QueryClient();
  await prefetchHome(queryClient, preview.scenario);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePage preview={preview} previewEnabled={statePreviewEnabled} />
    </HydrationBoundary>
  );
}
