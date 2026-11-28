'use client';

import { formatUSDT } from '@gp/shared/money';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  CircleCheck,
  Copy,
  Download,
  FileText,
  Hash,
  HeartHandshake,
  Link2,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  UserCheck,
  Coins,
  ArrowDown,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ChainMark, TokenMark } from '@/components/brand/chain-mark';
import { Alert } from '@/components/ui/alert';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/components/shell/nav-config';
import { useNetworks } from '@/lib/data/hooks';
import type { NetworkView } from '@/lib/data/types';
import { cn } from '@/lib/utils';

import { TicketGlyph } from './art';
import { useHomeView } from './home-context';
import { ArrowLink, HomeSection, SectionHeader } from './primitives';

const card = 'rounded-xl border border-border-subtle bg-surface-default';
const mono = 'font-mono text-[12px] leading-4';

// ── H5 How it works ─────────────────────────────────────────────────────────────────────────────

function Diagram({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex min-h-[132px] flex-col justify-center gap-2 rounded-lg bg-bg-secondary p-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

function StepCard({
  n,
  icon: Icon,
  title,
  body,
  diagram,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
  diagram: React.ReactNode;
}) {
  return (
    <li className={cn(card, 'flex w-[78%] shrink-0 snap-start flex-col gap-4 p-4 tablet:w-auto')}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">
          {String(n).padStart(2, '0')}
        </span>
        <span className="text-overline tracking-[0.08em] text-text-tertiary uppercase">
          Step {n} of 5
        </span>
        <span aria-hidden className="ml-auto">
          <Icon className="size-[18px] text-icon-brand" />
        </span>
      </div>
      {diagram}
      <div className="flex flex-col gap-2">
        <h3 className="text-h5 text-text-primary">{title}</h3>
        <p className="text-body-s text-text-secondary">{body}</p>
      </div>
    </li>
  );
}

export function HowItWorksSection() {
  const { viewer, restricted, signUp } = useHomeView();
  const networks = useNetworks();
  const enabled = (networks.data ?? []).filter((n) => n.enabled);
  const soon = (networks.data ?? []).filter((n) => !n.enabled);
  return (
    <HomeSection id="how-it-works">
      <SectionHeader
        id="how-it-works-title"
        title="How it works"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href="/legal/terms#entries">Full guide</Link>
          </Button>
        }
        subtitle="From sign-up to payout in five steps — each step leaves a record you can check in your account or on-chain."
      />
      <ol className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:grid tablet:grid-cols-2 tablet:gap-4 tablet:overflow-visible tablet:px-0 lg:grid-cols-3 laptop:grid-cols-5">
        <StepCard
          n={1}
          icon={UserCheck}
          title="Connect & verify"
          body="Create an account, connect a wallet and verify your identity. We confirm you are 18+ and in a permitted jurisdiction."
          diagram={
            <Diagram className="items-start">
              <span className="inline-flex items-center gap-2 rounded-md bg-surface-raised px-2 py-1.5">
                <ChainMark chain="bnb" size={16} />
                <span className={cn(mono, 'text-text-primary')}>0x12ab…9f3C</span>
                <Copy className="size-3.5 text-icon-muted" />
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-status-success-tint px-2 text-[12px] text-text-success">
                  <CheckCircle2 className="size-3.5" /> KYC verified
                </span>
                <AgeBadge />
              </span>
              <span className="flex items-center gap-1.5 text-caption text-text-secondary">
                <MapPin className="size-3.5" /> PT · permitted <DemoBadge size="xs" />
              </span>
            </Diagram>
          }
        />
        <StepCard
          n={2}
          icon={Download}
          title="Deposit USDT"
          body={
            enabled.length > 0 && soon.length > 0 ? (
              <>
                Send USDT on {enabled.map((n) => n.name).join(', ')}.{' '}
                {soon.map((n) => n.name).join(', ')} are coming soon. Network fees are shown before
                you send.
              </>
            ) : (
              'Send USDT on a supported network. Network fees are shown before you send.'
            )
          }
          diagram={
            <Diagram>
              <span className="flex items-center gap-2">
                <TokenMark size={22} />
                <span className="text-h5 text-text-primary tabular-nums">1,000.00</span>
                <DemoBadge size="xs" />
              </span>
              <span className="flex items-center gap-1.5">
                {(networks.data ?? []).map((n) => (
                  <ChainMark
                    key={n.key}
                    chain={n.key}
                    size={20}
                    className={cn(!n.enabled && 'opacity-35 grayscale')}
                  />
                ))}
              </span>
              <span className="flex items-center gap-3 text-caption text-text-secondary">
                Min deposit <span className={cn(mono, 'text-text-primary')}>10.00 USDT</span>
              </span>
            </Diagram>
          }
        />
        <StepCard
          n={3}
          icon={TicketGlyph}
          title="Enter the round"
          body="Each entry is 10.00 USDT — all of it goes into the pool — plus a separate 0.05 USDT platform fee."
          diagram={
            <Diagram>
              <span className="flex items-stretch overflow-hidden rounded-md border border-border-default">
                <span className="flex flex-1 flex-col gap-0.5 bg-surface-raised px-2.5 py-1.5">
                  <span className={cn(mono, 'text-text-primary')}>E-1248-00981</span>
                  <span className="text-caption text-text-tertiary">Round #1,248</span>
                </span>
                <span className="flex w-10 items-center justify-center border-l border-dashed border-border-strong bg-gold-tint-strong">
                  <TicketGlyph className="size-4 text-text-gold" />
                </span>
              </span>
              <span className="flex justify-between text-caption text-text-secondary">
                To pool <span className={cn(mono, 'text-text-primary')}>10.00</span>
              </span>
              <span className="flex justify-between text-caption text-text-secondary">
                Platform fee <span className={cn(mono, 'text-text-primary')}>0.05</span>
              </span>
            </Diagram>
          }
        />
        <StepCard
          n={4}
          icon={ShieldCheck}
          title="Chainlink VRF draw"
          body="At close the contract requests randomness from Chainlink VRF. No one — including us — can choose the winners."
          diagram={
            <Diagram>
              {[
                ['Requested', '20:00:04'],
                ['Fulfilled', '20:00:41'],
                ['Settled', '20:02:10'],
              ].map(([label, t]) => (
                <span
                  key={label}
                  className="flex items-center gap-2 text-caption text-text-secondary"
                >
                  <CircleCheck className="size-3.5 text-icon-brand" />
                  {label}
                  <span className={cn(mono, 'ml-auto text-text-primary')}>{t}</span>
                </span>
              ))}
              <span className="flex items-center gap-2">
                <span className={cn(mono, 'text-text-brand')}>0x9f2c…e71a</span>
                <DemoBadge size="xs" />
              </span>
            </Diagram>
          }
        />
        <StepCard
          n={5}
          icon={Coins}
          title="Prize settles"
          body="Prizes are recorded as Owed at settlement and move to Available once confirmed. Withdraw any time."
          diagram={
            <Diagram className="gap-1.5">
              <span className="flex items-center justify-between rounded-md bg-gold-tint-strong px-2.5 py-1.5 text-caption text-text-gold">
                Owed <span className="text-label-l text-text-primary tabular-nums">3,728.00</span>
              </span>
              <ArrowDown className="mx-auto size-3.5 text-icon-muted" />
              <span className="flex items-center justify-between rounded-md bg-brand-tint px-2.5 py-1.5 text-caption text-text-brand">
                Available{' '}
                <span className="text-label-l text-text-primary tabular-nums">3,728.00</span>
              </span>
              <span className="flex items-center gap-2 text-caption text-text-tertiary">
                Runner-up prize <DemoBadge size="xs" />
              </span>
            </Diagram>
          }
        />
      </ol>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {restricted ? (
          <Button size="l" disabled leadingIcon={<Lock aria-hidden />}>
            Not available in your region
          </Button>
        ) : viewer === 'member' ? (
          <Button size="l" asChild>
            <Link href={ROUTES.deposit}>Deposit USDT</Link>
          </Button>
        ) : (
          <Button size="l" onClick={signUp}>
            Create free account
          </Button>
        )}
        <Link
          href="/legal/terms#entries"
          className="inline-flex items-center gap-2 text-label-l text-text-primary hover:underline hover:underline-offset-4"
        >
          Read the round rules <ArrowRight aria-hidden className="size-5" />
        </Link>
        <span className="text-caption text-text-tertiary">
          Takes about 2 minutes · 18+ only · Available in permitted jurisdictions
        </span>
      </div>
    </HomeSection>
  );
}

// ── H6 Supported networks ───────────────────────────────────────────────────────────────────────

function NetworkStatus({ n }: { n: NetworkView }) {
  if (!n.enabled) {
    return (
      <span className="inline-flex h-6 w-fit items-center gap-1 rounded-full bg-surface-pressed px-2 text-[12px] font-medium text-text-secondary">
        Coming soon
      </span>
    );
  }
  const congested = n.health !== 'operational';
  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit items-center gap-1 rounded-full px-2 text-[12px] font-medium',
        congested
          ? 'bg-status-warning-tint text-text-warning'
          : 'bg-status-success-tint text-text-success',
      )}
    >
      {congested ? <TriangleAlert className="size-3.5" /> : <CircleCheck className="size-3.5" />}
      {congested ? 'Congested · slower' : 'Operational'}
    </span>
  );
}

function NetworkCard({ n }: { n: NetworkView }) {
  return (
    <li className={cn(card, 'flex w-[68%] shrink-0 snap-start flex-col gap-3 p-4 tablet:w-auto')}>
      <div className="flex items-center gap-2.5">
        <ChainMark chain={n.key} size={28} />
        <div className="min-w-0">
          <h3 className="text-label-l text-text-primary">{n.name}</h3>
          <p className="truncate text-caption text-text-tertiary">{n.standard}</p>
        </div>
      </div>
      <NetworkStatus n={n} />
      <dl className="flex flex-col gap-2.5 border-t border-border-subtle pt-3">
        {[
          ['Confirmations', n.confirmationsLabel],
          ['Withdrawal network fee', formatUSDT(n.withdrawalNetworkFee)],
          ['Min deposit', formatUSDT(n.minDeposit)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-caption text-text-tertiary">{k}</dt>
            <dd className="text-label-m text-text-primary tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto flex items-center gap-2 text-caption whitespace-nowrap text-text-tertiary">
        {n.isDemo && <DemoBadge size="xs" />} Typical · varies with load
      </p>
    </li>
  );
}

export function NetworksSection() {
  const { restricted, viewer, signUp } = useHomeView();
  const networks = useNetworks();
  const list = networks.data ?? [];
  const enabled = list.filter((n) => n.enabled);
  return (
    <HomeSection id="networks">
      <SectionHeader
        id="networks-title"
        title="Supported networks"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href="/status">Network status</Link>
          </Button>
        }
      />
      {!restricted && (
        <div
          className={cn(
            card,
            'flex flex-col gap-4 p-5 laptop:flex-row laptop:items-center laptop:gap-3 laptop:px-6 laptop:py-4',
          )}
        >
          <div className="flex min-w-0 items-center gap-3 laptop:shrink-0">
            <TokenMark size={40} />
            <div className="min-w-0">
              <p className="text-h4 text-text-primary">
                Deposit USDT on{' '}
                {enabled.length === 1 ? enabled[0]!.name : `${enabled.length} networks`}
              </p>
              <p className="text-caption text-text-tertiary">
                Min. deposit 10.00 USDT · network fees go to the chain, not to us
              </p>
            </div>
          </div>
          <ul className="flex flex-wrap items-center gap-2 laptop:ml-auto laptop:flex-nowrap">
            {list.map((n) => (
              <li
                key={n.key}
                title={n.enabled ? `${n.name} — live` : `${n.name} — coming soon`}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border border-border-default bg-bg-secondary pr-2.5 pl-1 text-caption',
                  n.enabled ? 'text-text-primary' : 'text-text-tertiary',
                )}
              >
                <ChainMark chain={n.key} size={18} className={cn(!n.enabled && 'opacity-50')} />
                {n.name}
                {n.enabled ? (
                  <span aria-hidden className="size-1.5 rounded-full bg-status-success" />
                ) : (
                  <span aria-hidden className="size-1.5 rounded-full border border-text-tertiary" />
                )}
                <span className="sr-only">{n.enabled ? '(live)' : '(coming soon)'}</span>
              </li>
            ))}
          </ul>
          {viewer === 'member' ? (
            <Button asChild>
              <Link href={ROUTES.deposit}>
                <Download aria-hidden /> Deposit
              </Link>
            </Button>
          ) : (
            <Button leadingIcon={<Download aria-hidden />} onClick={signUp}>
              Deposit
            </Button>
          )}
        </div>
      )}
      <ul className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:grid tablet:gap-4 tablet:overflow-visible tablet:px-0 tablet:grid-cols-3 laptop:grid-cols-5">
        {networks.data
          ? list.map((n) => <NetworkCard key={n.key} n={n} />)
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[68%] shrink-0 tablet:w-auto">
                <Skeleton className="h-[294px] rounded-xl" />
              </li>
            ))}
      </ul>
      <Alert type="warning">
        Only send USDT on the network you selected — tokens sent on another network or as another
        token can be lost. GLOBAL POOL charges no withdrawal fee; the network fee is shown before
        you confirm.
      </Alert>
    </HomeSection>
  );
}

// ── H8 Security ─────────────────────────────────────────────────────────────────────────────────

const SECURITY: { icon: LucideIcon; title: string; body: string; cta: string; href: string }[] = [
  {
    icon: Lock,
    title: 'Segregated custody',
    body: 'Player balances sit in segregated wallets and are reconciled against the ledger every hour.',
    cta: 'How custody works',
    href: '/security#custody',
  },
  {
    icon: Box,
    title: 'Audited contracts',
    body: 'GlobalPool v1.3.0, VRFConsumer v1.1.2 and Treasury v1.0.4. Audit reports: DEMO placeholder.',
    cta: 'View contracts',
    href: '/security#contracts',
  },
  {
    icon: Smartphone,
    title: '2FA protection',
    body: 'Authenticator 2FA on sign-in and every withdrawal, plus an anti-phishing code in our emails.',
    cta: 'Set up 2FA',
    href: '/account/security',
  },
  {
    icon: ShieldCheck,
    title: 'Address whitelisting',
    body: 'Withdraw only to approved addresses. New addresses unlock after a 24-hour cooldown.',
    cta: 'Manage addresses',
    href: '/wallet/whitelist',
  },
  {
    icon: Hash,
    title: 'Chainlink VRF draws',
    body: 'Winners come from verifiable randomness. Admins cannot pick winners or edit results.',
    cta: 'Verify a draw',
    href: ROUTES.provablyFair,
  },
];

const TRUST: { icon: LucideIcon; label: string; demo?: boolean }[] = [
  { icon: Link2, label: 'Chainlink VRF' },
  { icon: Box, label: 'On-chain settlement' },
  { icon: ShieldCheck, label: '2FA & whitelisting' },
  { icon: FileText, label: 'Audits — DEMO placeholder', demo: true },
];

export function SecuritySection() {
  return (
    <HomeSection id="security">
      <SectionHeader
        id="security-title"
        title="Security"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href="/security">Security center</Link>
          </Button>
        }
        subtitle="Your balance, your withdrawals and every draw are protected by controls you can see and check."
      />
      <ul className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:grid tablet:gap-4 tablet:overflow-visible tablet:px-0 tablet:grid-cols-3 laptop:grid-cols-5">
        {SECURITY.map((s) => (
          <li
            key={s.title}
            className={cn(
              card,
              'flex w-[72%] shrink-0 snap-start flex-col gap-3 p-5 pt-6 tablet:w-auto',
            )}
          >
            <span className="mb-1 flex size-12 items-center justify-center rounded-lg bg-brand-tint">
              <s.icon aria-hidden className="size-5 text-icon-brand" />
            </span>
            <h3 className="text-[17px] leading-6 font-semibold text-text-primary">{s.title}</h3>
            <p className="text-body-s text-text-secondary">{s.body}</p>
            <ArrowLink href={s.href} className="mt-auto pt-1">
              {s.cta}
            </ArrowLink>
          </li>
        ))}
      </ul>
      <div className={cn(card, 'flex flex-wrap items-center gap-3 p-4')}>
        {TRUST.map((t) => (
          <span
            key={t.label}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border-default px-3.5 text-label-m text-text-secondary"
          >
            <t.icon aria-hidden className="size-4 text-icon-muted" />
            {t.label}
            {t.demo && <DemoBadge size="xs" />}
          </span>
        ))}
        <span className="flex items-center gap-4 laptop:ml-auto">
          <AgeBadge />
          <Link
            href={ROUTES.responsibleGaming}
            className="inline-flex items-center gap-1.5 text-label-m text-text-brand hover:underline"
          >
            <HeartHandshake aria-hidden className="size-4" /> Responsible gaming
          </Link>
        </span>
      </div>
    </HomeSection>
  );
}
