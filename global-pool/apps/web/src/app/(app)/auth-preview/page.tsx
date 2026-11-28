import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AuthPreview } from '@/components/auth/auth-preview';
import { PREVIEW_STATES, type PreviewState } from '@/components/auth/preview-states';
import { statePreviewEnabled } from '@/lib/home-preview';

export const metadata: Metadata = { title: 'Auth preview', robots: { index: false } };

/** Dev / QA only: every AUTH dialog state with DEMO fixtures (`next dev` or NEXT_PUBLIC_STATE_PREVIEW=true). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!statePreviewEnabled) notFound();
  const { show } = await searchParams;
  const state = (PREVIEW_STATES as readonly string[]).includes(String(show))
    ? (show as PreviewState)
    : null;
  return <AuthPreview key={state ?? 'index'} show={state} />;
}
