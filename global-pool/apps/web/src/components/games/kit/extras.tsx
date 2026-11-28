'use client';

import { fairGame } from '@gp/shared/fair';
import { formatDateTimeUTC } from '@gp/shared/format';
import { formatAmount } from '@gp/shared/money';
import { CircleCheck, CircleX, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { isGameArtKey } from '@/components/brand/game-art';
import { GameTile } from '@/components/domain/game-tile';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { useGameCatalogue, type GameBetView } from '@/lib/api/games';
import { cn } from '@/lib/utils';

import { CreditsAmount, KvRow, toneOfNet } from './parts';
import { GAMES_ROUTES, playStateOf } from './registry';

/**
 * Game/Result Banner: win / lose with icon + label (never colour alone), net in DEMO credits, ref + Verify.
 * Real results only — the banner shows the settled bet the server returned (no fabricated wins).
 */
export function ResultBanner({
  bet,
  headline,
  detail,
  onVerify,
  className,
}: {
  bet: GameBetView;
  headline?: string;
  detail: string;
  onVerify?: () => void;
  className?: string;
}) {
  const win = bet.win === true;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="result-banner"
      data-result={win ? 'win' : 'lose'}
      className={cn(
        'flex w-full flex-col gap-3 rounded-xl border p-4',
        win ? 'border-border-brand bg-brand-tint-subtle' : 'border-border-danger bg-status-danger-tint',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {win ? (
          <CircleCheck aria-hidden className="size-6 shrink-0 text-icon-brand" />
        ) : (
          <CircleX aria-hidden className="size-6 shrink-0 text-text-danger" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body-m-strong text-text-primary">
            {headline ?? (win ? (
              <>
                You won <CreditsAmount value={bet.payout} />
              </>
            ) : (
              'No win this time'
            ))}
          </p>
          <p className="text-caption text-text-secondary">{detail}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn('text-number-s', toneOfNet(bet.net))}>
            <CreditsAmount value={bet.net} signed />
          </span>
          <span className="text-caption text-text-tertiary">Net</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 text-caption text-text-tertiary">
        <DemoBadge size="xs" />
        <span>
          {bet.ref} · nonce {bet.fairness.nonce} · {formatDateTimeUTC(bet.settledAt ?? bet.createdAt)}
        </span>
        {onVerify && (
          <Button variant="link" size="s" className="ml-auto" onClick={onVerify} leadingIcon={<ShieldCheck aria-hidden />}>
            Verify result
          </Button>
        )}
      </div>
    </div>
  );
}

/** "How <game> works" card: published rules, house edge / RTP, limits, licence chip, links. */
export function HowItWorksCard({
  slug,
  intro,
  rows = [],
  className,
}: {
  slug: string;
  intro?: string;
  rows?: { label: string; value: string }[];
  className?: string;
}) {
  const info = fairGame(slug);
  if (!info) return null;
  return (
    <section
      aria-labelledby={`how-${slug}`}
      className={cn('flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`how-${slug}`} className="text-h5 text-text-primary">
          How {info.name} works
        </h2>
        <span className="text-caption text-text-tertiary">rules {info.rulesVersion}</span>
      </div>
      {intro && <p className="text-body-s text-text-secondary">{intro}</p>}
      <ul className="flex flex-col gap-1.5 text-body-s text-text-secondary">
        {info.rules.map((r) => (
          <li key={r} className="flex gap-2">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-brand" />
            {r}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3">
        <KvRow label="House edge" value={`${info.houseEdgePercent}% · RTP ${info.rtpPercent}%`} />
        {rows.map((r) => (
          <KvRow key={r.label} label={r.label} value={r.value} />
        ))}
        <KvRow label="Bet limits" value={`${formatAmount(info.minBet)} – ${formatAmount(info.maxBet)} DEMO`} />
      </div>
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        <AgeBadge /> Simulation · DEMO credits only · permitted regions only
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href={GAMES_ROUTES.details(slug)} className="text-label-m text-text-brand underline-offset-4 hover:underline">
          Full rules & payouts
        </Link>
        <Link href={GAMES_ROUTES.provablyFair} className="text-label-m text-text-brand underline-offset-4 hover:underline">
          How provably fair works
        </Link>
        <Link href={GAMES_ROUTES.responsibleGaming} className="text-label-m text-text-brand underline-offset-4 hover:underline">
          Set a loss limit
        </Link>
      </div>
    </section>
  );
}

const RAIL = ['orbit-rush', 'vault-sweeper', 'skyline', 'pinfall', 'fortune-ring', 'pool-dice', 'double-side', 'pool-roulette', 'twenty-one'];

/** "More GLOBAL POOL Originals" tile rail (excludes the current game). */
export function MoreGamesRail({ current, title = 'More GLOBAL POOL Originals' }: { current: string; title?: string }) {
  const cat = useGameCatalogue();
  const games = (cat.data ?? []).filter((g) => RAIL.includes(g.slug) && g.slug !== current);
  if (!games.length) return null;
  return (
    <section aria-labelledby="more-games" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="more-games" className="text-h5 text-text-primary">
          {title}
        </h2>
        <Button variant="secondary" size="s" asChild>
          <Link href={GAMES_ROUTES.lobby}>All games</Link>
        </Button>
      </div>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
        {games.map((g) =>
          isGameArtKey(g.slug) ? (
            <li key={g.slug}>
              <GameTile
                game={g.slug}
                name={g.name}
                href={playStateOf(g.slug) === 'playable' ? GAMES_ROUTES.play(g.slug) : GAMES_ROUTES.details(g.slug)}
                edgeLabel={g.edgeLabel}
                players={g.players}
                demo={Boolean(g.isDemo)}
              />
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}
