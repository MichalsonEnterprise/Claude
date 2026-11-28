import type { Metadata } from 'next';

import { KycStatusPage } from '@/components/account/kyc-status';

export const metadata: Metadata = { title: 'Identity verification' };

/** USR-A4 KYC status: Not started / In progress / Pending / Approved / Resubmit (from GET /kyc/application). */
export default function Page() {
  return <KycStatusPage />;
}
