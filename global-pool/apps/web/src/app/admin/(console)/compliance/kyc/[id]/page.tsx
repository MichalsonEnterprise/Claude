import type { Metadata } from 'next';

import { KycReviewPage } from '@/components/admin-b/compliance/kyc-pages';

export const metadata: Metadata = { title: 'KYC review · Compliance' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KycReviewPage id={id} />;
}
