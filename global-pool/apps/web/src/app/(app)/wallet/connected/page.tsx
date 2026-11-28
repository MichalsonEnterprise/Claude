import type { Metadata } from 'next';

import { ConnectedWalletsPage } from '@/components/wallet/addresses';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Connected wallets',
  description: 'Wallets linked to your GLOBAL POOL account (DEMO / testnet).',
};

/** WAL-02 Connected wallets. */
export default function ConnectedWalletsRoute() {
  return (
    <MemberGate>
      <ConnectedWalletsPage />
    </MemberGate>
  );
}
