import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { HomePage } from '@/components/home/home-page';
import { prefetchHome } from '@/lib/data/queries';
import { parseHomePreview, statePreviewEnabled } from '@/lib/home-preview';

import { LobbyBackdrop } from './lobby-backdrop';

/**
 * Server component: the public lobby rendered behind the auth dialogs (Figma: split dialog over the dimmed lobby).
 * A failing lobby section never blocks the dialog (LobbyBackdrop error boundary).
 */
export async function LobbyBehind({ children }: { children?: React.ReactNode }) {
  const preview = parseHomePreview(undefined);
  const queryClient = new QueryClient();
  await prefetchHome(queryClient, preview.scenario);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LobbyBackdrop>
        <Suspense>
          <HomePage preview={preview} previewEnabled={statePreviewEnabled} />
        </Suspense>
      </LobbyBackdrop>
      {children}
    </HydrationBoundary>
  );
}
