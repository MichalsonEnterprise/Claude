'use client';

import type { TxType } from '@gp/shared/enums';
import { formatCount, formatDateUTC } from '@gp/shared/format';
import { Download } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
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
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SwitchField } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { historyApi, saveCsv, useHistoryTransactions } from '@/lib/api/rg-history';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

type Period = 'month' | '90d' | 'year' | 'all';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];
const INCLUDE: { id: TxType; label: string }[] = [
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'entry_purchase', label: 'Entries' },
  { id: 'prize', label: 'Prizes' },
  { id: 'reward', label: 'Rewards' },
  { id: 'refund', label: 'Refunds' },
];

export function periodFrom(p: Period, now = new Date()): string | undefined {
  if (p === 'all') return undefined;
  if (p === 'month')
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  if (p === 'year') return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  return new Date(now.getTime() - 90 * 86_400_000).toISOString();
}

function ChipToggle({
  pressed,
  onClick,
  children,
  role,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: 'radio';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : pressed}
      aria-checked={role ? pressed : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center rounded-full border px-4 text-label-m tablet:min-h-8',
        pressed
          ? 'border-brand bg-brand-tint text-text-brand'
          : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
      )}
    >
      {children}
    </button>
  );
}

/** Export as CSV (USR-F6 Export): period, included types, separator, hashes. The API audits every export. */
export function ExportDialog({
  open,
  onOpenChange,
  defaultTypes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultTypes?: TxType[];
}) {
  const desktop = useMediaQuery(MQ.tablet, true);
  const [period, setPeriod] = React.useState<Period>('year');
  const [types, setTypes] = React.useState<TxType[]>(defaultTypes ?? INCLUDE.map((i) => i.id));
  const [format, setFormat] = React.useState<'csv' | 'csv_semicolon'>('csv');
  const [hashes, setHashes] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const from = periodFrom(period);
  const allTypes = [
    ...types,
    ...(types.includes('reward') ? (['rakeback', 'cashback'] as TxType[]) : []),
  ];
  const count = useHistoryTransactions({ types: allTypes, from, page: 1, pageSize: 1 });
  const rows = count.data?.total ?? 0;
  const today = new Date().toISOString();
  const fileName = `globalpool_transactions_${from ? from.slice(0, 10) : 'all'}_${today.slice(0, 10)}.csv`;

  const run = async () => {
    setBusy(true);
    try {
      const csv = await historyApi.exportCsv({
        types: allTypes,
        from,
        format,
        includeHashes: hashes,
      });
      saveCsv(typeof csv === 'string' ? csv : String(csv), fileName);
      toast({
        type: 'success',
        title: 'Export ready',
        description: `${formatCount(rows)} rows saved as ${fileName}`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        type: 'error',
        title: 'Export failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-overline text-text-tertiary uppercase">Period</legend>
        <div role="radiogroup" aria-label="Period" className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <ChipToggle
              key={p.id}
              role="radio"
              pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </ChipToggle>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-overline text-text-tertiary uppercase">Include</legend>
        <div className="flex flex-wrap gap-2">
          {INCLUDE.map((i) => (
            <ChipToggle
              key={i.id}
              pressed={types.includes(i.id)}
              onClick={() =>
                setTypes((t) => (t.includes(i.id) ? t.filter((x) => x !== i.id) : [...t, i.id]))
              }
            >
              {i.label}
            </ChipToggle>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-overline text-text-tertiary uppercase">
          Format · pick one
        </legend>
        <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-2">
          <ChipToggle role="radio" pressed={format === 'csv'} onClick={() => setFormat('csv')}>
            CSV · comma separated
          </ChipToggle>
          <ChipToggle
            role="radio"
            pressed={format === 'csv_semicolon'}
            onClick={() => setFormat('csv_semicolon')}
          >
            CSV · semicolon
          </ChipToggle>
        </div>
      </fieldset>
      <SwitchField
        checked={hashes}
        onCheckedChange={setHashes}
        label="Include tx hashes and addresses"
      />
      <div className="flex flex-col gap-1.5 rounded-md bg-surface-raised p-3">
        <div className="flex items-center justify-between gap-2 text-body-s">
          <span className="text-text-secondary">Rows</span>
          <span className="flex items-center gap-2 text-body-s-strong">
            {count.isPending ? '…' : `${formatCount(rows)} transactions`}
            <DemoBadge size="xs" />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-body-s">
          <span className="text-text-secondary">Period</span>
          <span className="text-body-s-strong">
            {from ? `${formatDateUTC(from)} – ${formatDateUTC(today)}` : 'All time'}
          </span>
        </div>
        <p className="font-mono text-mono-s break-all text-text-tertiary">{fileName}</p>
      </div>
    </div>
  );
  const footer = (
    <div className="flex w-full flex-col gap-2">
      <Button
        size="l"
        block
        loading={busy}
        disabled={rows === 0 || types.length === 0}
        onClick={() => void run()}
      >
        <Download aria-hidden />
        Export {formatCount(rows)} {rows === 1 ? 'row' : 'rows'}
      </Button>
      <p className="text-center text-caption text-text-tertiary">
        Exports contain personal financial data — store the file securely. Every export is logged.
      </p>
    </div>
  );
  return desktop ? (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="m">
        <DialogHeader>
          <DialogTitle>Export as CSV</DialogTitle>
          <DialogDescription>USDT balance movements · times in UTC</DialogDescription>
        </DialogHeader>
        <DialogBody>{body}</DialogBody>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  ) : (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh]">
        <SheetHeader>
          <SheetTitle>Export as CSV</SheetTitle>
          <SheetDescription>USDT balance movements · times in UTC</SheetDescription>
        </SheetHeader>
        <SheetBody className="overflow-y-auto">{body}</SheetBody>
        <SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
