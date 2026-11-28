'use client';

/**
 * Orbit Rush live client — socket.io namespace `/crash` (docs/GAMES.md §5) as a small external store.
 *
 * - Everything shown live comes from the SERVER: phases, 100 ms multiplier frames, crash points, and the bets other
 *   players really placed (DEMO credits). Nothing is simulated or fabricated client-side; countdowns derive from the
 *   server's `startedAt` / `nextRoundAt` corrected by the measured server clock offset (never a fake timer).
 * - Bets and cash-outs go over the socket (ack `{ ok, bet }` / `{ ok: false, error }`), with ONE idempotency key per
 *   player intent that is reused on every retry — over the socket or the REST fallback — so a bet settles once.
 * - Auto cash-out runs on the server, so an armed target still fires when this connection drops.
 */
import { creditString } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { io, type Socket } from 'socket.io-client';

import { ApiNetworkError, ApiRequestError } from '@/lib/api/client';
import {
  orbitRushApi,
  type CrashBetInput,
  type CrashLiveBet,
  type CrashMyBet,
  type CrashRoundView,
  type CrashRules,
  type CrashSnapshot,
} from '@/lib/api/orbit-rush';
import { publicEnv } from '@/lib/env';

export type LinkStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface CrashLiveState {
  link: LinkStatus;
  /** Reconnect attempt (1-based) while `link === 'reconnecting'`. */
  attempt: number;
  maxAttempts: number;
  /** Client epoch ms of the next automatic reconnect try (for "next try in 3 s"). */
  nextRetryAt: number | null;
  /** A snapshot (REST or socket) has arrived. */
  loaded: boolean;
  /** No snapshot could be loaded at all (API down / server error). */
  loadError: boolean;
  round: CrashRoundView | null;
  /** Last server frame (or the crash point once crashed). */
  multiplier: string;
  elapsedMs: number;
  /** Real bets of the live round (DEMO credits) — only what the server sent. */
  bets: CrashLiveBet[];
  /** Last crashed rounds, newest first. */
  history: { number: number; crashPoint: string }[];
  rules: CrashRules | null;
  /** Server clock − client clock (ms), measured from snapshots. */
  offsetMs: number;
  /** Server time of the last frame we received (ISO) — "Last known 1.64× at 18:42:09 UTC". */
  lastFrameAt: string | null;
  /** My bet in the live round, or my last settled one (kept for the result until the next bet). */
  myBet: CrashMyBet | null;
}

export const RECONNECT_ATTEMPTS = 5;
const ACK_TIMEOUT_MS = 6_000;

const INITIAL: CrashLiveState = {
  link: 'connecting',
  attempt: 0,
  maxAttempts: RECONNECT_ATTEMPTS,
  nextRetryAt: null,
  loaded: false,
  loadError: false,
  round: null,
  multiplier: '1.00',
  elapsedMs: 0,
  bets: [],
  history: [],
  rules: null,
  offsetMs: 0,
  lastFrameAt: null,
  myBet: null,
};

type Ack = { ok: true; bet: CrashMyBet } | { ok: false; error?: Record<string, unknown> };

/** ms from take-off to the crash (the server's last frame) — draws the full curve of a crashed round. */
function crashElapsed(round: CrashRoundView): number | null {
  return round.status === 'crashed' && round.crashedAt
    ? Math.max(0, Date.parse(round.crashedAt) - Date.parse(round.startedAt))
    : null;
}

function frameTime(round: CrashRoundView | null, elapsedMs: number): string | null {
  if (!round) return null;
  return new Date(Date.parse(round.startedAt) + elapsedMs).toISOString();
}

function upsert(bets: CrashLiveBet[], bet: CrashLiveBet): CrashLiveBet[] {
  const i = bets.findIndex((b) => b.id === bet.id);
  if (i === -1) return [...bets, bet];
  const next = bets.slice();
  next[i] = bet;
  return next;
}

/** Ack error envelope → the same ApiRequestError the REST client throws (so classifyGameError works). */
function ackError(event: string, ack: Ack): ApiRequestError {
  const e = (ack as { error?: Record<string, unknown> }).error ?? {};
  return new ApiRequestError(
    typeof e.statusCode === 'number' ? e.statusCode : 500,
    `socket:${event}`,
    typeof e.message === 'string' ? e.message : 'The game server refused this action.',
    typeof e.code === 'string' ? e.code : 'INTERNAL_ERROR',
    typeof e.requestId === 'string' ? e.requestId : undefined,
    Array.isArray(e.issues) ? (e.issues as ApiRequestError['issues']) : undefined,
    e.details && typeof e.details === 'object' ? (e.details as Record<string, unknown>) : undefined,
  );
}

/** Apply a live bet event to my bet (same id). */
function mergeMine(mine: CrashMyBet | null, bet: CrashLiveBet): CrashMyBet | null {
  if (!mine || mine.id !== bet.id) return mine;
  return {
    ...mine,
    status: bet.status,
    cashOutMultiplier: bet.cashOutMultiplier,
    payout: bet.payout,
    cashOutKind: bet.cashOutKind,
    net: bet.status === 'cashed_out' ? subtract(bet.payout, mine.stake) : mine.net,
  };
}

/** a − b in DEMO credits (decimal.js via @gp/shared/fair, the server's own credit format — never JS floats). */
function subtract(a: string, b: string): string {
  return creditString(money(a).minus(money(b)));
}

export class CrashLiveClient {
  private state: CrashLiveState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private socket: Socket | null = null;
  private waiters: { pred: (s: CrashLiveState) => boolean; resolve: (s: CrashLiveState) => void }[] = [];
  private disposed = false;
  /** The socket's current connection carries a player token (bets need one; watching does not). */
  private authed = false;

  constructor(private readonly getToken: () => Promise<string | null>) {}

  // ── store ───────────────────────────────────────────────────────────────────────────────────
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = (): CrashLiveState => this.state;
  getServerSnapshot = (): CrashLiveState => INITIAL;

  private set(patch: Partial<CrashLiveState> | ((s: CrashLiveState) => Partial<CrashLiveState>)): void {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    for (const fn of this.listeners) fn();
    if (this.waiters.length) {
      const ready = this.waiters.filter((w) => w.pred(this.state));
      this.waiters = this.waiters.filter((w) => !ready.includes(w));
      for (const w of ready) w.resolve(this.state);
    }
  }

  /** Resolve once the state satisfies `pred` (auto-play: next betting window, my bet settled …). */
  waitFor(pred: (s: CrashLiveState) => boolean, signal?: AbortSignal): Promise<CrashLiveState> {
    if (pred(this.state)) return Promise.resolve(this.state);
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      this.waiters.push(w);
      signal?.addEventListener('abort', () => {
        this.waiters = this.waiters.filter((x) => x !== w);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
  }

  /** Server "now" in client epoch ms terms. */
  serverNow(): number {
    return Date.now() + this.state.offsetMs;
  }

  // ── lifecycle ───────────────────────────────────────────────────────────────────────────────
  start(): void {
    this.disposed = false;
    void this.loadRest();
    this.openSocket();
  }

  stop(): void {
    this.disposed = true;
    this.socket?.removeAllListeners();
    this.socket?.io.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Signed in after the socket connected anonymously (auth still loading): reconnect with the player token. */
  async ensureAuth(): Promise<void> {
    if (!this.socket || this.authed) return;
    const token = await this.getToken().catch(() => null);
    if (token && !this.authed) this.socket.disconnect().connect();
  }

  /** Re-authenticate (signed in / out): reconnect with the new token. */
  reauth(): void {
    if (!this.socket) return;
    this.socket.disconnect().connect();
    void this.loadMine();
  }

  /** "Retry now": reconnect immediately (also after the automatic attempts ran out). */
  retryNow(): void {
    if (!this.socket) return this.openSocket();
    if (this.socket.connected) return;
    this.set((s) => ({ link: s.loaded ? 'reconnecting' : 'connecting', nextRetryAt: null }));
    this.socket.connect();
    void this.loadRest();
  }

  private async loadRest(): Promise<void> {
    try {
      const snap = await orbitRushApi.state();
      // the socket snapshot wins when it arrived first
      if (!this.disposed && !this.state.loaded) this.applySnapshot(snap);
    } catch {
      if (!this.disposed && !this.state.loaded) this.set({ loadError: true });
    }
    await this.loadMine();
  }

  /** My bet in the live round (reconnect / reload), players only. */
  async loadMine(): Promise<void> {
    const token = await this.getToken().catch(() => null);
    if (!token) {
      this.set({ myBet: null });
      return;
    }
    try {
      const { bet } = await orbitRushApi.current();
      if (this.disposed) return;
      if (bet) this.set({ myBet: bet });
    } catch {
      // keep what we have — the live list still shows the bet
    }
  }

  private openSocket(): void {
    const socket: Socket = io(`${publicEnv.apiUrl}/crash`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      randomizationFactor: 0,
      auth: (cb) => {
        void this.getToken()
          .catch(() => null)
          .then((token) => {
            this.authed = !!token;
            cb(token ? { token } : {});
          });
      },
    });
    this.socket = socket;
    socket.on('connect', () => {
      this.set({ link: 'live', attempt: 0, nextRetryAt: null, loadError: false });
    });
    socket.on('disconnect', (reason) => {
      if (this.disposed) return;
      // the server closed it (e.g. restart): socket.io won't retry on its own after an explicit server disconnect
      if (reason === 'io server disconnect') socket.connect();
      this.set((s) => ({ link: s.loaded ? 'reconnecting' : 'connecting', attempt: Math.max(1, s.attempt) }));
    });
    socket.on('connect_error', () => {
      if (this.disposed) return;
      this.set((s) => ({ link: s.loaded ? 'reconnecting' : 'connecting' }));
    });
    socket.io.on('reconnect_attempt', (n) => {
      this.set({ attempt: n, nextRetryAt: null });
    });
    socket.io.on('reconnect_error', () => {
      const n = this.state.attempt;
      const delay = Math.min(5_000, 1_000 * 2 ** Math.max(0, n - 1));
      this.set({ nextRetryAt: Date.now() + delay });
    });
    socket.io.on('reconnect_failed', () => {
      this.set({ link: 'offline', nextRetryAt: null });
    });
    socket.on('crash:snapshot', (snap: CrashSnapshot) => this.applySnapshot(snap));
    socket.on('crash:phase', (round: CrashRoundView) => this.applyPhase(round));
    socket.on(
      'crash:tick',
      (e: { roundId: string; number: number; multiplier: string; elapsedMs: number }) => {
        if (this.state.round?.id !== e.roundId) {
          socket.emit('crash:subscribe');
          return;
        }
        this.set((s) => ({
          multiplier: e.multiplier,
          elapsedMs: e.elapsedMs,
          lastFrameAt: frameTime(s.round, e.elapsedMs),
          round: s.round && s.round.status !== 'running' ? { ...s.round, status: 'running' } : s.round,
        }));
      },
    );
    const onBet = (e: { roundId: string; bet: CrashLiveBet }) => {
      if (this.state.round?.id !== e.roundId) return;
      this.set((s) => ({ bets: upsert(s.bets, e.bet), myBet: mergeMine(s.myBet, e.bet) }));
    };
    socket.on('crash:bet', onBet);
    socket.on('crash:cashout', onBet);
    socket.on('crash:crashed', (round: CrashRoundView) => this.applyCrash(round));
  }

  private applySnapshot(snap: CrashSnapshot): void {
    const offsetMs = Date.parse(snap.serverTime) - Date.now();
    this.set((s) => {
      const mine = s.myBet;
      let myBet = mine;
      if (mine) for (const b of snap.bets) myBet = mergeMine(myBet, b);
      if (myBet && snap.round && myBet.round.id === snap.round.id && snap.round.status === 'crashed')
        myBet = settleLost(myBet, snap.round);
      return {
        loaded: true,
        loadError: false,
        round: snap.round,
        multiplier: snap.multiplier,
        elapsedMs: (snap.round && crashElapsed(snap.round)) ?? snap.elapsedMs,
        bets: snap.bets,
        history: snap.history,
        rules: snap.rules,
        offsetMs,
        lastFrameAt: snap.round?.status === 'running' ? frameTime(snap.round, snap.elapsedMs) : s.lastFrameAt,
        myBet,
      };
    });
  }

  private applyPhase(round: CrashRoundView): void {
    this.set((s) => {
      const fresh = s.round?.id !== round.id;
      return {
        round,
        multiplier: fresh || round.status === 'betting' ? '1.00' : s.multiplier,
        elapsedMs: fresh ? 0 : s.elapsedMs,
        bets: fresh ? [] : s.bets,
        myBet: s.myBet && s.myBet.round.id === round.id ? { ...s.myBet, round: { ...s.myBet.round, status: round.status } } : s.myBet,
      };
    });
  }

  private applyCrash(round: CrashRoundView): void {
    this.set((s) => {
      const history =
        round.crashPoint && !s.history.some((h) => h.number === round.number)
          ? [{ number: round.number, crashPoint: round.crashPoint }, ...s.history].slice(0, 20)
          : s.history;
      const same = s.round?.id === round.id;
      return {
        round,
        multiplier: round.crashPoint ?? s.multiplier,
        elapsedMs: crashElapsed(round) ?? s.elapsedMs,
        // every bet still open when the round crashes is lost (cap cash-outs arrive as `crash:cashout` first)
        bets: same
          ? s.bets.map((b) => (b.status === 'active' ? { ...b, status: 'lost' as const, payout: '0.00' } : b))
          : s.bets,
        history,
        myBet: s.myBet && s.myBet.round.id === round.id ? settleLost(s.myBet, round) : s.myBet,
      };
    });
  }

  // ── actions ─────────────────────────────────────────────────────────────────────────────────
  private async emit(event: 'crash:bet' | 'crash:cashout', payload: Record<string, unknown>): Promise<CrashMyBet> {
    const socket = this.socket;
    if (!socket?.connected) throw new ApiNetworkError(`socket:${event}`);
    let ack: Ack;
    try {
      ack = (await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload)) as Ack;
    } catch (cause) {
      // no answer: the outcome is unknown → the caller retries with the SAME idempotency key
      throw new ApiNetworkError(`socket:${event}`, { cause });
    }
    if (!ack.ok) throw ackError(event, ack);
    return ack.bet;
  }

  /** Place my bet in the open betting window (socket; REST fallback while the socket is down). */
  async placeBet(input: CrashBetInput): Promise<CrashMyBet> {
    const body = { stake: input.stake, autoCashOut: input.autoCashOut, currency: 'DEMO', idempotencyKey: input.idempotencyKey };
    const bet = this.socket?.connected ? await this.emit('crash:bet', body) : await orbitRushApi.placeBet(input);
    this.set((s) => ({
      myBet: bet,
      bets: s.round?.id === bet.round.id ? upsert(s.bets, toLive(bet, s.bets)) : s.bets,
    }));
    return bet;
  }

  /** Manual cash-out at the current SERVER multiplier — only over a live connection. */
  async cashOut(betId: string, idempotencyKey: string): Promise<CrashMyBet> {
    const bet = await this.emit('crash:cashout', { betId, idempotencyKey });
    this.set((s) => ({ myBet: s.myBet && s.myBet.id === bet.id ? { ...s.myBet, ...bet } : bet }));
    return bet;
  }

  /** Forget a settled result (e.g. the player started editing the next bet). */
  clearSettled(): void {
    if (this.state.myBet && this.state.myBet.status !== 'active') this.set({ myBet: null });
  }
}

function settleLost(bet: CrashMyBet, round: CrashRoundView): CrashMyBet {
  const r = { ...bet, round: { ...bet.round, status: round.status } };
  if (bet.status !== 'active') return r;
  // the engine settles every open bet of a crashed round as lost with payout 0 (the cap cashes out first)
  return { ...r, status: 'lost', payout: '0.00', net: subtract('0', bet.stake) };
}

function toLive(bet: CrashMyBet, existing: CrashLiveBet[]): CrashLiveBet {
  const prev = existing.find((b) => b.id === bet.id);
  return {
    id: bet.id,
    ref: bet.ref,
    player: prev?.player ?? 'You',
    stake: bet.stake,
    autoCashOut: bet.autoCashOut,
    status: bet.status,
    cashOutMultiplier: bet.cashOutMultiplier,
    payout: bet.payout,
    cashOutKind: bet.cashOutKind,
    currency: 'DEMO',
  };
}

export { subtract as subtractCredits };
