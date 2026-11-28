import type { Metadata } from 'next';

import { WithdrawalsPage } from '@/components/admin-b/finance/withdrawals-page';

export const metadata: Metadata = { title: 'Withdrawals · Finance' };

export default function Page() {
  return <WithdrawalsPage />;
}
