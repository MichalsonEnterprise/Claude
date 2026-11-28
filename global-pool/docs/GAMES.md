# GLOBAL POOL — Games engine (P1)

> **NON-MONETARY SIMULATION.** Games are played with **DEMO credits only — a per-user play balance with NO cash value.**
> DEMO credits are never bought, never withdrawn, never converted to or from USDT and never touch the USDT ledger,
> wallet balances, pool or fee ledgers. Every surface that shows them must label them **"DEMO credits · no cash value"**.
> `REAL_MONEY_ENABLED=false` (it cannot even boot as `true`) and the games engine has a second, server-side guard:
> any bet naming a currency other than `DEMO`, or on a game row that is not `mode = 'simulation'`, is refused with
> `403 REAL_MONEY_DISABLED` (unit + e2e tested). There is **no platform fee on game bets** (the 0.05 USDT fee is
> Global Pool only): every bet panel shows **"Fees 0.00"**.

Code: `packages/shared/src/fair/**` (`@gp/shared/fair`, pure maths shared by the API and the browser verifier) ·
`apps/api/src/modules/games/**` (REST, socket.io `/crash`, admin monitoring) · migration
`apps/api/prisma/migrations/20261128190000_games_engine`.

## 1. DEMO credits policy

| Rule                  | Value                                                                                                                                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Currency code / label | `DEMO` · "DEMO credits · no cash value" (`DEMO_CREDITS_LABEL`)                                                                                                                                                                                                                                                                   |
| Starting balance      | **1,000.00** — granted on first use (`opening` entry)                                                                                                                                                                                                                                                                            |
| Reset                 | `POST /games/credits/reset` → back to **1,000.00**, at most **once per hour** (`429 RATE_LIMITED` + `availableAt`), refused while a round is open (`409 ROUND_IN_PROGRESS`), writes a hash-chained `audit_logs` row `user.games.demo_credits_reset`                                                                              |
| Precision             | `Decimal(20, 6)`; stakes have ≤ 2 decimals; payouts = stake × multiplier **truncated** to 6 decimals (never rounded up); decimal.js only, never JS floats                                                                                                                                                                        |
| Storage               | `demo_credit_accounts` (balance, row-locked per bet) + `demo_credit_entries` (opening / stake / payout / reset with running balance; UPDATE rejected by trigger) — **no relation to `ledger_*`, `transactions`, wallet, pool or fee tables** (e2e asserts a player's ledger accounts / transactions are unchanged after playing) |
| Fee                   | `0.00` (`GAME_BET_FEE`)                                                                                                                                                                                                                                                                                                          |

## 2. Provable fairness (commit–reveal)

**Seed pair** (`game_sessions`, one ACTIVE pair per player and game):

- server seed = 32 random bytes (64 lowercase hex), stored **AES-256-GCM encrypted** while active; the player only
  sees `serverSeedHash = sha256(serverSeed)` **before** betting;
- client seed = the player's, editable (`[A-Za-z0-9._-]{1,64}`; no `:` so messages stay unambiguous);
- nonce = bet counter of the pair (0, 1, 2 …), one per bet / round.
- `POST /games/:slug/seeds/rotate` reveals the server seed (stored in plain from then on) and commits a new one;
  `POST /games/:slug/seeds/client {clientSeed}` does the same with a new client seed. Rotation is refused while a
  stateful round of that game is open (revealing would expose the rest of the round).

**Byte stream** (`ByteStream`, `stream.ts`):

```
block(r) = HMAC-SHA256(key = serverSeed (its ASCII text), message = `${clientSeed}:${nonce}:${r}`)   r = 0, 1, 2 …
stream   = block(0) ‖ block(1) ‖ …   read left to right
```

**Integer helpers** — outcomes use integer maths on these bytes only:

| Helper                 | Definition                                                                                | Precision                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `nextU32()`            | next 4 bytes, big-endian                                                                  | exact                                                                |
| `uniformInt(min, max)` | rejection sampling on u32: reject `u ≥ 2³² − (2³² mod range)`, return `min + u mod range` | **no modulo bias**                                                   |
| `scaleU32(u32, n)`     | `floor(u32 × n / 2³²)` (= published `floor(f × n)`, `f = u32 / 2³²`)                      | exact for n < 2²¹; per-outcome bias < n / 2³² (roulette: 8.6 × 10⁻⁹) |
| `nextU52()`            | top 52 bits of the next 7 bytes (BigInt)                                                  | exact (BigInt maths)                                                 |
| `shuffle()`            | forward Fisher–Yates: step i swaps i with `uniformInt(i, n − 1)` (prefix-stable, lazy)    | exact                                                                |

**No code path, flag or admin tool can choose, edit, re-roll or bias an outcome.** Outcomes are a pure function of
(server seed, client seed, nonce, published rules); house edges are fixed per game, published, and identical for every
player (no per-user odds, no "hot / cold" adjustment, no near-miss engineering). Test vectors (fixed seeds → outcomes,
with the HMAC blocks computed independently by node:crypto) are published in
`packages/shared/src/fair/vectors.json` and checked by `test/fair/vectors.test.ts`.

**Verify a bet:** `GET /games/bets/:id/verify` returns seeds, nonce, params / recorded actions and — once the pair is
rotated — the API's own re-derivation (`recomputed`, `commitmentValid`, `matches`). The browser verifier calls
`verifyBet()` from `@gp/shared/fair` with the same inputs (no duplicated maths).

## 3. Games: rules, formulas, edges, limits

All limits are per bet in DEMO credits. `rulesVersion` is stored on every bet.

| Game (slug)                                      | Rules / payout                                                                                                                                                                                                                                                                 | PF formula                                                                                                                                   | House edge                                                             | Limits                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| **Pool Dice** (`pool-dice`, decision #34)        | roll 0.00–99.99; over T wins on T…99.99 (chance 100 − T %), under T wins on 0.00…T − 0.01 (chance T %); multiplier = 99 ÷ chance **truncated to 4 dp**; chance 0.01–98.00 %                                                                                                    | `roll = uniformInt(0, 9999) / 100`                                                                                                           | 1.00 % (exact RTP 98.98–99.00 % after truncation)                      | 0.10–1,000.00                                         |
| **Double Side** (`double-side`)                  | heads / tails 50 %, correct call pays 1.96×                                                                                                                                                                                                                                    | `u32 = first 4 bytes`; Heads iff `u32 < 2³¹` (CF-05 "x < 0.5")                                                                               | 2.00 %                                                                 | 0.10–1,000.00                                         |
| **Pool Roulette** (`pool-roulette`, #35)         | European single zero; straight 35:1, split 17:1, street 11:1, corner 8:1, six line 5:1, dozen / column 2:1, red/black/odd/even/low/high 1:1; zero bets 0-1/0-2/0-3 (17:1), 0-1-2/0-2-3 (11:1), 0-1-2-3 (8:1); outside bets lose on 0                                           | `pocket = floor(f × 37)`, f = first 4 bytes / 2³² (`scaleU32`)                                                                               | 2.70 % on every bet                                                    | 0.10–1,000.00 per spot, 5,000.00 per spin, ≤ 60 spots |
| **Orbit Rush** (`orbit-rush`, #42)               | see §4; auto cash-out 1.01×–1,000.00×; cap 1,000.00× (open bets cash out there)                                                                                                                                                                                                | hash chain + `crashPointOf`                                                                                                                  | 1.00 % at every target                                                 | 0.10–1,000.00                                         |
| **Twenty-One** (`twenty-one`, BJ notes + PUB-04) | 6 decks (312 cards) shuffled per hand; dealer stands on all 17s (S17); blackjack 3:2; double any first two cards incl. after split; split a pair (same value) once; split Aces one card each; dealer peeks with A / 10 showing; insurance half the bet, pays 2:1; no surrender | forward Fisher–Yates of the unshuffled shoe (deck by deck, suits S H D C, ranks A…K); deal order player, dealer up, player, hole, then draws | ≈ 0.50 % with basic strategy (Monte-Carlo: 99.5 % ± tolerance)         | **1.00**–1,000.00 per hand (BJ frames)                |
| **Skyline** (`skyline`, limbo)                   | target 1.01×–1,000.00×; win when result ≥ target, pays bet × target; chance = 99 ÷ target %                                                                                                                                                                                    | `result = floor(99·2⁵² / (2⁵² − H)) / 100`, H = `nextU52()`, min 1.00                                                                        | 1.00 % (exact ≤ 99 %)                                                  | 0.10–1,000.00                                         |
| **Fortune Ring** (`fortune-ring`, wheel)         | risk low / medium / high × 10/20/30/40/50 segments, full layout published; Medium·30 = GM-06 (0×15, 1.50×6, 1.70×1, 2.00×5, 3.00×3, segment 19 = 3.00×)                                                                                                                        | `segment = uniformInt(0, n − 1)`                                                                                                             | 1.00 % exactly on every ring                                           | 0.10–1,000.00                                         |
| **Pool Keno** (`pool-keno`)                      | pick 1–10 of 1–40, 10 drawn; tables low / classic / medium / high per pick count; 6-pick Classic = GM-07 (0 · 0 · 1.10 · 2.50 · 9.00 · 45.00 · 300.00)                                                                                                                         | drawn = first 10 of `shuffle(1…40)`                                                                                                          | exact RTP 98.65–99.00 % per table (`kenoRtp`)                          | 0.10–1,000.00                                         |
| **Pinfall** (`pinfall`, plinko)                  | 8–16 rows × low / medium / high; bucket = number of right bounces; 16·Medium = GM-04 (100, 33, 10, 4, 3, 1.4, 1, 0.6, 0.3, …)                                                                                                                                                  | one `uniformInt(0, 1)` per row                                                                                                               | exact RTP 98.98–99.00 % per board; **16·Medium (designers') 99.016 %** | 0.10–1,000.00                                         |
| **Vault Sweeper** (`vault-sweeper`, mines 5×5)   | 1–24 mines; multiplier after k gems = 0.99 × C(25,k) / C(25−mines,k) truncated to 2 dp (3 mines: 1.12×, 1.47× after 3, 1.99× after 5); cash out after ≥ 1 gem                                                                                                                  | mines = first `mines` positions of `shuffle(0…24)` (tile = row × 5 + col)                                                                    | 1.00 % on every cash-out (exact ≤ 99 %)                                | 0.10–1,000.00; max payout 100,000.00                  |
| **High Card** (`high-card`, hi-lo)               | Ace low, King high, fresh 52-card deck each draw; higher-or-same chance (14 − r)/13, lower-or-same r/13; each right call × 0.99 ÷ chance; free skips; sure calls (A higher, K lower) not offered                                                                               | card k = `uniformInt(0, 51)` in order; rank = n mod 13 + 1, suit S H D C = n div 13                                                          | **1.00 % per call** (GM-08 copy; a 2-call run returns ≤ 98.01 %)       | 0.10–1,000.00; max payout 100,000.00                  |

Exact RTP proofs (`test/fair/rtp.test.ts`): every table / formula is evaluated over its whole outcome space with exact
decimal or BigInt maths; Monte-Carlo runs with **fixed seeds** (100k–200k bets per game, deterministic) check that the
stream + mappings produce the expected distribution (measured RTP within 4.5 standard errors of the exact value).

## 4. Orbit Rush (crash)

- **Hash chain**: a chain of 10,000 seeds from a secret terminal seed (`crash_chains`, encrypted): `seed[i−1] =
sha256(seed[i])`; `seed[0]` is the public chain commitment. Round i uses `seed[i]`; its commitment `sha256(seed[i])`
  is shown when betting opens; the seed is revealed when the round crashes (`GET …/rounds/:n/verify` checks
  seed → commitment → chain commitment).
- **Crash point**: `stream = ByteStream(serverSeed = seed[i], clientSeed = chain salt (public), nonce = 0)`;
  `uniformInt(0, 99) = 0` → **1.00× instant crash (exactly 1 in 100 rounds)**; otherwise `H = nextU52()`,
  `crash = floor(100·2⁵² / (2⁵² − H)) / 100`, capped at **1,000.00×**. ⇒ `P(crash ≥ m) = 0.99 / m` for every target
  m ≥ 1.01 (RTP 99.00 % whatever the cash-out). About 1.98 % of rounds _show_ 1.00× (the 1 % instant crashes plus
  rounds that bust before 1.01×).
- **Phases**: `betting` 10 s → `running` (server-authoritative curve `m(t) = floor(100·e^(0.1117·t))/100`, t in s,
  100 ms frames, decimal.js) → `crashed` (4 s pause) → next round. Bets only in the betting window (one per player
  per round); `409 ROUND_NOT_OPEN` otherwise.
- **Cash-outs**: manual = current server frame multiplier; **auto cash-out runs on the server** at exactly the target
  (also after a disconnect); at the 1,000.00× cap every open bet is cashed out at the cap.
- **Loop**: `CrashEngineService.tick(now)` is the only state transition. With `JOBS_ENABLED=true` it runs every 100 ms
  on one replica (Redis lease `gp:crash:leader`); tests pin `GameClock` and call `tick()` manually.
  `CRASH_LOOP_ENABLED=true` runs the loop without the BullMQ workers (unset = follows `JOBS_ENABLED`).
- **History & statistics (read-only, CR-05)**: `GET /games/orbit-rush/rounds` items carry `players`, `wagered`,
  `paidOut` (DEMO credits) with optional `from` / `search` (round "CR-55102"); `GET /games/orbit-rush/stats?period=`
  `24h|7d|30d` returns count, median (expected 1.98×), share reaching 2.00× (expected 49.50 %), highest crash and the
  distribution in 6 buckets next to the published expectation (34.00 · 16.50 · 29.70 · 9.90 · 8.91 · 0.99 %);
  `GET /games/orbit-rush/bets` adds `summary` (bets, wagered, returned, net, wins, losses, best cash-out).

## 5. API contract

`player` = Privy / DEV MOCK bearer. New bets / rounds use `GAMING_POLICY` (onboarded, permitted region, not
self-excluded, no `gaming_blocked` / `account_suspended`); continuing an open round (hit / stand / reveal / cash out)
needs an onboarded, non-suspended player, and stake-adding actions (double, split, insurance) re-check self-exclusion.
Every write takes an `idempotencyKey` (replay → same response + `"replayed": true`; same key, different body →
`409 IDEMPOTENCY_CONFLICT`). Bet writes are also throttled per IP (`GAMES_BET_THROTTLE_LIMIT`, default 600/min).
Amounts are DEMO credit decimal strings. Optional `currency` must be `"DEMO"` (anything else → 403).

| Method   | Path                                                          | Auth            | Description                                                                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET      | `/games` · `/games/{slug}`                                    | public          | Catalogue; playable games carry `play: { playable, kind, mode, currency: 'DEMO', creditsLabel, fee: '0.00', minBet, maxBet, tableMax, maxPayout, houseEdgePercent, rtpPercent, rulesVersion, rules[] }`                                                                                          |
| GET      | `/games/credits`                                              | player          | `{ currency, label, cashValue: false, balance, startingBalance, fee, reset: { to, cooldownMinutes, lastResetAt, availableAt, available }, session: { startedAt, durationSeconds, bets, wagered, returned, net, today: { bets, wagered, returned, net }, realityCheck, blockedReason }, notice }` |
| POST     | `/games/credits/reset`                                        | player          | Reset to 1,000.00 (once per hour; audited)                                                                                                                                                                                                                                                       |
| GET      | `/games/{slug}/seeds`                                         | player          | `{ active: { serverSeedHash, clientSeed, nonce, … }, revealed: [{ serverSeed, … }] }`                                                                                                                                                                                                            |
| POST     | `/games/{slug}/seeds/client`                                  | player          | `{ clientSeed }` → `{ revealed, active }`                                                                                                                                                                                                                                                        |
| POST     | `/games/{slug}/seeds/rotate`                                  | player          | → `{ revealed, active }`                                                                                                                                                                                                                                                                         |
| POST     | `/games/{slug}/bets`                                          | player · gaming | Instant games: `{ stake?, params, currency?, idempotencyKey }` → bet view + `balance`                                                                                                                                                                                                            |
| GET      | `/games/{slug}/bets`                                          | player          | My bets (paginated) + `summary { bets, wagered, returned, net, wins, losses, landed? }`; optional filters `from`, `to`, `result=win\|lose`, `pick=heads\|tails` (Double Side), `search` (ref or nonce) apply to page and summary |
| GET      | `/games/bets/{id}` · `/verify`                                | player          | One bet · verification bundle (`verify { serverSeedHash, serverSeed                                                                                                                                                                                                                              | null, clientSeed, nonce, stake, params }`, `revealed`, `recomputed`, `matches`) |
| GET      | `/games/twenty-one/hands/current`                             | player          | Open hand (reconnect) or `null`                                                                                                                                                                                                                                                                  |
| POST     | `/games/twenty-one/hands`                                     | player · gaming | `{ stake, idempotencyKey }` → hand (may settle at once: naturals / dealer blackjack)                                                                                                                                                                                                             |
| POST     | `/games/twenty-one/hands/{id}/action`                         | player          | `{ action: hit                                                                                                                                                                                                                                                                                   | stand                                                                           | double                   | split | insurance, accept?, idempotencyKey }` |
| GET/POST | `/games/vault-sweeper/rounds[/current]`                       | player          | Start `{ stake, mines }`; `/{id}/reveal { tile }`; `/{id}/cashout`                                                                                                                                                                                                                               |
| GET/POST | `/games/high-card/rounds[/current]`                           | player          | Start `{ stake }`; `/{id}/action { action: higher_or_same                                                                                                                                                                                                                                        | lower_or_same                                                                   | skip }`; `/{id}/cashout` |
| GET      | `/games/orbit-rush/state`                                     | public          | Live round (commitment, phase; crash point only after the crash), multiplier, live bets, last 20 crash points                                                                                                                                                                                    |
| GET      | `/games/orbit-rush/rounds` · `/{number}` · `/{number}/verify` | public          | Crashed rounds · one round · public verification                                                                                                                                                                                                                                                 |
| POST     | `/games/orbit-rush/bets`                                      | player · gaming | `{ stake, autoCashOut?, idempotencyKey }` (betting window only)                                                                                                                                                                                                                                  |
| POST     | `/games/orbit-rush/bets/{id}/cashout`                         | player          | Manual cash-out at the current server multiplier (response = final bet state)                                                                                                                                                                                                                    |
| GET      | `/games/orbit-rush/bets` · `/bets/current`                    | player          | My crash bets · my bet in the live round                                                                                                                                                                                                                                                         |

**Bet view** (instant and stateful): `{ id, ref ("D-10482"), game { slug, name }, status (active|settled), stake, payout,
net, multiplier, win, fee: '0.00', params, outcome, fairness { seedPairId, serverSeedHash, clientSeed, nonce, revealed },
rulesVersion, currency: 'DEMO', createdAt, settledAt, isDemo }`; stateful games add `round` (public state: the dealer's
hole card and the mine positions stay `null` until the round is settled) and `balance`.

**Instant `params` per game**: dice `{ target: '50.50', condition: 'over'|'under' }` · coinflip `{ pick: 'heads'|'tails' }` ·
roulette `{ bets: [{ type, numbers?, amount }] }` (stake = Σ amounts; `stake` may be omitted) · skyline
`{ target: '2.00' }` · fortune-ring `{ risk, segments }` · keno `{ picks: number[], risk }` · pinfall `{ rows, risk }`.

**Errors**: rule violations `400 BAD_REQUEST` with `details.reason` (`OUT_OF_RANGE`, `INVALID_PARAMS`, `INVALID_STAKE`,
`BET_BELOW_MIN`, `BET_ABOVE_MAX`); illegal round actions `409 CONFLICT` (`ACTION_NOT_ALLOWED`, `ROUND_OVER`,
`ROUND_IN_PROGRESS`, `ALREADY_BET`, `NOT_RUNNING`, `REALITY_CHECK_DUE`); `422 INSUFFICIENT_FUNDS` (`details { currency:
'DEMO', available, required, shortBy }`); `422 RG_LIMIT_EXCEEDED`; `403 SELF_EXCLUDED`; `451 GEO_RESTRICTED`;
`403 REAL_MONEY_DISABLED`; `409 ROUND_NOT_OPEN` (crash betting closed); `429 RATE_LIMITED` (reset cooldown).

### socket.io namespace `/crash`

| Direction       | Event                         | Payload                                                                                                                        |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| server → client | `crash:snapshot`              | on connect and after `crash:subscribe`: same as `GET /games/orbit-rush/state`                                                  |
| server → client | `crash:phase`                 | round entering `betting` / `running` (no crash point)                                                                          |
| server → client | `crash:tick`                  | `{ roundId, number, multiplier, elapsedMs }` every 100 ms frame                                                                |
| server → client | `crash:bet` · `crash:cashout` | `{ roundId, bet: { id, ref, player, stake, autoCashOut, status, cashOutMultiplier, payout, cashOutKind } }`                    |
| server → client | `crash:crashed`               | round with `crashPoint`, `seed`, `crashedAt`, `nextRoundAt`                                                                    |
| client → server | `crash:bet`                   | `{ stake, autoCashOut?, idempotencyKey }` (handshake `auth.token` = player token) → ack `{ ok, bet }` / `{ ok: false, error }` |
| client → server | `crash:cashout`               | `{ betId, idempotencyKey }` → ack                                                                                              |

## 6. Responsible gaming (server-side)

- Cooling-off and self-exclusion block every new bet / round (`403 SELF_EXCLUDED`), re-checked inside the bet
  transaction; balance, history and verification stay readable.
- Daily play-time limit, session-length limit and quiet hours block new bets (`422 RG_LIMIT_EXCEEDED`, `details.type`).
- **Reality checks only between bets**: when a reminder is due and "pause game" is on, the next bet is refused with
  `409 { reason: 'REALITY_CHECK_DUE', dueAt }` until the player answers it (`POST /responsible-gaming/reality-check/ack`);
  a round in progress is never interrupted.
- The player's **loss limit also applies to DEMO play, counted separately in DEMO credits** (stakes − returns in the
  period, never mixed with USDT usage): `422 RG_LIMIT_EXCEEDED { type: 'loss', currency: 'DEMO', … }`. The
  participation (spend) limit stays USDT-only (decision, see §9).
- Auto-play is a client feature: it needs an unticked confirmation + a stop-loss, never raises the bet after a loss, and
  every round it places is an ordinary bet that passes all of the checks above (a due reality check stops it).
- `GET /games/credits` → `session` feeds the RG/Session Bar (session time from the RG session, session net in DEMO
  credits).

## 7. Admin (read-only)

`games.read`: `GET /admin/games/overview` (per game 24 h / 30 d: bets, wagered, returned, **measured vs published RTP**,
open rounds, limits) · `GET /admin/games/bets?game=&userId=` · `GET /admin/games/orbit-rush/rounds` (the live round
never shows its crash point). Responses carry `controls: 'none'`. There is no endpoint to set, edit, re-roll or bias an
outcome, change odds per player, or adjust DEMO balances (e2e asserts such paths are `404`).

## 8. Data model (additive migration `20261128190000_games_engine`)

`demo_credit_accounts`, `demo_credit_entries`; `game_sessions.server_seed_enc` (+ partial unique index: one active pair
per player and game); `game_results` extended (user_id, game_id, ref_number, status active|settled, multiplier, currency
'DEMO', params, state, rules_version, idempotency_key, settled_at; partial unique index: one active round per player and
game); `crash_chains`, `crash_rounds` (one live round at a time), `crash_bets`.

## 9. Decisions and open points (for the owner)

1. **DEMO credits instead of USDT** in every game (owner instruction): the Figma game frames show USDT amounts from the
   wallet; the web mirrors the layouts but shows DEMO credits.
2. **Pool Dice multiplier truncated to 4 dp** (`99 ÷ 50.50 = 1.96039…` → **1.9603×**; Figma decision #34 shows
   1.9604×). Truncation guarantees the published 1.00 % edge is never undercut.
3. **Pool Dice win chance 0.01–98.00 %** (decision #34 / DI frames); the PUB-04 copy says 1–98 % — align the copy.
4. **Twenty-One minimum bet 1.00** (BJ frames); PUB-04 says 0.10 — align one of them. A "pair" for splitting = two
   cards of the same value (e.g. K + Q).
5. **Pinfall / Keno / Fortune Ring tables** other than the designed ones (16·Medium, 6-pick Classic, Medium·30) were
   generated for these games with exact RTP ≤ 99.00 % and are published in code; the designers' Pinfall 16·Medium board
   returns **99.016 %** (edge 0.98 %) and is kept as designed — change 100× → 94× to bring it under 99 % if wanted.
6. **High Card edge per call** (1 % on every call, GM-08 copy) — a run of k calls returns 0.99ᵏ.
7. **Mines / High Card max payout 100,000.00** per bet (GM-03 copy; applied to High Card for consistency).
8. **RG**: loss limit applies to DEMO play in DEMO credits; participation limit does not (USDT spend only); a due reality
   check blocks the next bet (protective).
9. Crash bets live in `crash_bets` (no per-player seed pair), so `/history/game-rounds` (rg-history module) lists the
   seed-pair games only; the Orbit Rush history is `GET /games/orbit-rush/bets`.
