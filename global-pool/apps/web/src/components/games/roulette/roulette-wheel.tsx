'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { WHEEL_ORDER, colorOf } from './roulette-math';

/**
 * Game/Roulette Wheel (Figma 25:15363): European single-zero wheel drawn in SVG — rim with diamonds, ball track,
 * 37 pockets in wheel order, cone with turret. States: idle · spinning ("No more bets") · result (centre disc with the
 * pocket, winning pocket outlined in mint, ball resting in it).
 *
 * The wheel only REVEALS a pocket the server already settled from the seeds: a spin starts after the server answered,
 * and lands exactly on that pocket (no near-miss stops, no re-rolls). Duration = motion token wheel-spin (4 500 ms);
 * `durationMs = 0` (prefers-reduced-motion) shows the result instantly.
 */

const C = 200;
const SEG = 360 / 37;
const R_RIM = 197;
const R_TRACK_OUT = 190;
const R_TRACK_IN = 168;
const R_POCKET_OUT = 166;
const R_POCKET_IN = 128;
const R_BALL_TRACK = 180;
const R_BALL_POCKET = 138;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};
function sector(r1: number, r2: number, a0: number, a1: number): string {
  const [x0, y0] = pt(r2, a0);
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r1, a1);
  const [x3, y3] = pt(r1, a0);
  const f = (n: number) => n.toFixed(3);
  return `M${f(x0)} ${f(y0)} A${r2} ${r2} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r1} ${r1} 0 0 0 ${f(x3)} ${f(y3)} Z`;
}

const FILL = {
  red: 'var(--color-status-danger-strong)',
  black: 'var(--color-ink-950)',
  green: 'var(--color-green-500)',
} as const;

/** "Red · Odd · 19–36" (wheel centre). */
export function shortFacts(n: number): string {
  if (n === 0) return 'Zero · Green';
  return `${colorOf(n) === 'red' ? 'Red' : 'Black'} · ${n % 2 ? 'Odd' : 'Even'} · ${n <= 18 ? '1–18' : '19–36'}`;
}

const POCKETS = WHEEL_ORDER.map((n, i) => {
  const mid = i * SEG;
  return { n, i, mid, d: sector(R_POCKET_IN, R_POCKET_OUT, mid - SEG / 2, mid + SEG / 2), color: colorOf(n) };
});

export type WheelPhase = 'idle' | 'waiting' | 'spinning' | 'result' | 'reconnecting';

export interface RouletteWheelProps {
  /** Pocket shown at rest (last settled spin) — null before the first spin. */
  pocket: number | null;
  /** A new spin to animate (id changes per spin). */
  spin: { id: number; pocket: number } | null;
  /** 4 500 ms (token) or 0 for reduced motion. */
  durationMs: number;
  onSpinEnd?: () => void;
  phase: WheelPhase;
  className?: string;
  /** Show the centre result disc (number + facts). */
  showResult?: boolean;
}

export function RouletteWheel({ pocket, spin, durationMs, onSpinEnd, phase, className, showResult = true }: RouletteWheelProps) {
  const [wheelRot, setWheelRot] = React.useState(() => (pocket === null ? 0 : -WHEEL_ORDER.indexOf(pocket) * SEG));
  const [ballRot, setBallRot] = React.useState(pocket === null ? -62 : 0);
  const [ballIn, setBallIn] = React.useState(pocket !== null);
  const [anim, setAnim] = React.useState(false);
  const state = React.useRef({ wheelRot, ballRot });
  state.current = { wheelRot, ballRot };
  const endRef = React.useRef(onSpinEnd);
  endRef.current = onSpinEnd;
  const lastSpin = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!spin || lastSpin.current === spin.id) return;
    lastSpin.current = spin.id;
    const idx = WHEEL_ORDER.indexOf(spin.pocket);
    const cur = state.current.wheelRot;
    const want = mod(-idx * SEG, 360);
    const turns = durationMs > 0 ? 4 : 0;
    const base = cur + 360 * turns;
    let target = base - mod(base, 360) + want;
    if (durationMs > 0 && target < base) target += 360;
    const b = state.current.ballRot;
    const ballTarget = b - mod(b, 360) - 360 * (durationMs > 0 ? 6 : 0);
    if (durationMs <= 0) {
      setAnim(false);
      setWheelRot(target);
      setBallRot(ballTarget);
      setBallIn(true);
      const t = window.setTimeout(() => endRef.current?.(), 0);
      return () => window.clearTimeout(t);
    }
    // lift the ball back onto the track (no transition), then start the spin on the next frames
    setAnim(false);
    setBallIn(false);
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setAnim(true);
        setWheelRot(target);
        setBallRot(ballTarget);
        setBallIn(true);
      });
    });
    const t = window.setTimeout(() => {
      setAnim(false);
      endRef.current?.();
    }, durationMs + 60);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(t);
    };
  }, [spin, durationMs]);

  const d = durationMs;
  const origin: React.CSSProperties = { transformOrigin: `${C}px ${C}px`, transformBox: 'view-box' };
  const resultIdx = pocket === null ? -1 : WHEEL_ORDER.indexOf(pocket);
  const result = phase === 'result' && pocket !== null;
  const spinning = phase === 'spinning' || phase === 'waiting';

  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label={
        result
          ? `Roulette wheel — the ball landed on ${pocket} ${colorOf(pocket)}`
          : spinning
            ? 'Roulette wheel — spinning, no more bets'
            : 'Roulette wheel — European, single zero, 37 pockets'
      }
      className={cn('block aspect-square h-auto w-full select-none', className)}
      data-testid="roulette-wheel"
      data-phase={phase}
      data-pocket={pocket ?? ''}
    >
      {/* rim + ball track */}
      <circle cx={C} cy={C} r={R_RIM} fill="var(--color-ink-850)" stroke="var(--color-border-default)" strokeWidth="2" />
      <circle cx={C} cy={C} r={R_TRACK_OUT} fill="var(--color-ink-800)" />
      <circle cx={C} cy={C} r={R_TRACK_IN} fill="none" stroke="var(--color-ink-700)" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, k) => {
        const [x, y] = pt(R_BALL_TRACK + 3, k * 45 + 22.5);
        return (
          <rect
            key={k}
            x={x - 3.5}
            y={y - 3.5}
            width="7"
            height="7"
            fill="var(--color-ink-500)"
            transform={`rotate(45 ${x} ${y})`}
          />
        );
      })}

      {/* rotating wheel head: pockets + cone + turret */}
      <g style={{ ...origin, transform: `rotate(${wheelRot}deg)`, transition: anim ? `transform ${d}ms var(--ease-wheel)` : 'none' }}>
        {POCKETS.map((p) => (
          <path key={p.n} d={p.d} fill={FILL[p.color]} stroke="var(--color-ink-900)" strokeWidth="1.25" />
        ))}
        {POCKETS.map((p) => {
          const [x, y] = pt((R_POCKET_IN + R_POCKET_OUT) / 2 + 3, p.mid);
          return (
            <text
              key={`t${p.n}`}
              x={x}
              y={y}
              dy="0.35em"
              textAnchor="middle"
              fontSize="13"
              fontWeight={600}
              fill="var(--color-ink-50)"
              transform={`rotate(${p.mid} ${x} ${y})`}
            >
              {p.n}
            </text>
          );
        })}
        {result && resultIdx >= 0 && (
          <path
            d={POCKETS[resultIdx]!.d}
            fill="none"
            stroke="var(--color-border-focus)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        )}
        <circle cx={C} cy={C} r={R_POCKET_IN - 1} fill="var(--color-ink-800)" stroke="var(--color-ink-900)" strokeWidth="2" />
        <circle cx={C} cy={C} r={96} fill="var(--color-ink-750)" stroke="var(--color-ink-700)" strokeWidth="1.5" />
        {[45, 135, 225, 315].map((a) => {
          const [x, y] = pt(60, a);
          return (
            <g key={a}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="var(--color-ink-500)" strokeWidth="4" strokeLinecap="round" />
              <circle cx={x} cy={y} r="6" fill="var(--color-ink-400)" />
            </g>
          );
        })}
        <circle cx={C} cy={C} r="17" fill="var(--color-ink-700)" stroke="var(--color-ink-500)" strokeWidth="1.5" />
        <circle cx={C} cy={C} r="6.5" fill="var(--color-brand)" />
      </g>

      {/* ball: orbits counter-clockwise on the track, drops into the settled pocket at ~71 % of the spin */}
      <g
        style={{
          ...origin,
          transform: `rotate(${ballRot}deg)`,
          transition: anim ? `transform ${d}ms cubic-bezier(0.12, 0.62, 0.3, 1)` : 'none',
        }}
      >
        <g
          style={{
            transform: `translateY(${ballIn ? R_BALL_TRACK - R_BALL_POCKET : 0}px)`,
            transition: anim ? `transform ${Math.round(d * 0.18)}ms var(--ease-accelerate) ${Math.round(d * 0.71)}ms` : 'none',
          }}
        >
          <circle cx={C} cy={C - R_BALL_TRACK} r="7.5" fill="var(--color-ink-50)" stroke="var(--color-ink-400)" strokeWidth="1" />
        </g>
      </g>

      {/* centre: result disc or "No more bets" */}
      {result && showResult && (
        <g data-testid="wheel-result">
          <circle cx={C} cy={C} r="62" fill={FILL[colorOf(pocket)]} stroke="var(--color-ink-950)" strokeOpacity="0.35" strokeWidth="3" />
          <text x={C} y={C - 4} textAnchor="middle" fontSize="50" fontWeight={800} fill="var(--color-ink-50)">
            {pocket}
          </text>
          <text x={C} y={C + 26} textAnchor="middle" fontSize="11.5" fontWeight={500} fill="var(--color-ink-50)" fillOpacity="0.9">
            {shortFacts(pocket)}
          </text>
        </g>
      )}
      {(spinning || phase === 'reconnecting') && (
        <g>
          <rect x={C - 62} y={C + 30} width="124" height="28" rx="14" fill="var(--color-ink-950)" fillOpacity="0.92" />
          <circle cx={C - 46} cy={C + 44} r="4" fill="var(--color-status-warning)" />
          <text x={C + 6} y={C + 44} dy="0.35em" textAnchor="middle" fontSize="12.5" fontWeight={600} fill="var(--color-ink-50)">
            {phase === 'reconnecting' ? 'Reconnecting…' : 'No more bets'}
          </text>
        </g>
      )}
    </svg>
  );
}
