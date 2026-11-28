import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LobbyBehind } from '@/components/auth/lobby-behind';
import { OnboardingScreen } from '@/components/auth/onboarding';

export const metadata: Metadata = { title: 'Finish setting up your account' };

/** First-login onboarding (consents + country + handle) — required before any gaming or financial action. */
export default function Page() {
  return (
    <LobbyBehind>
      <Suspense>
        <OnboardingScreen />
      </Suspense>
    </LobbyBehind>
  );
}
