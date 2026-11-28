import * as React from 'react';

import { isGameArtKey, type GameArtKey, type TileGradient } from '@/components/brand/game-art';

/**
 * Tile art for catalogue titles that have no GameArt key yet (slots, keno, draws, bingo, High Card, Ascend, Orbit Rush
 * Duel, live baccarat). Concrete objects only — reels, balls, cards, blocks (decision #23: no glow, rings or sparkles).
 * 120×120 SVGs coloured with token classes, drawn over the tile gradient.
 */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" focusable="false">
      {children}
    </svg>
  );
}

function SlotReels({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <Svg>
      <rect x="10" y="26" width="100" height="70" rx="12" className="fill-ink-950" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={18 + i * 30} y="34" width="24" height="54" rx="6" className="fill-ink-50" />
      ))}
      <circle cx="30" cy="61" r="8" className={a} />
      <rect x="54" y="53" width="12" height="16" rx="3" className={b} />
      <path d="M90 51 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 z" className={c} />
      <rect x="104" y="40" width="6" height="30" rx="3" className="fill-ink-300" />
      <circle cx="107" cy="38" r="6" className="fill-red-500" />
      <rect x="22" y="98" width="76" height="8" rx="4" className="fill-ink-800" />
    </Svg>
  );
}

function BallGrid({ rows = 4, cols = 5, accent = 'fill-gold-400' }: { rows?: number; cols?: number; accent?: string }) {
  const balls: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const on = (r * cols + c) % 3 === 0;
      balls.push(
        <circle key={`${r}-${c}`} cx={24 + c * 18} cy={36 + r * 16} r="6" className={on ? accent : 'fill-ink-600'} />,
      );
    }
  return (
    <Svg>
      <rect x="10" y="22" width="100" height="78" rx="12" className="fill-ink-950" />
      {balls}
    </Svg>
  );
}

function DrawMachine() {
  return (
    <Svg>
      <circle cx="60" cy="52" r="36" className="fill-ink-50 opacity-90" />
      {[
        [48, 44, 'fill-red-500'],
        [66, 40, 'fill-sky-400'],
        [58, 60, 'fill-gold-400'],
        [74, 58, 'fill-mint-500'],
        [44, 62, 'fill-violet-400'],
      ].map(([x, y, cl]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r="7" className={cl as string} />
      ))}
      <rect x="34" y="88" width="52" height="12" rx="6" className="fill-ink-950" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={40 + i * 10} cy="108" r="4" className={i % 2 ? 'fill-gold-400' : 'fill-ink-100'} />
      ))}
    </Svg>
  );
}

function BingoCard() {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++) {
      const marked = (r + c) % 4 === 0;
      cells.push(
        <rect key={`${r}-${c}`} x={26 + c * 14} y={34 + r * 14} width="11" height="11" rx="2" className={marked ? 'fill-red-500' : 'fill-ink-100'} />,
      );
    }
  return (
    <Svg>
      <rect x="18" y="16" width="84" height="94" rx="10" className="fill-ink-950" transform="rotate(-6 60 60)" />
      <g transform="rotate(-6 60 60)">
        {['fill-red-500', 'fill-gold-400', 'fill-mint-500', 'fill-sky-400', 'fill-violet-400'].map((cl, i) => (
          <rect key={cl} x={26 + i * 14} y="22" width="11" height="8" rx="2" className={cl} />
        ))}
        {cells}
      </g>
    </Svg>
  );
}

function Cards() {
  return (
    <Svg>
      <g transform="rotate(-14 46 70)">
        <rect x="22" y="30" width="44" height="62" rx="6" className="fill-ink-50" />
        <path d="M44 48 l8 12 -8 12 -8 -12 z" className="fill-red-500" />
      </g>
      <g transform="rotate(12 76 66)">
        <rect x="54" y="26" width="44" height="62" rx="6" className="fill-ink-50" />
        <text x="62" y="44" className="fill-ink-950" fontSize="13" fontWeight="800">
          K
        </text>
        <circle cx="76" cy="62" r="9" className="fill-ink-950" />
      </g>
      <path d="M60 104 l10 -10 h-6 v-10 h-8 v10 h-6 z" className="fill-mint-500" />
    </Svg>
  );
}

function Tower() {
  return (
    <Svg>
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2].map((c) => {
          const safe = (r * 2 + c) % 3 === 1;
          return (
            <rect
              key={`${r}-${c}`}
              x={24 + c * 26}
              y={92 - r * 17}
              width="22"
              height="12"
              rx="3"
              className={r === 2 && safe ? 'fill-mint-500' : safe ? 'fill-sky-400' : 'fill-ink-800'}
            />
          );
        }),
      )}
    </Svg>
  );
}

function DuelCurves() {
  return (
    <Svg>
      <path d="M14 104 C 46 98, 70 74, 90 30" className="fill-none stroke-mint-500" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 104 C 52 104, 82 88, 106 58" className="fill-none stroke-gold-400" strokeWidth="5" strokeLinecap="round" />
      <path d="M86 22 l12 2 -4 12 z" className="fill-ink-50" />
      <path d="M102 50 l10 6 -10 6 z" className="fill-ink-50" />
      <circle cx="14" cy="104" r="5" className="fill-ink-50" />
    </Svg>
  );
}

const SLOT_ART: Record<string, [string, string, string]> = {
  'neon-koi': ['fill-red-500', 'fill-sky-400', 'fill-gold-400'],
  'atlas-vault': ['fill-gold-400', 'fill-ink-300', 'fill-gold-300'],
  'midnight-orchard': ['fill-mint-500', 'fill-violet-400', 'fill-gold-400'],
  'comet-cascade': ['fill-sky-400', 'fill-violet-300', 'fill-gold-400'],
  'desert-relics': ['fill-amber-500', 'fill-red-500', 'fill-gold-400'],
  'frost-wolves': ['fill-sky-400', 'fill-ink-100', 'fill-sky-500'],
  'lucky-lanterns': ['fill-red-500', 'fill-gold-400', 'fill-red-400'],
  'robo-heist': ['fill-mint-500', 'fill-ink-300', 'fill-gold-400'],
};

const SLOT_GRADIENT: Record<string, TileGradient> = {
  'neon-koi': 'sky',
  'atlas-vault': 'amber',
  'midnight-orchard': 'violet',
  'comet-cascade': 'sky',
  'desert-relics': 'amber',
  'frost-wolves': 'sky',
  'lucky-lanterns': 'red',
  'robo-heist': 'mint',
};

/** GameArt key for a slug, or custom art + gradient for titles without one. */
export function tileArtFor(slug: string): { artKey: GameArtKey } | { art: React.ReactNode; gradient: TileGradient } {
  if (isGameArtKey(slug)) return { artKey: slug };
  if (slug === 'baccarat-lounge-live') return { artKey: 'baccarat-lounge' };
  if (SLOT_ART[slug]) {
    const [a, b, c] = SLOT_ART[slug];
    return { art: <SlotReels a={a} b={b} c={c} />, gradient: SLOT_GRADIENT[slug] ?? 'violet' };
  }
  switch (slug) {
    case 'pool-keno':
      return { art: <BallGrid accent="fill-mint-500" />, gradient: 'amber' };
    case 'keno-express-20-80':
      return { art: <BallGrid rows={4} cols={5} accent="fill-gold-400" />, gradient: 'sky' };
    case 'daily-draw-6-45':
      return { art: <DrawMachine />, gradient: 'amber' };
    case 'bingo-75-night':
    case 'bingo-90-classic':
      return { art: <BingoCard />, gradient: slug === 'bingo-75-night' ? 'violet' : 'amber' };
    case 'high-card':
      return { art: <Cards />, gradient: 'red' };
    case 'ascend':
      return { art: <Tower />, gradient: 'sky' };
    case 'orbit-rush-duel':
      return { art: <DuelCurves />, gradient: 'red' };
    default:
      return { art: <BallGrid />, gradient: 'violet' };
  }
}
