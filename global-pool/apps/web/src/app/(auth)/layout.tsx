import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { DemoBar } from '@/components/ui/demo-badge';
import { publicEnv } from '@/lib/env';

/**
 * Auth route group (onboarding consents, 2FA enrolment, admin sign-in …) — focused pages without the casino
 * shell. Player sign-in itself is the Privy modal (or the DEV MOCK dialog), opened from the shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-secondary">
      {publicEnv.demoMode && <DemoBar />}
      <header className="flex h-16 items-center px-4 tablet:px-8">
        <Link href="/" aria-label="GLOBAL POOL — back to the lobby">
          <Logo height={32} title="" />
        </Link>
      </header>
      <main
        id="main"
        className="flex flex-1 items-start justify-center px-4 py-10 tablet:items-center"
      >
        {children}
      </main>
    </div>
  );
}
