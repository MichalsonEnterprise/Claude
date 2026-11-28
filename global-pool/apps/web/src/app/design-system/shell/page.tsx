import type { Metadata } from 'next';

import { ShellPreview } from './shell-preview';

export const metadata: Metadata = {
  title: 'Shell preview',
  robots: { index: false, follow: false },
};

/**
 * Live responsive shell for visual QA: /design-system/shell?auth=guest|member&state=default|wrong-network|restricted
 * Resize the window: ≥1280 expanded sidebar · 1024–1279 rail · <1024 drawer · <768 mobile chrome.
 */
export default async function ShellPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const auth = sp.auth === 'member' ? 'member' : 'guest';
  const state = typeof sp.state === 'string' ? sp.state : 'default';
  return (
    <ShellPreview
      auth={auth}
      wrongNetwork={state === 'wrong-network'}
      restricted={state === 'restricted'}
    />
  );
}
