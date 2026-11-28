import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthRouteOpener } from '@/components/auth/auth-route';
import { LobbyBehind } from '@/components/auth/lobby-behind';

export const metadata: Metadata = { title: 'Sign in' };

/** AUTH flow route: the GLOBAL POOL auth dialog over the dimmed lobby (one Privy flow for sign-in and sign-up). */
export default function Page() {
  return (
    <LobbyBehind>
      <Suspense>
        <AuthRouteOpener view="sign-in" />
      </Suspense>
    </LobbyBehind>
  );
}
