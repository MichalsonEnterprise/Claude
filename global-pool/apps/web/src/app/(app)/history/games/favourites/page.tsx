import type { Metadata } from 'next';

import { Favourites } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'Favourites · GLOBAL POOL' };

/** USR-G7 — Favourite games. */
export default function Page() {
  return <Favourites />;
}
