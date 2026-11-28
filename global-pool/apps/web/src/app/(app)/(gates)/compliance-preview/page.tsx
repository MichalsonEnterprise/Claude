import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CompliancePreview } from '@/components/compliance/gate-pages';
import { statePreviewEnabled } from '@/lib/home-preview';

export const metadata: Metadata = { title: 'Compliance states preview', robots: { index: false } };

/**
 * Dev / QA only (`next dev` or NEXT_PUBLIC_STATE_PREVIEW=true): ERR-05 regulatory states with DEMO context —
 * `?kind=region|licence|kyc_required|self_excluded|cooling_off|age|age-gate&layout=page|card|notice`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!statePreviewEnabled) notFound();
  const { kind, layout } = await searchParams;
  const k = typeof kind === 'string' ? kind : 'region';
  const l = layout === 'card' || layout === 'notice' ? layout : 'page';
  return <CompliancePreview key={`${k}-${l}`} kind={k} layout={l} />;
}
