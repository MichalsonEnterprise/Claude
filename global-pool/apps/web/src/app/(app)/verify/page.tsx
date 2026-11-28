import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthRouteOpener } from '@/components/auth/auth-route';
import { HomePage } from '@/components/home/home-page';
import { prefetchHome } from '@/lib/data/queries';
import { parseHomePreview, statePreviewEnabled } from '@/lib/home-preview';

export const metadata: Metadata = { title: 'Verify your email' };

/** AUTH flow route: the GLOBAL POOL auth dialog over the dimmed lobby (one Privy flow for sign-in and sign-up). */
export default async function Page() {
  const preview = parseHomePreview(undefined);
  const queryClient = new QueryClient();
  await prefetchHome(queryClient, preview.scenario);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePage preview={preview} previewEnabled={statePreviewEnabled} />
      <Suspense>
        <AuthRouteOpener view="verify" />
      </Suspense>
    </HydrationBoundary>
  );
}
