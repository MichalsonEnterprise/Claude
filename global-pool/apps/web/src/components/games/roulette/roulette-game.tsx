'use client';

import { fairGame } from '@gp/shared/fair';
import { formatAmount, money } from '@gp/shared/money';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronUp, CircleAlert, CircleDot, Hash, Info, Layers, Loader2, LogIn, RotateCcw, Timer, Trash2, TriangleAlert, Undo2, WifiOff } from 'lucide-react';
import * as React from 'react';

import {
  BeforeYouBet,
  BetHistory,
  DemoCreditsChip,
  GameHeader,
  GameNotice,
  GameSessionBar,
  KitChip,
  LicenceLine,
  MoreGamesRail,
  PanelNotice,
  SeedDisplay,
  VerifyDrawer,
  insufficientCopy,
  noticeKindOf,
  shortHash,
  useBetRunner,
  useGameGate,
  useReducedMotion,
  GAME_MOTION,
  type GameNoticeKind,
  type HistoryColumn,
} from '@/components/games/kit';
import { holdRealityCheck } from '@/components/rg-history/reality-check';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button, IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { authKeys } from '@/lib/api/auth';
import { applySettledBet, gameKeys, gamesApi, useResetCredits, useSeeds, type DemoCreditsView } from '@/lib/api/games';
import { rgKeys } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { BetSlip } from './bet-slip';
import { ChipRow } from './chip';
import { RouletteFelt, RouletteFeltVertical, type FeltResult } from './roulette-felt';
import {
  RULES,
  addChip,
  chanceOf,
  coveredPockets,
  covers,
  fromBets,
  isOutside,
  maxPayout,
  paysOf,
  pocketFacts,
  pocketName,
  removeChip,
  removeSpot,
  returnsOf,
  setSpotAmount,
  slipProblems,
  slipTotal,
  spotKey,
  spotLabel,
  toParams,
  type Slip,
  type SlipProblem,
  type Spot,
} from './roulette-math';
import {
  BetTypeSheet,
  GameTabs,
  LockedCard,
  OutcomePreviewCard,
  PocketDisc,
  RecentSpins,
  RouletteHeaderChips,
  RouletteResultBanner,
  SLUG,
  SettlementCard,
  betsSummary,
  type RouletteBetView,
} from './roulette-parts';
import { RouletteWheel, type WheelPhase } from './roulette-wheel';

const INFO = fairGame(SLUG)!;
const LAST_KEY = 'gp.roulette.lastBets';

/** Last spun bets for Repeat (per-viewer convenience; storage may be unavailable). */
function useLastSpun(): [Slip, (s: Slip) => void] {
  const [v, setV] = React.useState<Slip>([]);
  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LAST_KEY);
      if (raw) setV(fromBets(JSON.parse(raw) as { type: string; numbers?: number[]; amount: string }[]));
    } catch {
      // storage unavailable — Repeat starts empty
    }
  }, []);
  const set = React.useCallback((s: Slip) => {
    setV(s);
    try {
      window.sessionStorage.setItem(LAST_KEY, JSON.stringify(toParams(s).bets));
    } catch {
      // ignore
    }
  }, []);
  return [v, set];
}

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName) ||
    el.isContentEditable ||
    !!el.closest('[role="dialog"]') ||
    el.getAttribute('role') === 'radio'
  );
}

const COLUMNS: HistoryColumn<RouletteBetView>[] = [
  {
    id: 'bets',
    header: 'Bets',
    cell: (b) => <span className="text-text-secondary">{betsSummary(b.params?.bets)}</span>,
  },
  {
    id: 'pocket',
    header: 'Pocket',
    cell: (b) =>
      typeof b.outcome?.pocket === 'number' ? (
        <span className="inline-flex items-center gap-2">
          <PocketDisc n={b.outcome.pocket} size={24} />
          <span className="text-caption text-text-secondary capitalize">{b.outcome.color}</span>
        </span>
      ) : (
        '—'
      ),
  },
];

const describeOutcome = (o: Record<string, unknown>) => {
  const p = o.pocket;
  if (typeof p !== 'number') return JSON.stringify(o);
  const bets = (o.bets as { win: boolean; payout: string }[] | undefined) ?? [];
  const ret = bets.reduce((a, b) => a.plus(money(b.payout)), money(0));
  return `Pocket ${pocketName(p)} · ${bets.filter((b) => b.win).length} of ${bets.length} bets won · returned ${formatAmount(ret.toFixed(2))}`;
};

type SpinState = { id: number; pocket: number } | null;

/** Pool Roulette (RL-01 … RL-09) — European single zero, DEMO credits only (no cash value), provably fair. */
export function RouletteGame() {
  const auth = useAuth();
  const qc = useQueryClient();
  const gate = useGameGate();
  const seeds = useSeeds(SLUG);
  const reset = useResetCredits();
  const reduced = useReducedMotion();
  const wide = useMediaQuery(MQ.tablet, true);

  const [chip, setChip] = React.useState('5.00');
  const [slip, setSlipState] = React.useState<Slip>([]);
  const [undo, setUndo] = React.useState<Slip[]>([]);
  const [lastSpun, setLastSpun] = useLastSpun();
  const [hover, setHover] = React.useState<Spot | null>(null);
  const [spin, setSpin] = React.useState<SpinState>(null);
  const [animating, setAnimating] = React.useState(false);
  const [locked, setLocked] = React.useState<{ slip: Slip; total: string; credits: DemoCreditsView | undefined } | null>(null);
  const [settled, setSettled] = React.useState<{ bet: RouletteBetView; slip: Slip } | null>(null);
  const [restPocket, setRestPocket] = React.useState<number | null>(null);
  const [tableNote, setTableNote] = React.useState<string | null>(null);
  const [verifyId, setVerifyId] = React.useState<string | null>(null);
  const [seedsOpen, setSeedsOpen] = React.useState(false);
  const [sheetN, setSheetN] = React.useState<number | null>(null);
  const [view, setView] = React.useState<'numbers' | 'outside'>('numbers');
  const [slipOpen, setSlipOpen] = React.useState(false);
  const pending = React.useRef<RouletteBetView | null>(null);
  const sendSlip = React.useRef<Slip>([]);
  const release = React.useRef<(() => void) | null>(null);

  const balance = gate.credits?.balance ?? null;
  const total = slipTotal(slip);
  const problems = React.useMemo(() => slipProblems(slip, balance), [slip, balance]);
  const blocking = problems.filter((p) => p.kind !== 'insufficient');
  const insufficient = problems.find((p): p is Extract<SlipProblem, { kind: 'insufficient' }> => p.kind === 'insufficient');
  const best = React.useMemo(() => maxPayout(slip), [slip]);

  // ── bet runner: one idempotency key per spin; a dropped response is retried with the SAME key ──────────────
  const finish = React.useCallback(() => {
    const bet = pending.current;
    if (!bet) return;
    pending.current = null;
    applySettledBet(qc, SLUG, bet);
    const spun = sendSlip.current;
    setRestPocket(bet.outcome.pocket);
    setSettled({ bet, slip: spun });
    setLastSpun(spun);
    setSlipState([]);
    setUndo([]);
    setLocked(null);
    setAnimating(false);
    release.current?.();
    release.current = null;
  }, [qc, setLastSpun]);

  const runner = useBetRunner<RouletteBetView>(
    (idempotencyKey) => gamesApi.placeBet<RouletteBetView>(SLUG, { params: toParams(sendSlip.current), idempotencyKey }),
    {
      onSettled: (bet) => {
        pending.current = bet;
        setAnimating(true);
        setSpin({ id: Date.now(), pocket: bet.outcome.pocket });
      },
      onError: (e) => {
        setLocked(null);
        release.current?.();
        release.current = null;
        if (['loss_limit', 'time_limit', 'self_excluded', 'region', 'blocked'].includes(e.kind)) {
          void qc.invalidateQueries({ queryKey: rgKeys.all });
          void qc.invalidateQueries({ queryKey: authKeys.accountStatus });
        }
        void qc.invalidateQueries({ queryKey: gameKeys.credits });
      },
    },
  );
  React.useEffect(
    () => () => {
      release.current?.();
      // left the page while the wheel was turning: the spin is settled on the server — sync balance + history now
      if (pending.current) applySettledBet(qc, SLUG, pending.current);
    },
    [qc],
  );

  // "Repeat these bets" from My bets: /games/pool-roulette?repeat=1 loads them onto the felt (the player still spins)
  const repeatOnce = React.useRef(false);
  React.useEffect(() => {
    if (repeatOnce.current || !lastSpun.length) return;
    if (new URLSearchParams(window.location.search).get('repeat') !== '1') return;
    repeatOnce.current = true;
    setSlipState(lastSpun);
    window.history.replaceState(null, '', window.location.pathname);
  }, [lastSpun]);

  const busy = runner.busy || animating;
  const canSpin = gate.gate === 'ok' && slip.length > 0 && problems.length === 0 && !busy;

  const doSpin = React.useCallback(() => {
    if (!canSpin) return;
    sendSlip.current = slip;
    setHover(null);
    setSettled(null);
    setTableNote(null);
    setSlipOpen(false);
    const c = gate.credits;
    setLocked({
      slip,
      total,
      credits: c ? { ...c, balance: money(c.balance).minus(money(total)).toFixed(2) } : undefined,
    });
    release.current?.();
    release.current = holdRealityCheck(); // reality checks only between spins: hold until the wheel stops
    void runner.run();
  }, [canSpin, slip, total, gate.credits, runner]);

  // ── slip editing (an undo snapshot per change) ───────────────────────────────────────────
  const edit = React.useCallback(
    (next: Slip) => {
      setUndo((u) => [...u.slice(-49), slip]);
      setSlipState(next);
      setSettled(null);
      if (runner.phase === 'failed') runner.reset();
    },
    [slip, runner],
  );
  const place = (s: Spot, value = chip) => {
    if (busy) return;
    const base = settled ? [] : slip;
    const r = addChip(base, s, value);
    if (r.error === 'max_spots') {
      setTableNote(`A spin takes at most ${RULES.maxSpots} different bets. Remove one to add ${spotLabel(s)}.`);
      return;
    }
    setTableNote(null);
    if (settled) {
      setUndo([]);
      setSlipState(r.slip);
      setSettled(null);
    } else edit(r.slip);
  };
  const takeOff = (s: Spot) => {
    if (busy || settled) return;
    const k = spotKey(s);
    if (!slip.some((b) => b.key === k)) return;
    edit(removeChip(slip, k, chip));
  };
  const doUndo = () => {
    if (busy || !undo.length) return;
    setSlipState(undo[undo.length - 1]!);
    setUndo((u) => u.slice(0, -1));
    setTableNote(null);
  };
  const doClear = () => {
    if (busy || !slip.length) return;
    edit([]);
    setTableNote(null);
  };
  const doRepeat = () => {
    if (busy || !lastSpun.length) return;
    setUndo((u) => [...u.slice(-49), slip]);
    setSlipState(lastSpun);
    setSettled(null);
    setTableNote(null);
  };

  // keyboard: Space spins, Backspace / Ctrl+Z undoes (never while typing or inside a dialog)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        doSpin();
      } else if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        doUndo();
      } else if (e.key === 'Escape') setHover(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── derived view state ───────────────────────────────────────────────────────────────────
  const reconnecting = runner.phase === 'reconnecting';
  const wheelPhase: WheelPhase = reconnecting
    ? 'reconnecting'
    : animating
      ? 'spinning'
      : runner.phase === 'placing'
        ? 'waiting'
        : settled
          ? 'result'
          : 'idle';
  const feltBets = settled ? settled.slip : locked ? locked.slip : slip;
  const feltResult: FeltResult | null = React.useMemo(() => {
    if (!settled) return null;
    const won = new Set<string>();
    const lost = new Set<string>();
    for (const b of settled.bet.outcome.bets ?? []) (b.win ? won : lost).add(spotKey({ type: b.type, numbers: b.numbers }));
    return { pocket: settled.bet.outcome.pocket, won, lost };
  }, [settled]);
  const shownCredits = locked?.credits ?? gate.credits;
  const shownBalance = shownCredits?.balance ?? null;
  const kind: GameNoticeKind | null = reconnecting ? 'reconnecting' : noticeKindOf(gate.gate);
  const blocked = kind !== null && kind !== 'reconnecting';
  const tableOff = busy || blocked || gate.gate === 'loading';
  const nextNonce = seeds.data?.active.nonce ?? null;
  const hash = seeds.data?.active.serverSeedHash ?? null;

  // ── refusals / pre-checks shown in the slip ──────────────────────────────────────────────
  const e = runner.phase === 'failed' ? runner.error : null;
  const resetBtn = () => {
    const r = gate.credits?.reset;
    return (
      <Button
        variant="ghost"
        size="s"
        className="min-h-11 tablet:min-h-8"
        disabled={!r?.available || reset.isPending}
        loading={reset.isPending}
        onClick={() => void reset.mutateAsync().then(() => runner.reset())}
        leadingIcon={<RotateCcw aria-hidden />}
      >
        {r?.available ? `Reset to ${formatAmount(r.to)} DEMO` : 'Reset available hourly'}
      </Button>
    );
  };
  const over = blocking.find((p) => p.kind === 'spot_above_max');
  const tableMax = blocking.find((p) => p.kind === 'table_max');
  const slipNotice =
    over && over.kind === 'spot_above_max' ? (
      <PanelNotice
        tone="danger"
        title="Bet over the table limit"
        actions={
          <Button
            variant="secondary"
            size="s"
            className="min-h-11 tablet:min-h-8"
            onClick={() => edit(setSpotAmount(slip, over.key, RULES.maxPerSpot))}
          >
            Set {over.label} to {formatAmount(RULES.maxPerSpot)}
          </Button>
        }
      >
        {over.label} is {formatAmount(over.amount)} DEMO — one spot takes at most {formatAmount(RULES.maxPerSpot)}. Lower it by{' '}
        {formatAmount(over.over)} or move the extra to another spot. We never change your bet without asking.
      </PanelNotice>
    ) : tableMax && tableMax.kind === 'table_max' ? (
      <PanelNotice tone="danger" title={`Table max is ${formatAmount(RULES.tableMax)} DEMO per spin`}>
        Your bets add up to {formatAmount(tableMax.total)}. Remove {formatAmount(tableMax.over)} to spin.
      </PanelNotice>
    ) : insufficient && gate.gate === 'ok' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits to spin" actions={resetBtn()}>
        Your bets add up to {formatAmount(insufficient.total)} but you have {formatAmount(insufficient.balance)} DEMO available — short by{' '}
        {formatAmount(insufficient.short)}. Remove bets, or reset your DEMO credits. Nothing has been charged.
      </PanelNotice>
    ) : e ? (
      e.kind === 'insufficient' ? (
        <PanelNotice tone="warning" title="Not enough DEMO credits" actions={resetBtn()}>
          {insufficientCopy(typeof e.details.available === 'string' ? e.details.available : balance)}
        </PanelNotice>
      ) : e.kind === 'reality_check' ? (
        <PanelNotice title="Time for your reality check">Answer the reminder to keep playing — it only appears between spins.</PanelNotice>
      ) : (
        <PanelNotice tone={e.kind === 'loss_limit' || e.kind === 'self_excluded' ? 'warning' : 'danger'} title="This spin wasn’t placed">
          {e.message}
          {e.requestId ? ` · ref ${e.requestId}` : ''} Nothing has been charged.
        </PanelNotice>
      )
    ) : tableNote ? (
      <PanelNotice tone="warning" title="Too many bets">
        {tableNote}
      </PanelNotice>
    ) : null;

  /** Full label (slip, ≥ 768) and a short one for the 390 sticky bar. */
  const ctaLabels = (): [string, string] =>
    reconnecting
      ? ['Waiting for connection…', 'Reconnecting…']
      : animating || runner.phase === 'placing'
        ? ['Spinning…', 'Spinning…']
        : gate.gate === 'loss_limit'
          ? ['Paused — loss limit reached', 'Paused · loss limit']
          : gate.gate === 'region'
            ? ['Not available in your region', 'Not available here']
            : gate.gate !== 'ok' && gate.gate !== 'loading'
              ? ['Play paused', 'Play paused']
              : !slip.length
                ? ['Place a bet to spin', 'Place a bet']
                : blocking.length
                  ? ['Fix the highlighted bet', 'Fix your bets']
                  : insufficient
                    ? ['Not enough DEMO credits', 'Not enough credits']
                    : [`Spin · ${formatAmount(total)} DEMO`, `Spin · ${formatAmount(total)}`];

  const cta = (className?: string, short = false) =>
    gate.gate === 'guest' ? (
      <Button size="l" block className={className} onClick={() => auth.signIn()} leadingIcon={<LogIn aria-hidden />}>
        Sign in to play
      </Button>
    ) : !slip.length && lastSpun.length > 0 && !busy && gate.gate === 'ok' ? (
      // Loads the same bets onto the felt — the player still presses Spin (no one-tap re-bet after a loss).
      <Button
        variant="secondary"
        size="l"
        block
        className={className}
        onClick={doRepeat}
        leadingIcon={<RotateCcw aria-hidden />}
        data-testid="roulette-repeat-cta"
      >
        <span className="truncate">
          {short ? 'Repeat' : 'Repeat last bets'} · {formatAmount(slipTotal(lastSpun))}
        </span>
      </Button>
    ) : (
      <Button
        size="l"
        block
        className={className}
        disabled={!canSpin}
        loading={runner.phase === 'placing' || animating}
        onClick={doSpin}
        leadingIcon={<CircleDot aria-hidden />}
        data-testid="roulette-spin"
      >
        <span className="truncate">{ctaLabels()[short ? 1 : 0]}</span>
      </Button>
    );

  const slipProps = {
    slip: locked ? locked.slip : slip,
    locked: busy,
    balance: shownBalance,
    chip,
    problems,
    total: locked ? locked.total : total,
    maxPayout: best,
    onRemove: (k: string) => edit(removeSpot(slip, k)),
    onUndo: doUndo,
    onClear: doClear,
    onRepeat: doRepeat,
    canUndo: undo.length > 0,
    repeatTotal: lastSpun.length ? slipTotal(lastSpun) : null,
  };

  // ── status column (RL-01 … RL-05) ────────────────────────────────────────────────────────
  const status = (() => {
    if (busy && locked) {
      return (
        <>
          <PhaseLabel icon={reconnecting ? WifiOff : Loader2} tone={reconnecting ? 'warning' : 'brand'} spin={!reconnecting}>
            {reconnecting ? 'Connection lost' : 'Spinning'}
          </PhaseLabel>
          <h2 className="text-h3 text-text-primary">{reconnecting ? 'Your spin is safe' : 'No more bets'}</h2>
          <p className="text-body-s text-text-secondary">
            {reconnecting
              ? 'We’re reconnecting. The spin settles on the server exactly once — Spin stays disabled until we have its result.'
              : `Your ${formatAmount(locked.total)} DEMO stake is locked and the pocket is already fixed by your seed pair. The animation only reveals it — nothing you do now can change the result.`}
          </p>
          <LockedCard slip={locked.slip} available={locked.credits?.balance ?? null} />
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 text-caption text-text-tertiary">
            <Timer aria-hidden className="size-3.5" />
            Spin {(GAME_MOTION.wheelSpin / 1000).toFixed(1)} s · reduced motion: result appears instantly
          </p>
        </>
      );
    }
    if (settled) {
      const p = settled.bet.outcome.pocket;
      return (
        <>
          <PhaseLabel icon={Hash} tone="brand">
            Result
          </PhaseLabel>
          <div className="flex items-center gap-4">
            <PocketDisc n={p} size={64} newest />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-h2 text-text-primary" data-testid="result-pocket">
                {pocketName(p)}
              </h2>
              <p className="text-body-s text-text-secondary">{pocketFacts(p)}</p>
            </div>
          </div>
          <RouletteResultBanner bet={settled.bet} onVerify={() => setVerifyId(settled.bet.id)} />
          <SettlementCard bet={settled.bet} />
        </>
      );
    }
    if (!hover && (over || tableMax || (insufficient && gate.gate === 'ok'))) {
      return over && over.kind === 'spot_above_max' ? (
        <>
          <PhaseLabel icon={TriangleAlert} tone="warning">
            Table limit
          </PhaseLabel>
          <h2 className="text-h3 text-text-primary">{over.label} is over the spot limit</h2>
          <p className="text-body-s text-text-secondary">
            One spot takes at most {formatAmount(RULES.maxPerSpot)} DEMO. Lower {over.label} by {formatAmount(over.over)} DEMO or move the
            extra to another spot. The table maximum is {formatAmount(RULES.tableMax)} DEMO per spin. We never change your bet without
            asking.
          </p>
        </>
      ) : tableMax && tableMax.kind === 'table_max' ? (
        <>
          <PhaseLabel icon={TriangleAlert} tone="warning">
            Table limit
          </PhaseLabel>
          <h2 className="text-h3 text-text-primary">Over the table max</h2>
          <p className="text-body-s text-text-secondary">
            Your bets add up to {formatAmount(tableMax.total)} DEMO; one spin takes at most {formatAmount(RULES.tableMax)}. Remove{' '}
            {formatAmount(tableMax.over)} to spin.
          </p>
        </>
      ) : (
        <>
          <PhaseLabel icon={CircleAlert} tone="danger">
            Check your balance
          </PhaseLabel>
          <h2 className="text-h3 text-text-primary">Not enough DEMO credits to spin</h2>
          <p className="text-body-s text-text-secondary">
            Your bets add up to {formatAmount(insufficient!.total)} DEMO, but you have {formatAmount(insufficient!.balance)} DEMO available.
            Remove bets until the total is {formatAmount(insufficient!.balance)} or less, or reset your DEMO credits (once per hour). DEMO
            credits can’t be bought. Nothing has been charged.
          </p>
        </>
      );
    }
    if (hover) {
      const n = covers(hover).length;
      return (
        <>
          <PhaseLabel icon={isOutside(hover) ? Layers : Hash} tone="brand">
            {isOutside(hover) ? 'Outside bets' : 'Inside bets'}
          </PhaseLabel>
          <h2 className="text-h3 text-text-primary">
            {spotLabel(hover)} — pays {paysOf(hover.type)}
          </h2>
          <p className="text-body-s text-text-secondary">
            {formatAmount(chip)} DEMO here wins if {n === 1 ? 'that number' : `any of its ${n} numbers`} comes up: {n} of 37 pockets (
            {chanceOf(hover)}%), returning {formatAmount(returnsOf(hover.type, chip).toFixed(2))} DEMO.
            {isOutside(hover) ? ' Zero is never part of a column, dozen or even-money bet.' : ''}
          </p>
        </>
      );
    }
    return (
      <>
        <PhaseLabel icon={CircleDot} tone="brand">
          Place your bets
        </PhaseLabel>
        <h2 className="text-h3 text-text-primary">{slip.length ? `${slip.length} ${slip.length === 1 ? 'bet' : 'bets'} · ${formatAmount(total)} DEMO` : 'Place your bets'}</h2>
        {slip.length > 0 ? (
          <OutcomePreviewCard slip={slip} />
        ) : (
          <p className="text-body-s text-text-secondary">
            Pick a chip, then tap the felt. Bets close when you press Spin — the pocket is fixed by your seed pair, the wheel only
            reveals it.
          </p>
        )}
      </>
    );
  })();

  const topLabel = reconnecting
    ? 'Reconnecting · spin held on the server'
    : busy
      ? 'No more bets · spinning'
      : settled
        ? `Settled · spin ${settled.bet.ref}`
        : 'Bets open · next spin';
  const topMeta =
    nextNonce === null
      ? 'Sign in to see your seed pair'
      : settled
        ? `Nonce ${settled.bet.fairness.nonce} · next spin uses nonce ${nextNonce}`
        : `Nonce ${nextNonce} · server seed hash ${shortHash(hash)} committed before you bet`;

  const wheel = (cls: string) => (
    <div className={cls}>
      <RouletteWheel
        pocket={restPocket}
        spin={spin}
        durationMs={reduced ? 0 : GAME_MOTION.wheelSpin}
        onSpinEnd={finish}
        phase={wheelPhase}
      />
    </div>
  );

  const loading = gate.gate === 'loading' && !gate.credits;

  const stage = loading ? (
    <div className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-6" aria-busy="true">
      <Skeleton className="h-4 w-56" />
      <div className="flex items-center gap-6">
        <Skeleton className="aspect-square w-40 rounded-full laptop:w-64" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <Skeleton className="h-[220px] w-full rounded-xl laptop:h-[300px]" />
      <p role="status" className="flex items-center gap-2 text-caption text-text-secondary">
        <Loader2 aria-hidden className="size-4 animate-spin text-icon-brand" />
        Connecting to the game server · loading your seed pair
      </p>
    </div>
  ) : (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:gap-5 tablet:p-6" data-testid="roulette-stage">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className={cn('text-overline uppercase', reconnecting ? 'text-text-warning' : busy ? 'text-text-brand' : 'text-text-tertiary')}>{topLabel}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
            {topMeta}
            <DemoBadge size="xs" />
          </p>
        </div>
        <KitChip icon={Hash} className="hidden tablet:inline-flex">
          37 pockets · 0–36
        </KitChip>
      </div>

      {wide ? (
        <div className="grid items-start gap-6 tablet:grid-cols-[240px_minmax(0,1fr)] laptop:grid-cols-[280px_minmax(0,1fr)] desktop:grid-cols-[300px_minmax(0,1fr)]">
          {wheel('w-full')}
          {/* While betting, the status text sits in a box as tall as the wheel: hovering a spot never moves the felt under
              the pointer (or under a finger on touch screens). Spinning / result views take their natural height. */}
          <div className={cn('relative min-w-0', !busy && !settled && 'self-stretch')}>
            <div
              className={cn('flex min-w-0 flex-col gap-3', !busy && !settled && 'absolute inset-0 overflow-y-auto pr-1')}
              aria-live="polite"
            >
              {status}
            </div>
          </div>
        </div>
      ) : (
        <MobileStageTop
          wheel={wheel(busy || settled ? 'mx-auto w-60' : 'w-[132px] shrink-0')}
          big={busy || !!settled}
          status={status}
          busy={busy}
          settled={!!settled}
        />
      )}

      {wide ? (
        <>
          <RouletteFelt
            bets={feltBets}
            onPlace={(s) => place(s)}
            onRemove={takeOff}
            onMore={(n) => setSheetN(n)}
            hover={hover}
            onHover={setHover}
            disabled={tableOff}
            result={feltResult}
            className={cn(busy && 'opacity-55')}
          />
          <p className="flex items-start gap-2 text-caption text-text-tertiary">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            Tap a number for a straight bet · the line between two numbers = split · outer edge of a row = street · where four meet =
            corner · edge between two streets = line · right-click removes a chip. Keyboard: arrows move, Enter = straight, B = more
            bet types, Delete removes, Space spins.
          </p>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3">
            <div className="flex flex-col">
              <span className="text-label-m text-text-secondary">Chip value</span>
              <span className="text-caption text-text-tertiary">Pick, then tap the felt</span>
            </div>
            <ChipRow value={chip} onChange={setChip} disabled={tableOff} />
            <span className="ml-auto text-caption text-text-tertiary">
              Selected <span className="text-text-primary tabular-nums">{formatAmount(chip)} DEMO</span>
            </span>
          </div>
        </>
      ) : (
        !busy && (
          <>
            <div role="radiogroup" aria-label="Table view" className="grid grid-cols-2 gap-1 rounded-lg border border-border-subtle bg-bg-secondary p-1">
              {(['numbers', 'outside'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'h-11 rounded-md text-label-m text-text-secondary focus-visible:outline-2 focus-visible:outline-border-focus',
                    view === v && 'border border-border-brand bg-brand-tint text-text-brand',
                  )}
                >
                  {v === 'numbers' ? 'Numbers' : 'Outside bets'}
                </button>
              ))}
            </div>
            {view === 'numbers' ? (
              <RouletteFeltVertical
                bets={feltBets}
                onNumber={(n) => setSheetN(n)}
                onPlace={(s) => place(s)}
                onRemove={takeOff}
                disabled={tableOff}
                result={feltResult}
              />
            ) : (
              <OutsidePanel bets={feltBets} onPlace={(s) => place(s)} disabled={tableOff} />
            )}
            <p className="text-center text-caption text-text-tertiary">
              {view === 'numbers'
                ? 'Tap a number to choose straight, split, street, corner or line · long-press removes a chip'
                : 'Outside bets are big targets for one-thumb play · switch to Numbers for inside bets'}
            </p>
          </>
        )
      )}
    </div>
  );

  const panelNotice = slipNotice;

  return (
    <>
      <div className={cn('flex flex-col gap-5 tablet:gap-6', 'pb-[236px] tablet:pb-0')}>
        <ShellOverride collapseSidebar restricted={gate.gate === 'region'} regionName={gate.regionName} />
        <GameHeader
          slug={SLUG}
          title="Pool Roulette"
          mechanic="European · single zero"
          icon={CircleDot}
          category="Table games"
          onFairness={() => setSeedsOpen(true)}
          chips={<RouletteHeaderChips />}
        />
        <GameTabs />
        {gate.gate !== 'guest' && (
          <GameSessionBar data={shownCredits} lossLimit={gate.lossLimit} loading={gate.gate === 'loading'} />
        )}
        {gate.gate !== 'guest' && (
          <DemoCreditsChip data={shownCredits} loading={gate.gate === 'loading'} disabled={busy} compact className="tablet:hidden" />
        )}

        <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_340px] laptop:items-start tablet:gap-6">
          <div className={cn('relative min-w-0', kind && 'min-h-[520px]')}>
            <div className={cn(kind && kind !== 'reconnecting' && 'opacity-25')} inert={blocked || undefined} aria-hidden={blocked || undefined}>
              {stage}
            </div>
            {kind && (
              <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-3 tablet:items-center tablet:p-6">
                <GameNotice
                  kind={kind}
                  gameName="Pool Roulette"
                  regionName={gate.regionName}
                  exclusionEndsAt={gate.exclusionEndsAt}
                  lossLimit={gate.lossLimit}
                  onRetry={gate.refetch}
                  reconnect={
                    reconnecting
                      ? { attempt: runner.attempt, max: runner.maxAttempts, stake: locked?.total, sentAt: runner.sentAt, onRetry: runner.retryNow }
                      : undefined
                  }
                />
              </div>
            )}
          </div>

          {/* < 768 the slip lives in a sheet: show its limit / balance / refusal notice in the page */}
          {panelNotice && !blocked && <div className="tablet:hidden">{panelNotice}</div>}

          <div
            className={cn('grid min-w-0 gap-5 tablet:grid-cols-2 laptop:grid-cols-1', blocked && 'opacity-60')}
            inert={blocked || undefined}
          >
            {gate.gate !== 'guest' && (
              <DemoCreditsChip
                data={shownCredits}
                loading={gate.gate === 'loading'}
                disabled={busy}
                compact
                className="hidden tablet:col-span-2 tablet:flex laptop:col-span-1"
              />
            )}
            <BetSlip
              {...slipProps}
              className="hidden tablet:flex"
              notice={panelNotice}
              cta={<div className="flex flex-col gap-2">{cta()}</div>}
            />
            <BeforeYouBet
              houseEdge={INFO.houseEdgePercent}
              rows={[
                { label: 'Per spot', value: `${formatAmount(RULES.minPerSpot)} – ${formatAmount(RULES.maxPerSpot)} DEMO` },
                { label: 'Table max per spin', value: `${formatAmount(RULES.tableMax)} DEMO` },
                {
                  label: 'This spin',
                  value: `${formatAmount(locked ? locked.total : total)} / ${formatAmount(RULES.tableMax)}`,
                  tone: tableMax ? 'text-text-danger' : undefined,
                },
                { label: 'Pockets covered', value: `${coveredPockets(locked ? locked.slip : slip)} of 37` },
              ]}
              limits={`Per spot ${formatAmount(RULES.minPerSpot)} – ${formatAmount(RULES.maxPerSpot)} · max ${formatAmount(RULES.tableMax)} DEMO per spin.`}
            />
          </div>
        </div>

        <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] tablet:gap-6">
          <RecentSpins onSelect={(b) => setVerifyId(b.id)} />
          <SeedDisplay slug={SLUG} disabled={busy} open={seedsOpen} onOpenChange={setSeedsOpen} />
        </div>

        <div id="my-bets" className="scroll-mt-24">
          <BetHistory<RouletteBetView>
            slug={SLUG}
            title="My spins"
            noun="spin"
            columns={COLUMNS}
            summary={(b) => `${typeof b.outcome?.pocket === 'number' ? pocketName(b.outcome.pocket) : '—'} · ${betsSummary(b.params?.bets, 2)}`}
            onVerify={(b) => setVerifyId(b.id)}
          />
        </div>
        <MoreGamesRail current={SLUG} />
        <LicenceLine className="rounded-lg border border-border-subtle px-4 py-3" />
      </div>

      {/* < 768: sticky chip tray + Undo / Clear / Repeat + Spin above the tab bar */}
      <MobileTableBar
        slipCount={(locked ? locked.slip : slip).length}
        total={locked ? locked.total : total}
        maxPayout={best.amount}
        busy={busy}
        settled={settled}
        chip={chip}
        onChip={setChip}
        onUndo={doUndo}
        onClear={doClear}
        onRepeat={doRepeat}
        canUndo={undo.length > 0}
        hasSlip={slip.length > 0}
        canRepeat={lastSpun.length > 0}
        repeatTotal={lastSpun.length ? slipTotal(lastSpun) : null}
        tableOff={tableOff}
        onOpenSlip={() => setSlipOpen(true)}
        cta={cta('min-w-0', true)}
        guest={gate.gate === 'guest'}
      />

      <ResponsiveModal open={slipOpen && !wide} onOpenChange={setSlipOpen} title="Bet slip" description="Pool Roulette · single zero · DEMO credits · no cash value">
        <BetSlip {...slipProps} bare notice={panelNotice} cta={cta()} />
      </ResponsiveModal>

      <BetTypeSheet
        n={sheetN}
        open={sheetN !== null}
        onOpenChange={(o) => !o && setSheetN(null)}
        chip={chip}
        onChipChange={setChip}
        onAdd={(s) => {
          place(s);
          setSheetN(null);
        }}
      />

      <VerifyDrawer
        betId={verifyId}
        open={verifyId !== null}
        onOpenChange={(o) => !o && setVerifyId(null)}
        describeOutcome={describeOutcome}
        noun="spin"
        formula="pocket = floor(u32 × 37 ÷ 2³²), u32 = the first 4 bytes of HMAC-SHA256(server seed, “client seed:nonce:0”) — European single zero, every bet settled from that pocket."
      />
    </>
  );
}

function PhaseLabel({
  icon: Icon,
  tone,
  spin = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: 'brand' | 'warning' | 'danger';
  spin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-2 text-overline uppercase',
        tone === 'brand' ? 'text-text-brand' : tone === 'warning' ? 'text-text-warning' : 'text-text-danger',
      )}
    >
      <Icon aria-hidden className={cn('size-4', spin && 'animate-spin motion-reduce:animate-none')} />
      {children}
    </p>
  );
}

function MobileStageTop({
  wheel,
  big,
  status,
}: {
  wheel: React.ReactNode;
  big: boolean;
  status: React.ReactNode;
  busy: boolean;
  settled: boolean;
}) {
  return big ? (
    <div className="flex flex-col gap-4">
      {wheel}
      <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
        {status}
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-4">
      {wheel}
      <div className="flex min-w-0 flex-col gap-1.5 [&_h2]:text-h4 [&_[data-testid=outcome-preview]]:hidden" aria-live="polite">
        {status}
      </div>
    </div>
  );
}

/** Mobile "Outside bets" view (RL-03 390): big one-thumb boxes. */
function OutsidePanel({ bets, onPlace, disabled }: { bets: Slip; onPlace: (s: Spot) => void; disabled?: boolean }) {
  const amount = (s: Spot) => bets.find((b) => b.key === spotKey(s))?.amount;
  const box = (s: Spot, label: string, sub: string, dot?: 'red' | 'black') => {
    const a = amount(s);
    return (
      <button
        key={spotKey(s)}
        type="button"
        disabled={disabled}
        onClick={() => onPlace(s)}
        data-testid={`mout-${spotKey(s)}`}
        aria-label={`${spotLabel(s)} — pays ${paysOf(s.type)}, ${sub}${a ? `, your bet ${a} DEMO` : ''}`}
        className={cn(
          'flex min-h-16 flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-border-focus disabled:opacity-50',
          a ? 'border-border-brand bg-brand-tint-subtle' : 'border-border-default bg-surface-raised',
        )}
      >
        <span className="flex h-7 items-center gap-1.5 text-label-l text-text-primary">
          {dot && (
            <span aria-hidden className={cn('size-3 rounded-full border border-border-strong', dot === 'red' ? 'bg-status-danger-strong' : 'bg-ink-950')} />
          )}
          {label}
          {a && <span className="ml-auto text-number-s text-text-brand tabular-nums">{formatAmount(a)}</span>}
        </span>
        <span className="text-caption text-text-tertiary">
          {paysOf(s.type)} · {sub}
        </span>
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Outside bets">
      <div className="grid grid-cols-2 gap-2">
        {box({ type: 'red' }, 'RED', '18 numbers', 'red')}
        {box({ type: 'black' }, 'BLACK', '18 numbers', 'black')}
        {box({ type: 'odd' }, 'ODD', '18 numbers')}
        {box({ type: 'even' }, 'EVEN', '18 numbers')}
        {box({ type: 'low' }, '1–18', 'low half')}
        {box({ type: 'high' }, '19–36', 'high half')}
      </div>
      <p className="mt-1 text-overline uppercase text-text-tertiary">Dozens · 2:1 · 12 numbers</p>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((d) => box({ type: 'dozen', numbers: [d] }, ['1st 12', '2nd 12', '3rd 12'][d - 1]!, `${12 * d - 11}–${12 * d}`))}
      </div>
      <p className="mt-1 text-overline uppercase text-text-tertiary">Columns · 2:1 · 12 numbers</p>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((c) => box({ type: 'column', numbers: [c] }, `Col ${c}`, `${c}, ${c + 3} … ${c + 33}`))}
      </div>
    </div>
  );
}

function MobileTableBar({
  slipCount,
  total,
  maxPayout: maxPay,
  busy,
  settled,
  chip,
  onChip,
  onUndo,
  onClear,
  onRepeat,
  canUndo,
  hasSlip,
  canRepeat,
  repeatTotal,
  tableOff,
  onOpenSlip,
  cta,
  guest,
}: {
  slipCount: number;
  total: string;
  maxPayout: string;
  busy: boolean;
  settled: { bet: RouletteBetView } | null;
  chip: string;
  onChip: (v: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onRepeat: () => void;
  canUndo: boolean;
  hasSlip: boolean;
  canRepeat: boolean;
  repeatTotal: string | null;
  tableOff: boolean;
  onOpenSlip: () => void;
  cta: React.ReactNode;
  guest: boolean;
}) {
  const summary =
    settled && !hasSlip
      ? `Spin settled · ${money(settled.bet.net).gt(0) ? '+' : ''}${formatAmount(settled.bet.net)} DEMO`
      : slipCount === 0
        ? 'No bets yet'
        : `${slipCount} ${slipCount === 1 ? 'bet' : 'bets'} · ${formatAmount(total)} DEMO${busy ? ' locked' : ''}`;
  const sub =
    settled && !hasSlip
      ? 'Each spin is independent — a loss never makes a number “due”'
      : slipCount === 0
        ? 'Pick a chip, then tap the table · edge 2.70%'
        : `Max payout ${formatAmount(maxPay)} · edge 2.70%`;
  return (
    <div
      className="fixed inset-x-0 z-30 flex flex-col gap-2.5 border-t border-border-subtle bg-bg-secondary px-3 pt-3 pb-3 tablet:hidden"
      style={{ bottom: 'var(--gp-tabbar-h, 56px)' }}
      data-testid="mobile-table-bar"
    >
      <div className="flex items-center gap-2">
        <Layers aria-hidden className="size-4 shrink-0 text-icon-muted" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-s-strong text-text-primary">{summary}</span>
          <span className="truncate text-caption text-text-tertiary">{sub}</span>
        </div>
        <DemoBadge size="xs" />
        <Button variant="ghost" size="s" className="min-h-11" onClick={onOpenSlip} trailingIcon={<ChevronUp aria-hidden />}>
          Bet slip
        </Button>
      </div>
      {!guest && <ChipRow value={chip} onChange={onChip} size={44} disabled={tableOff} className="justify-between" />}
      <div className="flex items-center gap-2">
        {!guest && (
          <>
            <IconButton variant="secondary" label="Undo last chip" className="size-12 shrink-0" disabled={busy || !canUndo} onClick={onUndo}>
              <Undo2 aria-hidden />
            </IconButton>
            <IconButton variant="secondary" label="Clear all bets" className="size-12 shrink-0" disabled={busy || !hasSlip} onClick={onClear}>
              <Trash2 aria-hidden />
            </IconButton>
            <IconButton
              variant="secondary"
              label={repeatTotal ? `Repeat last bets (${repeatTotal} DEMO)` : 'Repeat last bets'}
              className="size-12 shrink-0"
              disabled={busy || !canRepeat}
              onClick={onRepeat}
            >
              <RotateCcw aria-hidden />
            </IconButton>
          </>
        )}
        <div className="min-w-0 flex-1">{cta}</div>
      </div>
      <p className="text-center text-caption text-text-tertiary">You can lose your stake · each spin is independent · 18+</p>
    </div>
  );
}
