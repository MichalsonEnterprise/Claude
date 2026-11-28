import type { Metadata } from 'next';

import { WithdrawalDetailPage } from '@/components/admin-b/finance/withdrawal-detail-page';

export const metadata: Metadata = { title: 'Withdrawal review · Finance' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WithdrawalDetailPage id={id} />;
}
