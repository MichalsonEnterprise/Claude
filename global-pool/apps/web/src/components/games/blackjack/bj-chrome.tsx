'use client';

import { formatAmount } from '@gp/shared/money';
import { BookOpen, Coins, History, Layers, LogIn, Percent, ShieldCheck, Star } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GameArt, TILE_GRADIENT_CLASS } from '@/components/brand/game-art';
import {
  GameSessionBar,
  KitChip,
  LicenceLine,
  PromptCard,
  useGameGate,
  GAMES_ROUTES,
} from '@/components/games/kit';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button, IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { useFavourites, useToggleFavourite } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { INFO, SLUG } from './bj-math';
import { BJ_ROUTES } from './routes';

export type BjTab = 'play' | 'my-hands' | 'rules' | 'fairness';

const TABS: { id: BjTab; label: string; href: string }[] = [
  { id: 'play', label: 'Play', href: BJ_ROUTES.play },
  { id: 'my-hands', label: 'My hands', href: BJ_ROUTES.myHands },
  { id: 'rules', label: 'Rules', href: BJ_ROUTES.rules },
  { id: 'fairness', label: 'Fairness', href: BJ_ROUTES.fairness },
];

function FavouriteToggle() {
  const member = useAuth().status === 'member';
  const favs = useFavourites();
  const toggle = useToggleFavourite();
  const on = !!favs.data?.some((f) => f.slug === SLUG);
  if (!member) return null;
  return (
    <IconButton
      variant="secondary"
      label={on ? 'Remove Twenty-One from favourites' : 'Add Twenty-One to favourites'}
      aria-pressed={on}
      className="size-11"
      onClick={() => toggle.mutate({ slug: SLUG, on: !on })}
      disabled={toggle.isPending}
    >
      <Star aria-hidden className={cn(on && 'fill-current text-icon-gold')} />
    </IconButton>
  );
}

/** Play · My hands · Rules · Fairness (pill tabs, BJ frames). */
export function BjTabs({ active, className }: { active: BjTab; className?: string }) {
  return (
    <nav aria-label="Twenty-One" className={cn('no-scrollbar overflow-x-auto', className)}>
      <ul className="flex min-w-max items-center gap-1">
        {TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={t.id === active ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-full border border-transparent px-4 text-label-l text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus',
                t.id === active && 'border-border-brand bg-brand-tint text-text-brand',
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Twenty-One header (BJ-01 … BJ-08): art tile, breadcrumb, title + "GLOBAL POOL Original · Blackjack", published
 * chips (house edge / RTP, 6 decks · S17 · 3:2, Provably fair, limits in DEMO credits), tabs and favourite.
 * Mobile: compact title row with My hands / Rules shortcuts and two chip rows.
 */
export function BjHeader({ tab, crumb }: { tab: BjTab; crumb?: string }) {
  const limits = `${formatAmount(INFO.minBet)} – ${formatAmount(INFO.maxBet)} DEMO`;
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-3 tablet:gap-4">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg tablet:size-16',
            TILE_GRADIENT_CLASS.mint,
          )}
        >
          <GameArt game="twenty-one" className="size-12 tablet:size-16" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <nav aria-label="Breadcrumb" className="hidden tablet:block">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-tertiary">
              <li>
                <Link href={GAMES_ROUTES.lobby} className="hover:text-text-primary">
                  Casino
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={`${GAMES_ROUTES.lobby}?category=table`} className="hover:text-text-primary">
                  Table games
                </Link>
              </li>
              <li aria-hidden>/</li>
              {crumb ? (
                <>
                  <li>
                    <Link href={BJ_ROUTES.play} className="hover:text-text-primary">
                      Twenty-One
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li aria-current="page" className="text-text-secondary">
                    {crumb}
                  </li>
                </>
              ) : (
                <li aria-current="page" className="text-text-secondary">
                  Twenty-One
                </li>
              )}
            </ol>
          </nav>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 className="text-h4 text-text-primary tablet:text-h3">Twenty-One</h1>
            <span className="hidden text-[11px] font-semibold tracking-[0.08em] text-text-brand uppercase tablet:inline">
              GLOBAL POOL Original · Blackjack
            </span>
            <span className="text-caption text-text-brand tablet:hidden">Blackjack · Original</span>
          </div>
          <div className="hidden flex-wrap items-center gap-2 tablet:flex">
            <KitChip icon={Percent}>
              House edge ≈{INFO.houseEdgePercent}% · RTP ≈{INFO.rtpPercent}%
            </KitChip>
            <KitChip icon={Layers}>6 decks · S17 · Blackjack pays 3:2</KitChip>
            <KitChip icon={ShieldCheck} tone="brand">
              Provably fair
            </KitChip>
            <KitChip icon={Coins}>
              Limits {limits} <DemoBadge size="xs" />
            </KitChip>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 tablet:hidden">
          <IconButton variant="ghost" label="My hands" asChild className="size-11">
            <Link href={BJ_ROUTES.myHands}>
              <History aria-hidden />
            </Link>
          </IconButton>
          <IconButton variant="ghost" label="Rules" asChild className="size-11">
            <Link href={BJ_ROUTES.rules}>
              <BookOpen aria-hidden />
            </Link>
          </IconButton>
        </div>
        <div className="hidden shrink-0 items-center gap-2 laptop:flex">
          <BjTabs active={tab} />
          <FavouriteToggle />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 tablet:hidden">
        <KitChip icon={Percent}>House edge ≈{INFO.houseEdgePercent}%</KitChip>
        <KitChip icon={ShieldCheck}>Provably fair</KitChip>
        <KitChip icon={Coins}>
          {formatAmount(INFO.minBet)}–{formatAmount(INFO.maxBet)} DEMO <DemoBadge size="xs" />
        </KitChip>
      </div>
      <div className="hidden items-center justify-between gap-2 tablet:flex laptop:hidden">
        <BjTabs active={tab} />
        <FavouriteToggle />
      </div>
      {tab !== 'play' && <BjTabs active={tab} className="-mx-4 px-4 tablet:hidden" />}
    </header>
  );
}

/**
 * Frame of the Twenty-One sub-pages (BJ-06 My hands, BJ-07 Rules, BJ-08 Fairness): collapsed sidebar, header with
 * tabs, GM-01 session bar (members), content, licence line. `membersOnly` pages show a sign-in prompt to guests.
 */
export function BjSubpage({
  tab,
  crumb,
  membersOnly = true,
  children,
}: {
  tab: BjTab;
  crumb: string;
  membersOnly?: boolean;
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const gate = useGameGate();
  return (
    <div className="flex flex-col gap-5 tablet:gap-6">
      <ShellOverride collapseSidebar restricted={gate.gate === 'region'} />
      <BjHeader tab={tab} crumb={crumb} />
      {gate.gate !== 'guest' && gate.gate !== 'loading' && tab === 'my-hands' && (
        <GameSessionBar data={gate.credits} lossLimit={gate.lossLimit} />
      )}
      {membersOnly && auth.status === 'guest' ? (
        <div className="flex justify-center py-10">
          <PromptCard
            icon={LogIn}
            title="Sign in to see your hands"
            body="Your Twenty-One hands, seeds and verification live in your account. DEMO credits have no cash value."
            note="18+ · permitted jurisdictions only · you can lose your stake."
            actions={
              <Button className="min-h-11 tablet:min-h-10" onClick={() => auth.signIn()} leadingIcon={<LogIn aria-hidden />}>
                Sign in
              </Button>
            }
          />
        </div>
      ) : (
        children
      )}
      <LicenceLine className="rounded-lg border border-border-subtle px-4 py-3" />
    </div>
  );
}
