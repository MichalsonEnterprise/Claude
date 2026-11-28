'use client';

import { fairGame } from '@gp/shared/fair';
import { formatAmount } from '@gp/shared/money';
import { formatCount } from '@gp/shared/format';
import {
  BookOpen,
  ChevronLeft,
  CircleCheck,
  Coins,
  Heart,
  Play,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  PauseCircle,
  Ticket,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GameArt, GAME_TILE_GRADIENT, TILE_GRADIENT_CLASS } from '@/components/brand/game-art';
import { CREDITS_LABEL, GAMES_ROUTES, GAME_COPY, MoreGamesRail, playStateOf } from '@/components/games/kit';
import { AgeBadge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCatalogueGame, type CatalogueGame } from '@/lib/api/games';
import { useFavourites, useToggleFavourite } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { contentFor } from './game-content';
import { tileArtFor } from './tile-art';

const CRUMB: Record<string, string> = {
  jackpot: 'Jackpot',
  originals: 'Originals',
  table: 'Table games',
  slots: 'Slots',
  live: 'Live tables',
  draws: 'Draws',
  bingo: 'Bingo',
};

function HeroArt({ slug }: { slug: string }) {
  const art = tileArtFor(slug);
  const gradient =
    'artKey' in art ? TILE_GRADIENT_CLASS[GAME_TILE_GRADIENT[art.artKey]] : TILE_GRADIENT_CLASS[art.gradient];
  return (
    <div aria-hidden className="relative h-[220px] overflow-hidden laptop:h-auto laptop:min-h-[420px]">
      <div className={cn('absolute -top-16 right-[-40px] h-[150%] w-[72%] rotate-[14deg]', gradient)} />
      <div className="absolute -top-16 right-[58%] h-[150%] w-3 rotate-[14deg] bg-brand laptop:right-[66%]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn('w-[46%] max-w-[260px] -rotate-6 overflow-hidden rounded-xl border-2 border-ink-950 shadow-elevation-3', gradient)}>
          {'artKey' in art ? (
            <GameArt game={art.artKey} className="w-full" />
          ) : (
            <div className="[&>svg]:h-auto [&>svg]:w-full">{art.art}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fav({ slug, name }: { slug: string; name: string }) {
  const member = useAuth().status === 'member';
  const favs = useFavourites();
  const toggle = useToggleFavourite();
  if (!member) return null;
  const on = !!favs.data?.some((f) => f.slug === slug);
  return (
    <IconButton
      variant="secondary"
      size="l"
      label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      aria-pressed={on}
      onClick={() => toggle.mutate({ slug, on: !on })}
    >
      <Heart aria-hidden className={cn(on && 'fill-current text-text-danger')} />
    </IconButton>
  );
}

function PlayButton({ game, noPlayScreen, className }: { game: CatalogueGame; noPlayScreen: boolean; className?: string }) {
  if (game.slug === 'global-pool') {
    return (
      <Button variant="gold" size="l" asChild className={className}>
        <Link href="/pool">
          <Ticket aria-hidden />
          Participate
        </Link>
      </Button>
    );
  }
  const state = playStateOf(game.slug);
  // On /games/<slug> itself the static play route does not exist (Next would have served it) → coming soon.
  if (state === 'playable' && !noPlayScreen) {
    return (
      <Button size="l" asChild className={className}>
        <Link href={GAMES_ROUTES.play(game.slug)}>
          <Play aria-hidden />
          Play (DEMO credits)
        </Link>
      </Button>
    );
  }
  return (
    <Button size="l" disabled className={className}>
      {state === 'coming-soon' ? 'Coming soon' : 'Play screen coming soon'}
    </Button>
  );
}

/**
 * PUB-04 Game Details (public, works logged out): hero, at a glance, how to play, payouts (computed with
 * @gp/shared/fair), rules, provably-fair explainer, play / limits rail, RG card, related games.
 * `fallback` = rendered at /games/<slug> because the game has no play screen in this build.
 */
export function GameDetails({ slug, fallback = false }: { slug: string; fallback?: boolean }) {
  const q = useCatalogueGame(slug);
  const g = q.data;
  if (q.isPending)
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  if (q.isError || !g)
    return (
      <EmptyState
        type={q.isError ? 'error' : 'no-results'}
        title={q.isError ? 'Couldn’t load this game' : 'Game not found'}
        description={q.isError ? 'Check your connection and try again.' : 'This game isn’t in the catalogue.'}
        actions={
          <Button asChild variant="secondary">
            <Link href={GAMES_ROUTES.lobby}>Back to the games lobby</Link>
          </Button>
        }
      />
    );

  const info = fairGame(slug);
  const c = contentFor(slug, g.mechanic, g.edgeLabel);
  const pool = slug === 'global-pool';
  const state = playStateOf(slug);
  const noPlayScreen = fallback;
  const comingSoon = !pool && (state !== 'playable' || noPlayScreen);

  return (
    <div className="flex flex-col gap-6 tablet:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="text-caption text-text-tertiary">
          <Link href={GAMES_ROUTES.lobby} className="inline-flex min-h-11 items-center gap-1 hover:text-text-primary tablet:min-h-0">
            <ChevronLeft aria-hidden className="size-4 tablet:hidden" />
            Games
          </Link>
          <span className="hidden tablet:inline">
            {' '}
            ›{' '}
            <Link href={`${GAMES_ROUTES.lobby}?category=${g.category === 'bingo' ? 'draws' : g.category}`} className="hover:text-text-primary">
              {CRUMB[g.category] ?? g.category}
            </Link>{' '}
            › <span className="text-text-secondary">{g.name}</span>
          </span>
        </nav>
        {g.players != null && (
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border-subtle bg-surface-default px-3 text-label-s text-text-primary">
            <span aria-hidden className="size-2 rounded-full bg-status-success" />
            {formatCount(g.players)} {pool ? 'in this round' : 'playing now'}
            {g.isDemo && <DemoBadge size="xs" />}
          </span>
        )}
      </div>

      {/* hero */}
      <section className="grid overflow-hidden rounded-xl border border-border-subtle bg-surface-raised laptop:grid-cols-[minmax(0,1fr)_460px]">
        <div className="order-2 flex flex-col justify-center gap-4 p-5 tablet:p-8 laptop:order-1 laptop:p-10">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-7 items-center rounded-full bg-brand-tint px-2.5 text-label-s text-text-brand uppercase">
              {pool ? 'Jackpot rounds' : `${g.category === 'originals' ? 'GLOBAL POOL original' : CRUMB[g.category]} · ${g.mechanic}`}
            </span>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-subtle px-2.5 text-label-s text-text-secondary">
              <ShieldCheck aria-hidden className="size-3.5 text-icon-brand" />
              {pool ? 'Chainlink VRF draw' : info ? 'Provably fair' : 'Fairness disclosed at launch'}
            </span>
            {comingSoon && (
              <span className="inline-flex h-7 items-center rounded-full border border-status-warning bg-status-warning-tint px-2.5 text-label-s text-text-warning">
                Coming soon — not playable in this build
              </span>
            )}
          </div>
          <h1 className="text-h2 text-text-primary tablet:text-h1">{g.name}</h1>
          <p className="max-w-[560px] text-body-m text-text-secondary tablet:text-body-l">
            {pool
              ? 'One shared USDT pool and one draw a day. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee (its own line); Chainlink VRF picks 13 winning entries on-chain.'
              : c.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {(pool ? ['Entry 10.00 USDT', '+ 0.05 USDT platform fee / entry', '13 prizes per round'] : c.heroFacts).map((h) => (
              <span key={h} className="inline-flex h-8 items-center rounded-full border border-border-default bg-surface-default px-3 text-label-s text-text-primary">
                {h}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PlayButton game={g} noPlayScreen={noPlayScreen} className="w-full tablet:w-auto" />
            {c.steps.length > 0 && (
              <Button variant="secondary" size="l" asChild>
                <a href="#how-to-play">How to play</a>
              </Button>
            )}
            <Fav slug={slug} name={g.name} />
          </div>
          <p className="flex items-start gap-2 text-caption text-text-tertiary">
            <AgeBadge />
            <span>
              You can lose your stake. 18+.{' '}
              {pool
                ? 'Available only in permitted jurisdictions under an applicable licence (DEMO placeholder).'
                : `Games are played with ${CREDITS_LABEL}. ${GAME_COPY.licence}`}
            </span>
          </p>
        </div>
        <div className="order-1 laptop:order-2">
          <HeroArt slug={slug} />
        </div>
      </section>

      {/* at a glance */}
      {c.facts.length > 0 && (
        <section aria-labelledby="glance" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="glance" className="flex items-center gap-2 text-h5 text-text-primary">
              At a glance <DemoBadge size="s" label="DEMO credits" />
            </h2>
            <p className="text-caption text-text-tertiary">Limits are DEMO values. Responsible-gaming limits you set can lower them.</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 laptop:grid-cols-3">
            {c.facts.map(([l, v, sub]) => (
              <div key={l} className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface-default px-4 py-3 tablet:px-5 tablet:py-4">
                <dt className="text-caption text-text-tertiary">{l}</dt>
                <dd className="text-number-m text-text-primary tablet:text-number-l">{v}</dd>
                <dd className="text-caption text-text-secondary">{sub}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="grid gap-6 laptop:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {c.steps.length > 0 && (
            <section id="how-to-play" aria-labelledby="how-h" className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
              <h2 id="how-h" className="flex items-center gap-2 text-h4 text-text-primary">
                <Play aria-hidden className="size-5 text-icon-brand" /> How to play
              </h2>
              <ol className="grid gap-3 tablet:grid-cols-2">
                {c.steps.map(([t, b], i) => (
                  <li key={t} className="flex gap-3 rounded-lg bg-surface-raised p-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-body-m-strong text-text-primary">{t}</p>
                      <p className="text-body-s text-text-secondary">{b}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {c.payouts && (
            <section aria-labelledby="pay-h" className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="pay-h" className="flex items-center gap-2 text-h4 text-text-primary">
                  <Coins aria-hidden className="size-5 text-icon-brand" /> Payouts
                </h2>
                <p className="text-caption text-text-tertiary">{c.payouts.unit}</p>
              </div>
              <div className="overflow-x-auto rounded-md border border-border-subtle">
                <table className="w-full min-w-[480px] text-body-s">
                  <thead className="bg-surface-raised text-left text-caption text-text-tertiary">
                    <tr>
                      {c.payouts.headers.map((h, i) => (
                        <th key={h} scope="col" className={cn('px-4 py-2.5 font-semibold', i >= 2 && 'text-right')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {c.payouts.rows.map((r) => (
                      <tr key={r.join('|')} className="border-t border-border-subtle">
                        <th scope="row" className="px-4 py-2.5 text-left text-body-s-strong text-text-primary">
                          {r[0]}
                        </th>
                        <td className="px-4 py-2.5 text-text-secondary">{r[1]}</td>
                        <td className="px-4 py-2.5 text-right text-text-brand tabular-nums">{r[2]}</td>
                        <td className="px-4 py-2.5 text-right text-text-primary tabular-nums">{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-caption text-text-tertiary">{c.payouts.foot}</p>
            </section>
          )}

          <section aria-labelledby="rules-h" className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
            <h2 id="rules-h" className="flex items-center gap-2 text-h4 text-text-primary">
              <BookOpen aria-hidden className="size-5 text-icon-brand" /> Rules summary
            </h2>
            <ul className="flex flex-col gap-2.5">
              {(pool
                ? [
                    'One round per day: opens 08:00 UTC, closes 20:00 UTC. No entries are accepted after the close.',
                    'Each entry costs 10.00 USDT. The 0.05 USDT platform fee per qualifying entry is charged separately and is never part of the pool.',
                    'A round draws only with at least 500 participants and a 50,000.00 USDT pool; otherwise every entry is refunded.',
                    'Winners are drawn by Chainlink VRF on Arbitrum. Nobody — including GLOBAL POOL staff — can choose winners or change a result.',
                  ]
                : c.rules
              ).map((r) => (
                <li key={r} className="flex gap-2.5 text-body-s text-text-primary">
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-brand" />
                  {r}
                </li>
              ))}
            </ul>
            {info && <p className="text-caption text-text-tertiary">Rules version {info.rulesVersion} — stored on every bet.</p>}
          </section>

          {(info || pool) && (
            <section aria-labelledby="pf-h" className="grid gap-6 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6 laptop:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex flex-col gap-3">
                <h2 id="pf-h" className="flex items-center gap-2 text-h4 text-text-primary">
                  <ShieldCheck aria-hidden className="size-5 text-icon-brand" />
                  {pool ? 'Drawn by Chainlink VRF — verify any round' : c.pf.title}
                </h2>
                <p className="text-body-s text-text-secondary">
                  {pool
                    ? 'When the round closes, the GlobalPool contract requests a random number from Chainlink VRF on Arbitrum; the proof is checked on-chain before winners are assigned.'
                    : c.pf.body}
                </p>
                <ol className="flex flex-col gap-2">
                  {c.pf.steps.map((s, i) => (
                    <li key={s} className="flex gap-2.5 text-body-s text-text-primary">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-raised text-label-s">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2">
                  {!pool && state === 'playable' && !noPlayScreen && (
                    <Button variant="secondary" asChild>
                      <Link href={`${GAMES_ROUTES.play(slug)}#my-bets`}>
                        <ShieldCheck aria-hidden />
                        Verify a {c.pf.noun}
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" asChild>
                    <Link href={pool ? '/pool/history' : GAMES_ROUTES.provablyFair}>How provably fair works</Link>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-md bg-surface-raised p-4">
                <p className="flex items-center gap-2 text-overline uppercase text-text-tertiary">
                  How it’s computed
                </p>
                <code className="font-mono text-mono-s break-words text-text-primary">
                  {pool ? 'winners = selectWinners(VRF word, entries)' : 'HMAC-SHA256(server seed, "client seed:nonce:cursor")'}
                </code>
                <p className="text-caption text-text-secondary">
                  {pool
                    ? 'The draw maths mirror the on-chain DrawMath contract.'
                    : 'The browser verifier runs the same @gp/shared/fair code the server settles with.'}
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section aria-labelledby="rail-h" className="flex flex-col gap-4 rounded-xl border border-border-default bg-surface-default p-5 tablet:p-6">
            <h2 id="rail-h" className="flex items-center gap-2 text-h5 text-text-primary">
              {pool ? 'Enter the current round' : `Play ${g.name}`}
              <DemoBadge size="xs" />
            </h2>
            <dl className="flex flex-col">
              {(pool
                ? [
                    ['Entry price', '10.00 USDT'],
                    ['Platform fee', '0.05 USDT / entry'],
                    ['Network fee', '0.00 USDT'],
                    ['Prize split', '50 · 20 · 10 · 10 × 2%'],
                  ]
                : info
                  ? [
                      ['House edge', `${info.houseEdgePercent}%`],
                      ['RTP', `${info.rtpPercent}%`],
                      ['Bet', `${formatAmount(info.minBet)}–${formatAmount(info.maxBet)} DEMO`],
                      ...(info.tableMax ? [['Table max', `${formatAmount(info.tableMax)} DEMO`]] : []),
                      ...(info.maxPayout ? [['Max payout', `${formatAmount(info.maxPayout)} DEMO`]] : []),
                      ['Fees', '0.00 DEMO'],
                    ]
                  : [['Disclosure', g.edgeLabel]]
              ).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-border-subtle py-2.5 last:border-0">
                  <dt className="text-body-s text-text-secondary">{k}</dt>
                  <dd className="text-body-s-strong text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-start gap-2 rounded-md bg-surface-raised p-3 text-caption text-text-secondary">
              <Receipt aria-hidden className="mt-px size-4 shrink-0 text-icon-muted" />
              {pool
                ? 'Example: 5 entries = 50.00 + 0.25 platform fee = 50.25 USDT, paid from your platform balance.'
                : `No fee per bet — the house edge is the only cost. Bets use ${CREDITS_LABEL}; the 0.05 USDT platform fee applies to Global Pool entries only.`}
            </p>
            <PlayButton game={g} noPlayScreen={noPlayScreen} className="w-full" />
            <p className="flex items-start gap-2 text-caption text-text-primary">
              <TriangleAlert aria-hidden className="mt-px size-4 shrink-0 text-text-warning" />
              You can lose your stake. Only play with what you can afford to lose.
            </p>
            <p className="text-caption text-text-tertiary">Sign in to play · 18+ only · available in permitted jurisdictions</p>
          </section>

          <section aria-labelledby="rg-h" className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="rg-h" className="flex items-center gap-2 text-h5 text-text-primary">
                <Heart aria-hidden className="size-5 text-icon-brand" /> Play responsibly
              </h2>
              <AgeBadge />
            </div>
            <p className="text-body-s text-text-secondary">
              Set a loss limit, get a reality check every 60 minutes, or take a break. Limits apply across every game and the Global
              Pool.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8">
                <Link href={GAMES_ROUTES.responsibleGaming}>
                  <SlidersHorizontal aria-hidden /> Set limits
                </Link>
              </Button>
              <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-8">
                <Link href={GAMES_ROUTES.coolingOff}>
                  <PauseCircle aria-hidden /> Take a break
                </Link>
              </Button>
            </div>
          </section>
        </aside>
      </div>

      <MoreGamesRail current={slug} />
    </div>
  );
}
