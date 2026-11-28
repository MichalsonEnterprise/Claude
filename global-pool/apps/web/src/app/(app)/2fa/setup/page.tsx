import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LobbyBehind } from '@/components/auth/lobby-behind';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';

export const metadata: Metadata = { title: 'Set up two-step sign-in' };

/** AUTH-07 TOTP enrolment: scan → confirm → backup codes. `?next=` returns to the calling flow. */
export default function Page() {
  return (
    <LobbyBehind>
      <Suspense>
        <TwoFactorSetup />
      </Suspense>
    </LobbyBehind>
  );
}
