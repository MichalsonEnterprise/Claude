'use client';

import { formatAmount, money, roundDown } from '@gp/shared/money';
import { formatTimeUTC } from '@gp/shared/format';
import { useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  BarChart3,
  Info,
  LogIn,
  Play,
  RotateCcw,
  Rocket,
  Square,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  BetAmountField,
  BetPanel,
  CreditsAmount,
  DemoCreditsChip,
  GameHeader,
  GameNotice,
  GameSessionBar,
  KitChip,
  LicenceLine,
  PanelNotice,
  StakeRiskNote,
  autoStopMessage,
  insufficientCopy,
  noticeKindOf,
  parseStake,
  stakeProblem,
  stakeProblemMessage,
  useAutoPlay,
  useBetRunner,
  useGameGate,
  useReducedMotion,
  type GameNoticeKind,
} from '@/components/games/kit';
import { holdRealityCheck } from '@/components/rg-history/reality-check';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button, IconButton } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { authKeys } from '@/lib/api/auth';
import { ApiNetworkError, ApiRequestError, newIdempotencyKey } from '@/lib/api/client';
import {
  classifyGameError,
  gameKeys,
  useResetCredits,
  type DemoCreditsView,
  type GameError,
} from '@/lib/api/games';
import { orbitRushKeys, type CrashMyBet } from '@/lib/api/orbit-rush';
import { rgKeys } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { AutoPlayDialog, type CrashAutoConfig } from './autoplay-dialog';
import { CrashCurve, type CurveMode } from './crash-curve';
import {
  HOUSE_EDGE,
  INFO,
  MAX_MULTIPLIER,
  MIN_TARGET,
  RULES,
  SLUG,
  chanceToReachPercent,
  fmtX,
  parseTarget,
  payoutAt,
  profitAt,
  sanitizeTargetInput,
  targetProblem,
  targetProblemMessage,
  winChancePercent,
} from './crash-math';
import {
  CardShell,
  ConnectionBanner,
  HowRoundWorksCard,
  LiveBetsPanel,
  OddsLimitsCard,
  ProvablyFairCard,
  RecentResults,
  RoundFooter,
  SummaryRow,
  type PhasePillKind,
} from './crash-parts';
import { BettingOverlay, NextRoundOverlay, ReadoutCard, ReconnectOverlay, ResultCard } from './crash-stage';
import type { CrashLiveClient, CrashLiveState } from './live-client';
import { CRASH_ROUTES } from './routes';
import { useCrashLive, useServerNow } from './use-crash-live';

/** Last ms of the betting window in which the panel still offers "Place bet" (latency margin; the server decides). */
const CLOSE_MARGIN_MS = 400;

type Phase = 'loading' | 'error' | 'betting' | 'running' | 'crashed';

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A' || el.isContentEditable || !!el.closest('[role="dialog"]');
}

/** Cash-out runner: one idempotency key per press, retried (same key) while the ack is lost; never retries a refusal. */
function useCashOut(client: CrashLiveClient, onDone: (bet: CrashMyBet) => void) {
  const [state, setState] = React.useState<{ busy: boolean; error: GameError | null }>({ busy: false, error: null });
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;
  const run = React.useCallback(
    async (betId: string) => {
      if (state.busy) return;
      setState({ busy: true, error: null });
      const key = newIdempotencyKey();
      for (let attempt = 1; ; attempt += 1) {
        try {
          const bet = await client.cashOut(betId, key);
          setState({ busy: false, error: null });
          doneRef.current(bet);
          return;
        } catch (err) {
          const retry = !(err instanceof ApiRequestError) && attempt < 4;
          if (!retry) {
            setState({ busy: false, error: classifyGameError(err) });
            return;
          }
          await client.waitFor((s) => s.link === 'live').catch(() => undefined);
        }
      }
    },
    [client, state.busy],
  );
  return { ...state, run, clear: () => setState({ busy: false, error: null }) };
}

/** Orbit Rush (CR-01 … CR-08) — live crash rounds over socket.io `/crash`. DEMO credits only, no cash value. */
export function CrashGame() {
  const auth = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const gate = useGameGate();
  const reduced = useReducedMotion();
  const wide = useMediaQuery(MQ.tablet, true);
  const { live, client } = useCrashLive();

  const [stake, setStake] = React.useState('10.00');
  const [autoOn, setAutoOn] = React.useState(true);
  const [target, setTarget] = React.useState('2.00');
  const [mode, setMode] = React.useState<'manual' | 'auto'>('manual');
  const [autoOpen, setAutoOpen] = React.useState(false);
  const [autoCfg, setAutoCfg] = React.useState<CrashAutoConfig | null>(null);
  const [autoNote, setAutoNote] = React.useState<string | null>(null);
  /** "Bet next round": placed automatically when the next betting window opens (cancellable until then). */
  const [queued, setQueued] = React.useState<{ stake: string; autoCashOut: string | null } | null>(null);

  // ── phase + server clock ───────────────────────────────────────────────────────────────────
  const round = live.round;
  const phase: Phase = !live.loaded ? (live.loadError ? 'error' : 'loading') : (round?.status ?? 'loading');
  const ticking = phase === 'betting' || phase === 'crashed' || (live.link !== 'live' && live.nextRetryAt !== null);
  const serverNow = useServerNow(live.offsetMs, ticking);
  const msLeft = round && phase === 'betting' ? Date.parse(round.startedAt) - serverNow : 0;
  const nextIn = round?.nextRoundAt ? Date.parse(round.nextRoundAt) - serverNow : null;
  const online = live.link === 'live';

  // ── my bet ─────────────────────────────────────────────────────────────────────────────────
  const myBet = live.myBet;
  const myInRound = !!myBet && !!round && myBet.round.id === round.id;
  const myActive = myInRound && myBet.status === 'active';
  const mySettledHere = myInRound && myBet.status !== 'active';

  // reality checks only between bets: hold the reminder while my bet is in the air
  React.useEffect(() => {
    if (!myActive) return;
    const release = holdRealityCheck();
    return release;
  }, [myActive]);

  // my bet settled (cash-out, auto cash-out on the server, or crash): refresh balance, session and history
  const lastStatus = React.useRef<string | null>(null);
  React.useEffect(() => {
    const s = myBet ? `${myBet.id}:${myBet.status}` : null;
    if (s && lastStatus.current && s !== lastStatus.current && myBet!.status !== 'active') {
      void qc.invalidateQueries({ queryKey: gameKeys.credits });
      void qc.invalidateQueries({ queryKey: orbitRushKeys.myBets });
    }
    lastStatus.current = s;
  }, [myBet, qc]);

  // ── stake + target ─────────────────────────────────────────────────────────────────────────
  const balance = gate.credits?.balance ?? null;
  const limits = { min: INFO.minBet, max: INFO.maxBet, balance };
  const sProblem = stakeProblem(stake, limits);
  const stakeOk = parseStake(stake);
  const tProblem = autoOn ? targetProblem(target) : null;
  const targetOk = autoOn ? parseTarget(target) : null;
  const formOk = sProblem === null && (!autoOn || !!targetOk);

  // ── placing a bet (socket; same idempotency key on every retry) ──────────────────────────
  const intent = React.useRef<{ stake: string; autoCashOut: string | null }>({ stake: '', autoCashOut: null });
  const onBetPlaced = React.useCallback(
    (bet: CrashMyBet) => {
      if (bet.balance !== undefined) {
        qc.setQueryData<DemoCreditsView>(gameKeys.credits, (c) => (c ? { ...c, balance: bet.balance! } : c));
      }
      void qc.invalidateQueries({ queryKey: gameKeys.credits });
    },
    [qc],
  );
  const onBetError = React.useCallback(
    (e: GameError) => {
      if (['loss_limit', 'time_limit', 'self_excluded', 'region', 'blocked'].includes(e.kind)) {
        void qc.invalidateQueries({ queryKey: rgKeys.all });
        void qc.invalidateQueries({ queryKey: authKeys.accountStatus });
      }
      void qc.invalidateQueries({ queryKey: gameKeys.credits });
    },
    [qc],
  );
  const runner = useBetRunner<CrashMyBet>(
    (idempotencyKey) => client.placeBet({ ...intent.current, idempotencyKey }),
    { maxAttempts: 3, onSettled: onBetPlaced, onError: onBetError },
  );
  const place = React.useCallback(
    (p: { stake: string; autoCashOut: string | null }) => {
      intent.current = p;
      return runner.run();
    },
    [runner],
  );

  const cash = useCashOut(client, (bet) => {
    if (bet.balance !== undefined) {
      qc.setQueryData<DemoCreditsView>(gameKeys.credits, (c) => (c ? { ...c, balance: bet.balance! } : c));
    }
  });

  // ── gate / notices ─────────────────────────────────────────────────────────────────────────
  const gateKind = noticeKindOf(gate.gate);
  /** A round in progress is never interrupted: with my bet in the air nothing blocks the stage or cash-out. */
  const blockKind: GameNoticeKind | null =
    myActive || gateKind === 'offline' || gateKind === 'guest' ? null : gateKind;
  const canBetNow =
    gate.gate === 'ok' &&
    online &&
    phase === 'betting' &&
    msLeft > CLOSE_MARGIN_MS &&
    !myInRound &&
    formOk &&
    !runner.busy;

  // ── queued "Bet next round" ────────────────────────────────────────────────────────────────
  const queuedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!queued || phase !== 'betting' || !round || myInRound || runner.busy) return;
    if (queuedFor.current === round.id) return;
    if (gate.gate !== 'ok' || !online) return;
    queuedFor.current = round.id;
    const q = queued;
    setQueued(null);
    void place(q);
  }, [queued, phase, round, myInRound, runner.busy, gate.gate, online, place]);

  // ── auto-play (CR-06): one ordinary bet per round, fixed stake, server-side auto cash-out ─────
  const abortRef = React.useRef<AbortController | null>(null);
  const autoCfgRef = React.useRef(autoCfg);
  autoCfgRef.current = autoCfg;
  const runnerRef = React.useRef(runner);
  runnerRef.current = runner;
  const auto = useAutoPlay(async (autoStake) => {
    const cfg = autoCfgRef.current;
    if (!cfg) return null;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await client.waitFor(
        (st) =>
          st.link === 'live' &&
          st.round?.status === 'betting' &&
          !(st.myBet && st.myBet.round.id === st.round.id) &&
          Date.parse(st.round.startedAt) - (Date.now() + st.offsetMs) > 800,
        ac.signal,
      );
      const bet = await place({ stake: autoStake, autoCashOut: cfg.target });
      if (!bet) {
        return runnerRef.current.lastError()?.kind === 'reality_check' ? { stop: 'reality_check' as const } : null;
      }
      const done = await client.waitFor((st) => !!st.myBet && st.myBet.id === bet.id && st.myBet.status !== 'active', ac.signal);
      return { net: done.myBet!.net };
    } catch {
      return null;
    }
  }, 0);
  const stopAuto = React.useCallback(
    (note?: string) => {
      abortRef.current?.abort();
      auto.stop();
      if (note) setAutoNote(note);
    },
    [auto],
  );
  // auto-play stops when the live connection drops (no unattended play on stale data)
  React.useEffect(() => {
    if (auto.running && live.link !== 'live') stopAuto('Auto-play stopped because the live connection dropped. Any armed auto cash-out still runs on the server.');
  }, [auto.running, live.link, stopAuto]);
  React.useEffect(() => () => abortRef.current?.abort(), []);

  // ── keyboard: Space = place bet / cash out (manual) ───────────────────────────────────────
  const primaryRef = React.useRef<() => void>(() => undefined);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.code === 'Space' && mode === 'manual') {
        e.preventDefault();
        primaryRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  // ── derived display values ─────────────────────────────────────────────────────────────────
  const m = live.multiplier;
  const cashValue = myActive && phase === 'running' ? payoutAt(myBet.stake, m) : null;
  const cashedHere = mySettledHere && myBet.status === 'cashed_out' ? myBet : null;
  const lostHere = mySettledHere && myBet.status === 'lost' ? myBet : null;

  let pill: PhasePillKind = 'open';
  let readTone: 'neutral' | 'brand' | 'danger' | 'muted' = 'neutral';
  let readValue = fmtX(m);
  let line: React.ReactNode = null;
  let caption: React.ReactNode = null;
  if (!online && live.loaded) {
    pill = 'paused';
    readTone = 'muted';
    line = (
      <>
        <TrendingUp aria-hidden className="size-4 text-icon-muted" />
        Last known {fmtX(m)}
        {live.lastFrameAt ? ` at ${formatTimeUTC(live.lastFrameAt, { seconds: true })}` : ''}
        {myActive ? ` · cash-out value ${payoutAt(myBet.stake, m)}` : ''}
      </>
    );
    caption = myActive && myBet.autoCashOut ? `Auto cash-out at ${fmtX(myBet.autoCashOut)} is armed on the server · round ${round?.ref}` : `Live data paused · round ${round?.ref ?? ''}`;
  } else if (phase === 'betting') {
    pill = 'open';
    readValue = '1.00×';
    line = (
      <>
        <TrendingUp aria-hidden className="size-4 text-icon-muted" />
        Bets close at {round ? formatTimeUTC(round.startedAt, { seconds: true }) : '—'} · {(Math.max(0, msLeft) / 1000).toFixed(1)} s left
      </>
    );
    caption = myInRound
      ? `Your bet ${formatAmount(myBet.stake)} DEMO is in${myBet.autoCashOut ? ` · auto cash-out armed at ${fmtX(myBet.autoCashOut)}` : ''}`
      : `Round ${round?.ref} launches at 1.00× when betting closes`;
  } else if (phase === 'running') {
    if (cashedHere) {
      pill = 'cashed';
      readTone = 'brand';
      readValue = fmtX(cashedHere.cashOutMultiplier);
      line = (
        <span className="text-text-brand">
          ✓ You cashed out <CreditsAmount value={cashedHere.payout} /> · {money(cashedHere.net).gte(0) ? '+' : ''}
          {cashedHere.net} net
        </span>
      );
      caption = `${cashedHere.cashOutKind === 'auto' ? 'Auto cash-out' : 'Cashed out'} at ${fmtX(cashedHere.cashOutMultiplier)} · round still running at ${fmtX(m)} · you are no longer at risk`;
    } else {
      pill = 'live';
      line = myActive ? (
        <>
          <TrendingUp aria-hidden className="size-4 text-icon-brand" />
          Your bet {formatAmount(myBet.stake)} DEMO · cash-out value {cashValue}
        </>
      ) : (
        <>
          <TrendingUp aria-hidden className="size-4 text-icon-muted" />
          Round {round?.ref} is running
        </>
      );
      caption = myActive
        ? `${myBet.autoCashOut ? `Auto cash-out armed at ${fmtX(myBet.autoCashOut)} · ` : ''}round ${round?.ref} · ${(live.elapsedMs / 1000).toFixed(1)} s`
        : 'Bets for the next round open when this one crashes';
    }
  } else if (phase === 'crashed') {
    pill = 'crashed';
    readTone = 'danger';
    readValue = fmtX(round?.crashPoint ?? m);
    line = (
      <span className="text-text-primary">
        Round {round?.ref} ended at {fmtX(round?.crashPoint ?? m)}
        {round?.instant ? ' — instant crash (about 1 in 100 rounds)' : ''}
      </span>
    );
    caption = `Next betting window opens ${round?.nextRoundAt ? `at ${formatTimeUTC(round.nextRoundAt, { seconds: true })}` : 'shortly'} · this result is now verifiable`;
  }

  const curveMode: CurveMode =
    phase === 'running' ? 'running' : phase === 'crashed' ? 'crashed' : phase === 'betting' ? 'betting' : 'idle';
  const armedTarget = myActive ? myBet.autoCashOut : phase === 'betting' && !myInRound && autoOn ? targetOk : null;
  const curveCashOut =
    myInRound && myBet.status === 'cashed_out' && myBet.cashOutMultiplier
      ? { multiplier: myBet.cashOutMultiplier, payout: formatAmount(myBet.payout), net: myBet.net }
      : null;
  const overlay = !online && live.loaded ? (
    <ReconnectOverlay
      attempt={live.attempt}
      max={live.maxAttempts}
      offline={live.link === 'offline'}
      nextInMs={live.nextRetryAt ? live.nextRetryAt - Date.now() : null}
      onRetry={() => client.retryNow()}
    />
  ) : phase === 'betting' ? (
    <BettingOverlay msLeft={msLeft} totalMs={live.rules?.bettingMs ?? RULES.bettingMs} compact={!wide} />
  ) : phase === 'crashed' && (round?.crashPoint === '1.00' || !wide) ? (
    <NextRoundOverlay msLeft={nextIn} />
  ) : null;

  // ── panel ─────────────────────────────────────────────────────────────────────────────────
  const e = runner.phase === 'failed' ? runner.error : null;
  const refusal = e ? (
    e.kind === 'insufficient' ? null : e.kind === 'reality_check' ? (
      <PanelNotice title="Time for your reality check">Answer the reminder to keep playing — it only appears between rounds.</PanelNotice>
    ) : (
      <PanelNotice tone={e.kind === 'loss_limit' || e.kind === 'self_excluded' ? 'warning' : 'danger'} title="This bet wasn’t placed">
        {e.message}
        {e.requestId ? ` · ref ${e.requestId}` : ''}
      </PanelNotice>
    )
  ) : null;
  const insufficient =
    gate.gate === 'ok' && (sProblem?.kind === 'insufficient' || e?.kind === 'insufficient') ? (
      <InsufficientNotice
        balance={balance}
        stake={stakeOk}
        reset={gate.credits?.reset}
        onBetInstead={(v) => {
          setStake(v);
          runner.reset();
        }}
        onReset={() => runner.reset()}
      />
    ) : null;
  const creditsDown = gate.gate === 'ok' && gate.creditsError && !gate.credits;

  const disabledInputs = myActive || runner.busy || auto.running || gate.gate !== 'ok';
  const amountError =
    sProblem && sProblem.kind !== 'empty'
      ? sProblem.kind === 'insufficient' && stakeOk && balance
        ? `Exceeds your DEMO balance (${formatAmount(balance)})`
        : sProblem.kind === 'above_max'
          ? `Max bet is ${formatAmount(INFO.maxBet)} DEMO per round.`
          : stakeProblemMessage(sProblem)
      : null;

  // primary action
  let ctaLabel = '';
  let ctaAction: (() => void) | null = null;
  let ctaVariant: 'primary' | 'secondary' | 'danger' = 'primary';
  let ctaIcon: React.ReactNode = <Rocket aria-hidden />;
  if (gate.gate === 'guest') {
    ctaLabel = 'Sign in to play';
    ctaAction = () => auth.signIn();
    ctaIcon = <LogIn aria-hidden />;
  } else if (myActive && phase === 'running') {
    if (!online) {
      ctaLabel = 'Cash out unavailable offline';
    } else {
      ctaLabel = `Cash out · ${cashValue} DEMO`;
      ctaAction = () => void cash.run(myBet.id);
      ctaIcon = <Wallet aria-hidden />;
    }
  } else if (myActive && phase === 'betting') {
    ctaLabel = 'Bet placed · waiting for take-off';
    ctaIcon = <Target aria-hidden />;
  } else if (creditsDown) {
    ctaLabel = 'DEMO credits unavailable';
  } else if (gate.gate !== 'ok' && gate.gate !== 'loading') {
    ctaLabel = 'Betting is paused';
    ctaIcon = <Ban aria-hidden />;
  } else if (!online) {
    ctaLabel = live.loaded ? 'Reconnecting…' : 'Connecting…';
  } else if (queued) {
    ctaLabel = 'Cancel next-round bet';
    ctaVariant = 'secondary';
    ctaAction = () => setQueued(null);
    ctaIcon = <X aria-hidden />;
  } else if (sProblem?.kind === 'insufficient') {
    ctaLabel = 'Not enough DEMO credits';
  } else if (sProblem?.kind === 'above_max') {
    ctaLabel = 'Lower your bet to play';
  } else if (sProblem) {
    ctaLabel = 'Enter a bet';
  } else if (autoOn && !targetOk) {
    ctaLabel = 'Set an auto cash-out target';
  } else if (phase === 'betting' && !myInRound) {
    if (msLeft > CLOSE_MARGIN_MS) {
      ctaLabel = runner.phase === 'reconnecting' ? 'Reconnecting…' : `Place bet · ${formatAmount(stakeOk!)} DEMO`;
      ctaAction = canBetNow ? () => void place({ stake: stakeOk!, autoCashOut: targetOk }) : null;
    } else {
      ctaLabel = 'Bets closing…';
    }
  } else {
    // running / crashed without an active bet: queue for the next window
    ctaLabel = `Bet next round · ${formatAmount(stakeOk!)} DEMO`;
    ctaAction = () => setQueued({ stake: stakeOk!, autoCashOut: targetOk });
  }
  if (auto.running && !(myActive && phase === 'running')) {
    ctaLabel = 'Auto-play is running';
    ctaAction = null;
  }
  primaryRef.current = () => ctaAction?.();

  const cta = (className?: string) => (
    <Button
      size="l"
      block
      variant={ctaVariant}
      className={cn(myActive && phase === 'running' && online && 'bg-brand-primary', className)}
      disabled={!ctaAction}
      loading={runner.phase === 'placing' || runner.phase === 'reconnecting' || cash.busy}
      onClick={() => ctaAction?.()}
      leadingIcon={ctaIcon}
      data-testid="crash-cta"
    >
      {ctaLabel}
    </Button>
  );

  // summary box
  let summary: React.ReactNode;
  if (cashedHere) {
    summary = (
      <SummaryBox title={`Cashed out · round ${round?.ref}`} tone="brand">
        <SummaryRow label="Stake" value={<CreditsAmount value={cashedHere.stake} />} />
        <SummaryRow
          label="Cashed out at"
          value={`${fmtX(cashedHere.cashOutMultiplier)} (${cashedHere.cashOutKind === 'auto' ? 'auto' : cashedHere.cashOutKind === 'cap' ? 'max' : 'manual'})`}
        />
        <SummaryRow label="Paid to DEMO balance" value={<CreditsAmount value={cashedHere.payout} />} />
        <SummaryRow label="Net result" value={<CreditsAmount value={cashedHere.net} signed />} tone="success" testId="summary-net" />
      </SummaryBox>
    );
  } else if (lostHere) {
    summary = (
      <SummaryBox title={`Result · round ${round?.ref}`} tone="danger">
        <SummaryRow label="Stake" value={<CreditsAmount value={lostHere.stake} />} />
        <SummaryRow label="Crashed at" value={fmtX(round?.crashPoint)} />
        <SummaryRow label="Your target" value={lostHere.autoCashOut ? fmtX(lostHere.autoCashOut) : 'Manual'} />
        <SummaryRow label="Net result" value={<CreditsAmount value={lostHere.net} signed />} tone="danger" testId="summary-net" />
      </SummaryBox>
    );
  } else if (myActive && phase === 'running' && !wide) {
    summary = (
      <Tiles
        items={[
          ['Cash out now', <CreditsAmount key="c" value={cashValue!} unit={false} />],
          ['Profit now', <CreditsAmount key="p" value={profitAt(myBet.stake, m)} signed unit={false} />, 'text-text-success'],
          myBet.autoCashOut
            ? [`Reach ${fmtX(myBet.autoCashOut)}`, `${chanceToReachPercent(m, myBet.autoCashOut)}%`]
            : ['Multiplier', fmtX(m)],
        ]}
      />
    );
  } else if (myActive && phase === 'running') {
    summary = (
      <SummaryBox title={`Your position at ${fmtX(m)}`}>
        <SummaryRow label="Cash out now" value={<CreditsAmount value={cashValue!} />} />
        <SummaryRow label="Profit now" value={<CreditsAmount value={profitAt(myBet.stake, m)} signed />} tone="success" />
        {myBet.autoCashOut && (
          <>
            <SummaryRow label={`Auto cash-out at ${fmtX(myBet.autoCashOut)}`} value={<CreditsAmount value={payoutAt(myBet.stake, myBet.autoCashOut)} />} />
            <SummaryRow label={`Chance to reach ${fmtX(myBet.autoCashOut)}`} value={`${chanceToReachPercent(m, myBet.autoCashOut)}%`} />
          </>
        )}
      </SummaryBox>
    );
  } else if (myActive) {
    summary = (
      <SummaryBox title={`Your bet · round ${round?.ref}`}>
        <SummaryRow label="Stake" value={<CreditsAmount value={myBet.stake} />} />
        <SummaryRow label="Auto cash-out" value={myBet.autoCashOut ? fmtX(myBet.autoCashOut) : 'Off — cash out manually'} />
        {myBet.autoCashOut && (
          <>
            <SummaryRow label="Win chance" value={`${winChancePercent(myBet.autoCashOut)}%`} />
            <SummaryRow label="Payout" value={<CreditsAmount value={payoutAt(myBet.stake, myBet.autoCashOut)} />} />
          </>
        )}
      </SummaryBox>
    );
  } else if (!wide && !myActive && targetOk && stakeOk) {
    summary = (
      <Tiles
        items={[
          ['Win chance', `${winChancePercent(targetOk)}%`],
          [`Payout at ${fmtX(targetOk)}`, <CreditsAmount key="p" value={payoutAt(stakeOk, targetOk)} unit={false} />],
          ['Profit', <CreditsAmount key="f" value={profitAt(stakeOk, targetOk)} signed unit={false} />, 'text-text-success'],
        ]}
        note={`House edge ${HOUSE_EDGE}% · Fees 0.00 DEMO`}
      />
    );
  } else {
    summary = (
      <SummaryBox title={targetOk ? `If the round reaches ${fmtX(targetOk)}` : 'Manual cash-out'}>
        {targetOk && stakeOk ? (
          <>
            <SummaryRow label="Win chance" value={`${winChancePercent(targetOk)}%`} testId="win-chance" />
            <SummaryRow label="Payout" value={<CreditsAmount value={payoutAt(stakeOk, targetOk)} />} />
            <SummaryRow label="Profit" value={<CreditsAmount value={profitAt(stakeOk, targetOk)} signed />} tone="success" />
          </>
        ) : (
          <SummaryRow label="Win chance for target m" value="99% ÷ m" />
        )}
        <SummaryRow label="House edge" value={`${HOUSE_EDGE}%`} />
        <SummaryRow label="Fees" value={<CreditsAmount value="0.00" />} testId="crash-fees" />
      </SummaryBox>
    );
  }

  const riskText =
    myActive && phase === 'running'
      ? `Bets are final once the round starts. If it crashes before you cash out, you lose your ${formatAmount(myBet.stake)} DEMO stake.`
      : myActive
        ? `Your bet is in round ${round?.ref}. Bets can’t be cancelled once placed — the round starts at ${round ? formatTimeUTC(round.startedAt, { seconds: true }) : '—'}.`
        : queued
          ? 'Your next-round bet is queued and can be cancelled until that window opens.'
          : `Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per round. Your bet joins ${phase === 'betting' ? `round ${round?.ref ?? ''} — bets close at ${round ? formatTimeUTC(round.startedAt, { seconds: true }) : '—'}` : 'the next round'}.`;

  const targetField = (
    <Field
      label="Target multiplier"
      hideLabel={!wide}
      helper={
        myActive && myBet.autoCashOut
          ? 'Armed — runs server-side even if you disconnect'
          : `Between ${fmtX(MIN_TARGET)} and ${fmtX(MAX_MULTIPLIER)}`
      }
      error={tProblem && tProblem !== 'empty' ? targetProblemMessage(tProblem) : tProblem === 'empty' ? 'Enter a target, e.g. 2.00×.' : undefined}
      disabled={!autoOn || disabledInputs}
    >
      <InputGroup size="l">
        <Target aria-hidden className="size-5 shrink-0 text-icon-muted" />
        <InputControl
          value={myActive && myBet.autoCashOut ? myBet.autoCashOut : target}
          inputMode="decimal"
          onChange={(ev) => setTarget(sanitizeTargetInput(ev.target.value))}
          onBlur={() => {
            const t = parseTarget(target);
            if (t) setTarget(t);
          }}
          aria-label="Auto cash-out target multiplier"
          data-testid="target-input"
        />
        <span className="text-label-m whitespace-nowrap text-text-tertiary">× target</span>
      </InputGroup>
    </Field>
  );

  const autoSection = (
    <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4" data-testid="auto-section">
      {auto.running && autoCfg ? (
        <>
          <p className="text-body-s-strong text-text-primary">
            Auto-play · round {auto.progress.placed + (myActive ? 0 : 1)} of {autoCfg.bets}
          </p>
          <SummaryRow label="Bet per round (fixed)" value={<CreditsAmount value={autoCfg.stake} />} />
          <SummaryRow label="Auto cash-out" value={fmtX(autoCfg.target)} />
          <SummaryRow label="Stop-loss" value={<CreditsAmount value={autoCfg.stopLoss} />} />
          <SummaryRow label="Net this run" value={<CreditsAmount value={auto.progress.net} signed tone="net" />} />
          <Button variant="danger" size="l" block onClick={() => stopAuto()} leadingIcon={<Square aria-hidden />} data-testid="autoplay-stop">
            Stop auto-play
          </Button>
        </>
      ) : (
        <>
          <p className="text-body-s text-text-secondary">
            Auto-play bets the same amount every round with a server-side auto cash-out, a required stop-loss and up to
            100 rounds. It never raises the bet after a loss.
          </p>
          {(auto.stopped || autoNote) && (
            <p className="text-caption text-text-secondary" role="status">
              {autoNote ?? autoStopMessage(auto.stopped!)} · {auto.progress.placed} rounds · net{' '}
              <CreditsAmount value={auto.progress.net} signed tone="net" />
            </p>
          )}
          <Button
            variant="secondary"
            size="l"
            block
            disabled={gate.gate !== 'ok' || !online || myActive}
            onClick={() => {
              setAutoNote(null);
              setAutoOpen(true);
            }}
            leadingIcon={<Play aria-hidden />}
            data-testid="autoplay-open"
          >
            Set up auto-play
          </Button>
        </>
      )}
    </div>
  );

  const panel = (
    <BetPanel mode={mode} onModeChange={(md) => !auto.running && setMode(md)}>
      {gate.gate === 'guest' && (
        <PanelNotice title="Sign in to bet">
          Watching is free. Signed-in players get 1,000.00 DEMO credits to play — DEMO credits have no cash value.
        </PanelNotice>
      )}
      {gate.gate !== 'guest' && (
        <DemoCreditsChip data={gate.credits} loading={gate.gate === 'loading'} disabled={myActive || runner.busy || auto.running} compact className="hidden tablet:flex" />
      )}
      <BetAmountField
        value={myActive ? myBet.stake : stake}
        onChange={(v) => {
          setStake(v);
          if (runner.phase === 'failed') runner.reset();
          if (mySettledHere && phase !== 'running') client.clearSettled();
        }}
        limits={limits}
        error={myActive ? null : amountError}
        disabled={disabledInputs}
        helper={
          myActive
            ? 'Locked for this round — edit for the next one'
            : `Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per bet · DEMO credits · no cash value`
        }
      />
      {insufficient}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <label htmlFor="cr-auto-switch" className="text-body-s-strong text-text-primary">
              Auto cash-out
            </label>
            <span className="text-caption text-text-tertiary">Cash out automatically when the multiplier reaches your target</span>
          </div>
          <Switch
            id="cr-auto-switch"
            checked={myActive ? !!myBet.autoCashOut : autoOn}
            onCheckedChange={(v) => setAutoOn(v === true)}
            disabled={disabledInputs}
            aria-label="Auto cash-out"
          />
        </div>
        {(autoOn || (myActive && myBet.autoCashOut)) && targetField}
      </div>
      {mode === 'auto' && gate.gate !== 'guest' && autoSection}
      {(mode === 'manual' || gate.gate === 'guest' || myInRound) && summary}
      {creditsDown ? (
        <PanelNotice
          tone="danger"
          title="Couldn’t load your DEMO credits"
          actions={
            <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={gate.refetch} leadingIcon={<RotateCcw aria-hidden />}>
              Try again
            </Button>
          }
        >
          The game server didn’t answer, so betting is paused. Nothing has been charged.
        </PanelNotice>
      ) : (
        refusal
      )}
      {cash.error && (
        <PanelNotice tone="danger" title="Cash-out wasn’t accepted">
          {cash.error.message}
        </PanelNotice>
      )}
      {mode === 'manual' && <div className="hidden tablet:flex">{cta()}</div>}
      <StakeRiskNote limits={riskText} />
    </BetPanel>
  );

  // ── live bets label ────────────────────────────────────────────────────────────────────────
  const myLabel = !live.loaded
    ? live.loadError
      ? 'The live round couldn’t be loaded.'
      : 'Connecting to the live round…'
    : !auth.profile && gate.gate === 'guest'
    ? 'Sign in to bet — watching live rounds is free.'
    : myActive
      ? phase === 'running'
        ? `Your bet ${formatAmount(myBet.stake)} DEMO is live${myBet.autoCashOut ? ` · auto cash-out armed at ${fmtX(myBet.autoCashOut)}` : ''}`
        : `Your bet ${formatAmount(myBet.stake)} DEMO is in round ${round?.ref}`
      : cashedHere
        ? `You cashed out at ${fmtX(cashedHere.cashOutMultiplier)} · ${formatAmount(cashedHere.payout)} DEMO paid to your DEMO balance`
        : lostHere
          ? `Round ${round?.ref} crashed at ${fmtX(round?.crashPoint)} — your ${formatAmount(lostHere.stake)} DEMO stake was lost`
          : `You have no bet in round ${round?.ref ?? '—'}${phase === 'betting' ? ' yet' : ''}.`;

  // ── layout ─────────────────────────────────────────────────────────────────────────────────
  const blocked = blockKind !== null;
  const stageCard = (
    <div className="flex min-w-0 flex-col gap-4">
      {wide && <RecentResults history={live.history} loading={!live.loaded} />}
      {phase === 'error' ? (
        <CardShell className="p-4">
          <ErrorState
            error={new ApiNetworkError('/games/orbit-rush/state')}
            what="the live round"
            onRetry={() => client.retryNow()}
          />
        </CardShell>
      ) : phase === 'loading' ? (
        <>
          <Skeleton className="h-[188px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </>
      ) : (
        <>
          <ReadoutCard
            pill={pill}
            value={readValue}
            tone={readTone}
            line={line}
            caption={caption}
            compact={!wide}
            highlight={!!cashedHere}
          />
          {phase === 'crashed' && mySettledHere && (
            <ResultCard bet={myBet} crashPoint={round?.crashPoint ?? null} at={round?.crashedAt ?? null} />
          )}
          <CardShell as="div" className="gap-2 bg-bg-secondary p-3 tablet:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-overline text-text-tertiary uppercase">Orbit Rush · Round {round?.ref}</span>
              <DemoBadge size="s" />
            </div>
            <CrashCurve
              mode={curveMode}
              multiplier={m}
              elapsedMs={live.elapsedMs}
              target={armedTarget}
              cashOut={curveCashOut}
              paused={!online}
              compact={!wide}
              height={wide ? 280 : 170}
              overlay={overlay}
            />
          </CardShell>
          <RoundFooter round={round} compact={!wide} suffix={phase === 'running' ? (online ? 'running' : 'offline') : phase === 'crashed' ? fmtX(round?.crashPoint) : undefined} />
        </>
      )}
    </div>
  );

  const liveBets = (
    <LiveBetsPanel
      bets={live.bets}
      link={live.link}
      myBetId={myBet?.id ?? null}
      myLabel={myLabel}
      loading={!live.loaded}
      roundRef={round?.ref ?? null}
      compact={!wide}
      phase={round?.status ?? null}
      footer={
        online
          ? 'Bets lock when the round starts. Only real bets of this round are listed — all amounts are DEMO credits · no cash value.'
          : live.loaded
            ? 'Live bets are paused while you are offline. The list refreshes as soon as the connection is back.'
            : 'Only real bets of the live round are listed — all amounts are DEMO credits · no cash value.'
      }
    />
  );

  return (
    <>
      <div className={cn('flex flex-col gap-5 tablet:gap-6', 'pb-36 tablet:pb-0')} data-testid="crash-game"
        data-phase={phase}
        data-link={live.link}
        data-my={myActive ? 'active' : mySettledHere ? myBet.status : 'none'}
      >
        <ShellOverride collapseSidebar restricted={gate.gate === 'region'} />
        {live.loaded && !online && (
          <ConnectionBanner
            link={live.link}
            attempt={live.attempt}
            max={live.maxAttempts}
            myBet={myActive ? myBet : null}
            pausedAt={live.lastFrameAt}
            onRetry={() => client.retryNow()}
          />
        )}
        <GameHeader
          slug={SLUG}
          title="Orbit Rush"
          mechanic="Crash · cash out before it crashes"
          icon={Rocket}
          onFairness={() => router.push(CRASH_ROUTES.fairness)}
          chips={
            <>
              <KitChip icon={TrendingUp}>Max {fmtX(MAX_MULTIPLIER)}</KitChip>
              <KitChip icon={Wallet}>
                Bet {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)} DEMO
              </KitChip>
            </>
          }
          aside={
            <IconButton variant="secondary" label="Round history & statistics" asChild className="size-11 tablet:size-10">
              <Link href={CRASH_ROUTES.rounds}>
                <BarChart3 aria-hidden />
              </Link>
            </IconButton>
          }
        />
        {!wide && <RecentResults history={live.history} loading={!live.loaded} compact />}
        {gate.gate !== 'guest' && (
          <DemoCreditsChip data={gate.credits} loading={gate.gate === 'loading'} disabled={myActive || runner.busy} compact className="tablet:hidden" />
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] laptop:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(280px,340px)] laptop:gap-4">
          <CardShell
            as="div"
            className={cn('order-2 gap-5 p-4 tablet:p-5 lg:order-1', blocked && 'opacity-60')}
            inert={blocked || undefined}
            aria-label="Bet panel"
          >
            {panel}
          </CardShell>
          <div className="relative order-1 min-w-0 lg:order-2">
            <CardShell
              as="div"
              className={cn(
                'max-tablet:border-0 max-tablet:bg-transparent tablet:p-5',
                blocked && 'min-h-[460px]',
              )}
            >
              <div className={cn(blocked && 'opacity-25')} inert={blocked || undefined} aria-hidden={blocked || undefined}>
                {stageCard}
              </div>
            </CardShell>
            {blocked && (
              <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-3 tablet:items-center tablet:p-6">
                <GameNotice
                  kind={blockKind}
                  gameName="Orbit Rush"
                  regionName={gate.regionName}
                  exclusionEndsAt={gate.exclusionEndsAt}
                  lossLimit={gate.lossLimit}
                  onRetry={gate.refetch}
                />
              </div>
            )}
          </div>
          <div className="order-3 min-w-0 lg:col-span-2 laptop:col-span-1">{liveBets}</div>
        </div>

        {gate.gate !== 'guest' && (
          <GameSessionBar data={gate.credits} lossLimit={gate.lossLimit} loading={gate.gate === 'loading'} />
        )}

        <div className="grid gap-4 laptop:grid-cols-3">
          <HowRoundWorksCard />
          <OddsLimitsCard />
          <ProvablyFairCard commitment={round?.commitment ?? null} roundNumber={live.history[0]?.number ?? null} />
        </div>
        <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          DEMO credits · no cash value. Orbit Rush is a simulation: DEMO credits are never bought, withdrawn or
          exchanged for USDT. Space places your bet or cashes out (manual mode).
          {reduced ? ' Reduced motion is on: values update without animation.' : ''}
        </p>
        <LicenceLine className="rounded-lg border border-border-subtle px-4 py-3" />
      </div>

      {/* < 768: sticky bet bar above the tab bar */}
      <div
        className="fixed inset-x-0 z-30 flex flex-col gap-2 border-t border-border-subtle bg-bg-secondary px-4 pt-3 pb-3 tablet:hidden"
        style={{ bottom: 'var(--gp-tabbar-h, 56px)' }}
        data-testid="crash-mobile-bar"
      >
        {mode === 'manual' ? cta() : auto.running ? (
          <Button variant="danger" size="l" block onClick={() => stopAuto()} leadingIcon={<Square aria-hidden />}>
            Stop auto-play · {auto.progress.placed} of {autoCfg?.bets ?? 0}
          </Button>
        ) : (
          <Button size="l" block disabled={gate.gate !== 'ok' || !online || myActive} onClick={() => setAutoOpen(true)} leadingIcon={<Play aria-hidden />}>
            Set up auto-play
          </Button>
        )}
        <p className="text-center text-caption text-text-tertiary">
          {myActive && myBet.autoCashOut
            ? `Auto cash-out armed at ${fmtX(myBet.autoCashOut)} · bets are final`
            : `${autoOn && targetOk ? `Auto cash-out ${fmtX(targetOk)} · ` : ''}you can lose your stake · 18+`}
        </p>
      </div>

      <AutoPlayDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        initialStake={stakeOk ?? stake}
        initialTarget={targetOk ?? '2.00'}
        balance={balance}
        nextRoundRef={phase === 'betting' && !myInRound ? (round?.ref ?? null) : round ? `CR-${round.number + 1}` : null}
        lossLimit={gate.lossLimit}
        onStart={(cfg) => {
          setAutoCfg(cfg);
          autoCfgRef.current = cfg;
          setAutoNote(null);
          setStake(cfg.stake);
          setAutoOn(true);
          setTarget(cfg.target);
          void auto.start(cfg);
        }}
      />
    </>
  );
}

/** Mobile summary tiles (CR-01 / CR-02 390): three numbers, DEMO credits. */
function Tiles({ items, note }: { items: [string, React.ReactNode, string?][]; note?: string }) {
  return (
    <div className="flex flex-col gap-2" data-testid="crash-summary">
      <dl className="grid grid-cols-3 gap-2">
        {items.map(([label, value, tone]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1 rounded-lg border border-border-subtle bg-bg-secondary p-2.5">
            <dt className="truncate text-caption text-text-tertiary">{label}</dt>
            <dd className={cn('text-body-m-strong tabular-nums text-text-primary', tone)}>{value}</dd>
          </div>
        ))}
      </dl>
      {note && (
        <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
          {note} <DemoBadge size="xs" />
        </p>
      )}
    </div>
  );
}

function SummaryBox({ title, tone, children }: { title: string; tone?: 'brand' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-lg border p-4',
        tone === 'brand' ? 'border-border-brand bg-brand-tint-subtle' : tone === 'danger' ? 'border-border-danger/60 bg-status-danger-tint' : 'border-border-subtle bg-bg-secondary',
      )}
      data-testid="crash-summary"
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-caption', tone === 'brand' ? 'text-text-brand' : 'text-text-secondary')}>{title}</p>
        <DemoBadge size="xs" />
      </div>
      {children}
    </div>
  );
}

function InsufficientNotice({
  balance,
  stake,
  reset,
  onBetInstead,
  onReset,
}: {
  balance: string | null;
  stake: string | null;
  reset: DemoCreditsView['reset'] | undefined;
  onBetInstead: (v: string) => void;
  onReset: () => void;
}) {
  const resetCredits = useResetCredits();
  const minOk = balance !== null && money(balance).gte(money(INFO.minBet));
  const instead = balance !== null ? roundDown(balance, 2).toFixed(2) : null;
  const short = stake && balance ? money(stake).minus(money(balance)) : null;
  return (
    <PanelNotice
      tone="warning"
      title="Not enough DEMO credits for this bet"
      actions={
        <>
          {minOk && instead && (
            <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => onBetInstead(instead)}>
              Bet {formatAmount(instead)} DEMO instead
            </Button>
          )}
          <Button
            variant="ghost"
            size="s"
            className="min-h-11 tablet:min-h-8"
            disabled={!reset?.available || resetCredits.isPending}
            loading={resetCredits.isPending}
            leadingIcon={<RotateCcw aria-hidden />}
            onClick={() => void resetCredits.mutateAsync().then(onReset, () => undefined)}
          >
            {reset?.available ? `Reset to ${formatAmount(reset.to)} DEMO` : 'Reset available hourly'}
          </Button>
        </>
      }
    >
      {short && short.gt(0) ? `You need ${formatAmount(short.toFixed(2))} DEMO more for this bet. ` : ''}
      {insufficientCopy(balance)}
    </PanelNotice>
  );
}

export type { CrashLiveState };
