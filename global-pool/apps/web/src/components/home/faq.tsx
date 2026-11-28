'use client';

import { formatUSDT } from '@gp/shared/money';
import { entryQuote } from '@gp/shared/fees';
import {
  ChevronDown,
  CircleHelp,
  Heart,
  Mail,
  MessageSquare,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Accordion } from 'radix-ui';
import * as React from 'react';

import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ROUTES } from '@/components/shell/nav-config';
import { useNetworks } from '@/lib/data/hooks';
import { cn } from '@/lib/utils';

import { useHomeView } from './home-context';
import { ArrowLink, HomeSection, SectionHeader } from './primitives';

const card = 'rounded-xl border border-border-subtle bg-surface-default';

interface Faq {
  id: string;
  q: string;
  a: React.ReactNode;
}

function useFaqs(): Faq[] {
  const example = entryQuote(35);
  const networks = useNetworks();
  const enabled = (networks.data ?? []).filter((n) => n.enabled).map((n) => n.name);
  return [
    {
      id: 'fee',
      q: 'What does the 0.05 USDT platform fee cover?',
      a: (
        <>
          <p>
            It pays for running each draw — the Chainlink VRF request on Arbitrum — plus
            smart-contract operations, settlement and support. It is charged once per qualifying
            entry, shown as its own line before you confirm, and is never added to the prize pool.
          </p>
          <p className="flex items-start gap-3 rounded-lg bg-surface-raised px-4 py-3 text-body-s text-text-primary">
            <ReceiptText aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
            <span className="flex-1">
              Example: {example.entries} entries → {formatUSDT(example.entryAmount)} to the pool +{' '}
              {formatUSDT(example.platformFee)} platform fee = {formatUSDT(example.total)}
            </span>
            <DemoBadge size="s" />
          </p>
          <span className="flex flex-wrap gap-x-6 gap-y-2">
            <ArrowLink href="/legal/fees">Read the fee schedule</ArrowLink>
            <ArrowLink href={ROUTES.provablyFair}>How draws are verified</ArrowLink>
          </span>
        </>
      ),
    },
    {
      id: 'withdrawals',
      q: 'How long do withdrawals take, and what do they cost?',
      a: (
        <p>
          Most withdrawals are sent within minutes. A first withdrawal to a new address or a flagged
          case goes through a short AML review — usually under 4 hours. GLOBAL POOL charges no
          withdrawal fee (0.00 USDT); you only pay the network fee, shown before you confirm.
          Minimum withdrawal 20.00 USDT{enabled.length ? ` on ${enabled.join(', ')}` : ''}.
        </p>
      ),
    },
    {
      id: 'fairness',
      q: 'How can I check that a draw was fair?',
      a: (
        <p>
          Every Global Pool draw uses Chainlink VRF on Arbitrum — the random words and their proof
          are on-chain, and the contract selects the 13 winning entries from them. Originals publish
          a server-seed hash before you play and reveal the seed afterwards, so you can recompute
          every result in the verifier above.
        </p>
      ),
    },
    {
      id: 'kyc',
      q: 'When do I need to verify my identity (KYC)?',
      a: (
        <p>
          Basic checks (Level 1) are part of sign-up. Full ID and liveness (Level 2) are needed
          before your first withdrawal and for higher limits; enhanced checks with source of funds
          (Level 3) apply only to large volumes. Your documents are used for verification only.
        </p>
      ),
    },
    {
      id: 'region',
      q: 'Why can’t I play from my country?',
      a: (
        <p>
          Real-money games and Global Pool participation need a licence in each jurisdiction. Where
          we are not licensed, entering rounds, deposits and games are blocked. You can always sign
          in, withdraw your balance and close your account. See the list of{' '}
          <Link href="/legal/restricted-countries" className="text-text-brand hover:underline">
            restricted countries
          </Link>
          .
        </p>
      ),
    },
  ];
}

function FaqList() {
  const { restricted } = useHomeView();
  const faqs = useFaqs();
  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue={restricted ? 'region' : 'fee'}
      className="flex flex-col gap-2"
    >
      {faqs.map((f) => (
        <Accordion.Item
          key={f.id}
          value={f.id}
          className={cn(card, 'group/faq overflow-hidden data-[state=open]:border-border-default')}
        >
          <Accordion.Header>
            <Accordion.Trigger className="flex min-h-[72px] w-full items-center gap-3 px-6 text-left text-body-m text-text-primary outline-none hover:bg-surface-hover focus-visible:bg-surface-hover">
              <CircleHelp
                aria-hidden
                className="size-[18px] shrink-0 text-icon-muted group-data-[state=open]/faq:text-icon-brand"
              />
              <span className="flex-1">{f.q}</span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                <ChevronDown
                  aria-hidden
                  className="size-4 text-icon-default transition-transform duration-200 group-data-[state=open]/faq:rotate-180"
                />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <div className="flex flex-col gap-3 px-6 pb-6 pl-14 text-body-m text-text-secondary">
              {f.a}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function SupportCards() {
  return (
    <div className="flex flex-col gap-4">
      <article className={cn(card, 'flex flex-col gap-3 p-6 pb-7')}>
        <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint">
          <MessageSquare aria-hidden className="size-5 text-icon-brand" />
        </span>
        <h3 className="mt-1 text-h5 text-text-primary">Still have a question?</h3>
        <p className="flex items-start gap-2 text-body-s text-text-secondary">
          <span className="flex-1">
            Live support 24/7 in English and Portuguese. Average first reply under 2 minutes.
          </span>
          <DemoBadge size="s" />
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild>
            <Link href={`${ROUTES.support}?chat=1`}>
              <MessageSquare aria-hidden /> Chat with support
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/contact">Email us</Link>
          </Button>
        </div>
      </article>
      <article className={cn(card, 'flex flex-col gap-3 p-6')}>
        <h3 className="flex items-center gap-2 text-h5 text-text-primary">
          <AgeBadge /> Play within your limits
        </h3>
        <p className="text-body-s text-text-secondary">
          Set deposit, loss and time limits, take a break or self-exclude at any time. Lower limits
          apply immediately.
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="secondary" size="s" asChild>
            <Link href={`${ROUTES.responsibleGaming}#limits`}>Set limits</Link>
          </Button>
          <Button variant="ghost" size="s" asChild>
            <Link href={`${ROUTES.responsibleGaming}#break`}>Take a break</Link>
          </Button>
          <Button variant="ghost" size="s" asChild>
            <Link href={`${ROUTES.responsibleGaming}#self-exclusion`}>Self-exclusion</Link>
          </Button>
        </div>
        <p className="text-caption text-text-tertiary">
          Free, confidential help: GamCare · Gamblers Anonymous · BeGambleAware
        </p>
      </article>
    </div>
  );
}

function SeoBlock() {
  const networks = useNetworks();
  const list = networks.data ?? [];
  const enabled = list.filter((n) => n.enabled).map((n) => n.name);
  const soon = list.filter((n) => !n.enabled).map((n) => n.name);
  return (
    <div className="grid gap-10 border-t border-border-subtle pt-10 laptop:grid-cols-[minmax(0,1fr)_360px] laptop:gap-12">
      <div className="flex flex-col gap-3">
        <h2 className="text-h4 text-text-primary">Verifiable global jackpot</h2>
        <p className="text-body-s text-text-secondary">
          GLOBAL POOL runs one global jackpot round at a time. Every entry costs 10.00 USDT and goes
          into the pool in full; a separate 0.05 USDT platform fee per entry is shown before you
          confirm. When the round closes, winners are drawn with Chainlink VRF on Arbitrum and paid
          out on-chain.
        </p>
        <p className="text-body-s text-text-secondary">
          Next to the pool you can play GLOBAL POOL Originals such as Orbit Rush, Vault Sweeper and
          Pool Dice, table games like Pool Roulette and Twenty-One, GP Studios slots and illustrated
          live tables — each with its house edge or RTP published on the game page. Every draw and
          every bet can be checked in the provably-fair verifier.
        </p>
        <p className="text-body-s text-text-secondary">
          Deposits and withdrawals are in USDT on {enabled.join(', ') || 'supported networks'}
          {soon.length ? ` (${soon.join(', ')} coming soon)` : ''}. Only play with money you can
          afford to lose: set deposit, loss and session limits, take a break or self-exclude at any
          time. 18+ only; not available in restricted regions.
        </p>
        <p className="mt-1 flex items-center gap-2 text-caption text-text-tertiary">
          <ShieldCheck aria-hidden className="size-4 shrink-0" />
          Real-money games require an applicable licence and are available only in permitted
          jurisdictions. 18+ only. Play responsibly.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-h4 text-text-primary">Contact &amp; support</h2>
        {[
          {
            icon: Mail,
            label: 'Support',
            value: 'support@globalpool.example',
            href: 'mailto:support@globalpool.example',
            note: 'Live chat and tickets in the Help Centre',
            demo: true,
          },
          {
            icon: ShieldAlert,
            label: 'Security reports',
            value: 'security@globalpool.example',
            href: 'mailto:security@globalpool.example',
            note: 'Responsible disclosure only — no account issues',
            demo: true,
          },
          {
            icon: Heart,
            label: 'Responsible gaming',
            value: 'Set limits or self-exclude',
            href: ROUTES.responsibleGaming,
            note: 'Independent help organisations are listed on the RG page',
            demo: false,
          },
        ].map((c) => (
          <div key={c.label} className="flex gap-3">
            <c.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-muted" />
            <div className="flex min-w-0 flex-col">
              <span className="text-caption text-text-tertiary">{c.label}</span>
              <span className="flex flex-wrap items-center gap-2">
                <a href={c.href} className="text-label-l break-all text-text-brand hover:underline">
                  {c.value}
                </a>
                {c.demo && <DemoBadge size="xs" />}
              </span>
              <span className="text-caption text-text-secondary">{c.note}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** H11 FAQ accordion + support / RG cards + SEO text. */
export function FaqSection() {
  return (
    <HomeSection id="faq" className="gap-6">
      <SectionHeader
        id="faq-title"
        title="Frequently asked questions"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href={ROUTES.support}>Help center</Link>
          </Button>
        }
      />
      <div className="grid items-start gap-4 laptop:grid-cols-[minmax(0,1fr)_400px]">
        <FaqList />
        <SupportCards />
      </div>
      <SeoBlock />
    </HomeSection>
  );
}
