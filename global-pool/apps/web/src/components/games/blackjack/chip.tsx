'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import type { ChipValue } from './bj-math';

/** Chip colours per value (BJ-01 tray: 1 white · 5 red · 10 sky · 25 green · 100 black) — token variables only. */
const TONE: Record<ChipValue, { ring: string; dash: string }> = {
  '1': { ring: 'var(--color-ink-100)', dash: 'var(--color-ink-500)' },
  '5': { ring: 'var(--color-status-danger-strong)', dash: 'var(--color-ink-50)' },
  '10': { ring: 'var(--color-sky-400)', dash: 'var(--color-ink-50)' },
  '25': { ring: 'var(--color-green-500)', dash: 'var(--color-ink-50)' },
  '100': { ring: 'var(--color-ink-950)', dash: 'var(--color-mint-500)' },
};

const DASHES = Array.from({ length: 8 }, (_, i) => i * 45);

/** Casino chip face (SVG). `value` picks the colour; any other label (e.g. "12.50") uses the sky chip. */
export function BjChipFace({ value, label, className }: { value: string; label?: string; className?: string }) {
  const t = TONE[value as ChipValue] ?? TONE['10'];
  const text = label ?? value;
  const fs = text.length >= 5 ? 8.5 : text.length === 4 ? 10 : text.length === 3 ? 12 : 14;
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('block', className)}>
      <circle cx="24" cy="24" r="23" fill={t.ring} />
      {DASHES.map((a) => (
        <rect key={a} x="21.5" y="1.5" width="5" height="6" rx="1" fill={t.dash} transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="15.5" fill="var(--color-ink-900)" stroke={t.ring} strokeWidth="1.5" />
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
        {text}
      </text>
    </svg>
  );
}

/** Chip value selector in the tray (radio semantics, ≥ 44 px target). */
export function ChipRadio({
  value,
  selected,
  disabled,
  onSelect,
  onKeyDown,
  buttonRef,
}: {
  value: ChipValue;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Chip value ${value} DEMO credits`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      data-testid={`bj-chip-${value}`}
      className={cn(
        'flex size-12 items-center justify-center rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus disabled:cursor-not-allowed disabled:opacity-45',
        selected && 'ring-2 ring-brand ring-offset-2 ring-offset-surface-default',
        !disabled && 'hover:-translate-y-0.5',
      )}
    >
      <BjChipFace value={value} className="size-11" />
    </button>
  );
}

/** Radio group of chip values with roving arrow keys. */
export function ChipTray({
  values,
  value,
  onChange,
  disabled,
  className,
}: {
  values: readonly ChipValue[];
  value: ChipValue;
  onChange: (v: ChipValue) => void;
  disabled?: boolean;
  className?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number, d: number) => {
    const n = (i + d + values.length) % values.length;
    onChange(values[n]!);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Chip value" className={cn('flex flex-wrap items-center gap-2', className)}>
      {values.map((v, i) => (
        <ChipRadio
          key={v}
          value={v}
          selected={value === v}
          disabled={disabled}
          onSelect={() => onChange(v)}
          buttonRef={(el) => {
            refs.current[i] = el;
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              move(i, 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              move(i, -1);
            }
          }}
        />
      ))}
    </div>
  );
}
