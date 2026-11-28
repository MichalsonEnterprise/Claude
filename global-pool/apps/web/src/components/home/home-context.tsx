'use client';

import * as React from 'react';

import { DATA_SOURCE } from '@/lib/data/source';
import type { HomeScenario, MyEntriesView, PoolSnapshot, ViewerBalance } from '@/lib/data/types';

/**
 * True when the member figures that are still mock-only (live-bets "YOU" row, rakeback amount, VIP tier) describe this
 * viewer: only in the mock data source, where the signed-in viewer IS the DEMO player @nova.k. With the API those
 * feeds are not the member's own, so they are never shown as theirs (R37 / Q02).
 */
export function viewerIsDemoPlayer(viewer: 'guest' | 'member'): boolean {
  return viewer === 'member' && DATA_SOURCE !== 'api';
}

/** Resolved homepage view state shared by every section (viewer, region gate, round scenario, clock). */
export interface HomeView {
  viewer: 'guest' | 'member';
  /** Region gate: gaming / deposit CTAs disabled, promotions hidden, withdraw stays available. */
  restricted: boolean;
  countryName: string | null;
  scenario: HomeScenario;
  snapshot: PoolSnapshot;
  /** DEMO clock anchor for countdowns (mock data); undefined → real clock. */
  demoNow: string | undefined;
  /** Server-clock estimate in epoch ms (ticks every second). */
  now: number | null;
  myEntries: MyEntriesView | undefined;
  balance: ViewerBalance | undefined;
  signIn: () => void;
  signUp: () => void;
}

const HomeViewContext = React.createContext<HomeView | null>(null);

export function HomeViewProvider({
  value,
  children,
}: {
  value: HomeView;
  children: React.ReactNode;
}) {
  return <HomeViewContext value={value}>{children}</HomeViewContext>;
}

export function useHomeView(): HomeView {
  const v = React.useContext(HomeViewContext);
  if (!v) throw new Error('useHomeView must be used inside <HomeViewProvider>');
  return v;
}
