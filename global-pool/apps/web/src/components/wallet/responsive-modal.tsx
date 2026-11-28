'use client';

import * as React from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';

export interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 's' | 'm' | 'l';
  /** Hide the close icon for decisions that need an explicit choice. */
  showClose?: boolean;
  /** Desktop variant: centred dialog (default) or right drawer (detail views). */
  desktop?: 'dialog' | 'drawer';
}

/**
 * Mobile-first modal (MOB-05/06/07 pattern): bottom sheet with grabber < 768 px, dialog (or right drawer) above.
 * Focus trap, Esc and focus return come from Radix.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'm',
  showClose = true,
  desktop = 'dialog',
}: ResponsiveModalProps) {
  const wide = useMediaQuery(MQ.tablet, true);
  if (!wide || desktop === 'drawer') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={wide ? 'right' : 'bottom'} showClose={showClose}>
          <SheetHeader className={wide ? 'px-6 pt-6' : undefined}>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <SheetBody className={wide ? 'px-6' : undefined}>{children}</SheetBody>
          {footer && <SheetFooter className={wide ? 'px-6' : undefined}>{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size} showClose={showClose}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
