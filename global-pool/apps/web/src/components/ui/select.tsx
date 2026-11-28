'use client';

import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { useField } from './input';

/** Select/Field (320) + Menu/Panel styling. Use inside <Field> for label/helper/error wiring. */
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  size = 'm',
  children,
  id,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: 's' | 'm' | 'l' }) {
  const field = useField();
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      id={id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(
        'flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border-default bg-surface-default px-3 text-left text-text-primary transition-colors duration-150 ease-standard',
        'hover:border-border-strong focus-visible:border-border-focus focus-visible:outline-none data-[state=open]:border-border-focus',
        'aria-invalid:border-border-danger data-[placeholder]:text-text-tertiary disabled:pointer-events-none disabled:bg-bg-secondary disabled:text-text-disabled',
        '[&>span]:flex [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-2 [&>span]:truncate',
        size === 's' && 'h-8 text-body-s',
        size === 'm' && 'h-10 text-body-s',
        size === 'l' && 'h-12 text-body-m',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-icon-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={position === 'popper' ? 8 : undefined}
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-hidden rounded-lg border border-border-subtle bg-surface-overlay text-text-primary shadow-elevation-3',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          position === 'popper' && 'w-(--radix-select-trigger-width)',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-icon-muted">
          <ChevronUp aria-hidden className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-icon-muted">
          <ChevronDown aria-hidden className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('px-3 pt-2 pb-1 text-overline uppercase text-text-tertiary', className)}
      {...props}
    />
  );
}

export function SelectItem({
  className,
  children,
  description,
  aside,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  /** Secondary line under the label (not copied into the trigger). */
  description?: React.ReactNode;
  /** Right-aligned meta (fee, status). */
  aside?: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex min-h-10 w-full cursor-pointer select-none items-center gap-3 rounded-sm py-2 pr-9 pl-3 text-body-s text-text-primary outline-none',
        'data-[highlighted]:bg-surface-hover data-[state=checked]:bg-surface-selected data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55',
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SelectPrimitive.ItemText asChild>
          <span className="flex min-w-0 items-center gap-2">{children}</span>
        </SelectPrimitive.ItemText>
        {description && <span className="text-caption text-text-tertiary">{description}</span>}
      </span>
      {aside && <span className="flex shrink-0 flex-col items-end gap-0.5 text-caption">{aside}</span>}
      <span className="absolute right-3 flex size-4 items-center justify-center text-icon-brand">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border-subtle', className)} {...props} />;
}
