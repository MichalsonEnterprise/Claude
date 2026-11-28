'use client';

import * as React from 'react';

import { LogoMark } from '@/components/brand/logo';
import { GAME_MOTION } from '@/components/games/kit';
import { tokens } from '@gp/tokens';
import { cn } from '@/lib/utils';

import { cardFace } from './bj-math';

export type CardSize = 's' | 'm' | 'l';

const SIZE: Record<CardSize, string> = {
  s: 'h-[78px] w-[56px] rounded-md',
  m: 'h-[104px] w-[74px] rounded-lg',
  l: 'h-[128px] w-[92px] rounded-lg',
};
const RANK_TEXT: Record<CardSize, string> = {
  s: 'text-[15px]',
  m: 'text-[19px]',
  l: 'text-[22px]',
};
const PIP_TEXT: Record<CardSize, string> = {
  s: 'text-[26px]',
  m: 'text-[36px]',
  l: 'text-[44px]',
};

/**
 * Deal motion (card-deal token, 350 ms): the card slides in from the shoe (top right of the felt). `instant`
 * (prefers-reduced-motion) shows it in place at once.
 */
function useDealIn(ref: React.RefObject<HTMLElement | null>, animate: boolean) {
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!animate || !el || typeof el.animate !== 'function') return;
    const a = el.animate(
      [
        { transform: 'translate(220px, -180px) rotate(-12deg) scale(0.9)', opacity: 0 },
        { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 1 },
      ],
      { duration: GAME_MOTION.cardDeal, easing: tokens.motion.ease.decelerate, fill: 'backwards' },
    );
    return () => a.cancel();
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Hole card turning over (card-deal duration, a horizontal squeeze — reads as a flip without 3D). */
function useFlip(ref: React.RefObject<HTMLElement | null>, faceDown: boolean, animate: boolean) {
  const was = React.useRef(faceDown);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const turned = was.current && !faceDown;
    was.current = faceDown;
    if (!turned || !animate || !el || typeof el.animate !== 'function') return;
    const a = el.animate([{ transform: 'scaleX(0.05)' }, { transform: 'scaleX(1)' }], {
      duration: GAME_MOTION.cardDeal,
      easing: tokens.motion.ease.standard,
    });
    return () => a.cancel();
  }, [faceDown, animate, ref]);
}

/** Face-down card (shoe back: mint pattern + logo mark). */
export function CardBack({ size = 'l', className }: { size?: CardSize; className?: string }) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden border-[3px] border-ink-900 bg-mint-900 shadow-elevation-2',
        SIZE[size],
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-1 rounded-[inherit] border border-mint-700/50 [background-image:repeating-linear-gradient(45deg,transparent_0_5px,var(--color-brand-tint)_5px_6px),repeating-linear-gradient(-45deg,transparent_0_5px,var(--color-brand-tint)_5px_6px)]"
      />
      <span className="relative flex size-9 items-center justify-center rounded-full bg-ink-900/90">
        <LogoMark height={18} title="" />
      </span>
    </span>
  );
}

/**
 * Playing card. `code` = shoe code ("AS", "TD"); null = face down (the dealer's hole card). Every card carries its
 * name for screen readers ("Ace of spades").
 */
export function PlayingCard({
  code,
  size = 'l',
  animate = false,
  dim = false,
  className,
  style,
}: {
  code: string | null;
  size?: CardSize;
  /** Run the deal-in motion on mount (off under reduced motion). */
  animate?: boolean;
  dim?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useDealIn(ref, animate);
  useFlip(ref, code === null, animate);
  if (code === null) {
    return (
      <span ref={ref} role="img" aria-label="Face-down card (dealer’s hole card)" className={cn('inline-flex', className)} style={style}>
        <CardBack size={size} />
      </span>
    );
  }
  const f = cardFace(code);
  const ink = f.red ? 'text-red-600' : 'text-ink-950';
  return (
    <span
      ref={ref}
      role="img"
      aria-label={f.name}
      data-card={code}
      className={cn(
        'relative inline-flex shrink-0 flex-col border border-ink-100 bg-ink-50 shadow-elevation-2 select-none',
        SIZE[size],
        dim && 'opacity-60',
        className,
      )}
      style={style}
    >
      <span aria-hidden className={cn('absolute top-1.5 left-2 flex flex-col items-center leading-none font-bold', ink)}>
        <span className={RANK_TEXT[size]}>{f.rank}</span>
        <span className={cn(size === 's' ? 'text-[12px]' : 'text-[15px]')}>{f.symbol}</span>
      </span>
      <span aria-hidden className={cn('m-auto leading-none', PIP_TEXT[size], ink)}>
        {f.symbol}
      </span>
      <span
        aria-hidden
        className={cn('absolute right-2 bottom-1.5 flex rotate-180 flex-col items-center leading-none font-bold', ink)}
      >
        <span className={RANK_TEXT[size]}>{f.rank}</span>
        <span className={cn(size === 's' ? 'text-[12px]' : 'text-[15px]')}>{f.symbol}</span>
      </span>
    </span>
  );
}

/** Empty dashed spot where cards land (BJ-01 before the deal). */
export function CardSpot({ size = 'l', className }: { size?: CardSize; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 border-2 border-dashed border-mint-700/45', SIZE[size], className)}
    />
  );
}

/** Small card chip for history rows ("A♠" on white, red suits red). */
export function MiniCard({ code, className }: { code: string; className?: string }) {
  const f = cardFace(code);
  return (
    <span
      role="img"
      aria-label={f.name}
      className={cn(
        'inline-flex h-6 min-w-8 items-center justify-center gap-px rounded-sm border border-ink-200 bg-ink-50 px-1 text-[12px] leading-none font-bold tabular-nums',
        f.red ? 'text-red-600' : 'text-ink-950',
        className,
      )}
    >
      <span aria-hidden>{f.rank}</span>
      <span aria-hidden>{f.symbol}</span>
    </span>
  );
}

/** A row of mini cards. */
export function MiniCards({ cards, className }: { cards: readonly string[]; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {cards.map((c, i) => (
        <MiniCard key={`${c}-${i}`} code={c} />
      ))}
    </span>
  );
}
