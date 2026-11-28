'use client';

import {
  ArrowUpFromLine,
  BadgeCheck,
  BookOpen,
  Check,
  ExternalLink,
  Gamepad2,
  Globe,
  HeartHandshake,
  Hourglass,
  IdCard,
  Info,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pause,
  Scale,
  ShieldBan,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { IconTile, LicenceChip, Overline } from '@/components/auth/auth-ui';
import { Alert } from '@/components/ui/alert';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import {
  regulatoryCopy,
  type RegulatoryAction,
  type RegulatoryContext,
  type RegulatoryCopy,
  type RegulatoryKind,
} from './regulatory-copy';

/** ERR-05 icon per state. */
export const REGULATORY_ICON: Record<RegulatoryKind, LucideIcon> = {
  region: MapPin,
  licence: Scale,
  kyc_required: IdCard,
  self_excluded: HeartHandshake,
  cooling_off: Hourglass,
  age: ShieldBan,
};

const ACTION_ICON: Record<RegulatoryAction['role'], LucideIcon> = {
  withdraw: ArrowUpFromLine,
  sign_in: LogIn,
  support: MessageCircle,
  info: BookOpen,
  kyc: BadgeCheck,
  rg: HeartHandshake,
  browse: Gamepad2,
  leave: LogOut,
};

/**
 * One CTA. "Log in to withdraw" opens the GLOBAL POOL sign-in dialog and returns to the withdraw page; every other
 * action is a plain link (external links open a new tab only for help organisations, never for "Leave").
 */
export function RegulatoryActionButton({
  action,
  variant,
  size = 'l',
  className,
}: {
  action: RegulatoryAction;
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 's' | 'm' | 'l';
  className?: string;
}) {
  const auth = useAuth();
  const Icon = ACTION_ICON[action.role];
  if (action.role === 'sign_in') {
    return (
      <Button
        variant={variant}
        size={size}
        leadingIcon={<Icon />}
        className={className}
        onClick={() =>
          auth.openAuth ? auth.openAuth('sign-in', { next: action.href }) : auth.signIn()
        }
      >
        {action.label}
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} size={size} leadingIcon={<Icon />} className={className}>
      {action.external ? (
        <a href={action.href} rel="noopener noreferrer">
          {action.label}
        </a>
      ) : (
        <Link href={action.href}>{action.label}</Link>
      )}
    </Button>
  );
}

function ListCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: LucideIcon;
  tone: 'success' | 'warning';
  items: RegulatoryCopy['stillWorks'];
}) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
      <h2 className="flex items-center gap-2.5 text-h5 text-text-primary">
        <Icon
          aria-hidden
          className={cn('size-5', tone === 'success' ? 'text-text-success' : 'text-text-warning')}
        />
        {title}
      </h2>
      <ul className="flex flex-col gap-3.5">
        {items.map((i) => (
          <li key={i.title} className="flex gap-3">
            {tone === 'success' ? (
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-text-success" />
            ) : (
              <Pause aria-hidden className="mt-0.5 size-5 shrink-0 text-text-warning" />
            )}
            <div>
              <p className="text-body-s-strong text-text-primary">{i.title}</p>
              <p className="text-body-s text-text-secondary">{i.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface RegulatoryStateProps {
  kind: RegulatoryKind;
  ctx?: RegulatoryContext;
  /** `page` = full state (hero + what still works + paused), `card` = compact module guard. */
  layout?: 'page' | 'card';
  /** Shows a DEMO marker next to DEMO values (e.g. a dev-override location). */
  isDemo?: boolean;
  /** Extra content under the hero (e.g. help organisations). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * ERR-05 regulatory state: restricted region · licence required / product unavailable · KYC level required ·
 * self-excluded · cooling-off · age-gate fail. Built from the auth (AUTH-18) building blocks; used by the PUB-21
 * interstitial, the PUB-22 exit page, `/restricted/<kind>` pages and module guards (`RegulatoryGuard`).
 */
export function RegulatoryState({
  kind,
  ctx,
  layout = 'page',
  isDemo = false,
  children,
  className,
}: RegulatoryStateProps) {
  const auth = useAuth();
  const c = regulatoryCopy(kind, { signedIn: auth.status !== 'guest', ...ctx });
  const Icon = REGULATORY_ICON[kind];
  const [primary, ...rest] = c.actions;
  const Heading = layout === 'page' ? 'h1' : 'h2';

  const hero = (
    <div className="flex flex-col gap-4">
      <IconTile icon={Icon} tone={c.tone} />
      <Overline tone={c.tone} className="mt-1 flex items-center gap-2">
        {c.overline}
        {isDemo && <DemoBadge size="xs" />}
      </Overline>
      <Heading
        className={cn(
          'text-text-primary',
          layout === 'page' ? 'text-h3 tablet:text-h2' : 'text-h4',
        )}
      >
        {c.title}
      </Heading>
      <p
        className={cn(
          'text-text-secondary',
          layout === 'page' ? 'text-body-m tablet:text-body-l' : 'text-body-s',
        )}
      >
        {c.body}
      </p>
      <div className="flex flex-col gap-3 pt-1 tablet:flex-row tablet:flex-wrap">
        {primary && <RegulatoryActionButton action={primary} variant="primary" />}
        {rest.map((a, i) => (
          <RegulatoryActionButton key={a.label} action={a} variant={i === 0 ? 'secondary' : 'ghost'} />
        ))}
      </div>
    </div>
  );

  if (layout === 'card') {
    return (
      <section
        data-regulatory-state={kind}
        aria-labelledby={undefined}
        className={cn(
          'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6',
          className,
        )}
      >
        {hero}
        {c.stillWorks.length > 0 && (
          <ul className="flex flex-col gap-2 border-t border-border-subtle pt-4">
            {c.stillWorks.map((i) => (
              <li key={i.title} className="flex gap-2.5 text-body-s text-text-secondary">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
                <span>
                  <span className="text-text-primary">{i.title}</span> — {i.body}
                </span>
              </li>
            ))}
          </ul>
        )}
        {c.note && (
          <p className="flex gap-2 text-caption text-text-tertiary">
            <Info aria-hidden className="mt-px size-4 shrink-0 text-icon-muted" />
            {c.note}
          </p>
        )}
        {children}
      </section>
    );
  }

  return (
    <div data-regulatory-state={kind} className={cn('flex flex-col gap-6', className)}>
      <section className="rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-10">
        {hero}
      </section>
      <div className="grid gap-6 laptop:grid-cols-2">
        <ListCard title="What still works" icon={Check} tone="success" items={c.stillWorks} />
        <ListCard title="Paused" icon={Pause} tone="warning" items={c.paused} />
      </div>
      {c.note && (
        <p className="flex gap-2 rounded-lg border border-border-subtle bg-bg-secondary px-4 py-3 text-body-s text-text-secondary">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
          {c.note}
        </p>
      )}
      {children}
      <RegulatoryFooter />
    </div>
  );
}

/** Inline banner variant (Alert/Banner Regional restriction · Regulatory notice) for pages that stay usable. */
export function RegulatoryNotice({
  kind,
  ctx,
  className,
}: {
  kind: RegulatoryKind;
  ctx?: RegulatoryContext;
  className?: string;
}) {
  const auth = useAuth();
  const c = regulatoryCopy(kind, { signedIn: auth.status !== 'guest', ...ctx });
  const [primary, second] = c.actions;
  return (
    <Alert
      type={kind === 'region' ? 'restricted' : 'regulatory'}
      title={c.title}
      className={className}
      actions={
        <>
          {primary && <RegulatoryActionButton action={primary} variant="secondary" size="s" />}
          {second && <RegulatoryActionButton action={second} variant="ghost" size="s" />}
        </>
      }
    >
      {c.body}
    </Alert>
  );
}

/** 18+ · licence · RG line under every regulatory state. */
export function RegulatoryFooter({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-caption text-text-tertiary', className)}>
      <AgeBadge />
      <LicenceChip />
      <span>
        Gambling can be addictive.{' '}
        <Link href="/responsible-gaming" className="text-text-brand hover:underline">
          Play responsibly
        </Link>{' '}
        — limits and self-exclusion are always available.
      </span>
    </div>
  );
}

const HELP_ORGS = [
  {
    name: 'Gambling Therapy',
    detail: 'Free online support and live chat in 30+ languages, for anyone affected',
    url: 'https://www.gamblingtherapy.org',
    host: 'gamblingtherapy.org',
    icon: Globe,
  },
  {
    name: 'GamCare',
    detail: 'Helpline and chat, including support for young people (UK)',
    url: 'https://www.gamcare.org.uk',
    host: 'gamcare.org.uk',
    icon: MessageSquare,
  },
  {
    name: 'Gamblers Anonymous',
    detail: 'Peer support meetings worldwide',
    url: 'https://gamblersanonymous.org',
    host: 'gamblersanonymous.org',
    icon: Users,
  },
];

/** Real help organisations (same list as RG/Help Resources), for the age-gate exit and self-exclusion states. */
export function HelpOrganisations({
  title = 'Free, confidential help',
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6',
        className,
      )}
    >
      <h2 className="flex items-center gap-2.5 text-h5 text-text-primary">
        <HeartHandshake aria-hidden className="size-5 text-icon-brand" />
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {HELP_ORGS.map((r) => (
          <li key={r.name}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-md border border-border-subtle bg-surface-raised/40 p-3 transition-colors hover:bg-surface-hover"
            >
              <r.icon aria-hidden className="size-[18px] shrink-0 text-icon-muted" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-s-strong text-text-primary">{r.name}</span>
                <span className="text-caption text-text-secondary">{r.detail}</span>
                <span className="font-mono text-mono-s text-text-tertiary">{r.host}</span>
              </span>
              <ExternalLink aria-hidden className="size-4 shrink-0 text-icon-muted" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
