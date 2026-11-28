'use client';

import { Info } from 'lucide-react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Wrap the app once (done in src/app/providers.tsx). */
export function TooltipProvider({
  delayDuration = 150,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

export function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** Figma Tooltip (Info | Definition; Top | Bottom): surface/raised, radius sm, 16×8 arrow. */
export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-50 max-w-72 origin-(--radix-tooltip-content-transform-origin) rounded-sm border border-border-default bg-surface-raised px-3 py-2 text-body-s text-text-primary shadow-elevation-3',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow width={16} height={8} className="fill-surface-raised" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/** Info icon with a tooltip (fee lines, balance definitions). The trigger is a real button (keyboard + touch). */
export function InfoTooltip({
  label,
  children,
  side = 'top',
  className,
}: {
  /** Accessible name of the trigger, e.g. "What is the platform fee?". */
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-icon-muted transition-colors hover:text-icon-default',
            className,
          )}
        >
          <Info aria-hidden className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>{children}</TooltipContent>
    </Tooltip>
  );
}

/** Definition tooltip: term (dotted underline) + definition (Figma Tooltip Type=Definition). */
export function DefinitionTooltip({
  term,
  definition,
  side = 'top',
}: {
  term: React.ReactNode;
  definition: React.ReactNode;
  side?: 'top' | 'bottom';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help underline decoration-text-tertiary decoration-dotted underline-offset-4"
        >
          {term}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p className="text-label-m text-text-primary">{term}</p>
        <p className="mt-1 text-body-s text-text-secondary">{definition}</p>
      </TooltipContent>
    </Tooltip>
  );
}
