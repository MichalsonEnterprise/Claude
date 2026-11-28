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
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  CircleX,
  Copy,
  Hourglass,
  ListOrdered,
  Lock,
  RefreshCw,
  ShieldCheck,
  Ticket,
  TriangleAlert,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { EntryTicket } from '@/components/home/art';
import { initialsOf } from '@/components/home/primitives';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api/client';
import type {
  MyRoundEntries,
  PoolRoundView,
  PoolVerification,
  PoolWinnerView,
} from '@/lib/api/pool';
import { cn } from '@/lib/utils';

import {
  approxPercent,
  clock,
  hmsOf,
  hmsUntil,
  roundPhase,
  shortHash,
  type RoundPhase,
  oddsFor,
} from './logic';
import {
  Callout,
  CardHeading,
  KV,
  LicenceStrip,
  POOL_ROUTES,
  PoolPageHeader,
  PoolTabs,
  PrizeDistributionCard,
  QueryError,
  RoundStatusBadge,
  Steps,
  ThresholdCard,
  cardCls,
  type StepItem,
} from './parts';
import {
  useCurrentRound,
  useLivePool,
  useMyRoundEntries,
  useNow,
  useRound,
  useVerification,
  useViewer,
} from './use-pool';

/** VRF_TIMEOUT_HOURS (API default): no randomness within this window → the round is cancelled and stakes go to Owed. */
const VRF_TIMEOUT_HOURS = 24;

/**
 * /pool/rounds/[number] — one route, status-driven:
 *   open/scheduled → round summary (entries are bought on the hub)
 *   closed/drawing → GP-05 drawing (VRF stepper requested → fulfilled → settled) or the GP-13 "VRF delayed" state
 *   settled        → GP-07 public results + GP-06 "your result" (signed-in players with entries) + GP-09 facts
 *   cancelled      → GP-09 cancelled → refunds (+ the player's refund)
 */
export function RoundPage({ number }: { number: number }) {
  const q = useRound(number);
  const now = useNow();
  useLivePool(
    q.data?.status === 'open' || q.data?.status === 'drawing' || q.data?.status === 'closed',
  );
  const round = q.data;
  const phase: RoundPhase | null = round
    ? roundPhase(round, now ?? Date.parse(round.closesAt))
    : null;
  const mine = useMyRoundEntries(round);
  const { member } = useViewer();

  const crumbs = [
    { label: 'Lobby', href: '/' },
    { label: 'Global Pool', href: POOL_ROUTES.hub },
    { label: 'Round history', href: POOL_ROUTES.history },
    { label: formatRoundNumber(number) },
  ];

  if (q.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <PoolPageHeader crumbs={crumbs} title={`Round ${formatRoundNumber(number)}`} />
        <Skeleton className="h-72 rounded-2xl" />
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }
  if (q.isError) {
    const notFound = q.error instanceof ApiRequestError && q.error.status === 404;
    return (
      <div className="flex flex-col gap-6">
        <PoolPageHeader crumbs={crumbs} title={`Round ${formatRoundNumber(number)}`} />
        {notFound ? (
          <div className={cardCls}>
            <EmptyState
              title={`Round ${formatRoundNumber(number)} doesn’t exist`}
              description="Check the round number, or browse every round in the history."
              actions={
                <Button variant="secondary" asChild>
                  <Link href={POOL_ROUTES.history}>Round history</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <QueryError error={q.error} onRetry={() => void q.refetch()} />
        )}
      </div>
    );
  }

  const r = round!;
  const title =
    phase === 'drawing' || phase === 'delayed' || phase === 'closing'
      ? `Round ${r.numberLabel} draw`
      : phase === 'settled'
        ? `Round ${r.numberLabel} results`
        : `Round ${r.numberLabel}`;
  const badge =
    phase === 'delayed' ? (
      <StatusBadge status="under_review" label="Draw delayed" />
    ) : (
      <RoundStatusBadge status={r.status} size="m" />
    );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <PoolPageHeader
        crumbs={crumbs}
        title={title}
        badges={
          <>
            {badge}
            {r.isDemo && <DemoBadge size="s" />}
          </>
        }
        actions={
          r.status === 'settled' ? (
            <>
              <CopyLinkButton />
              <Button variant="secondary" asChild leadingIcon={<ShieldCheck aria-hidden />}>
                <Link href={POOL_ROUTES.verify(r.number)}>Verify this draw</Link>
              </Button>
            </>
          ) : (
            <Button variant="secondary" asChild leadingIcon={<ArrowLeft aria-hidden />}>
              <Link href={POOL_ROUTES.hub}>Back to Global Pool</Link>
            </Button>
          )
        }
      />
      <PoolTabs active={null} entries={member ? mine.data?.entries : undefined} />

      {phase === 'settled' ? (
        <SettledView round={r} mine={member ? mine.data : undefined} />
      ) : phase === 'cancelled' ? (
        <CancelledView round={r} mine={member ? mine.data : undefined} />
      ) : phase === 'drawing' || phase === 'delayed' || phase === 'closing' ? (
        <DrawingView round={r} phase={phase} now={now} mine={member ? mine.data : undefined} />
      ) : (
        <OpenView round={r} now={now} mine={member ? mine.data : undefined} />
      )}

      <LicenceStrip />
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      leadingIcon={<Copy aria-hidden />}
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? 'Link copied' : 'Share results'}
    </Button>
  );
}

// ── shared banner ─────────────────────────────────────────────────────────────────────────────

function RoundBanner({
  round,
  overline,
  overlineTone = 'brand',
  heading,
  amountCaption,
  facts,
  ticketState,
  children,
}: {
  round: PoolRoundView;
  overline: React.ReactNode;
  overlineTone?: 'brand' | 'warning' | 'gold' | 'muted';
  heading: React.ReactNode;
  amountCaption?: React.ReactNode;
  facts?: React.ReactNode;
  ticketState: string;
  children?: React.ReactNode;
}) {
  const amount =
    round.status === 'cancelled'
      ? money(round.entryPrice).times(round.entries).toFixed(2)
      : round.poolBalance;
  return (
    <section
      className={cn(cardCls, 'relative overflow-hidden rounded-2xl p-5 tablet:p-8 laptop:p-10')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden laptop:block"
      >
        <div
          className={cn(
            'absolute -top-16 right-[-120px] h-[170%] w-[300px] -rotate-[24deg]',
            round.status === 'cancelled' ? 'bg-surface-raised' : 'bg-accent-gold-tint-strong',
          )}
        />
        <div
          className={cn(
            'absolute -top-16 right-[220px] h-[170%] w-[26px] -rotate-[24deg]',
            round.status === 'cancelled' ? 'bg-status-warning/70' : 'bg-brand',
          )}
        />
        <EntryTicket
          entryId={`E-${round.number}-00001`}
          roundLabel={`Round ${formatRoundNumber(round.number)}`}
          settled={round.status === 'settled'}
          className="absolute top-10 right-[-70px] rotate-[10deg]"
        />
        <span className="absolute right-[120px] bottom-10 inline-flex items-center gap-2 rounded-full border border-border-brand bg-bg-base px-3 py-1.5 text-label-s text-text-primary">
          <Lock aria-hidden className="size-3.5 text-icon-brand" /> {ticketState}
        </span>
      </div>
      <div className="relative flex max-w-[680px] flex-col gap-4">
        <p
          className={cn(
            'flex flex-wrap items-center gap-2 text-overline uppercase',
            overlineTone === 'brand' && 'text-text-brand',
            overlineTone === 'warning' && 'text-text-warning',
            overlineTone === 'gold' && 'text-text-gold',
            overlineTone === 'muted' && 'text-text-tertiary',
          )}
        >
          {overline}
        </p>
        <h2 className="text-h3 text-text-primary tablet:text-h2">{heading}</h2>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold leading-none tabular-nums">
          <span
            className={cn(
              'text-[length:clamp(36px,7vw,64px)] tracking-[-0.03em]',
              round.status === 'cancelled'
                ? 'text-text-secondary'
                : 'bg-gradient-gold-jackpot bg-clip-text text-transparent',
            )}
          >
            {formatUSDT(amount, { symbol: false })}
          </span>
          <span
            className={cn(
              'text-h4',
              round.status === 'cancelled' ? 'text-text-secondary' : 'text-text-gold',
            )}
          >
            USDT
          </span>
          {round.isDemo && <DemoBadge size="s" />}
        </p>
        {amountCaption && <p className="text-body-s text-text-secondary">{amountCaption}</p>}
        {facts && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-caption text-text-secondary">
            {facts}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

const Fact = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 [&_svg]:size-4 [&_svg]:text-icon-muted">
    {icon}
    {children}
  </span>
);

// ── draw progress (GP-05) ─────────────────────────────────────────────────────────────────────

function drawSteps(
  round: PoolRoundView,
  phase: RoundPhase,
  verify: PoolVerification | undefined,
): StepItem[] {
  const d = round.draw;
  const word = verify?.randomness?.randomWord ?? null;
  const t = (iso: string | null | undefined) =>
    iso ? `${formatTimeUTC(iso, { seconds: true })}` : undefined;
  const responseSecs =
    d?.fulfilledAt && d.requestedAt
      ? Math.max(0, Math.round((Date.parse(d.fulfilledAt) - Date.parse(d.requestedAt)) / 1000))
      : null;
  const settled = round.status === 'settled';
  return [
    {
      id: 'requested',
      state: d ? 'done' : phase === 'closing' ? 'next' : 'current',
      title: d ? 'Randomness requested' : 'Requesting randomness',
      meta: t(d?.requestedAt),
      description: d
        ? `Round closed at ${formatTimeUTC(round.closedAt ?? round.closesAt, { seconds: true })}; request ${shortHash(d.requestId)} was sent right after close.`
        : `Entries froze at ${formatTimeUTC(round.closedAt ?? round.closesAt, { seconds: true })}. The request is sent on the next lifecycle tick (every 30 s).`,
    },
    {
      id: 'awaiting',
      state: !d ? 'next' : d.fulfilledAt ? 'done' : phase === 'delayed' ? 'warning' : 'current',
      title: d?.fulfilledAt ? 'VRF response received' : 'Awaiting VRF response',
      meta: responseSecs !== null ? `${responseSecs} s` : undefined,
      description: d?.fulfilledAt
        ? `Delivered by the ${d.provider === 'mock' ? 'DEV mock randomness provider' : 'Chainlink oracle network'}.`
        : phase === 'delayed'
          ? 'Overdue — the typical response is 30–90 s. Nobody can pick winners while the draw waits.'
          : 'Usually 30–90 seconds.',
    },
    {
      id: 'fulfilled',
      state: d?.fulfilledAt ? 'done' : 'next',
      title: 'Randomness fulfilled',
      meta: d?.fulfilledAt
        ? `${t(d.fulfilledAt)}${d.confirmations ? ` · ${d.confirmations} conf.` : ''}`
        : undefined,
      description: word
        ? `Random word ${shortHash(word, 6, 4)} — it can’t be altered.`
        : 'The random word is recorded with its proof.',
    },
    {
      id: 'settled',
      state: settled ? 'done' : d?.fulfilledAt ? 'current' : 'next',
      title: settled ? 'Round settled' : 'Settling winners',
      meta: settled ? t(round.settledAt) : d?.fulfilledAt ? 'in progress' : undefined,
      description: settled
        ? '13 winning entries selected from the random word; prizes credited to Owed.'
        : 'The random word is mapped to 13 winning entries and prizes are credited.',
    },
  ];
}

function DrawProgressCard({ round, phase }: { round: PoolRoundView; phase: RoundPhase }) {
  const verify = useVerification(round.number);
  const d = round.draw;
  const provider =
    d?.provider === 'mock' ? 'DEV mock VRF (testnet build)' : 'Chainlink VRF · Arbitrum Sepolia';
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-5 p-5 tablet:p-6')}>
      <CardHeading
        icon={<Activity aria-hidden className="size-5 text-icon-brand" />}
        title="Draw progress"
        sub="Live from the round lifecycle — this page updates by itself, no refresh needed."
      />
      <div className="flex flex-col gap-4 rounded-lg border border-border-subtle p-4 tablet:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-label-l text-text-primary">Draw randomness</p>
            <p className="text-caption text-text-tertiary">
              {provider} · Round {formatRoundNumber(round.number)}
            </p>
          </div>
          <span className="flex items-center gap-1.5">
            <StatusBadge
              status={
                phase === 'delayed' ? 'under_review' : d?.fulfilledAt ? 'approved' : 'processing'
              }
              label={
                phase === 'delayed'
                  ? 'Delayed'
                  : d?.fulfilledAt
                    ? 'Fulfilled'
                    : d
                      ? 'Requested'
                      : 'Pending'
              }
            />
            {round.isDemo && <DemoBadge size="xs" />}
          </span>
        </div>
        <Steps steps={drawSteps(round, phase, verify.data)} />
        {d && (
          <div className="flex flex-col gap-1 rounded-md bg-surface-raised px-3 py-2.5">
            <span className="text-caption text-text-tertiary">Randomness request ID</span>
            <span className="font-mono text-mono-s break-all text-text-primary">{d.requestId}</span>
          </div>
        )}
        <p className="flex items-start gap-2 text-caption text-text-tertiary">
          <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-icon-brand" />
          The result comes only from verifiable randomness — it can’t be chosen or edited by anyone.
        </p>
      </div>
      <dl className="grid gap-x-8 gap-y-2.5 tablet:grid-cols-2">
        <KV label="Requested" value={d ? formatDateTimeUTC(d.requestedAt) : '—'} />
        <KV
          label="Settlement"
          value={
            round.status === 'settled'
              ? `Settled ${formatTimeUTC(round.settledAt!, { seconds: true })}`
              : phase === 'delayed'
                ? 'Waiting for randomness'
                : 'In progress'
          }
          valueClassName={round.status === 'settled' ? 'text-text-success' : 'text-text-info'}
        />
        <KV
          label="Fulfilled"
          value={d?.fulfilledAt ? `${formatTimeUTC(d.fulfilledAt, { seconds: true })}` : '—'}
        />
        <KV
          label="Random word"
          value={
            <span className="font-mono text-mono-s">
              {verify.data?.randomness?.randomWord
                ? shortHash(verify.data.randomness.randomWord)
                : '—'}
            </span>
          }
        />
      </dl>
    </article>
  );
}

function YourEntriesCard({
  round,
  mine,
  locked,
}: {
  round: PoolRoundView;
  mine: MyRoundEntries;
  locked: boolean;
}) {
  const fee = mine.platformFee;
  const paid = money(mine.entryAmount).plus(fee).toFixed(2);
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-4 p-5 tablet:p-6')}>
      <CardHeading
        icon={<Ticket aria-hidden className="size-5 text-icon-brand" />}
        title="Your entries"
        action={locked ? <StatusBadge status="neutral" label="Locked" /> : undefined}
      />
      <p className="flex items-baseline gap-2">
        <span className="text-number-l text-text-primary tabular-nums">
          {formatCount(mine.entries)}
        </span>
        <span className="text-body-s text-text-secondary">
          entries in round {formatRoundNumber(round.number)}
        </span>
        {round.isDemo && <DemoBadge size="xs" />}
      </p>
      <dl className="flex flex-col gap-2.5">
        <KV
          label="Entries"
          value={`${formatCount(mine.entries)} × ${round.entryPrice} = ${formatUSDT(mine.entryAmount)}`}
        />
        <KV label="Platform fee" value={formatUSDT(fee)} />
        <KV label="Paid" value={formatUSDT(paid)} valueClassName="text-label-l" />
        <div className="border-t border-border-subtle pt-2.5">
          <KV
            label="Entry IDs"
            value={
              <span className="font-mono text-mono-s">
                {mine.firstEntryId} … {mine.lastEntryId?.split('-').at(-1)}
              </span>
            }
          />
        </div>
      </dl>
      {mine.odds && (
        <p className="text-caption text-text-tertiary">
          Chance of any prize {approxPercent(mine.odds.anyPrizePercent)} · 1st prize{' '}
          {approxPercent(mine.odds.firstPrizePercent)}. Entries can’t be added or cancelled after{' '}
          {formatTimeUTC(round.closedAt ?? round.closesAt, { seconds: true })}.
        </p>
      )}
      <Button variant="secondary" asChild>
        <Link href={POOL_ROUTES.entries}>
          View my {formatCount(mine.entries)} entries <ArrowRight aria-hidden />
        </Link>
      </Button>
    </article>
  );
}

function NextRoundCard({ excluding }: { excluding: number }) {
  const current = useCurrentRound();
  const next = current.data && current.data.number !== excluding ? current.data : null;
  return (
    <article className={cn(cardCls, 'flex flex-col gap-2 p-5')}>
      <CardHeading
        icon={<CalendarClock aria-hidden className="size-5 text-icon-muted" />}
        title="Next round"
        as="h3"
      />
      <p className="text-body-s text-text-secondary">
        {next
          ? `Round ${formatRoundNumber(next.number)} ${next.status === 'open' ? 'is open — it closes' : 'opens ' + formatDateTimeUTC(next.opensAt) + ' and closes'} ${formatDateTimeUTC(next.closesAt)}.`
          : 'The next round appears here as soon as it is scheduled (rounds run daily 08:00–20:00 UTC).'}
      </p>
      <p className="text-caption text-text-tertiary">
        Auto re-entry is off. You only join a round when you choose to.
      </p>
      {next?.status === 'open' && (
        <Button variant="secondary" size="s" asChild className="self-start">
          <Link href={POOL_ROUTES.hub}>Go to round {formatRoundNumber(next.number)}</Link>
        </Button>
      )}
    </article>
  );
}

function WhatHappensNext() {
  const items: [string, string][] = [
    [
      'Winners are settled',
      'The random word is mapped to 13 winning entries with the published algorithm — usually within a minute or two of fulfilment.',
    ],
    [
      'Prizes are credited',
      'Winners see their prize in Owed immediately and can claim it to Available from the wallet at any time.',
    ],
    [
      'Results go public',
      'Winners, the random word and the request ID are published on the results page, so anyone can verify the draw.',
    ],
  ];
  return (
    <article className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
      <CardHeading
        icon={<ListOrdered aria-hidden className="size-5 text-icon-brand" />}
        title="What happens next"
      />
      <ol className="grid gap-3 laptop:grid-cols-3">
        {items.map(([t, d], i) => (
          <li key={t} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">
              {i + 1}
            </span>
            <span className="text-label-l text-text-primary">{t}</span>
            <span className="text-body-s text-text-secondary">{d}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function DrawingView({
  round,
  phase,
  now,
  mine,
}: {
  round: PoolRoundView;
  phase: RoundPhase;
  now: number | null;
  mine: MyRoundEntries | undefined;
}) {
  const d = round.draw;
  const delayed = phase === 'delayed';
  const waited = d && now !== null ? Math.max(0, now - Date.parse(d.requestedAt)) : 0;
  const deadline = d
    ? new Date(Date.parse(d.requestedAt) + VRF_TIMEOUT_HOURS * 3_600_000).toISOString()
    : null;
  return (
    <>
      {delayed && (
        <Callout
          tone="warning"
          icon={<TriangleAlert />}
          title="Taking longer than usual — your entries are safe"
        >
          The randomness provider hasn’t answered request {d ? shortHash(d.requestId) : ''} yet
          (sent {d ? formatTimeUTC(d.requestedAt, { seconds: true }) : '—'}, waiting{' '}
          <span suppressHydrationWarning>{clock(hmsOf(waited))}</span>). Nothing to do — this page
          updates by itself.
        </Callout>
      )}
      <RoundBanner
        round={round}
        overline={
          <>
            <Lock aria-hidden className="size-4" /> Entries closed{' '}
            {formatTimeUTC(round.closedAt ?? round.closesAt, { seconds: true })} ·{' '}
            {delayed ? 'draw delayed' : 'drawing now'}
          </>
        }
        overlineTone={delayed ? 'warning' : 'brand'}
        heading={
          delayed
            ? 'Waiting for the randomness provider to answer.'
            : d?.fulfilledAt
              ? 'Randomness received. Settling the 13 winners.'
              : 'Entries are frozen. Requesting randomness for the draw.'
        }
        amountCaption={`Prize pool for 13 winners. Platform fees (${formatUSDT(round.platformFees)}) are not part of the pool.`}
        facts={
          <>
            <Fact icon={<Users />}>{formatCount(round.participants)} participants</Fact>
            <Fact icon={<Ticket />}>{formatCount(round.entries)} qualifying entries</Fact>
            <Fact icon={<ShieldCheck />}>
              {d?.provider === 'mock' ? 'DEV mock VRF' : 'Chainlink VRF · Arbitrum'}
            </Fact>
          </>
        }
        ticketState={`Locked at ${formatTimeUTC(round.closedAt ?? round.closesAt, { seconds: true })}`}
      />
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <DrawProgressCard round={round} phase={phase} />
          {delayed ? (
            <article className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
              <CardHeading
                icon={<ShieldCheck aria-hidden className="size-5 text-icon-brand" />}
                title="What this means for you"
              />
              <ul className="flex flex-col gap-3">
                {(
                  [
                    [
                      <Lock key="i" />,
                      'Your entries are safe',
                      'Every entry stays locked in the round. Nobody — including GLOBAL POOL — can pick winners while the draw waits.',
                    ],
                    [
                      <RefreshCw key="i" />,
                      'It resolves automatically',
                      'When the randomness arrives, settlement runs exactly as normal.',
                    ],
                    [
                      <Hourglass key="i" />,
                      'Refund if it can’t complete',
                      deadline
                        ? `No randomness by ${formatDateTimeUTC(deadline)} → the round is cancelled under the round rules and every stake goes to Owed.`
                        : 'If the randomness never arrives, the round is cancelled and every stake goes to Owed.',
                    ],
                  ] as [React.ReactNode, string, string][]
                ).map(([icon, t, desc]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 text-icon-brand [&_svg]:size-5">{icon}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-label-l text-text-primary">{t}</span>
                      <span className="text-body-s text-text-secondary">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ) : (
            <WhatHappensNext />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {mine && mine.entries > 0 && <YourEntriesCard round={round} mine={mine} locked />}
          <NextRoundCard excluding={round.number} />
        </div>
      </div>
    </>
  );
}

// ── open round (entries are bought on the hub) ────────────────────────────────────────────────

function OpenView({
  round,
  now,
  mine,
}: {
  round: PoolRoundView;
  now: number | null;
  mine: MyRoundEntries | undefined;
}) {
  const upcoming =
    round.status === 'scheduled' || (now !== null && now < Date.parse(round.opensAt));
  const target = upcoming ? round.opensAt : round.closesAt;
  const left = now !== null ? hmsUntil(target, now) : null;
  return (
    <>
      <RoundBanner
        round={round}
        overline={
          upcoming ? (
            <>Scheduled · opens {formatDateTimeUTC(round.opensAt)}</>
          ) : (
            <>Open · closes {formatDateTimeUTC(round.closesAt)}</>
          )
        }
        heading={
          <span suppressHydrationWarning>
            {upcoming ? 'Opens in ' : 'Closes in '}
            {left ? clock(left) : '—'}
          </span>
        }
        amountCaption={`Pool balance · ${formatCount(round.entries)} qualifying entries · platform fees (${formatUSDT(round.platformFees)}) excluded`}
        ticketState={upcoming ? 'Not open yet' : 'In the draw'}
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="gold" size="l" asChild leadingIcon={<Ticket aria-hidden />}>
            <Link href={POOL_ROUTES.hub}>Go to Global Pool</Link>
          </Button>
        </div>
      </RoundBanner>
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_340px]">
        <ThresholdCard round={round} demo={round.isDemo} />
        {mine && mine.entries > 0 ? (
          <YourEntriesCard round={round} mine={mine} locked={false} />
        ) : (
          <NextRoundCard excluding={round.number} />
        )}
      </div>
      <PrizeDistributionCard
        roundNumber={round.number}
        pool={round.poolBalance}
        tiers={
          round.prizeDistribution.length
            ? round.prizeDistribution
            : prizeBreakdown(round.poolBalance).tiers
        }
        demo={round.isDemo}
        platformFees={round.platformFees}
      />
    </>
  );
}

// ── settled (GP-07 public + GP-06 your result) ────────────────────────────────────────────────

const PLACE = (w: PoolWinnerView) =>
  w.tier === 'runner_up'
    ? 'Runner-up'
    : ((['1st', '2nd', '3rd'] as const)[w.place - 1] ?? `#${w.place}`);

function SettledView({ round, mine }: { round: PoolRoundView; mine: MyRoundEntries | undefined }) {
  const verify = useVerification(round.number);
  const top = round.winners.slice(0, 3);
  return (
    <>
      <RoundBanner
        round={round}
        overlineTone="gold"
        overline={
          <>
            <CircleCheck aria-hidden className="size-4" /> Settled{' '}
            {round.settledAt ? formatDateTimeUTC(round.settledAt) : ''} ·{' '}
            {round.draw?.provider === 'mock' ? 'DEV mock VRF' : 'Chainlink VRF on Arbitrum'}
          </>
        }
        heading={
          round.winners.length
            ? `paid to ${round.winners.length} winners — 100% of the pool.`
            : 'Settled.'
        }
        facts={
          <>
            <Fact icon={<Users />}>
              {round.participants ? formatCount(round.participants) : '—'} participants · min{' '}
              {formatCount(round.thresholds.minParticipants)}
            </Fact>
            <Fact icon={<Ticket />}>{formatCount(round.entries)} qualifying entries</Fact>
            <Fact icon={<Wallet />}>
              {formatUSDT(round.platformFees)} platform fees — not in the pool
            </Fact>
          </>
        }
        ticketState={top[0] ? `1st prize · @${top[0].handle ?? 'hidden'}` : 'Settled'}
      >
        <p className="text-caption text-text-tertiary">
          Entries closed {formatTimeUTC(round.closedAt ?? round.closesAt, { seconds: true })}
          {round.draw?.fulfilledAt
            ? ` · randomness fulfilled ${formatTimeUTC(round.draw.fulfilledAt, { seconds: true })}`
            : ''}
          {round.settledAt
            ? ` · winners settled ${formatTimeUTC(round.settledAt, { seconds: true })}`
            : ''}
        </p>
      </RoundBanner>

      {mine && mine.entries > 0 && <YourResultCard round={round} mine={mine} />}

      {top.length > 0 && (
        <ul className="grid gap-4 tablet:grid-cols-3" aria-label="Top prizes">
          {top.map((w) => (
            <li key={w.place} className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
              <div className="flex items-center gap-3">
                <Avatar initials={initialsOf(w.handle ?? '??')} size="l" tone="brand" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-label-l text-text-primary">
                    {w.handle ? `@${w.handle}` : 'Hidden'}
                  </span>
                  <span className="font-mono text-mono-s text-text-tertiary">
                    {w.entryId ?? '—'}
                  </span>
                </div>
                {round.isDemo && <DemoBadge size="xs" className="ml-auto" />}
              </div>
              <div className="rounded-lg border border-border-gold bg-accent-gold-tint p-3">
                <p className="text-overline text-text-gold uppercase">
                  {PLACE(w)} prize ·{' '}
                  {round.prizeDistribution.find((t) => t.tier === w.tier)?.sharePercent ?? '—'}% of
                  pool
                </p>
                <p className="text-number-m text-text-gold tabular-nums">{formatUSDT(w.amount)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <WinnersTable round={round} highlight={mine?.entryIds ?? []} />
        <div className="flex min-w-0 flex-col gap-4">
          <PrizeDistributionCard
            roundNumber={round.number}
            pool={round.poolBalance}
            tiers={
              round.prizeDistribution.length
                ? round.prizeDistribution
                : prizeBreakdown(round.poolBalance).tiers
            }
            demo={round.isDemo}
            platformFees={round.platformFees}
          />
          <RoundFacts round={round} />
        </div>
      </div>

      <ProvablyFairCard round={round} verify={verify.data} />
    </>
  );
}

function YourResultCard({ round, mine }: { round: PoolRoundView; mine: MyRoundEntries }) {
  const won = round.winners.filter((w) => w.entryId && mine.entryIds.includes(w.entryId));
  const prize = won.reduce((a, w) => a.plus(money(w.amount)), money(0)).toFixed(2);
  const paid = money(mine.entryAmount).plus(mine.platformFee).toFixed(2);
  const odds = round.entries > 0 ? oddsFor(mine.entries, round.entries) : null;
  return (
    <section
      aria-labelledby="your-result"
      className={cn(
        cardCls,
        'flex flex-col gap-4 p-5 tablet:flex-row tablet:items-center tablet:justify-between tablet:p-6',
        won.length > 0 && 'border-border-gold',
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-lg',
            won.length ? 'bg-accent-gold-tint text-text-gold' : 'bg-surface-raised text-icon-muted',
          )}
        >
          {won.length ? (
            <Trophy aria-hidden className="size-6" />
          ) : (
            <CircleX aria-hidden className="size-6" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <Overline2>Your result · round {formatRoundNumber(round.number)}</Overline2>
          <h2 id="your-result" className="text-h4 text-text-primary">
            {won.length
              ? `You won ${won.length === 1 ? `a ${PLACE(won[0]!).toLowerCase()} prize` : `${won.length} prizes`}: ${formatUSDT(prize)}`
              : 'Not selected this time.'}
          </h2>
          <p className="text-body-s text-text-secondary">
            {won.length
              ? `Winning ${won.length === 1 ? 'entry' : 'entries'} ${won.map((w) => w.entryId).join(', ')} — selected by the randomness, like every other entry. The prize is in your Owed balance; claim it to Available from the wallet at any time.`
              : `None of your ${formatCount(mine.entries)} entries were drawn. Every qualifying entry had the same chance${odds ? ` (yours: ${approxPercent(odds.anyPrizePercent)} for any prize)` : ''}, and anyone can check the draw.`}
          </p>
          <p className="text-caption text-text-tertiary">
            {formatCount(mine.entries)} entries · {formatUSDT(paid)} paid incl.{' '}
            {formatUSDT(mine.platformFee)} platform fees. Past rounds never change the odds of the
            next one.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 tablet:flex-col tablet:items-stretch">
        {won.length > 0 && (
          <Button variant="primary" asChild leadingIcon={<Wallet aria-hidden />}>
            <Link href={POOL_ROUTES.wallet}>Go to wallet</Link>
          </Button>
        )}
        <Button variant="secondary" asChild>
          <Link href={POOL_ROUTES.entries}>View all {formatCount(mine.entries)} entries</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href={POOL_ROUTES.rg}>Set limits</Link>
        </Button>
      </div>
    </section>
  );
}

const Overline2 = ({ children }: { children: React.ReactNode }) => (
  <p className="text-overline text-text-tertiary uppercase">{children}</p>
);

function WinnersTable({ round, highlight }: { round: PoolRoundView; highlight: string[] }) {
  const total = round.winners.reduce((a, w) => a.plus(money(w.amount)), money(0)).toFixed(2);
  return (
    <section
      className={cn(cardCls, 'flex min-w-0 flex-col gap-3 p-5 tablet:p-6')}
      aria-labelledby="all-winners"
    >
      <CardHeading
        title={<span id="all-winners">All {round.winners.length} winners</span>}
        demo={round.isDemo}
        sub="One entry can win at most one prize. Handles are public display names chosen by players."
      />
      {round.winners.length === 0 ? (
        <p className="text-body-s text-text-secondary">No winners recorded.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto tablet:-mx-6">
          <table className="w-full min-w-[480px] text-body-s">
            <thead className="text-left text-caption text-text-tertiary">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium tablet:px-6">
                  Prize
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Player
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Winning entry
                </th>
                <th scope="col" className="px-5 py-2 text-right font-medium tablet:px-6">
                  Amount (USDT)
                </th>
              </tr>
            </thead>
            <tbody>
              {round.winners.map((w) => {
                const me = Boolean(w.entryId && highlight.includes(w.entryId));
                return (
                  <tr
                    key={w.place}
                    className={cn(
                      'border-t border-border-subtle',
                      w.place <= 3 && 'bg-accent-gold-tint/40',
                      me && 'bg-brand-tint',
                    )}
                  >
                    <td
                      className={cn(
                        'px-5 py-2.5 tablet:px-6',
                        w.place <= 3 ? 'text-label-m text-text-gold' : 'text-text-secondary',
                      )}
                    >
                      {PLACE(w)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <Avatar initials={initialsOf(w.handle ?? '??')} size="xs" tone="brand" />
                        <span className="text-text-primary">
                          {w.handle ? `@${w.handle}` : 'Hidden'}
                        </span>
                        {me && <StatusBadge status="new" label="You" />}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-mono-s text-text-tertiary">
                      {w.entryId ?? '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right text-label-m text-text-primary tabular-nums tablet:px-6">
                      {formatUSDT(w.amount, { symbol: false })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-default">
                <td colSpan={3} className="px-5 py-3 text-label-m text-text-primary tablet:px-6">
                  Total paid to winners
                </td>
                <td className="px-5 py-3 text-right text-label-m text-text-primary tabular-nums tablet:px-6">
                  {formatUSDT(total)}
                  <span className="block text-caption text-text-tertiary">
                    {money(total).eq(money(round.poolBalance))
                      ? '100% of pool'
                      : `of ${formatUSDT(round.poolBalance)} pool`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function RoundFacts({ round }: { round: PoolRoundView }) {
  const per = round.entries > 0 ? oddsFor(1, round.entries) : null;
  const pool =
    round.status === 'cancelled'
      ? money(round.entryPrice).times(round.entries).toFixed(2)
      : round.poolBalance;
  return (
    <article className={cn(cardCls, 'flex flex-col gap-3 p-5 tablet:p-6')}>
      <CardHeading title="Round facts" demo={round.isDemo} as="h3" />
      <dl className="flex flex-col gap-2.5">
        <KV label="Opened" value={formatDateTimeUTC(round.openedAt)} />
        <KV label="Entries closed" value={formatDateTimeUTC(round.closesAt)} />
        <KV
          label="Participants"
          value={`${round.participants ? formatCount(round.participants) : '—'} · minimum ${formatCount(round.thresholds.minParticipants)}`}
        />
        <KV
          label={round.status === 'cancelled' ? 'Pool at close' : 'Prize pool'}
          value={`${formatUSDT(pool)} · minimum ${formatUSDT(round.thresholds.minPool, { symbol: false })}`}
        />
        <KV
          label="Entry price"
          value={`${round.entryPrice} USDT + ${round.platformFeePerEntry} USDT platform fee`}
        />
        <KV
          label="Platform fees"
          value={`${formatUSDT(round.platformFees)} — not part of the pool`}
        />
        {per && (
          <KV
            label="Chance per entry"
            value={`1 / ${formatCount(round.entries)} for 1st · ${approxPercent(per.anyPrizePercent)} for any prize`}
          />
        )}
        <KV
          label="Randomness"
          value={
            round.draw
              ? round.draw.provider === 'mock'
                ? 'DEV mock VRF'
                : 'Chainlink VRF v2.5'
              : 'Not requested'
          }
        />
      </dl>
    </article>
  );
}

function ProvablyFairCard({
  round,
  verify,
}: {
  round: PoolRoundView;
  verify: PoolVerification | undefined;
}) {
  const r = verify?.randomness;
  const phase: RoundPhase = 'settled';
  return (
    <section
      className={cn(cardCls, 'flex flex-col gap-5 p-5 tablet:p-6')}
      aria-labelledby="pf-title"
    >
      <CardHeading
        icon={<ShieldCheck aria-hidden className="size-5 text-icon-brand" />}
        title={<span id="pf-title">Provably fair result</span>}
        sub="Re-run this draw yourself — no account needed. Every value comes from the public round record."
      />
      {r ? (
        <div className="grid gap-6 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Steps steps={drawSteps(round, phase, verify)} />
          <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-2.5">
              <KV
                label="Random word"
                value={
                  <span className="font-mono text-mono-s">
                    {r.randomWord ? shortHash(r.randomWord, 8, 6) : '—'}
                  </span>
                }
              />
              <KV
                label="Request ID"
                value={
                  <span className="font-mono text-mono-s">{shortHash(r.requestId, 10, 6)}</span>
                }
              />
              <KV
                label="Requested · fulfilled"
                value={`${formatTimeUTC(r.requestedAt, { seconds: true }).replace(' UTC', '')} · ${r.fulfilledAt ? formatTimeUTC(r.fulfilledAt, { seconds: true }) : '—'}`}
              />
              <KV
                label="Provider"
                value={
                  r.provider === 'mock' ? 'DEV mock VRF (testnet build)' : 'Chainlink VRF v2.5'
                }
              />
              <KV label="Winner rule" value={verify.algorithm.name} />
              <KV
                label="Stored result recomputed by the API"
                value={
                  verify.recomputed?.matchesStoredWinners
                    ? 'Matches'
                    : verify.recomputed?.matchesStoredWinners === false
                      ? 'Mismatch'
                      : '—'
                }
                valueClassName={
                  verify.recomputed?.matchesStoredWinners ? 'text-text-success' : undefined
                }
              />
            </dl>
            <p className="text-caption text-text-tertiary">
              The algorithm maps the random word to 13 distinct positions in the entry list; nobody
              — including GLOBAL POOL — can choose or change winners.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" asChild leadingIcon={<ShieldCheck aria-hidden />}>
                <Link href={POOL_ROUTES.verify(round.number)}>Verify this draw</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Callout tone="info" title="No randomness record for this round">
          This round is part of the DEMO history snapshot: its winners were imported without a
          random word, so there is nothing to re-derive. Rounds drawn by this platform publish their
          request ID and random word here.
        </Callout>
      )}
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        On-chain records (round registry contract, entry snapshot root, settlement attestation) are
        published once the testnet keeper mirrors rounds to Arbitrum Sepolia.
      </p>
    </section>
  );
}

// ── cancelled (GP-09) ─────────────────────────────────────────────────────────────────────────

function CancelledView({
  round,
  mine,
}: {
  round: PoolRoundView;
  mine: MyRoundEntries | undefined;
}) {
  const reason = round.cancellation?.reason ?? 'threshold_not_met';
  const poolAtClose = money(round.entryPrice).times(round.entries).toFixed(2);
  const myStake = mine?.entryAmount ?? '0.00';
  const closedAt = round.closedAt ?? round.closesAt;
  return (
    <>
      <RoundBanner
        round={round}
        overlineTone="warning"
        overline={
          <>
            <TriangleAlert aria-hidden className="size-4" /> Cancelled automatically at close ·{' '}
            {reason === 'vrf_timeout' ? 'randomness timed out' : 'threshold not met'}
          </>
        }
        heading={
          reason === 'vrf_timeout'
            ? 'No randomness arrived in time, so no winners were drawn.'
            : 'The minimums were not met at close, so no winners were drawn.'
        }
        amountCaption={`Pool at close · ${formatCount(round.entries)} entries. Every stake was refunded to its owner’s Owed balance.`}
        facts={
          <>
            <Fact icon={<CalendarClock />}>
              Opened {formatDateTimeUTC(round.openedAt)} · closed {formatDateTimeUTC(closedAt)}
            </Fact>
          </>
        }
        ticketState="Refunded to Owed"
      />
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,520fr)_minmax(0,600fr)]">
        <ThresholdCard round={{ ...round, poolBalance: poolAtClose }} demo={round.isDemo} />
        {mine && mine.entries > 0 ? (
          <article className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
            <CardHeading
              icon={<Wallet aria-hidden className="size-5 text-icon-gold" />}
              title="Your refund"
              demo={round.isDemo}
              action={<StatusBadge status="pending" label="In Owed" />}
            />
            <p className="text-number-l text-text-primary tabular-nums">{formatUSDT(myStake)}</p>
            <dl className="flex flex-col gap-2.5">
              <KV
                label={`Entry stakes · ${formatCount(mine.entries)} × ${round.entryPrice}`}
                value={`${formatUSDT(myStake)} → Owed`}
              />
              <KV
                label={`Platform fees · ${formatCount(mine.entries)} × ${round.platformFeePerEntry}`}
                value={`${formatUSDT(mine.platformFee)} · not refunded`}
              />
              <KV label="Network fee" value="0.00 USDT" />
              <KV
                label="Entry IDs"
                value={
                  <span className="font-mono text-mono-s">
                    {mine.firstEntryId} … {mine.lastEntryId?.split('-').at(-1)}
                  </span>
                }
              />
            </dl>
            <p className="text-caption text-text-tertiary">
              Owed funds already count toward your total balance. Claim them to Available from the
              wallet whenever you like — nothing expires. Platform fees are not refunded under the
              current platform rules.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" asChild leadingIcon={<Wallet aria-hidden />}>
                <Link href={POOL_ROUTES.wallet}>View in wallet</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href={POOL_ROUTES.entries}>Entry history</Link>
              </Button>
            </div>
          </article>
        ) : (
          <RoundFacts round={round} />
        )}
      </div>
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <article className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
          <CardHeading title="Refund timeline" sub="All times UTC" />
          <Steps
            steps={[
              {
                id: 'closed',
                state: 'done',
                title:
                  reason === 'vrf_timeout'
                    ? 'Randomness timed out'
                    : 'Round closed — threshold not met',
                meta: formatDateTimeUTC(closedAt),
                description:
                  reason === 'vrf_timeout'
                    ? `No random word arrived within ${VRF_TIMEOUT_HOURS} h of the request, so the round could not be drawn.`
                    : `${formatCount(round.participants)} of ${formatCount(round.thresholds.minParticipants)} players · ${formatUSDT(poolAtClose)} of ${formatUSDT(round.thresholds.minPool)}. No winners were drawn.`,
              },
              {
                id: 'owed',
                state: 'done',
                title: 'Stakes recorded as Owed',
                description: `${formatUSDT(poolAtClose)} returned to ${formatCount(round.participants)} players in one balanced ledger posting${mine?.entries ? ` — your ${formatUSDT(myStake)} included` : ''}.`,
              },
              {
                id: 'claim',
                state: mine?.entries ? 'current' : 'next',
                title: 'Claim to Available',
                description:
                  'Each player moves Owed funds to Available from the wallet when they choose. Nothing expires.',
              },
            ]}
          />
        </article>
        {mine && mine.entries > 0 ? (
          <RoundFacts round={round} />
        ) : (
          <NextRoundCard excluding={round.number} />
        )}
      </div>
    </>
  );
}
