'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Input, type InputProps } from './input';

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

/** Heuristic strength for UI feedback only — the server enforces the real policy (admins: argon2id). */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return 'empty';
  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score >= 4) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

const STRENGTH: Record<
  Exclude<PasswordStrength, 'empty'>,
  { label: string; bars: number; cls: string }
> = {
  weak: { label: 'Weak', bars: 1, cls: 'bg-status-danger' },
  fair: { label: 'Fair', bars: 2, cls: 'bg-status-warning' },
  strong: { label: 'Strong', bars: 4, cls: 'bg-status-success' },
};

/**
 * Input/Password with show/hide toggle and optional strength meter. Players have no passwords (Privy) —
 * this is for admin sign-in and step-up flows.
 */
export function PasswordInput({
  showStrength = false,
  value,
  ...props
}: Omit<InputProps, 'type' | 'trailing'> & { showStrength?: boolean; value?: string }) {
  const [visible, setVisible] = React.useState(false);
  const strength = passwordStrength(value ?? '');
  const spec = strength === 'empty' ? null : STRENGTH[strength];
  return (
    <div className="flex flex-col gap-2">
      <Input
        type={visible ? 'text' : 'password'}
        autoComplete="current-password"
        value={value}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="-mr-1.5 flex size-8 items-center justify-center rounded-sm text-icon-muted hover:bg-surface-hover hover:text-icon-default"
          >
            {visible ? (
              <EyeOff aria-hidden className="size-[18px]" />
            ) : (
              <Eye aria-hidden className="size-[18px]" />
            )}
          </button>
        }
        {...props}
      />
      {showStrength && (
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full',
                  spec && i < spec.bars ? spec.cls : 'bg-surface-raised',
                )}
              />
            ))}
          </div>
          <span className="w-12 text-right text-caption text-text-tertiary">
            {spec ? spec.label : <span className="sr-only">No password</span>}
          </span>
        </div>
      )}
    </div>
  );
}
