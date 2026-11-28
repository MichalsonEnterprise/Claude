'use client';

import { formatCount } from '@gp/shared/format';
import { PLATFORM_FEE_PER_ENTRY } from '@gp/shared/fees';
import { formatUSDT, mul, percentOf } from '@gp/shared/money';
import { ArrowRight, Crown, Info } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/components/shell/nav-config';
import { useVipTiers } from '@/lib/data/hooks';
import type { VipTierView } from '@/lib/data/types';
import { cn } from '@/lib/utils';

import { AffiliateArt, ChipStackArt, CrownArt } from './art';
import { useHomeView, viewerIsDemoPlayer } from './home-context';
import { HomeSection, SectionHeader } from './primitives';

const card = 'rounded-xl border border-border-subtle bg-surface-default';

function PromoBlock({
  art,
  overline,
  title,
  body,
  actions,
  tone = 'gold',
}: {
  art: React.ReactNode;
  overline: string;
  title: string;
  body: React.ReactNode;
  actions: React.ReactNode;
  tone?: 'gold' | 'brand';
}) {
  return (
    <article className={cn(card, 'flex items-start gap-4 p-4 tablet:items-center tablet:gap-5')}>
      {art}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p
          className={cn(
            'flex items-center gap-2 text-overline tracking-[0.08em] uppercase',
            tone === 'gold' ? 'text-text-gold' : 'text-text-brand',
          )}
        >
          {overline} <DemoBadge size="xs" />
        </p>
        <h3 className="text-h4 text-text-primary">{title}</h3>
        <p className="text-body-s text-text-secondary">{body}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">{actions}</div>
      </div>
    </article>
  );
}

// ── H9 VIP ──────────────────────────────────────────────────────────────────────────────────────

const TIER_STYLE: Record<VipTierView['tier'], { bar: string; text: string; pill: string }> = {
  bronze: {
    bar: 'bg-tier-bronze',
    text: 'text-vip-bronze',
    pill: 'border-vip-bronze/70 bg-vip-bronze/10',
  },
  silver: {
    bar: 'bg-tier-silver',
    text: 'text-vip-silver',
    pill: 'border-vip-silver/70 bg-vip-silver/10',
  },
  gold: { bar: 'bg-gold', text: 'text-vip-gold', pill: 'border-gold/70 bg-gold-tint' },
  platinum: {
    bar: 'bg-tier-platinum',
    text: 'text-vip-platinum',
    pill: 'border-vip-platinum/70 bg-vip-platinum/10',
  },
  diamond: {
    bar: 'bg-tier-diamond',
    text: 'text-vip-diamond',
    pill: 'border-vip-diamond/70 bg-vip-diamond/10',
  },
};

function TierCard({ t, current }: { t: VipTierView; current: boolean }) {
  const st = TIER_STYLE[t.tier];
  return (
    <li
      className={cn(
        card,
        'relative flex w-[64%] shrink-0 snap-start flex-col gap-2 overflow-hidden px-4 pt-6 pb-4 tablet:w-auto',
        current && 'border-border-gold',
      )}
    >
      <span aria-hidden className={cn('absolute top-0 right-4 left-4 h-1 rounded-b-sm', st.bar)} />
      <div className="flex items-center gap-2">
        <Crown aria-hidden className={cn('size-4', st.text)} />
        <span
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-label-m',
            st.pill,
            st.text,
          )}
        >
          <Crown aria-hidden className="size-3.5" />
          {t.name}
        </span>
        <span className="ml-auto text-caption text-text-tertiary">Tier {t.index}</span>
      </div>
      <p className="mt-1 text-label-l text-text-primary">From {formatCount(t.minPoints)} pts</p>
      <p className="text-caption text-text-secondary">{t.perk}</p>
      {current && <p className="text-caption text-text-gold">You’re here · 12,840 pts</p>}
    </li>
  );
}

export function VipSection() {
  const { restricted, viewer } = useHomeView();
  const tiers = useVipTiers();
  if (restricted) return null;
  return (
    <HomeSection id="vip">
      <SectionHeader
        id="vip-title"
        title="VIP Club"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href={ROUTES.vip}>See all tiers</Link>
          </Button>
        }
      />
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,556fr)_minmax(0,564fr)]">
        <PromoBlock
          art={
            <span className="flex size-20 shrink-0 tablet:size-32 items-center justify-center rounded-lg bg-[linear-gradient(180deg,var(--color-gold-400)_0%,var(--color-gold-600)_60%,var(--color-gold-900)_100%)]">
              <CrownArt className="w-[64px] tablet:w-[104px]" />
            </span>
          }
          overline="VIP Club"
          title="Weekly reward up to 0.5% of entries"
          body="Paid weekly in USDT. Your rate depends on your tier — see the full table on the VIP page."
          actions={
            <Button variant="secondary" size="s" asChild>
              <Link href={ROUTES.vip}>
                See VIP tiers <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
        <PromoBlock
          art={
            <span className="relative flex size-20 shrink-0 tablet:size-32 overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--color-ink-600)_0%,var(--color-ink-600)_50%,var(--color-ink-750)_50%)]">
              <ChipStackArt className="absolute inset-2" />
            </span>
          }
          overline="Level-up rewards"
          title="29 levels, a reward at each one"
          body="Every level-up pays a one-off USDT reward to Available — no wagering. Rakeback: 5% of house edge back, claim any time."
          actions={
            <>
              <Button variant="secondary" size="s" asChild>
                <Link href={`${ROUTES.vip}#levels`}>How levels work</Link>
              </Button>
              <span className="text-caption text-text-tertiary">Terms apply</span>
            </>
          }
        />
      </div>
      <ul className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:grid tablet:gap-4 tablet:overflow-visible tablet:px-0 tablet:grid-cols-3 laptop:grid-cols-5">
        {tiers.data
          ? tiers.data.map((t) => (
              <TierCard
                key={t.tier}
                t={t}
                current={viewerIsDemoPlayer(viewer) && t.tier === 'gold'}
              />
            ))
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[64%] shrink-0 tablet:w-auto">
                <Skeleton className="h-36 rounded-xl" />
              </li>
            ))}
      </ul>
      <p className="flex items-start gap-2 text-caption text-text-secondary">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
        VIP status never changes odds or outcomes. Weekly and level-up rewards are paid in USDT to
        Available, with key terms shown before you claim. Terms apply · 18+
      </p>
    </HomeSection>
  );
}

// ── H10 Affiliate ───────────────────────────────────────────────────────────────────────────────

/** Referral commission = 20% of the 0.05 USDT platform fee on referred players' qualifying entries. */
export const AFFILIATE_RATE_PERCENT = '20';

const clampInt = (raw: string, max: number) => {
  const n = Number.parseInt(raw.replace(/\D/g, '').slice(0, 7), 10);
  return Number.isFinite(n) ? Math.min(n, max) : 0;
};

export function affiliateEstimate(players: number, entriesPerPlayer: number) {
  const fees = mul(mul(PLATFORM_FEE_PER_ENTRY, players), entriesPerPlayer);
  return { fees: fees.toFixed(2), commission: percentOf(fees, AFFILIATE_RATE_PERCENT).toFixed(2) };
}

function Calculator() {
  const [players, setPlayers] = React.useState('40');
  const [entries, setEntries] = React.useState('120');
  const p = clampInt(players, 100_000);
  const e = clampInt(entries, 10_000);
  const est = affiliateEstimate(p, e);
  const input =
    'h-12 w-full rounded-md border border-border-default bg-surface-raised px-4 text-body-m text-text-primary tabular-nums outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/30';
  return (
    <article className={cn(card, 'flex flex-col gap-4 p-5 tablet:p-6')}>
      <header className="flex items-center gap-2">
        <h3 className="text-h5 text-text-primary">Commission calculator</h3>
        <span className="text-caption text-text-tertiary">Preview</span>
        <DemoBadge size="s" className="ml-auto" />
      </header>
      <div className="grid gap-3 tablet:grid-cols-2">
        <label className="flex flex-col gap-2 text-label-m text-text-primary">
          Referred active players
          <input
            inputMode="numeric"
            value={players}
            onChange={(ev) => setPlayers(ev.target.value.replace(/\D/g, '').slice(0, 6))}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-2 text-label-m text-text-primary">
          Entries per player / month
          <input
            inputMode="numeric"
            value={entries}
            onChange={(ev) => setEntries(ev.target.value.replace(/\D/g, '').slice(0, 5))}
            className={input}
          />
        </label>
      </div>
      <dl className="flex flex-col gap-2 text-body-s">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-text-secondary">Platform fees generated</dt>
          <dd className="text-label-m text-text-primary tabular-nums">
            {formatCount(p)} × {formatCount(e)} × {PLATFORM_FEE_PER_ENTRY} = {formatUSDT(est.fees)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-text-secondary">Your commission rate</dt>
          <dd className="text-label-m text-text-primary">{AFFILIATE_RATE_PERCENT}%</dd>
        </div>
      </dl>
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle px-4 py-4"
        aria-live="polite"
      >
        <div>
          <p className="text-body-s text-text-primary">Estimated monthly commission</p>
          <p className="text-caption text-text-tertiary">Illustrative only — not a guarantee</p>
        </div>
        <p className="text-number-l text-text-brand tabular-nums">{formatUSDT(est.commission)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href={ROUTES.affiliates}>Become an affiliate</Link>
        </Button>
        <p className="max-w-[340px] text-caption text-text-tertiary">
          Paid on platform fees only — never on player losses. Terms apply.
        </p>
      </div>
    </article>
  );
}

export function AffiliateSection() {
  const { restricted } = useHomeView();
  if (restricted) return null;
  return (
    <HomeSection id="affiliates">
      <SectionHeader
        id="affiliates-title"
        title="Affiliate program"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href={`${ROUTES.affiliates}#terms`}>Affiliate terms</Link>
          </Button>
        }
      />
      <div className="grid items-start gap-4 laptop:grid-cols-[minmax(0,536fr)_minmax(0,584fr)]">
        <div className="flex flex-col gap-4">
          <PromoBlock
            tone="brand"
            art={
              <span className="flex size-20 shrink-0 tablet:size-32 items-center justify-center rounded-lg bg-gradient-tile-mint">
                <AffiliateArt className="w-[70px] tablet:w-[112px]" />
              </span>
            }
            overline="Affiliates"
            title="Earn 20% of platform fees"
            body="You receive 20% of the 0.05 USDT fee on entries made by players you refer. Paid in USDT."
            actions={
              <Button variant="secondary" size="s" asChild>
                <Link href={ROUTES.affiliates}>
                  Become an affiliate <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          />
          <dl className={cn(card, 'grid grid-cols-1 gap-4 p-5 min-[480px]:grid-cols-3')}>
            {[
              ['Commission', '20%', 'of platform fees'],
              ['Tracking', '12 months', 'from the referred sign-up'],
              ['Payout', 'In USDT', 'min 20.00 · KYC L2 + 2FA'],
            ].map(([k, v, note]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt className="text-overline tracking-[0.08em] text-text-tertiary uppercase">
                  {k}
                </dt>
                <dd className="text-h4 text-text-primary">{v}</dd>
                <dd className="text-caption text-text-secondary">{note}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Calculator />
      </div>
    </HomeSection>
  );
}
