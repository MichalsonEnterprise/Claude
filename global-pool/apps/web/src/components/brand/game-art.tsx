import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Original game key art (decisions #20/#22/#23): concrete objects only — coins, tickets, dice, cards, wheels,
 * chips. No third-party art, no glow blobs, orbit rings or sparkles. Each piece is a 120×120 transparent SVG
 * drawn over the tile gradient (bg-gradient-tile-*), coloured with token classes.
 */

export type GameArtKey =
  | 'global-pool'
  | 'orbit-rush'
  | 'pool-dice'
  | 'double-side'
  | 'pool-roulette'
  | 'twenty-one'
  | 'vault-sweeper'
  | 'skyline'
  | 'pinfall'
  | 'fortune-ring'
  | 'live-pool-roulette'
  | 'mega-ring-show'
  | 'baccarat-lounge'
  | 'speed-twenty-one'
  | 'sic-bo-triad'
  | 'dragon-and-phoenix';

export type TileGradient = 'gold' | 'violet' | 'sky' | 'amber' | 'red' | 'mint';

export const GAME_TILE_GRADIENT: Record<GameArtKey, TileGradient> = {
  'global-pool': 'gold',
  'pool-roulette': 'red',
  'orbit-rush': 'violet',
  'pool-dice': 'sky',
  'double-side': 'amber',
  'twenty-one': 'mint',
  'vault-sweeper': 'sky',
  skyline: 'mint',
  pinfall: 'amber',
  'fortune-ring': 'violet',
  'live-pool-roulette': 'mint',
  'mega-ring-show': 'violet',
  'baccarat-lounge': 'violet',
  'speed-twenty-one': 'sky',
  'sic-bo-triad': 'amber',
  'dragon-and-phoenix': 'red',
};

export const TILE_GRADIENT_CLASS: Record<TileGradient, string> = {
  gold: 'bg-gradient-tile-gold',
  violet: 'bg-gradient-tile-violet',
  sky: 'bg-gradient-tile-sky',
  amber: 'bg-gradient-tile-amber',
  red: 'bg-gradient-tile-red',
  mint: 'bg-gradient-tile-mint',
};

export function isGameArtKey(value: string): value is GameArtKey {
  return value in GAME_TILE_GRADIENT;
}

// ── shared pieces ───────────────────────────────────────────────────────────────────────────────

function CoinStack({
  cx,
  base,
  count,
  rx = 17,
}: {
  cx: number;
  base: number;
  count: number;
  rx?: number;
}) {
  const ry = rx * 0.34;
  return (
    <g>
      {Array.from({ length: count }, (_, k) => {
        const cy = base - k * 6;
        return (
          <g key={k}>
            <path
              d={`M${cx - rx} ${cy}v4a${rx} ${ry} 0 0 0 ${rx * 2} 0v-4`}
              className="fill-gold-pressed"
            />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} className="fill-gold" />
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx - 4}
              ry={ry - 1.6}
              className="fill-none stroke-gold-strong"
              strokeWidth={1.2}
            />
          </g>
        );
      })}
    </g>
  );
}

function Die({
  x,
  y,
  size,
  rotate,
  pips,
  tone = 'light',
}: {
  x: number;
  y: number;
  size: number;
  rotate: number;
  pips: number;
  tone?: 'light' | 'mint';
}) {
  const p = size / 4;
  const layout: Record<number, [number, number][]> = {
    1: [[2, 2]],
    2: [
      [1, 1],
      [3, 3],
    ],
    3: [
      [1, 1],
      [2, 2],
      [3, 3],
    ],
    4: [
      [1, 1],
      [3, 1],
      [1, 3],
      [3, 3],
    ],
    5: [
      [1, 1],
      [3, 1],
      [2, 2],
      [1, 3],
      [3, 3],
    ],
    6: [
      [1, 1],
      [3, 1],
      [1, 2],
      [3, 2],
      [1, 3],
      [3, 3],
    ],
  };
  return (
    <g transform={`rotate(${rotate} ${x + size / 2} ${y + size / 2})`}>
      <rect
        x={x + 2}
        y={y + 4}
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
        className={tone === 'mint' ? 'fill-brand' : 'fill-ink-50'}
      />
      {(layout[pips] ?? []).map(([cx, cy], i) => (
        <circle key={i} cx={x + cx * p} cy={y + cy * p} r={size * 0.085} className="fill-ink-950" />
      ))}
    </g>
  );
}

function Card({
  x,
  y,
  rotate,
  suit,
  rank,
}: {
  x: number;
  y: number;
  rotate: number;
  suit: 'spade' | 'heart';
  rank: string;
}) {
  const red = suit === 'heart';
  return (
    <g transform={`rotate(${rotate} ${x + 21} ${y + 30})`}>
      <rect x={x + 2} y={y + 4} width={42} height={60} rx={6} className="fill-ink-950/40" />
      <rect x={x} y={y} width={42} height={60} rx={6} className="fill-ink-50" />
      <text
        x={x + 6}
        y={y + 14}
        fontSize="12"
        fontWeight="800"
        className={red ? 'fill-red-600' : 'fill-ink-950'}
        style={{ fontFamily: 'var(--gp-font-sans)' }}
      >
        {rank}
      </text>
      {suit === 'spade' ? (
        <path
          d={`M${x + 21} ${y + 22}c-8 8-12 11-12 16a6 6 0 0 0 10 4l-2 8h8l-2-8a6 6 0 0 0 10-4c0-5-4-8-12-16Z`}
          className="fill-ink-950"
        />
      ) : (
        <path
          d={`M${x + 21} ${y + 48}c-9-7-13-11-13-17a6.5 6.5 0 0 1 13-2 6.5 6.5 0 0 1 13 2c0 6-4 10-13 17Z`}
          className="fill-red-600"
        />
      )}
    </g>
  );
}

function Chip({
  cx,
  cy,
  r,
  tone,
}: {
  cx: number;
  cy: number;
  r: number;
  tone: 'red' | 'sky' | 'mint';
}) {
  const fill = tone === 'red' ? 'fill-red-500' : tone === 'sky' ? 'fill-sky-500' : 'fill-brand';
  return (
    <g>
      <circle cx={cx + 1} cy={cy + 3} r={r} className="fill-ink-950/40" />
      <circle cx={cx} cy={cy} r={r} className={fill} />
      <circle
        cx={cx}
        cy={cy}
        r={r - 2.5}
        className="fill-none stroke-ink-50"
        strokeWidth={2.4}
        strokeDasharray={`${(r - 2.5) * 0.6} ${(r - 2.5) * 0.45}`}
      />
      <circle cx={cx} cy={cy} r={r * 0.45} className={fill} />
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.45}
        className="fill-none stroke-ink-950/25"
        strokeWidth={1}
      />
    </g>
  );
}

function wedgePath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  return `M${p(r0, a0)}L${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}

// ── per-game art ────────────────────────────────────────────────────────────────────────────────

function GlobalPoolArt() {
  return (
    <>
      <ellipse cx="60" cy="96" rx="46" ry="9" className="fill-ink-950/30" />
      <CoinStack cx={40} base={88} count={4} />
      <CoinStack cx={78} base={92} count={6} />
      <CoinStack cx={58} base={98} count={2} />
      <g transform="rotate(-14 74 34)">
        <rect x="46" y="20" width="58" height="30" rx="4" className="fill-brand" />
        <circle cx="46" cy="35" r="4" className="fill-gold-pressed" />
        <circle cx="104" cy="35" r="4" className="fill-gold-pressed" />
        <line
          x1="88"
          y1="23"
          x2="88"
          y2="47"
          className="stroke-mint-900"
          strokeWidth={1.4}
          strokeDasharray="2.5 2.5"
        />
        <path
          d="m68 27 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z"
          className="fill-mint-900"
        />
        <rect x="92" y="29" width="7" height="2" rx="1" className="fill-mint-900" />
        <rect x="92" y="34" width="7" height="2" rx="1" className="fill-mint-900" />
        <rect x="92" y="39" width="5" height="2" rx="1" className="fill-mint-900" />
      </g>
    </>
  );
}

function OrbitRushArt() {
  return (
    <>
      <g className="stroke-ink-50/10" strokeWidth={1}>
        {[30, 50, 70, 90].map((v) => (
          <line key={`h${v}`} x1="8" y1={v} x2="112" y2={v} />
        ))}
        {[30, 55, 80, 105].map((v) => (
          <line key={`v${v}`} x1={v} y1="12" x2={v} y2="108" />
        ))}
      </g>
      <circle cx="92" cy="92" r="22" className="fill-violet-300/60" />
      <circle cx="86" cy="86" r="6" className="fill-violet-400/70" />
      <path
        d="M10 104C46 100 66 80 80 36"
        className="fill-none stroke-brand"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <g transform="rotate(28 84 28)">
        <path d="M84 6c7 6 9 16 8 28H76c-1-12 1-22 8-28Z" className="fill-ink-50" />
        <path d="M76 26l-6 10h6Zm16 0 6 10h-6Z" className="fill-red-500" />
        <circle cx="84" cy="20" r="3.4" className="fill-sky-500" />
        <path d="M79 34h10l-2 8h-6Z" className="fill-gold" />
      </g>
    </>
  );
}

function PoolDiceArt() {
  return (
    <>
      <ellipse cx="62" cy="100" rx="44" ry="7" className="fill-ink-950/30" />
      <Die x={20} y={46} size={46} rotate={-12} pips={5} />
      <Die x={66} y={26} size={36} rotate={16} pips={3} tone="mint" />
    </>
  );
}

function DoubleSideArt() {
  return (
    <>
      <ellipse cx="60" cy="104" rx="38" ry="6" className="fill-ink-950/30" />
      <g transform="rotate(-18 84 46)">
        <ellipse cx="84" cy="46" rx="22" ry="24" className="fill-ink-300" />
        <ellipse cx="82" cy="46" rx="22" ry="24" className="fill-ink-200" />
        <ellipse
          cx="82"
          cy="46"
          rx="15"
          ry="17"
          className="fill-none stroke-ink-400"
          strokeWidth={2}
        />
        <circle cx="82" cy="46" r="6" className="fill-none stroke-ink-500" strokeWidth={3} />
      </g>
      <circle cx="50" cy="72" r="31" className="fill-mint-700" />
      <circle cx="48" cy="70" r="31" className="fill-brand" />
      <circle cx="48" cy="70" r="23" className="fill-none stroke-mint-700" strokeWidth={2.4} />
      <text
        x="48"
        y="82"
        textAnchor="middle"
        fontSize="34"
        fontWeight="800"
        className="fill-ink-950"
        style={{ fontFamily: 'var(--gp-font-sans)' }}
      >
        $
      </text>
    </>
  );
}

function PoolRouletteArt() {
  const n = 18;
  const step = (Math.PI * 2) / n;
  return (
    <>
      <circle cx="60" cy="62" r="50" className="fill-ink-950/40" />
      <circle cx="60" cy="58" r="50" className="fill-gold-pressed" />
      <circle cx="60" cy="58" r="45" className="fill-ink-900" />
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={wedgePath(60, 58, 28, 42, i * step - Math.PI / 2, (i + 1) * step - Math.PI / 2)}
          className={i === 0 ? 'fill-mint-600' : i % 2 ? 'fill-red-600' : 'fill-ink-950'}
        />
      ))}
      <circle cx="60" cy="58" r="27" className="fill-gold-600" />
      <circle cx="60" cy="58" r="22" className="fill-ink-800" />
      <g className="stroke-ink-200" strokeWidth={3} strokeLinecap="round">
        <line x1="60" y1="42" x2="60" y2="74" />
        <line x1="44" y1="58" x2="76" y2="58" />
      </g>
      <circle cx="60" cy="58" r="5" className="fill-ink-100" />
      <circle cx="86" cy="30" r="4" className="fill-ink-50" />
    </>
  );
}

function TwentyOneArt() {
  return (
    <>
      <ellipse cx="60" cy="102" rx="42" ry="7" className="fill-ink-950/30" />
      <Card x={22} y={26} rotate={-14} suit="spade" rank="A" />
      <Card x={52} y={20} rotate={10} suit="heart" rank="K" />
      <Chip cx={30} cy={92} r={12} tone="red" />
      <Chip cx={92} cy={90} r={10} tone="sky" />
    </>
  );
}

function VaultSweeperArt() {
  const cells = [0, 1, 2];
  return (
    <>
      <rect x="14" y="14" width="92" height="92" rx="14" className="fill-ink-950/45" />
      {cells.flatMap((r) =>
        cells.map((c) => {
          const x = 22 + c * 27;
          const y = 22 + r * 27;
          const gem = (r === 0 && c === 1) || (r === 2 && c === 2) || (r === 1 && c === 0);
          return (
            <g key={`${r}${c}`}>
              <rect
                x={x}
                y={y}
                width="22"
                height="22"
                rx="5"
                className={gem ? 'fill-mint-900' : 'fill-sky-500'}
              />
              {gem ? (
                <path d={`M${x + 11} ${y + 4}l7 6-7 9-7-9Z`} className="fill-brand" />
              ) : (
                <rect
                  x={x + 3}
                  y={y + 3}
                  width="16"
                  height="5"
                  rx="2.5"
                  className="fill-ink-50/25"
                />
              )}
            </g>
          );
        }),
      )}
    </>
  );
}

function SkylineArt() {
  const towers: [number, number, number][] = [
    [10, 70, 16],
    [28, 52, 14],
    [44, 78, 12],
    [58, 40, 18],
    [78, 64, 14],
    [94, 56, 16],
  ];
  return (
    <>
      <line
        x1="6"
        y1="34"
        x2="114"
        y2="34"
        className="stroke-ink-50"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <rect x="84" y="24" width="28" height="12" rx="6" className="fill-ink-50" />
      <text
        x="98"
        y="33"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        className="fill-ink-950"
        style={{ fontFamily: 'var(--gp-font-sans)' }}
      >
        2.00×
      </text>
      {towers.map(([x, top, w]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={110 - top} className="fill-mint-900" />
          {Array.from({ length: Math.floor((106 - top) / 10) }, (_, k) => (
            <rect
              key={k}
              x={x + 3}
              y={top + 5 + k * 10}
              width={w - 6}
              height="3"
              className="fill-brand/50"
            />
          ))}
        </g>
      ))}
      <g transform="rotate(-8 64 22)">
        <path d="M64 6c5 5 6 12 5 20h-10c-1-8 0-15 5-20Z" className="fill-ink-50" />
        <path d="M60 26h8l-1.5 6h-5Z" className="fill-gold" />
      </g>
    </>
  );
}

function PinfallArt() {
  const rows = 6;
  const slots = [
    'fill-red-500',
    'fill-amber-500',
    'fill-gold',
    'fill-brand',
    'fill-gold',
    'fill-amber-500',
    'fill-red-500',
  ];
  return (
    <>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: r + 2 }, (_, k) => (
          <circle
            key={`${r}-${k}`}
            cx={60 - ((r + 1) * 12) / 2 + k * 12}
            cy={18 + r * 13}
            r="2.6"
            className="fill-ink-50"
          />
        )),
      )}
      <circle cx="66" cy="44" r="5" className="fill-brand" />
      {slots.map((cls, i) => (
        <rect key={i} x={14 + i * 13.4} y="98" width="11" height="9" rx="2.5" className={cls} />
      ))}
    </>
  );
}

function FortuneRingArt() {
  const colors = [
    'fill-red-500',
    'fill-gold',
    'fill-sky-500',
    'fill-brand',
    'fill-violet-400',
    'fill-amber-500',
  ];
  const n = 18;
  const step = (Math.PI * 2) / n;
  return (
    <>
      <circle cx="60" cy="64" r="48" className="fill-ink-950/40" />
      <circle cx="60" cy="60" r="48" className="fill-ink-900" />
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={wedgePath(60, 60, 12, 43, i * step, (i + 1) * step)}
          className={colors[i % colors.length]}
        />
      ))}
      <circle cx="60" cy="60" r="12" className="fill-ink-900" />
      <circle cx="60" cy="60" r="6" className="fill-gold" />
      <path d="M52 4h16l-8 16Z" className="fill-ink-50" />
    </>
  );
}

function FeltTable({ tone = 'mint' }: { tone?: 'mint' | 'violet' }) {
  return (
    <>
      <path
        d="M6 112 22 60h76l16 52Z"
        className={tone === 'mint' ? 'fill-mint-800' : 'fill-violet-800'}
      />
      <path
        d="M6 112 22 60h76l16 52"
        className={cn('fill-none', tone === 'mint' ? 'stroke-gold-600' : 'stroke-gold-pressed')}
        strokeWidth={2}
      />
    </>
  );
}

function LivePoolRouletteArt() {
  const n = 14;
  const step = (Math.PI * 2) / n;
  return (
    <>
      <FeltTable />
      <g className="stroke-ink-50/40" strokeWidth={1}>
        {[72, 86, 100].map((y) => (
          <line key={y} x1={22 - (y - 60) * 0.3} y1={y} x2={98 + (y - 60) * 0.3} y2={y} />
        ))}
        {[44, 60, 76].map((x) => (
          <line key={x} x1={x} y1="62" x2={x + (x - 60) * 0.35} y2="110" />
        ))}
      </g>
      <rect x="47" y="76" width="9" height="8" className="fill-red-500" />
      <rect x="64" y="90" width="9" height="8" className="fill-ink-950" />
      <ellipse cx="60" cy="34" rx="42" ry="20" className="fill-gold-pressed" />
      <ellipse cx="60" cy="32" rx="38" ry="17" className="fill-ink-900" />
      {Array.from({ length: n }, (_, i) => {
        const a0 = i * step;
        const a1 = (i + 1) * step;
        const p = (r: number, a: number) =>
          `${60 + r * Math.cos(a)} ${32 + r * 0.45 * Math.sin(a)}`;
        return (
          <path
            key={i}
            d={`M${p(20, a0)}L${p(35, a0)}L${p(35, a1)}L${p(20, a1)}Z`}
            className={i === 0 ? 'fill-mint-600' : i % 2 ? 'fill-red-600' : 'fill-ink-950'}
          />
        );
      })}
      <ellipse cx="60" cy="32" rx="18" ry="8" className="fill-gold-600" />
      <path
        d="M60 25v14M50 32h20"
        className="stroke-ink-100"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Chip cx={26} cy={96} r={8} tone="red" />
      <Chip cx={94} cy={98} r={8} tone="sky" />
    </>
  );
}

function MegaRingShowArt() {
  const colors = [
    'fill-red-500',
    'fill-gold',
    'fill-sky-500',
    'fill-brand',
    'fill-violet-300',
    'fill-amber-500',
    'fill-ink-50',
  ];
  const n = 28;
  const step = (Math.PI * 2) / n;
  return (
    <>
      <circle cx="60" cy="74" r="58" className="fill-ink-900" />
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={wedgePath(60, 74, 34, 56, i * step, (i + 1) * step)}
          className={colors[i % colors.length]}
        />
      ))}
      <circle cx="60" cy="74" r="34" className="fill-ink-950" />
      <circle cx="60" cy="74" r="30" className="fill-none stroke-violet-300" strokeWidth={1.6} />
      <path d="M52 10h16l-8 14Z" className="fill-ink-50" />
    </>
  );
}

function BaccaratLoungeArt() {
  return (
    <>
      <ellipse cx="60" cy="72" rx="58" ry="34" className="fill-gold-pressed" />
      <ellipse cx="60" cy="70" rx="54" ry="30" className="fill-mint-800" />
      <path d="M18 78c20 12 64 12 84 0" className="fill-none stroke-gold-600" strokeWidth={1.6} />
      <circle cx="60" cy="72" r="6" className="fill-none stroke-brand" strokeWidth={2} />
      <Card x={30} y={18} rotate={-8} suit="spade" rank="9" />
      <Card x={52} y={16} rotate={6} suit="heart" rank="Q" />
      <Chip cx={22} cy={82} r={7} tone="red" />
      <Chip cx={60} cy={92} r={7} tone="mint" />
      <Chip cx={98} cy={82} r={7} tone="sky" />
    </>
  );
}

function SpeedTwentyOneArt() {
  return (
    <>
      <path d="M0 96a60 44 0 0 1 120 0v24H0Z" className="fill-violet-800" />
      <path d="M8 96a52 36 0 0 1 104 0" className="fill-none stroke-gold" strokeWidth={2.4} />
      <rect x="48" y="6" width="24" height="12" rx="2" className="fill-ink-950" />
      {[
        [16, 40, -14],
        [44, 54, -4],
        [72, 52, 6],
        [96, 36, 14],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x! + 9} ${y! + 12})`}>
          <rect x={x} y={y} width="18" height="25" rx="3" className="fill-ink-50" />
          <path
            d={`M${x! + 9} ${y! + 18}c-4-3-6-5-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 3-2 5-6 8Z`}
            className="fill-red-600"
          />
        </g>
      ))}
      <rect x="22" y="78" width="12" height="9" rx="2" className="fill-ink-50/80" />
      <rect x="86" y="78" width="12" height="9" rx="2" className="fill-ink-50/80" />
    </>
  );
}

function SicBoTriadArt() {
  return (
    <>
      <ellipse cx="60" cy="98" rx="50" ry="10" className="fill-ink-950/40" />
      <ellipse cx="60" cy="92" rx="50" ry="10" className="fill-gold-pressed" />
      <ellipse cx="60" cy="90" rx="44" ry="7" className="fill-gold-600" />
      <path
        d="M18 88V60a42 42 0 0 1 84 0v28"
        className="fill-ink-50/15 stroke-ink-50/50"
        strokeWidth={1.6}
      />
      <circle cx="60" cy="16" r="5" className="fill-ink-50/70" />
      <Die x={26} y={58} size={26} rotate={-10} pips={4} />
      <Die x={66} y={60} size={26} rotate={12} pips={6} />
      <Die x={46} y={36} size={24} rotate={4} pips={3} />
    </>
  );
}

function DragonPhoenixArt() {
  return (
    <>
      <ellipse cx="60" cy="102" rx="44" ry="7" className="fill-ink-950/30" />
      <Card x={14} y={26} rotate={-12} suit="spade" rank="K" />
      <Card x={64} y={26} rotate={12} suit="heart" rank="Q" />
      <circle cx="60" cy="58" r="13" className="fill-gold" />
      <text
        x="60"
        y="63"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        className="fill-ink-950"
        style={{ fontFamily: 'var(--gp-font-sans)' }}
      >
        VS
      </text>
    </>
  );
}

const ART: Record<GameArtKey, () => React.JSX.Element> = {
  'global-pool': GlobalPoolArt,
  'orbit-rush': OrbitRushArt,
  'pool-dice': PoolDiceArt,
  'double-side': DoubleSideArt,
  'pool-roulette': PoolRouletteArt,
  'twenty-one': TwentyOneArt,
  'vault-sweeper': VaultSweeperArt,
  skyline: SkylineArt,
  pinfall: PinfallArt,
  'fortune-ring': FortuneRingArt,
  'live-pool-roulette': LivePoolRouletteArt,
  'mega-ring-show': MegaRingShowArt,
  'baccarat-lounge': BaccaratLoungeArt,
  'speed-twenty-one': SpeedTwentyOneArt,
  'sic-bo-triad': SicBoTriadArt,
  'dragon-and-phoenix': DragonPhoenixArt,
};

export function GameArt({
  game,
  className,
  ...props
}: Omit<React.ComponentProps<'svg'>, 'children'> & { game: GameArtKey }) {
  const Art = ART[game];
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn('block', className)} {...props}>
      <Art />
    </svg>
  );
}
