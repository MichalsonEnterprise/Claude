'use client';

import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Sheet (Figma Sheet/Bottom + Drawer/Detail + Shell/Mobile Drawer):
 * - side="bottom": mobile bottom sheet, top radius 28, grabber, sticky footer, safe-area padding.
 * - side="right": desktop detail / filter drawer, 480 wide, left corners radius 20.
 * - side="left": full-height navigation drawer (mobile menu).
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva(
  'fixed z-50 flex flex-col bg-surface-overlay text-text-primary shadow-elevation-4 outline-none transition ease-standard data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:duration-200',
  {
    variants: {
      side: {
        bottom:
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-border-subtle pb-safe data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        right:
          'inset-y-0 right-0 h-dvh w-full max-w-[480px] rounded-l-xl border-l border-border-subtle data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        left: 'inset-y-0 left-0 h-dvh w-full max-w-[390px] border-r border-border-subtle bg-bg-secondary data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
      },
    },
    defaultVariants: { side: 'bottom' },
  },
);

export function SheetContent({
  className,
  children,
  side = 'bottom',
  showClose = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'bottom' | 'right' | 'left';
  showClose?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {side === 'bottom' && (
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong"
          />
        )}
        {children}
        {showClose && (
          <SheetPrimitive.Close
            aria-label="Close"
            className={cn(
              'absolute right-3 inline-flex size-11 items-center justify-center rounded-md text-icon-muted transition-colors hover:bg-surface-hover hover:text-icon-default',
              side === 'bottom' ? 'top-4' : 'top-3',
            )}
          >
            <X aria-hidden className="size-5" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex min-h-14 flex-col justify-center gap-1 px-4 pt-3 pr-16', className)}
      {...props}
    />
  );
}

export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4', className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'flex flex-col gap-3 border-t border-border-subtle bg-surface-overlay px-4 py-4',
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-h5 text-text-primary', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-body-s text-text-secondary', className)}
      {...props}
    />
  );
}
