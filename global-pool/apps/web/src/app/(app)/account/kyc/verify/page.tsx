import type { Metadata } from 'next';

import { KycFlowDialog } from '@/components/account/kyc-flow/flow';
import { KycStatusPage } from '@/components/account/kyc-status';

export const metadata: Metadata = { title: 'Verify your identity' };

/**
 * AUTH-11…17 KYC flow: intro & levels → personal details → document upload → liveness (mock) → review → pending →
 * approved / resubmit. A two-pane dialog over the KYC status page (full screen on mobile); closing returns to
 * /account/kyc. Every step is saved by the API (KYC module, mock provider in dev).
 */
export default function Page() {
  return (
    <>
      <KycStatusPage />
      <KycFlowDialog />
    </>
  );
}
