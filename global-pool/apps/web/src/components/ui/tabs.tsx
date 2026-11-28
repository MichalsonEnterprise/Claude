'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Tabs (Figma Tabs/Underline · Tabs/Pill · Tabs/Segmented). Set `variant` on <TabsList>; triggers inherit it.
 * Keyboard: arrow keys move between tabs (Radix roving focus).
 */
type TabsVariant = 'underline' | 'pill' | 'segmented';
const VariantContext = React.createContext<TabsVariant>('underline');

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />;
}

export function TabsList({
  className,
  variant = 'underline',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          'no-scrollbar flex max-w-full items-center overflow-x-auto',
          variant === 'underline' && 'gap-6 border-b border-border-subtle',
          variant === 'pill' && 'gap-2',
          variant === 'segmented' && 'inline-flex w-fit gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1',
          className,
        )}
        {...props}
      />
    </VariantContext.Provider>
  );
}

export function TabsTrigger({
  className,
  children,
  count,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number }) {
  const variant = React.useContext(VariantContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-label-m transition-colors duration-150 ease-standard disabled:pointer-events-none disabled:text-text-disabled [&_svg]:size-4',
        variant === 'underline' &&
          'relative -mb-px h-11 border-b-2 border-transparent px-0.5 text-text-secondary hover:text-text-primary data-[state=active]:border-brand data-[state=active]:text-text-primary',
        variant === 'pill' &&
          'h-9 rounded-full border border-border-default bg-surface-default px-4 text-text-secondary hover:border-border-strong hover:text-text-primary data-[state=active]:border-border-brand data-[state=active]:bg-brand-tint data-[state=active]:text-text-brand',
        variant === 'segmented' &&
          'h-8 rounded-sm px-3 text-text-secondary hover:text-text-primary data-[state=active]:bg-surface-raised data-[state=active]:text-text-primary data-[state=active]:shadow-elevation-1',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-pressed px-1.5 text-[11px] font-semibold text-text-secondary tabular-nums">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />;
}
