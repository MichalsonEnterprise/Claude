'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { shouldRetryQuery } from '@/lib/api/errors';
import { AuthProvider } from '@/lib/auth';

/** Client providers: TanStack Query, auth (Privy or DEV MOCK), tooltips, toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // One retry for transient failures only (network, timeout, 5xx) — never for 4xx / 429 / 503.
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: shouldRetryQuery },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
