'use client';

import {
  formatDateTimeUTC,
  formatRoundNumber,
  formatCount,
  formatTimeUTC,
} from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import { displayOddsPercent } from '@gp/shared/pool';
import {
  Ban,
  BellRing,
  Globe2,
  HeartHandshake,
  Lock,
  Pause,
  Play,
  Ticket,
  Timer,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GameArt } from '@/components/brand/game-art';
import { Countdown } from '@/components/domain/countdown';
import { JackpotMeter } from '@/components/domain/jackpot-meter';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { toast } from '@/components/ui/sonner';
import { ROUTES } from '@/components/shell/nav-config';
import type { RoundView } from '@/lib/data/types';
import { cn } from '@/lib/utils';

import {
  ChipArt,
  CoinStack,
  CrownArt,
  EntryTicket,
  PoolCoin,
  ShieldCheckArt,
  TicketGlyph,
} from './art';
import { useHomeView, viewerIsDemoPlayer } from './home-context';
import { ArrowLink, GoldText } from './primitives';

// ── hero slides ─────────────────────────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  label: string;
  content: React.ReactNode;
}

/** Gold banner background: warm gold base, a dark legibility shade on the left, angled light/mint blocks. */
function GoldBannerBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-gold-400)_0%,var(--color-gold-600)_55%,var(--color-gold-900)_100%)]" />
      {/* angled light bands */}
      <div className="absolute inset-y-0 left-[38%] w-[22%] -skew-x-[28deg] bg-ink-50/[0.07]" />
      <div className="absolute inset-y-0 left-[63%] w-[9%] -skew-x-[28deg] bg-ink-50/[0.06]" />
      {/* mint block behind the tickets */}
      <div className="absolute top-[34%] right-[-6%] bottom-[-10%] w-[24%] -skew-x-[22deg] bg-brand/30" />
      {/* left legibility shade */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-ink-950)_88%,transparent)_0%,color-mix(in_srgb,var(--color-ink-950)_86%,transparent)_38%,transparent_72%)] max-tablet:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-ink-950)_88%,transparent)_0%,color-mix(in_srgb,var(--color-ink-950)_80%,transparent)_55%,transparent_100%)]" />
    </div>
  );
}

function PoolHeroArt() {
  const { snapshot } = useHomeView();
  const settled = !snapshot.current;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-0 bottom-0 h-full w-[52%] max-tablet:top-auto max-tablet:h-[190px] max-tablet:w-full"
    >
      <EntryTicket
        entryId="E-1248-00981"
        roundLabel="Round #1,248"
        settled={settled}
        className="absolute top-[27%] left-[41%] origin-left -rotate-[12deg] max-tablet:top-[16%] max-tablet:left-[30%] max-tablet:scale-[0.72]"
      />
      <EntryTicket
        entryId="E-1248-00982"
        roundLabel="Round #1,248"
        settled={settled}
        className="absolute top-[55%] left-[51%] origin-left -rotate-[9deg] max-tablet:top-[48%] max-tablet:left-[40%] max-tablet:scale-[0.72]"
      />
      <CoinStack
        count={9}
        className="absolute bottom-[-8%] left-[41%] w-[100px] max-tablet:left-[8%] max-tablet:w-[84px]"
      />
      <CoinStack
        count={5}
        className="absolute bottom-[-6%] left-[65%] w-[86px] max-tablet:left-[30%] max-tablet:w-[70px]"
      />
    </div>
  );
}

function SlideBody({
  overline,
  amount,
  amountNote,
  headline,
  meta,
  member,
  actions,
  fine,
}: {
  overline: React.ReactNode;
  amount: React.ReactNode;
  amountNote?: React.ReactNode;
  headline: React.ReactNode;
  meta: React.ReactNode;
  member?: React.ReactNode;
  actions: React.ReactNode;
  fine: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex h-full flex-col gap-0 px-5 pt-6 pb-[200px] tablet:max-w-[74%] tablet:px-8 tablet:pt-7 tablet:pb-9 laptop:px-12">
      <p className="flex flex-wrap items-center gap-2 text-overline tracking-[0.08em] text-text-secondary uppercase">
        {overline}
      </p>
      <p className="mt-2.5 flex items-baseline gap-2 text-[length:min(48px,9cqi)] leading-[1.15] font-semibold tracking-[-0.02em] tabular-nums tablet:text-[length:min(48px,6.6cqi)]">
        {amount}
        {amountNote}
      </p>
      <h1
        id="hero-title"
        className="mt-1 text-[length:min(24px,6cqi)] leading-[1.33] font-semibold text-text-primary tablet:text-h3"
      >
        {headline}
      </h1>
      <p className="mt-3 text-body-s text-text-secondary tablet:text-body-m">{meta}</p>
      {member}
      <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>
      <p className="mt-3 text-caption text-text-secondary">{fine}</p>
    </div>
  );
}

function PoolSlide() {
  const { snapshot, viewer, restricted, myEntries, countryName } = useHomeView();
  const round = snapshot.current;
  const last = snapshot.last;
  const demo = snapshot.isDemo ? <DemoBadge size="s" /> : null;
  const fine = 'Entry 10.00 + fee 0.05 USDT · 18+ · You can lose your stake · Terms apply';

  if (!round) {
    return (
      <SlideBody
        overline={
          <>
            <Ticket aria-hidden className="size-4 text-icon-gold" />
            Global Pool · Round {formatRoundNumber(last.number)} {statusWord(last.status)} {demo}
          </>
        }
        amount={<GoldText>{formatUSDT(last.poolBalance ?? '0')}</GoldText>}
        headline={
          <>
            One global pool.
            <br />
            Every entry verifiable.
          </>
        }
        meta={
          <>
            {lastRoundCaption(last)} · Round {formatRoundNumber(snapshot.next.number)} opens{' '}
            <time dateTime={snapshot.next.opensAt}>{formatDateTimeUTC(snapshot.next.opensAt)}</time>
          </>
        }
        actions={
          <>
            <Button variant="gold" size="l" asChild>
              <Link href={`${ROUTES.pool}/rounds/${last.number}`}>
                <TicketGlyph className="size-5" /> See results
              </Link>
            </Button>
            <Button variant="ghost" size="l" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
          </>
        }
        fine={fine}
      />
    );
  }

  return (
    <SlideBody
      overline={
        <>
          <Ticket aria-hidden className="size-4 text-icon-gold" />
          Global Pool · Round {formatRoundNumber(round.number)} {demo}
        </>
      }
      amount={<GoldText>{formatUSDT(round.poolBalance ?? '0')}</GoldText>}
      headline={
        <>
          One global pool.
          <br />
          Every entry verifiable.
        </>
      }
      meta={
        <>
          Closes <time dateTime={round.closesAt}>{formatDateTimeUTC(round.closesAt)}</time> ·{' '}
          {formatCount(round.participants ?? 0)} participants
        </>
      }
      member={
        viewer === 'member' && myEntries && !restricted ? (
          <p className="mt-3 inline-flex w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border tablet:rounded-full border-border-brand bg-brand-tint px-3 py-1 text-label-s text-text-brand">
            <Ticket aria-hidden className="size-3.5" />
            Your {myEntries.entries} entries · {formatUSDT(myEntries.total)}
            <span className="text-text-secondary">
              · ≈{displayOddsPercent(myEntries.odds.anyPrizeApproxPercent)}% chance of any prize
            </span>
            {myEntries.isDemo && <DemoBadge size="xs" />}
          </p>
        ) : null
      }
      actions={
        restricted ? (
          <>
            <Button variant="gold" size="l" disabled leadingIcon={<Lock aria-hidden />}>
              Participate
            </Button>
            <Button variant="ghost" size="l" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
            <p className="basis-full text-label-s text-text-warning">
              Not available in your region{countryName ? ` (${countryName})` : ''}.
            </p>
          </>
        ) : (
          <>
            <Button variant="gold" size="l" asChild>
              <Link href={ROUTES.pool}>
                <TicketGlyph className="size-5" />
                {viewer === 'member' ? 'Add entries' : 'Participate'}
              </Link>
            </Button>
            <Button variant="ghost" size="l" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
          </>
        )
      }
      fine={fine}
    />
  );
}

function statusWord(status: string) {
  return status === 'cancelled' ? 'cancelled' : status === 'settled' ? 'settled' : status;
}

/** What happened to the last round, from its real status (never a refund claim for a round that was not cancelled). */
export function lastRoundCaption(last: Pick<RoundView, 'status' | 'winners' | 'draw'>): string {
  switch (last.status) {
    case 'settled': {
      const settledAt = last.draw?.settledAt ?? null;
      return `Paid to ${last.winners.length} winners${settledAt ? ` · settled ${formatTimeUTC(settledAt)}` : ''}`;
    }
    case 'cancelled':
      return 'Round cancelled — every entry refunded to Owed';
    case 'drawing':
      return 'Drawing winners with Chainlink VRF';
    case 'closed':
      return 'Entries closed — the draw starts shortly';
    case 'open':
    case 'scheduled':
      return 'No round has been drawn yet';
  }
}

function TournamentSlide() {
  return (
    <SlideBody
      overline={
        <>
          Weekly tournament · Orbit Rush Sprint <DemoBadge size="s" />
        </>
      }
      amount={<GoldText>{formatUSDT('2500.00')}</GoldText>}
      amountNote={<span className="sr-only">prize pool</span>}
      headline={
        <>
          Climb the leaderboard.
          <br />
          The top 20 share the prize pool.
        </>
      }
      meta={
        <>
          Ends <time dateTime="2026-11-29T23:59:00Z">Sun 29 Nov 2026, 23:59 UTC</time> · 1 point per
          1.00 USDT wagered
        </>
      }
      actions={
        <>
          <Button size="l" asChild>
            <Link href={`${ROUTES.promotions}#other-promotions`}>See leaderboard</Link>
          </Button>
          <Button variant="ghost" size="l" asChild>
            <Link href={`${ROUTES.promotions}#other-promotions`}>Rules</Link>
          </Button>
        </>
      }
      fine="1st 1,000.00 · 2nd 500.00 · 3rd 250.00 · 4th–10th 75.00 · 11th–20th 22.50 USDT · 18+ · Terms apply"
    />
  );
}

function DailySlide() {
  return (
    <SlideBody
      overline={
        <>
          Daily rewards · 7-day streak <DemoBadge size="s" />
        </>
      }
      amount={<GoldText>{formatUSDT('13.75')}</GoldText>}
      amountNote={<span className="sr-only">over 7 days</span>}
      headline={
        <>
          Sign in daily.
          <br />
          Your streak adds up.
        </>
      }
      meta="Day 1 0.50 · Day 4 1.50 · Day 7 5.00 USDT in bonus funds · resets 00:00 UTC"
      actions={
        <Button size="l" asChild>
          <Link href={`${ROUTES.promotions}#other-promotions`}>See rewards</Link>
        </Button>
      }
      fine="Bonus funds · wagering applies · Global Pool contribution 0% · 18+ · Terms apply"
    />
  );
}

function SlideArt({ id }: { id: string }) {
  if (id === 'pool') return <PoolHeroArt />;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-[2%] bottom-0 h-full w-[44%] max-tablet:h-[190px] max-tablet:w-full"
    >
      {id === 'tournament' ? (
        <GameArt
          game="orbit-rush"
          className="absolute right-[6%] bottom-[6%] w-[min(300px,90%)] max-tablet:right-[18%] max-tablet:w-[180px]"
        />
      ) : (
        <>
          <CoinStack
            count={7}
            className="absolute bottom-[-4%] left-[12%] w-[110px] max-tablet:w-[80px]"
          />
          <ChipArt
            value="7"
            tone="mint"
            className="absolute top-[18%] left-[46%] w-[96px] max-tablet:top-[8%] max-tablet:w-[72px]"
          />
          <ChipArt
            value="1"
            tone="violet"
            className="absolute top-[44%] left-[66%] w-[76px] max-tablet:w-[60px]"
          />
        </>
      )}
    </div>
  );
}

/** Banner/Hero Carousel: Global Pool slide first; promotion slides are hidden in restricted regions. */
function HeroCarousel() {
  const { restricted } = useHomeView();
  const slides: Slide[] = React.useMemo(
    () => [
      { id: 'pool', label: 'Global Pool', content: <PoolSlide /> },
      ...(restricted
        ? []
        : [
            { id: 'tournament', label: 'Orbit Rush Sprint', content: <TournamentSlide /> },
            { id: 'daily', label: 'Daily rewards', content: <DailySlide /> },
          ]),
    ],
    [restricted],
  );
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const reduced = React.useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
  const auto = playing && !hovered && !reduced && slides.length > 1;

  React.useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), 9000);
    return () => window.clearTimeout(id);
  }, [auto, index, slides.length]);

  const active = slides[Math.min(index, slides.length - 1)] ?? slides[0]!;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="@container relative isolate min-h-[344px] overflow-hidden rounded-xl border border-border-subtle bg-surface-default max-tablet:min-h-[520px]"
    >
      <GoldBannerBackdrop />
      <SlideArt id={active.id} />
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`${slides.indexOf(active) + 1} of ${slides.length}: ${active.label}`}
        className="relative h-full"
      >
        {active.content}
      </div>
      {slides.length > 1 && (
        <div className="absolute top-4 right-4 z-20 flex h-10 items-center gap-1 rounded-full bg-ink-950/60 pr-1 pl-3 backdrop-blur-sm max-tablet:top-auto max-tablet:right-3 max-tablet:bottom-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}: ${s.label}`}
              aria-current={s.id === active.id ? 'true' : undefined}
              className="flex h-8 items-center px-1"
            >
              <span
                className={cn(
                  'block h-2 rounded-full transition-all duration-200',
                  s.id === active.id ? 'w-6 bg-brand' : 'w-2 bg-ink-500 hover:bg-ink-400',
                )}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            className="ml-1 flex size-8 items-center justify-center rounded-full text-icon-default hover:bg-surface-hover"
          >
            {playing ? (
              <Pause aria-hidden className="size-4 fill-current" />
            ) : (
              <Play aria-hidden className="size-4 fill-current" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── side promos ─────────────────────────────────────────────────────────────────────────────────

function PromoCard({
  overline,
  title,
  link,
  art,
  className,
  demo = true,
  extra,
}: {
  overline: React.ReactNode;
  title: React.ReactNode;
  link: React.ReactNode;
  art: React.ReactNode;
  className?: string;
  demo?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        'relative isolate flex min-h-[152px] w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border-subtle p-4 tablet:w-auto',
        className,
      )}
    >
      <div aria-hidden className="absolute top-0 right-0 bottom-0 -z-10 w-[52%]">
        {art}
      </div>
      <p className="flex items-center gap-2 text-overline tracking-[0.08em] uppercase">
        {overline}
      </p>
      <h3 className="mt-1.5 max-w-[62%] text-label-l leading-[1.3] text-text-primary">{title}</h3>
      {extra}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        {link}
        {demo && <DemoBadge size="s" />}
      </div>
    </article>
  );
}

function PromoRow() {
  const { restricted, viewer, countryName } = useHomeView();
  if (restricted) {
    const cards = [
      {
        icon: Wallet,
        title: 'Your funds stay yours',
        body: 'Sign in to view your balance and withdraw at any time — withdrawals are never blocked.',
        href: viewer === 'member' ? ROUTES.wallet : ROUTES.wallet,
        cta: viewer === 'member' ? 'Withdraw funds' : 'Sign in to withdraw',
      },
      {
        icon: HeartHandshake,
        title: 'Close account or self-exclude',
        body: 'Available from Responsible gaming in every region, no questions asked.',
        href: ROUTES.responsibleGaming,
        cta: 'Responsible gaming',
      },
      {
        icon: Globe2,
        title: 'Why is it unavailable?',
        body: `Real-money games need a licence where you are${countryName ? ` (${countryName})` : ''}. See the list of restricted countries.`,
        href: '/legal/restricted-countries',
        cta: 'Restricted countries',
      },
    ];
    return (
      <div className="grid gap-3 tablet:grid-cols-3 tablet:gap-4">
        {cards.map((c) => (
          <article
            key={c.title}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-default p-4"
          >
            <c.icon aria-hidden className="size-5 text-icon-muted" />
            <h3 className="text-label-l text-text-primary">{c.title}</h3>
            <p className="text-caption text-text-secondary">{c.body}</p>
            <ArrowLink href={c.href} className="mt-auto pt-1">
              {c.cta}
            </ArrowLink>
          </article>
        ))}
      </div>
    );
  }
  return (
    <div className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 tablet:mx-0 tablet:grid tablet:grid-cols-3 tablet:gap-4 tablet:overflow-visible tablet:px-0">
      <PromoCard
        className="bg-[linear-gradient(100deg,var(--color-sky-950)_0%,var(--color-sky-950)_35%,color-mix(in_srgb,var(--color-sky-500)_70%,var(--color-sky-950))_100%)]"
        overline={<span className="text-text-secondary">Provably fair</span>}
        title="Verify any draw yourself"
        link={<ArrowLink href={ROUTES.provablyFair}>Verify a draw</ArrowLink>}
        art={<ShieldCheckArt className="absolute top-2 right-3 w-[104px]" />}
      />
      <PromoCard
        className="bg-[linear-gradient(100deg,var(--color-violet-950)_0%,var(--color-violet-950)_35%,var(--color-violet-700)_100%)]"
        overline={<span className="text-text-secondary">VIP Club</span>}
        title="Weekly reward up to 0.5%"
        link={<ArrowLink href={ROUTES.vip}>See VIP tiers</ArrowLink>}
        art={<CrownArt className="absolute top-5 right-2 w-[112px]" />}
      />
      {viewer === 'member' && !viewerIsDemoPlayer(viewer) ? (
        // API data source: rakeback is not live, so no amount is shown as this member's (R37 / Q02).
        <PromoCard
          className="bg-surface-default"
          demo={false}
          overline={<span className="text-text-brand">Rakeback</span>}
          title="Rakeback isn’t live in this build yet"
          extra={
            <p className="mt-1 text-caption text-text-secondary">
              5% of house edge back · nothing to claim yet
            </p>
          }
          link={<ArrowLink href={ROUTES.vip}>See VIP tiers</ArrowLink>}
          art={<WelcomeArt />}
        />
      ) : viewer === 'member' ? (
        <PromoCard
          className="bg-surface-default"
          demo={false}
          overline={
            <>
              <span className="text-text-brand">Rakeback</span> <DemoBadge size="s" />
            </>
          }
          title="3.42 USDT claimable now"
          extra={
            <p className="mt-1 text-caption text-text-secondary">
              5% of house edge back · claim any time
            </p>
          }
          link={
            <span className="flex items-center gap-3">
              <ArrowLink href={ROUTES.promotions}>Claim</ArrowLink>
              <span className="text-caption text-text-tertiary">Terms apply</span>
            </span>
          }
          art={<WelcomeArt />}
        />
      ) : (
        <PromoCard
          className="bg-surface-default"
          demo={false}
          overline={
            <>
              <span className="text-text-brand">Welcome offer</span> <DemoBadge size="s" />
            </>
          }
          title={
            <span className="text-h4 leading-[26px]">
              100% up to
              <br />
              500 USDT
            </span>
          }
          extra={<p className="mt-0.5 text-caption text-text-secondary">30× wagering · 14 days</p>}
          link={
            <span className="flex items-center gap-3">
              <ArrowLink href={`${ROUTES.promotions}#welcome-offer`}>Claim offer</ArrowLink>
              <span className="text-caption text-text-tertiary">Terms apply</span>
            </span>
          }
          art={<WelcomeArt />}
        />
      )}
    </div>
  );
}

function WelcomeArt() {
  return (
    <>
      <div className="absolute top-[30%] right-[-30%] bottom-[-20%] w-[80%] -skew-x-[24deg] bg-brand/15" />
      <ChipArt value="500" tone="violet" className="absolute top-1 right-1 w-[58px]" />
      <ChipArt value="100" tone="ink" className="absolute top-[52px] right-[-26px] w-[52px]" />
      <ChipArt value="25" tone="mint" className="absolute right-3 bottom-2 w-[62px]" />
    </>
  );
}

// ── draw card (Card/Draw Countdown) ─────────────────────────────────────────────────────────────

function DrawCard() {
  const { snapshot, viewer, restricted, myEntries, balance, demoNow, signUp, countryName } =
    useHomeView();
  const round = snapshot.current;
  const demo = snapshot.isDemo;

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-tile-gold">
        <PoolCoin className="size-10" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label-l text-text-primary">Global Pool</p>
        <p className="text-caption text-text-tertiary">
          Round {formatRoundNumber(round ? round.number : snapshot.next.number)}
          {!round && ' · next'}
        </p>
      </div>
      {round ? (
        <StatusBadge status="live" uppercase size="m" />
      ) : (
        <StatusBadge status="pending" label="Opens soon" size="m" />
      )}
    </div>
  );

  if (!round) {
    const last = snapshot.last;
    const first = last.winners.find((w) => w.tier === 'first');
    return (
      <aside
        aria-label="Next draw"
        className="flex flex-col gap-4 rounded-xl border border-border-gold bg-surface-default p-5"
      >
        {header}
        <JackpotMeter
          amount={last.poolBalance ?? '0'}
          size="l"
          unitSize="full"
          demo={demo}
          className="min-w-0"
          label={`Round ${formatRoundNumber(last.number)} · ${statusWord(last.status)}`}
          caption={lastRoundCaption(last)}
        />
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-label-m text-text-secondary">
            <Timer aria-hidden className="size-4" /> Opens in
          </p>
          <Countdown
            closesAt={snapshot.next.opensAt}
            demoNow={demoNow}
            doneLabel="Round open — refresh to enter"
            label="Opens in"
            caption={
              <>
                Opens {formatDateTimeUTC(snapshot.next.opensAt)} · closes{' '}
                {formatTimeUTC(snapshot.next.closesAt)}
              </>
            }
          />
        </div>
        {first && (
          <p className="flex items-center justify-between gap-2 rounded-md bg-bg-secondary px-3 py-2 text-body-s">
            <span className="text-text-secondary">
              1st prize <span className="text-text-primary">@{first.handle}</span>
            </span>
            <span className="text-label-m text-text-gold tabular-nums">
              {formatUSDT(first.amount)}
            </span>
          </p>
        )}
        <Button
          variant="secondary"
          size="l"
          block
          leadingIcon={<BellRing aria-hidden />}
          onClick={() => {
            if (viewer === 'guest') signUp();
            else
              toast({
                type: 'success',
                title: `We’ll notify you when round ${formatRoundNumber(snapshot.next.number)} opens`,
                description: 'DEMO — notifications are not sent in this build.',
              });
          }}
        >
          Notify me
        </Button>
        <p className="text-caption text-text-tertiary">
          Rounds run daily 08:00–20:00 UTC · 10.00 USDT per entry + 0.05 USDT platform fee · 18+
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Current draw"
      className="flex flex-col gap-4 rounded-xl border border-border-gold bg-surface-default p-5"
    >
      {header}
      <JackpotMeter
        amount={round.poolBalance ?? '0'}
        size="l"
        unitSize="full"
        demo={demo}
        className="min-w-0"
        caption={`Platform fees (${formatUSDT(round.platformFees ?? '0')}) are not part of the pool`}
      />
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-label-l text-text-primary">
          <Timer aria-hidden className="size-4 text-icon-muted" /> Closes in
        </p>
        <Countdown
          closesAt={round.closesAt}
          demoNow={demoNow}
          caption={<>Draw at {formatDateTimeUTC(round.closesAt)} · Chainlink VRF</>}
        />
      </div>
      {viewer === 'member' && myEntries && !restricted ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-border-brand bg-brand-tint-subtle px-3 py-2.5">
          <p className="flex items-center justify-between gap-2 text-label-m">
            <span className="flex items-center gap-1.5 text-text-brand">
              <Ticket aria-hidden className="size-4" /> Your {myEntries.entries} entries
            </span>
            <span className="tabular-nums text-text-primary">{formatUSDT(myEntries.total)}</span>
          </p>
          <p className="flex items-center justify-between gap-2 text-caption text-text-secondary">
            <span>
              {myEntries.firstEntryId} … {myEntries.lastEntryId.slice(-5)}
            </span>
            <span>≈{displayOddsPercent(myEntries.odds.anyPrizeApproxPercent)}% any prize</span>
          </p>
          {balance && (
            <p className="flex items-center justify-between gap-2 border-t border-border-subtle pt-1.5 text-caption text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Wallet aria-hidden className="size-3.5" /> Available balance
              </span>
              <span className="flex items-center gap-1.5 text-text-primary tabular-nums">
                {formatUSDT(balance.available)}
                {balance.isDemo && <DemoBadge size="xs" />}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-x-4 gap-y-2 text-caption whitespace-nowrap text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Users aria-hidden className="size-4 text-icon-muted" />
            {formatCount(round.participants ?? 0)} participants
          </span>
          <span className="flex items-center gap-1.5">
            <TicketGlyph className="size-4 text-icon-muted" />
            {formatCount(round.entries ?? 0)} entries
          </span>
          {demo && <DemoBadge size="s" className="ml-auto" />}
        </p>
      )}
      {restricted ? (
        <>
          <Button size="l" block disabled leadingIcon={<Ban aria-hidden />}>
            Enter round
          </Button>
          <p className="text-caption text-text-tertiary">
            Entering rounds is not available in your region
            {countryName ? ` (${countryName})` : ''}. You can still sign in to view your account and
            withdraw your balance.
          </p>
        </>
      ) : (
        <>
          {viewer === 'member' ? (
            <Button size="l" block asChild>
              <Link href={ROUTES.pool}>
                <TicketGlyph className="size-5" /> Enter round
              </Link>
            </Button>
          ) : (
            <Button
              size="l"
              block
              leadingIcon={<TicketGlyph className="size-5" />}
              onClick={signUp}
            >
              Enter round
            </Button>
          )}
          <p className="text-caption text-text-tertiary">
            10.00 USDT per entry + 0.05 USDT platform fee per entry · paid from your balance (no
            network fee) · 18+ · You can lose your stake
          </p>
        </>
      )}
    </aside>
  );
}

// ── section ─────────────────────────────────────────────────────────────────────────────────────

/** H1 Hero: banner carousel + side promos | Card/Draw Countdown. */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] laptop:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <HeroCarousel />
        <PromoRow />
      </div>
      <DrawCard />
    </section>
  );
}
