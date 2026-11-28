'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
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

/** Confirmation: a modal on tablet/desktop, a bottom sheet on mobile (MOB-09 pattern). */
export function ConfirmSurface({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = 'danger',
  confirmIcon,
  onConfirm,
  busy = false,
  confirmDisabled = false,
  cancelLabel = 'Cancel',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  confirmIcon?: React.ReactNode;
  onConfirm: () => void;
  busy?: boolean;
  confirmDisabled?: boolean;
  cancelLabel?: string;
}) {
  const desktop = useMediaQuery(MQ.tablet, true);
  const actions = (
    <>
      <Button
        variant="secondary"
        size="l"
        className="max-tablet:flex-1"
        onClick={() => onOpenChange(false)}
      >
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        size="l"
        className="max-tablet:flex-1"
        leadingIcon={confirmIcon}
        loading={busy}
        disabled={confirmDisabled}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </>
  );
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="m">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children && <DialogBody className="flex flex-col gap-3">{children}</DialogBody>}
          <DialogFooter>{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {children && <SheetBody className="flex flex-col gap-3">{children}</SheetBody>}
        <SheetFooter className="flex-row gap-2">{actions}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
