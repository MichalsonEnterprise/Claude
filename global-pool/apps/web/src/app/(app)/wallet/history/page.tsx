import type { Metadata } from 'next';
import { Suspense } from 'react';

import { WalletHistory } from '@/components/wallet/history';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Transaction history',
  description:
    'Deposits, withdrawals, entries, fees, refunds and rewards with receipts and timelines (DEMO).',
};

/** WAL-20 Transaction history + WAL-21 detail drawer (`?tx=<reference>`). */
export default function WalletHistoryPage() {
  return (
    <MemberGate>
      <Suspense>
        <WalletHistory />
      </Suspense>
    </MemberGate>
  );
}
