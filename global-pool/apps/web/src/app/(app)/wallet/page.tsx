import type { Metadata } from 'next';

import { WalletOverview } from '@/components/wallet/overview';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Wallet',
  description:
    'Available, Locked, Pending and Owed balances, deposits, withdrawals and history (DEMO / testnet).',
};

/** WAL-01 Wallet overview · MOB-05 (mobile). */
export default function WalletPage() {
  return (
    <MemberGate>
      <WalletOverview />
    </MemberGate>
  );
}
