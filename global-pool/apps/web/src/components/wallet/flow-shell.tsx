'use client';

import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { WALLET_ROUTES, WalletPageHeader, WalletTabs } from './wallet-ui';

export interface FlowStep {
  key: string;
  label: string;
}

/** Nav/Stepper: numbered steps with done / current / error states (+ labels). Compact = mobile bar. */
export function FlowStepper({
  steps,
  current,
  error = false,
  flow,
  context,
  compact = false,
}: {
  steps: FlowStep[];
  current: number;
  error?: boolean;
  flow: string;
  context?: React.ReactNode;
  compact?: boolean;
}) {
  const total = steps.length;
  const label = steps[current]?.label ?? '';
  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-overline text-text-tertiary uppercase">
            {flow} · step {current + 1} of {total}
          </p>
          <p className="text-caption text-text-secondary">{label}</p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                'h-1 flex-1 rounded-full',
                i < current && 'bg-brand',
                i === current && (error ? 'bg-status-danger' : 'bg-brand'),
                i > current && 'bg-surface-pressed',
              )}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Step {current + 1} of {total}: {label}
        </p>
      </div>
    );
  }
  return (
    <Card padding="none" className="flex-row items-center gap-6 px-6 py-4">
      <div className="hidden w-60 shrink-0 flex-col gap-0.5 laptop:flex">
        <p className="text-overline text-text-tertiary uppercase">
          {flow} · step {current + 1} of {total}
        </p>
        {context && <p className="truncate text-body-s-strong text-text-primary">{context}</p>}
      </div>
      <ol className="flex flex-1 items-start" aria-label={`${flow} steps`}>
        {steps.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center gap-1.5">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-3.5 right-[calc(50%+20px)] left-[calc(-50%+20px)] h-0.5 rounded-full',
                    i <= current ? 'bg-brand' : 'bg-border-default',
                  )}
                />
              )}
              <span
                aria-current={now ? 'step' : undefined}
                className={cn(
                  'relative z-[1] flex size-7 items-center justify-center rounded-full border-2 text-caption font-semibold tabular-nums',
                  done && 'border-brand bg-brand-tint text-text-brand',
                  now && !error && 'border-brand bg-brand text-text-on-primary',
                  now && error && 'border-status-danger bg-status-danger text-text-on-danger',
                  !done && !now && 'border-border-default bg-surface-default text-text-tertiary',
                )}
              >
                {done ? (
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                ) : now && error ? (
                  <X aria-hidden className="size-3.5" />
                ) : (
                  i + 1
                )}
                <span className="sr-only">{done ? ' (done)' : now ? ' (current)' : ''}</span>
              </span>
              <span
                className={cn(
                  'text-center text-caption whitespace-nowrap',
                  now ? 'text-text-primary' : 'text-text-tertiary',
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** Flow card footer: Back (ghost) · note · primary action (+ optional secondary). */
export function FlowFooter({
  onBack,
  backLabel = 'Back',
  note,
  secondary,
  primary,
}: {
  onBack?: () => void;
  backLabel?: string;
  note?: React.ReactNode;
  secondary?: React.ReactNode;
  primary?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-[2] -mx-4 mt-2 flex flex-col gap-3 border-t border-border-subtle bg-surface-overlay px-4 pt-4 pb-4 tablet:static tablet:mx-0 tablet:flex-row tablet:items-center tablet:bg-transparent tablet:px-0 tablet:pb-0">
      {onBack && (
        <Button
          variant="ghost"
          size="l"
          leadingIcon={<ArrowLeft />}
          onClick={onBack}
          className="hidden tablet:inline-flex"
        >
          {backLabel}
        </Button>
      )}
      <span className="hidden flex-1 tablet:block" />
      {note && (
        <p className="text-center text-caption text-text-tertiary tablet:text-right">{note}</p>
      )}
      <div className="flex flex-col gap-2 tablet:flex-row">
        {secondary}
        {primary}
      </div>
    </div>
  );
}

export function NextButton({
  children,
  disabled,
  loading,
  onClick,
  type = 'button',
  form,
  icon,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  form?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Button
      size="l"
      type={type}
      form={form}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      trailingIcon={icon === undefined ? <ArrowRight /> : undefined}
      leadingIcon={icon ?? undefined}
      className="w-full tablet:w-auto"
    >
      {children}
    </Button>
  );
}

/**
 * Wallet flow layout. ≥ 768: page header + wallet tabs + stepper bar + flow card (640) beside a side summary.
 * < 768 (MOB-06 / MOB-07): the flow opens as a bottom sheet over the wallet page — grabber, title + close,
 * compact stepper, scrollable body and a sticky CTA; closing returns to the wallet.
 */
export function FlowShell({
  title,
  description,
  headerActions,
  flow,
  steps,
  current,
  error,
  context,
  side,
  background,
  children,
}: {
  title: string;
  description: React.ReactNode;
  headerActions?: React.ReactNode;
  flow: string;
  steps: FlowStep[];
  current: number;
  error?: boolean;
  context?: React.ReactNode;
  side?: React.ReactNode;
  /** Rendered behind the mobile sheet (the wallet page). */
  background?: React.ReactNode;
  children: React.ReactNode;
}) {
  const wide = useMediaQuery(MQ.tablet, true);
  const router = useRouter();
  if (!wide) {
    return (
      <>
        {background}
        <Sheet open onOpenChange={(o) => !o && router.push(WALLET_ROUTES.overview)}>
          <SheetContent side="bottom" className="h-[92dvh]" aria-describedby={undefined}>
            <div className="flex items-center gap-2 px-4 pt-3 pr-16">
              <SheetTitle className="text-h5">{title}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              {typeof description === 'string' ? description : title}
            </SheetDescription>
            <div className="px-4 pt-3 pb-1">
              <FlowStepper steps={steps} current={current} error={error} flow={flow} compact />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3" data-flow-body>
              {children}
              {side && <div className="mt-6 flex flex-col gap-4 pb-6">{side}</div>}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <WalletPageHeader title={title} description={description} actions={headerActions} />
      <WalletTabs />
      <FlowStepper steps={steps} current={current} error={error} flow={flow} context={context} />
      <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <Card radius="xl" padding="l" className="min-w-0 gap-5">
          {children}
        </Card>
        {side && <div className="flex min-w-0 flex-col gap-6">{side}</div>}
      </div>
    </div>
  );
}

/** Flow heading inside the card. */
export function FlowHeading({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-h4 text-text-primary tablet:text-h3">{title}</h2>
      {children && <p className="text-body-s text-text-secondary tablet:text-body-m">{children}</p>}
    </div>
  );
}

/** Selectable option row (radio semantics) used for networks, tokens, assets and saved addresses. */
export function OptionRow({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  subtitle,
  aside,
  name,
  value,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
  name: string;
  value: string;
}) {
  const id = `${name}-${value}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors tablet:p-4',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-border-focus',
        selected
          ? 'border-border-brand bg-surface-selected'
          : 'border-border-subtle bg-bg-secondary hover:border-border-strong',
        disabled && 'cursor-not-allowed opacity-60 hover:border-border-subtle',
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-brand' : 'border-border-strong',
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-brand" />}
      </span>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-s-strong text-text-primary">{title}</span>
        {subtitle && <span className="text-caption text-text-tertiary">{subtitle}</span>}
      </span>
      {aside && <span className="flex shrink-0 flex-col items-end gap-1 text-right">{aside}</span>}
    </label>
  );
}
