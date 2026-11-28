'use client';

import Link from 'next/link';
import * as React from 'react';

import { ShellOverride } from '@/components/shell/shell-overrides';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import {
  useMyEntries,
  usePoolSnapshot,
  useRegion,
  useServerNow,
  useViewerBalance,
} from '@/lib/data/hooks';
import { HOME_PREVIEW_FLAGS, type HomePreview } from '@/lib/home-preview';
import { cn } from '@/lib/utils';

import { ActivitySection } from './activity';
import { FairnessSection } from './fairness';
import { FaqSection } from './faq';
import { GamesSection } from './games';
import { HeroSection } from './hero';
import { HomeViewProvider, type HomeView } from './home-context';
import { HowItWorksSection, NetworksSection, SecuritySection } from './info-sections';
import { PoolLiveSection } from './pool-live';
import { AffiliateSection, VipSection } from './programs';

/**
 * PUB-01 Homepage (public lobby). Sections H1–H11 here; H12 is the shell's FooterMega.
 * State: viewer from auth (or the dev `?state=` preview), region gate from GET /compliance/region,
 * round scenario from the pool snapshot. See src/lib/home-preview.ts for the preview flags.
 */
export function HomePage({
  preview,
  previewEnabled,
}: {
  preview: HomePreview;
  previewEnabled: boolean;
}) {
  const auth = useAuth();
  const scenario = preview.scenario;
  const viewer: HomeView['viewer'] =
    preview.viewer ?? (auth.status === 'member' ? 'member' : 'guest');
  const region = useRegion(scenario);
  const restricted = region.data ? !region.data.permitted : false;
  const snapshotQuery = usePoolSnapshot(scenario);
  const snapshot = snapshotQuery.data;
  const roundNumber = snapshot?.current?.number ?? 0;
  const myEntries = useMyEntries(roundNumber, viewer === 'member' && roundNumber > 0);
  const balance = useViewerBalance(viewer === 'member');
  const now = useServerNow(snapshot?.serverNow, snapshotQuery.dataUpdatedAt);

  const shellOverride = (
    <ShellOverride
      restricted={restricted}
      previewMember={preview.viewer === 'member'}
      previewGuest={preview.viewer === 'guest'}
    />
  );

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {shellOverride}
        <Skeleton className="h-[344px] rounded-xl" />
        <Skeleton className="h-[152px] rounded-xl" />
      </div>
    );
  }

  const view: HomeView = {
    viewer,
    restricted,
    countryName: region.data?.countryName ?? null,
    scenario,
    snapshot,
    // Real clock in both data sources: the API serves (shifted) real close times and the mock is shifted to the
    // next 20:00 UTC (lib/data/demo-clock.ts), so countdowns never anchor to a fixed DEMO moment.
    demoNow: undefined,
    now,
    myEntries: myEntries.data,
    balance: balance.data,
    signIn: auth.signIn,
    signUp: auth.signUp,
  };

  return (
    <HomeViewProvider value={view}>
      {shellOverride}
      <div className="flex flex-col gap-14 laptop:gap-16">
        <HeroSection />
        <PoolLiveSection />
        <GamesSection />
        <ActivitySection />
        <HowItWorksSection />
        <NetworksSection />
        <FairnessSection />
        <SecuritySection />
        <VipSection />
        <AffiliateSection />
        <FaqSection />
        {previewEnabled && <PreviewSwitcher active={preview.flags} />}
      </div>
    </HomeViewProvider>
  );
}

/** Dev-only: links to every homepage state (see src/lib/home-preview.ts). Not rendered in production. */
function PreviewSwitcher({ active }: { active: readonly string[] }) {
  const options: { label: string; state: string | null }[] = [
    { label: 'Default', state: null },
    ...HOME_PREVIEW_FLAGS.map((f) => ({ label: f, state: f })),
    { label: 'member,no-round', state: 'member,no-round' },
  ];
  const current = active.join(',');
  return (
    <nav
      aria-label="Dev state preview"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border-strong p-3 text-caption text-text-tertiary"
    >
      <span className="font-mono">dev · ?state=</span>
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.state ? `/?state=${o.state}` : '/'}
          aria-current={(o.state ?? '') === current ? 'page' : undefined}
          className={cn(
            'rounded-full border border-border-default px-2.5 py-1 font-mono hover:text-text-primary',
            (o.state ?? '') === current && 'border-border-brand text-text-brand',
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
