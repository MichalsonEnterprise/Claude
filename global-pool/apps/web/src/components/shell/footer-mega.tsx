import { CHAIN_DISPLAY_ORDER, CHAINS } from '@gp/shared/chains';
import { Box, ChevronDown, ExternalLink, Landmark, Link2, Mail } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ChainMark, TokenMark } from '@/components/brand/chain-mark';
import { Logo } from '@/components/brand/logo';
import { AgeBadge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

import { ROUTES } from './nav-config';
import { LanguageMenu } from './shell-parts';

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: 'Games',
    links: [
      { label: 'Orbit Rush', href: ROUTES.game('orbit-rush') },
      { label: 'Pool Dice', href: ROUTES.game('pool-dice') },
      { label: 'Double Side', href: ROUTES.game('double-side') },
      { label: 'Pool Roulette', href: ROUTES.game('pool-roulette') },
      { label: 'Twenty-One', href: ROUTES.game('twenty-one') },
      { label: 'Slots', href: `${ROUTES.casino}/slots` },
      { label: 'Live casino', href: `${ROUTES.casino}/live` },
      { label: 'All games', href: ROUTES.casino },
    ],
  },
  {
    title: 'Global Pool',
    links: [
      { label: 'Current round', href: ROUTES.pool },
      { label: 'How it works', href: `${ROUTES.pool}/how-it-works` },
      { label: 'Past rounds', href: `${ROUTES.pool}/rounds` },
      { label: 'Winners', href: ROUTES.winners },
      { label: 'Draw verification (VRF)', href: ROUTES.provablyFair },
      { label: 'Refunds', href: `${ROUTES.pool}/refunds` },
    ],
  },
  {
    title: 'Promo',
    links: [
      { label: 'Promotions', href: ROUTES.promotions },
      { label: 'VIP Club', href: ROUTES.vip },
      { label: 'Affiliates', href: ROUTES.affiliates },
    ],
  },
  {
    title: 'Support / Legal',
    links: [
      { label: 'Help centre', href: ROUTES.support },
      { label: 'Fairness', href: ROUTES.provablyFair },
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Responsible gaming', href: ROUTES.responsibleGaming },
      { label: 'AML / KYC policy', href: '/legal/aml-kyc' },
      { label: 'Restricted countries', href: '/legal/restricted-countries' },
      { label: 'Cookie settings', href: '/legal/cookies' },
    ],
  },
  {
    title: 'About us',
    links: [
      { label: 'About GLOBAL POOL', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Official channels', href: '/official-channels' },
      { label: 'Status page', href: '/status' },
    ],
  },
];

/** Independent help organisations (real resources — no DEMO marker). */
const HELP_ORGS = [
  { label: 'GamCare', href: 'https://www.gamcare.org.uk' },
  { label: 'Gamblers Anonymous', href: 'https://www.gamblersanonymous.org' },
  { label: 'BeGambleAware', href: 'https://www.begambleaware.org' },
  { label: 'National Council on Problem Gambling', href: 'https://www.ncpgambling.org' },
];

const COMMUNITY = ['X', 'Tg', 'Dc', 'Yt'];

function LinkColumn({ col }: { col: FooterColumn }) {
  return (
    <>
      {/* ≥768: open column */}
      <div className="hidden flex-col gap-3 tablet:flex">
        <h2 className="text-label-m text-text-primary">{col.title}</h2>
        <ul className="flex flex-col gap-2.5">
          {col.links.map((l) => (
            <li key={l.label}>
              <Link href={l.href} className="text-body-s text-text-secondary hover:text-text-primary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* <768: accordion */}
      <details className="group border-b border-border-subtle tablet:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-label-m text-text-primary [&::-webkit-details-marker]:hidden">
          {col.title}
          <ChevronDown aria-hidden className="size-4 text-icon-muted transition-transform group-open:rotate-180" />
        </summary>
        <ul className="flex flex-col pb-3">
          {col.links.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="flex min-h-11 items-center text-body-s text-text-secondary hover:text-text-primary"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

function TrustPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border-default px-3 py-1.5 text-caption text-text-secondary [&_svg]:size-4 [&_svg]:text-icon-muted">
      {icon}
      {children}
    </span>
  );
}

/** Shell/Footer Mega (Desktop 1440 / Mobile 390, link columns become accordions). */
export function FooterMega({ className }: { className?: string }) {
  return (
    <footer
      className={cn('border-t border-border-subtle bg-bg-secondary px-4 pt-10 pb-8 tablet:px-6 laptop:px-8', className)}
    >
      <div className="mx-auto flex w-full max-w-desktop flex-col gap-10">
        <div className="grid gap-8 laptop:grid-cols-[minmax(0,1fr)_400px] laptop:gap-16">
          <div className="flex flex-col gap-4">
            <Logo height={34} />
            <p className="max-w-[660px] text-body-s text-text-secondary">
              GLOBAL POOL is a verifiable global jackpot and crypto gaming platform. One shared pool runs in rounds with
              published rules, and every draw is settled on-chain with Chainlink VRF on Arbitrum — entries, fees and
              payouts can be checked against the contract. GLOBAL POOL Originals publish their house edge and use
              provably fair seeds you can verify after every round.
            </p>
            <p className="max-w-[660px] text-body-s text-text-secondary">
              Entries cost 10.00 USDT plus a 0.05 USDT platform fee per qualifying entry; platform fees are never added
              to the pool. Play only with money you can afford to lose.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-h5">Help us improve</h2>
            <p className="text-body-s text-text-secondary">
              Tell us what to fix or build next — we read every message.
            </p>
            <p className="flex items-center gap-2 text-body-s text-text-secondary">
              <Mail aria-hidden className="size-4 text-icon-muted" /> Feedback:
              <a href="mailto:feedback@example.com" className="text-text-brand hover:underline">
                feedback@example.com
              </a>
            </p>
            <p className="text-body-s text-text-secondary">
              Found a vulnerability? Security reports only — we follow coordinated disclosure and never ask for your keys
              or seed phrase.
            </p>
            <p className="flex items-center gap-2 text-body-s text-text-secondary">
              <Mail aria-hidden className="size-4 text-icon-muted" /> Security:
              <a href="mailto:security@example.com" className="text-text-brand hover:underline">
                security@example.com
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-overline uppercase text-text-tertiary">Trust &amp; fairness</span>
          <TrustPill icon={<Link2 aria-hidden />}>Chainlink VRF · Arbitrum</TrustPill>
          <TrustPill icon={<Box aria-hidden />}>Smart contracts audited — DEMO placeholder</TrustPill>
          <TrustPill icon={<Landmark aria-hidden />}>Licensed operator — DEMO placeholder</TrustPill>
        </div>

        <section aria-labelledby="footer-rg" className="flex flex-col gap-3">
          <h2 id="footer-rg" className="flex items-center gap-3 text-h5">
            <AgeBadge /> Responsible gaming
          </h2>
          <p className="text-body-s text-text-secondary">
            Gambling can be harmful. Set deposit, loss and session limits, take a break or self-exclude at any time from{' '}
            <Link href={ROUTES.responsibleGaming} className="text-text-brand hover:underline">
              Responsible gaming
            </Link>{' '}
            — no questions asked. Free, confidential help:
          </p>
          <ul className="flex flex-wrap gap-2">
            {HELP_ORGS.map((o) => (
              <li key={o.label}>
                <a
                  href={o.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-default px-3 text-caption text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  {o.label}
                  <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid border-t border-border-subtle pt-8 tablet:grid-cols-3 tablet:gap-8 laptop:grid-cols-6">
          {COLUMNS.map((col) => (
            <LinkColumn key={col.title} col={col} />
          ))}
          <div className="mt-6 flex flex-col gap-3 tablet:mt-0">
            <h2 className="text-label-m text-text-primary">Community</h2>
            <ul className="flex gap-2">
              {COMMUNITY.map((c) => (
                <li key={c}>
                  <span
                    className="flex size-10 items-center justify-center rounded-md border border-border-default bg-surface-default text-caption text-text-secondary"
                    title="Official channel — placeholder"
                  >
                    {c}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-caption text-text-tertiary">
              Official channels only. We never DM first or ask for keys.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 laptop:flex-row laptop:items-center laptop:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-overline uppercase text-text-tertiary">Supported networks</span>
            {CHAIN_DISPLAY_ORDER.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
                <ChainMark chain={key} size={18} />
                {CHAINS[key].name}
                {!CHAINS[key].enabled && <span className="text-text-tertiary">(soon)</span>}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
              <TokenMark size={18} /> USDT
            </span>
          </div>
          <LanguageMenu className="w-full tablet:w-60" />
        </div>

        <div className="flex flex-col gap-4 border-t border-border-subtle pt-6">
          <p className="text-caption text-text-tertiary">
            Licence &amp; jurisdiction. GLOBAL POOL is operated by [Operator Ltd — DEMO placeholder] under gaming licence
            [No. 0000/DEMO — placeholder] issued by [Regulator — DEMO placeholder]. Real-money games and Global Pool
            participation are offered only in permitted jurisdictions and only to people aged 18 or over (or the higher
            legal age where you live). Access from restricted countries is blocked — see Restricted countries. Outcomes
            are determined by verifiable randomness and you can lose your stake.
          </p>
          <DemoBadge size="s" className="w-fit" />
          <p className="flex items-center gap-3 text-caption text-text-tertiary">
            <AgeBadge /> © 2026 GLOBAL POOL. All rights reserved. DEMO / testnet build — no real money.
          </p>
        </div>
      </div>
    </footer>
  );
}
