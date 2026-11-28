'use client';

import { formatTimeUTC } from '@gp/shared/format';
import { Coins, RotateCcw } from 'lucide-react';
import * as React from 'react';

import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { classifyGameError, useResetCredits, type DemoCreditsView } from '@/lib/api/games';
import { cn } from '@/lib/utils';

import { CreditsAmount, NoCashValueLabel, credits as fmt } from './parts';
import { GAME_COPY } from './registry';

/**
 * DEMO credits balance chip + reset (GET /games/credits · POST /games/credits/reset). The balance has no cash value;
 * a reset puts it back to the starting balance at most once per hour (never during an open round).
 */
export function DemoCreditsChip({
  data,
  loading = false,
  disabled = false,
  compact = false,
  className,
}: {
  data: DemoCreditsView | undefined;
  loading?: boolean;
  /** Disable reset (a round is in progress). */
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const reset = useResetCredits();

  if (loading && !data) return <Skeleton className={cn('h-11 w-56 rounded-md', className)} />;
  if (!data) return null;

  const available = data.reset.available;
  const doReset = async () => {
    try {
      const v = await reset.mutateAsync();
      setOpen(false);
      toast({
        type: 'success',
        title: `DEMO credits reset to ${fmt(v.balance)}`,
        description: 'DEMO credits have no cash value.',
      });
    } catch (err) {
      const e = classifyGameError(err);
      toast({
        type: 'error',
        title: 'Could not reset DEMO credits',
        description:
          e.kind === 'rate_limited'
            ? `You can reset once per hour — next at ${formatTimeUTC(typeof e.details.availableAt === 'string' ? e.details.availableAt : data.reset.availableAt)}.`
            : e.kind === 'round_in_progress'
              ? 'Finish your open round first.'
              : e.message,
      });
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-border-default bg-surface-default py-1.5 pr-1.5 pl-3',
        className,
      )}
    >
      <Coins aria-hidden className="size-5 shrink-0 text-icon-gold" />
      <div className="flex min-w-0 flex-col">
        <span className="text-body-s-strong text-text-primary" data-testid="demo-credits-balance">
          <CreditsAmount value={data.balance} />
        </span>
        <NoCashValueLabel />
      </div>
      <Button
        variant="ghost"
        size="s"
        className="ml-auto min-h-11 tablet:min-h-8"
        onClick={() => setOpen(true)}
        disabled={disabled}
        leadingIcon={<RotateCcw aria-hidden />}
        aria-label="Reset DEMO credits"
      >
        <span className={cn(compact ? 'sr-only' : 'hidden laptop:inline')}>Reset</span>
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        size="s"
        title="Reset DEMO credits?"
        description={`Your DEMO balance goes back to ${fmt(data.reset.to)}. You can do this once per hour.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void doReset()} loading={reset.isPending} disabled={!available}>
              Reset to {fmt(data.reset.to)}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-body-s text-text-secondary">
          <p>{GAME_COPY.noCashValue}</p>
          {!available && (
            <p className="text-text-warning" role="status">
              Next reset available at {formatTimeUTC(data.reset.availableAt)}.
            </p>
          )}
          <NoCashValueLabel />
        </div>
      </ResponsiveModal>
    </div>
  );
}
