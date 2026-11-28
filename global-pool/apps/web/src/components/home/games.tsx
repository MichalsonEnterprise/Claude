'use client';

import { formatRoundNumber, formatTimeUTC } from '@gp/shared/format';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Gamepad2,
  ShieldCheck,
  ShieldHalf,
  Spade,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { isGameArtKey, type GameArtKey } from '@/components/brand/game-art';
import { GameTile } from '@/components/domain/game-tile';
import { AgeBadge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/components/shell/nav-config';
import { useGames } from '@/lib/data/hooks';
import type { GameView } from '@/lib/data/types';
import { cn } from '@/lib/utils';

import { CardsChipsArt, CrownArt, CurveArt, DicePairArt, PoolBallArt, ShieldCheckArt } from './art';
import { useHomeView } from './home-context';
import { HomeSection } from './primitives';

interface TileSpec {
  slug: GameArtKey;
  tag?: 'live' | 'hot' | 'new';
  subtitle?: string;
}

const ORIGINALS: TileSpec[] = [
  { slug: 'global-pool', tag: 'live', subtitle: 'JACKPOT ROUNDS' },
  { slug: 'orbit-rush', tag: 'hot' },
  { slug: 'vault-sweeper' },
  { slug: 'skyline', tag: 'new' },
  { slug: 'pinfall' },
  { slug: 'fortune-ring' },
  { slug: 'pool-dice' },
  { slug: 'double-side' },
];

const LIVE = 'LIVE · ILLUSTRATED';
const TABLE_LIVE: TileSpec[] = [
  { slug: 'live-pool-roulette', tag: 'live', subtitle: LIVE },
  { slug: 'pool-roulette' },
  { slug: 'twenty-one' },
  { slug: 'mega-ring-show', tag: 'live', subtitle: LIVE },
  { slug: 'baccarat-lounge' },
  { slug: 'speed-twenty-one', tag: 'new', subtitle: LIVE },
  { slug: 'sic-bo-triad' },
  { slug: 'dragon-and-phoenix' },
];

/** Horizontal tile rail (Row/Carousel Header + track + scroll indicator). */
function GameRail({
  id,
  title,
  allHref,
  specs,
  games,
}: {
  id: string;
  title: string;
  allHref: string;
  specs: TileSpec[];
  games: GameView[] | undefined;
}) {
  const { restricted } = useHomeView();
  const track = React.useRef<HTMLUListElement>(null);
  const [pos, setPos] = React.useState({ start: true, end: false, ratio: 0, visible: 0.6 });

  const update = React.useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPos({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft >= max - 2,
      ratio: max > 0 ? el.scrollLeft / max : 0,
      visible: el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
    });
  }, []);

  React.useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, games]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(172, el.clientWidth - 172), behavior: 'smooth' });
  };

  const bySlug = new Map((games ?? []).map((g) => [g.slug, g]));
  const tiles = specs.flatMap((s) => {
    const g = bySlug.get(s.slug);
    return g ? [{ spec: s, game: g }] : [];
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="text-h5 text-text-primary">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="s" asChild>
            <Link href={allHref} aria-label={`All — ${title}`}>
              All
            </Link>
          </Button>
          <IconButton
            variant="secondary"
            size="s"
            label={`Previous — ${title}`}
            disabled={pos.start}
            onClick={() => page(-1)}
            className="hidden tablet:inline-flex"
          >
            <ChevronLeft aria-hidden />
          </IconButton>
          <IconButton
            variant="secondary"
            size="s"
            label={`Next — ${title}`}
            disabled={pos.end}
            onClick={() => page(1)}
            className="hidden tablet:inline-flex"
          >
            <ChevronRight aria-hidden />
          </IconButton>
        </div>
      </div>
      <ul
        ref={track}
        onScroll={update}
        aria-labelledby={id}
        className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:scroll-px-0 tablet:px-0"
      >
        {games
          ? tiles.map(({ spec, game }) => (
              <li key={spec.slug} className="snap-start">
                <GameTile
                  game={spec.slug}
                  name={game.name}
                  subtitle={
                    spec.subtitle ??
                    (game.category === 'jackpot' ? 'JACKPOT ROUNDS' : 'GLOBAL POOL ORIGINAL')
                  }
                  href={game.category === 'jackpot' ? ROUTES.pool : ROUTES.game(game.slug)}
                  edgeLabel={game.edgeLabel}
                  players={game.players}
                  demo={Boolean(game.isDemo)}
                  tag={restricted ? undefined : spec.tag}
                  restricted={restricted}
                />
              </li>
            ))
          : Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <Skeleton className="aspect-[3/4] w-40 rounded-lg" />
              </li>
            ))}
      </ul>
      <div aria-hidden className="mx-auto h-1 w-16 overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-ink-300"
          style={{
            width: `${pos.visible * 100}%`,
            transform: `translateX(${(pos.ratio * (1 - pos.visible) * 100) / pos.visible}%)`,
          }}
        />
      </div>
    </div>
  );
}

// ── category tiles (Tile/Category) ──────────────────────────────────────────────────────────────

type Tone = 'gold' | 'mint' | 'red' | 'violet' | 'sky' | 'amber';

const TONE_BG: Record<Tone, string> = {
  gold: 'bg-[linear-gradient(100deg,var(--color-gold-900)_0%,var(--color-gold-900)_38%,var(--color-gold-500)_100%)]',
  mint: 'bg-[linear-gradient(100deg,var(--color-mint-950)_0%,var(--color-mint-950)_38%,var(--color-mint-500)_100%)]',
  red: 'bg-[linear-gradient(100deg,var(--color-red-950)_0%,var(--color-red-950)_38%,var(--color-red-500)_100%)]',
  violet:
    'bg-[linear-gradient(100deg,var(--color-violet-950)_0%,var(--color-violet-950)_38%,var(--color-violet-600)_100%)]',
  sky: 'bg-[linear-gradient(100deg,var(--color-sky-950)_0%,var(--color-sky-950)_38%,var(--color-sky-500)_100%)]',
  amber:
    'bg-[linear-gradient(100deg,var(--color-amber-950)_0%,var(--color-amber-950)_38%,var(--color-gold-strong)_100%)]',
};

const TONE_ICON: Record<Tone, string> = {
  gold: 'text-icon-gold',
  mint: 'text-icon-brand',
  red: 'text-icon-brand',
  violet: 'text-icon-brand',
  sky: 'text-icon-brand',
  amber: 'text-icon-gold',
};

function CategoryTile({
  tone,
  icon: Icon,
  title,
  description,
  chip,
  href,
  art,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  chip: string;
  href: string;
  art: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        'group/cat relative isolate flex min-h-[180px] flex-col overflow-hidden rounded-xl border border-border-subtle px-6 py-5 transition-[border-color] duration-150 hover:border-border-strong',
        TONE_BG[tone],
      )}
    >
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[46%]">
        {art}
      </div>
      <p className="flex items-center gap-1.5 text-overline tracking-[0.08em] text-text-secondary uppercase">
        <Icon aria-hidden className={cn('size-3.5', TONE_ICON[tone])} /> Category
      </p>
      <h3 className="mt-2 text-h3 text-text-primary">{title}</h3>
      <p className="mt-1 max-w-[64%] text-body-s text-text-secondary">{description}</p>
      <Link
        href={href}
        className="mt-auto inline-flex h-7 w-fit items-center gap-1.5 rounded-full border border-border-strong bg-ink-950/60 px-3 text-label-s text-text-primary transition-colors after:absolute after:inset-0 hover:border-ink-400"
      >
        {chip} <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </article>
  );
}

function Categories({ games }: { games: GameView[] | undefined }) {
  const { snapshot } = useHomeView();
  const count = (pred: (g: GameView) => boolean) => (games ?? []).filter(pred).length;
  const originals = count((g) => g.category === 'originals');
  const table = count((g) => g.category === 'table' || g.category === 'live');
  const instant = count((g) =>
    [
      'orbit-rush',
      'orbit-rush-duel',
      'skyline',
      'pinfall',
      'fortune-ring',
      'pool-dice',
      'double-side',
      'vault-sweeper',
    ].includes(g.slug),
  );
  const round = snapshot.current;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-h5 text-text-primary">Browse by category</h3>
      <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3">
        <CategoryTile
          tone="gold"
          icon={CircleDollarSign}
          title="Global Pool"
          description="One global jackpot round, drawn by Chainlink VRF"
          chip={
            round
              ? `Round ${formatRoundNumber(round.number)} open`
              : `Next round ${formatTimeUTC(snapshot.next.opensAt)}`
          }
          href={ROUTES.pool}
          art={<PoolBallArt className="absolute top-1/2 right-[-4%] w-[150px] -translate-y-1/2" />}
        />
        <CategoryTile
          tone="mint"
          icon={Gamepad2}
          title="Originals"
          description={`${originals} in-house games, house edge from 1.00%`}
          chip={`${originals} games`}
          href={ROUTES.originals}
          art={<DicePairArt className="absolute top-1/2 right-[2%] w-[150px] -translate-y-1/2" />}
        />
        <CategoryTile
          tone="red"
          icon={Spade}
          title="Table games"
          description="Roulette, blackjack, baccarat, sic bo and live tables"
          chip={`${table} games`}
          href={ROUTES.category('table')}
          art={<CardsChipsArt className="absolute right-[-2%] bottom-2 w-[160px]" />}
        />
        <CategoryTile
          tone="violet"
          icon={Zap}
          title="Instant games"
          description="Orbit Rush, Skyline, Pinfall — results in seconds"
          chip={`${instant} games`}
          href={ROUTES.originals}
          art={<CurveArt className="absolute inset-0 h-full w-full" />}
        />
        <CategoryTile
          tone="sky"
          icon={ShieldHalf}
          title="Provably fair"
          description="Verify every draw and every bet yourself"
          chip="Open verifier"
          href={ROUTES.provablyFair}
          art={
            <ShieldCheckArt className="absolute top-1/2 right-[-4%] w-[150px] -translate-y-1/2" />
          }
        />
        <CategoryTile
          tone="amber"
          icon={Crown}
          title="VIP Club"
          description="5 tiers · weekly reward up to 0.5% of entries"
          chip="Bronze → Diamond"
          href={ROUTES.vip}
          art={<CrownArt className="absolute top-1/2 right-[2%] w-[150px] -translate-y-1/2" />}
        />
      </div>
    </div>
  );
}

/** H3 Available games: Originals + Table & live rails, categories, house-edge / licence note. */
export function GamesSection() {
  const { restricted } = useHomeView();
  const games = useGames();
  const valid = games.data?.filter((g) => isGameArtKey(g.slug));
  return (
    <HomeSection id="games" className="gap-8">
      <h2 id="games-title" className="sr-only">
        Games
      </h2>
      <GameRail
        id="originals-title"
        title="GLOBAL POOL Originals"
        allHref={ROUTES.originals}
        specs={ORIGINALS}
        games={valid}
      />
      <GameRail
        id="table-live-title"
        title="Table games & live"
        allHref={ROUTES.category('table')}
        specs={TABLE_LIVE}
        games={valid}
      />
      {!restricted && <Categories games={games.data} />}
      <p className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-default px-4 py-3 text-caption text-text-secondary">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-icon-muted" />
        <span className="flex-1">
          House edge or RTP is shown on every tile before you play · Outcomes are provably fair
          (seed commit/reveal) or drawn with Chainlink VRF · Games require an applicable licence and
          are available only in permitted jurisdictions · 18+
        </span>
        <AgeBadge />
      </p>
    </HomeSection>
  );
}
