'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { RgPeriod } from '@gp/shared/enums';
import { formatCountdown } from '@gp/shared/format';
import { eq, gt, money } from '@gp/shared/money';
import { positiveUsdtAmountSchema, type RgLimitView } from '@gp/shared/schemas';
import {
  ArrowDownToLine,
  Clock,
  Hourglass,
  Info,
  Ticket,
  Timer,
  TrendingDown,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { sanitizeAmount } from '@/components/domain/amount-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { ApiRequestError } from '@/lib/api/client';
import { rgApi, useRgMutation } from '@/lib/api/rg-history';
import { cn } from '@/lib/utils';

import { dateTime, minutesLabel, num, PERIOD_ADJ, PERIOD_WORD, ratio } from './format';
import { Chip, IconTile, Meter, NoteBox } from './ui';

export type LimitKind = 'deposit' | 'participation' | 'loss' | 'session_time';

const SPEC: Record<
  LimitKind,
  {
    title: string;
    sub: string;
    icon: LucideIcon;
    used: (p: RgPeriod) => string;
    periods: RgPeriod[];
  }
> = {
  deposit: {
    title: 'Deposit limit',
    sub: 'Caps how much you can deposit in each period.',
    icon: ArrowDownToLine,
    used: (p) => (p === 'day' ? 'Deposited today' : `Deposited this ${PERIOD_WORD[p]}`),
    periods: ['day', 'week', 'month'],
  },
  participation: {
    title: 'Participation limit',
    sub: 'Caps Global Pool entries (incl. platform fees) and game stakes.',
    icon: Ticket,
    used: (p) => (p === 'day' ? 'Used today' : `Used this ${PERIOD_WORD[p]}`),
    periods: ['day', 'week', 'month'],
  },
  loss: {
    title: 'Loss limit',
    sub: 'Caps your net result — stakes and entry costs minus winnings.',
    icon: TrendingDown,
    used: (p) => (p === 'day' ? 'Net loss today' : `Net loss this ${PERIOD_WORD[p]}`),
    periods: ['day', 'week', 'month'],
  },
  session_time: {
    title: 'Time limit',
    sub: 'Caps how long you play each day. The round in progress always finishes.',
    icon: Timer,
    used: () => 'Played today',
    periods: ['day'],
  },
};

const amountForm = z.object({ value: positiveUsdtAmountSchema });
const minutesForm = z.object({
  value: z
    .string()
    .regex(/^\d+$/, { error: 'Enter whole minutes' })
    .refine((v) => Number(v) >= 15 && Number(v) <= 1440, {
      error: 'Between 15 minutes and 24 hours',
    }),
});

function errorText(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  return 'Could not save — please try again.';
}

/** RG/Limit Setter — period segmented control, limit input, usage bar, pending increase/removal state. */
export function LimitSetter({
  kind,
  limits,
  defaultPeriod,
  demo = true,
  className,
  id,
}: {
  kind: LimitKind;
  limits: RgLimitView[];
  defaultPeriod?: RgPeriod;
  demo?: boolean;
  className?: string;
  id?: string;
}) {
  const spec = SPEC[kind];
  const isTime = kind === 'session_time';
  const mine = limits.filter((l) => l.type === kind);
  const [period, setPeriod] = React.useState<RgPeriod>(
    defaultPeriod ?? mine[0]?.period ?? (kind === 'deposit' ? 'week' : 'day'),
  );
  const current = mine.find((l) => l.period === period) ?? null;
  const currentValue = current
    ? isTime
      ? String(current.minutes ?? '')
      : (current.limit ?? '')
    : '';
  const pendingValue = current?.pendingIncrease
    ? isTime
      ? String(current.pendingIncrease.minutes ?? '')
      : (current.pendingIncrease.amount ?? '')
    : null;

  const form = useForm<{ value: string }>({
    resolver: zodResolver(isTime ? minutesForm : amountForm),
    defaultValues: { value: pendingValue ?? currentValue },
  });
  React.useEffect(() => {
    form.reset({ value: pendingValue ?? currentValue });
  }, [form, pendingValue, currentValue, period]);

  const save = useRgMutation(rgApi.setLimit);
  const remove = useRgMutation(rgApi.removeLimit);
  const cancel = useRgMutation(rgApi.cancelPending);
  const unit = isTime ? 'min' : 'USDT';
  const per = `/ ${PERIOD_WORD[period]}`;

  const onSubmit = form.handleSubmit(async ({ value }) => {
    const clean = isTime ? value : sanitizeAmount(value, 2);
    if (
      currentValue &&
      (isTime ? Number(clean) === Number(currentValue) : eq(clean, currentValue))
    ) {
      toast({ type: 'info', title: 'No change', description: 'That is already your limit.' });
      return;
    }
    const increase =
      currentValue !== '' &&
      (isTime ? Number(clean) > Number(currentValue) : gt(clean, currentValue));
    try {
      await save.mutateAsync(
        isTime
          ? { type: 'session_time', period: 'day', minutes: Number(clean) }
          : { type: kind, period, amount: clean },
      );
      toast(
        increase
          ? {
              type: 'info',
              title: 'Increase requested',
              description: 'It starts after the 24-hour cool-down. You can cancel it until then.',
            }
          : { type: 'success', title: 'Limit saved', description: 'Applied immediately.' },
      );
    } catch (e) {
      form.setError('value', { message: errorText(e) });
    }
  });

  const used = current ? (isTime ? String(current.usedMinutes ?? 0) : (current.used ?? '0')) : null;
  const share = current ? ratio(used, isTime ? String(current.minutes ?? 0) : current.limit) : 0;
  const valueLabel = (v: string | null) =>
    v ? (isTime ? minutesLabel(Number(v)) : `${num(v)} USDT`) : '—';
  const pendingAt =
    current?.pendingIncrease?.effectiveAt ?? current?.pendingRemoval?.effectiveAt ?? null;

  return (
    <Card padding="l" className={cn('gap-5', className)} id={id}>
      <div className="flex items-start gap-3">
        <IconTile icon={spec.icon} tone="default" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-h5 text-text-primary">{spec.title}</h2>
          <p className="text-body-s text-text-secondary">{spec.sub}</p>
        </div>
        {current ? (
          pendingAt ? (
            <Chip kind="pending">
              {current.pendingRemoval ? 'Removal pending' : 'Increase pending'}
            </Chip>
          ) : (
            <Chip kind="on">On</Chip>
          )
        ) : (
          <Chip kind="off">Not set</Chip>
        )}
        {demo && <DemoBadge size="s" />}
      </div>

      {spec.periods.length > 1 && (
        <div className="flex flex-col gap-2">
          <span id={`${kind}-period`} className="text-label-m text-text-secondary">
            Period
          </span>
          <div
            role="radiogroup"
            aria-labelledby={`${kind}-period`}
            className="inline-flex w-full rounded-md bg-bg-secondary p-1 tablet:w-auto tablet:self-start"
          >
            {spec.periods.map((p) => {
              const has = mine.some((l) => l.period === p);
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={period === p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'relative min-h-11 flex-1 rounded-sm px-4 text-label-m transition-colors tablet:min-h-9',
                    period === p
                      ? 'bg-brand-tint text-text-brand'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {PERIOD_ADJ[p]}
                  {has && period !== p && (
                    <span
                      aria-hidden
                      className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-brand"
                    />
                  )}
                  {has && <span className="sr-only"> (limit set)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field
          label={isTime ? 'Daily time limit (minutes)' : `${PERIOD_ADJ[period]} limit`}
          labelAside={
            current?.pendingIncrease ? (
              <span className="text-caption">Active until then: {valueLabel(currentValue)}</span>
            ) : current ? (
              <span className="text-caption">Current: {valueLabel(currentValue)}</span>
            ) : undefined
          }
          error={form.formState.errors.value?.message}
          helper={
            current?.pendingIncrease
              ? `Requested ${dateTime(new Date(new Date(current.pendingIncrease.effectiveAt).getTime() - 86_400_000).toISOString())}`
              : isTime
                ? `${minutesLabel(Number(form.watch('value') || 0))} per day`
                : undefined
          }
        >
          <Input
            size="l"
            inputMode={isTime ? 'numeric' : 'decimal'}
            autoComplete="off"
            placeholder={isTime ? '120' : '0.00'}
            aria-label={`${spec.title} ${isTime ? 'in minutes' : 'in USDT'}`}
            trailing={
              <span className="flex items-center gap-2 text-label-m text-text-secondary">
                {unit}
                {current?.pendingIncrease && (
                  <Clock aria-hidden className="size-4 text-status-pending" />
                )}
              </span>
            }
            {...form.register('value', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (!isTime) form.setValue('value', sanitizeAmount(e.target.value, 2));
              },
            })}
          />
        </Field>

        {current && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-caption">
              <span className="text-text-secondary">{spec.used(period)}</span>
              <span className="text-body-s-strong text-text-primary tabular-nums">
                {isTime
                  ? `${minutesLabel(current.usedMinutes ?? 0)} of ${minutesLabel(current.minutes)}`
                  : `${num(current.used)} of ${num(current.limit)} USDT`}
              </span>
            </div>
            <Meter value={share} label={`${spec.title} used`} />
          </div>
        )}

        {current?.pendingIncrease && pendingValue && (
          <NoteBox icon={Hourglass} tone="pending">
            <p className="text-body-s-strong">
              Increase to {valueLabel(pendingValue)} {isTime ? 'per day' : per} is pending
            </p>
            <p className="text-body-s text-text-secondary">
              Takes effect {dateTime(current.pendingIncrease.effectiveAt)} (in{' '}
              {countdownWords(current.pendingIncrease.effectiveAt)}). Your current{' '}
              {valueLabel(currentValue)} {isTime ? 'per day' : per} limit applies until then. You
              can cancel any time.
            </p>
          </NoteBox>
        )}
        {current?.pendingRemoval && (
          <NoteBox icon={Hourglass} tone="pending">
            <p className="text-body-s-strong">Removal is pending</p>
            <p className="text-body-s text-text-secondary">
              The limit is removed {dateTime(current.pendingRemoval.effectiveAt)}. Until then{' '}
              {valueLabel(currentValue)} {per} stays in place. You can cancel any time.
            </p>
          </NoteBox>
        )}

        <p className="flex items-center gap-2 text-caption text-text-tertiary">
          <Info aria-hidden className="size-3.5 shrink-0" />
          Increases take effect after 24 h; decreases apply immediately.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {pendingAt ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="m"
                loading={cancel.isPending}
                leadingIcon={<X aria-hidden />}
                onClick={async () => {
                  try {
                    await cancel.mutateAsync({ type: kind, period });
                    toast({
                      type: 'success',
                      title: 'Change cancelled',
                      description: 'Your current limit stays.',
                    });
                  } catch (e) {
                    toast({ type: 'error', title: 'Could not cancel', description: errorText(e) });
                  }
                }}
              >
                {current?.pendingRemoval ? 'Cancel removal' : 'Cancel increase'}
              </Button>
              <Button type="submit" variant="ghost" size="m" loading={save.isPending}>
                {current?.pendingRemoval ? 'Keep pending' : 'Update request'}
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" size="m" loading={save.isPending}>
                {current ? 'Save limit' : 'Set limit'}
              </Button>
              {current && (
                <Button
                  type="button"
                  variant="ghost"
                  size="m"
                  loading={remove.isPending}
                  leadingIcon={<Trash2 aria-hidden />}
                  onClick={async () => {
                    try {
                      await remove.mutateAsync({ type: kind, period });
                      toast({
                        type: 'info',
                        title: 'Removal requested',
                        description: 'It waits 24 hours. You can cancel it until then.',
                      });
                    } catch (e) {
                      toast({
                        type: 'error',
                        title: 'Could not remove',
                        description: errorText(e),
                      });
                    }
                  }}
                >
                  Remove limit
                </Button>
              )}
            </>
          )}
        </div>
      </form>
    </Card>
  );
}

/** '23 h 59 min' until an absolute time. */
export function countdownWords(target: string): string {
  const [h = '0', m = '0'] = formatCountdown(target).split(':');
  const hours = Number(h);
  return hours > 0 ? `${hours} h ${Number(m)} min` : `${Number(m)} min`;
}

/** Decimal-safe "is a > b" for limit strings (used by tests). */
export const isIncrease = (from: string, to: string) => money(to).gt(money(from));
