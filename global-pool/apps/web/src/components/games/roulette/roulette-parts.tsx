'use client';

import type { RouletteBet, RouletteOutcome } from '@gp/shared/fair';
import { formatDateTimeUTC } from '@gp/shared/format';
import { formatAmount, money } from '@gp/shared/money';
import {
  BookOpen,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  CircleX,
  Coins,
  Hash,
  History,
  Info,
  Layers,
  Plus,
  ShieldCheck,
  Target,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { CreditsAmount, KitChip, toneOfNet } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { useGameBets, type GameBetView } from '@/lib/api/games';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { ChipRow } from './chip';
import {
  PAYOUTS,
  RULES,
  chanceOf,
  colorOf,
  covers,
  expectedReturn,
  insideOptionsFor,
  outcomePreview,
  paysOf,
  pocketName,
  returnsOf,
  signed,
  slipTotal,
  spotKey,
  spotLabel,
  spotShort,
  type Slip,
  type Spot,
} from './roulette-math';

export const SLUG = 'pool-roulette';

export type RouletteParams = Record<string, unknown> & { bets: RouletteBet[] };
export type RouletteOutcomeView = Record<string, unknown> & RouletteOutcome & { win?: boolean };
export type RouletteBetView = GameBetView<RouletteParams, RouletteOutcomeView>;

export const ROULETTE_ROUTES = {
  play: '/games/pool-roulette',
  bets: '/games/pool-roulette/my-bets',
  fairness: '/games/pool-roulette/fairness',
  rules: '/games/pool-roulette/rules',
} as const;

/** "Straight 19 · Red · 2nd dozen" (history rows). */
export function betsSummary(bets: readonly { type: string; numbers?: number[] }[] | undefined, max = 3): string {
  const list = (bets ?? []).map((b) => spotShort({ type: b.type as Spot['type'], numbers: b.numbers }));
  return list.length > max ? `${list.slice(0, max).join(' · ')} +${list.length - max}` : list.join(' · ');
}

// ── pocket disc ──────────────────────────────────────────────────────────────────────────────

export function PocketDisc({
  n,
  size = 32,
  newest = false,
  className,
}: {
  n: number;
  size?: number;
  newest?: boolean;
  className?: string;
}) {
  const c = colorOf(n);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-bold tabular-nums',
        c === 'red' ? 'bg-status-danger-strong text-ink-50' : c === 'black' ? 'bg-ink-950 text-ink-50' : 'bg-green-500 text-ink-950',
        newest ? 'border-2 border-border-focus' : 'border-border-strong',
        size >= 56 ? 'text-h2' : size >= 40 ? 'text-label-l' : 'text-label-s',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {n}
      <span className="sr-only"> {c}</span>
    </span>
  );
}

// ── game tabs (Play · My bets · Fairness · Rules & payouts) ─────────────────────────────────

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: ROULETTE_ROUTES.play, label: 'Play', icon: Target },
  { href: ROULETTE_ROUTES.bets, label: 'My bets', icon: History },
  { href: ROULETTE_ROUTES.fairness, label: 'Fairness', icon: ShieldCheck },
  { href: ROULETTE_ROUTES.rules, label: 'Rules & payouts', icon: BookOpen },
];

export function GameTabs({ className }: { className?: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Pool Roulette" className={cn('no-scrollbar -mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0', className)}>
      <ul className="flex min-w-max gap-1 border-b border-border-subtle">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-label-m transition-colors focus-visible:outline-2 focus-visible:outline-border-focus',
                  active ? 'border-brand text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <t.icon aria-hidden className="size-4" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Header meta chips (RL-01): European · single zero, Straight pays 35:1, limits. */
export function RouletteHeaderChips() {
  return (
    <>
      <KitChip icon={Target} className="hidden laptop:inline-flex">
        Straight pays 35:1
      </KitChip>
      <KitChip icon={Coins} className="hidden tablet:inline-flex">
        Bet {formatAmount(RULES.minPerSpot)} – {formatAmount(RULES.maxPerSpot)} per spot
      </KitChip>
      <KitChip icon={Layers} className="hidden desktop:inline-flex">
        Table max {formatAmount(RULES.tableMax)} per spin
      </KitChip>
    </>
  );
}

// ── recent spins (Game/History Strip — Roulette) ────────────────────────────────────────────

export function RecentSpins({ onSelect, className, count = 12 }: { onSelect?: (b: RouletteBetView) => void; className?: string; count?: number }) {
  const member = useAuth().status === 'member';
  const q = useGameBets<RouletteBetView>(SLUG, 1, count);
  const items = (q.data?.items ?? []).filter((b) => typeof b.outcome?.pocket === 'number');
  const tally = items.reduce(
    (a, b) => {
      const c = colorOf(b.outcome.pocket);
      a[c] += 1;
      return a;
    },
    { red: 0, black: 0, green: 0 },
  );
  return (
    <section
      aria-labelledby="recent-spins"
      className={cn('flex min-w-0 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5', className)}
    >
      <div className="flex items-start gap-2.5">
        <Hash aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-muted" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="recent-spins" className="text-h5 text-text-primary">
            Recent results
          </h2>
          <p className="text-caption text-text-tertiary">Your last {count} spins · newest first</p>
        </div>
        <DemoBadge size="xs" />
        <Link href={ROULETTE_ROUTES.bets} className="flex min-h-11 items-center gap-0.5 text-label-m text-text-brand hover:underline tablet:min-h-0">
          View all
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      {!member ? (
        <p className="text-body-s text-text-tertiary">Sign in to see your spins.</p>
      ) : q.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : items.length ? (
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="Your last pockets, newest first">
          {items.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect?.(b)}
                aria-label={`${b.ref}: ${pocketName(b.outcome.pocket)}, net ${b.net} DEMO — verify`}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
              >
                <PocketDisc n={b.outcome.pocket} size={36} newest={i === 0} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-s text-text-tertiary">No spins yet — your pockets appear here.</p>
      )}
      <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
        <Info aria-hidden className="mt-px size-3.5 shrink-0" />
        {items.length ? `Red ${tally.red} · Black ${tally.black} · Zero ${tally.green} — ` : ''}each spin is independent; past
        numbers don’t change the odds.
      </p>
    </section>
  );
}

// ── side-column cards ───────────────────────────────────────────────────────────────────────

function pocketsText(ps: number[]): string {
  if (ps.length <= 6) return ps.join(' ');
  return `${ps.length} numbers${ps.includes(0) ? ', incl. 0' : ''}`;
}

/** "If the ball lands on…" — every pocket grouped by its net result for the current slip. */
export function OutcomePreviewCard({ slip, className }: { slip: Slip; className?: string }) {
  const groups = outcomePreview(slip);
  const total = slipTotal(slip);
  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3 laptop:p-4', className)} data-testid="outcome-preview">
      <div className="flex items-center gap-2">
        <Target aria-hidden className="size-4 text-icon-brand" />
        <p className="text-body-s-strong text-text-primary">If the ball lands on…</p>
        <DemoBadge size="xs" className="ml-auto" />
      </div>
      <ul className="flex flex-col gap-1">
        {groups.slice(0, 6).map((g) => {
          const d = money(g.net);
          return (
            <li key={g.net} className="flex items-center gap-2 text-body-s">
              <span className="min-w-0 flex-1 truncate text-text-secondary">{pocketsText(g.pockets)}</span>
              <span className="text-caption text-text-tertiary">
                {g.pockets.length} {g.pockets.length === 1 ? 'pocket' : 'pockets'}
              </span>
              <span
                className={cn(
                  'w-24 text-right text-number-s tabular-nums',
                  d.gt(0) ? 'text-text-success' : d.lt(0) ? 'text-text-danger' : 'text-text-primary',
                )}
              >
                {signed(g.net)}
              </span>
            </li>
          );
        })}
      </ul>
      {groups.length > 6 && <p className="text-caption text-text-tertiary">+{groups.length - 6} more outcomes</p>}
      <p className="text-caption text-text-tertiary">
        Expected return {formatAmount(expectedReturn(slip))} DEMO for every {formatAmount(total)} staked — the 2.70% house edge
        applies to every bet type.
      </p>
    </div>
  );
}

/** Per-bet settlement (RL-05) from the server's settled outcome. */
export function SettlementCard({ bet, title = 'Settlement', className }: { bet: RouletteBetView; title?: string; className?: string }) {
  const rows = bet.outcome.bets ?? [];
  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-4', className)} data-testid="settlement">
      <div className="flex items-center gap-2">
        <p className="text-body-s-strong text-text-primary">{title}</p>
        <DemoBadge size="xs" className="ml-auto" />
      </div>
      <dl className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const s = { type: r.type, numbers: r.numbers } as Spot;
          return (
            <div key={spotKey(s)} className="flex items-center justify-between gap-3 text-body-s">
              <dt className="flex min-w-0 items-center gap-1.5 text-text-secondary">
                {r.win ? (
                  <CircleCheck aria-label="won" className="size-3.5 shrink-0 text-icon-brand" />
                ) : (
                  <CircleX aria-label="lost" className="size-3.5 shrink-0 text-text-danger" />
                )}
                <span className="truncate">
                  {spotShort(s)} · {formatAmount(r.amount)}
                  {r.win ? ` × ${PAYOUTS[s.type] + 1}` : ''}
                </span>
              </dt>
              <dd className={cn('text-number-s tabular-nums', r.win ? 'text-text-success' : 'text-text-danger')}>
                {formatAmount(r.payout)}
              </dd>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-2 text-body-s">
          <dt className="text-body-s-strong text-text-primary">Total returned</dt>
          <dd className="text-number-s text-text-primary">
            <CreditsAmount value={bet.payout} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-body-s">
          <dt className="text-text-secondary">Net this spin</dt>
          <dd className={cn('text-number-s', toneOfNet(bet.net))}>
            <CreditsAmount value={bet.net} signed={!money(bet.net).isZero()} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Locked bets while spinning (RL-04). */
export function LockedCard({ slip, available }: { slip: Slip; available: string | null }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-4" data-testid="locked-bets">
      <div className="flex items-center gap-2">
        <p className="text-body-s-strong text-text-primary">This spin — locked</p>
        <DemoBadge size="xs" className="ml-auto" />
      </div>
      <dl className="flex flex-col gap-1.5 text-body-s">
        {slip.map((b) => (
          <div key={b.key} className="flex justify-between gap-3">
            <dt className="truncate text-text-secondary">{spotShort(b)}</dt>
            <dd className="text-number-s text-text-primary">{formatAmount(b.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-border-subtle pt-2">
          <dt className="text-body-s-strong text-text-primary">Total stake</dt>
          <dd className="text-number-s text-text-primary">
            <CreditsAmount value={slipTotal(slip)} />
          </dd>
        </div>
        {available !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">Available while spinning</dt>
            <dd className="text-number-s text-text-primary">
              <CreditsAmount value={available} />
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Result banner (RL-05) — real settled spins only, win / even / lose by the net (icon + label, never colour alone). */
export function RouletteResultBanner({ bet, onVerify, compact = false }: { bet: RouletteBetView; onVerify?: () => void; compact?: boolean }) {
  const net = money(bet.net);
  const tone = net.gt(0) ? 'win' : net.isZero() ? 'even' : 'lose';
  const won = (bet.outcome.bets ?? []).filter((b) => b.win).length;
  const all = (bet.outcome.bets ?? []).length;
  const headline =
    tone === 'win' ? (
      <>
        You won <CreditsAmount value={bet.payout} />
      </>
    ) : tone === 'even' ? (
      'Stake returned — you broke even'
    ) : money(bet.payout).gt(0) ? (
      <>
        <CreditsAmount value={bet.payout} /> returned
      </>
    ) : (
      'No win this spin'
    );
  const Icon = tone === 'win' ? CircleCheck : tone === 'even' ? CircleMinus : CircleX;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="result-banner"
      data-result={tone}
      className={cn(
        'flex w-full flex-col gap-3 rounded-xl border p-4',
        tone === 'win' ? 'border-border-brand bg-brand-tint-subtle' : tone === 'even' ? 'border-border-default bg-surface-raised' : 'border-border-danger bg-status-danger-tint',
      )}
    >
      <div className="flex items-start gap-3">
        {compact ? (
          <PocketDisc n={bet.outcome.pocket} size={44} newest />
        ) : (
          <Icon aria-hidden className={cn('size-6 shrink-0', tone === 'win' ? 'text-icon-brand' : tone === 'even' ? 'text-icon-muted' : 'text-text-danger')} />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body-m-strong text-text-primary">{headline}</p>
          <p className="text-caption text-text-secondary">
            Pool Roulette · {pocketName(bet.outcome.pocket)} · {won} of {all} {all === 1 ? 'bet' : 'bets'} won
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn('text-number-s', toneOfNet(bet.net))} data-testid="result-net">
            <CreditsAmount value={bet.net} signed={!money(bet.net).isZero()} />
          </span>
          <span className="text-caption text-text-tertiary">Net</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 text-caption text-text-tertiary">
        <DemoBadge size="xs" />
        <span>
          {bet.ref} · nonce {bet.fairness.nonce} · {formatDateTimeUTC(bet.settledAt ?? bet.createdAt)}
        </span>
        {onVerify && (
          <Button variant="link" size="s" className="ml-auto min-h-11 tablet:min-h-0" onClick={onVerify} leadingIcon={<ShieldCheck aria-hidden />}>
            Verify spin
          </Button>
        )}
      </div>
    </div>
  );
}

// ── bet-type chooser (mobile sheet RL-02 · keyboard "B" on desktop) ─────────────────────────

export function BetTypeSheet({
  n,
  open,
  onOpenChange,
  chip,
  onChipChange,
  onAdd,
}: {
  n: number | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chip: string;
  onChipChange: (v: string) => void;
  onAdd: (s: Spot) => void;
}) {
  const options = React.useMemo(() => (n === null ? [] : insideOptionsFor(n)), [n]);
  const [pick, setPick] = React.useState(0);
  React.useEffect(() => setPick(0), [n]);
  const sel = options[pick] ?? options[0];
  return (
    <ResponsiveModal
      open={open && n !== null}
      onOpenChange={onOpenChange}
      title={n === null ? 'Bet type' : `Bet on ${n}`}
      description={`Choose how to cover ${n ?? ''} with your ${formatAmount(chip)} DEMO chip. The neighbours come from the table layout.`}
      size="s"
      footer={
        sel && (
          <div className="flex w-full flex-col gap-2">
            <Button size="l" block onClick={() => onAdd(sel)} leadingIcon={<Plus aria-hidden />} data-testid="bet-type-add">
              Add {spotLabel(sel).replace(' · ', ' ')} · {formatAmount(chip)} DEMO
            </Button>
            <p className="text-center text-caption text-text-tertiary">
              Returns {formatAmount(returnsOf(sel.type, chip).toFixed(2))} DEMO if {covers(sel).length === 1 ? `${n} hits` : 'one of its numbers hits'}. You can
              lose your stake.
            </p>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label={`Bet types covering ${n ?? ''}`} className="flex flex-col gap-1">
          {options.map((o, i) => (
            <button
              key={spotKey(o)}
              type="button"
              role="radio"
              aria-checked={i === pick}
              onClick={() => setPick(i)}
              className={cn(
                'flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-border-focus',
                i === pick ? 'border-border-brand bg-brand-tint-subtle' : 'border-border-subtle bg-surface-raised hover:bg-surface-hover',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                  i === pick ? 'border-brand' : 'border-border-strong',
                )}
              >
                {i === pick && <span className="size-2.5 rounded-full bg-brand" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-body-s-strong text-text-primary">{spotLabel(o).replace(' · ', ' ')}</span>
                <span className="text-caption text-text-tertiary">
                  Pays {paysOf(o.type)} · {covers(o).length} of 37 pockets ({chanceOf(o)}%)
                </span>
              </span>
            </button>
          ))}
        </div>
        <ChipRow value={chip} onChange={onChipChange} size={44} className="flex-wrap" />
      </div>
    </ResponsiveModal>
  );
}
