'use client';

import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * The lobby behind /sign-in, /sign-up and /verify is decoration under the dimmed scrim: if a lobby section fails
 * to render (e.g. an API shape mismatch) the auth dialog must still work, so errors fall back to a neutral skeleton.
 */
export class LobbyBackdrop extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div aria-hidden className="flex flex-col gap-6">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 tablet:grid-cols-4 laptop:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
}
