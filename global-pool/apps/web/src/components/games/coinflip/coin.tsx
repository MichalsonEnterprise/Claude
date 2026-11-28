'use client';

import type { CoinSide } from '@gp/shared/fair';
import { Waves } from 'lucide-react';
import * as React from 'react';

import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

import { faceAngle, landingAngle } from './coinflip-math';

/**
 * Double Side coin (Figma Game/Coin 24:14951): Heads = mint with the GLOBAL POOL medallion, Tails = silver with the
 * pool glyph. Never gold (gold is reserved for the jackpot). Pure CSS / inline SVG — concrete object, no glow or
 * orbit rings.
 */
export function CoinFace({ side, size, className }: { side: CoinSide; size: number; className?: string }) {
  const heads = side === 'heads';
  const rim = Math.max(2, Math.round(size * 0.035));
  const medallion = Math.round(size * (heads ? 0.36 : 0.3));
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex shrink-0 flex-col items-center justify-center rounded-full',
        heads ? 'border-mint-700 bg-brand' : 'border-ink-400 bg-ink-200',
        className,
      )}
      style={{ width: size, height: size, borderWidth: rim, borderStyle: 'solid' }}
    >
      {/* reeded edge + inner ring */}
      <span
        className={cn('absolute rounded-full border border-dashed', heads ? 'border-mint-800/45' : 'border-ink-500/45')}
        style={{ inset: size * 0.045 }}
      />
      <span
        className={cn('absolute rounded-full', heads ? 'border-mint-700/70' : 'border-ink-400')}
        style={{ inset: size * 0.13, borderWidth: Math.max(1, size * 0.012), borderStyle: 'solid' }}
      />
      <span
        className={cn(
          'relative flex items-center justify-center rounded-full',
          heads ? 'bg-ink-950' : 'border-ink-400 bg-ink-100',
        )}
        style={{
          width: medallion,
          height: medallion,
          marginTop: -size * 0.06,
          ...(heads ? {} : { borderWidth: Math.max(1, size * 0.012), borderStyle: 'solid' }),
        }}
      >
        {heads ? (
          <LogoMark height={Math.round(medallion * 0.46)} title="" />
        ) : (
          <Waves className="text-ink-600" style={{ width: medallion * 0.5, height: medallion * 0.5 }} strokeWidth={2.4} />
        )}
      </span>
      {size >= 40 && (
        <span
          className={cn('relative font-extrabold leading-none', heads ? 'text-ink-950' : 'text-ink-700')}
          style={{ fontSize: Math.max(7, size * 0.115), letterSpacing: size * 0.012, marginTop: size * 0.045 }}
        >
          {heads ? 'HEADS' : 'TAILS'}
        </span>
      )}
    </span>
  );
}

/** Small "H" / "T" disc for result strips and tables (newest outlined with the focus colour). */
export function SideDisc({
  side,
  size = 28,
  newest = false,
  className,
}: {
  side: CoinSide;
  size?: number;
  newest?: boolean;
  className?: string;
}) {
  const heads = side === 'heads';
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-semibold',
        heads ? 'border-border-brand bg-brand-tint text-text-brand' : 'border-border-default bg-surface-raised text-text-secondary',
        newest && 'ring-2 ring-border-focus ring-offset-2 ring-offset-surface-default',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
    >
      {heads ? 'H' : 'T'}
    </span>
  );
}

export interface FlipCoinProps {
  /** Face to show (the pick while idle, the settled side after a flip). */
  side: CoinSide;
  /** Increment to flip to `side` (one flip per settled bet). */
  flipId: number;
  size: number;
  durationMs: number;
  /** prefers-reduced-motion: show the result instantly. */
  instant?: boolean;
  /** Spinning while the bet is on its way (before the server answered). */
  pending?: boolean;
  onFlipEnd?: () => void;
  className?: string;
}

/**
 * 3D coin (CF-02 flipping → CF-03 result). The side is fixed by the seeds before the flip; the animation only reveals
 * the side the server settled (`side`). Web Animations API; instant under reduced motion or without WAAPI.
 */
export function FlipCoin({ side, flipId, size, durationMs, instant = false, pending = false, onFlipEnd, className }: FlipCoinProps) {
  const spinRef = React.useRef<HTMLDivElement>(null);
  const tossRef = React.useRef<HTMLDivElement>(null);
  const shadowRef = React.useRef<HTMLDivElement>(null);
  const angle = React.useRef(side === 'heads' ? 0 : 180);
  // Initial face only — afterwards the transform is owned by commit() / the animations (never re-rendered over).
  const [initialTransform] = React.useState(() => `rotateY(${side === 'heads' ? 0 : 180}deg)`);
  const lastFlip = React.useRef(flipId);
  const onEnd = React.useRef(onFlipEnd);
  onEnd.current = onFlipEnd;
  const running = React.useRef<Animation[]>([]);

  const commit = (deg: number) => {
    angle.current = deg;
    if (spinRef.current) spinRef.current.style.transform = `rotateY(${deg}deg)`;
  };

  // A new flip: spin to the settled side.
  React.useLayoutEffect(() => {
    if (flipId === lastFlip.current) return;
    lastFlip.current = flipId;
    for (const a of running.current) a.cancel();
    running.current = [];
    const from = angle.current;
    const to = landingAngle(from, side);
    const el = spinRef.current;
    if (instant || !el || typeof el.animate !== 'function') {
      commit(to);
      onEnd.current?.();
      return;
    }
    const easing = 'cubic-bezier(0.2, 0.65, 0.25, 1)';
    const spin = el.animate([{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }], {
      duration: durationMs,
      easing,
      fill: 'forwards',
    });
    const lift = Math.round(size * 0.32);
    const toss = tossRef.current?.animate(
      [
        { transform: 'translateY(0)' },
        { transform: `translateY(-${lift}px)`, offset: 0.4 },
        { transform: 'translateY(0)' },
      ],
      { duration: durationMs, easing: 'ease-in-out' },
    );
    const shadow = shadowRef.current?.animate(
      [
        { transform: 'scaleX(1)', opacity: 1 },
        { transform: 'scaleX(0.6)', opacity: 0.5, offset: 0.4 },
        { transform: 'scaleX(1)', opacity: 1 },
      ],
      { duration: durationMs, easing: 'ease-in-out' },
    );
    running.current = [spin, toss, shadow].filter((a): a is Animation => !!a);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      commit(to);
      spin.cancel();
      running.current = [];
      onEnd.current?.();
    };
    spin.finished.then(finish, () => undefined);
    // Safety net (background tabs throttle animations): never leave the stake UI locked.
    const t = window.setTimeout(finish, durationMs + 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per flip id
  }, [flipId]);

  // No flip: turn to the picked face (quick, or instant under reduced motion).
  React.useLayoutEffect(() => {
    if (running.current.length) return;
    const to = faceAngle(angle.current, side);
    if (to === angle.current) return;
    const el = spinRef.current;
    if (instant || !el || typeof el.animate !== 'function') {
      commit(to);
      return;
    }
    const a = el.animate([{ transform: `rotateY(${angle.current}deg)` }, { transform: `rotateY(${to}deg)` }], {
      duration: 240,
      easing: 'ease-out',
    });
    commit(to);
    return () => a.cancel();
  }, [side, instant]);

  return (
    <div className={cn('flex flex-col items-center', className)} style={{ perspective: size * 4 }}>
      <div ref={tossRef} className={cn(pending && !instant && 'motion-safe:animate-pulse')}>
        <div
          ref={spinRef}
          className="relative"
          style={{ width: size, height: size, transformStyle: 'preserve-3d', transform: initialTransform }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            <CoinFace side="heads" size={size} />
          </div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CoinFace side="tails" size={size} />
          </div>
        </div>
      </div>
      <div
        ref={shadowRef}
        aria-hidden
        className="rounded-[50%] bg-ink-950/45"
        style={{ width: size * 0.66, height: Math.max(6, size * 0.05), marginTop: size * 0.08 }}
      />
    </div>
  );
}
