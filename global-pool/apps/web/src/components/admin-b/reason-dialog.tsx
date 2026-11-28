'use client';

/**
 * Confirm-with-reason dialog for admin-b's controlled actions (withdrawal approve/reject, KYC decisions,
 * circuit breaker, refund reminders, CSV exports). Reason category + mandatory written reason (min. 5) + a fresh
 * 6-digit authenticator code (when `mfa`), a four-eyes notice where a second admin is needed and an audit notice.
 * Dialog on ≥ 768, bottom sheet on phones. Validation uses the shared zod schemas (@gp/shared/schemas).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { adminReasonSchema, totpCodeSchema } from '@gp/shared/schemas';
import { ScrollText, Users } from 'lucide-react';
import * as React from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { Button, type ButtonVariant } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ApiRequestError } from '@/lib/api/client';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

export interface ReasonValues {
  reasonCategory?: string;
  reason: string;
  mfaCode?: string;
}

const withMfa = z.object({
  reasonCategory: z.string().optional(),
  reason: adminReasonSchema,
  mfaCode: totpCodeSchema,
});
const withoutMfa = z.object({
  reasonCategory: z.string().optional(),
  reason: adminReasonSchema,
  mfaCode: z.string().optional(),
});

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  summary,
  categories,
  mfa = true,
  fourEyes,
  confirmLabel,
  confirmVariant = 'primary',
  onSubmit,
  children,
  reasonPlaceholder = 'Explain the decision for the audit log (what you checked and why).',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** What is being decided (amounts, ids) — rendered read-only above the form. */
  summary?: React.ReactNode;
  categories?: readonly string[];
  mfa?: boolean;
  /** Four-eyes notice text (null = not needed). */
  fourEyes?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onSubmit: (values: ReasonValues) => Promise<unknown>;
  children?: React.ReactNode;
  reasonPlaceholder?: string;
}) {
  const isTablet = useMediaQuery(MQ.tablet, true);
  const schema = mfa ? withMfa : withoutMfa;
  const form = useForm<ReasonValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ReasonValues>,
    defaultValues: { reasonCategory: categories?.[0], reason: '', mfaCode: '' },
    mode: 'onSubmit',
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      form.reset({ reasonCategory: categories?.[0], reason: '', mfaCode: '' });
      setServerError(null);
    }
  }, [open, categories, form]);

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (
          err.code === 'STEP_UP_REQUIRED' ||
          err.code === 'UNAUTHENTICATED' ||
          /code/i.test(err.message)
        ) {
          if (mfa) form.setError('mfaCode', { message: err.message });
          else setServerError(err.message);
        } else if (err.code === 'VALIDATION_FAILED' && err.details?.field === 'reason') {
          form.setError('reason', { message: err.message });
        } else {
          setServerError(err.message);
        }
        if (mfa) form.setValue('mfaCode', '');
      } else {
        setServerError('The request failed. Nothing was changed — try again.');
      }
    }
  });

  const errors = form.formState.errors;
  const busy = form.formState.isSubmitting;
  const formId = React.useId();

  const body = (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      {summary ? (
        <div className="rounded-md border border-border-subtle bg-bg-secondary p-3">{summary}</div>
      ) : null}
      {children}
      {categories && categories.length > 0 ? (
        <Controller
          control={form.control}
          name="reasonCategory"
          render={({ field }) => (
            <Field label="Reason category">
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      ) : null}
      <Field
        label="Reason (required)"
        helper={
          errors.reason ? undefined : 'Min. 5 characters. Stored in the hash-chained audit log.'
        }
        error={errors.reason?.message}
      >
        <Textarea rows={3} placeholder={reasonPlaceholder} {...form.register('reason')} />
      </Field>
      {mfa ? (
        <Controller
          control={form.control}
          name="mfaCode"
          render={({ field }) => (
            <Field
              label="Authenticator code"
              helper={
                errors.mfaCode ? undefined : 'Fresh 6-digit code from your admin authenticator app.'
              }
              error={errors.mfaCode?.message}
            >
              <OtpInput
                value={field.value ?? ''}
                onChange={field.onChange}
                invalid={Boolean(errors.mfaCode)}
              />
            </Field>
          )}
        />
      ) : null}
      {fourEyes ? (
        <p className="flex items-start gap-2 rounded-md bg-status-warning-tint p-3 text-caption text-text-warning">
          <Users aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{fourEyes}</span>
        </p>
      ) : null}
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <ScrollText aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          This action is recorded in the audit log with your name, reason, IP and time. It cannot be
          edited.
        </span>
      </p>
      {serverError ? (
        <p
          role="alert"
          className="rounded-md bg-status-danger-tint p-3 text-body-s text-text-danger"
        >
          {serverError}
        </p>
      ) : null}
    </form>
  );

  const footer = (
    <>
      <Button
        variant="secondary"
        onClick={() => onOpenChange(false)}
        disabled={busy}
        className="max-tablet:flex-1"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        variant={confirmVariant}
        loading={busy}
        className={cn('max-tablet:flex-1')}
      >
        {confirmLabel}
      </Button>
    </>
  );

  if (!isTablet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92dvh]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <SheetBody className="overflow-y-auto">{body}</SheetBody>
          <SheetFooter className="flex-row gap-2">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="m">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody className="overflow-y-auto">{body}</DialogBody>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
