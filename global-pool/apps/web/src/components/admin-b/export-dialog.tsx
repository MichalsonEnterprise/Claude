'use client';

/**
 * ADM-F9 Export CSV modal: Configure → Generating → Ready (file name, rows, SHA-256, expiry, audit entry) or
 * Error (e.g. over the row limit). Personal data is OFF by default and needs `users.pii.read`; a reason is
 * required; the file carries a watermark line. Generation happens on the API (POST /admin/finance/exports).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ADMIN_EXPORT_DATASET_LABEL,
  ADMIN_EXPORT_ROW_LIMIT,
  ADMIN_REASON_CATEGORIES,
  adminReasonSchema,
  type AdminExportDataset,
} from '@gp/shared/schemas';
import { CircleCheck, Download, FileSpreadsheet, ScrollText, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { SwitchField } from '@/components/ui/switch';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiRequestError } from '@/lib/api/client';
import { useCan, useExport, type ExportResult } from '@/lib/api/admin-b';

import { CopyHash, count, dt } from './primitives';

const formSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    includePersonalData: z.boolean(),
    reasonCategory: z.string().optional(),
    reason: adminReasonSchema,
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'The start date must be before the end date',
    path: ['to'],
  });
type FormValues = z.infer<typeof formSchema>;

type Phase =
  | { kind: 'configure' }
  | { kind: 'generating' }
  | { kind: 'ready'; result: ExportResult }
  | { kind: 'error'; message: string; tooLarge?: { rows: number; limit: number } };

function download(result: ExportResult) {
  const blob = new Blob([result.csv], { type: result.contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportCsvButton({
  dataset,
  label = 'Export CSV',
  size = 's',
}: {
  dataset: AdminExportDataset;
  label?: string;
  size?: 's' | 'm';
}) {
  const [open, setOpen] = React.useState(false);
  const canExport = useCan('reports.export');
  return (
    <>
      <Button
        variant="secondary"
        size={size}
        leadingIcon={<Download aria-hidden />}
        onClick={() => setOpen(true)}
        disabled={!canExport}
        title={canExport ? undefined : 'Your role cannot export reports'}
      >
        {label}
      </Button>
      <ExportCsvDialog open={open} onOpenChange={setOpen} dataset={dataset} />
    </>
  );
}

export function ExportCsvDialog({
  open,
  onOpenChange,
  dataset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: AdminExportDataset;
}) {
  const canPii = useCan('users.pii.read');
  const mutation = useExport();
  const [phase, setPhase] = React.useState<Phase>({ kind: 'configure' });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from: '',
      to: '',
      includePersonalData: false,
      reasonCategory: ADMIN_REASON_CATEGORIES.export[0],
      reason: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setPhase({ kind: 'configure' });
      form.reset();
    }
  }, [open, form]);

  const submit = form.handleSubmit(async (v) => {
    setPhase({ kind: 'generating' });
    try {
      const result = await mutation.mutateAsync({
        dataset,
        from: v.from || undefined,
        to: v.to || undefined,
        includePersonalData: v.includePersonalData,
        reasonCategory: v.reasonCategory,
        reason: v.reason,
      });
      setPhase({ kind: 'ready', result });
    } catch (err) {
      if (err instanceof ApiRequestError && err.details?.reason === 'export_too_large') {
        setPhase({
          kind: 'error',
          message: err.message,
          tooLarge: { rows: Number(err.details.rows), limit: Number(err.details.limit) },
        });
      } else {
        setPhase({
          kind: 'error',
          message:
            err instanceof ApiRequestError
              ? err.message
              : 'The export failed. Nothing was generated.',
        });
      }
    }
  });

  const errors = form.formState.errors;
  const name = ADMIN_EXPORT_DATASET_LABEL[dataset];

  return (
    <Dialog open={open} onOpenChange={(o) => phase.kind !== 'generating' && onOpenChange(o)}>
      <DialogContent size="m">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Export CSV — {name} <DemoBadge size="xs" />
          </DialogTitle>
          <DialogDescription>
            Generated from the ledger at request time. Every export is watermarked and written to
            the audit log.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="overflow-y-auto">
          {phase.kind === 'configure' ? (
            <form id="admin-b-export" onSubmit={submit} noValidate className="flex flex-col gap-4">
              <div className="grid gap-3 tablet:grid-cols-2">
                <Field label="From (UTC)" helper="Empty = from the first record">
                  <Input type="date" {...form.register('from')} />
                </Field>
                <Field label="To (UTC)" error={errors.to?.message}>
                  <Input type="date" {...form.register('to')} />
                </Field>
              </div>
              <Controller
                control={form.control}
                name="includePersonalData"
                render={({ field }) => (
                  <SwitchField
                    className="rounded-md border border-border-subtle p-3"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                    disabled={!canPii}
                    label="Include personal data"
                    description={
                      canPii
                        ? 'User handles and destination addresses. Off by default — exports keep them masked unless you switch this on.'
                        : 'Your role cannot export personal data (needs “Reveal personal data”). Handles and addresses stay masked.'
                    }
                  />
                )}
              />
              <Controller
                control={form.control}
                name="reasonCategory"
                render={({ field }) => (
                  <Field label="Purpose">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMIN_REASON_CATEGORIES.export.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Field
                label="Reason for export (required)"
                labelAside={
                  <span className="text-caption text-text-tertiary tabular-nums">
                    {(form.watch('reason') ?? '').length} / 500
                  </span>
                }
                helper={
                  errors.reason ? undefined : 'Never share passwords, seed phrases or 2FA codes.'
                }
                error={errors.reason?.message}
              >
                <Textarea
                  rows={2}
                  placeholder="e.g. November close for the finance review"
                  {...form.register('reason')}
                />
              </Field>
              <p className="flex items-start gap-2 text-caption text-text-tertiary">
                <ScrollText aria-hidden className="mt-0.5 size-4 shrink-0" />
                Limit {count(ADMIN_EXPORT_ROW_LIMIT)} rows per file. Your name, reason, the row
                count and the file’s SHA-256 are recorded in the audit log.
              </p>
            </form>
          ) : phase.kind === 'generating' ? (
            <div
              className="flex flex-col items-center gap-3 py-8 text-center"
              aria-live="polite"
              aria-busy="true"
            >
              <FileSpreadsheet aria-hidden className="size-10 text-icon-brand" />
              <p className="text-h5 text-text-primary">Generating {name.toLowerCase()} export…</p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-raised">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
              </div>
              <p className="text-caption text-text-tertiary">
                Reading the append-only ledger. Keep this window open.
              </p>
            </div>
          ) : phase.kind === 'ready' ? (
            <div className="flex flex-col gap-4" aria-live="polite">
              <p className="flex items-center gap-2 text-h5 text-text-success">
                <CircleCheck aria-hidden className="size-5" /> Export ready
              </p>
              <dl className="grid gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3 text-body-s">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-tertiary">File</dt>
                  <dd className="min-w-0 truncate font-mono text-mono-s text-text-primary">
                    {phase.result.fileName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-tertiary">Rows</dt>
                  <dd className="tabular-nums text-text-primary">{count(phase.result.rows)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-tertiary">SHA-256</dt>
                  <dd>
                    <CopyHash value={phase.result.sha256} label="SHA-256" />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-tertiary">Personal data</dt>
                  <dd className="text-text-primary">
                    {phase.result.includePersonalData ? 'Included' : 'Masked'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-tertiary">Link expires</dt>
                  <dd className="text-text-primary">{dt(phase.result.expiresAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-tertiary">Audit entry</dt>
                  <dd className="font-mono text-mono-s text-text-primary">
                    #{count(Number(phase.result.auditSeq))}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div role="alert" className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-h5 text-text-danger">
                <TriangleAlert aria-hidden className="size-5" />
                {phase.tooLarge ? 'Too many rows for one file' : 'Export failed'}
              </p>
              <p className="text-body-s text-text-secondary">{phase.message}</p>
              {phase.tooLarge ? (
                <p className="text-caption text-text-tertiary">
                  {count(phase.tooLarge.rows)} rows · limit {count(phase.tooLarge.limit)}. Choose a
                  shorter date range; nothing was generated or logged as exported.
                </p>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {phase.kind === 'configure' ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="admin-b-export"
                leadingIcon={<FileSpreadsheet aria-hidden />}
              >
                Generate CSV
              </Button>
            </>
          ) : phase.kind === 'ready' ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button leadingIcon={<Download aria-hidden />} onClick={() => download(phase.result)}>
                Download CSV
              </Button>
            </>
          ) : phase.kind === 'error' ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setPhase({ kind: 'configure' })}>Change settings</Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
