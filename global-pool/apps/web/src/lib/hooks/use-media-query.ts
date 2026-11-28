'use client';

import { useSyncExternalStore } from 'react';

/** Subscribe to a CSS media query. `serverValue` is used during SSR and the first hydration pass. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Token breakpoints (px): tablet 768 · lg 1024 · laptop 1280 · desktop 1440. */
export const MQ = {
  tablet: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  laptop: '(min-width: 1280px)',
  desktop: '(min-width: 1440px)',
} as const;
