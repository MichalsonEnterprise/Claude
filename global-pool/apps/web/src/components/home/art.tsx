import * as React from 'react';

import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

/**
 * Homepage illustration pieces — concrete objects only (coins, tickets, chips, shields, crowns, dice, cards),
 * per the banned-look rules: no orbit rings, glow blobs, particles or logo halos. Colours are token classes.
 */

const svgFont = { fontFamily: 'var(--gp-font-sans)' } as const;

// ── coins ───────────────────────────────────────────────────────────────────────────────────────

/** Stack of gold coins seen slightly from above. `count` coins, front face on top. */
export function CoinStack({ count = 6, className }: { count?: number; className?: string }) {
  const rx = 48;
  const ry = 17;
  const step = 11;
  const h = ry * 2 + step * (count - 1) + 8;
  return (
    <svg viewBox={`0 0 ${rx * 2 + 4} ${h}`} aria-hidden className={cn('block', className)}>
      {Array.from({ length: count }, (_, i) => {
        const cy = h - ry - 6 - i * step;
        return (
          <g key={i}>
            <path d={`M2 ${cy}v8a${rx} ${ry} 0 0 0 ${rx * 2} 0v-8`} className="fill-gold-pressed" />
            <path
              d={`M2 ${cy + 4}a${rx} ${ry} 0 0 0 ${rx * 2} 0`}
              className="fill-none stroke-gold-strong"
              strokeWidth={1.4}
            />
            <ellipse cx={rx + 2} cy={cy} rx={rx} ry={ry} className="fill-gold" />
            <ellipse
              cx={rx + 2}
              cy={cy}
              rx={rx - 9}
              ry={ry - 4}
              className="fill-none stroke-gold-strong"
              strokeWidth={1.6}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Gold coin with a star (Global Pool mark) + small mint entry ticket. */
export function PoolCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('block', className)}>
      <circle cx="31" cy="33" r="25" className="fill-gold-pressed" />
      <circle cx="30" cy="30" r="25" className="fill-gold" />
      <circle cx="30" cy="30" r="19" className="fill-none stroke-gold-strong" strokeWidth={2} />
      <path
        d="m30 19 3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1Z"
        className="fill-gold-pressed"
      />
      <g transform="rotate(-18 50 50)">
        <rect x="38" y="43" width="22" height="13" rx="2.5" className="fill-brand" />
        <circle cx="46" cy="49.5" r="2" className="fill-mint-900" />
        <circle cx="52" cy="49.5" r="2" className="fill-mint-900" />
      </g>
    </svg>
  );
}

// ── entry ticket (HTML so the text stays crisp) ─────────────────────────────────────────────────

export function EntryTicket({
  entryId,
  roundLabel,
  settled = false,
  className,
  style,
}: {
  entryId: string;
  roundLabel: string;
  /** Round already drawn: stub reads "Settled" instead of "In draw". */
  settled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        'flex w-[340px] overflow-hidden rounded-md bg-surface-raised text-left shadow-elevation-3',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-1 p-4 pr-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold tracking-[0.08em] text-text-tertiary uppercase">
            Entry
          </span>
          <DemoBadge size="xs" />
        </div>
        <span className="font-mono text-[13px] text-text-primary">{entryId}</span>
        <span className="text-[12px] text-text-secondary">{roundLabel} · Global Pool</span>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <span className="flex flex-col text-[10px] text-text-tertiary">
            Entry
            <span className="text-[12px] font-semibold text-text-primary">10.00 USDT</span>
          </span>
          <span className="flex flex-col text-[10px] text-text-tertiary">
            Platform fee
            <span className="text-[12px] font-semibold text-text-primary">0.05 USDT</span>
          </span>
        </div>
      </div>
      <div className="relative flex w-[86px] flex-col items-center justify-center gap-1 border-l border-dashed border-border-strong px-2">
        <span className="absolute -top-2 -left-2 size-4 rounded-full bg-gold-600" />
        <span className="absolute -bottom-2 -left-2 size-4 rounded-full bg-gold-600" />
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint">
          <TicketGlyph className="size-4 text-text-brand" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-1.5 py-0.5 text-[8px] font-semibold text-text-brand">
          <span className="size-1 rounded-full bg-brand" /> {settled ? 'Settled' : 'In draw'}
        </span>
        <span className="text-[8px] text-text-tertiary">{settled ? 'Drawn at' : 'Draw at'}</span>
        <span className="text-[10px] font-semibold whitespace-nowrap text-text-primary">
          20:00 UTC
        </span>
      </div>
    </div>
  );
}

export function TicketGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor">
      <path
        d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2Z"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M9 10v4M15 10v4" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ── promo objects ───────────────────────────────────────────────────────────────────────────────

export function ShieldCheckArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn('block', className)}>
      <path
        d="M56 8 98 22v32c0 28-18 48-42 58C32 102 14 82 14 54V22Z"
        className="fill-mint-700"
        transform="translate(4 4)"
      />
      <path d="M56 8 98 22v32c0 28-18 48-42 58C32 102 14 82 14 54V22Z" className="fill-brand" />
      <path d="M56 8v104C32 102 14 82 14 54V22Z" className="fill-mint-400" opacity={0.55} />
      <path
        d="M56 18 88 29v25c0 22-14 38-32 46-18-8-32-24-32-46V29Z"
        className="fill-none stroke-mint-900/35"
        strokeWidth={2}
      />
      <path
        d="m37 58 13 13 25-27"
        className="fill-none stroke-ink-950"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="rotate(-38 98 92)">
        <rect
          x="80"
          y="84"
          width="22"
          height="14"
          rx="7"
          className="fill-none stroke-sky-500"
          strokeWidth={5}
        />
        <rect
          x="96"
          y="84"
          width="22"
          height="14"
          rx="7"
          className="fill-none stroke-sky-400"
          strokeWidth={5}
        />
      </g>
    </svg>
  );
}

export function CrownArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 110" aria-hidden className={cn('block', className)}>
      <path d="M14 34 42 62 70 16l28 46 28-28-8 56H22Z" className="fill-gold-pressed" />
      <path d="M14 34 42 62 70 16l28 46 28-28-6 50H20Z" className="fill-gold" />
      <path d="M70 16 98 62l-28 22-28-22Z" className="fill-gold-soft" opacity={0.55} />
      <rect x="18" y="80" width="104" height="18" rx="5" className="fill-gold-strong" />
      <rect
        x="18"
        y="80"
        width="104"
        height="7"
        rx="3.5"
        className="fill-gold-soft"
        opacity={0.5}
      />
      <circle cx="46" cy="89" r="4.5" className="fill-red-500" />
      <circle cx="70" cy="89" r="4.5" className="fill-brand" />
      <circle cx="94" cy="89" r="4.5" className="fill-sky-400" />
      <path d="m70 40 8 9-8 9-8-9Z" className="fill-violet-300" />
      {[
        [14, 32],
        [70, 13],
        [126, 32],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="6" className="fill-gold-soft" />
      ))}
    </svg>
  );
}

/** Casino chip with a value in the centre. */
export function ChipArt({
  value,
  tone,
  className,
}: {
  value: string;
  tone: 'mint' | 'violet' | 'ink';
  className?: string;
}) {
  const ring =
    tone === 'mint' ? 'fill-brand' : tone === 'violet' ? 'fill-violet-300' : 'fill-ink-600';
  const dash = tone === 'ink' ? 'stroke-brand' : 'stroke-ink-50';
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('block', className)}>
      <circle cx="32" cy="33.5" r="30" className="fill-ink-950/50" />
      <circle cx="32" cy="32" r="30" className={ring} />
      <circle
        cx="32"
        cy="32"
        r="26"
        className={cn('fill-none', dash)}
        strokeWidth={5}
        strokeDasharray="9 7.3"
      />
      <circle cx="32" cy="32" r="19" className="fill-ink-900" />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontSize={value.length > 2 ? 13 : 15}
        fontWeight="700"
        className="fill-ink-50"
        style={svgFont}
      >
        {value}
      </text>
    </svg>
  );
}

/** Coin with a % sign + four connected player bubbles (affiliate). */
export function AffiliateArt({ className }: { className?: string }) {
  const people: [number, number][] = [
    [26, 30],
    [94, 34],
    [30, 98],
    [98, 96],
  ];
  return (
    <svg viewBox="0 0 128 128" aria-hidden className={cn('block', className)}>
      <g className="stroke-mint-400/60" strokeWidth={2}>
        {people.map(([x, y]) => (
          <line key={x + y} x1="64" y1="64" x2={x} y2={y} />
        ))}
      </g>
      {people.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" className="fill-mint-400" />
          <circle cx={x} cy={y - 3.5} r="4.5" className="fill-mint-900" />
          <path d={`M${x - 7} ${y + 8}a7 6 0 0 1 14 0Z`} className="fill-mint-900" />
        </g>
      ))}
      <circle cx="65" cy="66" r="23" className="fill-gold-pressed" />
      <circle cx="64" cy="64" r="23" className="fill-gold" />
      <circle cx="64" cy="64" r="17" className="fill-none stroke-gold-strong" strokeWidth={2} />
      <text
        x="64"
        y="72"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        className="fill-ink-950"
        style={svgFont}
      >
        %
      </text>
    </svg>
  );
}

// ── category objects ────────────────────────────────────────────────────────────────────────────

function Die({
  x,
  y,
  size,
  rotate,
  pips,
  mint = false,
}: {
  x: number;
  y: number;
  size: number;
  rotate: number;
  pips: [number, number][];
  mint?: boolean;
}) {
  return (
    <g transform={`rotate(${rotate} ${x + size / 2} ${y + size / 2})`}>
      <rect
        x={x + 3}
        y={y + 6}
        width={size}
        height={size}
        rx={size * 0.2}
        className="fill-ink-950/40"
      />
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={size * 0.2}
        className={mint ? 'fill-brand' : 'fill-ink-50'}
      />
      {pips.map(([px, py], i) => (
        <circle
          key={i}
          cx={x + (px * size) / 4}
          cy={y + (py * size) / 4}
          r={size * 0.085}
          className="fill-ink-950"
        />
      ))}
    </g>
  );
}

export function DicePairArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 120" aria-hidden className={cn('block', className)}>
      <Die
        x={62}
        y={8}
        size={52}
        rotate={14}
        mint
        pips={[
          [1, 1],
          [2, 2],
          [3, 3],
        ]}
      />
      <Die
        x={12}
        y={40}
        size={70}
        rotate={-12}
        pips={[
          [1, 1],
          [3, 1],
          [2, 2],
          [1, 3],
          [3, 3],
        ]}
      />
    </svg>
  );
}

export function CardsChipsArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" aria-hidden className={cn('block', className)}>
      <g transform="rotate(-16 50 60)">
        <rect x="22" y="20" width="62" height="86" rx="8" className="fill-mint-500" />
        <rect
          x="28"
          y="26"
          width="50"
          height="74"
          rx="5"
          className="fill-none stroke-mint-900/30"
          strokeWidth={2}
        />
      </g>
      <g transform="rotate(8 92 56)">
        <rect
          x="58"
          y="10"
          width="64"
          height="90"
          rx="8"
          className="fill-ink-950/40"
          transform="translate(3 4)"
        />
        <rect x="58" y="10" width="64" height="90" rx="8" className="fill-ink-50" />
        <path
          d="M74 26c-6 6-9 8-9 12a4.5 4.5 0 0 0 7.5 3l-1.5 6h6l-1.5-6a4.5 4.5 0 0 0 7.5-3c0-4-3-6-9-12Z"
          className="fill-ink-950"
          transform="translate(-4 -6)"
        />
        <path
          d="M98 86c-11-8-16-13-16-20a8 8 0 0 1 16-2.5 8 8 0 0 1 16 2.5c0 7-5 12-16 20Z"
          className="fill-red-500"
        />
      </g>
      <g>
        <circle cx="26" cy="100" r="15" className="fill-brand" />
        <circle
          cx="26"
          cy="100"
          r="11"
          className="fill-none stroke-ink-50"
          strokeWidth={3}
          strokeDasharray="5 4"
        />
        <circle cx="126" cy="100" r="15" className="fill-red-500" />
        <circle
          cx="126"
          cy="100"
          r="11"
          className="fill-none stroke-ink-50"
          strokeWidth={3}
          strokeDasharray="5 4"
        />
      </g>
    </svg>
  );
}

/** Rising multiplier curve on a grid (instant games). */
export function CurveArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 140"
      aria-hidden
      className={cn('block', className)}
      preserveAspectRatio="none"
    >
      <g className="stroke-ink-50/10" strokeWidth={1}>
        {[20, 50, 80, 110].map((v) => (
          <line key={`h${v}`} x1="0" y1={v} x2="160" y2={v} />
        ))}
        {[30, 70, 110, 150].map((v) => (
          <line key={`v${v}`} x1={v} y1="0" x2={v} y2="140" />
        ))}
      </g>
      <path
        d="M10 132C70 128 110 100 132 26"
        className="fill-none stroke-brand"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx="133" cy="22" r="10" className="fill-gold" />
      <circle cx="131" cy="20" r="4" className="fill-gold-soft" />
    </svg>
  );
}

/** Ball with a star (Global Pool category) + mint ticket. */
export function PoolBallArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 120" aria-hidden className={cn('block', className)}>
      <circle cx="62" cy="58" r="50" className="fill-gold-strong" />
      <circle cx="58" cy="54" r="46" className="fill-gold" />
      <path
        d="m60 34 6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L60 67.2 47 74l2.5-14.5L39 49.3l14.5-2.1Z"
        className="fill-gold-pressed"
      />
      <g transform="rotate(-14 112 98)">
        <rect x="88" y="86" width="50" height="26" rx="4" className="fill-brand" />
        <line
          x1="124"
          y1="88"
          x2="124"
          y2="110"
          className="stroke-mint-900"
          strokeWidth={1.4}
          strokeDasharray="3 3"
        />
        <path
          d="m106 92 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7Z"
          className="fill-mint-900"
        />
      </g>
    </svg>
  );
}

/** Stack of three chips (VIP level-up rewards). */
export function ChipStackArt({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)} aria-hidden>
      <ChipArt value="100" tone="ink" className="absolute bottom-[8%] left-[10%] w-[42%]" />
      <ChipArt value="25" tone="mint" className="absolute top-[18%] left-[40%] w-[42%]" />
      <ChipArt value="500" tone="violet" className="absolute bottom-0 left-[48%] w-[44%]" />
    </div>
  );
}
