'use client';

import { useMediaQuery } from '@/lib/hooks/use-media-query';

/** prefers-reduced-motion: games show the result instantly (no roll / spin / flip animation). */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', false);
}
