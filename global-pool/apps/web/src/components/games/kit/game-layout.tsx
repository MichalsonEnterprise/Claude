'use client';

import { fairGame } from '@gp/shared/fair';
import { BookOpen, History, Percent, ShieldCheck, Star, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button, IconButton } from '@/components/ui/button';
import { useFavourites, useToggleFavourite } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { DemoCreditsChip } from './credits';
import { KitChip, LicenceLine } from './parts';
import { GAMES_ROUTES } from './registry';
import { GameSessionBar } from './session-bar';
import { GameNotice, type GameNoticeKind, type GameNoticeProps } from './states';
import type { GameGateState } from './use-game-gate';

/** Map the gate to the blocking notice shown over the stage (null = play allowed / still loading). */
export function noticeKindOf(gate: GameGateState['gate']): GameNoticeKind | null {
  switch (gate) {
    case 'guest':
    case 'onboarding':
    case 'region':
    case 'self_excluded':
    case 'blocked':
    case 'time_limit':
    case 'loss_limit':
    case 'offline':
      return gate;
    case 'loading':
    case 'ok':
      return null;
  }
}

function FavouriteButton({ slug, name }: { slug: string; name: string }) {
  const member = useAuth().status === 'member';
  const favs = useFavourites();
  const toggle = useToggleFavourite();
  const on = !!favs.data?.some((f) => f.slug === slug);
  if (!member) return null;
  return (
    <IconButton
      variant="secondary"
      label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      aria-pressed={on}
      className="size-11 tablet:size-10"
      onClick={() => toggle.mutate({ slug, on: !on })}
      disabled={toggle.isPending}
    >
      <Star aria-hidden className={cn(on && 'fill-current text-icon-gold')} />
    </IconButton>
  );
}

/** Game header: breadcrumb, title + chips (mechanic · Provably fair · House edge), actions. */
export function GameHeader({
  slug,
  title,
  mechanic,
  icon: Icon,
  category = 'GLOBAL POOL Originals',
  onFairness,
  aside,
}: {
  slug: string;
  title: string;
  mechanic: string;
  icon: LucideIcon;
  category?: string;
  onFairness?: () => void;
  aside?: React.ReactNode;
}) {
  const info = fairGame(slug);
  return (
    <header className="flex flex-col gap-3 laptop:flex-row laptop:items-end laptop:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <nav aria-label="Breadcrumb" className="hidden tablet:block">
          <ol className="flex items-center gap-1.5 text-caption text-text-tertiary">
            <li>
              <Link href={GAMES_ROUTES.lobby} className="hover:text-text-primary">
                Casino games
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href={`${GAMES_ROUTES.lobby}?category=originals`} className="hover:text-text-primary">
                {category}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="text-text-secondary">
              {title}
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Icon aria-hidden className="size-7 text-icon-brand" />
          <h1 className="text-h3 text-text-primary">{title}</h1>
          <KitChip className="hidden tablet:inline-flex">{mechanic}</KitChip>
          <KitChip icon={ShieldCheck} tone="brand">
            Provably fair
          </KitChip>
          {info && (
            <KitChip icon={Percent}>House edge {info.houseEdgePercent}%</KitChip>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {aside}
        <FavouriteButton slug={slug} name={title} />
        <IconButton variant="secondary" label="My bets" asChild className="size-11 tablet:size-10 laptop:hidden">
          <a href="#my-bets">
            <History aria-hidden />
          </a>
        </IconButton>
        <Button
          variant="secondary"
          className="hidden min-h-10 laptop:inline-flex"
          onClick={onFairness}
          leadingIcon={<ShieldCheck aria-hidden />}
        >
          Provably fair
        </Button>
        <IconButton variant="secondary" label="Provably fair — seeds" className="size-11 tablet:size-10 laptop:hidden" onClick={onFairness}>
          <ShieldCheck aria-hidden />
        </IconButton>
        <Button variant="ghost" asChild className="hidden min-h-10 laptop:inline-flex" leadingIcon={<BookOpen aria-hidden />}>
          <Link href={GAMES_ROUTES.details(slug)}>Rules & payouts</Link>
        </Button>
        <IconButton variant="secondary" label="Rules & payouts" asChild className="size-11 tablet:size-10 laptop:hidden">
          <Link href={GAMES_ROUTES.details(slug)}>
            <BookOpen aria-hidden />
          </Link>
        </IconButton>
      </div>
    </header>
  );
}

export interface GameLayoutProps {
  slug: string;
  title: string;
  /** e.g. "Dice · roll over / under". */
  mechanic: string;
  icon: LucideIcon;
  /** From {@link useGameGate}. */
  gate: GameGateState;
  /** A bet / round is in progress (locks reset + seed changes). */
  busy?: boolean;
  /** Overrides the gate notice (e.g. `{ kind: 'reconnecting', … }` from the bet runner). */
  notice?: Partial<GameNoticeProps> & { kind: GameNoticeKind };
  /** Bet controls (left column ≥ 1024, below the stage on mobile). */
  panel: React.ReactNode;
  /** The game visual (right column ≥ 1024, first on mobile). */
  stage: React.ReactNode;
  /** <MobileBetBar> — sticky CTA above the tab bar (< 768). */
  mobileBar?: React.ReactNode;
  /** Left column under the session bar (recent results …). */
  below?: React.ReactNode;
  /** Right column under the session bar (how it works …). */
  aside?: React.ReactNode;
  /** Full-width sections at the end (history, seeds, more games). */
  children?: React.ReactNode;
  /** Open the seeds dialog from the header "Provably fair" action. */
  onFairness?: () => void;
}

/**
 * Shared game shell (BC.GAME-style): collapsed sidebar, header, [bet panel | stage] card, GM-01 session bar, lower
 * sections, licence line, mobile sticky bet bar. Blocking states (guest, region, self-exclusion, limits, offline,
 * reconnecting) are shown over the dimmed, inert stage — the server re-checks every bet anyway.
 */
export function GameLayout({
  slug,
  title,
  mechanic,
  icon,
  gate,
  busy = false,
  notice,
  panel,
  stage,
  mobileBar,
  below,
  aside,
  children,
  onFairness,
}: GameLayoutProps) {
  const kind = notice?.kind ?? noticeKindOf(gate.gate);
  const blocked = kind !== null && kind !== 'reconnecting';
  return (
    <div className={cn('flex flex-col gap-5 tablet:gap-6', mobileBar && 'pb-36 tablet:pb-0')}>
      <ShellOverride collapseSidebar restricted={gate.gate === 'region'} />
      <GameHeader slug={slug} title={title} mechanic={mechanic} icon={icon} onFairness={onFairness} />
      {gate.gate !== 'guest' && (
        <DemoCreditsChip data={gate.credits} loading={gate.gate === 'loading'} disabled={busy} compact className="tablet:hidden" />
      )}
      {gate.gate !== 'guest' && (
        <GameSessionBar
          data={gate.credits}
          lossLimit={gate.lossLimit}
          loading={gate.gate === 'loading'}
          className="tablet:hidden"
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-border-subtle lg:bg-bg-secondary">
        <div
          className={cn(
            'order-2 flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5 lg:order-1 lg:rounded-none lg:border-0 lg:border-r',
            blocked && 'opacity-60',
          )}
          inert={blocked || undefined}
        >
          {gate.gate !== 'guest' && (
            <DemoCreditsChip
              data={gate.credits}
              loading={gate.gate === 'loading'}
              disabled={busy}
              compact
              className="hidden tablet:flex"
            />
          )}
          {panel}
        </div>
        <div className={cn('relative order-1 min-w-0 lg:order-2 lg:p-6', kind && 'min-h-[460px]')}>
          <div className={cn('h-full', kind && 'opacity-25')} inert={kind ? true : undefined} aria-hidden={kind ? true : undefined}>
            {stage}
          </div>
          {kind && (
            <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-3 tablet:items-center tablet:p-6">
              <GameNotice
                kind={kind}
                gameName={title}
                regionName={gate.regionName}
                exclusionEndsAt={gate.exclusionEndsAt}
                lossLimit={gate.lossLimit}
                onRetry={gate.refetch}
                {...notice}
              />
            </div>
          )}
        </div>
      </div>

      {gate.gate !== 'guest' && (
        <GameSessionBar
          data={gate.credits}
          lossLimit={gate.lossLimit}
          loading={gate.gate === 'loading'}
          className="hidden tablet:flex"
        />
      )}

      {(below ?? aside) && (
        <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_400px] tablet:gap-6">
          <div className="flex min-w-0 flex-col gap-5">{below}</div>
          <div className="flex min-w-0 flex-col gap-5">{aside}</div>
        </div>
      )}

      {children}

      <LicenceLine className="rounded-lg border border-border-subtle px-4 py-3" />
      {mobileBar}
    </div>
  );
}

/**
 * Sticky bet bar (< 768): summary line + "You can lose your stake" + the primary CTA, pinned above the tab bar.
 * Render the same CTA inside the panel with `className="hidden tablet:flex"` so each width has exactly one.
 */
export function MobileBetBar({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 z-30 flex flex-col gap-2 border-t border-border-subtle bg-bg-secondary px-4 pt-3 pb-3 tablet:hidden"
      style={{ bottom: 'var(--gp-tabbar-h, 56px)' }}
    >
      <div className="flex items-center justify-between gap-3 text-caption">
        <span className="min-w-0 truncate text-text-secondary">{summary}</span>
        <span className="shrink-0 text-text-tertiary">You can lose your stake</span>
      </div>
      {children}
    </div>
  );
}
