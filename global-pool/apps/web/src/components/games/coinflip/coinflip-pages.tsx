'use client';

import { ArrowLeft, LogIn } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GameArt, TILE_GRADIENT_CLASS } from '@/components/brand/game-art';
import {
  GameSessionBar,
  LicenceLine,
  PromptCard,
  useGameGate,
  GAMES_ROUTES,
} from '@/components/games/kit';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button } from '@/components/ui/button';
import { useGameBets } from '@/lib/api/games';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { SLUG } from './coinflip-math';
import { COINFLIP_ROUTES } from './routes';

export type CoinflipTab = 'play' | 'my-flips' | 'fairness' | 'rules';

/** Play · My flips · Fairness · Rules & payouts (CF-04 / CF-05 tab row). "All flips" is left out: no all-player feed. */
export function CoinflipTabs({ active, className }: { active: CoinflipTab; className?: string }) {
  const count = useGameBets(SLUG, 1, 1);
  const total = count.data?.total;
  const tabs: { id: CoinflipTab; label: string; href: string; count?: number }[] = [
    { id: 'play', label: 'Play', href: COINFLIP_ROUTES.play },
    { id: 'my-flips', label: 'My flips', href: COINFLIP_ROUTES.myFlips, count: total },
    { id: 'fairness', label: 'Fairness', href: COINFLIP_ROUTES.fairness },
    { id: 'rules', label: 'Rules & payouts', href: COINFLIP_ROUTES.details },
  ];
  return (
    <nav
      aria-label="Double Side"
      className={cn('no-scrollbar -mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0', className)}
    >
      <ul className="flex min-w-max gap-6 border-b border-border-subtle">
        {tabs.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={t.id === active ? 'page' : undefined}
              className={cn(
                'relative inline-flex h-12 items-center gap-2 text-label-l text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus',
                t.id === active &&
                  'text-text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand',
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-px text-[11px] font-semibold text-text-on-primary tabular-nums">
                  {t.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Frame of the Double Side sub-pages (CF-04 My flips, CF-05 Fairness): collapsed sidebar, game breadcrumb + title,
 * actions, GM-01 session bar, tab row, content and the licence line. Members only (guests get a sign-in prompt).
 */
export function CoinflipSubpage({
  crumb,
  title,
  chips,
  actions,
  tab,
  children,
}: {
  crumb: string;
  title: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  tab: CoinflipTab;
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const gate = useGameGate();
  return (
    <div className="flex flex-col gap-5 tablet:gap-6">
      <ShellOverride collapseSidebar restricted={gate.gate === 'region'} />
      <header className="flex flex-col gap-4 laptop:flex-row laptop:items-center laptop:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={cn(
              'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg tablet:size-16',
              TILE_GRADIENT_CLASS.amber,
            )}
          >
            <GameArt game="double-side" className="size-14 tablet:size-16" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-tertiary">
                <li>
                  <Link href={GAMES_ROUTES.lobby} className="hover:text-text-primary">
                    Casino games
                  </Link>
                </li>
                <li aria-hidden>›</li>
                <li>
                  <Link href={COINFLIP_ROUTES.play} className="hover:text-text-primary">
                    Double Side
                  </Link>
                </li>
                <li aria-hidden>›</li>
                <li aria-current="page" className="text-text-secondary">
                  {crumb}
                </li>
              </ol>
            </nav>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-h3 text-text-primary">{title}</h1>
              {chips}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            asChild
            className="min-h-11 tablet:min-h-10"
            leadingIcon={<ArrowLeft aria-hidden />}
          >
            <Link href={COINFLIP_ROUTES.play}>Back to game</Link>
          </Button>
        </div>
      </header>

      {gate.gate !== 'guest' && (
        <GameSessionBar
          data={gate.credits}
          lossLimit={gate.lossLimit}
          loading={gate.gate === 'loading'}
        />
      )}

      <CoinflipTabs active={tab} />

      {auth.status === 'guest' ? (
        <div className="flex justify-center py-10">
          <PromptCard
            icon={LogIn}
            title="Sign in to see your flips"
            body="Your Double Side flips, seeds and verification live in your account. DEMO credits have no cash value."
            note="18+ · permitted jurisdictions only · you can lose your stake."
            actions={
              <Button
                className="min-h-11 tablet:min-h-10"
                onClick={() => auth.signIn()}
                leadingIcon={<LogIn aria-hidden />}
              >
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
