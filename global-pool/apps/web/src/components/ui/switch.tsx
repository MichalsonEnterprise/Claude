'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Control/Toggle. Never default ON for spend- or risk-increasing settings. */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-strong bg-surface-raised p-0.5 transition-colors',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-[18px] rounded-full bg-ink-100 shadow-elevation-1 transition-transform duration-150 ease-standard data-[state=checked]:translate-x-5 data-[state=checked]:bg-ink-950"
      />
    </SwitchPrimitive.Root>
  );
}
