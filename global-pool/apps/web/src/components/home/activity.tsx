'use client';

import { Activity, Ban, ChevronLeft, ChevronRight, Clock, EyeOff } from 'lucide-react';
import * as React from 'react';

import {
  GAME_TILE_GRADIENT,
  GameArt,
  TILE_GRADIENT_CLASS,
  isGameArtKey,
} from '@/components/brand/game-art';
import { GameTile } from '@/components/domain/game-tile';
import { IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/components/shell/nav-config';
import { useLiveBets, useRecentWins } from '@/lib/data/hooks';
import type { LiveBet, LiveBetTab, RecentWin } from '@/lib/data/types';
import { cn } from '@/lib/utils';

import { useHomeView, viewerIsDemoPlayer } from './home-context';
import { HomeSection, LiveDot, PlayerTag, TokenAmount } from './primitives';

// ── recent wins strip (Strip/Recent Wins) ───────────────────────────────────────────────────────

type WinsFilter = 'all' | 'pool' | 'game';

function WinItem({ win }: { win: RecentWin }) {
  if (!isGameArtKey(win.gameSlug)) return null;
  return (
    <li className="flex w-[100px] shrink-0 snap-start flex-col gap-1.5">
      <GameTile
        game={win.gameSlug}
        name={win.gameName}
        size="s"
        href={win.gameSlug === 'global-pool' ? ROUTES.pool : ROUTES.game(win.gameSlug)}
        edgeLabel={`${win.gameName} win`}
        players={null}
        demo={win.isDemo}
      />
      <span className="flex min-w-0 items-center gap-1 text-caption text-text-secondary">
        {win.handle ? (
          <span className="truncate">@{win.handle}</span>
        ) : (
          <>
            <EyeOff aria-hidden className="size-3.5 shrink-0" /> Hidden
          </>
        )}
      </span>
      <TokenAmount
        value={win.amount}
        tone={win.kind === 'pool' ? 'gold' : 'success'}
        className="text-body-m"
        size={14}
      />
    </li>
  );
}

function RecentWinsStrip() {
  const wins = useRecentWins();
  const [filter, setFilter] = React.useState<WinsFilter>('all');
  const track = React.useRef<HTMLUListElement>(null);
  const items = (wins.data ?? []).filter((w) => filter === 'all' || w.kind === filter);
  const page = (dir: 1 | -1) =>
    track.current?.scrollBy({ left: dir * (track.current.clientWidth - 108), behavior: 'smooth' });
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="activity-title" className="flex items-center gap-2.5 text-h5 text-text-primary">
          <LiveDot /> Recent wins
        </h2>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as WinsFilter)}>
          <TabsList variant="segmented" aria-label="Filter recent wins">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pool">Global Pool</TabsTrigger>
            <TabsTrigger value="game">Originals</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          {wins.data?.some((w) => w.isDemo) && <DemoBadge size="m" />}
          <IconButton
            variant="secondary"
            size="s"
            label="Previous wins"
            className="hidden tablet:inline-flex"
            onClick={() => page(-1)}
          >
            <ChevronLeft aria-hidden />
          </IconButton>
          <IconButton
            variant="secondary"
            size="s"
            label="Next wins"
            className="hidden tablet:inline-flex"
            onClick={() => page(1)}
          >
            <ChevronRight aria-hidden />
          </IconButton>
        </div>
      </div>
      <ul
        ref={track}
        aria-label="Recent wins"
        className="no-scrollbar relative flex snap-x snap-mandatory gap-2 overflow-x-auto"
      >
        {wins.data
          ? items.map((w) => <WinItem key={w.id} win={w} />)
          : Array.from({ length: 10 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-[180px] w-[100px] rounded-md" />
              </li>
            ))}
      </ul>
    </div>
  );
}

// ── live bets table (Table/Live Bets) ───────────────────────────────────────────────────────────

function GameCell({ slug, name }: { slug: string; name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      {isGameArtKey(slug) && (
        <span
          aria-hidden
          className={cn(
            'relative flex h-9 w-7 shrink-0 items-end justify-center overflow-hidden rounded-sm',
            TILE_GRADIENT_CLASS[GAME_TILE_GRADIENT[slug]],
          )}
        >
          <GameArt game={slug} className="absolute top-0.5 left-1/2 w-[120%] -translate-x-1/2" />
        </span>
      )}
      <span className="text-label-m whitespace-nowrap text-text-primary">{name}</span>
    </span>
  );
}

function ResultCell({ bet }: { bet: LiveBet }) {
  const r = bet.result;
  if (r.type === 'status') {
    const Icon = r.status === 'cancelled' ? Ban : Clock;
    return (
      <span
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-medium',
          r.status === 'awaiting_draw' && 'bg-status-pending-tint text-status-pending',
          r.status === 'settled' && 'bg-status-success-tint text-text-success',
          r.status === 'cancelled' && 'bg-surface-pressed text-text-secondary',
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        {r.label}
      </span>
    );
  }
  return (
    <TokenAmount
      value={r.amount}
      tone={r.win ? 'success' : 'muted'}
      className="text-body-l"
      size={16}
    />
  );
}

function LiveBetsTable() {
  const { scenario, viewer } = useHomeView();
  const [tab, setTab] = React.useState<LiveBetTab>('latest');
  const [rows, setRows] = React.useState('10');
  const bets = useLiveBets(tab, scenario);
  const data = (bets.data ?? []).slice(0, Number(rows));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as LiveBetTab)}>
          <TabsList variant="segmented" aria-label="Activity view">
            <TabsTrigger value="latest">Latest entries</TabsTrigger>
            <TabsTrigger value="big">Big wins</TabsTrigger>
            <TabsTrigger value="rounds">Round history</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          {bets.data?.some((b) => b.isDemo) && <DemoBadge size="m" />}
          <span className="text-caption text-text-tertiary" id="rows-label">
            Rows
          </span>
          <Select value={rows} onValueChange={setRows}>
            <SelectTrigger size="s" aria-labelledby="rows-label" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-xl border border-border-subtle bg-surface-default px-2 pt-2 pb-4">
        <p className="px-2 pt-1 text-caption text-text-tertiary lg:hidden">
          Swipe the table sideways to see amounts and payouts →
        </p>
        <div className="no-scrollbar relative overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-body-s">
            <caption className="sr-only">
              {tab === 'latest'
                ? 'Latest settled bets and Global Pool entries'
                : tab === 'big'
                  ? 'Biggest recent wins'
                  : 'Global Pool round history'}
            </caption>
            <thead>
              <tr className="text-left text-caption text-text-tertiary">
                <th scope="col" className="h-11 px-4 font-normal">
                  Game
                </th>
                <th scope="col" className="h-11 px-4 font-normal">
                  Player
                </th>
                <th scope="col" className="h-11 px-4 font-normal">
                  Amount
                </th>
                <th scope="col" className="h-11 px-4 font-normal">
                  Multiplier / Round
                </th>
                <th scope="col" className="h-11 px-4 text-right font-normal">
                  Payout / Result
                </th>
              </tr>
            </thead>
            <tbody>
              {bets.data
                ? data.map((b, i) => {
                    const mine = viewerIsDemoPlayer(viewer) && b.handle === 'nova.k';
                    const lost = b.result.type === 'payout' && !b.result.win;
                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          '[&>td]:h-[52px] [&>td]:px-4 [&>td:first-child]:rounded-l-md [&>td:last-child]:rounded-r-md',
                          i % 2 === 0 && '[&>td]:bg-surface-raised/60',
                          mine && '[&>td]:bg-brand-tint-subtle',
                        )}
                      >
                        <td>
                          <GameCell slug={b.gameSlug} name={b.gameName} />
                        </td>
                        <td>
                          <span className="flex items-center gap-2">
                            <PlayerTag
                              handle={b.handle}
                              nameClassName={b.handle ? 'text-text-secondary' : undefined}
                              className="text-body-s"
                            />
                            {mine && (
                              <span className="rounded-full bg-brand-tint px-1.5 text-[10px] font-semibold text-text-brand uppercase">
                                You
                              </span>
                            )}
                          </span>
                        </td>
                        <td>
                          <TokenAmount value={b.amount} className="text-body-l" />
                        </td>
                        <td
                          className={cn(
                            'tabular-nums',
                            b.detail.startsWith('Round')
                              ? 'text-body-s text-text-secondary'
                              : lost
                                ? 'text-text-tertiary'
                                : 'font-semibold text-text-primary',
                          )}
                        >
                          {b.detail}
                        </td>
                        <td className="text-right">
                          <span className="inline-flex items-center gap-2">
                            <ResultCell bet={b} />
                            {b.isDemo && <DemoBadge size="s" />}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                : Array.from({ length: 6 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-2 py-1.5">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-2 px-4 text-caption text-text-tertiary">
          <Activity aria-hidden className="size-4 text-icon-brand" />
          {tab === 'rounds'
            ? 'Settled and cancelled Global Pool rounds · cancelled rounds are refunded to Owed.'
            : `Live · showing the latest ${data.length} settled bets and entries. Hidden = player opted out of public feeds.`}
        </p>
      </div>
    </div>
  );
}

/** H4 Recent winners: wins strip + live bets table. Hidden in restricted regions. */
export function ActivitySection() {
  const { restricted } = useHomeView();
  if (restricted) return null;
  return (
    <HomeSection id="activity" className="gap-6">
      <RecentWinsStrip />
      <LiveBetsTable />
    </HomeSection>
  );
}
