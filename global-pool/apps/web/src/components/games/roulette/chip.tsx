'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { CHIPS, chipFace, chipFor, type ChipDef } from './roulette-math';

/** Game/Chip (Figma 23:12227) colours — token variables only. */
const TONE: Record<ChipDef['tone'], { ring: string; dash: string }> = {
  grey: { ring: 'var(--color-ink-300)', dash: 'var(--color-ink-50)' },
  white: { ring: 'var(--color-ink-100)', dash: 'var(--color-ink-400)' },
  red: { ring: 'var(--color-status-danger-strong)', dash: 'var(--color-ink-50)' },
  sky: { ring: 'var(--color-sky-400)', dash: 'var(--color-ink-50)' },
  green: { ring: 'var(--color-green-500)', dash: 'var(--color-ink-50)' },
  black: { ring: 'var(--color-ink-950)', dash: 'var(--color-mint-500)' },
  violet: { ring: 'var(--color-violet-300)', dash: 'var(--color-ink-50)' },
};

const DASHES = Array.from({ length: 8 }, (_, i) => i * 45);

/** The chip face (SVG, 48 × 48 viewBox) — concrete object, no glow. */
export function ChipFace({ tone, label, className }: { tone: ChipDef['tone']; label: string; className?: string }) {
  const t = TONE[tone];
  const fs = label.length >= 4 ? 10.5 : label.length === 3 ? 12 : 14;
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('block', className)}>
      <circle cx="24" cy="24" r="23" fill={t.ring} />
      {DASHES.map((a) => (
        <rect key={a} x="21.5" y="1.5" width="5" height="6" rx="1" fill={t.dash} transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="15.5" fill="var(--color-ink-900)" stroke={t.ring} strokeWidth="1.5" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke={t.dash} strokeOpacity="0.35" strokeWidth="0.75" strokeDasharray="2 2" />
      <text
        x="24"
        y="24"
        dy="0.36em"
        textAnchor="middle"
        fontSize={fs}
        fontWeight={700}
        fill="var(--color-ink-50)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </text>
    </svg>
  );
}

/** A selectable chip in the tray (radio semantics, ≥ 44 px target). */
export function ChipButton({
  chip,
  selected,
  disabled,
  size = 48,
  onSelect,
  buttonRef,
  onKeyDown,
}: {
  onKeyDown?: (e: React.KeyboardEvent) => void;
  chip: ChipDef;
  selected: boolean;
  disabled?: boolean;
  size?: number;
  onSelect: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      tabIndex={selected ? 0 : -1}
      role="radio"
      aria-checked={selected}
      aria-label={`Chip ${chip.label} DEMO credits`}
      disabled={disabled}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      data-testid={`chip-${chip.value}`}
      className={cn(
        'shrink-0 rounded-full transition-transform duration-150 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus disabled:opacity-40',
        selected ? 'ring-2 ring-border-focus ring-offset-2 ring-offset-bg-secondary' : 'hover:-translate-y-0.5',
      )}
      style={{ width: size, height: size }}
    >
      <ChipFace tone={chip.tone} label={chip.label} className="size-full" />
    </button>
  );
}

/** Row of chips (radio group). */
export function ChipRow({
  value,
  onChange,
  disabled,
  size = 48,
  className,
  label = 'Chip value',
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  size?: number;
  className?: string;
  label?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, CHIPS.findIndex((c) => c.value === value));
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + CHIPS.length) % CHIPS.length;
    onChange(CHIPS[n]!.value);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex items-center gap-1.5', className)}>
      {CHIPS.map((c, i) => (
        <ChipButton
          key={c.value}
          chip={c}
          selected={c.value === value}
          disabled={disabled}
          size={size}
          onSelect={() => onChange(c.value)}
          onKeyDown={onKey}
          buttonRef={(el) => {
            refs.current[i] = el;
          }}
        />
      ))}
    </div>
  );
}

/** The chip drawn on a spot for its total amount (largest denomination colour + compact face). */
export function SpotChip({ amount, size = 24, className }: { amount: string; size?: number; className?: string }) {
  const c = chipFor(amount);
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none block rounded-full shadow-elevation-2', className)}
      style={{ width: size, height: size }}
    >
      <ChipFace tone={c.tone} label={chipFace(amount)} className="size-full" />
    </span>
  );
}
