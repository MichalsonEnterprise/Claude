'use client';

import { formatUSDT } from '@gp/shared/money';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpFromLine,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  Download,
  ExternalLink,
  Globe2,
  Hash,
  HeartHandshake,
  Hourglass,
  Info,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Pause,
  Scale,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { regulatoryCopy } from '@/components/compliance/regulatory-copy';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { ROUTES } from '@/components/shell/nav-config';
import { AgeBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  authApi,
  authKeys,
  routeForGate,
  type AccountStatus,
  type WalletBalances,
} from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';

import { Callout, LicenceChip, Note, NumStep, Overline, type Tone } from './auth-ui';
import { formatUtcDateTime } from './format';

import type { RestrictedVariant } from './restricted-variants';

export type { RestrictedVariant };

const GATE_FOR: Record<RestrictedVariant, AccountStatus['gate']> = {
  suspended: 'suspended',
  'under-review': 'under_review',
  'self-excluded': 'self_excluded',
  region: 'region',
};

interface Item {
  title: string;
  body: string;
}

interface VariantCopy {
  tone: Tone;
  icon: LucideIcon;
  accent: string;
  badge: { status: 'restricted' | 'under_review'; label: string };
  overline: string;
  title: string;
  body: React.ReactNode;
  meta: { icon: LucideIcon; label: string; mono?: boolean }[];
  can: Item[];
  pausedTitle: string;
  paused: Item[];
  balNote: string;
  stepsTitle: string;
  steps: { state: 'done' | 'now' | 'next'; title: string; body: string }[];
  stepsNote: { icon: LucideIcon; text: string };
  primary: { label: string; href: string; icon: LucideIcon; withdraw?: boolean };
  secondary: { label: string; href: string; icon: LucideIcon; withdraw?: boolean };
  helpRef: string | null;
  rg?: boolean;
}

function copyFor(variant: RestrictedVariant, s: AccountStatus): VariantCopy {
  const sus = s.restrictions.find((r) => r.type === 'account_suspended');
  // A review is any restriction short of a suspension, including an AML withdrawals freeze (gate under_review).
  const review = s.restrictions.find(
    (r) =>
      r.type === 'gaming_blocked' ||
      r.type === 'deposits_blocked' ||
      r.type === 'withdrawals_frozen',
  );
  const withdrawCan: Item = s.paused.withdrawals
    ? {
        title: 'Withdrawals are paused too',
        body: 'A compliance hold applies to withdrawals — support can explain what’s needed.',
      }
    : {
        title: 'Withdraw your Available balance',
        body: 'To a whitelisted address — security checks apply as usual.',
      };
  switch (variant) {
    case 'suspended':
      return {
        tone: 'danger',
        icon: ShieldAlert,
        accent: 'bg-status-danger',
        badge: { status: 'restricted', label: 'Suspended' },
        overline: `Account suspended${sus ? ` · Case ${sus.reference}` : ''}`,
        title: 'Your account is suspended while a required check is completed',
        body: (
          <>
            Our compliance team paused your account
            {sus ? ` on ${formatUtcDateTime(sus.since)}` : ''}. Your money is safe and you can still
            take it out. Support can tell you exactly which documents or answers we need.
          </>
        ),
        meta: [
          ...(sus ? [{ icon: CalendarDays, label: `Since ${formatUtcDateTime(sus.since)}` }] : []),
          ...(sus ? [{ icon: Hash, label: sus.reference, mono: true }] : []),
        ],
        can: [
          withdrawCan,
          {
            title: 'See history and download statements',
            body: 'Every deposit, entry, prize and fee stays visible.',
          },
          {
            title: 'Use responsible-gaming tools',
            body: 'Limits, breaks and self-exclusion keep working.',
          },
          {
            title: 'Close your account',
            body: 'Withdraw everything first — we never keep your balance.',
          },
        ],
        pausedTitle: 'Paused while suspended',
        paused: [
          { title: 'Deposits', body: 'New deposits are paused until the check is complete.' },
          {
            title: 'Games and new Global Pool entries',
            body: 'Entries you already hold stay in their draw and settle normally.',
          },
          { title: 'Promotions and VIP rewards', body: 'Rewards you already earned still settle.' },
        ],
        balNote:
          'Owed amounts (refunds, prizes, rewards earned earlier) still settle to Available.',
        stepsTitle: 'What happens next',
        steps: [
          {
            state: 'now',
            title: 'Contact support with your case reference',
            body: 'We’ll explain the check and which documents work for you.',
          },
          {
            state: 'next',
            title: 'Compliance review — usually 2 business days',
            body: 'We may ask one follow-up question by email (look for your anti-phishing code).',
          },
          {
            state: 'next',
            title: 'Restriction lifted',
            body: 'Play, deposits and promotions switch back on; we confirm by email.',
          },
        ],
        stepsNote: {
          icon: Scale,
          text: 'Disagree with this decision? You can appeal within 30 days — an independent reviewer who wasn’t involved will look at it.',
        },
        primary: { label: 'Contact support', href: '/support', icon: MessageCircle },
        secondary: {
          label: 'Withdraw available balance',
          href: ROUTES.wallet,
          icon: ArrowUpFromLine,
          withdraw: true,
        },
        helpRef: sus?.reference ?? null,
      };
    case 'under-review':
      return {
        tone: 'info',
        icon: Hourglass,
        accent: 'bg-status-info',
        badge: { status: 'under_review', label: 'Under review' },
        overline: `Account review${review ? ` · Case ${review.reference}` : ''}`,
        title: 'We’re reviewing your account',
        body: (
          <>
            Some features are paused while our team completes a review
            {review ? ` (started ${formatUtcDateTime(review.since)})` : ''}.{' '}
            {s.paused.withdrawals
              ? 'Withdrawals are on hold until the review ends — support can explain what’s needed.'
              : 'You don’t need to do anything right now — withdrawals stay open.'}
          </>
        ),
        meta: [
          ...(review
            ? [{ icon: CalendarDays, label: `Started ${formatUtcDateTime(review.since)}` }]
            : []),
          ...(review ? [{ icon: Hash, label: review.reference, mono: true }] : []),
        ],
        can: [
          withdrawCan,
          {
            title: 'Keep your current entries',
            body: 'Entries already in a round stay in the draw; prizes are paid normally.',
          },
          {
            title: 'See history, limits and settings',
            body: 'Everything in your account stays visible.',
          },
        ],
        pausedTitle: 'Paused during the review',
        paused: [
          ...(s.paused.withdrawals
            ? [
                {
                  title: 'Withdrawals',
                  body: 'A compliance hold applies until the review ends. Your balance stays in your account.',
                },
              ]
            : []),
          ...(s.paused.deposits
            ? [{ title: 'New deposits', body: 'Back on as soon as the review ends.' }]
            : []),
          ...(s.paused.gaming
            ? [{ title: 'Games and new Global Pool entries', body: 'Paused until the decision.' }]
            : []),
          {
            title: 'Promotions',
            body: 'Offers you already hold keep their expiry date plus the review time.',
          },
        ],
        balNote:
          'Balances keep updating during the review: pending deposits are credited when confirmed.',
        stepsTitle: 'What happens next',
        steps: [
          {
            state: 'done',
            title: 'Automatic checks',
            body: 'Identity, sanctions and device checks run first.',
          },
          {
            state: 'now',
            title: 'An analyst reviews your account activity',
            body: 'Usually finished within 48 hours.',
          },
          {
            state: 'next',
            title: 'You get the decision by email and here',
            body: 'If we need a document, we’ll ask once and explain why.',
          },
        ],
        stepsNote: { icon: Mail, text: 'Real emails from us always show your anti-phishing code.' },
        // With withdrawals on hold, support is the way forward (the withdraw button shows as unavailable).
        ...(s.paused.withdrawals
          ? {
              primary: { label: 'Contact support', href: '/support', icon: MessageCircle },
              secondary: {
                label: 'Withdraw available balance',
                href: ROUTES.wallet,
                icon: ArrowUpFromLine,
                withdraw: true,
              },
            }
          : {
              primary: {
                label: 'Withdraw available balance',
                href: ROUTES.wallet,
                icon: ArrowUpFromLine,
                withdraw: true,
              },
              secondary: { label: 'Contact support', href: '/support', icon: MessageCircle },
            }),
        helpRef: review?.reference ?? null,
      };
    case 'self-excluded': {
      const ends = s.selfExclusion.endsAt;
      // ERR-05 shared copy for a cooling-off break (24 h / 7 d / 30 d): it is not a self-exclusion.
      const coolingOff =
        s.selfExclusion.kind === 'cooling_off'
          ? regulatoryCopy('cooling_off', { endsAt: ends, signedIn: true })
          : null;
      return {
        tone: 'brand',
        icon: coolingOff ? Hourglass : HeartHandshake,
        accent: 'bg-brand',
        badge: { status: 'restricted', label: coolingOff ? 'On a break' : 'Self-excluded' },
        overline: coolingOff ? coolingOff.overline : 'Self-exclusion',
        title: coolingOff ? coolingOff.title : 'You’re taking a break from gambling',
        body: coolingOff ? (
          coolingOff.body
        ) : (
          <>
            You chose to self-exclude
            {s.selfExclusion.startsAt
              ? ` on ${formatUtcDateTime(s.selfExclusion.startsAt)}`
              : ''}. {ends ? `Until ${formatUtcDateTime(ends)}` : 'Your break is permanent:'} you
            can’t play, enter Global Pool rounds or deposit — and the break can’t be shortened or
            undone early, not even by support.
          </>
        ),
        meta: [
          { icon: CalendarDays, label: ends ? `Ends ${formatUtcDateTime(ends)}` : 'Permanent' },
          { icon: Lock, label: 'Can’t be shortened' },
        ],
        can: [
          {
            title: 'Withdraw your balance at any time',
            body: 'We recommend taking it out now. Security checks apply as usual.',
          },
          { title: 'Download your history', body: 'Statements and transactions stay available.' },
          {
            title: 'Close your account for good',
            body: 'Withdraw first; closing can’t be reversed.',
          },
          {
            title: 'Extend your break',
            body: 'You can make it longer or permanent — never shorter.',
          },
        ],
        pausedTitle: ends
          ? `Switched off until ${formatUtcDateTime(ends).split(',')[0]}`
          : 'Switched off',
        paused: [
          {
            title: 'Games, Global Pool and deposits',
            body: 'Entries bought before your break still settle; prizes go to Available.',
          },
          {
            title: 'All marketing',
            body: 'No emails, push messages or bonus offers. VIP rewards stop accruing.',
          },
          {
            // Truthful scope: exclusions are bound to this account; nothing links other accounts yet (R26).
            title: 'Other accounts',
            body: 'This break covers this account. If you have another GLOBAL POOL account, exclude it too — support can help.',
          },
        ],
        balNote:
          'Anything owed to you (refunds, prizes) settles to Available and can be withdrawn.',
        stepsTitle: 'When your break ends',
        // A cooling-off break (24 h / 7 d / 30 d) ends on its date; a self-exclusion never reopens by itself (API).
        steps:
          s.selfExclusion.kind === 'cooling_off'
            ? [
                {
                  state: 'next',
                  title: 'Play switches back on at the end time',
                  body: 'Your limits stay exactly as they are.',
                },
              ]
            : [
                {
                  state: 'next',
                  title: 'Nothing switches back on automatically',
                  body: 'Your account stays closed to play.',
                },
                {
                  state: 'next',
                  title: 'Ask to reopen — if you want to',
                  body: 'Under Responsible gaming → Self-exclusion, once the end date has passed.',
                },
                {
                  state: 'next',
                  title: '24-hour cool-down, then limits first',
                  body: 'You’ll set deposit and loss limits before you can play again.',
                },
              ],
        stepsNote: {
          icon: Info,
          text: 'There is no “end early” or “play now” option anywhere in GLOBAL POOL during your break.',
        },
        primary: {
          label: 'Withdraw your balance',
          href: ROUTES.wallet,
          icon: ArrowUpFromLine,
          withdraw: true,
        },
        secondary: { label: 'Talk to someone', href: '/support', icon: MessageCircle },
        helpRef: null,
        rg: true,
      };
    }
    case 'region': {
      const here = s.region.current?.name ?? s.region.current?.code ?? 'your current location';
      const home = s.region.declared;
      return {
        tone: 'warning',
        icon: MapPin,
        accent: 'bg-status-warning',
        badge: { status: 'restricted', label: 'Restricted region' },
        overline: `Regional restriction${s.region.current?.name ? ` · ${s.region.current.name}` : ''}`,
        title: 'GLOBAL POOL isn’t available where you are right now',
        body: (
          <>
            {home && !home.permitted
              ? `Your country of residence (${home.name ?? home.code}) isn’t covered by our licence.`
              : `You’re signing in from ${here}. Our licence doesn’t cover it, so play, entries, deposits and promotions are paused while you’re there.`}{' '}
            Your account and funds are not affected.
          </>
        ),
        meta: [
          ...(home
            ? [
                {
                  icon: Globe2,
                  label: `Residence: ${home.name ?? home.code} (${home.permitted ? 'permitted' : 'restricted'})`,
                },
              ]
            : []),
          ...(s.region.current
            ? [
                {
                  icon: MapPin,
                  label: `Now: ${here} (${s.region.current.permitted ? 'permitted' : 'restricted'})`,
                },
              ]
            : []),
        ],
        can: [
          {
            title: 'Withdraw your Available balance',
            body: 'To your whitelisted address, unless local law prevents it where you are.',
          },
          {
            title: 'See your account, history and settings',
            body: 'Everything stays visible while you travel.',
          },
          {
            title: 'Use responsible-gaming tools',
            body: 'Limits, breaks and self-exclusion always work.',
          },
          {
            title: 'Keep your current entries',
            body: 'Entries already in a round stay in the draw.',
          },
        ],
        pausedTitle: 'Paused in this region',
        paused: [
          {
            title: 'Games and new Global Pool entries',
            body: 'Available again when you sign in from a permitted country.',
          },
          { title: 'Deposits', body: `Paused while you’re in ${here}.` },
          { title: 'Promotions', body: 'Offers you hold keep their original expiry date.' },
        ],
        balNote: 'Your balances don’t change because of your location.',
        stepsTitle: 'Travelling or moved?',
        steps: [
          {
            state: 'next',
            title: 'Travelling: nothing to do',
            body: 'Play resumes automatically when you sign in from a permitted country.',
          },
          {
            state: 'next',
            title: 'Moved: update your country of residence',
            body: 'We’ll review your account and proof of address before anything changes.',
          },
          {
            state: 'next',
            title: 'Please don’t use a VPN or proxy',
            body: 'It breaks our Terms and can lead to account closure.',
          },
        ],
        stepsNote: {
          icon: BookOpen,
          text: 'See the full list of restricted countries and why they’re restricted.',
        },
        primary: {
          label: 'Withdraw available balance',
          href: ROUTES.wallet,
          icon: ArrowUpFromLine,
          withdraw: true,
        },
        secondary: {
          label: 'Restricted countries',
          href: '/legal/restricted-countries',
          icon: ExternalLink,
        },
        helpRef: null,
      };
    }
  }
}

/** /restricted/[variant] data wrapper: account gate + balances from the API, with loading / error / not-restricted states. */
export function RestrictedScreen({ variant }: { variant: RestrictedVariant }) {
  const auth = useAuth();
  const member = auth.status === 'member';
  const status = useQuery({
    queryKey: authKeys.accountStatus,
    queryFn: authApi.accountStatus,
    enabled: member,
  });
  // Balances are readable under every restriction (GET /wallet/balances has no restriction policy); a withdrawals
  // hold only disables the withdraw button — it must never leave the balance card loading forever.
  const balances = useQuery({
    queryKey: authKeys.balances,
    queryFn: authApi.balances,
    enabled: member && status.data !== undefined,
    retry: false,
  });

  if (auth.status === 'guest') {
    return (
      <StateCard icon={Lock} title="Sign in to see your account status">
        <Button
          size="l"
          onClick={() =>
            auth.openAuth?.('sign-in', { next: `/restricted/${variant}` }) ?? auth.signIn()
          }
        >
          Sign in
        </Button>
      </StateCard>
    );
  }
  if (auth.status === 'loading' || status.isPending) return <RestrictedSkeleton />;
  if (status.isError) {
    return <AccountStatusError error={status.error} onRetry={() => void status.refetch()} />;
  }
  const s = status.data;
  if (s.gate !== GATE_FOR[variant]) {
    const other = routeForGate(s.gate);
    return (
      <StateCard
        icon={CircleCheck}
        tone="success"
        title={
          s.gate === 'ok'
            ? 'No restrictions on your account'
            : 'This page doesn’t match your account'
        }
      >
        <p className="text-body-s text-text-secondary">
          {s.gate === 'ok'
            ? 'Play, entries, deposits and withdrawals are available where permitted.'
            : 'Your account has a different status — see the details on its own page.'}
        </p>
        <Button asChild size="l">
          <Link href={other ?? '/'}>{other ? 'See my account status' : 'Go to the lobby'}</Link>
        </Button>
      </StateCard>
    );
  }
  return <RestrictedView variant={variant} status={s} balances={balances.data ?? null} />;
}

/** AUTH-18 restricted account page (presentational). */
export function RestrictedView({
  variant,
  status,
  balances,
}: {
  variant: RestrictedVariant;
  status: AccountStatus;
  balances: WalletBalances | null;
}) {
  const c = copyFor(variant, status);
  const demo = status.isDemo;
  const withdrawLabel = (label: string) =>
    balances && !status.paused.withdrawals
      ? `Withdraw · up to ${formatUSDT(balances.available)}`
      : label;

  const cta = (a: VariantCopy['primary'], variantName: 'primary' | 'secondary' | 'ghost') => {
    const Icon = a.icon;
    const disabled = a.withdraw && status.paused.withdrawals;
    return (
      <Button
        asChild={!disabled}
        variant={variantName}
        size="l"
        leadingIcon={<Icon />}
        disabled={disabled}
      >
        {disabled ? <span>{a.label}</span> : <Link href={a.href}>{a.label}</Link>}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {variant === 'region' && (
        <ShellOverride restricted regionName={status.region.current?.name ?? null} />
      )}
      <nav aria-label="Breadcrumb" className="text-caption text-text-tertiary">
        <Link href="/account" className="hover:text-text-secondary">
          Account
        </Link>{' '}
        / <span aria-current="page">Account status</span>
      </nav>
      {/* Hero: content + angled-block art with the status card (Figma AUTH-18) */}
      <section className="grid overflow-hidden rounded-xl border border-border-subtle bg-surface-default laptop:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-4 p-5 tablet:p-10">
          <span
            className={cn(
              'inline-flex size-12 items-center justify-center rounded-lg [&_svg]:size-6',
              {
                'bg-status-danger-tint text-text-danger': c.tone === 'danger',
                'bg-status-info-tint text-text-info': c.tone === 'info',
                'bg-brand-tint text-icon-brand': c.tone === 'brand',
                'bg-status-warning-tint text-text-warning': c.tone === 'warning',
              },
            )}
          >
            <c.icon aria-hidden />
          </span>
          <Overline tone={c.tone} className="mt-2">
            {c.overline}
          </Overline>
          <h1 className="text-h3 text-text-primary tablet:text-h2">{c.title}</h1>
          <p className="text-body-m text-text-secondary tablet:text-body-l">{c.body}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.badge.status} label={c.badge.label} />
            {c.meta.map((m) => (
              <span
                key={m.label}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-raised px-3 text-caption text-text-secondary"
              >
                <m.icon aria-hidden className="size-3.5 text-icon-muted" />
                <span className={m.mono ? 'font-mono' : undefined}>{m.label}</span>
                {demo && <DemoBadge size="xs" />}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-3 tablet:flex-row">
            {cta(c.primary, 'primary')}
            {cta(c.secondary, 'secondary')}
          </div>
        </div>
        <div
          aria-hidden
          className="relative hidden min-h-[300px] overflow-hidden bg-bg-secondary laptop:block"
        >
          <div className="absolute -left-24 top-[150px] h-[120px] w-[640px] -rotate-[12deg] bg-surface-raised" />
          <div
            className={cn(
              'absolute -left-24 top-[240px] h-[44px] w-[640px] -rotate-[12deg]',
              c.accent,
            )}
          />
          <div className="absolute top-10 left-16 w-[260px] rotate-[4deg] rounded-lg border border-border-default bg-surface-overlay p-4 shadow-elevation-3">
            <p className="flex items-center gap-2 text-label-m text-text-primary">
              <c.icon aria-hidden className="size-4" /> {c.badge.label}
            </p>
            <dl className="mt-3 flex flex-col gap-2 text-caption">
              {c.meta.map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-text-secondary">
                  <m.icon aria-hidden className="size-3.5 text-icon-muted" />
                  <span className={m.mono ? 'font-mono' : undefined}>{m.label}</span>
                </div>
              ))}
            </dl>
            <span className="mt-3 flex h-9 items-center justify-center rounded-md bg-brand text-label-s text-text-on-primary">
              {c.primary.label}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 laptop:grid-cols-3">
        <Card title="What still works" icon={CircleCheck} tone="success">
          <ul className="flex flex-col gap-3.5">
            {c.can.map((i) => (
              <li key={i.title} className="flex gap-3">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-text-success" />
                <div>
                  <p className="text-body-s-strong text-text-primary">{i.title}</p>
                  <p className="text-body-s text-text-secondary">{i.body}</p>
                </div>
              </li>
            ))}
          </ul>
          {!status.paused.withdrawals && (
            <Button
              asChild
              variant={variant === 'under-review' ? 'secondary' : 'primary'}
              size="l"
              leadingIcon={<ArrowUpFromLine />}
              className="self-start max-tablet:w-full"
            >
              <Link href={ROUTES.wallet}>{withdrawLabel('Withdraw available balance')}</Link>
            </Button>
          )}
          <Note icon={Info}>{c.balNote}</Note>
        </Card>

        <Card title={c.pausedTitle} icon={Pause} tone="warning">
          <ul className="flex flex-col gap-3.5">
            {c.paused.map((i) => (
              <li key={i.title} className="flex gap-3">
                <Pause aria-hidden className="mt-0.5 size-5 shrink-0 text-text-warning" />
                <div>
                  <p className="text-body-s-strong text-text-primary">{i.title}</p>
                  <p className="text-body-s text-text-secondary">{i.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <BalanceSummary balances={balances} demo={demo} />
      </div>

      <div className="grid gap-6 laptop:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title={c.stepsTitle} icon={Clock} tone="brand">
          <ol className="flex flex-col gap-4">
            {c.steps.map((st, i) => (
              <NumStep key={st.title} n={i + 1} state={st.state} title={st.title}>
                {st.body}
              </NumStep>
            ))}
          </ol>
          <Note icon={c.stepsNote.icon} tone="brand">
            {c.stepsNote.text}
          </Note>
        </Card>

        {c.rg ? (
          <Card title="Need to talk to someone now?" icon={MessageCircle} tone="brand">
            <p className="text-body-s text-text-secondary">
              Free, confidential help — available 24/7. Our support team can also help you withdraw
              or close your account; they can’t end your break early.
            </p>
            <ul className="flex flex-col gap-2 text-body-s text-text-secondary">
              <li>Gambling Therapy — gamblingtherapy.org</li>
              <li>Gamblers Anonymous — gamblersanonymous.org</li>
              <li>GamCare — gamcare.org.uk</li>
            </ul>
            <div className="grid gap-2 tablet:grid-cols-2">
              <Button asChild variant="secondary" size="l" leadingIcon={<MessageCircle />}>
                <Link href="/support">Chat with support</Link>
              </Button>
              <Button asChild variant="ghost" size="l" leadingIcon={<ExternalLink />}>
                <Link href={ROUTES.responsibleGaming}>Responsible gaming</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card title="Questions? We’re here to help" icon={MessageCircle} tone="brand">
            <p className="text-body-s text-text-secondary">
              {c.helpRef ? (
                <>
                  Mention case <span className="font-mono text-text-primary">{c.helpRef}</span> so
                  we can help faster.{' '}
                </>
              ) : null}
              Support can explain your account status — we never ask you to change your location or
              share your seed phrase.
            </p>
            <p className="text-caption text-text-tertiary">
              Live chat usually answers in under 5 min · email within 24 h
            </p>
            <div className="grid gap-2 tablet:grid-cols-2">
              <Button asChild variant="secondary" size="l" leadingIcon={<MessageCircle />}>
                <Link href="/support">Contact support</Link>
              </Button>
              <Button asChild variant="ghost" size="l" leadingIcon={<Download />}>
                <Link href={ROUTES.transactions}>Download history</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
        <AgeBadge />
        <LicenceChip />
        <span>Gambling can be addictive. Limits and self-exclusion are always available.</span>
      </div>
    </div>
  );
}

function BalanceSummary({ balances, demo }: { balances: WalletBalances | null; demo: boolean }) {
  const rows: { key: keyof WalletBalances; label: string; hint: string; dot: string }[] = [
    {
      key: 'available',
      label: 'Available',
      hint: 'Usable for withdrawals now',
      dot: 'bg-balance-available',
    },
    {
      key: 'locked',
      label: 'Locked',
      hint: 'Active entries and pending withdrawals',
      dot: 'bg-balance-locked',
    },
    {
      key: 'pending',
      label: 'Pending',
      hint: 'Deposits waiting for confirmations',
      dot: 'bg-balance-pending',
    },
    {
      key: 'owed',
      label: 'Owed',
      hint: 'Refunds, prizes and rewards to settle',
      dot: 'bg-balance-owed',
    },
  ];
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-label-m text-text-secondary">Total balance</h2>
        {demo && <DemoBadge size="s" />}
      </div>
      {balances ? (
        <>
          <p className="font-mono text-number-l text-text-primary">{formatUSDT(balances.total)}</p>
          <dl className="flex flex-col">
            {rows.map((r) => (
              <div
                key={r.key}
                className="flex items-start gap-3 border-t border-border-subtle py-3"
              >
                <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', r.dot)} />
                <dt className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label-m text-text-primary">{r.label}</span>
                  <span className="text-caption text-text-tertiary">{r.hint}</span>
                </dt>
                <dd className="font-mono text-number-s text-text-primary">
                  {formatUSDT(String(balances[r.key] ?? '0'))}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="flex flex-col gap-3" aria-busy aria-label="Loading balances">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </section>
  );
}

function Card({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-5 tablet:p-6">
      <h2 className="flex items-center gap-2.5 text-h5 text-text-primary">
        <Icon
          aria-hidden
          className={cn('size-5', {
            'text-text-success': tone === 'success',
            'text-text-warning': tone === 'warning',
            'text-icon-brand': tone === 'brand',
          })}
        />
        {title}
      </h2>
      {children}
    </section>
  );
}

function StateCard({
  icon: Icon,
  title,
  tone = 'neutral',
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-[560px] flex-col items-start gap-4 rounded-xl border border-border-subtle bg-surface-default p-6 tablet:p-8">
      <span
        className={cn(
          'inline-flex size-12 items-center justify-center rounded-lg [&_svg]:size-6',
          tone === 'success'
            ? 'bg-status-success-tint text-text-success'
            : 'bg-surface-raised text-icon-default',
        )}
      >
        <Icon aria-hidden />
      </span>
      <h1 className="text-h3 text-text-primary">{title}</h1>
      {children}
    </section>
  );
}

function RestrictedSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading account status">
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <div className="grid gap-6 laptop:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

/** ERR-02 account-status failure: readable copy per error kind + Try again (429 waits for Retry-After). */
function AccountStatusError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-2">
      <ErrorState
        error={error}
        onRetry={onRetry}
        what="your account status"
        note="Withdrawals and your balance are not affected."
      />
    </section>
  );
}

/**
 * /restricted → the page matching the current account gate. Guests get a sign-in prompt, a failed status an
 * error with Try again, and an account that still has to finish onboarding a link there — never an endless
 * skeleton (ERR-03).
 */
export function RestrictedIndex() {
  const auth = useAuth();
  const status = useQuery({
    queryKey: authKeys.accountStatus,
    queryFn: authApi.accountStatus,
    enabled: auth.status === 'member',
  });
  const target = status.data ? routeForGate(status.data.gate) : null;
  React.useEffect(() => {
    if (target && target !== '/onboarding') window.location.replace(target);
  }, [target]);
  if (auth.status === 'guest') {
    return (
      <StateCard icon={Lock} title="Sign in to see your account status">
        <Button
          size="l"
          onClick={() => auth.openAuth?.('sign-in', { next: '/restricted' }) ?? auth.signIn()}
        >
          Sign in
        </Button>
      </StateCard>
    );
  }
  if (status.isError) {
    return <AccountStatusError error={status.error} onRetry={() => void status.refetch()} />;
  }
  if (target === '/onboarding') {
    return (
      <StateCard icon={Info} title="Finish setting up your account">
        <p className="text-body-s text-text-secondary">
          Confirm your details and consents first — then you can see your account status here.
        </p>
        <Button asChild size="l">
          <Link href="/onboarding?next=/restricted">Continue setup</Link>
        </Button>
      </StateCard>
    );
  }
  if (status.data && !target) {
    return (
      <StateCard icon={CircleCheck} tone="success" title="No restrictions on your account">
        <Button asChild size="l">
          <Link href="/">Go to the lobby</Link>
        </Button>
      </StateCard>
    );
  }
  return <RestrictedSkeleton />;
}

export { Callout };
