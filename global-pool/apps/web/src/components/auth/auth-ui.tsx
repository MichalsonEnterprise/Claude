'use client';

/**
 * Building blocks of the GLOBAL POOL auth screens (Figma page 04 — Authentication): the split dialog over the
 * dimmed lobby (desktop) that becomes a full-height bottom sheet with a sticky CTA bar (< 768), icon tiles,
 * numbered steps, segmented progress, tinted callouts, key/value rows and the brand / security side panels.
 */
import { X, type LucideIcon } from 'lucide-react';
import {
  CircleAlert,
  CircleCheck,
  Gift,
  Info,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { CoinStack } from '@/components/home/art';
import { AgeBadge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

// ── tones ─────────────────────────────────────────────────────────────────────────────────────

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TILE_TONE: Record<Tone, string> = {
  brand: 'bg-brand-tint text-icon-brand',
  success: 'bg-status-success-tint text-text-success',
  warning: 'bg-status-warning-tint text-text-warning',
  danger: 'bg-status-danger-tint text-text-danger',
  info: 'bg-status-info-tint text-text-info',
  neutral: 'bg-surface-raised text-icon-default',
};

const TEXT_TONE: Record<Tone, string> = {
  brand: 'text-text-brand',
  success: 'text-text-success',
  warning: 'text-text-warning',
  danger: 'text-text-danger',
  info: 'text-text-info',
  neutral: 'text-text-tertiary',
};

export function IconTile({
  icon: Icon,
  tone = 'brand',
  size = 48,
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 32 | 40 | 48;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        size === 48
          ? 'size-12 rounded-lg [&_svg]:size-6'
          : size === 40
            ? 'size-10 rounded-md [&_svg]:size-5'
            : 'size-8 rounded-md [&_svg]:size-4',
        TILE_TONE[tone],
        className,
      )}
    >
      <Icon />
    </span>
  );
}

export function Overline({
  tone = 'brand',
  className,
  ...props
}: React.ComponentProps<'p'> & { tone?: Tone }) {
  return (
    <p
      className={cn(
        'text-overline font-semibold tracking-[0.08em] uppercase',
        TEXT_TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

// ── callouts / notes ──────────────────────────────────────────────────────────────────────────

const CALLOUT: Record<Exclude<Tone, 'neutral' | 'brand'>, { cls: string; icon: LucideIcon }> = {
  success: {
    cls: 'border-status-success/60 bg-status-success-tint [&>svg]:text-text-success',
    icon: CircleCheck,
  },
  warning: {
    cls: 'border-status-warning/60 bg-status-warning-tint [&>svg]:text-text-warning',
    icon: TriangleAlert,
  },
  danger: {
    cls: 'border-status-danger/60 bg-status-danger-tint [&>svg]:text-text-danger',
    icon: CircleAlert,
  },
  info: { cls: 'border-status-info/50 bg-status-info-tint [&>svg]:text-text-info', icon: Info },
};

/** Tinted alert banner (Figma ALERT: tint fill + 1px status stroke, icon 20, title Body/S Strong + body). */
export function Callout({
  tone,
  title,
  children,
  icon,
  className,
  role,
}: {
  tone: keyof typeof CALLOUT;
  title: React.ReactNode;
  children?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  role?: 'alert' | 'status';
}) {
  const spec = CALLOUT[tone];
  const Icon = icon ?? spec.icon;
  return (
    <div
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={cn('flex gap-3 rounded-md border px-4 py-3.5', spec.cls, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-s-strong text-text-primary">{title}</p>
        {children && <div className="text-body-s text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}

/** Small icon + caption note (Figma NOTE). */
export function Note({
  icon: Icon = Info,
  children,
  tone = 'neutral',
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <p className={cn('flex gap-2 text-caption text-text-tertiary', className)}>
      <Icon
        aria-hidden
        className={cn(
          'mt-px size-4 shrink-0',
          tone === 'neutral' ? 'text-icon-muted' : TEXT_TONE[tone],
        )}
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Icon + title + body bullet (Figma BUL). */
export function Point({
  icon: Icon,
  title,
  children,
  tone = 'brand',
  tile = false,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  children?: React.ReactNode;
  tone?: Tone;
  tile?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      {tile ? (
        <IconTile icon={Icon} tone={tone} size={32} />
      ) : (
        <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', TEXT_TONE[tone])} />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-s-strong text-text-primary">{title}</p>
        {children && <div className="text-body-s text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}

/** Numbered step with done / now / next marker (Figma NUMSTEP). */
export function NumStep({
  n,
  state,
  title,
  children,
}: {
  n: number;
  state: 'done' | 'now' | 'next';
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5" aria-current={state === 'now' ? 'step' : undefined}>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-label-s',
          state === 'done' && 'bg-status-success-tint text-text-success',
          state === 'now' && 'bg-brand-tint text-text-brand',
          state === 'next' && 'bg-surface-raised text-text-tertiary',
        )}
      >
        {state === 'done' ? <CircleCheck aria-label="Done" className="size-4" /> : n}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p
          className={cn(
            'text-body-s-strong',
            state === 'next' ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          {title}
        </p>
        {children && <p className="text-caption text-text-tertiary">{children}</p>}
      </div>
    </li>
  );
}

/** Segmented progress (Figma SEG): done = success, current = mint, next = border. */
export function StepBar({
  total,
  current,
  label,
  variant = 'caption',
}: {
  total: number;
  current: number;
  label: string;
  /** caption (AUTH-04 "Step 2 of 3 · Verify email") · overline (AUTH-07 "STEP 1 OF 3 · SCAN") */
  variant?: 'caption' | 'overline';
}) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className={
          variant === 'overline'
            ? 'text-overline font-semibold tracking-[0.08em] text-text-brand uppercase'
            : 'text-caption text-text-secondary'
        }
      >
        {label}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i < current ? 'bg-status-success' : i === current ? 'bg-brand' : 'bg-border-default',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Key / value row with hairline (Figma KV). */
export function KeyValue({
  label,
  value,
  mono = false,
  demo = false,
  last = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
  demo?: boolean;
  last?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3 py-2.5', !last && 'border-b border-border-subtle')}>
      <dt className="min-w-0 flex-1 text-body-s text-text-secondary">{label}</dt>
      <dd
        className={cn(
          'text-right text-text-primary',
          mono ? 'font-mono text-mono-s' : 'text-body-s-strong',
        )}
      >
        {value}
      </dd>
      {demo && <DemoBadge size="xs" />}
    </div>
  );
}

export function KeyValueBox({
  title,
  children,
  className,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-lg border border-border-subtle bg-bg-secondary px-4 py-1', className)}
    >
      {title && <p className="pt-3 pb-1 text-label-m text-text-primary">{title}</p>}
      <dl>{children}</dl>
    </section>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-caption text-text-tertiary">
      <span className="h-px flex-1 bg-border-subtle" />
      {label}
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

export function LicenceChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-raised px-3 text-caption text-text-secondary',
        className,
      )}
    >
      <ShieldCheck aria-hidden className="size-3.5 text-icon-muted" />
      Licence required · Permitted regions only
    </span>
  );
}

/** True inside <AuthModal>: the visible pane heading doubles as the dialog's accessible title. */
const InModalContext = React.createContext(false);

/** Visible heading that is also the Radix dialog title when rendered inside <AuthModal>. */
export function ModalHeading({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const inModal = React.useContext(InModalContext);
  const h = (
    <h2 id={id} className={className}>
      {children}
    </h2>
  );
  return inModal ? <DialogPrimitive.Title asChild>{h}</DialogPrimitive.Title> : h;
}

// ── modal shell: split dialog (≥ 1024) / single dialog (768–1023) / bottom sheet (< 768) ────────

export function AuthModal({
  open,
  onOpenChange,
  title,
  description,
  size = 'split',
  dismissible = true,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title (also shown visually by the panes). */
  title: string;
  description?: string;
  /** split = 960 two-pane · l = 820 · m = 560 · s = 480 · xs = 400 (Modal/2FA) */
  size?: 'split' | 'l' | 'm' | 's' | 'xs';
  /** false: Esc / outside click do nothing (explicit choice required). */
  dismissible?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          data-slot="auth-modal"
          aria-label={title}
          {...(description ? {} : { 'aria-describedby': undefined })}
          // Focus the dialog itself (not the first control) so screen readers start at the top and no control
          // shows a focus ring on open; Tab then moves through the dialog in order.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const el = e.currentTarget as HTMLElement;
            // Keep focus if a dedicated code-entry field already took it (OtpInput focusOnMount).
            if (!el.contains(document.activeElement)) el.focus();
          }}
          onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
          onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
          onInteractOutside={(e) => !dismissible && e.preventDefault()}
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden bg-surface-overlay text-text-primary shadow-elevation-4 outline-none',
            // mobile: full-height bottom sheet (Figma AUTH mobile pattern)
            'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-2xl border-t border-border-subtle data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
            // tablet+: centred dialog
            'tablet:inset-x-auto tablet:bottom-auto tablet:top-1/2 tablet:left-1/2 tablet:max-h-[calc(100dvh-48px)] tablet:w-[calc(100%-48px)] tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-xl tablet:border tablet:data-[state=open]:slide-in-from-bottom-0 tablet:data-[state=open]:zoom-in-95',
            size === 'split' && 'tablet:max-w-[560px] lg:max-w-[960px]',
            size === 'm' && 'tablet:max-w-[560px]',
            size === 'l' && 'tablet:max-w-[560px] lg:max-w-[880px]',
            size === 's' && 'tablet:max-w-[480px]',
            size === 'xs' && 'tablet:max-w-[400px]',
            className,
          )}
        >
          {description && (
            <DialogPrimitive.Description className="sr-only">
              {description}
            </DialogPrimitive.Description>
          )}
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong tablet:hidden"
          />
          <InModalContext.Provider value={true}>{children}</InModalContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Two panes: side panel (≥ 1024 only) + main column. */
export function SplitLayout({
  panel,
  children,
}: {
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-[480px] shrink-0 flex-col overflow-y-auto border-r border-border-subtle bg-bg-secondary lg:flex">
        {panel}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Scrollable main pane: top row (overline / back / close), body, sticky CTA footer on mobile. */
export function Pane({
  top,
  onClose,
  closeLabel = 'Close',
  children,
  footer,
  mobileFooter,
  className,
}: {
  top?: React.ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Sticky CTA bar shown only below 768 (Figma mobile sheets); tablet+ keeps the CTA inline. */
  mobileFooter?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            'flex flex-col gap-6 px-4 pt-3 pb-6 tablet:px-10 tablet:pt-8 tablet:pb-9',
            className,
          )}
        >
          {(top || onClose) && (
            <div className="flex min-h-11 items-start gap-2">
              <div className="min-w-0 flex-1">{top}</div>
              {onClose && <CloseButton onClick={onClose} label={closeLabel} />}
            </div>
          )}
          {children}
        </div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-border-subtle bg-surface-overlay px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] tablet:px-10 tablet:pb-8">
          {footer}
        </div>
      )}
      {mobileFooter && (
        <div className="flex shrink-0 flex-col gap-2 border-t border-border-subtle bg-surface-overlay px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] tablet:hidden">
          {mobileFooter}
        </div>
      )}
    </div>
  );
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-icon-muted transition-colors hover:bg-surface-hover hover:text-icon-default focus-visible:shadow-focus-ring focus-visible:outline-none"
    >
      <X aria-hidden className="size-5" />
    </button>
  );
}

export function PaneHeader({
  icon,
  tone = 'brand',
  overline,
  title,
  children,
  titleId,
  layout = 'stack',
}: {
  icon?: LucideIcon;
  tone?: Tone;
  overline?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  titleId?: string;
  /** inline = icon tile beside the title (Modal/* headers); stack = tile above (dialog panes). */
  layout?: 'stack' | 'inline';
}) {
  if (layout === 'inline') {
    return (
      <div className="flex items-start gap-4">
        {icon && <IconTile icon={icon} tone={tone} />}
        <div className="flex min-w-0 flex-col gap-1.5">
          {overline && <Overline tone={tone === 'neutral' ? 'neutral' : tone}>{overline}</Overline>}
          <ModalHeading id={titleId} className="text-h4 text-text-primary">
            {title}
          </ModalHeading>
          {children && <div className="text-body-s text-text-secondary">{children}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {icon && <IconTile icon={icon} tone={tone} className="mb-1" />}
      {overline && <Overline tone={tone === 'neutral' ? 'neutral' : tone}>{overline}</Overline>}
      <ModalHeading id={titleId} className="text-h4 text-text-primary tablet:text-h3">
        {title}
      </ModalHeading>
      {children && <div className="text-body-m text-text-secondary">{children}</div>}
    </div>
  );
}

// ── side panels ───────────────────────────────────────────────────────────────────────────────

/** Angled colour blocks with coins and entry tickets (no glow / orbit art — banned look). */
export function BrandArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative h-[236px] overflow-hidden', className)}>
      <div className="absolute -left-20 top-[118px] h-[200px] w-[720px] -rotate-[14deg] bg-gold" />
      <div className="absolute -left-20 top-[150px] h-[34px] w-[720px] -rotate-[14deg] bg-brand" />
      <CoinStack count={5} className="absolute bottom-6 left-12 w-[124px]" />
      <CoinStack count={3} className="absolute bottom-0 left-40 w-[100px]" />
      <MiniTicket className="absolute top-[72px] right-16 rotate-[14deg]" />
      <MiniTicket className="absolute top-[128px] right-24 rotate-[10deg]" />
    </div>
  );
}

function MiniTicket({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-[62px] w-[160px] items-center gap-3 rounded-md bg-brand px-4 text-text-on-primary shadow-elevation-3',
        className,
      )}
    >
      <span className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full bg-bg-secondary" />
      <span className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rounded-full bg-bg-secondary" />
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">Entry</span>
        <span className="mt-1 text-[17px] font-bold">10.00 USDT</span>
      </span>
    </div>
  );
}

const TRUST_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Every draw is verifiable',
    body: 'Chainlink VRF on Arbitrum — check any round yourself.',
  },
  {
    icon: Upload,
    title: 'Withdraw your available balance anytime',
    body: 'Network fee shown before you confirm. No platform withdrawal fee.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Limits from day one',
    body: 'Set deposit, loss and session limits in Responsible gaming.',
  },
];

export function ResponsibleFooter({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <AgeBadge />
        <LicenceChip />
      </div>
      <p className="text-caption text-text-tertiary">
        Gambling can be addictive.{' '}
        <a href="/responsible-gaming" className="text-text-brand underline underline-offset-2">
          Play responsibly
        </a>{' '}
        — limits and self-exclusion are always available.
      </p>
    </div>
  );
}

/** AUTH-01…04 left panel: logo, DEMO welcome offer, art, trust points, 18+ / licence footer. */
export function BrandPanel() {
  return (
    <>
      <div className="flex flex-col gap-3 px-10 pt-10">
        <Logo height={34} title="GLOBAL POOL" />
        <p className="mt-5 flex items-center gap-2 text-overline font-semibold tracking-[0.08em] text-text-brand uppercase">
          <Gift aria-hidden className="size-4" /> Welcome offer <DemoBadge size="s" />
        </p>
        <p className="text-h2 text-text-primary">100% match up to 500 USDT on your first deposit</p>
        <p className="text-caption text-text-secondary">
          Min. deposit 20 USDT · 30× wagering on bonus funds · 14 days to complete ·{' '}
          <a href="/promotions" className="text-text-brand underline underline-offset-2">
            Terms apply
          </a>
        </p>
      </div>
      <BrandArt className="mt-auto" />
      <div className="flex flex-col gap-5 border-t border-border-subtle px-10 pt-6 pb-8">
        {TRUST_POINTS.map((p) => (
          <Point key={p.title} icon={p.icon} title={p.title} tile>
            <span className="text-caption">{p.body}</span>
          </Point>
        ))}
        <ResponsibleFooter className="mt-1" />
      </div>
    </>
  );
}

/** AUTH-07/08/21 left panel: overline + heading + art slot + body + staff-never-asks footer. */
export function SecurityPanel({
  overline,
  overlineIcon: OIcon = ShieldCheck,
  title,
  sub,
  art,
  children,
  tone = 'brand',
}: {
  overline: string;
  overlineIcon?: LucideIcon;
  title: React.ReactNode;
  sub?: React.ReactNode;
  art?: React.ReactNode;
  children?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 px-9 pt-8">
        <Logo height={30} title="GLOBAL POOL" />
        <div className="flex flex-col gap-2 pt-3">
          <p
            className={cn(
              'flex items-center gap-2 text-overline font-semibold tracking-[0.08em] uppercase',
              TEXT_TONE[tone],
            )}
          >
            <OIcon aria-hidden className="size-4" /> {overline}
          </p>
          <p className="text-h3 text-text-primary">{title}</p>
          {sub && <p className="text-body-s text-text-secondary">{sub}</p>}
        </div>
      </div>
      {art}
      {children && <div className="flex flex-col gap-4 px-9 pt-5 pb-2">{children}</div>}
      <div className="mt-auto flex flex-col gap-2.5 border-t border-border-subtle px-9 pt-4 pb-7">
        <Note icon={Lock}>
          GLOBAL POOL staff will never ask for your 2FA codes, backup codes or wallet seed phrase —
          not by email, chat or phone.
        </Note>
        <div className="flex flex-wrap items-center gap-2">
          <AgeBadge />
          <LicenceChip />
        </div>
      </div>
    </>
  );
}

/** Angled mint / charcoal blocks behind security illustrations. */
export function SecurityArt({
  children,
  accent = 'bg-brand',
  className,
}: {
  children?: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('relative mt-4 h-[236px] shrink-0 overflow-hidden', className)}>
      <div className="absolute -left-20 top-[150px] h-[132px] w-[640px] rotate-[10deg] bg-surface-raised" />
      <div
        className={cn('absolute -left-20 top-[196px] h-[56px] w-[640px] rotate-[10deg]', accent)}
      />
      {children}
    </div>
  );
}
