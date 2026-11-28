'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { DemoBar } from '@/components/ui/demo-badge';
import { ErrorState } from '@/components/ui/error-state';
import { ApiNetworkError } from '@/lib/api/client';
import { LoadingLabel, Skeleton } from '@/components/ui/skeleton';

import { useAdminSession } from './session';
import { AdminShell } from './shell';

const UNREACHABLE = new ApiNetworkError('/admin/auth/refresh');

/**
 * Redirects to /admin/login when signed out; shows a shell-shaped skeleton while the session restores, and an
 * error with Try again when the API could not be reached (the session is kept — ERR-02).
 */
export function AdminConsoleGate({ children }: { children: React.ReactNode }) {
  const { status, retryRestore } = useAdminSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === 'signed_out') {
      const next = pathname && pathname !== '/admin' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/admin/login${next}`);
    }
  }, [status, router, pathname]);

  if (status === 'unreachable') {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-base">
        <DemoBar />
        <main id="main" className="flex flex-1 items-center justify-center p-6">
          <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-default p-6">
            <Logo variant="mark" height={28} title="" />
            <ErrorState
              error={UNREACHABLE}
              onRetry={retryRestore}
              title="Can’t reach the admin API"
              description="We couldn’t check your admin session because the API didn’t answer. You’re still signed in — try again in a moment."
              actions={
                <Button asChild variant="ghost" size="s">
                  <Link href="/admin/login">Go to sign-in</Link>
                </Button>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  if (status !== 'signed_in') {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-base" aria-busy>
        <DemoBar />
        <LoadingLabel>Checking your admin session…</LoadingLabel>
        <div className="flex flex-1">
          <div className="hidden w-[248px] flex-col gap-3 border-r border-border-subtle bg-bg-secondary p-4 laptop:flex">
            <Logo variant="mark" height={22} title="" />
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-5 p-6">
            <Skeleton className="h-10 w-full max-w-[420px]" />
            <Skeleton className="h-16 w-72" />
            <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  return <AdminShell>{children}</AdminShell>;
}
