import { formatCount } from '@gp/shared/format';
import { Lock, Play, Users } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {
  GAME_TILE_GRADIENT,
  GameArt,
  TILE_GRADIENT_CLASS,
  isGameArtKey,
  type GameArtKey,
  type TileGradient,
} from '@/components/brand/game-art';
import { Tag } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

export interface GameTileProps {
  /** Art key / slug of an original game (see GameArt). Other slugs need `art` (+ `gradient`). */
  game: GameArtKey | (string & {});
  /** Custom tile art for games without a GameArt key (120×120 SVG drawn like GameArt). */
  art?: React.ReactNode;
  /** Tile gradient when `game` is not a GameArt key (default sky). */
  gradient?: TileGradient;
  /** Honest "Coming soon" state: tag + hover "Coming soon · Details" instead of Play (no engine / play screen yet). */
  comingSoon?: boolean;
  name: string;
  /** Line under the name, e.g. "GLOBAL POOL ORIGINAL", "JACKPOT ROUNDS". */
  subtitle?: string;
  href: string;
  /** House edge / fee disclosure shown on hover (always present in the accessible name). */
  edgeLabel: string;
  /** DEMO player count (badge top-right). */
  players?: number | null;
  demo?: boolean;
  tag?: 'live' | 'hot' | 'new';
  /** Region restriction: scrim + lock, no Play, no players badge. */
  restricted?: boolean;
  size?: 'm' | 's';
  /** Static preview of the hover/focus state (design-system QA only). */
  previewHover?: boolean;
  className?: string;
}

/**
 * Tile/Game (portrait 3:4, 160×213 at M / 100×133 at S): original SVG art on the tile gradient, players badge
 * + DEMO, hover/focus = mint border + Play + house-edge chip, restricted state. The whole tile is one link.
 */
export function GameTile({
  game,
  art,
  gradient: gradientProp,
  comingSoon = false,
  name,
  subtitle = 'GLOBAL POOL ORIGINAL',
  href,
  edgeLabel,
  players,
  demo = true,
  tag,
  restricted = false,
  size = 'm',
  previewHover = false,
  className,
}: GameTileProps) {
  const artKey = isGameArtKey(game) ? game : null;
  const gradient = TILE_GRADIENT_CLASS[artKey ? GAME_TILE_GRADIENT[artKey] : (gradientProp ?? 'sky')];
  const small = size === 's';
  const accessibleName = [
    name,
    edgeLabel,
    players != null && !restricted
      ? `${formatCount(players)} players${demo ? ' (demo)' : ''}`
      : null,
    restricted ? 'Not available in your region' : null,
    comingSoon && !restricted ? 'Coming soon' : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const body = (
    <>
      <div className={cn('absolute inset-0', gradient)} />
      {artKey ? (
        <GameArt
          game={artKey}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 transition-transform duration-200 ease-standard',
            small ? 'top-1 w-[88%]' : 'top-3 w-[86%]',
            !restricted && 'group-hover/tile:-translate-y-1 group-hover/tile:scale-[1.03]',
            restricted && 'opacity-35',
          )}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            'absolute left-1/2 -translate-x-1/2 transition-transform duration-200 ease-standard [&>svg]:h-auto [&>svg]:w-full',
            small ? 'top-1 w-[88%]' : 'top-3 w-[86%]',
            !restricted && 'group-hover/tile:-translate-y-1 group-hover/tile:scale-[1.03]',
            (restricted || comingSoon) && 'opacity-50',
          )}
        >
          {art}
        </div>
      )}
      {/* legibility shade for the title */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink-950/85 via-ink-950/45 to-transparent" />

      {!small && (tag || comingSoon || (players != null && !restricted)) && (
        <div className="absolute inset-x-2 top-2 flex items-center gap-1">
          {comingSoon && !restricted ? (
            <Tag tone="neutral" className="h-[18px]">
              Soon
            </Tag>
          ) : (
            tag && (
              <Tag tone={tag === 'hot' ? 'danger' : 'brand'} className="h-[18px]">
                {tag}
              </Tag>
            )
          )}
          {players != null && !restricted && (
            <span className="ml-auto inline-flex h-[18px] items-center gap-1 rounded-xs bg-ink-950/70 pr-0.5 pl-1.5 text-[11px] font-semibold text-text-primary tabular-nums">
              <Users aria-hidden className="size-3" />
              {formatCount(players)}
              {demo && <DemoBadge size="xs" className="ml-0.5 h-3.5 bg-transparent" />}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 text-center',
          small ? 'px-1.5 pb-2' : 'px-2 pb-3',
        )}
      >
        <p
          className={cn(
            'font-bold uppercase leading-tight tracking-[-0.01em] text-text-primary [text-wrap:balance]',
            small ? 'text-[11px]' : 'text-[18px]',
          )}
        >
          {name}
        </p>
        {!small && subtitle && (
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>

      {restricted ? (
        <>
          <div className="absolute inset-0 bg-scrim-strong" />
          <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center gap-2 px-3 text-center bottom-[30%]">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink-950/80 text-icon-default">
              <Lock aria-hidden className="size-5" />
            </span>
            {!small && (
              <p className="text-label-s text-text-primary">Not available in your region</p>
            )}
          </div>
        </>
      ) : (
        !small && (
          <div
            aria-hidden
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/55 opacity-0 transition-opacity duration-150 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100',
              previewHover && 'opacity-100',
            )}
          >
            {comingSoon ? (
              <span className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border-strong bg-ink-950/80 px-4 text-label-m text-text-primary">
                Coming soon · Details
              </span>
            ) : (
              <span className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-5 text-label-m text-text-on-primary">
                <Play aria-hidden className="size-4 fill-current" />
                {game === 'global-pool' ? 'Enter' : 'Play'}
              </span>
            )}
            <span className="rounded-full bg-ink-950/80 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              {edgeLabel}
            </span>
          </div>
        )
      )}
    </>
  );

  const frame = cn(
    'group/tile relative block shrink-0 overflow-hidden rounded-lg border-2 border-transparent bg-surface-default outline-none',
    'aspect-[3/4] transition-[border-color,box-shadow] duration-150 ease-standard',
    small ? 'w-[100px] rounded-md' : 'w-40',
    !restricted &&
      'hover:border-brand focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
    previewHover && 'border-brand',
    className,
  );

  if (restricted) {
    return (
      <div role="group" aria-label={accessibleName} aria-disabled="true" className={frame}>
        {body}
      </div>
    );
  }
  return (
    <Link href={href} aria-label={accessibleName} className={frame}>
      {body}
    </Link>
  );
}
