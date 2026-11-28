'use client';

import { formatAmount } from '@gp/shared/money';
import { formatCount, formatDateTimeUTC } from '@gp/shared/format';
import type { GameCategory } from '@gp/shared/enums';
import {
  ArrowRight,
  CircleDollarSign,
  Coins,
  Gamepad2,
  Heart,
  LayoutGrid,
  ListFilter,
  Percent,
  Play,
  ShieldCheck,
  Spade,
  Ticket,
  Tv,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { GameArt, TILE_GRADIENT_CLASS } from '@/components/brand/game-art';
import { GameTile } from '@/components/domain/game-tile';
import { CREDITS_LABEL, GAMES_ROUTES, GAME_COPY, playStateOf } from '@/components/games/kit';
import { useCurrentRound, useRegionStatus } from '@/components/pool/use-pool';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameCatalogue, type CatalogueGame } from '@/lib/api/games';
import { statePreviewEnabled } from '@/lib/home-preview';
import { useFavourites } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { tileArtFor } from './tile-art';

/** Lobby tabs: Draws & bingo share one tab (PUB-03); GM-02 lists them as one section too. */
export type LobbyTab = 'all' | 'jackpot' | 'originals' | 'table' | 'slots' | 'live' | 'draws';

const TABS: { id: LobbyTab; label: string; icon: LucideIcon; cats: GameCategory[] }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid, cats: [] },
  { id: 'jackpot', label: 'Jackpot', icon: CircleDollarSign, cats: ['jackpot'] },
  { id: 'originals', label: 'Originals', icon: Zap, cats: ['originals'] },
  { id: 'table', label: 'Table', icon: Spade, cats: ['table'] },
  { id: 'slots', label: 'Slots', icon: Gamepad2, cats: ['slots'] },
  { id: 'live', label: 'Live', icon: Tv, cats: ['live'] },
  { id: 'draws', label: 'Draws & bingo', icon: Ticket, cats: ['draws', 'bingo'] },
];

const SECTIONS: { id: Exclude<LobbyTab, 'all' | 'jackpot'>; title: string; note: (g: CatalogueGame[]) => string }[] = [
  { id: 'originals', title: 'GLOBAL POOL Originals', note: (g) => `${g.length} games · instant results · ${edgeRange(g)}` },
  { id: 'table', title: 'Table games', note: (g) => `${g.length} games · ${edgeRange(g)}` },
  { id: 'slots', title: 'Slots by GP Studios', note: (g) => `${g.length} games · RTP 96.0–96.7%` },
  { id: 'live', title: 'Live — illustrated tables', note: (g) => `${g.length} tables · no real people, same odds as table games` },
  { id: 'draws', title: 'Draws & bingo', note: (g) => `${g.length} games · scheduled draw times` },
];

type SortKey = 'popular' | 'az' | 'edge';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'popular', label: 'Most played' },
  { id: 'az', label: 'A–Z' },
  { id: 'edge', label: 'House edge (low first)' },
];

function edgeRange(games: CatalogueGame[]): string {
  const edges = games.map((g) => g.houseEdgePercent).filter((e): e is string => !!e);
  if (!edges.length) return 'edge disclosed per game';
  const sorted = [...edges].sort((a, b) => (a.padStart(6, '0') < b.padStart(6, '0') ? -1 : 1));
  const lo = sorted[0]!;
  const hi = sorted[sorted.length - 1]!;
  return lo === hi ? `house edge ${lo}%` : `house edge ${lo}–${hi}%`;
}

const tabOf = (g: CatalogueGame): LobbyTab => (g.category === 'bingo' ? 'draws' : g.category);

const SUBTITLE: Partial<Record<GameCategory, string>> = {
  jackpot: 'JACKPOT ROUNDS',
  originals: 'GLOBAL POOL ORIGINAL',
  table: 'GLOBAL POOL ORIGINAL',
  slots: 'GP STUDIOS',
  live: 'LIVE · ILLUSTRATED',
  draws: 'DRAW',
  bingo: 'BINGO',
};

/** Filters chosen in the lobby (URL: ?category=&q=&fair=1&edge=1&playable=1&fav=1&sort=). */
interface Filters {
  tab: LobbyTab;
  q: string;
  fair: boolean;
  edge: boolean;
  playable: boolean;
  fav: boolean;
  sort: SortKey;
}

export function filterGames(games: CatalogueGame[], f: Filters, favourites: Set<string>): CatalogueGame[] {
  const q = f.q.trim().toLowerCase();
  const out = games.filter((g) => {
    if (f.tab !== 'all' && tabOf(g) !== f.tab) return false;
    if (q && !`${g.name} ${g.mechanic} ${g.category}`.toLowerCase().includes(q)) return false;
    if (f.fair && !g.play.playable && g.category !== 'jackpot') return false;
    if (f.edge && !(g.houseEdgePercent && g.houseEdgePercent.padStart(6, '0') <= '001.00')) return false;
    if (f.playable && playStateOf(g.slug) !== 'playable' && g.slug !== 'global-pool') return false;
    if (f.fav && !favourites.has(g.slug)) return false;
    return true;
  });
  if (f.sort === 'az') out.sort((a, b) => a.name.localeCompare(b.name));
  else if (f.sort === 'edge')
    out.sort((a, b) => (a.houseEdgePercent ?? '99').padStart(6, '0').localeCompare((b.houseEdgePercent ?? '99').padStart(6, '0')));
  else out.sort((a, b) => (b.players ?? -1) - (a.players ?? -1));
  return out;
}

export function tileHref(g: CatalogueGame): string {
  if (g.slug === 'global-pool') return '/pool';
  return playStateOf(g.slug) === 'playable' ? GAMES_ROUTES.play(g.slug) : GAMES_ROUTES.details(g.slug);
}

export function LobbyTile({ game, restricted, size = 'm' }: { game: CatalogueGame; restricted: boolean; size?: 'm' | 's' }) {
  const art = tileArtFor(game.slug);
  const state = playStateOf(game.slug);
  const comingSoon = game.slug !== 'global-pool' && state !== 'playable';
  return (
    <GameTile
      game={'artKey' in art ? art.artKey : game.slug}
      art={'art' in art ? art.art : undefined}
      gradient={'gradient' in art ? art.gradient : undefined}
      name={game.name}
      subtitle={SUBTITLE[game.category]}
      href={tileHref(game)}
      edgeLabel={game.edgeLabel}
      players={game.players}
      demo={Boolean(game.isDemo)}
      restricted={restricted}
      comingSoon={comingSoon}
      tag={!comingSoon && game.slug === 'global-pool' ? 'live' : undefined}
      size={size}
      className="w-full"
    />
  );
}

function Chip({ on, onClick, icon: Icon, children }: { on: boolean; onClick: () => void; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-label-m transition-colors focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
        on
          ? 'border-border-brand bg-brand-tint text-text-brand'
          : 'border-border-default bg-surface-default text-text-secondary hover:border-border-strong hover:text-text-primary',
      )}
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </button>
  );
}

function LobbyBanner({ count }: { count: number }) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
      <div className="relative z-10 flex max-w-[620px] flex-col gap-3 p-5 tablet:p-8">
        <p className="text-overline uppercase text-text-brand">{count} original games · results you can verify</p>
        <h1 className="text-h2 text-text-primary tablet:text-h1">Games lobby</h1>
        <p className="text-body-m text-text-secondary">
          Instant originals, table games, GP Studios slots, illustrated live tables and scheduled draws. Every tile shows its
          house edge or RTP before you play.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-brand bg-brand-tint-subtle px-2.5 text-label-s text-text-brand">
            <ShieldCheck aria-hidden className="size-3.5" />
            Provably fair — verify any result
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-default bg-surface-default px-2.5 text-label-s text-text-secondary">
            <Coins aria-hidden className="size-3.5 text-icon-gold" />
            {CREDITS_LABEL}
          </span>
          <AgeBadge />
        </div>
      </div>
      {/* angled colour block + fanned tile art (concrete objects, cropped by the banner edge) */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] laptop:block">
        <div className="absolute -top-10 right-[-60px] h-[140%] w-[78%] rotate-[14deg] bg-brand-tint" />
        <div className="absolute -top-10 right-[12%] h-[140%] w-3 rotate-[14deg] bg-brand" />
        {(
          [
            ['pool-roulette', 'right-[44%] top-8 -rotate-[10deg]'],
            ['orbit-rush', 'right-[24%] top-4 rotate-[4deg]'],
            ['vault-sweeper', 'right-[4%] top-10 rotate-[12deg]'],
          ] as const
        ).map(([g, pos]) => (
          <div key={g} className={cn('absolute h-[200px] w-[150px] overflow-hidden rounded-lg border-2 border-ink-950 shadow-elevation-3', pos, TILE_GRADIENT_CLASS[g === 'pool-roulette' ? 'red' : g === 'orbit-rush' ? 'violet' : 'sky'])}>
            <GameArt game={g} className="mx-auto mt-4 w-[88%]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function JackpotSpotlight({ restricted }: { restricted: boolean }) {
  const round = useCurrentRound();
  const r = round.data;
  return (
    <section aria-labelledby="lobby-jackpot" className="grid gap-4 rounded-xl border border-border-gold bg-surface-default p-4 tablet:grid-cols-[auto_1fr] tablet:p-5">
      <div className={cn('relative hidden h-[180px] w-[136px] overflow-hidden rounded-lg tablet:block', TILE_GRADIENT_CLASS.gold)}>
        <GameArt game="global-pool" className="mx-auto mt-3 w-[90%]" />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p id="lobby-jackpot" className="flex flex-wrap items-center gap-2 text-overline uppercase text-text-gold">
          Jackpot · Global Pool {r ? `· round #${formatCount(r.number)}` : ''}
          {r?.isDemo && <DemoBadge size="xs" />}
        </p>
        {round.isPending ? (
          <Skeleton className="h-10 w-64" />
        ) : r ? (
          <p className="text-number-l text-text-gold tabular-nums">{formatAmount(r.poolBalance)} USDT</p>
        ) : (
          <p className="text-body-m text-text-secondary">The next round opens soon.</p>
        )}
        {r && (
          <p className="text-body-s text-text-secondary">
            {r.status === 'open' ? `Closes ${formatDateTimeUTC(r.closesAt)}` : r.statusLabel} · {formatCount(r.participants)}{' '}
            participants · drawn on-chain with Chainlink VRF
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="gold" asChild disabled={restricted} className={cn(restricted && 'pointer-events-none opacity-50')}>
            <Link href="/pool" aria-disabled={restricted || undefined}>
              <Ticket aria-hidden />
              Participate
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={GAMES_ROUTES.details('global-pool')}>Rules</Link>
          </Button>
        </div>
        <p className="text-caption text-text-tertiary">
          10.00 USDT + 0.05 USDT platform fee per entry (its own line) · 18+ · you can lose your stake. The Global Pool uses
          your USDT balance — games use DEMO credits only.
        </p>
      </div>
    </section>
  );
}

function CreditsCard() {
  const auth = useAuth();
  return (
    <section className="flex flex-col justify-between gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-overline uppercase text-text-warning">
          <DemoBadge size="xs" /> Simulation mode
        </p>
        <h2 className="text-h4 text-text-primary">Play with 1,000.00 DEMO credits</h2>
        <p className="text-body-s text-text-secondary">{GAME_COPY.noCashValue} No platform fee on game bets.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {auth.status !== 'member' ? (
          <Button onClick={() => auth.signIn()} leadingIcon={<Play aria-hidden />}>
            Sign in to play
          </Button>
        ) : (
          <Button asChild leadingIcon={<Play aria-hidden />}>
            <Link href={GAMES_ROUTES.play('pool-dice')}>Play Pool Dice</Link>
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link href={GAMES_ROUTES.provablyFair}>How provably fair works</Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * Tile grid ≥ 768. Below 768 (MOB patterns): `mobile="grid"` = 2 columns (first `mobileLimit` tiles), `mobile="rail"` =
 * horizontal swipe rail with the next tile peeking.
 */
function TileGrid({
  games,
  restricted,
  label,
  mobile = 'grid',
  mobileLimit,
}: {
  games: CatalogueGame[];
  restricted: boolean;
  label: string;
  mobile?: 'grid' | 'rail';
  mobileLimit?: number;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'tablet:grid tablet:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] tablet:gap-3',
        mobile === 'grid'
          ? 'grid grid-cols-2 gap-3'
          : 'no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 tablet:mx-0 tablet:overflow-visible tablet:px-0',
      )}
    >
      {games.map((g, i) => (
        <li
          key={g.slug}
          className={cn(
            mobile === 'rail' && 'w-[148px] shrink-0 snap-start tablet:w-auto',
            mobileLimit !== undefined && i >= mobileLimit && 'max-tablet:hidden',
          )}
        >
          <LobbyTile game={g} restricted={restricted && g.category !== 'jackpot'} />
        </li>
      ))}
    </ul>
  );
}

/** PUB-03 Games lobby + GM-02 catalogue (category view). DEMO credits only for games; Global Pool uses USDT. */
export function GamesLobby({ previewRestricted = false }: { previewRestricted?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const auth = useAuth();
  const member = auth.status === 'member';
  const cat = useGameCatalogue();
  const region = useRegionStatus();
  const favs = useFavourites();
  const [sheet, setSheet] = React.useState(false);
  // dev-only preview (next dev / NEXT_PUBLIC_STATE_PREVIEW=true): /games?state=restricted
  const preview = statePreviewEnabled && sp.get('state') === 'restricted';
  const restricted = previewRestricted || preview || region.data?.permitted === false;

  const f: Filters = {
    tab: (TABS.find((t) => t.id === sp.get('category'))?.id ?? 'all'),
    q: sp.get('q') ?? '',
    fair: sp.get('fair') === '1',
    edge: sp.get('edge') === '1',
    playable: sp.get('playable') === '1',
    fav: sp.get('fav') === '1',
    sort: (SORTS.find((s) => s.id === sp.get('sort'))?.id ?? 'popular'),
  };
  const [q, setQ] = React.useState(f.q);
  React.useEffect(() => setQ(f.q), [f.q]);

  const set = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === 'all' || (k === 'sort' && v === 'popular')) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, sp],
  );
  // debounce typing into the URL
  React.useEffect(() => {
    if (q === f.q) return;
    const t = window.setTimeout(() => set({ q }), 250);
    return () => window.clearTimeout(t);
  }, [q, f.q, set]);

  const games = cat.data ?? [];
  const favourites = new Set((favs.data ?? []).map((x) => x.slug));
  const shown = filterGames(games, f, favourites);
  const countOf = (t: LobbyTab) => (t === 'all' ? games.length : games.filter((g) => tabOf(g) === t).length);
  const filtering = !!(f.q || f.fair || f.edge || f.playable || f.fav);
  const elsewhere = f.q && f.tab !== 'all' && !shown.length ? filterGames(games, { ...f, tab: 'all' }, favourites) : [];

  const chips = (
    <>
      <Chip on={f.fair} onClick={() => set({ fair: f.fair ? null : '1' })} icon={ShieldCheck}>
        Provably fair
      </Chip>
      <Chip on={f.edge} onClick={() => set({ edge: f.edge ? null : '1' })} icon={Percent}>
        House edge ≤ 1%
      </Chip>
      <Chip on={f.playable} onClick={() => set({ playable: f.playable ? null : '1' })} icon={Play}>
        Playable now
      </Chip>
      {member && (
        <Chip on={f.fav} onClick={() => set({ fav: f.fav ? null : '1' })} icon={Heart}>
          Favourites
        </Chip>
      )}
    </>
  );
  const sortSelect = (
    <Select value={f.sort} onValueChange={(v) => set({ sort: v })}>
      <SelectTrigger size="m" aria-label="Sort games" className="min-h-11 w-full tablet:min-h-10 tablet:w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORTS.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            Sort: {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-6">
      <ShellOverride restricted={restricted || undefined} />
      <nav aria-label="Breadcrumb" className="hidden text-caption text-text-tertiary tablet:block">
        <Link href="/" className="hover:text-text-primary">
          Lobby
        </Link>{' '}
        › <span className="text-text-secondary">Games</span>
      </nav>

      <LobbyBanner count={games.length || 33} />

      {restricted && (
        <section role="alert" className="flex flex-col gap-2 rounded-xl border border-border-danger bg-status-danger-tint p-4">
          <p className="text-body-s-strong text-text-primary">Games aren’t available in your region</p>
          <p className="text-body-s text-text-secondary">
            You can still browse rules and house edges, see your history and withdraw your balance. Please don’t use a VPN
            or proxy to get around this.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="s" variant="secondary" asChild>
              <Link href={GAMES_ROUTES.wallet}>Withdraw funds</Link>
            </Button>
            <Button size="s" variant="ghost" asChild>
              <Link href={GAMES_ROUTES.restrictedCountries}>Restricted countries</Link>
            </Button>
          </div>
        </section>
      )}

      {/* category tabs */}
      <div role="tablist" aria-label="Game categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={f.tab === t.id}
            onClick={() => set({ category: t.id })}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-label-m transition-colors focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-10',
              f.tab === t.id
                ? 'border-border-brand bg-brand-tint text-text-brand'
                : 'border-border-default bg-surface-default text-text-secondary hover:text-text-primary',
            )}
          >
            <t.icon aria-hidden className="size-4" />
            {t.label} · {cat.data ? countOf(t.id) : '…'}
          </button>
        ))}
      </div>

      {/* search, filters, sort */}
      <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ('')}
          placeholder={`Search ${games.length || 33} games`}
          aria-label="Search games"
          groupClassName="w-full laptop:w-[320px]"
          shortcut
        />
        <div className="hidden flex-wrap items-center gap-2 tablet:flex">{chips}</div>
        <div className="hidden laptop:ml-auto tablet:block">{sortSelect}</div>
        <div className="grid grid-cols-2 gap-2 tablet:hidden">
          <Button variant="secondary" className="min-h-11" onClick={() => setSheet(true)} leadingIcon={<ListFilter aria-hidden />}>
            Filters{filtering ? ' · on' : ''}
          </Button>
          {sortSelect}
        </div>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-wrap gap-2">{chips}</SheetBody>
          <SheetFooter>
            <Button
              variant="secondary"
              onClick={() => set({ fair: null, edge: null, playable: null, fav: null })}
              className="min-h-11"
            >
              Clear filters
            </Button>
            <Button onClick={() => setSheet(false)} className="min-h-11">
              Show {shown.length} games
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {cat.isPending ? (
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : cat.isError ? (
        <EmptyState
          type="error"
          title="Couldn’t load the game catalogue"
          description="Check your connection and try again."
          actions={
            <Button variant="secondary" onClick={() => void cat.refetch()}>
              Try again
            </Button>
          }
        />
      ) : f.tab === 'all' && !filtering ? (
        <>
          <div className="grid gap-4 laptop:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <JackpotSpotlight restricted={restricted} />
            <CreditsCard />
          </div>
          {SECTIONS.map((s) => {
            const list = shown.filter((g) => tabOf(g) === s.id);
            if (!list.length) return null;
            const Icon = TABS.find((t) => t.id === s.id)!.icon;
            return (
              <section key={s.id} aria-labelledby={`sec-${s.id}`} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`sec-${s.id}`} className="flex flex-wrap items-baseline gap-2 text-h5 text-text-primary">
                    <Icon aria-hidden className="size-4 translate-y-0.5 text-icon-brand" />
                    {s.title}
                    <span className="text-caption font-normal text-text-tertiary">{s.note(list)}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => set({ category: s.id })}
                    className="inline-flex min-h-11 items-center gap-1 text-label-m text-text-brand hover:underline tablet:min-h-0"
                  >
                    View all {list.length} <ArrowRight aria-hidden className="size-4" />
                  </button>
                </div>
                <TileGrid
                  games={list}
                  restricted={restricted}
                  label={s.title}
                  mobile={s.id === 'originals' ? 'grid' : 'rail'}
                  mobileLimit={s.id === 'originals' ? 4 : undefined}
                />
                {s.id === 'originals' && list.length > 4 && (
                  <Button variant="secondary" className="min-h-11 tablet:hidden" onClick={() => set({ category: s.id })}>
                    Show all {list.length} originals
                  </Button>
                )}
              </section>
            );
          })}
        </>
      ) : shown.length ? (
        <section aria-label="Games" className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h4 text-text-primary">
              {f.tab === 'all' ? 'All games' : SECTIONS.find((s) => s.id === f.tab)?.title ?? 'Jackpot'}
            </h2>
            <p className="text-caption text-text-tertiary" role="status">
              Showing {shown.length} of {countOf(f.tab)} games
            </p>
          </div>
          <TileGrid games={shown} restricted={restricted} label="Games" />
        </section>
      ) : (
        <EmptyState
          type="no-results"
          title={f.q ? `No ${f.tab === 'all' ? '' : `${TABS.find((t) => t.id === f.tab)!.label} `}games match “${f.q}”` : 'No games match these filters'}
          description={
            elsewhere.length
              ? `${elsewhere.length} match${elsewhere.length === 1 ? 'es' : ''} in other categories: ${elsewhere.map((g) => g.name).join(', ')}.`
              : 'Try another name or clear the filters.'
          }
          actions={
            <>
              {elsewhere.length > 0 && (
                <Button variant="secondary" onClick={() => set({ category: 'all' })}>
                  Search all categories
                </Button>
              )}
              <Button variant="ghost" onClick={() => set({ q: null, fair: null, edge: null, playable: null, fav: null })}>
                Clear search
              </Button>
            </>
          }
        />
      )}

      <section className="flex flex-col gap-2 rounded-xl border border-border-subtle p-4 text-caption text-text-tertiary">
        <p className="flex items-start gap-2">
          <AgeBadge />
          <span>{GAME_COPY.licence}</span>
        </p>
        <p>
          Player counts are illustrative (DEMO). House edge or RTP is on every tile and in each game’s rules; results come from
          provably-fair seeds or Chainlink VRF and can be verified after every round. Titles marked “Soon” are not playable in
          this build.
        </p>
      </section>
    </div>
  );
}
