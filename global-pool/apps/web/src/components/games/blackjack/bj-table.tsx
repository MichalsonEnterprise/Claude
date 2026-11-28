'use client';

import { formatAmount } from '@gp/shared/money';
import { CircleAlert, CircleCheck, Layers, Star, WifiOff } from 'lucide-react';
import * as React from 'react';

import { CreditsAmount } from '@/components/games/kit';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

import { INFO, pairLabel, RESULT_LABEL, totalOf, type BetTone } from './bj-math';
import { CardSpot, PlayingCard } from './cards';
import { BjChipFace } from './chip';
import type { BjResult } from '@gp/shared/fair';

export type FeltTone = 'info' | 'win' | 'blackjack' | 'lose' | 'push' | 'offline' | 'split';

export interface TableHand {
  cards: string[];
  stake: string;
  /** The hand the player is deciding on. */
  active: boolean;
  /** Waiting for its turn (split hand 2). */
  waiting: boolean;
  result: BjResult | null;
  doubled: boolean;
}

export interface BjTableProps {
  /** null = no hand on the table (BJ-01 betting). */
  dealer: (string | null)[] | null;
  hands: TableHand[];
  /** Bet on the spot before the deal (decimal string; '' = none). */
  pendingStake: string;
  /** Chip value used for the bet-spot chip art. */
  chip: string;
  /** Tap the bet spot to add a chip (betting only). */
  onBetSpot?: () => void;
  betSpotDisabled?: boolean;
  /** Run the deal motion on newly mounted cards. */
  animate: boolean;
  status: { tone: FeltTone; text: string } | null;
  /** Overlay card (insurance, result, connection lost …) centred on the felt. */
  overlay?: React.ReactNode;
  /** Dim + inert the felt (blocking states). */
  dimmed?: boolean;
  /** Final dealer total is known (hole revealed). */
  dealerSettled: boolean;
  className?: string;
}

const STATUS_ICON: Record<FeltTone, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  info: CircleAlert,
  win: CircleCheck,
  blackjack: Star,
  lose: CircleAlert,
  push: CircleCheck,
  offline: WifiOff,
  split: Layers,
};

const RESULT_TONE: Record<BjResult, BetTone> = {
  blackjack: 'blackjack',
  win: 'win',
  push: 'push',
  lose: 'lose',
  bust: 'lose',
};

/** Total pill next to "DEALER" / "YOU" (gold for a paid blackjack, mint for a live / winning hand). */
function TotalPill({ value, tone = 'neutral', label }: { value: string; tone?: 'neutral' | 'brand' | 'gold' | 'danger'; label: string }) {
  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2.5 text-body-m-strong tabular-nums',
        tone === 'neutral' && 'bg-ink-900/70 text-text-primary',
        tone === 'brand' && 'bg-brand text-text-on-primary',
        tone === 'gold' && 'bg-gold text-text-on-gold',
        tone === 'danger' && 'bg-status-danger-strong text-ink-50',
      )}
    >
      {value}
    </span>
  );
}

/** Overlapping cards of one hand (each new card slides in from the shoe). */
function CardRow({ cards, animate, size }: { cards: (string | null)[]; animate: boolean; size: 's' | 'm' | 'l' }) {
  const step = size === 'l' ? (cards.length > 4 ? 30 : 42) : size === 'm' ? (cards.length > 4 ? 22 : 32) : 24;
  const w = size === 'l' ? 92 : size === 'm' ? 74 : 56;
  return (
    <div className="relative" style={{ width: w + Math.max(0, cards.length - 1) * step }}>
      <div className="flex">
        {cards.map((c, i) => (
          <PlayingCard
            key={i}
            code={c}
            size={size}
            animate={animate}
            className="relative"
            style={{ marginLeft: i === 0 ? 0 : step - w, zIndex: i + 1, marginTop: i % 2 ? 6 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}

function BetPill({
  label,
  stake,
  chip,
  muted = false,
  compact = false,
}: {
  label: string;
  stake: string;
  chip: string;
  muted?: boolean;
  /** Split hands on a phone: smaller chip, no badge (the felt already carries DEMO badges). */
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-dashed border-mint-700/60 bg-ink-900/55',
        compact ? 'gap-1.5 py-1 pr-2.5 pl-1 tablet:gap-2.5 tablet:py-1.5 tablet:pr-3.5 tablet:pl-1.5' : 'gap-2.5 py-1.5 pr-3.5 pl-1.5',
        muted && 'opacity-60',
      )}
    >
      <BjChipFace value={chip} className={compact ? 'size-7 tablet:size-10' : 'size-9 tablet:size-10'} />
      <span className="flex flex-col leading-tight">
        <span className="hidden text-caption text-text-secondary tablet:block">{label}</span>
        <span className={cn('flex items-center gap-1.5 text-text-primary', compact ? 'text-body-s-strong tablet:text-body-m-strong' : 'text-body-m-strong')}>
          <CreditsAmount value={stake} />
          <DemoBadge size="xs" className={compact ? 'hidden tablet:inline-flex' : undefined} />
        </span>
      </span>
    </span>
  );
}

/**
 * Felt table (BJ-01 … BJ-05, BJ-09): table-limits placard, shoe, dealer zone, "Blackjack pays 3 to 2" print, the
 * player's hand(s) with totals and bets, a status line and an optional overlay card. Everything shown comes from the
 * server's hand — cards that have not been revealed by the deal motion yet are simply not rendered.
 */
export function BjTable({
  dealer,
  hands,
  pendingStake,
  chip,
  onBetSpot,
  betSpotDisabled,
  animate,
  status,
  overlay,
  dimmed = false,
  dealerSettled,
  className,
}: BjTableProps) {
  const dealerTotal = dealer ? totalOf(dealer) : null;
  const dealerBj = dealerSettled && dealer && dealer.length === 2 && dealerTotal?.total === 21;
  const Icon = status ? STATUS_ICON[status.tone] : null;
  const multi = hands.length > 1;

  return (
    <div
      className={cn(
        'relative flex h-full flex-col items-center overflow-hidden rounded-t-[28px] rounded-b-[96px] border-[6px] border-ink-750 px-3 pt-5 pb-4 tablet:min-h-[640px] tablet:rounded-b-[220px] tablet:border-8 tablet:px-6 tablet:pt-6 tablet:pb-8',
        'bg-[color-mix(in_oklab,var(--color-mint-900)_62%,var(--color-ink-800))]',
        className,
      )}
      data-testid="bj-table"
    >
      <div className={cn('flex w-full flex-1 flex-col items-center', dimmed && 'opacity-30')} inert={dimmed || undefined} aria-hidden={dimmed || undefined}>
        {/* placard + shoe (≥ 768) */}
        <div className="pointer-events-none absolute top-5 left-5 hidden flex-col gap-0.5 rounded-md border border-ink-700 bg-ink-900/80 px-3 py-2 tablet:flex">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-text-brand uppercase">Table limits</span>
          <span className="text-body-s-strong text-text-primary tabular-nums">
            {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)}
          </span>
          <span className="flex items-center gap-1.5 text-caption text-text-secondary">
            DEMO per hand <DemoBadge size="xs" />
          </span>
        </div>
        <div className="pointer-events-none absolute top-5 right-5 hidden flex-col items-end gap-1.5 tablet:flex" aria-hidden>
          <span className="flex items-center gap-2 rounded-md border border-ink-600 bg-ink-850/90 px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-text-secondary uppercase">
            6 decks
            <span className="h-5 w-8 rounded-sm border border-ink-600 bg-ink-900" />
          </span>
          <span className="text-caption text-text-secondary">Fresh shuffle every hand</span>
        </div>

        {/* dealer */}
        <section aria-label="Dealer" className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold tracking-[0.12em] text-text-secondary uppercase">Dealer</span>
            {dealer && dealerTotal && dealerTotal.total > 0 && (
              <TotalPill
                value={
                  dealerBj
                    ? 'BJ'
                    : dealer.filter(Boolean).length === 1 && dealer[0]?.startsWith('A')
                      ? 'A'
                      : String(dealerTotal.total)
                }
                label={`Dealer ${dealerBj ? 'blackjack' : `${dealerSettled ? '' : 'shows '}${dealerTotal.total}`}`}
                tone={dealerSettled && dealerTotal.total > 21 ? 'danger' : 'neutral'}
              />
            )}
          </div>
          <div className="flex min-h-[78px] items-start justify-center tablet:min-h-[128px]" data-testid="bj-dealer-cards">
            {dealer && dealer.length ? (
              <>
                <span className="tablet:hidden">
                  <CardRow cards={dealer} animate={animate} size="m" />
                </span>
                <span className="hidden tablet:block">
                  <CardRow cards={dealer} animate={animate} size="l" />
                </span>
              </>
            ) : (
              <div className="flex gap-2.5">
                <CardSpot size="s" className="tablet:hidden" />
                <CardSpot size="s" className="tablet:hidden" />
                <CardSpot size="l" className="hidden tablet:inline-block" />
                <CardSpot size="l" className="hidden tablet:inline-block" />
              </div>
            )}
          </div>
        </section>

        {/* felt print */}
        <div className="my-3 flex flex-col items-center gap-1.5 text-center tablet:my-8 tablet:gap-2">
          <p className="text-[18px] font-bold tracking-[0.02em] text-text-brand uppercase tablet:text-[22px]">
            Blackjack pays 3 to 2
          </p>
          <p className="text-[10px] font-semibold tracking-[0.08em] text-text-secondary uppercase tablet:hidden">
            Dealer stands on soft 17 · Insurance 2:1
          </p>
          <p className="hidden rounded-full border border-mint-700/50 px-4 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-text-secondary uppercase tablet:block">
            Dealer stands on soft 17 · Insurance pays 2 to 1
          </p>
        </div>

        {/* player */}
        <section aria-label="Your hand" className="flex w-full flex-1 flex-col items-center justify-end gap-3">
          {hands.length === 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2.5">
                <CardSpot size="s" className="tablet:hidden" />
                <CardSpot size="s" className="tablet:hidden" />
                <CardSpot size="l" className="hidden tablet:inline-block" />
                <CardSpot size="l" className="hidden tablet:inline-block" />
              </div>
              <span className="text-[12px] font-semibold tracking-[0.12em] text-text-secondary uppercase">You</span>
              <button
                type="button"
                onClick={onBetSpot}
                disabled={!onBetSpot || betSpotDisabled}
                data-testid="bj-bet-spot"
                aria-label={
                  pendingStake
                    ? `Bet spot: ${formatAmount(pendingStake)} DEMO credits — add a ${chip} chip`
                    : `Bet spot — add a ${chip} chip`
                }
                className="min-h-11 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus enabled:hover:brightness-110 disabled:cursor-default"
              >
                {pendingStake ? (
                  <BetPill label="Main bet" stake={pendingStake} chip={chip} />
                ) : (
                  <span className="inline-flex h-14 items-center rounded-full border-2 border-dashed border-mint-700/60 px-5 text-body-s text-text-secondary">
                    Tap to place a {chip} chip
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex w-full items-end justify-center gap-2 tablet:gap-6">
              {hands.map((h, i) => {
                const t = totalOf(h.cards);
                const natural = !multi && h.cards.length === 2 && t.total === 21;
                const settledTone = h.result ? RESULT_TONE[h.result] : null;
                const pair = !multi ? pairLabel(h.cards) : null;
                const label = multi
                  ? `Hand ${i + 1} of ${hands.length}${h.waiting ? ' · waiting' : ''}`
                  : h.result
                    ? `You · ${h.result === 'blackjack' ? 'Ace + ' + (h.cards.find((c) => !c.startsWith('A'))?.startsWith('T') ? '10' : 'picture') : RESULT_LABEL[h.result]}`
                    : `You${pair ? ` · ${pair}` : ''}`;
                return (
                  <div
                    key={i}
                    data-testid={`bj-hand-${i}`}
                    data-total={t.total}
                    className={cn(
                      'flex min-w-0 flex-col items-center gap-2.5 rounded-xl border-2 border-transparent px-1.5 py-3 tablet:px-5 tablet:py-4',
                      h.active && 'border-brand/70 bg-brand-tint-subtle',
                      h.waiting && 'opacity-60',
                    )}
                    aria-current={h.active ? 'true' : undefined}
                  >
                    <div className="tablet:hidden">
                      <CardRow cards={h.cards} animate={animate} size={multi ? 's' : 'm'} />
                    </div>
                    <div className="hidden tablet:block">
                      <CardRow cards={h.cards} animate={animate} size={multi ? 'm' : 'l'} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-[0.1em] text-text-secondary uppercase tablet:text-[12px]">
                        {multi ? (
                          <>
                            <span className="tablet:hidden">
                              Hand {i + 1}
                              {h.waiting ? ' · wait' : ''}
                            </span>
                            <span className="hidden tablet:inline">{label}</span>
                          </>
                        ) : (
                          label
                        )}
                      </span>
                      {h.cards.length > 0 &&
                        (h.result === 'blackjack' ? (
                          <TotalPill value="Blackjack" tone="gold" label="Blackjack" />
                        ) : (
                          <TotalPill
                            value={t.total > 21 ? `${t.total} bust` : String(t.total)}
                            label={`Your total ${t.soft ? 'soft ' : ''}${t.total}${t.total > 21 ? ', bust' : ''}`}
                            tone={
                              t.total > 21
                                ? 'danger'
                                : settledTone === 'lose' || h.waiting
                                  ? 'neutral'
                                  : natural || settledTone === 'win' || h.active || !h.result
                                    ? 'brand'
                                    : 'neutral'
                            }
                          />
                        ))}
                    </div>
                    <BetPill
                      label={multi ? `Hand ${i + 1} bet${h.doubled ? ' · doubled' : ''}` : h.doubled ? 'Main bet · doubled' : 'Main bet'}
                      stake={h.stake}
                      chip={chip}
                      muted={h.waiting}
                      compact={multi}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {status && Icon && (
          <p
            role="status"
            aria-live="polite"
            data-testid="bj-felt-status"
            className={cn(
              'mt-4 flex max-w-full items-start gap-2 rounded-full border border-ink-700 bg-ink-900/80 px-4 py-2 text-center text-caption text-text-secondary tablet:text-body-s',
              status.tone === 'blackjack' && 'text-text-primary',
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                'mt-0.5 size-4 shrink-0',
                status.tone === 'win' || status.tone === 'push' || status.tone === 'info' || status.tone === 'split'
                  ? 'text-icon-brand'
                  : status.tone === 'blackjack'
                    ? 'text-icon-gold'
                    : status.tone === 'offline'
                      ? 'text-text-warning'
                      : 'text-text-danger',
              )}
            />
            <span>{status.text}</span>
          </p>
        )}
      </div>

      {overlay && (
        <div className="absolute inset-x-0 top-[22%] z-20 flex justify-center px-3 tablet:top-[24%] tablet:px-8">{overlay}</div>
      )}
    </div>
  );
}
