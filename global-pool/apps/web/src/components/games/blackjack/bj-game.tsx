'use client';

import { formatAmount, money } from '@gp/shared/money';
import { useQueryClient } from '@tanstack/react-query';
import {
  Columns2,
  Hand,
  Layers,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Undo2,
  Coins,
} from 'lucide-react';
import * as React from 'react';

import {
  BetAmountField,
  CreditsAmount,
  DemoCreditsChip,
  GAME_MOTION,
  GameNotice,
  GameSessionBar,
  LicenceLine,
  MobileBetBar,
  PanelNotice,
  SeedDisplay,
  StakeRiskNote,
  VerifyDrawer,
  insufficientCopy,
  noticeKindOf,
  parseStake,
  stakeProblem,
  stakeProblemMessage,
  useBetRunner,
  useGameGate,
  useReducedMotion,
} from '@/components/games/kit';
import { holdRealityCheck } from '@/components/rg-history/reality-check';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { authKeys } from '@/lib/api/auth';
import {
  applySettledBet,
  gameKeys,
  gamesApi,
  useResetCredits,
  useSeeds,
  type DemoCreditsView,
} from '@/lib/api/games';
import { rgKeys } from '@/lib/api/rg-history';
import {
  twentyOneApi,
  twentyOneKeys,
  useBjCurrent,
  type BjBetView,
  type BjDecision,
  type BjRoundView,
} from '@/lib/api/twenty-one';
import { useAuth } from '@/lib/auth';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { BjHeader } from './bj-chrome';
import {
  CHIP_VALUES,
  INFO,
  SLUG,
  addChip,
  betTone,
  describeHand,
  feltStatus,
  payoutTable,
  resultCopy,
  revealPlan,
  roundFromOutcome,
  totalOf,
  visibleRound,
  type ChipValue,
  type RevealKey,
} from './bj-math';
import {
  ConnectionCard,
  InsuranceBody,
  InsuranceCard,
  RecentHands,
  RestoredBanner,
  ResultCard,
  TableRulesCard,
  useRetryIn,
} from './bj-parts';
import { BjTable, type FeltTone, type TableHand } from './bj-table';
import { ChipTray } from './chip';

/** One card lands every card-deal (350 ms) + fast (150 ms) beat; reduced motion = everything at once. */
const STEP_MS = GAME_MOTION.cardDeal + GAME_MOTION.fast;
const PAUSED_KINDS = ['loss_limit', 'time_limit', 'self_excluded', 'region', 'blocked'];

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable ||
    !!el.closest('[role="dialog"]')
  );
}

const ACTION_BTN = 'min-h-12 justify-center text-label-l';
/** "10" for whole amounts, "12.50" otherwise (mobile action labels). */
const compact = (v: string) => formatAmount(v, { decimals: money(v).isInteger() ? 0 : 2 });

/** One line of "If you win this hand" (never wraps the amount). */
function PayRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[13px] leading-5">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold whitespace-nowrap text-text-primary tabular-nums">{value}</span>
    </div>
  );
}

type Intent = { kind: 'deal' | 'action'; prev: BjRoundView | null; send: (key: string) => Promise<BjBetView> };

/**
 * Twenty-One (BJ-01 … BJ-05, BJ-09) — DEMO credits only, no cash value, Fees 0.00. The hand lives on the server: the
 * deal and every decision are one request with one idempotency key (retried with the same key after a dropped
 * connection), the hole card stays hidden until the server settles the hand, and the result shown is the server's.
 * Cards land in the order they came off the shoe (card-deal motion); the balance, session bar and history only move
 * once the last card is on the table (no early reveal). Reality checks wait until the hand is over.
 */
export function TwentyOneGame() {
  const auth = useAuth();
  const qc = useQueryClient();
  const gate = useGameGate();
  const seeds = useSeeds(SLUG);
  const reset = useResetCredits();
  const reduced = useReducedMotion();
  const wide = useMediaQuery(MQ.tablet, true);
  const current = useBjCurrent();

  const [stake, setStake] = React.useState('10.00');
  const [undo, setUndo] = React.useState<string[]>([]);
  const [chip, setChip] = React.useState<ChipValue>('10');
  const [hand, setHand] = React.useState<BjBetView | null>(null);
  const [pending, setPending] = React.useState<RevealKey[]>([]);
  const [animateCards, setAnimateCards] = React.useState(false);
  const [restored, setRestored] = React.useState<BjBetView | null>(null);
  const [lockedCredits, setLockedCredits] = React.useState<DemoCreditsView | null>(null);
  const [verifyId, setVerifyId] = React.useState<string | null>(null);
  const [lastStake, setLastStake] = React.useState<string | null>(null);
  const [lostRequest, setLostRequest] = React.useState(false);
  const settledPending = React.useRef<BjBetView | null>(null);
  const intent = React.useRef<Intent | null>(null);

  const finalize = React.useCallback(() => {
    const bet = settledPending.current;
    settledPending.current = null;
    if (bet) {
      applySettledBet(qc, SLUG, bet);
      void qc.invalidateQueries({ queryKey: twentyOneKeys.current });
    }
    setLockedCredits(null);
  }, [qc]);

  /** Show a server response: queue its new cards (reveal plan) and settle the balance once they are all down. */
  const applyHand = React.useCallback(
    (bet: BjBetView, prev: BjRoundView | null) => {
      const round = bet.round ?? roundFromOutcome(bet.outcome);
      const view = round && !bet.round ? { ...bet, round } : bet;
      setHand(view);
      setRestored(null);
      setLostRequest(false);
      // keep the open-hand cache in step with what the table shows (recovery compares against it)
      qc.setQueryData(twentyOneKeys.current, bet.status === 'active' ? view : null);
      const plan = reduced || !round ? [] : revealPlan(prev, round);
      setAnimateCards(!reduced);
      setPending(plan);
      if (bet.status === 'settled') {
        settledPending.current = bet;
        if (!plan.length) finalize();
      } else {
        applySettledBet(qc, SLUG, bet);
        setLockedCredits(null);
      }
    },
    [reduced, qc, finalize],
  );

  // reveal one card per beat; when the queue is empty, apply a settled hand
  React.useEffect(() => {
    if (!pending.length) {
      if (settledPending.current) finalize();
      return;
    }
    const t = window.setTimeout(() => setPending((p) => p.slice(1)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [pending, finalize]);

  // left the page mid-reveal: the hand is settled on the server — sync now
  React.useEffect(
    () => () => {
      const bet = settledPending.current;
      if (bet) applySettledBet(qc, SLUG, bet);
    },
    [qc],
  );

  // ── one runner for every intent (deal or a decision): one idempotency key each, retried with the same key ─────
  const runner = useBetRunner<BjBetView>((key) => intent.current!.send(key), {
    onSettled: (bet) => applyHand(bet, intent.current?.prev ?? null),
    onError: (e) => {
      setLockedCredits(null);
      if (PAUSED_KINDS.includes(e.kind)) {
        void qc.invalidateQueries({ queryKey: rgKeys.all });
        void qc.invalidateQueries({ queryKey: authKeys.accountStatus });
      }
      if (e.kind === 'network') setLostRequest(true);
      if (e.kind === 'conflict' || e.kind === 'round_in_progress' || e.kind === 'network') void current.refetch();
      void qc.invalidateQueries({ queryKey: gameKeys.credits });
    },
  });

  // ── recovery: an open hand on the server is restored as it was (BJ-09) ──────────────────────────────
  const c = current.data;
  React.useEffect(() => {
    if (current.isPending || current.isFetching || runner.busy || pending.length) return;
    if (c && c.status === 'active') {
      if (!hand || hand.id !== c.id || hand.status !== 'active' || JSON.stringify(hand.round) !== JSON.stringify(c.round)) {
        const fresh = !hand || hand.id !== c.id;
        setHand(c);
        setPending([]);
        setAnimateCards(false);
        if (fresh) setRestored(c);
        setLastStake(c.round?.baseStake ?? null);
        setLostRequest(false);
      }
      return;
    }
    // the hand we show as open was finished elsewhere (another tab / device): load its settled view
    if (c === null && hand && hand.status === 'active') {
      void gamesApi.bet(hand.id).then(
        (b) => {
          if (b.status === 'settled') applyHand(b, hand.round ?? null);
        },
        () => undefined,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, current.isPending, current.isFetching, runner.busy, pending.length]);

  // back online with an open hand: resync from the server
  React.useEffect(() => {
    if (gate.online && hand?.status === 'active' && !runner.busy) void current.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.online]);

  // reality checks only between hands: hold from deal to the last card of the settlement
  const handOpen = hand?.status === 'active';
  const inPlay = handOpen || pending.length > 0 || runner.busy;
  React.useEffect(() => {
    if (!inPlay) return;
    return holdRealityCheck();
  }, [inPlay]);

  // ── derived state ───────────────────────────────────────────────────────────────────────────────
  const round = hand?.round ?? null;
  const pendingSet = React.useMemo(() => new Set(pending), [pending]);
  const visible = round ? visibleRound(round, pendingSet) : null;
  const revealing = pending.length > 0;
  const settledShown = hand?.status === 'settled' && !revealing;
  const dealing = runner.busy && intent.current?.kind === 'deal';
  const reconnecting = runner.phase === 'reconnecting';
  const offlineWithHand = handOpen && !gate.online;

  const shownCredits = lockedCredits ?? gate.credits;
  const balance = shownCredits?.balance ?? null;
  const limits = { min: INFO.minBet, max: INFO.maxBet, balance };
  const sProblem = stakeProblem(stake, limits);
  const stakeOk = parseStake(stake);
  const creditsDown = gate.gate === 'ok' && gate.creditsError && !gate.credits;
  const busy = runner.busy || revealing;
  const betting = !handOpen && !dealing;
  const canDeal =
    gate.gate === 'ok' && !creditsDown && sProblem === null && !busy && !handOpen && !current.isPending;
  const selfExcluded = gate.gate === 'self_excluded';
  const allowed = new Set(handOpen && !revealing && !reconnecting && gate.online ? (round?.allowedActions ?? []) : []);
  const activeHand = round?.hands[round.active];
  const extraCost = activeHand?.stake ?? (dealing ? lastStake : null) ?? stakeOk ?? '0.00';
  const affordExtra = balance !== null && money(balance).gte(money(extraCost));
  const stakeAddingBlocked = selfExcluded
    ? 'You’re on a break: finish this hand with Hit or Stand — Double, Split and Insurance are paused.'
    : null;
  const canAct = (a: 'hit' | 'stand' | 'double' | 'split') =>
    allowed.has(a) && !((a === 'double' || a === 'split') && (!affordExtra || !!stakeAddingBlocked));

  const previewStake = round?.baseStake ?? stakeOk ?? INFO.minBet;
  const pay = payoutTable(previewStake);

  // ── intents ─────────────────────────────────────────────────────────────────────────────────────
  const snapshot = (minus: string) => {
    const cr = shownCredits;
    if (!cr) return null;
    return { ...cr, balance: money(cr.balance).minus(money(minus)).toFixed() };
  };

  const deal = React.useCallback(
    (amount?: string) => {
      const s = amount ?? stakeOk;
      if (!s || gate.gate !== 'ok' || busy || handOpen || creditsDown) return;
      if (stakeProblem(s, limits) !== null) return;
      setLastStake(s);
      setLockedCredits(snapshot(s));
      setHand(null);
      setPending([]);
      setRestored(null);
      intent.current = { kind: 'deal', prev: null, send: (key) => twentyOneApi.deal(s, key) };
      void runner.run();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stakeOk, gate.gate, busy, handOpen, creditsDown, balance, runner],
  );

  const act = React.useCallback(
    (d: BjDecision) => {
      if (!hand || hand.status !== 'active' || !round || busy) return;
      if (d.action === 'insurance' ? round.phase !== 'insurance' : !canAct(d.action)) return;
      const cost =
        d.action === 'double' || d.action === 'split'
          ? extraCost
          : d.action === 'insurance' && d.accept
            ? (round.insurance?.stake ?? '0.00')
            : '0.00';
      setLockedCredits(snapshot(cost));
      const id = hand.id;
      intent.current = { kind: 'action', prev: round, send: (key) => twentyOneApi.act(id, d, key) };
      void runner.run();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hand, round, busy, extraCost, affordExtra, stakeAddingBlocked, runner],
  );

  const changeStake = (v: string) => {
    setUndo((u) => [...u.slice(-19), stake]);
    setStake(v);
    if (runner.phase === 'failed') runner.reset();
    if (settledShown) setHand(null);
  };
  const addToSpot = () => {
    if (!betting || busy) return;
    const next = addChip(stake, chip);
    changeStake(money(next).gt(money(INFO.maxBet)) ? money(INFO.maxBet).toFixed(2) : next);
  };
  const undoStake = () =>
    setUndo((u) => {
      if (!u.length) return u;
      setStake(u[u.length - 1]!);
      return u.slice(0, -1);
    });
  const rebetAmount = lastStake ?? hand?.round?.baseStake ?? null;

  // keyboard: Space deal · H hit · S stand · D double · P split (not while typing or in a dialog)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space') {
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        e.preventDefault();
        if (!handOpen) deal();
      } else if (k === 'h') act({ action: 'hit' });
      else if (k === 's') act({ action: 'stand' });
      else if (k === 'd') act({ action: 'double' });
      else if (k === 'p') act({ action: 'split' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deal, act, handOpen]);

  // ── what the felt says ───────────────────────────────────────────────────────────────────────────
  const dealerShown = visible?.dealer ?? null;
  const dealerTotal = dealerShown ? totalOf(dealerShown).total : 0;
  let status: { tone: FeltTone; text: string } | null = null;
  if (reconnecting || offlineWithHand) status = { tone: 'offline', text: 'Offline — reconnecting… your last action was saved.' };
  else if (dealing || (revealing && hand && pending.includes('h:0:0')))
    status = { tone: 'info', text: 'Dealing… cards come off a freshly shuffled 6-deck shoe.' };
  else if (hand && round && hand.status === 'settled' && revealing) {
    status = pending[0]?.startsWith('h:')
      ? { tone: 'info', text: 'Dealing your card…' }
      : pending.includes('flip')
        ? { tone: 'info', text: 'Dealer’s turn — the hole card is turned over.' }
        : { tone: 'info', text: `Dealer draws on ${dealerTotal} — the dealer stands on all 17s.` };
  } else if (hand && round && handOpen) {
    const text = feltStatus(round, dealerTotal, false);
    status = { tone: round.hands.length > 1 ? 'split' : 'info', text: restored ? `Reconnected — ${text}` : text };
  } else if (settledShown && hand) {
    const t = betTone(hand);
    status = { tone: t, text: resultCopy(hand).status };
  } else if (gate.gate === 'ok' && !creditsDown) {
    status =
      sProblem?.kind === 'insufficient'
        ? { tone: 'lose', text: 'Not enough DEMO credits for this bet — nothing has been charged.' }
        : stakeOk && sProblem === null
          ? { tone: 'info', text: `Bet ${formatAmount(stakeOk)} DEMO placed — press Deal when you are ready. No time limit.` }
          : { tone: 'info', text: 'Tap the bet spot or enter an amount to place your bet.' };
  }

  const tableHands: TableHand[] =
    round && visible
      ? round.hands.map((h, i) => ({
          cards: visible.hands[i] ?? [],
          stake: h.stake,
          active: round.phase === 'player' && i === round.active && !revealing,
          waiting: round.phase === 'player' && round.hands.length > 1 && i > round.active,
          result: settledShown ? h.result : null,
          doubled: h.doubled,
        }))
      : [];

  // ── overlays ─────────────────────────────────────────────────────────────────────────────────────
  const gateKind = noticeKindOf(gate.gate);
  const blockingKind = handOpen ? (gate.gate === 'guest' || gate.gate === 'onboarding' ? gateKind : null) : gateKind;
  const retryIn = useRetryIn(reconnecting, runner.attempt);
  const connection =
    reconnecting || offlineWithHand || lostRequest ? (
      <ConnectionCard
        handRef={hand?.status === 'active' ? hand.ref : null}
        what={
          activeHand && round
            ? `${totalOf(activeHand.cards).total} against a dealer ${round.dealer.total}, bet ${formatAmount(round.totalStake)} DEMO`
            : null
        }
        attempt={reconnecting ? runner.attempt : null}
        max={runner.maxAttempts}
        nextInSeconds={reconnecting ? retryIn : null}
        onRetry={() => {
          if (reconnecting) runner.retryNow();
          else {
            setLostRequest(false);
            void current.refetch();
          }
        }}
      />
    ) : null;
  const insuranceOpen = !!(handOpen && round?.phase === 'insurance' && !revealing && !reconnecting);
  const answerInsurance = (accept: boolean) => act({ action: 'insurance', accept });
  const insuranceProps = {
    stake: round?.insurance?.stake ?? '0.00',
    canAfford: balance !== null && money(balance).gte(money(round?.insurance?.stake ?? '0')),
    blockedReason: selfExcluded ? 'You’re on a break: insurance (a new stake) is paused — choose No insurance.' : null,
    busy: runner.busy,
    onAnswer: answerInsurance,
  };

  const overlay = blockingKind ? (
    <GameNotice
      kind={blockingKind}
      gameName="Twenty-One"
      regionName={gate.regionName}
      exclusionEndsAt={gate.exclusionEndsAt}
      lossLimit={gate.lossLimit}
      onRetry={gate.refetch}
    />
  ) : connection && wide ? (
    connection
  ) : insuranceOpen && wide ? (
    <InsuranceCard {...insuranceProps} />
  ) : settledShown && hand && wide ? (
    <ResultCard bet={hand} onVerify={() => setVerifyId(hand.id)} />
  ) : null;

  // ── panel ────────────────────────────────────────────────────────────────────────────────────────
  const e = runner.phase === 'failed' ? runner.error : null;
  const balanceNow = balance;
  const resetActions = () => {
    const r = gate.credits?.reset;
    const canBetBalance = balanceNow !== null && money(balanceNow).gte(money(INFO.minBet));
    const instead = balanceNow !== null ? money(balanceNow).toDecimalPlaces(2, 1).toFixed(2) : null;
    return (
      <>
        {canBetBalance && instead && (
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => changeStake(instead)}>
            Bet {formatAmount(instead)} DEMO instead
          </Button>
        )}
        <Button
          variant="ghost"
          size="s"
          className="min-h-11 tablet:min-h-8"
          disabled={!r?.available || reset.isPending || handOpen}
          loading={reset.isPending}
          onClick={() => void reset.mutateAsync().then(() => runner.reset())}
          leadingIcon={<RotateCcw aria-hidden />}
        >
          {r?.available ? `Reset to ${formatAmount(r.to)} DEMO` : 'Reset available hourly'}
        </Button>
      </>
    );
  };

  const refusal =
    e &&
    (e.kind === 'insufficient' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits" actions={!handOpen ? resetActions() : undefined}>
        {handOpen
          ? `That decision needs another ${formatAmount(extraCost)} DEMO. Nothing was charged — Hit or Stand instead.`
          : insufficientCopy(typeof e.details.available === 'string' ? e.details.available : balanceNow)}
      </PanelNotice>
    ) : e.kind === 'reality_check' ? (
      <PanelNotice title="Time for your reality check">Answer the reminder to keep playing — it only appears between hands.</PanelNotice>
    ) : e.kind === 'network' ? (
      <PanelNotice
        tone="warning"
        title="We couldn’t confirm that request"
        actions={
          <Button
            variant="secondary"
            size="s"
            className="min-h-11 tablet:min-h-8"
            onClick={() => {
              setLostRequest(false);
              void current.refetch();
            }}
            leadingIcon={<RefreshCw aria-hidden />}
          >
            Reload hand
          </Button>
        }
      >
        The server may have received it. Reload the hand to see exactly where it stands — a decision is never applied
        twice.
      </PanelNotice>
    ) : (
      <PanelNotice tone={PAUSED_KINDS.includes(e.kind) ? 'warning' : 'danger'} title={handOpen ? 'That move wasn’t made' : 'This hand wasn’t dealt'}>
        {e.message}
        {e.requestId ? ` · ref ${e.requestId}` : ''}
      </PanelNotice>
    ));

  const stakeNotice =
    betting && !busy && gate.gate === 'ok' && sProblem?.kind === 'insufficient' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits for this hand" actions={resetActions()}>
        {insufficientCopy(balanceNow)} Nothing has been charged.
      </PanelNotice>
    ) : betting && !busy && sProblem?.kind === 'above_max' ? (
      <PanelNotice
        tone="danger"
        title={`Max bet is ${formatAmount(INFO.maxBet)} DEMO per hand`}
        actions={
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => changeStake(money(INFO.maxBet).toFixed(2))}>
            Set to {formatAmount(INFO.maxBet)} DEMO
          </Button>
        }
      >
        Twenty-One accepts {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)} DEMO per hand. Your bet is never changed
        for you.
      </PanelNotice>
    ) : null;

  const pausedNote =
    handOpen && PAUSED_KINDS.includes(gate.gate) ? (
      <PanelNotice tone="warning" title="New hands are paused">
        {selfExcluded
          ? 'You’re on a break. Finish this hand with Hit or Stand — Double, Split and Insurance add a stake, so they are paused.'
          : 'A limit or restriction now applies to new hands. You can still finish this one — it was dealt before.'}
      </PanelNotice>
    ) : null;

  const amountError =
    betting && sProblem && sProblem.kind !== 'empty'
      ? sProblem.kind === 'insufficient' && stakeOk && balanceNow
        ? `Not enough DEMO credits — ${formatAmount(stakeOk)} needed, ${formatAmount(balanceNow)} available.`
        : stakeProblemMessage(sProblem)
      : null;

  const pausedLabel: string | null =
    {
      onboarding: 'Finish sign-up to play',
      region: 'Not available in your region',
      self_excluded: 'On a break — dealing paused',
      blocked: 'Play is paused on your account',
      time_limit: 'Play-time limit reached',
      loss_limit: 'Loss limit reached',
      offline: 'Offline — dealing paused',
    }[gate.gate as string] ?? null;

  const dealLabel = pausedLabel
    ? pausedLabel
    : creditsDown
      ? 'DEMO credits unavailable'
      : sProblem?.kind === 'above_max'
        ? 'Lower your bet to deal'
        : sProblem?.kind === 'insufficient'
          ? 'Not enough DEMO credits'
          : sProblem?.kind === 'below_min' || sProblem?.kind === 'empty'
            ? 'Place a bet to deal'
            : dealing
              ? reconnecting
                ? 'Reconnecting…'
                : 'Dealing…'
              : `Deal · ${formatAmount(stakeOk ?? '0')} DEMO`;

  const signIn = (className?: string) => (
    <Button size="l" block className={className} onClick={() => auth.signIn()} leadingIcon={<LogIn aria-hidden />}>
      Sign in to play
    </Button>
  );

  const dealButton = (className?: string) =>
    gate.gate === 'guest' ? (
      signIn(className)
    ) : (
      <Button
        size="l"
        block
        className={className}
        disabled={!canDeal}
        loading={dealing}
        onClick={() => deal()}
        leadingIcon={<Coins aria-hidden />}
        data-testid="bj-deal"
      >
        {dealLabel}
      </Button>
    );

  const rebetDealButton = (className?: string) => {
    const amount = rebetAmount ?? stakeOk;
    const ok = !!amount && stakeProblem(amount, limits) === null && gate.gate === 'ok' && !busy && !creditsDown;
    return (
      <Button
        size="l"
        block
        className={className}
        disabled={!ok}
        onClick={() => {
          if (!amount) return;
          setStake(amount);
          deal(amount);
        }}
        leadingIcon={<RotateCcw aria-hidden />}
        data-testid="bj-rebet-deal"
      >
        {pausedLabel ?? `Rebet & deal · ${formatAmount(amount ?? '0')} DEMO`}
      </Button>
    );
  };

  const actionGrid = (mobile = false) => {
    const splitAgain = (round?.hands.length ?? 1) > 1;
    return (
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Your decision">
        <Button variant="secondary" size="l" className={ACTION_BTN} disabled={!canAct('hit')} onClick={() => act({ action: 'hit' })} leadingIcon={<Plus aria-hidden />} aria-keyshortcuts="H" data-testid="bj-hit">
          Hit
        </Button>
        <Button variant="secondary" size="l" className={ACTION_BTN} disabled={!canAct('stand')} onClick={() => act({ action: 'stand' })} leadingIcon={<Hand aria-hidden />} aria-keyshortcuts="S" data-testid="bj-stand">
          Stand
        </Button>
        <Button
          variant="secondary"
          size="l"
          className={ACTION_BTN}
          disabled={!canAct('double')}
          onClick={() => act({ action: 'double' })}
          leadingIcon={<Layers aria-hidden />}
          aria-keyshortcuts="D"
          data-testid="bj-double"
        >
          Double {mobile ? `+${compact(extraCost)}` : `· +${formatAmount(extraCost)}`}
        </Button>
        <Button
          variant="secondary"
          size="l"
          className={ACTION_BTN}
          disabled={!canAct('split')}
          onClick={() => act({ action: 'split' })}
          leadingIcon={<Columns2 aria-hidden />}
          aria-keyshortcuts="P"
          data-testid="bj-split"
        >
          {splitAgain ? 'Split again' : mobile ? `Split +${compact(extraCost)}` : `Split · +${formatAmount(extraCost)}`}
        </Button>
      </div>
    );
  };

  const actionNote = (() => {
    if (!handOpen || !round) return null;
    if (round.phase === 'insurance')
      return 'Answer the insurance question on the table first — Hit, Stand and Double unlock right after the dealer’s blackjack check.';
    if (reconnecting || offlineWithHand) return 'Controls pause while offline, so an action can never be sent twice.';
    if (round.hands.length > 1) {
      const atRisk = money(round.totalStake);
      return `Re-splitting isn’t offered; doubling after a split is. At risk this round: ${formatAmount(atRisk)} DEMO${
        allowed.has('double') ? ` (${formatAmount(atRisk.plus(money(extraCost)))} if you double hand ${round.active + 1})` : ''
      }.`;
    }
    if (!affordExtra && (allowed.has('double') || allowed.has('split')))
      return `Double and Split need another ${formatAmount(extraCost)} DEMO — your balance is lower. Hit or Stand instead.`;
    return `Double and Split each add another ${formatAmount(extraCost)} DEMO stake — you can lose both stakes. Insurance is only offered when the dealer shows an Ace.`;
  })();

  const inputsLocked = !betting || busy || gate.gate !== 'ok';

  const payoutBox = (
    <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-4" data-testid="bj-payouts">
      <div className="flex items-center justify-between">
        <p className="text-overline text-text-tertiary uppercase">If you win this hand</p>
        <DemoBadge size="xs" />
      </div>
      <PayRow label="Win pays 1:1" value={<>returns <CreditsAmount value={pay.win} /></>} />
      <PayRow label="Blackjack pays 3:2" value={<>returns <CreditsAmount value={pay.blackjack} /></>} />
      <PayRow label="Insurance pays 2:1" value={<>on a {formatAmount(pay.insuranceStake)} side bet</>} />
      <PayRow label="House edge" value={`≈${INFO.houseEdgePercent}% (basic strategy)`} />
      <PayRow label="Fees" value="0.00 DEMO" />
    </div>
  );

  const ctaBlock = (
    <div className="hidden flex-col gap-2 tablet:flex">
      {gate.gate === 'guest' ? (
        signIn()
      ) : handOpen || dealing ? (
        actionGrid()
      ) : settledShown ? (
        <>
          {rebetDealButton()}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="l" className="min-h-12" onClick={() => setHand(null)} leadingIcon={<Pencil aria-hidden />}>
              Change bet
            </Button>
            <Button variant="secondary" size="l" className="min-h-12" onClick={() => hand && setVerifyId(hand.id)} leadingIcon={<ShieldCheck aria-hidden />}>
              Verify hand
            </Button>
          </div>
        </>
      ) : (
        dealButton()
      )}
      <p className="text-caption text-text-tertiary">
        {handOpen || dealing
          ? actionNote
          : settledShown
            ? 'A new hand never starts on its own — every deal needs your tap.'
            : `Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per hand · insurance costs half your bet.`}
      </p>
    </div>
  );

  const panel = (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h4 text-text-primary">Your bet</h2>
        <span className="flex items-center gap-1.5 font-mono text-mono-s text-text-tertiary">
          {hand ? `Hand ${hand.ref}` : seeds.data ? `Nonce ${seeds.data.active.nonce}` : ''}
          {(hand || seeds.data) && <DemoBadge size="xs" />}
        </span>
      </div>
      {gate.gate !== 'guest' && (
        <DemoCreditsChip data={shownCredits} loading={gate.gate === 'loading'} disabled={inPlay} compact />
      )}
      <div className={cn('flex flex-col gap-4', inputsLocked && gate.gate === 'ok' && 'opacity-60')}>
        <BetAmountField
          value={stake}
          onChange={(v) => changeStake(v)}
          limits={{ ...limits }}
          error={amountError}
          disabled={inputsLocked}
          helper={`Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per hand`}
        />
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-secondary">Chip value · tap the bet spot to add</p>
          <ChipTray values={CHIP_VALUES} value={chip} onChange={setChip} disabled={inputsLocked} />
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="s" className="min-h-11 tablet:min-h-9" disabled={inputsLocked || !undo.length} onClick={undoStake} leadingIcon={<Undo2 aria-hidden />}>
              Undo
            </Button>
            <Button variant="ghost" size="s" className="min-h-11 tablet:min-h-9" disabled={inputsLocked || !stake} onClick={() => changeStake('')} leadingIcon={<Trash2 aria-hidden />}>
              Clear
            </Button>
            <Button
              variant="ghost"
              size="s"
              className="min-h-11 tablet:min-h-9"
              disabled={inputsLocked || !rebetAmount}
              onClick={() => rebetAmount && changeStake(rebetAmount)}
              leadingIcon={<RotateCcw aria-hidden />}
            >
              Rebet
            </Button>
          </div>
        </div>
      </div>
      {ctaBlock}
      {creditsDown ? (
        <PanelNotice
          tone="danger"
          title="Couldn’t load your DEMO credits"
          actions={
            <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={gate.refetch} leadingIcon={<RefreshCw aria-hidden />}>
              Try again
            </Button>
          }
        >
          The game server didn’t answer, so dealing is paused. Nothing has been charged.
        </PanelNotice>
      ) : (
        (pausedNote ?? stakeNotice ?? refusal)
      )}
      {payoutBox}
      <StakeRiskNote limits="Every hand is dealt from a freshly shuffled 6-deck shoe you can verify afterwards." />
      <p className="hidden text-caption text-text-tertiary tablet:block">
        Keyboard: Space deal · H hit · S stand · D double · P split
      </p>
    </div>
  );

  const loadingTable = gate.gate === 'loading' || (auth.status === 'member' && current.isPending);

  const table = loadingTable ? (
    <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 rounded-t-[28px] rounded-b-[120px] border-[6px] border-ink-750 bg-surface-default tablet:min-h-[640px] tablet:rounded-b-[220px]" aria-busy="true">
      <span className="sr-only" role="status">
        Loading table…
      </span>
      <Skeleton className="h-6 w-24" />
      <div className="flex gap-3">
        <Skeleton className="h-[104px] w-[74px] rounded-lg tablet:h-32 tablet:w-[92px]" />
        <Skeleton className="h-[104px] w-[74px] rounded-lg tablet:h-32 tablet:w-[92px]" />
      </div>
      <Skeleton className="h-6 w-64" />
      <div className="flex gap-3">
        <Skeleton className="h-[104px] w-[74px] rounded-lg tablet:h-32 tablet:w-[92px]" />
        <Skeleton className="h-[104px] w-[74px] rounded-lg tablet:h-32 tablet:w-[92px]" />
      </div>
      <p className="text-body-s text-text-tertiary">Loading table — checking for an open hand…</p>
    </div>
  ) : (
    <BjTable
      dealer={visible?.dealer ?? null}
      hands={tableHands}
      pendingStake={betting && !settledShown && !dealing ? (stakeOk && money(stakeOk).gt(0) ? stakeOk : '') : ''}
      chip={chip}
      onBetSpot={gate.gate === 'ok' ? addToSpot : undefined}
      betSpotDisabled={inputsLocked}
      animate={animateCards && !reduced}
      status={status}
      overlay={overlay}
      dimmed={!!blockingKind}
      dealerSettled={!!visible?.flipped}
    />
  );

  // ── mobile sticky bar (< 768) ─────────────────────────────────────────────────────────────────────
  const mobileBar = (
    <MobileBetBar
      summary={
        pausedLabel && !handOpen ? (
          'New hands are paused'
        ) : handOpen && round ? (
          round.phase === 'insurance' ? 'Insurance offered — answer above' : `Your move · ${totalOf(activeHand?.cards ?? []).total} vs ${round.dealer.total}`
        ) : settledShown && hand ? (
          <>
            Hand {hand.ref} · net <CreditsAmount value={hand.net} signed tone="net" />
          </>
        ) : stakeOk ? (
          <>
            Bet <CreditsAmount value={stakeOk} /> · Fees 0.00
          </>
        ) : (
          'Place a bet'
        )
      }
    >
      {gate.gate === 'guest'
        ? signIn()
        : handOpen || dealing
          ? actionGrid(true)
          : settledShown
            ? rebetDealButton()
            : dealButton()}
    </MobileBetBar>
  );

  return (
    <div className="flex flex-col gap-5 pb-48 tablet:gap-6 tablet:pb-0">
      <ShellOverride collapseSidebar restricted={gate.gate === 'region'} />
      <BjHeader tab="play" />

      {restored && handOpen && (
        <RestoredBanner handRef={restored.ref} at={restored.createdAt} onDismiss={() => setRestored(null)} />
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
        <div
          className={cn(
            'order-2 hidden rounded-xl border border-border-subtle bg-surface-default p-5 tablet:block lg:order-1',
            blockingKind && 'opacity-60',
          )}
          inert={blockingKind ? true : undefined}
        >
          {panel}
        </div>
        <div className="order-1 flex min-w-0 flex-col lg:order-2 [&>*]:flex-1">{table}</div>
      </div>

      {/* mobile: result card under the table, session strip, bet amount */}
      {!wide && !blockingKind && connection}
      {settledShown && hand && !wide && <ResultCard bet={hand} onVerify={() => setVerifyId(hand.id)} />}
      {gate.gate !== 'guest' && <GameSessionBar data={gate.credits} lossLimit={gate.lossLimit} loading={gate.gate === 'loading'} />}
      <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:hidden" inert={blockingKind ? true : undefined}>
        {panel}
      </div>

      <div className="grid gap-5 laptop:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)] tablet:gap-6">
        <RecentHands onVerify={(b) => setVerifyId(b.id)} />
        <TableRulesCard />
        <SeedDisplay slug={SLUG} disabled={inPlay} />
      </div>

      <LicenceLine className="rounded-lg border border-border-subtle px-4 py-3" />
      {mobileBar}

      <ResponsiveModal
        open={insuranceOpen && !wide}
        onOpenChange={() => undefined}
        title="Insurance?"
        showClose={false}
      >
        <InsuranceBody {...insuranceProps} compact />
      </ResponsiveModal>

      <VerifyDrawer
        betId={verifyId}
        open={verifyId !== null}
        onOpenChange={(o) => !o && setVerifyId(null)}
        describeOutcome={(o) => describeHand(o)}
        noun="hand"
        formula="The 312-card shoe is a Fisher–Yates shuffle driven by HMAC-SHA256(server seed, “client seed:nonce:cursor”); cards are dealt from the top — you, dealer up, you, dealer hole, then every hit and the dealer’s draws — and your recorded decisions are replayed under the published rules."
      />
    </div>
  );
}
