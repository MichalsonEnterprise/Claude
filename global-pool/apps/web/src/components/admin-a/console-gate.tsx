'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { DemoBar } from '@/components/ui/demo-badge';
import { LoadingLabel, Skeleton } from '@/components/ui/skeleton';

import { useAdminSession } from './session';
import { AdminShell } from './shell';

/** Redirects to /admin/login when signed out; shows a shell-shaped skeleton while the session restores. */
export function AdminConsoleGate({ children }: { children: React.ReactNode }) {
  const { status } = useAdminSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === 'signed_out') {
      const next = pathname && pathname !== '/admin' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/admin/login${next}`);
    }
  }, [status, router, pathname]);

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
