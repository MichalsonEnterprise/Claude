'use client';

import {
  formatCount,
  formatDateTimeUTC,
  formatRoundNumber,
  formatTimeUTC,
} from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { prizeBreakdown } from '@gp/shared/pool';
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Clock,
  EyeOff,
  Lock,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { EntryTicket } from '@/components/home/art';
import { initialsOf } from '@/components/home/primitives';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { MyRoundEntries, PoolRoundView, RgState } from '@/lib/api/pool';
import { cn } from '@/lib/utils';

import {
  acceptsEntries,
  approxPercent,
  clock,
  clockWords,
  hmsUntil,
  relativeTime,
  roundPhase,
  type RoundPhase,
  oddsFor,
} from './logic';
import { ParticipateFlow } from './participate-flow';
import {
  CardHeading,
  FEE_LINE,
  LicenceStrip,
  Meter,
  MoreLink,
  Overline,
  POOL_ROUTES,
  PoolPageHeader,
  PoolTabs,
  PrizeDistributionCard,
  QueryError,
  RiskLine,
  RoundStatusBadge,
  SectionTitle,
  ThresholdCard,
  VrfExplainerCard,
  cardCls,
} from './parts';
import { type PoolPreviewFlag } from './preview';
import {
  useCurrentRound,
  useEntryHistory,
  useLivePool,
  useMyRoundEntries,
  useNow,
  useRegionStatus,
  useRoundFeed,
  useRounds,
  useViewer,
  useViewerBalances,
  useViewerRg,
  type LiveStatus,
} from './use-pool';

/**
 * GP-01 Global Pool hub (+ MOB-04 mobile with sticky participate bar, PUB-02 public/guest variant).
 * States: active round · upcoming / between rounds (no active round) · drawing · restricted region ·
 * wallet disconnected (guest) · loading skeleton · error. All numbers come from the API (TanStack Query) and the
 * live `/pool` socket; countdowns use the real clock against the round's real `closesAt`.
 */
export function PoolHub({ previewFlags = [] }: { previewFlags?: PoolPreviewFlag[] }) {
  const has = (f: PoolPreviewFlag) => previewFlags.includes(f);
  const { auth, member: signedIn } = useViewer();
  const member = signedIn && !has('guest');
  const region = useRegionStatus();
  const restricted = has('restricted') || (region.data ? !region.data.permitted : false);
  const countryName = has('restricted') ? 'United States' : (region.data?.countryName ?? null);
  const current = useCurrentRound();
  const recent = useRounds({ pageSize: 3 });
  const now = useNow();
  const live = useLivePool();
  const round = current.data ?? null;
  const phase: RoundPhase | null = round
    ? roundPhase(round, now ?? Date.parse(round.opensAt))
    : null;
  const active = !has('no-round') && phase !== null && (phase === 'open' || phase === 'closing');
  const mine = useMyRoundEntries(member && round ? round : null);
  const balances = useViewerBalances();
  const rg = useViewerRg();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (has('participate') && round && member) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id, member]);

  const myCount = member ? (mine.data?.entries ?? 0) : 0;
  const canEnter =
    Boolean(round && phase && acceptsEntries(phase)) && !restricted && !has('no-round');
  const participate = () => {
    if (!member) {
      if (auth.openAuth) auth.openAuth('sign-in', { next: POOL_ROUTES.hub });
      else auth.signIn();
      return;
    }
    setOpen(true);
  };

  const header = (
    <>
      <ShellOverride restricted={restricted} previewGuest={has('guest')} />
      <PoolPageHeader
        crumbs={[{ label: 'Lobby', href: '/' }, { label: 'Global Pool' }]}
        title="Global Pool"
        badges={
          <>
            {active && <StatusBadge status="live" uppercase />}
            {round?.isDemo && <DemoBadge size="s" />}
          </>
        }
        actions={
          <>
            <Button variant="ghost" asChild leadingIcon={<CircleHelp aria-hidden />}>
              <Link href={POOL_ROUTES.prizes}>How it works</Link>
            </Button>
            <Button variant="secondary" asChild leadingIcon={<ShieldCheck aria-hidden />}>
              <Link href={POOL_ROUTES.fairness}>Verify a draw</Link>
            </Button>
          </>
        }
      />
      <PoolTabs active="overview" entries={myCount} />
    </>
  );

  if (current.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        {header}
        <Skeleton className="h-[380px] rounded-xl" />
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[220px] rounded-xl" />
        </div>
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    );
  }
  if (current.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <QueryError
          error={current.error}
          onRetry={() => void current.refetch()}
          title="We couldn’t load the Global Pool"
        />
      </div>
    );
  }

  const last = recent.data?.items[0] ?? null;
  // Between rounds show the last finished round; an upcoming (scheduled / not-yet-open) round has no numbers yet.
  const shown = active
    ? round!
    : has('no-round')
      ? last
      : ((round && round.status !== 'scheduled' && phase !== 'not_open_yet' ? round : last) ??
        round);

  return (
    <div className="flex flex-col gap-6 pb-4">
      {header}
      {restricted && (
        <RestrictedNotice countryName={countryName} myEntries={myCount} round={round} />
      )}
      {member && <RefundOwedBanner />}

      {active && round ? (
        <ActiveHero
          round={round}
          now={now}
          live={live}
          restricted={restricted}
          member={member}
          canEnter={canEnter}
          onParticipate={participate}
        />
      ) : round && (phase === 'drawing' || phase === 'delayed') && !has('no-round') ? (
        <DrawingHero round={round} />
      ) : (
        <NextRoundHero round={round} phase={has('no-round') ? null : phase} last={last} now={now} />
      )}

      {member && rg.data && <RgStrip rg={rg.data} />}

      {shown && (
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
          <RoundHeaderCard round={shown} now={now} />
          <MyEntriesCard
            member={member}
            round={shown}
            data={shown.id === round?.id ? mine.data : undefined}
            loading={member && mine.isPending && shown.id === round?.id}
            rg={rg.data}
            onConnect={participate}
          />
        </div>
      )}

      {shown && (
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,520fr)_minmax(0,600fr)]">
          <ThresholdCard round={shown} demo={shown.isDemo} />
          <OddsCard
            round={shown}
            mine={shown.id === round?.id ? mine.data : undefined}
            member={member}
            rg={rg.data}
          />
        </div>
      )}

      {shown && (
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,520fr)_minmax(0,600fr)]">
          <PrizeDistributionCard
            roundNumber={shown.number}
            pool={shown.poolBalance}
            tiers={
              shown.prizeDistribution.length
                ? shown.prizeDistribution
                : prizeBreakdown(shown.poolBalance).tiers
            }
            demo={shown.isDemo}
            platformFees={shown.platformFees}
          />
          <VrfExplainerCard
            closesAt={shown.closesAt}
            verifyRound={last?.status === 'settled' ? last.number : null}
          />
        </div>
      )}

      {active && round && <RecentEntries round={round} now={now} live={live} />}

      <RecentRounds
        rounds={recent.data?.items}
        loading={recent.isPending}
        error={recent.isError ? recent.error : null}
      />

      <LicenceStrip />

      <StickyParticipateBar
        round={round}
        active={active}
        now={now}
        restricted={restricted}
        member={member}
        canEnter={canEnter}
        onParticipate={participate}
      />

      {round && member && (
        <ParticipateFlow
          open={open}
          onOpenChange={setOpen}
          round={round}
          myEntries={myCount}
          available={balances.data?.available ?? null}
          limits={rg.data?.limits ?? null}
          wrongNetwork={has('wrong-network')}
        />
      )}
    </div>
  );
}

// ── hero variants ─────────────────────────────────────────────────────────────────────────────

function HeroArt({ round }: { round: PoolRoundView }) {
  // decorative tickets show the round's real first / latest entry IDs (no invented player data)
  const code = (seq: number) => `E-${round.number}-${String(Math.max(1, seq)).padStart(5, '0')}`;
  const first = code(1);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] overflow-hidden laptop:block"
    >
      <div className="absolute -top-16 right-[-120px] h-[160%] w-[300px] -rotate-[24deg] bg-accent-gold-tint-strong" />
      <div className="absolute -top-16 right-[210px] h-[160%] w-[26px] -rotate-[24deg] bg-brand" />
      <EntryTicket
        entryId={first}
        roundLabel={`Round ${formatRoundNumber(round.number)}`}
        className="absolute top-10 right-[-60px] rotate-[10deg]"
      />
      <EntryTicket
        entryId={code(round.entries)}
        roundLabel={`Round ${formatRoundNumber(round.number)}`}
        className="absolute right-[-10px] bottom-8 -rotate-[7deg]"
      />
    </div>
  );
}

function ActiveHero({
  round,
  now,
  live,
  restricted,
  member,
  canEnter,
  onParticipate,
}: {
  round: PoolRoundView;
  now: number | null;
  live: LiveStatus;
  restricted: boolean;
  member: boolean;
  canEnter: boolean;
  onParticipate: () => void;
}) {
  const left = now !== null ? hmsUntil(round.closesAt, now) : null;
  return (
    <section
      aria-labelledby="pool-hero-title"
      className={cn(cardCls, 'relative overflow-hidden rounded-2xl p-5 tablet:p-8 laptop:p-10')}
    >
      <HeroArt round={round} />
      <div className="relative flex max-w-[640px] flex-col gap-5">
        <p
          id="pool-hero-title"
          className="flex flex-wrap items-center gap-2 text-overline text-text-secondary uppercase"
        >
          Global Pool · Round {formatRoundNumber(round.number)}
          <StatusBadge status="live" uppercase />
          {round.isDemo && <DemoBadge size="xs" />}
        </p>
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-baseline gap-x-3 font-semibold leading-none tabular-nums">
            <span className="bg-gradient-gold-jackpot bg-clip-text text-[length:clamp(40px,9vw,88px)] tracking-[-0.03em] text-transparent">
              {formatUSDT(round.poolBalance, { symbol: false })}
            </span>
            <span className="bg-gradient-gold-jackpot bg-clip-text text-h3 text-transparent tablet:text-h2">
              USDT
            </span>
          </p>
          <p className="text-body-s text-text-secondary" aria-live="polite">
            Pool balance · {formatCount(round.entries)} qualifying entries · platform fees (
            {formatUSDT(round.platformFees)}) excluded
            {live === 'live' ? ' · updating live' : ''}
          </p>
        </div>
        {/* MOB-04: compact stats on phones (the sticky bar carries the Participate action) */}
        <dl className="grid grid-cols-3 gap-2 tablet:hidden">
          {(
            [
              [formatCount(round.participants), 'participants', false],
              [formatCount(round.entries), 'entries', false],
              [left ? clock(left) : '—', 'until close', true],
            ] as const
          ).map(([v, l, gold]) => (
            <div key={l} className="flex flex-col gap-0.5 rounded-lg bg-surface-raised p-2.5">
              <dd
                className={cn(
                  'text-label-l tabular-nums',
                  gold ? 'text-text-gold' : 'text-text-primary',
                )}
                suppressHydrationWarning
              >
                {v}
              </dd>
              <dt className="order-last text-caption text-text-tertiary">{l}</dt>
            </div>
          ))}
        </dl>
        <p className="text-caption text-text-tertiary tablet:hidden">
          Closes {formatDateTimeUTC(round.closesAt)} · entry 10.00 USDT + 0.05 USDT platform fee ·
          network fee 0.00 USDT
        </p>
        <div className="hidden flex-col gap-4 tablet:flex tablet:flex-row tablet:items-center tablet:gap-6">
          <ParticipantsPill round={round} />
          <div className="flex flex-col gap-0.5">
            <p className="flex items-center gap-2 text-label-l text-text-primary">
              <Clock aria-hidden className="size-4 text-icon-gold" />
              <span role="timer" aria-live="off" suppressHydrationWarning>
                {left
                  ? left.totalMs > 0
                    ? `Closes in ${clockWords(left)}`
                    : 'Entries closed — drawing'
                  : '—'}
              </span>
            </p>
            <p className="text-caption text-text-tertiary">
              Closes <time dateTime={round.closesAt}>{formatDateTimeUTC(round.closesAt)}</time>
            </p>
          </div>
        </div>
        <div className="hidden flex-wrap items-center gap-3 tablet:flex">
          {restricted ? (
            <Button variant="gold" size="l" disabled leadingIcon={<TriangleAlert aria-hidden />}>
              Not available in your region
            </Button>
          ) : (
            <Button
              variant="gold"
              size="l"
              leadingIcon={<Ticket aria-hidden />}
              onClick={onParticipate}
              disabled={member && !canEnter}
            >
              {member ? 'Participate' : 'Sign in to participate'}
            </Button>
          )}
          <Button variant="secondary" size="l" asChild leadingIcon={<BookOpen aria-hidden />}>
            <Link href={POOL_ROUTES.prizes}>Round rules</Link>
          </Button>
        </div>
        <p className="hidden max-w-[560px] text-body-s text-text-secondary tablet:block">
          {FEE_LINE}
        </p>
        <RiskLine className="hidden tablet:flex" />
        {!member && !restricted && (
          <p className="flex items-center gap-2 text-caption text-text-tertiary">
            <Wallet aria-hidden className="size-4" /> Sign in or connect a wallet to add entries.
            Your exact chance is shown before you confirm.
          </p>
        )}
      </div>
    </section>
  );
}

function ParticipantsPill({ round }: { round: PoolRoundView }) {
  // avatars = the latest public buyers from the round feed (shared query cache); Hidden players are never shown
  const feed = useRoundFeed(round.number);
  const handles = [
    ...new Set((feed.data ?? []).map((e) => e.handle).filter((h): h is string => Boolean(h))),
  ].slice(0, 5);
  return (
    <div className="flex w-fit items-center gap-3 rounded-full border border-border-subtle bg-bg-secondary/70 py-1.5 pr-4 pl-1.5">
      {handles.length > 0 && (
        <span className="flex -space-x-1.5" aria-hidden>
          {handles.map((h) => (
            <Avatar
              key={h}
              initials={initialsOf(h)}
              size="s"
              tone="brand"
              className="ring-2 ring-surface-default"
            />
          ))}
        </span>
      )}
      <span className="flex flex-col">
        <span className="text-body-m text-text-primary">
          <span className="font-semibold tabular-nums">{formatCount(round.participants)}</span>{' '}
          <span className="text-body-s text-text-secondary">
            {round.participants === 1 ? 'participant' : 'participants'}
          </span>
        </span>
        <span className="flex items-center gap-1 text-caption text-text-tertiary">
          <TrendingUp aria-hidden className="size-3.5 text-text-brand" />
          {formatCount(round.entries)} {round.entries === 1 ? 'entry' : 'entries'}
        </span>
      </span>
      {round.isDemo && <DemoBadge size="xs" />}
    </div>
  );
}

function DrawingHero({ round }: { round: PoolRoundView }) {
  return (
    <section className={cn(cardCls, 'relative overflow-hidden rounded-2xl p-5 tablet:p-8')}>
      <div className="relative flex max-w-[640px] flex-col gap-4">
        <p className="flex items-center gap-2 text-overline text-text-brand uppercase">
          <Lock aria-hidden className="size-4" /> Entries closed · drawing now
          {round.isDemo && <DemoBadge size="xs" />}
        </p>
        <p className="text-h3 text-text-primary">
          Round {formatRoundNumber(round.number)} closed at{' '}
          {formatTimeUTC(round.closesAt, { seconds: true })}.
        </p>
        <p className="font-semibold leading-none tabular-nums">
          <span className="bg-gradient-gold-jackpot bg-clip-text text-[length:clamp(36px,7vw,64px)] text-transparent">
            {formatUSDT(round.poolBalance, { symbol: false })}
          </span>{' '}
          <span className="text-h4 text-text-gold">USDT</span>
        </p>
        <p className="text-body-s text-text-secondary">
          Prize pool for 13 winners · {formatCount(round.participants)} participants ·{' '}
          {formatCount(round.entries)} entries. Platform fees ({formatUSDT(round.platformFees)}) are
          not part of the pool.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="l" asChild>
            <Link href={POOL_ROUTES.round(round.number)}>
              Watch the draw <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function NextRoundHero({
  round,
  phase,
  last,
  now,
}: {
  round: PoolRoundView | null;
  phase: RoundPhase | null;
  last: PoolRoundView | null;
  now: number | null;
}) {
  const upcoming = round && (phase === 'scheduled' || phase === 'not_open_yet') ? round : null;
  const left = upcoming && now !== null ? hmsUntil(upcoming.opensAt, now) : null;
  const settled = last && last.status === 'settled' ? last : null;
  return (
    <section className={cn(cardCls, 'relative overflow-hidden rounded-2xl p-5 tablet:p-8')}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[40%] overflow-hidden laptop:block"
      >
        <div className="absolute -top-16 right-[-80px] h-[160%] w-[260px] -rotate-[24deg] bg-accent-gold-tint-strong" />
        <div className="absolute -top-16 right-[200px] h-[160%] w-[22px] -rotate-[24deg] bg-brand" />
      </div>
      <div className="relative grid gap-6 laptop:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-overline text-text-secondary uppercase">
            Between rounds {(upcoming ?? last)?.isDemo && <DemoBadge size="xs" />}
          </p>
          <h2 className="text-h3 text-text-primary tablet:text-h2">
            {upcoming
              ? `Next round opens ${formatDateTimeUTC(upcoming.opensAt)}`
              : 'The next round is announced here when it is scheduled'}
          </h2>
          <p className="max-w-[560px] text-body-s text-text-secondary">
            {settled
              ? `Round ${formatRoundNumber(settled.number)} settled${settled.settledAt ? ` at ${formatTimeUTC(settled.settledAt, { seconds: true })}` : ''} — 13 winning entries shared the ${formatUSDT(settled.poolBalance)} pool and prizes are in winners’ Owed balances. `
              : ''}
            {upcoming
              ? `Entries for ${formatRoundNumber(upcoming.number)} open at ${formatTimeUTC(upcoming.opensAt)}; nothing can be bought before then.`
              : 'Rounds run daily from 08:00 to 20:00 UTC. Nothing can be bought between rounds.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {settled && (
              <Button variant="primary" size="l" asChild>
                <Link href={POOL_ROUTES.round(settled.number)}>
                  See round {formatRoundNumber(settled.number)} results <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
            {settled && (
              <Button
                variant="secondary"
                size="l"
                asChild
                leadingIcon={<ShieldCheck aria-hidden />}
              >
                <Link href={POOL_ROUTES.verify(settled.number)}>Verify this draw</Link>
              </Button>
            )}
          </div>
          <RiskLine>{FEE_LINE}</RiskLine>
        </div>
        {upcoming && (
          <div className="flex flex-col gap-3 rounded-xl border border-border-gold bg-bg-secondary/80 p-5">
            <Overline className="text-text-gold">
              Next round · {formatRoundNumber(upcoming.number)}
            </Overline>
            <p className="text-caption text-text-tertiary">Opens in</p>
            <p
              role="timer"
              aria-live="off"
              className="text-number-l text-text-primary tabular-nums"
              suppressHydrationWarning
            >
              {left ? clock(left) : '—'}
            </p>
            <p className="text-caption text-text-tertiary">
              Opens {formatDateTimeUTC(upcoming.opensAt)} · closes{' '}
              {formatTimeUTC(upcoming.closesAt)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function RestrictedNotice({
  countryName,
  myEntries,
  round,
}: {
  countryName: string | null;
  myEntries: number;
  round: PoolRoundView | null;
}) {
  return (
    <Alert
      type="restricted"
      title="Regional restriction"
      actions={
        <>
          <Button size="s" variant="secondary" asChild>
            <Link href={POOL_ROUTES.wallet}>Withdraw funds</Link>
          </Button>
          <Button size="s" variant="ghost" asChild>
            <Link href={POOL_ROUTES.restricted}>Restricted countries</Link>
          </Button>
        </>
      }
    >
      Global Pool participation and GLOBAL POOL games are not available from your current location
      {countryName ? ` (${countryName})` : ''}.
      {myEntries > 0 && round
        ? ` Your ${formatCount(myEntries)} entries already in round ${formatRoundNumber(round.number)} stay in the draw.`
        : ''}{' '}
      You can still view rounds, verify draws and withdraw your balance. If your location was
      detected incorrectly, contact support.
    </Alert>
  );
}

/** GP-13 edge state: a cancelled round left a stake in the player's Owed balance. */
function RefundOwedBanner() {
  const history = useEntryHistory(1, 20);
  const owed = history.data?.items.find((i) => i.result.kind === 'refund_owed');
  if (!owed || !history.data || money(history.data.summary.refundOwed).isZero()) return null;
  return (
    <Alert
      type="warning"
      title={`Round ${formatRoundNumber(owed.roundNumber)} was cancelled — ${formatUSDT(history.data.summary.refundOwed)} is owed back to you`}
      actions={
        <>
          <Button size="s" variant="secondary" asChild>
            <Link href={POOL_ROUTES.round(owed.roundNumber)}>View refund</Link>
          </Button>
          <Button size="s" variant="ghost" asChild>
            <Link href={POOL_ROUTES.wallet}>Wallet</Link>
          </Button>
        </>
      }
    >
      It closed on {formatDateTimeUTC(owed.roundClosesAt)} below the draw threshold, so no winners
      were drawn. Your stake is in your Owed balance and counts toward your total; claim it to
      Available from the wallet whenever you like. Platform fees are not refunded.
    </Alert>
  );
}

// ── cards ─────────────────────────────────────────────────────────────────────────────────────

function RgStrip({ rg }: { rg: RgState }) {
  const shown = rg.limits.filter(
    (l) => (l.type === 'participation' || l.type === 'loss') && l.limit !== null,
  );
  return (
    <section
      aria-label="Responsible gaming"
      className={cn(
        cardCls,
        'flex flex-col gap-4 p-4 tablet:flex-row tablet:items-center tablet:gap-8 tablet:px-6',
      )}
    >
      {shown.length === 0 ? (
        <p className="flex-1 text-body-s text-text-secondary">
          No participation or loss limit set. You can set daily, weekly or monthly limits at any
          time.
        </p>
      ) : (
        shown.map((l) => {
          const used = l.used ?? '0';
          const ratio = money(used).div(l.limit!).toNumber();
          return (
            <div key={`${l.type}-${l.period}`} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="flex items-center justify-between gap-2 text-caption text-text-tertiary">
                {l.period === 'day' ? 'Daily' : l.period === 'week' ? 'Weekly' : 'Monthly'}{' '}
                {l.type === 'loss' ? 'loss' : 'participation'} limit
                <span className="text-label-m text-text-primary tabular-nums">
                  {formatUSDT(used, { symbol: false })} / {formatUSDT(l.limit!)}
                </span>
              </p>
              <Meter
                value={ratio}
                tone={ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'brand'}
                label={`${l.type} limit used`}
              />
            </div>
          );
        })
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="s" asChild leadingIcon={<SlidersHorizontal aria-hidden />}>
          <Link href={POOL_ROUTES.rg}>Responsible gaming</Link>
        </Button>
        <Button variant="secondary" size="s" asChild>
          <Link href={`${POOL_ROUTES.rg}#take-a-break`}>Take a break</Link>
        </Button>
      </div>
    </section>
  );
}

function RoundHeaderCard({ round, now }: { round: PoolRoundView; now: number | null }) {
  const open = round.status === 'open';
  const left = open && now !== null ? hmsUntil(round.closesAt, now) : null;
  const stat = (label: string, value: string, hint: string, tone?: string) => (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-surface-raised p-3">
      <span className="text-caption text-text-tertiary">{label}</span>
      <span className={cn('text-label-l break-words text-text-primary tabular-nums', tone)}>
        {value}
      </span>
      <span className="truncate text-caption text-text-tertiary">{hint}</span>
    </div>
  );
  const met = round.thresholds.met;
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-5 p-5 tablet:p-6')}>
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="flex flex-wrap items-center gap-2 text-h3 text-text-primary">
            Round {formatRoundNumber(round.number)}
            <RoundStatusBadge status={round.status} />
            {round.isDemo && <DemoBadge size="xs" />}
          </h2>
          <p className="text-body-s text-text-secondary">
            Opened {formatDateTimeUTC(round.openedAt)} · {open ? 'Closes' : 'Closed'}{' '}
            {formatDateTimeUTC(round.closesAt)}
          </p>
        </div>
        {open ? (
          <div className="flex flex-col tablet:items-end">
            <Overline>Closes in</Overline>
            <p
              role="timer"
              aria-live="off"
              className="text-number-l text-text-primary tabular-nums"
              suppressHydrationWarning
            >
              {left ? clock(left) : '—'}
            </p>
            <p className="text-caption text-text-tertiary">{formatDateTimeUTC(round.closesAt)}</p>
          </div>
        ) : (
          <Button variant="secondary" size="s" asChild>
            <Link href={POOL_ROUTES.round(round.number)}>
              Round details <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        {stat(
          'Participants',
          formatCount(round.participants),
          `min ${formatCount(round.thresholds.minParticipants)}`,
        )}
        {stat('Qualifying entries', formatCount(round.entries), `${round.entryPrice} USDT each`)}
        {stat('Pool balance', formatUSDT(round.poolBalance), 'platform fees excluded')}
        {stat(
          'Threshold',
          met === true ? 'Met' : met === false ? 'Not met' : 'Pending',
          met === true
            ? open
              ? 'round will draw'
              : 'round drew'
            : open
              ? 'refund if not met'
              : 'refunded',
          met === true ? 'text-text-success' : met === false ? 'text-text-warning' : undefined,
        )}
      </div>
      <RiskLine>
        Entry {round.entryPrice} USDT + {round.platformFeePerEntry} USDT platform fee per entry ·
        You can lose your stake · permitted jurisdictions only
      </RiskLine>
    </article>
  );
}

function MyEntriesCard({
  member,
  round,
  data,
  loading,
  rg,
  onConnect,
}: {
  member: boolean;
  round: PoolRoundView;
  data: MyRoundEntries | undefined;
  loading: boolean;
  rg: RgState | undefined;
  onConnect: () => void;
}) {
  const participation = rg?.limits.find((l) => l.type === 'participation' && l.limit !== null);
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-3 p-5')}>
      <p className="flex items-center gap-2 text-overline text-text-tertiary uppercase">
        My entries {round.isDemo && <DemoBadge size="xs" />}
      </p>
      {!member ? (
        <>
          <p className="text-label-l text-text-primary">Connect your wallet to add entries</p>
          <p className="text-body-s text-text-secondary">
            Your entries, locked amount and odds appear here once you are signed in. Entries are
            paid from your platform balance — no network fee.
          </p>
          <Button
            variant="secondary"
            size="m"
            className="mt-auto"
            onClick={onConnect}
            leadingIcon={<Wallet aria-hidden />}
          >
            Sign in / connect wallet
          </Button>
        </>
      ) : loading ? (
        <Skeleton className="h-36 w-full" />
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="text-number-l text-text-primary tabular-nums">
              {formatCount(data?.entries ?? 0)}
            </span>
            <span className="text-body-s text-text-secondary">
              entries in {formatRoundNumber(round.number)}
              {data?.entries ? '' : ' yet'}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-label-l text-balance-locked">
            <Lock aria-hidden className="size-4" />
            {formatUSDT(
              round.status === 'open' || round.status === 'closed' || round.status === 'drawing'
                ? (data?.entryAmount ?? '0')
                : '0',
            )}{' '}
            locked
          </p>
          {data && data.entries > 0 ? (
            <>
              <p className="text-caption text-text-tertiary">
                + {formatUSDT(data.platformFee)} platform fees ({formatCount(data.entries)} ×{' '}
                {round.platformFeePerEntry})
              </p>
              <p className="font-mono text-mono-s break-all text-text-secondary">
                {data.firstEntryId} … {data.lastEntryId}
              </p>
            </>
          ) : (
            <p className="text-caption text-text-tertiary">
              Your entries appear here once confirmed.
            </p>
          )}
          {participation && (
            <div className="flex flex-col gap-1.5">
              <p className="flex justify-between text-caption text-text-tertiary">
                Daily limit
                <span className="text-label-m text-text-primary tabular-nums">
                  {formatUSDT(participation.used ?? '0', { symbol: false })} /{' '}
                  {formatUSDT(participation.limit!, { symbol: false })}
                </span>
              </p>
              <Meter
                value={money(participation.used ?? '0')
                  .div(participation.limit!)
                  .toNumber()}
                label="Daily participation limit used"
              />
            </div>
          )}
          <Button variant="secondary" size="m" className="mt-auto" asChild>
            <Link href={POOL_ROUTES.entries}>
              View my entries <ArrowRight aria-hidden />
            </Link>
          </Button>
        </>
      )}
    </article>
  );
}

function OddsCard({
  round,
  mine,
  member,
  rg,
}: {
  round: PoolRoundView;
  mine: MyRoundEntries | undefined;
  member: boolean;
  rg: RgState | undefined;
}) {
  const n = round.entries;
  const my = member ? (mine?.entries ?? 0) : 0;
  const perEntry = n > 0 ? oddsFor(1, n) : null;
  const odds = my > 0 && n > 0 ? oddsFor(my, n) : null;
  const participation = rg?.limits.find((l) => l.type === 'participation' && l.limit !== null);
  const fig = (v: string, l: string) => (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-number-m text-text-primary tabular-nums">{v}</span>
      <span className="text-caption text-text-tertiary">{l}</span>
    </div>
  );
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-4 p-5 tablet:p-6')}>
      <CardHeading
        icon={<Percent aria-hidden className="size-4 text-icon-brand" />}
        title={odds ? 'Your odds this round' : 'Odds per entry'}
        demo={round.isDemo}
      />
      {odds ? (
        <div className="grid grid-cols-2 gap-4 tablet:grid-cols-3">
          {fig(approxPercent(odds.anyPrizePercent), `chance of any of the ${odds.prizes} prizes`)}
          {fig(approxPercent(odds.firstPrizePercent), 'chance of the 1st prize')}
          {fig(`${formatCount(my)} / ${formatCount(n)}`, 'your qualifying entries')}
        </div>
      ) : perEntry ? (
        <div className="grid grid-cols-2 gap-4 tablet:grid-cols-3">
          {fig(approxPercent(perEntry.anyPrizePercent), `chance of any prize for 1 entry`)}
          {fig(approxPercent(perEntry.firstPrizePercent), 'chance of the 1st prize for 1 entry')}
          {fig(formatCount(n), 'qualifying entries so far')}
        </div>
      ) : (
        <p className="text-body-s text-text-secondary">
          No entries yet — odds appear with the first entry.
        </p>
      )}
      <p className="text-caption text-text-tertiary">
        Every qualifying entry has the same chance; one entry can win at most one prize. Odds change
        as entries are added until {formatTimeUTC(round.closesAt, { seconds: true })}. Exact figures
        (prizes drawn without replacement) are shown before you confirm.
      </p>
      {member && participation && (
        <div className="flex flex-col gap-1.5">
          <p className="flex justify-between text-caption text-text-tertiary">
            Daily participation limit
            <span className="text-label-m text-text-primary tabular-nums">
              {formatUSDT(participation.used ?? '0', { symbol: false })} /{' '}
              {formatUSDT(participation.limit!)}
            </span>
          </p>
          <Meter
            value={money(participation.used ?? '0')
              .div(participation.limit!)
              .toNumber()}
            label="Daily participation limit used"
          />
        </div>
      )}
      {member && (
        <Button
          variant="ghost"
          size="s"
          asChild
          className="self-start"
          leadingIcon={<SlidersHorizontal aria-hidden />}
        >
          <Link href={POOL_ROUTES.rg}>Manage limits</Link>
        </Button>
      )}
    </article>
  );
}

function RecentEntries({
  round,
  now,
  live,
}: {
  round: PoolRoundView;
  now: number | null;
  live: LiveStatus;
}) {
  const feed = useRoundFeed(round.number);
  return (
    <section aria-labelledby="pool-feed-title" className="flex flex-col gap-3">
      <SectionTitle
        id="pool-feed-title"
        title="Recent entries"
        demo={round.isDemo}
        live={live === 'live'}
        action={<MoreLink href={POOL_ROUTES.round(round.number)}>Round details</MoreLink>}
      />
      <div className={cn(cardCls, 'overflow-hidden')}>
        {feed.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : feed.isError ? (
          <QueryError error={feed.error} onRetry={() => void feed.refetch()} className="border-0" />
        ) : feed.data.length === 0 ? (
          <p className="p-6 text-center text-body-s text-text-secondary">
            No entries in this round yet.
          </p>
        ) : (
          <table className="w-full text-body-s">
            <caption className="sr-only">
              Latest entry purchases in round {formatRoundNumber(round.number)}
            </caption>
            <thead className="hidden bg-bg-secondary/60 text-left text-caption text-text-tertiary tablet:table-header-group">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Player
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Round
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Entries
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {feed.data.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-border-subtle first:border-t-0 tablet:first:border-t"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      {e.handle ? (
                        <Avatar initials={initialsOf(e.handle)} size="s" tone="brand" />
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full bg-surface-raised text-icon-muted">
                          <EyeOff aria-hidden className="size-3.5" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span
                          className={
                            e.handle
                              ? 'text-label-m text-text-primary'
                              : 'text-label-m text-text-secondary'
                          }
                        >
                          {e.handle ? `@${e.handle}` : 'Hidden'}
                        </span>
                        <span
                          className="text-caption text-text-tertiary tablet:hidden"
                          suppressHydrationWarning
                        >
                          {formatCount(e.entries)} {e.entries === 1 ? 'entry' : 'entries'} ·{' '}
                          {relativeTime(e.at, now)}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-text-secondary tablet:table-cell">
                    Round {formatRoundNumber(round.number)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-text-primary tabular-nums tablet:table-cell">
                    {formatCount(e.entries)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1.5 text-label-m text-text-gold tabular-nums">
                      {formatUSDT(e.amount)} {e.isDemo && <DemoBadge size="xs" />}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right tablet:table-cell">
                    <span className="flex flex-col items-end gap-0.5">
                      <StatusBadge status="pending" label="In the draw" />
                      <span className="text-caption text-text-tertiary" suppressHydrationWarning>
                        {relativeTime(e.at, now)}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="border-t border-border-subtle px-4 py-2.5 text-caption text-text-tertiary">
          Each entry adds {round.entryPrice} USDT to the pool. Platform fees are kept separate.
          Players who opted out of public feeds show as Hidden.
        </p>
      </div>
    </section>
  );
}

function RecentRounds({
  rounds,
  loading,
  error,
}: {
  rounds: PoolRoundView[] | undefined;
  loading: boolean;
  error: unknown;
}) {
  return (
    <section aria-labelledby="pool-rounds-title" className="flex flex-col gap-3">
      <SectionTitle
        id="pool-rounds-title"
        title="Recent rounds"
        demo={rounds?.some((r) => r.isDemo)}
        action={<MoreLink href={POOL_ROUTES.history}>All rounds</MoreLink>}
      />
      {loading ? (
        <div className="grid gap-4 laptop:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <QueryError error={error} />
      ) : !rounds?.length ? (
        <p className={cn(cardCls, 'p-6 text-body-s text-text-secondary')}>
          No finished rounds yet.
        </p>
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 laptop:mx-0 laptop:grid laptop:grid-cols-3 laptop:overflow-visible laptop:px-0">
          {rounds.map((r) => (
            <RoundCard key={r.id} round={r} />
          ))}
        </div>
      )}
    </section>
  );
}

export function RoundCard({ round }: { round: PoolRoundView }) {
  const first = round.winners[0];
  const cancelled = round.status === 'cancelled';
  return (
    <article
      className={cn(cardCls, 'flex w-[300px] shrink-0 snap-start flex-col gap-4 p-5 laptop:w-auto')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-h5 text-text-primary">Round {formatRoundNumber(round.number)}</h3>
          <p className="text-caption text-text-tertiary">Global Pool · Chainlink VRF</p>
        </div>
        <span className="flex items-center gap-1.5">
          <RoundStatusBadge status={round.status} />
          {round.isDemo && <DemoBadge size="xs" />}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-caption">
        <div>
          <dt className="text-text-tertiary">Pool</dt>
          <dd className="text-label-l text-text-primary tabular-nums">
            {formatUSDT(
              cancelled
                ? money(round.entryPrice).times(round.entries).toFixed(2)
                : round.poolBalance,
              { symbol: false },
            )}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Participants</dt>
          <dd className="text-label-l text-text-primary tabular-nums">
            {round.participants ? formatCount(round.participants) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">Qualifying entries</dt>
          <dd className="text-label-l text-text-primary tabular-nums">
            {formatCount(round.entries)}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{cancelled ? 'Cancelled' : 'Settled'}</dt>
          <dd className="text-label-m text-text-primary">
            {formatDateTimeUTC(round.settledAt ?? round.closedAt ?? round.closesAt).replace(
              ', 20',
              ', 20',
            )}
          </dd>
        </div>
      </dl>
      {cancelled ? (
        <div className="mt-auto flex flex-col gap-2 rounded-lg bg-status-warning-tint p-3 text-caption text-text-secondary">
          <p className="flex items-center gap-1.5 text-label-m text-text-warning">
            <TriangleAlert aria-hidden className="size-4" /> Threshold not met — round cancelled
          </p>
          <p>
            {formatCount(round.participants)} / {formatCount(round.thresholds.minParticipants)}{' '}
            participants · stakes were refunded to Owed balances.
          </p>
          <Link
            href={POOL_ROUTES.round(round.number)}
            className="text-label-m text-text-brand hover:underline"
          >
            View refund details
          </Link>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-3 rounded-lg bg-surface-raised p-3">
          {first ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar initials={initialsOf(first.handle ?? '??')} size="s" tone="brand" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-label-m text-text-primary">
                  {first.handle ? `@${first.handle}` : 'Hidden'}
                </span>
                <span className="text-caption text-text-tertiary">1st prize</span>
              </span>
            </span>
          ) : (
            <span className="text-caption text-text-tertiary">Winners pending</span>
          )}
          {first && (
            <span className="text-label-m text-text-gold tabular-nums">
              {formatUSDT(first.amount)}
            </span>
          )}
        </div>
      )}
      {!cancelled && (
        <Link
          href={POOL_ROUTES.verify(round.number)}
          className="flex items-center gap-1 self-end text-label-m text-text-brand hover:underline"
        >
          Verify draw <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </article>
  );
}

// ── MOB-04 sticky participate bar ─────────────────────────────────────────────────────────────

function StickyParticipateBar({
  round,
  active,
  now,
  restricted,
  member,
  canEnter,
  onParticipate,
}: {
  round: PoolRoundView | null;
  active: boolean;
  now: number | null;
  restricted: boolean;
  member: boolean;
  canEnter: boolean;
  onParticipate: () => void;
}) {
  const left = round && active && now !== null ? hmsUntil(round.closesAt, now) : null;
  return (
    <div
      className="sticky bottom-[calc(var(--gp-tabbar-h)+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border-subtle bg-surface-overlay/95 px-4 py-3 shadow-elevation-3 backdrop-blur-md tablet:hidden"
      data-testid="pool-sticky-bar"
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-caption text-text-secondary" suppressHydrationWarning>
            {round
              ? active
                ? `Round ${formatRoundNumber(round.number)} · closes in ${left ? clock(left) : '—'}`
                : `Round ${formatRoundNumber(round.number)} · not open for entries`
              : 'No round open'}
          </span>
          <span className="text-label-m text-text-primary">10.00 + 0.05 USDT fee / entry</span>
        </div>
        {restricted ? (
          <Button variant="gold" size="l" disabled>
            Not available
          </Button>
        ) : (
          <Button
            variant="gold"
            size="l"
            leadingIcon={<Ticket aria-hidden />}
            onClick={onParticipate}
            disabled={!active || (member && !canEnter)}
          >
            {member ? 'Participate' : 'Sign in'}
          </Button>
        )}
      </div>
      <RiskLine className="mt-2">
        You can lose your stake. Odds are shown before you confirm.
      </RiskLine>
    </div>
  );
}
