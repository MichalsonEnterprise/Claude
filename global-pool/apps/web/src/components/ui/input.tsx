'use client';

import { cva } from 'class-variance-authority';
import { CircleAlert, CircleCheck } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Label } from './label';

// ── Field ───────────────────────────────────────────────────────────────────────────────────────

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

/** Read the surrounding <Field> (id, aria-describedby, invalid) — used by every input control. */
export function useField(): FieldContextValue | null {
  return React.useContext(FieldContext);
}

export interface FieldProps {
  label?: React.ReactNode;
  /** Extra content on the label row's right side (e.g. "Available 9,215.30 USDT" + DEMO, a network pill). */
  labelAside?: React.ReactNode;
  helper?: React.ReactNode;
  /** Error message; marks the control aria-invalid. */
  error?: React.ReactNode;
  /** Success message (e.g. "Valid Arbitrum address"). */
  success?: React.ReactNode;
  id?: string;
  disabled?: boolean;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + helper/error/success line (Figma Input/* field anatomy). */
export function Field({
  label,
  labelAside,
  helper,
  error,
  success,
  id: idProp,
  disabled = false,
  hideLabel = false,
  className,
  children,
}: FieldProps) {
  const autoId = React.useId();
  const id = idProp ?? autoId;
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error ?? success ?? helper);
  const ctx = React.useMemo<FieldContextValue>(
    () => ({ id, describedBy: hasMessage ? messageId : undefined, invalid: Boolean(error), disabled }),
    [id, hasMessage, messageId, error, disabled],
  );
  return (
    <FieldContext.Provider value={ctx}>
      <div data-slot="field" className={cn('flex min-w-0 flex-col gap-2', className)}>
        {(label ?? labelAside) && (
          <div className={cn('flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1', hideLabel && 'sr-only')}>
            {label && <Label htmlFor={id}>{label}</Label>}
            {labelAside && (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-body-s text-text-secondary">{labelAside}</div>
            )}
          </div>
        )}
        {children}
        {hasMessage && (
          <p
            id={messageId}
            className={cn(
              'flex items-start gap-1.5 text-caption',
              error ? 'text-text-danger' : success ? 'text-text-success' : 'text-text-tertiary',
            )}
          >
            {error ? (
              <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            ) : success ? (
              <CircleCheck aria-hidden className="mt-px size-3.5 shrink-0" />
            ) : null}
            <span>{error ?? success ?? helper}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

// ── Input group (styled box) ───────────────────────────────────────────────────────────────────

export const inputGroupVariants = cva(
  [
    'group/input flex w-full min-w-0 items-center gap-2 rounded-md border bg-surface-default px-3 text-text-primary',
    'transition-[border-color,box-shadow,background-color] duration-150 ease-standard',
    'border-border-default hover:border-border-strong',
    'has-[input:focus-visible]:border-border-focus has-[input:focus-visible]:shadow-[0_0_0_3px_rgba(91,232,156,0.18)]',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      size: { s: 'h-8 text-body-s', m: 'h-10 text-body-s', l: 'h-12 text-body-m' },
      state: {
        default: '',
        error: 'border-border-danger hover:border-border-danger has-[input:focus-visible]:border-border-danger has-[input:focus-visible]:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]',
        success: 'border-border-success hover:border-border-success',
      },
      disabled: {
        true: 'pointer-events-none border-border-subtle bg-bg-secondary text-text-disabled',
      },
    },
    defaultVariants: { size: 'm', state: 'default' },
  },
);

export type InputSize = 's' | 'm' | 'l';

export interface InputGroupProps extends React.ComponentProps<'div'> {
  size?: InputSize;
  state?: 'default' | 'error' | 'success';
  disabled?: boolean;
}

export function InputGroup({ className, size, state, disabled, ...props }: InputGroupProps) {
  const field = useField();
  const resolvedState = state ?? (field?.invalid ? 'error' : 'default');
  return (
    <div
      data-slot="input-group"
      data-disabled={disabled ?? field?.disabled ?? undefined}
      className={cn(
        inputGroupVariants({ size, state: resolvedState, disabled: disabled ?? field?.disabled }),
        className,
      )}
      {...props}
    />
  );
}

/** Bare <input> for use inside <InputGroup>; picks up id / aria-* from the surrounding <Field>. */
export function InputControl({ className, id, disabled, ...props }: React.ComponentProps<'input'>) {
  const field = useField();
  return (
    <input
      data-slot="input"
      id={id ?? field?.id}
      disabled={disabled ?? field?.disabled}
      aria-invalid={props['aria-invalid'] ?? (field?.invalid || undefined)}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      className={cn(
        'h-full w-full min-w-0 flex-1 bg-transparent text-inherit outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed',
        '[&::-webkit-search-cancel-button]:appearance-none',
        className,
      )}
      {...props}
    />
  );
}

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  size?: InputSize;
  state?: 'default' | 'error' | 'success';
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  groupClassName?: string;
}

/** Input/Text: M 40 / L 48 (use L on mobile). Optional leading icon and trailing slot. */
export function Input({
  size = 'm',
  state,
  leadingIcon,
  trailing,
  groupClassName,
  disabled,
  ...props
}: InputProps) {
  return (
    <InputGroup size={size} state={state} disabled={disabled} className={groupClassName}>
      {leadingIcon && (
        <span aria-hidden className="flex text-icon-muted [&_svg]:size-[18px]">
          {leadingIcon}
        </span>
      )}
      <InputControl disabled={disabled} {...props} />
      {trailing}
    </InputGroup>
  );
}

export function Textarea({ className, id, ...props }: React.ComponentProps<'textarea'>) {
  const field = useField();
  return (
    <textarea
      id={id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(
        'min-h-24 w-full rounded-md border border-border-default bg-surface-default px-3 py-2.5 text-body-s text-text-primary outline-none transition-colors placeholder:text-text-tertiary hover:border-border-strong focus-visible:border-border-focus aria-invalid:border-border-danger',
        className,
      )}
      {...props}
    />
  );
}
