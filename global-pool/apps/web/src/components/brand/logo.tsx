import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * GLOBAL POOL logo (decision #24, design/reference/brand_logo.png), original artwork as inline SVG:
 * - Mark: mint gamepad silhouette with a fiat "$" centre, ink D-pad and two action buttons.
 * - Wordmark: "GLOBAL POOL" in Inter ExtraBold (GLOBAL white, POOL mint) with a small flowing gold "$" above
 *   every letter on a gentle wave, alternately tilted ±9°.
 * Letter positions use Inter ExtraBold advance widths (measured in Chromium, em units) so the dollars sit
 * centred over each glyph without runtime measuring.
 */

const ADVANCE: Record<string, number> = {
  G: 0.7525,
  L: 0.5655,
  O: 0.773,
  B: 0.6647,
  A: 0.7695,
  P: 0.6519,
  ' ': 0.2188,
};

const FONT_SIZE = 20;
const TRACKING = 0.8;
const BASELINE = 37;
const WORD_X = 43;

interface Glyph {
  ch: string;
  x: number;
  center: number;
  brand: boolean;
  index: number;
}

const GLYPHS: Glyph[] = (() => {
  const out: Glyph[] = [];
  let x = WORD_X;
  let index = 0;
  for (const [i, ch] of [...'GLOBAL POOL'].entries()) {
    const adv = (ADVANCE[ch] ?? 0.6) * FONT_SIZE;
    if (ch !== ' ') {
      out.push({ ch, x, center: x + adv / 2, brand: i > 6, index });
      index += 1;
    }
    x += adv + (ch === ' ' ? 0 : TRACKING);
  }
  return out;
})();

const LAST = GLYPHS[GLYPHS.length - 1];
const FULL_WIDTH = Math.ceil((LAST ? LAST.x + (ADVANCE[LAST.ch] ?? 0.6) * FONT_SIZE : 190) + 1);

const FONT = 'var(--gp-font-sans)';

/** Gamepad mark drawn in a 52×34 box. */
function MarkShapes() {
  return (
    <>
      <path
        className="fill-brand"
        d="M14 4h24c7 0 11 5 12 12l1.5 9c.8 5-3.5 8-7.5 6l-6-5H14l-6 5c-4 2-8.3-1-7.5-6L2 16C3 9 7 4 14 4Z"
      />
      <g className="fill-ink-950">
        <rect x="8" y="13" width="10" height="4" rx="1" />
        <rect x="11" y="10" width="4" height="10" rx="1" />
        <circle cx="39" cy="12.5" r="2.6" />
        <circle cx="43.6" cy="17.4" r="2.6" />
        <text
          x="26"
          y="25.5"
          textAnchor="middle"
          fontSize="25"
          fontWeight="800"
          style={{ fontFamily: FONT }}
        >
          $
        </text>
      </g>
    </>
  );
}

function Wordmark() {
  return (
    <g style={{ fontFamily: FONT }} fontWeight="800">
      {GLYPHS.map((g) => {
        const wave = Math.sin(g.index * 0.85) * 1.6;
        const tilt = g.index % 2 === 0 ? -9 : 9;
        const y = 14.8 + wave;
        return (
          <text
            key={`d${g.index}`}
            x={g.center}
            y={y}
            textAnchor="middle"
            fontSize="11"
            className="fill-gold"
            transform={`rotate(${tilt} ${g.center} ${y - 3})`}
          >
            $
          </text>
        );
      })}
      <text y={BASELINE} fontSize={FONT_SIZE}>
        {GLYPHS.map((g) => (
          <tspan key={g.index} x={g.x} className={g.brand ? 'fill-brand' : 'fill-text-primary'}>
            {g.ch}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export interface LogoProps extends Omit<React.ComponentProps<'svg'>, 'children'> {
  /** 'full' = mark + wordmark (default), 'mark' = gamepad only. */
  variant?: 'full' | 'mark';
  /** Rendered height in px (width follows the aspect ratio). Default 36 (full) / 28 (mark). */
  height?: number;
  /** Accessible name. Default "GLOBAL POOL". Pass '' to make it decorative. */
  title?: string;
}

export function Logo({
  variant = 'full',
  height,
  title = 'GLOBAL POOL',
  className,
  ...props
}: LogoProps) {
  const decorative = title === '';
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': title } as const);
  if (variant === 'mark') {
    const h = height ?? 28;
    return (
      <svg
        viewBox="0 0 52 34"
        height={h}
        width={(h * 52) / 34}
        className={cn('shrink-0 overflow-visible', className)}
        {...a11y}
        {...props}
      >
        <MarkShapes />
      </svg>
    );
  }
  const h = height ?? 36;
  return (
    <svg
      viewBox={`0 0 ${FULL_WIDTH} 40`}
      height={h}
      width={(h * FULL_WIDTH) / 40}
      className={cn('shrink-0 overflow-visible', className)}
      {...a11y}
      {...props}
    >
      <g transform="translate(0 14) scale(0.7059)">
        <MarkShapes />
      </g>
      <Wordmark />
    </svg>
  );
}

/** Small round logo medallion (coins, avatars for the house). */
export function LogoMark(props: Omit<LogoProps, 'variant'>) {
  return <Logo variant="mark" {...props} />;
}
