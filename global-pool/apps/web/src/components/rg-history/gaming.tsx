'use client';

import type { EntryStatus } from '@gp/shared/enums';
import { formatCount, formatDateUTC, formatTimeUTC } from '@gp/shared/format';
import type {
  FavouriteGameView,
  GameActivityView,
  MyRoundEntriesView,
  WinningItemView,
} from '@gp/shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  CircleDollarSign,
  Download,
  ExternalLink,
  Gamepad2,
  Heart,
  HeartOff,
  Info,
  ShieldCheck,
  Ticket,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {
  GAME_TILE_GRADIENT,
  GameArt,
  isGameArtKey,
  TILE_GRADIENT_CLASS,
} from '@/components/brand/game-art';
import { Countdown } from '@/components/domain/countdown';
import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { toast } from '@/components/ui/sonner';
import { newIdempotencyKey } from '@/lib/api/client';
import { invalidatePlayerFinancials } from '@/lib/api/player-cache';
import {
  historyApi,
  saveCsv,
  useActiveRounds,
  useFavourites,
  useFinanceSummary,
  useGameRounds,
  useGamesOverview,
  useHistoryEntries,
  useRoundResults,
  useToggleFavourite,
  useWinnings,
} from '@/lib/api/rg-history';
import { cn } from '@/lib/utils';

import { dateTime, num, signed, toneOf } from './format';
import {
  EmptyCard,
  GAME_BASE,
  GamingPage,
  Kpi,
  LinkButton,
  ListSkeleton,
  Pager,
} from './history-common';
import { QueryError } from './page-shell';
import { IconTile, NoteBox } from './ui';

const round = (n: number) => `#${formatCount(n)}`;

const RESULT: Record<MyRoundEntriesView['result'], { status: BadgeStatus; label: string }> = {
  active: { status: 'live', label: 'In draw' },
  won: { status: 'approved', label: 'Won' },
  not_won: { status: 'neutral', label: 'Not won' },
  refund_owed: { status: 'pending', label: 'Refund owed' },
  refunded: { status: 'confirmed', label: 'Refunded' },
};

function SimulationNote() {
  return (
    <NoteBox icon={Info} tone="info">
      Originals, table and live games run as non-monetary simulations until real-money play is
      separately approved. Simulation amounts are DEMO and never touch your USDT balance. Global
      Pool entries are real ledger movements (DEMO / testnet).
    </NoteBox>
  );
}

function ActiveRoundCard({ r }: { r: MyRoundEntriesView }) {
  const pct = r.share ? `${(Number(r.share) * 100).toFixed(2)}%` : '—';
  return (
    <Card padding="l" className="gap-4 border-border-gold">
      <div className="flex flex-wrap items-center gap-3">
        <IconTile icon={CircleDollarSign} tone="gold" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-h5">Global Pool round {round(r.round.number)}</h3>
          <p className="text-caption text-text-tertiary">
            {formatCount(r.round.participantsCount)} players · pool {num(r.round.poolAmount)} USDT
          </p>
        </div>
        <StatusBadge status="live" label={r.round.status === 'open' ? 'Live' : 'Drawing'} />
        {r.isDemo && <DemoBadge size="s" />}
      </div>
      {r.round.status === 'open' && (
        <Countdown
          closesAt={r.round.closesAt}
          size="s"
          caption={`Draw at ${dateTime(r.round.closesAt)}`}
        />
      )}
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        <Mini label="Your entries" value={formatCount(r.entries)} />
        <Mini label="Tickets" value={`${r.firstCode.slice(-5)}–${r.lastCode.slice(-5)}`} mono />
        <Mini label="Stake + fees" value={`${num(r.stake)} + ${num(r.platformFee)}`} />
        <Mini label="Share of entries" value={pct} />
      </div>
      <p className="text-caption text-text-tertiary">
        Odds: {formatCount(r.entries)} of {formatCount(r.round.entriesCount)} entries. Winners are
        drawn only from verifiable randomness (Chainlink VRF). You can lose your stake.
      </p>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/pool/rounds/${r.round.number}`}>View round</LinkButton>
        <LinkButton href="/pool" variant="ghost">
          Global Pool
        </LinkButton>
      </div>
    </Card>
  );
}

function Mini({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-surface-raised p-3">
      <span className="text-caption text-text-tertiary">{label}</span>
      <span className={cn('text-body-s-strong tabular-nums', mono && 'font-mono text-mono-s')}>
        {value}
      </span>
    </div>
  );
}

function GameRow({ g }: { g: GameActivityView }) {
  return (
    <li className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0">
      <span className="h-16 w-12 shrink-0 overflow-hidden rounded-md">
        {isGameArtKey(g.slug) ? (
          <span
            className={cn(
              'flex size-full items-center justify-center',
              TILE_GRADIENT_CLASS[GAME_TILE_GRADIENT[g.slug]],
            )}
          >
            <GameArt game={g.slug} className="size-full" />
          </span>
        ) : (
          <span className="flex size-full items-center justify-center bg-surface-raised">
            <Gamepad2 aria-hidden className="size-5 text-icon-muted" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/games/${g.slug}`} className="text-body-s-strong hover:underline">
          {g.name}
        </Link>
        <span className="text-caption text-text-tertiary">
          {g.bets} bets · {g.edgeLabel}
          {g.lastPlayedAt ? ` · last ${formatDateUTC(g.lastPlayedAt)}` : ''}
        </span>
      </div>
      <span className="hidden flex-col items-end tablet:flex">
        <span className="text-caption text-text-tertiary">Wagered (sim)</span>
        <span className="text-body-s-strong tabular-nums">{num(g.wagered)}</span>
      </span>
      <span className="flex flex-col items-end">
        <span className="text-caption text-text-tertiary">Net (sim)</span>
        <span className={cn('text-body-s-strong tabular-nums', toneOf(g.net))}>
          {signed(g.net)}
        </span>
      </span>
      {g.isSimulation && <DemoBadge size="xs" label="Sim" />}
    </li>
  );
}

// ── G1 · My games ─────────────────────────────────────────────────────────────────────────────

export function MyGames() {
  const q = useGamesOverview();
  return (
    <GamingPage
      href={GAME_BASE}
      title="My games"
      sub="What you are playing now, what you played recently and how it went — Global Pool entries and simulation games are always reported separately."
      mobileSub="Your rounds in progress and recent games."
    >
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="g1-progress" className="flex flex-col gap-4">
            <h2 id="g1-progress" className="text-h4">
              In progress
            </h2>
            {q.data.activeRounds.length ? (
              <div className="grid grid-cols-1 gap-4 laptop:grid-cols-2">
                {q.data.activeRounds.map((r) => (
                  <ActiveRoundCard key={r.round.id} r={r} />
                ))}
              </div>
            ) : (
              <EmptyCard
                title="Nothing in progress"
                description="You hold no entries in an open round."
                actions={
                  <LinkButton href="/pool" variant="primary">
                    Go to the Global Pool
                  </LinkButton>
                }
              />
            )}
          </section>
          <section aria-labelledby="g1-30d" className="flex flex-col gap-4">
            <h2 id="g1-30d" className="text-h4">
              Last 30 days
            </h2>
            <div className="grid grid-cols-2 gap-4 laptop:grid-cols-4">
              <Kpi
                label="Global Pool entries"
                value={formatCount(q.data.last30d.poolEntries)}
                unit=""
                caption={`${num(q.data.last30d.poolSpent)} USDT incl. platform fees`}
              />
              <Kpi
                label="Global Pool net"
                value={signed(q.data.last30d.poolNet)}
                tone={toneOf(q.data.last30d.poolNet)}
                caption={`Returned ${num(q.data.last30d.poolReturned)} (prizes + refunds)`}
              />
              <Kpi
                label="Game bets (simulation)"
                value={formatCount(q.data.last30d.gameBets)}
                unit=""
                caption={`Wagered ${num(q.data.last30d.simWagered)} sim`}
              />
              <Kpi
                label="Games net (simulation)"
                value={signed(q.data.last30d.simNet)}
                unit="sim"
                tone={toneOf(q.data.last30d.simNet)}
                caption="Non-monetary — not your balance"
              />
            </div>
            <p className="text-caption text-text-tertiary">
              Every game has a house edge, so over time the expected result is a loss. You can lose
              your stake.
            </p>
          </section>
          <section aria-labelledby="g1-recent" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="g1-recent" className="text-h4">
                Recently played
              </h2>
              <LinkButton href={`${GAME_BASE}/rounds`} variant="ghost">
                Full game history
              </LinkButton>
            </div>
            {q.data.recentGames.length ? (
              <Card padding="m">
                <ul>
                  {q.data.recentGames.map((g) => (
                    <GameRow key={g.slug} g={g} />
                  ))}
                </ul>
              </Card>
            ) : (
              <EmptyCard
                title="No games played in the last 30 days"
                description="Originals and table games you play appear here."
                actions={<LinkButton href="/originals">Browse Originals</LinkButton>}
              />
            )}
            <SimulationNote />
          </section>
        </div>
      )}
    </GamingPage>
  );
}

// ── G2 · My entries ───────────────────────────────────────────────────────────────────────────

const ENTRY_FILTERS: { value: EntryStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'won', label: 'Won' },
  { value: 'not_won', label: 'Not won' },
  { value: 'refund_owed', label: 'Refund owed' },
  { value: 'refunded', label: 'Refunded' },
];

export function MyEntries() {
  const [status, setStatus] = React.useState<EntryStatus[]>([]);
  const [sort, setSort] = React.useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [status, sort]);
  const q = useHistoryEntries({
    status: status.length ? status : undefined,
    sort,
    page,
    pageSize: 10,
  });
  return (
    <GamingPage
      href={`${GAME_BASE}/entries`}
      title="My entries"
      sub="Every Global Pool ticket you bought, grouped by round. 10.00 USDT per entry plus the 0.05 USDT platform fee per entry, shown separately."
      mobileSub="Every Global Pool ticket you bought, grouped by round."
    >
      <div className="flex flex-col gap-4">
        <EntriesKpis />
        <h2 className="mt-2 text-h4">All entries</h2>
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
          <div
            role="group"
            aria-label="Filter by status"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:flex-wrap tablet:px-0"
          >
            {ENTRY_FILTERS.map((f) => {
              const on = status.includes(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setStatus((s) => (on ? s.filter((x) => x !== f.value) : [...s, f.value]))
                  }
                  className={cn(
                    'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-label-m tablet:min-h-8',
                    on
                      ? 'border-brand bg-brand-tint text-text-brand'
                      : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-body-s text-text-secondary">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
              className="h-11 rounded-md border border-border-default bg-surface-raised px-3 text-body-s text-text-primary tablet:h-9"
            >
              <option value="newest">Newest round first</option>
              <option value="oldest">Oldest round first</option>
            </select>
          </label>
        </div>
        {q.isPending ? (
          <ListSkeleton />
        ) : q.isError ? (
          <QueryError error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.items.length === 0 ? (
          status.length ? (
            <EmptyCard
              title="No entries match"
              description="Try other statuses."
              actions={
                <Button variant="secondary" onClick={() => setStatus([])}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyCard
              title="No entries yet"
              description="Join a Global Pool round — each entry costs 10.00 USDT plus a 0.05 USDT platform fee. You can lose your stake."
              icon={<Ticket aria-hidden />}
              actions={
                <LinkButton href="/pool" variant="primary">
                  Go to the Global Pool
                </LinkButton>
              }
            />
          )
        ) : (
          <>
            <p className="text-body-s text-text-secondary">
              {formatCount(q.data.totals.entries)} entries in {formatCount(q.data.totals.rounds)}{' '}
              round
              {q.data.totals.rounds === 1 ? '' : 's'} · {q.data.totals.won} won
            </p>
            <RoundEntriesTable rows={q.data.items} />
            <Pager
              page={page}
              totalPages={q.data.totalPages}
              total={q.data.total}
              pageSize={10}
              onPage={setPage}
              noun="rounds"
            />
          </>
        )}
        <StatusMeanings />
      </div>
    </GamingPage>
  );
}

function EntriesKpis() {
  const summary = useFinanceSummary();
  const active = useActiveRounds();
  const winnings = useWinnings();
  const s = summary.data;
  const activeEntries = (active.data ?? []).reduce((a, r) => a + r.entries, 0);
  const next = active.data?.[0];
  return (
    <div className="grid grid-cols-2 gap-4 laptop:grid-cols-4">
      <Kpi
        label="Active entries"
        value={formatCount(activeEntries)}
        unit="entries"
        loading={active.isPending}
        caption={
          next
            ? `Round ${round(next.round.number)} · ${num(next.stake)} USDT locked until the draw`
            : 'No open round'
        }
      />
      <Kpi
        label="Lifetime entries"
        value={s ? formatCount(s.fees.entriesLifetime) : '—'}
        unit="entries"
        loading={summary.isPending}
        caption={s && `${num(s.fees.platformLifetime)} USDT in platform fees`}
      />
      <Kpi
        label="Prizes won"
        value={winnings.data ? num(winnings.data.lifetimePrizes) : '—'}
        tone="text-text-gold"
        loading={winnings.isPending}
        caption={
          winnings.data &&
          `${winnings.data.prizesCount} prize${winnings.data.prizesCount === 1 ? '' : 's'}`
        }
      />
      <Kpi
        label="Refunds owed"
        value={s ? num(s.refunds.owed) : '—'}
        tone="text-balance-owed"
        loading={summary.isPending}
        caption="From cancelled rounds · claim or settles automatically"
      />
    </div>
  );
}

function StatusMeanings() {
  const items: [BadgeStatus, string, string][] = [
    [
      'live',
      'In draw',
      'Your entry is in an open round. Its 10.00 USDT stays Locked until the draw closes the round.',
    ],
    [
      'approved',
      'Won',
      'Chainlink VRF selected this entry. The prize is recorded as Owed and settles to Available.',
    ],
    [
      'neutral',
      'Not won',
      'The round was drawn and this entry won no prize. Every qualifying entry had exactly the same chance.',
    ],
    [
      'pending',
      'Refund owed',
      'Minimums were not met, so the round was cancelled. The 10.00 USDT entry amount returns via Owed.',
    ],
  ];
  return (
    <section aria-labelledby="status-meanings" className="mt-4 flex flex-col gap-4">
      <h2 id="status-meanings" className="text-h4">
        What each status means
      </h2>
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 laptop:grid-cols-4">
        {items.map(([st, label, body]) => (
          <Card key={label} padding="m" className="gap-3">
            <StatusBadge status={st} label={label} className="self-start" />
            <p className="text-body-s text-text-secondary">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function RoundEntriesTable({
  rows,
  showVerify,
}: {
  rows: MyRoundEntriesView[];
  showVerify?: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border-subtle bg-surface-default lg:block">
        <table className="w-full text-left">
          <caption className="sr-only">Entries by round</caption>
          <thead>
            <tr className="border-b border-border-subtle text-overline text-text-tertiary uppercase">
              <th scope="col" className="px-4 py-3 font-semibold">
                Round
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Entries
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Bought
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Stake + fees
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Result
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Prize
              </th>
              <th scope="col" className="px-3 py-3">
                <span className="sr-only">Links</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const res = RESULT[r.result];
              return (
                <tr key={r.round.id} className="border-b border-border-subtle last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="flex flex-col">
                      <span className="text-body-s-strong">{round(r.round.number)}</span>
                      <span className="text-caption text-text-tertiary">
                        Closes {dateTime(r.round.closesAt)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex flex-col">
                      <span className="text-body-s">{formatCount(r.entries)}</span>
                      <span className="font-mono text-mono-s text-text-tertiary">
                        {r.firstCode}
                        {r.entries > 1 ? ` … ${r.lastCode.slice(-5)}` : ''}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-body-s text-text-secondary">
                    {formatDateUTC(r.purchasedAt)}
                  </td>
                  <td className="px-3 py-3 text-right text-body-s tabular-nums">
                    {num(r.stake)} + {num(r.platformFee)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={res.status} label={res.label} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-number-s tabular-nums',
                          r.prize ? 'text-text-gold' : 'text-text-tertiary',
                        )}
                      >
                        {r.prize ? num(r.prize) : '—'}
                      </span>
                      {r.isDemo && <DemoBadge size="xs" />}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      className="text-label-m text-text-brand hover:underline"
                      href={`/pool/rounds/${r.round.number}${showVerify && r.round.status === 'settled' ? '/verify' : ''}`}
                    >
                      {showVerify && r.round.status === 'settled' ? 'Verify' : 'Round'}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 lg:hidden">
        {rows.map((r) => {
          const res = RESULT[r.result];
          return (
            <li key={r.round.id}>
              <Link
                href={`/pool/rounds/${r.round.number}${showVerify && r.round.status === 'settled' ? '/verify' : ''}`}
                className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-4"
              >
                <span className="flex items-center gap-3">
                  <IconTile icon={Ticket} tone="gold" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label-l">
                      Round {round(r.round.number)} · {formatCount(r.entries)} entries
                    </span>
                    <span className="truncate font-mono text-mono-s text-text-tertiary">
                      {r.firstCode} … {r.lastCode.slice(-5)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span
                      className={cn(
                        'text-number-s tabular-nums',
                        r.prize ? 'text-text-gold' : 'text-text-primary',
                      )}
                    >
                      {r.prize ? `+${num(r.prize)}` : `−${num(r.stake)}`}
                    </span>
                    <span className="text-caption text-text-tertiary">USDT</span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={res.status} label={res.label} />
                  <span className="flex-1 text-caption text-text-tertiary">
                    fees {num(r.platformFee)}
                  </span>
                  {r.isDemo && <DemoBadge size="xs" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ── G3 · Active rounds ────────────────────────────────────────────────────────────────────────

export function ActiveRounds() {
  const q = useActiveRounds();
  return (
    <GamingPage
      href={`${GAME_BASE}/active`}
      title="My active rounds"
      sub="Rounds that are still open or being drawn where you hold entries. Countdowns use the real close time — never a fake timer."
      mobileSub="Open rounds where you hold entries."
    >
      {q.isPending ? (
        <ListSkeleton rows={2} />
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyCard
          title="No active rounds"
          description="When you buy entries in an open round, it shows here until the draw."
          icon={<CircleDollarSign aria-hidden />}
          actions={
            <LinkButton href="/pool" variant="primary">
              Go to the Global Pool
            </LinkButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 laptop:grid-cols-2">
          {q.data.map((r) => (
            <ActiveRoundCard key={r.round.id} r={r} />
          ))}
        </div>
      )}
    </GamingPage>
  );
}

// ── G4 · Results ──────────────────────────────────────────────────────────────────────────────

export function RoundResults() {
  const q = useRoundResults();
  return (
    <GamingPage
      href={`${GAME_BASE}/results`}
      title="My results"
      sub="Settled and cancelled rounds you took part in. Every settled draw can be verified independently from the VRF word and the committed entry list."
      mobileSub="Settled and cancelled rounds you took part in."
    >
      {q.isPending ? (
        <ListSkeleton />
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyCard
          title="No results yet"
          description="Results appear here after your first round is drawn or cancelled."
          icon={<Trophy aria-hidden />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <RoundEntriesTable rows={q.data} showVerify />
          <NoteBox icon={ShieldCheck} tone="info">
            Winners come only from verifiable randomness. Nobody at GLOBAL POOL can choose or change
            a result.
          </NoteBox>
        </div>
      )}
    </GamingPage>
  );
}

// ── G5 · Winnings ─────────────────────────────────────────────────────────────────────────────

export function Winnings() {
  const q = useWinnings();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const key = React.useRef(newIdempotencyKey());
  const claim = async () => {
    setBusy(true);
    try {
      const r = await historyApi.claimOwed(key.current);
      key.current = newIdempotencyKey();
      toast({
        type: 'success',
        title: 'Moved to Available',
        description: `${num(r.claimed)} USDT is now available.`,
      });
      void invalidatePlayerFinancials(qc);
    } catch (e) {
      toast({
        type: 'error',
        title: 'Could not claim',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <GamingPage
      href={`${GAME_BASE}/winnings`}
      title="My winnings"
      sub="Prizes, refunds and rewards with their settlement status. Owed amounts are yours — claim them to Available, or they settle automatically."
      mobileSub="Prizes, refunds and rewards with their settlement status."
    >
      {q.isPending ? (
        <ListSkeleton />
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
            <Card padding="l" className="gap-3 border-border-gold tablet:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-body-s text-text-secondary">Owed to you</span>
                <DemoBadge size="s" />
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="text-number-l text-balance-owed tabular-nums">
                  {num(q.data.owed.total)}
                </span>
                <span className="text-body-s text-text-tertiary">USDT</span>
              </p>
              <Button
                size="l"
                disabled={q.data.owed.items.length === 0}
                loading={busy}
                onClick={() => void claim()}
              >
                Claim to Available
              </Button>
            </Card>
            <Kpi
              label="Settled · lifetime"
              value={num(q.data.settled.total)}
              caption={`${q.data.settled.items.length} item(s) moved to Available`}
            />
            <Kpi
              label="Prizes · lifetime"
              value={num(q.data.lifetimePrizes)}
              tone="text-text-gold"
              caption={`${q.data.prizesCount} winning entr${q.data.prizesCount === 1 ? 'y' : 'ies'}`}
            />
          </div>
          <WinningsList title="Owed" items={q.data.owed.items} empty="Nothing owed right now." />
          <WinningsList
            title="Settled"
            items={q.data.settled.items}
            empty="No settled winnings yet."
          />
        </div>
      )}
    </GamingPage>
  );
}

function WinningsList({
  title,
  items,
  empty,
}: {
  title: string;
  items: WinningItemView[];
  empty: string;
}) {
  return (
    <Card padding="l" className="gap-0">
      <h2 className="pb-3 text-h5">{title}</h2>
      {items.length === 0 ? (
        <p className="border-t border-border-subtle py-4 text-body-s text-text-secondary">
          {empty}
        </p>
      ) : (
        <ul>
          {items.map((w) => (
            <li
              key={w.id}
              className="flex flex-col gap-2 border-t border-border-subtle py-3 tablet:flex-row tablet:items-center tablet:gap-4"
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile
                  icon={
                    w.kind === 'prize' ? Trophy : w.kind === 'refund' ? Ticket : CircleDollarSign
                  }
                  tone={w.kind === 'refund' ? 'info' : 'gold'}
                  size={36}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-body-s-strong">{w.title}</span>
                  <span className="text-caption text-text-tertiary">
                    {w.detail} · {dateTime(w.createdAt)}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2 self-end tablet:self-center">
                <StatusBadge
                  status={
                    w.settlement === 'settled'
                      ? 'confirmed'
                      : w.settlement === 'processing'
                        ? 'processing'
                        : 'pending'
                  }
                  label={
                    w.settlement === 'settled'
                      ? w.settledAt
                        ? `Settled ${formatDateUTC(w.settledAt)}`
                        : 'Settled'
                      : w.settlement === 'processing'
                        ? 'Processing'
                        : 'Owed'
                  }
                />
                <span className="text-number-s text-text-success tabular-nums">
                  +{num(w.amount)}
                </span>
                {w.isDemo && <DemoBadge size="xs" />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── G6 · Game history ─────────────────────────────────────────────────────────────────────────

export function GameHistory() {
  const [game, setGame] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setPage(1), [game]);
  const overview = useGamesOverview();
  const q = useGameRounds({ game: game || undefined, page });
  const exportCsv = async () => {
    setBusy(true);
    try {
      const csv = await historyApi.exportGameRounds({ game: game || undefined });
      saveCsv(csv, `globalpool_game-history_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ type: 'success', title: 'Export ready', description: 'Seeds and nonces included.' });
    } catch (e) {
      toast({
        type: 'error',
        title: 'Export failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <GamingPage
      href={`${GAME_BASE}/rounds`}
      title="Game history"
      sub="Every game round with its commit–reveal seeds, so you can verify each result yourself. The server seed is revealed when its session ends."
      mobileSub="Every game round with its seeds for verification."
      actions={
        <Button size="m" loading={busy} onClick={() => void exportCsv()}>
          <Download aria-hidden />
          Export CSV
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <SimulationNote />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-body-s text-text-secondary">
            Game
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="h-11 rounded-md border border-border-default bg-surface-raised px-3 text-body-s text-text-primary tablet:h-9"
            >
              <option value="">All games</option>
              {(overview.data?.recentGames ?? []).map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            size="m"
            className="min-h-11 tablet:hidden"
            loading={busy}
            onClick={() => void exportCsv()}
          >
            <Download aria-hidden />
            Export CSV
          </Button>
        </div>
        {q.isPending ? (
          <ListSkeleton />
        ) : q.isError ? (
          <QueryError error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.items.length === 0 ? (
          <EmptyCard
            title="No game rounds yet"
            description="Rounds you play in Originals and table games appear here with their seeds."
            icon={<Gamepad2 aria-hidden />}
            actions={<LinkButton href="/originals">Browse Originals</LinkButton>}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-default">
              <table className="w-full min-w-[640px] text-left">
                <caption className="sr-only">Game rounds</caption>
                <thead>
                  <tr className="border-b border-border-subtle text-overline text-text-tertiary uppercase">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Game
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Time
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Result
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                      Stake
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">
                      Net
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Seeds
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((r) => {
                    const o = r.outcome as { roll?: string; target?: string; won?: boolean };
                    return (
                      <tr key={r.id} className="border-b border-border-subtle last:border-b-0">
                        <td className="px-4 py-3">
                          <span className="flex flex-col">
                            <span className="text-body-s-strong">{r.game.name}</span>
                            <span className="text-caption text-text-tertiary">nonce {r.nonce}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-body-s text-text-secondary">
                          {formatDateUTC(r.createdAt)} · {formatTimeUTC(r.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-body-s">
                          {o.roll ? `Roll ${o.roll} ${o.target ? `(over ${o.target})` : ''}` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-body-s tabular-nums">
                          {num(r.stake)}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-3 text-right text-body-s-strong tabular-nums',
                            toneOf(r.net),
                          )}
                        >
                          {signed(r.net)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="flex flex-col font-mono text-mono-s text-text-tertiary">
                            <span title={r.serverSeedHash}>
                              hash {r.serverSeedHash.slice(0, 10)}…
                            </span>
                            <span>
                              {r.serverSeed
                                ? `seed ${r.serverSeed.slice(0, 10)}…`
                                : 'seed hidden until session ends'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              totalPages={q.data.totalPages}
              total={q.data.total}
              pageSize={20}
              onPage={setPage}
              noun="rounds"
            />
            <p className="flex items-center gap-2 text-caption text-text-tertiary">
              <ExternalLink aria-hidden className="size-3.5" />
              Verify any Pool Dice round on the{' '}
              <Link className="text-text-brand underline" href="/provably-fair">
                Provably Fair
              </Link>{' '}
              page.
            </p>
          </>
        )}
      </div>
    </GamingPage>
  );
}

// ── G7 · Favourites ───────────────────────────────────────────────────────────────────────────

export function Favourites() {
  const q = useFavourites();
  const toggle = useToggleFavourite();
  const onToggle = async (g: FavouriteGameView) => {
    try {
      await toggle.mutateAsync({ slug: g.slug, on: false });
      toast({ type: 'info', title: `${g.name} removed from favourites` });
    } catch {
      toast({ type: 'error', title: 'Could not update favourites' });
    }
  };
  return (
    <GamingPage
      href={`${GAME_BASE}/favourites`}
      title="Favourites"
      sub="Games you pinned for quick access. Reminders are off by default and we never enter a round for you."
      mobileSub="Games you pinned for quick access."
    >
      {q.isPending ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyCard
          title="No favourites yet"
          description="Tap the heart on any game to pin it here."
          icon={<Heart aria-hidden />}
          actions={
            <LinkButton href="/" variant="primary">
              Browse the lobby
            </LinkButton>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-3 laptop:grid-cols-4 desktop:grid-cols-6">
          {q.data.map((g) => (
            <li
              key={g.slug}
              className="flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-default"
            >
              <Link
                href={g.slug === 'global-pool' ? '/pool' : `/games/${g.slug}`}
                className="block aspect-[3/4] w-full overflow-hidden"
                aria-label={`${g.name} — ${g.edgeLabel}`}
              >
                {isGameArtKey(g.slug) ? (
                  <span
                    className={cn(
                      'flex size-full items-center justify-center p-3',
                      TILE_GRADIENT_CLASS[GAME_TILE_GRADIENT[g.slug]],
                    )}
                  >
                    <GameArt game={g.slug} className="size-full" />
                  </span>
                ) : (
                  <span className="flex size-full items-center justify-center bg-surface-raised">
                    <Gamepad2 aria-hidden className="size-8 text-icon-muted" />
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 p-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-s-strong">{g.name}</span>
                  <span className="truncate text-caption text-text-tertiary">{g.edgeLabel}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${g.name} from favourites`}
                  disabled={toggle.isPending}
                  onClick={() => void onToggle(g)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-danger hover:bg-surface-hover"
                >
                  <Heart aria-hidden className="size-5 fill-current" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {q.data && q.data.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-caption text-text-tertiary">
          <HeartOff aria-hidden className="size-3.5" />
          Removing a favourite never affects entries or bets you already placed.
        </p>
      )}
    </GamingPage>
  );
}
