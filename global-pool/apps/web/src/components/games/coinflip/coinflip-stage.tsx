'use client';

import type { CoinSide } from '@gp/shared/fair';
import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { CircleCheck, History, Loader2, Lock, RefreshCw, WifiOff } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount, shortHash } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { CoinFace, FlipCoin, SideDisc } from './coin';
import { MULTIPLIER, SIDES, WIN_CHANCE, other, sideLabel, type CoinflipBet } from './coinflip-math';
import { COINFLIP_ROUTES } from './routes';

export type FlipPhase = 'loading' | 'idle' | 'flipping' | 'reconnecting' | 'settled';

export interface CoinflipStageProps {
  phase: FlipPhase;
  pick: CoinSide;
  onPick: (side: CoinSide) => void;
  /** Face the big coin shows (pick while idle, settled side after a flip). */
  coinSide: CoinSide;
  flipId: number;
  flipMs: number;
  instant: boolean;
  onFlipEnd: () => void;
  /** Valid stake (2 dp) or null. */
  stake: string | null;
  /** Payout on a win for the stake, or null. */
  payout: string | null;
  nonce: number | null;
  serverSeedHash: string | null;
  /** Bet being flipped / last settled bet (meta line). */
  bet: CoinflipBet | null;
  /** Last landed sides, newest first. */
  last: CoinSide[];
  /** Picks locked (bet in flight, auto-play, blocked). */
  locked: boolean;
  /** Title / body overrides (insufficient credits, above max …). */
  title?: string;
  body?: React.ReactNode;
  /** Result banner (settled only). */
  result?: React.ReactNode;
  /** CF-06 connection lost: the flip is retried with the SAME idempotency key (shown inline, the stage stays visible). */
  reconnect?: {
    attempt: number;
    max: number;
    stake?: string;
    sentAt?: string | null;
    onRetry: () => void;
  };
}

/** CF-06 "Connection lost — reconnecting" banner above the picks (no result is shown or guessed while it is up). */
function ReconnectBanner({
  r,
  nonce,
}: {
  r: NonNullable<CoinflipStageProps['reconnect']>;
  nonce: number | null;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-status-warning bg-status-warning-tint p-4 tablet:flex-row tablet:items-start"
      data-testid="coinflip-reconnect"
    >
      <WifiOff aria-hidden className="size-5 shrink-0 text-text-warning" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-body-m-strong text-text-primary">
          Connection lost — reconnecting (attempt {r.attempt} of {r.max})
        </p>
        <p className="text-body-s text-text-secondary">
          Your flip is held with one request key: if it reached the server it settles exactly once
          {r.stake ? (
            <>
              {' '}
              (stake <CreditsAmount value={r.stake} /> locked
              {nonce !== null ? <>, side fixed by nonce {nonce} before the flip</> : null})
            </>
          ) : null}
          , otherwise it is sent again — never charged twice. It settles even if you close this tab.
          {r.sentAt ? ` Sent ${formatTimeUTC(r.sentAt, { seconds: true })}.` : ''}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="s"
            className="min-h-11 tablet:min-h-8"
            onClick={r.onRetry}
            leadingIcon={<RefreshCw aria-hidden />}
          >
            Retry now
          </Button>
          <Button
            variant="ghost"
            size="s"
            asChild
            className="min-h-11 tablet:min-h-8"
            leadingIcon={<History aria-hidden />}
          >
            <Link href={COINFLIP_ROUTES.myFlips}>Open my flips</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PickCard({
  side,
  selected,
  phase,
  locked,
  stake,
  payout,
  onPick,
  onKeyDown,
  refCb,
}: {
  side: CoinSide;
  selected: boolean;
  phase: FlipPhase;
  locked: boolean;
  stake: string | null;
  payout: string | null;
  onPick: (s: CoinSide) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  refCb: (el: HTMLButtonElement | null) => void;
}) {
  const flipping = phase === 'flipping' || phase === 'reconnecting';
  const key = side === 'heads' ? 'H' : 'T';
  const status = flipping ? (
    selected ? (
      <span className="inline-flex items-center gap-1 text-label-s text-text-brand">
        <Lock aria-hidden className="size-3.5" /> Locked
      </span>
    ) : (
      <span className="text-label-s text-text-tertiary">Not available</span>
    )
  ) : selected ? (
    <span className="inline-flex items-center gap-1 text-label-s text-text-brand">
      <CircleCheck aria-hidden className="size-3.5" /> Your pick
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-label-s text-text-tertiary">
      Shortcut
      <kbd className="rounded-xs border border-border-default bg-surface-default px-1.5 py-0.5 font-sans text-[10px] text-text-secondary">
        {key}
      </kbd>
    </span>
  );
  return (
    <button
      ref={refCb}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${sideLabel(side)} — win chance ${WIN_CHANCE}%, pays ${MULTIPLIER}×`}
      tabIndex={selected ? 0 : -1}
      disabled={locked}
      onClick={() => onPick(side)}
      onKeyDown={onKeyDown}
      data-testid={`pick-${side}`}
      className={cn(
        'group relative flex min-h-[72px] min-w-0 items-center gap-2.5 rounded-lg border p-3 text-left tablet:gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
        'lg:min-h-[290px] lg:flex-col lg:gap-4 lg:p-6 lg:text-center',
        selected
          ? 'border-2 border-border-brand bg-surface-selected'
          : 'border-border-default bg-surface-raised hover:border-border-strong hover:bg-surface-hover',
        locked && !selected && 'opacity-45',
        locked && 'cursor-not-allowed',
      )}
      style={{ gridArea: side }}
    >
      {/* lg top row: radio + name · status */}
      <span className="hidden w-full items-center gap-2.5 lg:flex">
        <span
          aria-hidden
          className={cn(
            'flex size-5 items-center justify-center rounded-full border-2',
            selected ? 'border-brand bg-brand' : 'border-border-strong',
          )}
        >
          {selected && <span className="size-2 rounded-full bg-ink-950" />}
        </span>
        <span className="text-label-m text-text-primary">{sideLabel(side)}</span>
        <span className="ml-auto">{status}</span>
      </span>
      <CoinFace side={side} size={96} className="hidden lg:flex" />
      <CoinFace side={side} size={40} className="lg:hidden tablet:hidden" />
      <CoinFace side={side} size={52} className="hidden tablet:flex lg:hidden" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:flex-none lg:items-center lg:gap-1">
        <span className="text-h5 tracking-[0.02em] text-text-primary uppercase lg:text-h3">
          {sideLabel(side)}
        </span>
        <span className="whitespace-nowrap text-caption text-text-secondary lg:hidden">
          {WIN_CHANCE}% · {MULTIPLIER}×
        </span>
        <span className="hidden text-body-s text-text-secondary lg:block">
          Win chance {WIN_CHANCE}%
        </span>
        <span className="hidden text-body-s-strong text-text-primary lg:block">
          Pays {MULTIPLIER}×
          {stake && payout ? (
            <>
              {' '}
              · <CreditsAmount value={stake} unit={false} /> → <CreditsAmount value={payout} />
            </>
          ) : null}
        </span>
      </span>
      <span className="absolute top-2 right-2 tablet:static tablet:shrink-0 lg:hidden">
        {selected ? (
          flipping ? (
            <Lock aria-hidden className="size-4 text-icon-brand tablet:size-5" />
          ) : (
            <CircleCheck aria-hidden className="size-4 text-icon-brand tablet:size-5" />
          )
        ) : (
          <kbd className="hidden rounded-xs border border-border-default bg-surface-default px-1.5 py-0.5 font-sans text-[10px] text-text-secondary tablet:inline">
            {key}
          </kbd>
        )}
      </span>
    </button>
  );
}

/** CF-01 … CF-03 stage: top line, Heads card | coin | Tails card (≥ 1024) or coin + compact picks (< 1024). */
export function CoinflipStage(p: CoinflipStageProps) {
  const lg = useMediaQuery(MQ.lg, true);
  const tablet = useMediaQuery(MQ.tablet, true);
  const refs = React.useRef<Record<CoinSide, HTMLButtonElement | null>>({
    heads: null,
    tails: null,
  });

  if (p.phase === 'loading') {
    return (
      <div
        className="flex flex-col items-center gap-6 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:border-0 tablet:bg-transparent tablet:p-0"
        aria-busy="true"
      >
        <div className="flex w-full justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-7 w-48 rounded-full" />
        </div>
        <div className="grid w-full items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <Skeleton className="hidden h-[290px] rounded-lg lg:block" />
          <Skeleton className="mx-auto size-[200px] rounded-full lg:size-[240px]" />
          <Skeleton className="hidden h-[290px] rounded-lg lg:block" />
        </div>
        <p role="status" className="flex items-center gap-2 text-caption text-text-secondary">
          <Loader2 aria-hidden className="size-4 animate-spin text-icon-brand" />
          Connecting to the game server · loading your seed pair
        </p>
      </div>
    );
  }

  const flipping = p.phase === 'flipping' || p.phase === 'reconnecting';
  const settled = p.phase === 'settled' && p.bet;
  const label =
    p.phase === 'reconnecting'
      ? `FLIP${p.bet ? ` · ${p.bet.ref}` : ''} · WAITING FOR CONNECTION`
      : flipping
        ? `FLIPPING${p.bet ? ` · ${p.bet.ref}` : ''}`
        : settled
          ? `SETTLED · ${p.bet!.ref}`
          : 'NEXT FLIP';
  const meta = settled
    ? `Nonce ${p.bet!.fairness.nonce} · settled ${formatDateTimeUTC(p.bet!.settledAt ?? p.bet!.createdAt, { seconds: true })}`
    : flipping
      ? `Nonce ${p.bet?.fairness.nonce ?? p.nonce ?? '—'} · stake locked · the side is already fixed by your seeds — the animation only reveals it`
      : p.nonce !== null
        ? `Nonce ${p.nonce} · result fixed by the server seed ${shortHash(p.serverSeedHash)} committed before you flip`
        : 'Sign in to see your seed pair';

  const title =
    p.title ??
    (p.phase === 'reconnecting'
      ? 'Waiting for connection…'
      : flipping
        ? 'Flipping…'
        : settled
          ? `Landed ${sideLabel(p.bet!.outcome.side)}`
          : `You’re on ${sideLabel(p.pick)}`);
  const body =
    p.body ??
    (p.phase === 'reconnecting' ? (
      'The flip keeps settling on the server. When you reconnect, the result is shown here and in My flips.'
    ) : flipping ? (
      <>
        Your
        {p.stake ? (
          <>
            {' '}
            <CreditsAmount value={p.stake} />
          </>
        ) : (
          ''
        )}{' '}
        stake is locked. {sideLabel(p.pick)} pays
        {p.payout ? (
          <>
            {' '}
            <CreditsAmount value={p.payout} />
          </>
        ) : (
          ` ${MULTIPLIER}×`
        )}
        ; {sideLabel(other(p.pick))} returns nothing.
      </>
    ) : (
      <>
        Flip to reveal the side. {sideLabel(p.pick)} pays{' '}
        {p.payout && p.stake ? (
          <>
            <CreditsAmount value={p.payout} /> on a <CreditsAmount value={p.stake} unit={false} />{' '}
            bet
          </>
        ) : (
          `${MULTIPLIER}× your bet`
        )}
        ; {sideLabel(other(p.pick))} returns nothing.
      </>
    ));

  // Roving focus inside the "Your pick" radio group (← → ↑ ↓ switch sides).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || p.locked) return;
    e.preventDefault();
    const next = other(p.pick);
    p.onPick(next);
    refs.current[next]?.focus();
  };

  const coinSize = lg ? 240 : tablet ? 200 : 176;

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:gap-6 tablet:border-0 tablet:bg-transparent tablet:p-0">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex min-w-0 flex-col gap-1 text-center tablet:text-left">
          <p
            className={cn(
              'text-overline uppercase',
              p.phase === 'reconnecting'
                ? 'text-text-warning'
                : flipping
                  ? 'text-text-brand'
                  : 'text-text-tertiary',
            )}
          >
            {label}
          </p>
          <p className="text-caption text-text-secondary">{meta}</p>
        </div>
        <div
          className="flex items-center justify-center gap-1.5"
          aria-label={`Last ${p.last.length} flips, newest first`}
          role="group"
        >
          <span className="mr-1 whitespace-nowrap text-caption text-text-tertiary">
            {p.last.length ? `Last ${Math.min(p.last.length, 6)}` : 'Last flips'}
          </span>
          {p.last.length ? (
            p.last
              .slice(0, 6)
              .map((s, i) => <SideDisc key={i} side={s} size={24} newest={i === 0} />)
          ) : (
            <span className="text-caption text-text-tertiary">no flips yet</span>
          )}
          <span className="sr-only">{p.last.slice(0, 6).map(sideLabel).join(', ')}</span>
          <DemoBadge size="s" className="ml-1" />
        </div>
      </div>

      {p.phase === 'reconnecting' && p.reconnect ? (
        <ReconnectBanner r={p.reconnect} nonce={p.nonce} />
      ) : null}

      <div
        role="radiogroup"
        aria-label="Your pick"
        className="grid grid-cols-2 items-center gap-3 [grid-template-areas:'coin_coin'_'heads_tails'] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-8 lg:[grid-template-areas:'heads_coin_tails']"
      >
        {SIDES.map((s) => (
          <PickCard
            key={s}
            side={s}
            selected={p.pick === s}
            phase={p.phase}
            locked={p.locked}
            stake={p.stake}
            payout={p.payout}
            onPick={p.onPick}
            onKeyDown={onKeyDown}
            refCb={(el) => {
              refs.current[s] = el;
            }}
          />
        ))}
        <div
          className="flex min-w-0 flex-col items-center gap-3 pb-2 text-center lg:pb-0"
          style={{ gridArea: 'coin' }}
        >
          <div data-testid="coin" data-side={p.coinSide} data-phase={p.phase}>
            <FlipCoin
              side={p.coinSide}
              flipId={p.flipId}
              size={coinSize}
              durationMs={p.flipMs}
              instant={p.instant}
              pending={flipping && !p.bet}
              onFlipEnd={p.onFlipEnd}
            />
          </div>
          <h2 className="text-h4 text-text-primary" aria-live="polite" data-testid="coin-title">
            {title}
          </h2>
          {p.result ? (
            <div className="w-full max-w-[460px]">{p.result}</div>
          ) : (
            <p className="max-w-[440px] text-body-s text-text-secondary">{body}</p>
          )}
        </div>
      </div>
    </div>
  );
}
