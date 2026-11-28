import * as React from 'react';

import { cn } from '@/lib/utils';

/** Loading placeholder with the token skeleton gradient (shimmer stops under prefers-reduced-motion). */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'animate-shimmer rounded-sm bg-gradient-skeleton bg-[length:200%_100%] motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

/** Screen-reader announcement for a loading region (pair with Skeleton blocks). */
export function LoadingLabel({ children = 'Loading…' }: { children?: React.ReactNode }) {
  return (
    <span role="status" className="sr-only">
      {children}
    </span>
  );
}
