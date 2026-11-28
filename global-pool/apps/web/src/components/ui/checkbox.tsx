'use client';

import { Check, Minus } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Control/Checkbox. Consent checkboxes are NEVER pre-checked (guardrail) — don't pass defaultChecked for them.
 */
export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer inline-flex size-5 shrink-0 items-center justify-center rounded-xs border-2 border-border-strong bg-surface-default text-text-on-primary transition-colors',
        'hover:border-text-tertiary data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand',
        'aria-invalid:border-border-danger disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === 'indeterminate' ? (
          <Minus aria-hidden className="size-3.5" strokeWidth={3} />
        ) : (
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/** Checkbox + label (+ description) row with a 44px-friendly hit area. */
export function CheckboxField({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  const auto = React.useId();
  const cid = id ?? auto;
  return (
    <div className={cn('flex items-start gap-3 py-1', className)}>
      <Checkbox
        id={cid}
        className="mt-0.5"
        aria-describedby={description ? `${cid}-d` : undefined}
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={cid}
          className="text-body-s text-text-primary peer-disabled:text-text-disabled"
        >
          {label}
        </label>
        {description && (
          <p id={`${cid}-d`} className="text-caption text-text-tertiary">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
