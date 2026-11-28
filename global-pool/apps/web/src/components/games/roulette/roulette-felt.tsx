'use client';

import { CircleCheck } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { SpotChip } from './chip';
import {
  OUTSIDE_SPOTS,
  POCKETS,
  cellOf,
  chanceOf,
  chipPosition,
  colorOf,
  covers,
  feltZones,
  numberAt,
  paysOf,
  spotKey,
  spotLabel,
  type FeltZone,
  type Slip,
  type SlipBet,
  type Spot,
} from './roulette-math';

export interface FeltResult {
  pocket: number;
  /** Spot keys of the settled bets that won / lost. */
  won: ReadonlySet<string>;
  lost: ReadonlySet<string>;
}

export interface FeltProps {
  /** Chips on the table (the slip, or the settled bets while a result is shown). */
  bets: Slip;
  onPlace: (s: Spot) => void;
  /** Right-click / Delete: take one chip off. */
  onRemove: (s: Spot) => void;
  /** Keyboard "B" / Shift+Enter on a number: choose a split, street, corner or line covering it. */
  onMore?: (n: number) => void;
  hover: Spot | null;
  onHover: (s: Spot | null) => void;
  disabled?: boolean;
  result?: FeltResult | null;
  className?: string;
}

const CELL_BG = {
  red: 'bg-status-danger-strong',
  black: 'bg-ink-950',
  green: 'bg-green-500',
} as const;
/** Game/Roulette Cell "Hover" (covered by the previewed bet): lighter fill + light border. */
const CELL_HOVER = {
  red: 'bg-red-400',
  black: 'bg-ink-700',
  green: 'bg-green-400',
} as const;

function useCovered(hover: Spot | null): ReadonlySet<number> {
  return React.useMemo(() => {
    if (!hover) return new Set<number>();
    try {
      return new Set(covers(hover));
    } catch {
      return new Set<number>();
    }
  }, [hover]);
}

const describeSpot = (s: Spot) => `${spotLabel(s)} — pays ${paysOf(s.type)} · ${covers(s).length} of ${POCKETS} pockets (${chanceOf(s)}%)`;

function betOn(bets: Slip, s: Spot): SlipBet | undefined {
  const k = spotKey(s);
  return bets.find((b) => b.key === k);
}

/** Number cell (Game/Roulette Cell 25:16416): colour + number, hover / bet placed / winning states. */
function NumberCell({
  n,
  bet,
  covered,
  result,
  focus,
  disabled,
  onPlace,
  onRemove,
  onHover,
  onKeyDown,
  setRef,
  className,
}: {
  n: number;
  bet: SlipBet | undefined;
  covered: boolean;
  result: FeltResult | null | undefined;
  focus: boolean;
  disabled?: boolean;
  onPlace: () => void;
  onRemove: () => void;
  onHover: (on: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  setRef: (el: HTMLButtonElement | null) => void;
  className?: string;
}) {
  const color = colorOf(n);
  const winning = result?.pocket === n;
  return (
    <div className={cn('relative p-[2px]', className)}>
      <button
        ref={setRef}
        type="button"
        tabIndex={focus ? 0 : -1}
        disabled={disabled}
        data-testid={`felt-${n}`}
        aria-label={`${n} ${color} — straight pays 35:1${bet ? `, your bet ${bet.amount} DEMO` : ''}${winning ? ', winning number' : ''}`}
        onClick={onPlace}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!disabled) onRemove();
        }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex size-full items-center justify-center rounded-md border text-label-l font-bold text-ink-50 tabular-nums transition-[filter,border-color] duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-focus disabled:cursor-not-allowed',
          covered ? CELL_HOVER[color] : CELL_BG[color],
          covered ? 'border-ink-50/80' : 'border-transparent',
          winning && 'border-border-focus ring-2 ring-border-focus',
          !disabled && 'hover:brightness-125',
        )}
      >
        {n}
        {winning && (
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-text-on-primary">
            <CircleCheck aria-hidden className="size-4" />
          </span>
        )}
      </button>
    </div>
  );
}

/** Outside box (dozens, columns, even-money). */
function OutsideBox({
  spot,
  label,
  bet,
  covered,
  result,
  disabled,
  onPlace,
  onRemove,
  onHover,
  dot,
  className,
  testId,
}: {
  spot: Spot;
  label: React.ReactNode;
  bet: SlipBet | undefined;
  covered: boolean;
  result: FeltResult | null | undefined;
  disabled?: boolean;
  onPlace: () => void;
  onRemove: () => void;
  onHover: (on: boolean) => void;
  dot?: 'red' | 'black';
  className?: string;
  testId?: string;
}) {
  const k = spotKey(spot);
  const won = !!result && result.won.has(k);
  const lost = !!result && result.lost.has(k);
  return (
    <div className={cn('p-[2px]', className)}>
      <button
        type="button"
        disabled={disabled}
        data-testid={testId}
        aria-label={`${describeSpot(spot)}${bet ? `, your bet ${bet.amount} DEMO` : ''}${won ? ', won' : lost ? ', lost' : ''}`}
        onClick={onPlace}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!disabled) onRemove();
        }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        className={cn(
          'relative flex size-full items-center justify-center gap-1.5 rounded-md border px-1 text-label-m text-text-primary transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-focus disabled:cursor-not-allowed',
          won
            ? 'border-2 border-border-focus bg-brand-tint text-text-brand'
            : covered
              ? 'border-border-brand bg-surface-hover'
              : 'border-border-default bg-surface-raised',
          !disabled && !won && 'hover:border-border-brand hover:bg-surface-hover',
          lost && 'opacity-45',
        )}
      >
        {dot && (
          <span
            aria-hidden
            className={cn('size-3 shrink-0 rounded-full border border-border-strong', dot === 'red' ? 'bg-status-danger-strong' : 'bg-ink-950')}
          />
        )}
        <span className="truncate">{label}</span>
        {bet && <SpotChip amount={bet.amount} size={22} className="shrink-0" />}
      </button>
    </div>
  );
}

const ZONE_PX = { v: [14, 0], h: [0, 14], x: [18, 18] } as const;

/** Edge / corner targets (split, street, corner, line, zero bets) — pointer targets; keyboard users use "B". */
function Zone({
  z,
  disabled,
  onPlace,
  onRemove,
  onHover,
}: {
  z: FeltZone;
  disabled?: boolean;
  onPlace: () => void;
  onRemove: () => void;
  onHover: (on: boolean) => void;
}) {
  const style: React.CSSProperties =
    z.shape === 'v'
      ? { left: `calc(${(z.x / 12) * 100}% - ${ZONE_PX.v[0] / 2}px)`, width: ZONE_PX.v[0], top: `${((z.y - 0.32) / 3) * 100}%`, height: `${(0.64 / 3) * 100}%` }
      : z.shape === 'h'
        ? { top: `calc(${(z.y / 3) * 100}% - ${ZONE_PX.h[1] / 2}px)`, height: ZONE_PX.h[1], left: `${((z.x - 0.32) / 12) * 100}%`, width: `${(0.64 / 12) * 100}%` }
        : { left: `calc(${(z.x / 12) * 100}% - 9px)`, top: `calc(${(z.y / 3) * 100}% - 9px)`, width: 18, height: 18 };
  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      data-testid={`zone-${z.key}`}
      aria-label={describeSpot(z.spot)}
      onClick={onPlace}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!disabled) onRemove();
      }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      style={style}
      className={cn(
        'absolute z-10 rounded-full outline-none disabled:cursor-not-allowed',
        !disabled && 'hover:bg-brand/35 hover:ring-1 hover:ring-border-focus',
      )}
    />
  );
}

const ZONES = feltZones();

/**
 * Horizontal felt (desktop / tablet): 0 spanning three rows, the 1–36 grid (3 · 6 · 9 … on top), 2:1 column boxes,
 * dozens and even-money boxes. Chips for split / street / corner / line bets sit on the shared line, edge or crossing.
 * Keyboard: arrows move between numbers, Enter / Space = straight, B (or Shift+Enter) = other bet types on the number,
 * Delete = take a chip off. Right-click removes a chip.
 */
export function RouletteFelt({ bets, onPlace, onRemove, onMore, hover, onHover, disabled, result, className }: FeltProps) {
  const covered = useCovered(hover);
  const [focusN, setFocusN] = React.useState(19);
  const refs = React.useRef(new Map<number, HTMLButtonElement | null>());
  const hoverOn = (s: Spot) => (on: boolean) => onHover(on ? s : null);

  const move = (n: number, key: string): number => {
    if (n === 0) return key === 'ArrowRight' ? 2 : 0;
    const { col, row } = cellOf(n);
    if (key === 'ArrowRight') return col < 11 ? n + 3 : n;
    if (key === 'ArrowLeft') return col > 0 ? n - 3 : 0;
    if (key === 'ArrowUp') return row > 0 ? n + 1 : n;
    if (key === 'ArrowDown') return row < 2 ? n - 1 : n;
    if (key === 'Home') return 0;
    if (key === 'End') return 34 + (n % 3 === 0 ? 2 : (n % 3) - 1);
    return n;
  };
  const onKey = (n: number) => (e: React.KeyboardEvent) => {
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const m = move(n, e.key);
      setFocusN(m);
      refs.current.get(m)?.focus();
    } else if ((e.key === 'b' || e.key === 'B' || (e.key === 'Enter' && e.shiftKey)) && onMore) {
      e.preventDefault();
      onMore(n);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      onRemove({ type: 'straight', numbers: [n] });
    }
  };

  const cell = (n: number, className?: string) => {
    const s: Spot = { type: 'straight', numbers: [n] };
    return (
      <NumberCell
        key={n}
        n={n}
        bet={betOn(bets, s)}
        covered={covered.has(n)}
        result={result}
        focus={focusN === n}
        disabled={disabled}
        onPlace={() => {
          setFocusN(n);
          onPlace(s);
        }}
        onRemove={() => onRemove(s)}
        onHover={hoverOn(s)}
        onKeyDown={onKey(n)}
        setRef={(el) => void refs.current.set(n, el)}
        className={className}
      />
    );
  };

  const box = (s: Spot, label: React.ReactNode, extra: { dot?: 'red' | 'black'; className?: string } = {}) => (
    <OutsideBox
      key={spotKey(s)}
      spot={s}
      label={label}
      bet={betOn(bets, s)}
      covered={false}
      result={result}
      disabled={disabled}
      onPlace={() => onPlace(s)}
      onRemove={() => onRemove(s)}
      onHover={hoverOn(s)}
      testId={`felt-${spotKey(s)}`}
      {...extra}
    />
  );

  const hoverZone = hover && !['straight', 'dozen', 'column', 'red', 'black', 'odd', 'even', 'low', 'high'].includes(hover.type) ? chipPosition(hover) : null;
  const zeroBet = betOn(bets, { type: 'straight', numbers: [0] });
  const lostKeys = result?.lost;

  return (
    <div
      className={cn('rounded-xl border border-border-default bg-bg-secondary p-2 laptop:p-2.5', className)}
      role="group"
      aria-label="Roulette table — place chips"
      onPointerLeave={() => onHover(null)}
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] grid-rows-[156px_40px_40px] laptop:grid-cols-[56px_minmax(0,1fr)_56px] laptop:grid-rows-[192px_48px_48px]">
        {/* 0 */}
        <div className="relative row-start-1 col-start-1">
          {cell(0, 'size-full')}
          {zeroBet && (
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
              <SpotChip amount={zeroBet.amount} className={cn(lostKeys?.has(zeroBet.key) && 'opacity-45')} />
            </span>
          )}
        </div>

        {/* 1–36 + edge targets + chips */}
        <div className="relative col-start-2 row-start-1">
          <div className="grid size-full grid-cols-12 grid-rows-3">
            {[0, 1, 2].map((r) => Array.from({ length: 12 }, (_, c) => cell(numberAt(r, c))))}
          </div>
          {ZONES.map((z) => (
            <Zone
              key={z.key}
              z={z}
              disabled={disabled}
              onPlace={() => onPlace(z.spot)}
              onRemove={() => onRemove(z.spot)}
              onHover={hoverOn(z.spot)}
            />
          ))}
          {bets.map((b) => {
            if (b.type === 'straight' && b.numbers?.[0] === 0) return null;
            const p = chipPosition(b);
            if (!p) return null;
            const off = b.type === 'straight' ? { x: 0.3, y: 0.27 } : { x: 0, y: 0 };
            return (
              <span
                key={b.key}
                data-testid={`chip-on-${b.key}`}
                className={cn('pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2', lostKeys?.has(b.key) && 'opacity-45')}
                style={{ left: `${((p.x + off.x) / 12) * 100}%`, top: `${((p.y + off.y) / 3) * 100}%` }}
              >
                <SpotChip amount={b.amount} size={b.type === 'straight' ? 22 : 24} />
              </span>
            );
          })}
          {hover && hoverZone && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-default bg-surface-overlay px-2.5 py-1.5 text-caption text-text-primary shadow-elevation-1"
              style={{ left: `${(hoverZone.x / 12) * 100}%`, top: `calc(${(hoverZone.y / 3) * 100}% - 46px)` }}
            >
              {spotLabel(hover)} · pays {paysOf(hover.type)} · {covers(hover).length} of 37 pockets
            </span>
          )}
        </div>

        {/* 2:1 column boxes (3rd column on top) */}
        <div className="col-start-3 row-start-1 grid grid-rows-3">
          {OUTSIDE_SPOTS.columns.map((s) => box(s, '2:1', { className: 'min-h-0' }))}
        </div>

        {/* dozens */}
        <div className="col-start-2 row-start-2 grid grid-cols-3">
          {OUTSIDE_SPOTS.dozens.map((s, i) => box(s, ['1st 12', '2nd 12', '3rd 12'][i]))}
        </div>

        {/* even-money */}
        <div className="col-start-2 row-start-3 grid grid-cols-6">
          {OUTSIDE_SPOTS.even.map((s) =>
            box(s, { low: '1–18', even: 'EVEN', red: 'RED', black: 'BLACK', odd: 'ODD', high: '19–36' }[s.type as string], {
              dot: s.type === 'red' ? 'red' : s.type === 'black' ? 'black' : undefined,
            }),
          )}
        </div>
      </div>
      <OutsideHighlight hover={hover} />
    </div>
  );
}

/** Screen-reader echo of the previewed spot. */
function OutsideHighlight({ hover }: { hover: Spot | null }) {
  return (
    <p className="sr-only" aria-live="polite">
      {hover ? describeSpot(hover) : ''}
    </p>
  );
}

// ── vertical felt (mobile) ────────────────────────────────────────────────────────────────────

/**
 * Vertical felt (< 768): 0 on top, 12 rows of three numbers, even-money and dozen strips on the left, 2:1 boxes
 * at the bottom (64 × 44 cells). Tapping a number opens the bet-type sheet; outside boxes take the chip directly.
 */
export function RouletteFeltVertical({
  bets,
  onNumber,
  onPlace,
  onRemove,
  disabled,
  result,
  className,
}: {
  bets: Slip;
  onNumber: (n: number) => void;
  onPlace: (s: Spot) => void;
  onRemove: (s: Spot) => void;
  disabled?: boolean;
  result?: FeltResult | null;
  className?: string;
}) {
  const longPress = useLongPress();
  const numBtn = (n: number, cls?: string) => {
    const bet = betOn(bets, { type: 'straight', numbers: [n] });
    const winning = result?.pocket === n;
    return (
      <div key={n} className={cn('relative p-[1px]', cls)}>
        <button
          type="button"
          disabled={disabled}
          data-testid={`mfelt-${n}`}
          aria-label={`${n} ${colorOf(n)} — choose a bet type${bet ? `, straight bet ${bet.amount} DEMO` : ''}`}
          aria-haspopup="dialog"
          onClick={() => !longPress.fired() && onNumber(n)}
          {...longPress.bind(() => bet && onRemove({ type: 'straight', numbers: [n] }))}
          className={cn(
            'relative flex size-full items-center justify-center rounded-md border border-transparent text-label-l font-bold text-ink-50 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-focus',
            CELL_BG[colorOf(n)],
            winning && 'border-border-focus ring-2 ring-border-focus',
          )}
        >
          {n}
          {winning && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand text-text-on-primary">
              <CircleCheck aria-hidden className="size-3.5" />
            </span>
          )}
        </button>
      </div>
    );
  };
  const vbox = (s: Spot, label: string, cls: string, dot?: 'red' | 'black') => {
    const bet = betOn(bets, s);
    const k = spotKey(s);
    const won = !!result && result.won.has(k);
    const lost = !!result && result.lost.has(k);
    return (
      <div key={k} className={cn('p-[1px]', cls)}>
        <button
          type="button"
          disabled={disabled}
          data-testid={`mfelt-${k}`}
          aria-label={`${describeSpot(s)}${bet ? `, your bet ${bet.amount} DEMO` : ''}`}
          onClick={() => !longPress.fired() && onPlace(s)}
          {...longPress.bind(() => bet && onRemove(s))}
          className={cn(
            'relative flex size-full flex-col items-center justify-center gap-1 rounded-md border text-label-s text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus',
            won ? 'border-2 border-border-focus bg-brand-tint text-text-brand' : 'border-border-default bg-surface-raised',
            lost && 'opacity-45',
          )}
        >
          {dot && (
            <span aria-hidden className={cn('size-3 rounded-full border border-border-strong', dot === 'red' ? 'bg-status-danger-strong' : 'bg-ink-950')} />
          )}
          <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap">{label}</span>
          {bet && <SpotChip amount={bet.amount} size={22} />}
        </button>
      </div>
    );
  };

  return (
    <div className={cn('w-full rounded-xl border border-border-default bg-bg-secondary p-2', className)} role="group" aria-label="Roulette table — numbers">
      <div className="grid grid-cols-[40px_40px_repeat(3,minmax(0,1fr))] grid-rows-[44px_repeat(12,44px)_40px]">
        <div className="col-span-3 col-start-3 row-start-1">{numBtn(0, 'size-full')}</div>
        {OUTSIDE_SPOTS.even.map((s, i) =>
          vbox(
            s,
            { low: '1–18', even: 'EVEN', red: 'RED', black: 'BLACK', odd: 'ODD', high: '19–36' }[s.type as string]!,
            `col-start-1 row-span-2 ${['row-start-2', 'row-start-4', 'row-start-6', 'row-start-8', 'row-start-10', 'row-start-12'][i]}`,
            s.type === 'red' ? 'red' : s.type === 'black' ? 'black' : undefined,
          ),
        )}
        {OUTSIDE_SPOTS.dozens.map((s, i) =>
          vbox(s, ['1st 12', '2nd 12', '3rd 12'][i]!, `col-start-2 row-span-4 ${['row-start-2', 'row-start-6', 'row-start-10'][i]}`),
        )}
        <div className="relative col-span-3 col-start-3 row-span-12 row-start-2 grid grid-cols-3 grid-rows-12">
          {Array.from({ length: 36 }, (_, i) => numBtn(i + 1))}
          {bets.map((b) => {
            if (b.type === 'straight') return null;
            const p = chipPosition(b);
            if (!p) return null;
            // transpose the horizontal geometry: rows ← columns, columns ← 3 − rows
            return (
              <span
                key={b.key}
                className={cn('pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2', result?.lost.has(b.key) && 'opacity-45')}
                style={{ left: `${((3 - p.y) / 3) * 100}%`, top: `${(p.x / 12) * 100}%` }}
              >
                <SpotChip amount={b.amount} size={22} />
              </span>
            );
          })}
          {bets.map((b) => {
            if (b.type !== 'straight' || b.numbers?.[0] === 0) return null;
            const n = b.numbers![0]!;
            return (
              <span
                key={b.key}
                className={cn('pointer-events-none absolute z-20', result?.lost.has(b.key) && 'opacity-45')}
                style={{ left: `calc(${(((n - 1) % 3) + 1) / 3 * 100}% - 22px)`, top: `calc(${(Math.ceil(n / 3) / 12) * 100}% - 22px)` }}
              >
                <SpotChip amount={b.amount} size={20} />
              </span>
            );
          })}
        </div>
        {OUTSIDE_SPOTS.columns
          .slice()
          .reverse()
          .map((s, i) => {
            const bet = betOn(bets, s);
            const k = spotKey(s);
            const won = !!result && result.won.has(k);
            return (
              <div key={k} className={cn('row-start-14 p-[1px]', ['col-start-3', 'col-start-4', 'col-start-5'][i])}>
                <button
                  type="button"
                  disabled={disabled}
                  data-testid={`mfelt-${k}`}
                  aria-label={`${describeSpot(s)}${bet ? `, your bet ${bet.amount} DEMO` : ''}`}
                  onClick={() => !longPress.fired() && onPlace(s)}
                  {...longPress.bind(() => bet && onRemove(s))}
                  className={cn(
                    'flex size-full items-center justify-center gap-1 rounded-md border text-label-s text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus',
                    won ? 'border-2 border-border-focus bg-brand-tint text-text-brand' : 'border-border-default bg-surface-raised',
                    result?.lost.has(k) && 'opacity-45',
                  )}
                >
                  2:1
                  {bet && <SpotChip amount={bet.amount} size={20} />}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/** Long-press (500 ms) removes a chip on touch; the click that follows is swallowed. */
function useLongPress() {
  const timer = React.useRef<number | null>(null);
  const fired = React.useRef(false);
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    fired: () => {
      const f = fired.current;
      fired.current = false;
      return f;
    },
    bind: (onLong: () => void) => ({
      onPointerDown: () => {
        fired.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLong();
        }, 500);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
      },
    }),
  };
}
