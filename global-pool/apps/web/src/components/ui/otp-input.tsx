'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { useField } from './input';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are entered. */
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  /** Focus the field when it mounts (dedicated code-entry steps only). */
  focusOnMount?: boolean;
  /** Accessible name when not inside a <Field>. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Input/OTP: 6 boxes (48×56, Geist Mono digits). One real <input> (autocomplete="one-time-code", numeric
 * keyboard, paste of the whole code) sits over the boxes, so screen readers and password managers see a
 * single field. Error state shakes once (disabled under reduced motion).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  focusOnMount,
  className,
  ...props
}: OtpInputProps) {
  const field = useField();
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);
  const isInvalid = invalid ?? field?.invalid ?? false;
  const isDisabled = disabled ?? field?.disabled ?? false;
  const chars = value.split('').slice(0, length);
  const activeIndex = Math.min(chars.length, length - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <div className={cn('relative w-fit', isInvalid && 'motion-safe:animate-shake', className)}>
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length }, (_, i) => {
          const ch = chars[i];
          const active = focused && i === activeIndex && !isDisabled;
          return (
            <span
              key={i}
              className={cn(
                'relative flex h-14 w-12 items-center justify-center rounded-md border bg-surface-default font-mono text-number-m text-text-primary transition-colors',
                isInvalid ? 'border-border-danger' : active ? 'border-border-focus shadow-[0_0_0_3px_rgba(91,232,156,0.18)]' : ch ? 'border-border-strong' : 'border-border-default',
                isDisabled && 'border-border-subtle bg-bg-secondary text-text-disabled',
              )}
            >
              {ch ?? ''}
              {active && !ch && <span className="h-6 w-0.5 animate-live-pulse bg-brand" />}
            </span>
          );
        })}
      </div>
      <input
        id={field?.id}
        aria-describedby={field?.describedBy}
        aria-invalid={isInvalid || undefined}
        aria-label={props['aria-label'] ?? (field ? undefined : `${length}-digit code`)}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSelect={(e) => {
          const el = e.currentTarget;
          const end = el.value.length;
          if (el.selectionStart !== end) el.setSelectionRange(end, end);
        }}
        disabled={isDisabled}
        ref={inputRef}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
}
