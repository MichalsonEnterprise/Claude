# GLOBAL POOL — state audit (ERR-01 empty · ERR-02 errors · ERR-03 loading · ERR-07 security warnings)

> DEMO / testnet only. Scope: every P0 route of `apps/web` (player + admin) except games (`/games/**`, owned by the
> games agents), the design system and dev previews. Figma: the ERR boards (page 12, ledger ERR-01/02/03/07) are
> still **NOT STARTED** in the ledger, so the copy follows the ledger descriptions, the existing library components
> (Table/Empty State, Alert/Banner, Skeleton) and the module screens already built from Figma.

## How the audit works — `apps/web/scripts/qa-states.mjs`

Playwright visits every route (`src/app/**/page.tsx`, dynamic segments resolved with real ids, plus the URL-state
steps `/wallet/deposit?step=address` and `/wallet/withdraw?step=address`) at **1440 and 390** and forces each state
with request interception on the API origin:

| State | How it is forced | Passes when |
| --- | --- | --- |
| `ok` | no interception (guest / @nova.k / super admin) | no crash, no raw text, no skeleton left, no overflow |
| `empty` | a fresh, onboarded DEV MOCK player (no deposits, entries, limits, KYC, 2FA) | empty states instead of headers-only tables |
| `down` | every API request fails (`connectionrefused`) — API down / offline | readable error + Try again (or the shell banner), no endless skeleton |
| `500` | data requests → 500 `INTERNAL_ERROR` envelope | same |
| `502` | data requests → 502 HTML page without the envelope (a proxy) | "502 Bad Gateway" / HTML never shown |
| `429` | data requests → 429 `RATE_LIMITED` + `Retry-After: 20` | "Too many requests", Try again counts down |
| `503` | data requests → 503 `SERVICE_UNAVAILABLE` ("temporarily paused") | maintenance copy, balance-safe note |
| `slow` | every response delayed 4 s (slow 3G latency) | a skeleton / loading state early (never blank), page completes |
| `timeout` | data requests never answer (representative routes) | an error with Try again after the client timeout (20 s) |
| `validation` | form scenarios: onboarding submitted empty, deposit limit answered with a 400 `VALIDATION_FAILED`, malformed withdrawal address | field-level message, no raw text |

"Data requests" = everything except the auth bootstrap (dev token, `/auth/session`, `GET /me`, admin auth), so the
identity stays signed in while the page's data fails. Per visit it flags **crash** (page error), **blank**, **raw**
(raw transport / status / code / `undefined` / `NaN` / HTML text), **skeleton** (still visible after 15 s),
**no-retry** (an error without Try again / Retry), **silent** (the page's own requests failed but nothing says so —
e.g. "No transactions yet" for a failed request), **overflow** and **empty-table**. The shell's own requests
(balance pill, pool tile, unread count, admin nav badges) count as shell data — they degrade to "—" plus the
connection banner — so a page without data of its own is not reported as silent.

```bash
bash scripts/dev-services.sh start
(cd apps/api && pnpm exec tsc -p tsconfig.build.json --outDir .dev/dist-co-states && \
  API_PORT=4314 JOBS_ENABLED=false THROTTLE_LIMIT=5000 DEV_TOKEN_THROTTLE_LIMIT=3000 ADMIN_LOGIN_THROTTLE_LIMIT=200 \
  CORS_ORIGINS=http://localhost:3314 node .dev/dist-co-states/src/main.js &)
flock /tmp/gp-web-build.lock env NEXT_DIST_DIR=.next-co-states NEXT_PUBLIC_DATA_SOURCE=api \
  NEXT_PUBLIC_API_URL=http://localhost:4314 NEXT_PUBLIC_WS_URL=ws://localhost:4314 pnpm --filter @gp/web build
(cd apps/web && NEXT_DIST_DIR=.next-co-states pnpm exec next start -p 3314 &)
BASE_URL=http://localhost:3314 API_URL=http://localhost:4314 \
  BASELINE=apps/web/test-results/visual/qa-states-baseline/report.json node apps/web/scripts/qa-states.mjs
```

Output: `apps/web/test-results/visual/qa-states/<state>/<route>_<1440|390>.png` (+ `_early` for `slow`),
`report.json`, `matrix.md`, `summary.txt` (git-ignored). Env: `STATES`, `WIDTHS`, `ONLY`, `CONCURRENCY`,
`SKELETON_MS`, `SLOW_MS`, `TIMEOUT_WAIT_MS`, `TIMEOUT_ROUTES`, `SHOTS`, `BASELINE`, `OUT`.

A tab that crashes (memory pressure on a shared machine) is retried once in a fresh context — a crash is not a
finding. Several workers share one fresh player and log the super admin in once each (TOTP steps are single-use, so
each login waits for its own 30 s window).

**Baseline**: the `.next-co-states` build from 08:55 UTC, i.e. before any state fix of this work (the shared error
model, timeouts, ErrorState and every per-route fix came after it), run at 1440 with the same script. A matrix cell
reads **fixed** when that baseline had a problem there and the current build has none.

**Final run**: the current build at 1440 + 390 (1844 visits). Afterwards two cosmetic tweaks to the shared
`ErrorState` (the inline variant wraps its actions under the text on phones; the generic offline text no longer
repeats the module's "your balance is safe" note) and the < 768 selector of the withdraw validation scenario were
made; the validation scenarios were re-run on that build (rows below) — the matrix verdicts do not depend on either
tweak.

## Result

Final run (2026-11-28, current build, widths [390, 1440]): **1844 visits, 5 with a problem** — exactly the 5 accepted `/admin/login` 390 cells (silent, see ¹). Baseline (pre-fix build, 1440): 882 visits, 476 with a problem ({'skeleton': 373, 'identity-error': 1, 'raw': 110, 'silent': 64, 'no-retry': 52, 'no-validation-message': 1, 'scenario-error': 1}).

Matrix cells (route × state, both widths merged): **445 OK · 469 fixed · 5 accepted · 0 gap** (n/a = state not run for that route: `timeout` runs on representative routes only, `empty` needs a member page).

### Route × state matrix

| Route | ok | empty | down | 500 | 502 | 429 | 503 | slow | timeout |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/2fa` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/2fa/challenge` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/2fa/setup` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/about` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/account/2fa` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/anti-phishing` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/devices` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/documents` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/kyc` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/kyc/verify` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/login-history` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/notifications` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/security` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/account/sessions` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/admin` | OK | n/a | fixed | OK | fixed | OK | OK | OK | fixed |
| `/admin/[...slug]` | fixed | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/admin/alerts` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/approvals` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/audit` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/compliance` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/compliance/aml` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/compliance/kyc` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/compliance/kyc/[id]` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/deposits` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/fees` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/ledger` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/pool-accounting` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/reconciliation` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/refunds` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/reports` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/finance/withdrawals` | OK | n/a | fixed | OK | fixed | OK | OK | OK | fixed |
| `/admin/finance/withdrawals/[id]` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/login` | OK | OK | accepted¹ | accepted¹ | accepted¹ | accepted¹ | accepted¹ | OK | n/a |
| `/admin/no-access` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/admin/permissions` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/pool` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/pool/active` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/pool/balance` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/pool/participants` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/admin/pool/policy` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/pool/prizes` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/admin/pool/refunds` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/pool/rounds` | OK | n/a | fixed | OK | fixed | OK | OK | OK | fixed |
| `/admin/pool/settlement` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/admin/pool/vrf` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/roles` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users` | OK | n/a | fixed | OK | fixed | OK | OK | OK | fixed |
| `/admin/users/[id]` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/account` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/aml` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/audit` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/kyc` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/responsible-gaming` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/restrictions` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/transactions` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/admin/users/[id]/wallets` | OK | n/a | fixed | OK | fixed | OK | OK | OK | n/a |
| `/affiliates` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/age-restricted` | OK | OK | OK | OK | OK | OK | OK | OK | n/a |
| `/compliance-preview` | OK | OK | OK | OK | OK | OK | OK | OK | n/a |
| `/dashboard` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/favourites` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/deposits` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/fees` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games/active` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games/entries` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games/favourites` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games/results` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games/rounds` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/games/winnings` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/refunds` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/rewards` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/history/transactions` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/history/withdrawals` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/legal/[doc]` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/notifications` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/official-channels` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/onboarding` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/pool` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/pool/entries` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/pool/history` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/pool/prizes` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/pool/rounds/[number]` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/pool/rounds/[number]/verify` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/promotions` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/provably-fair` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/recently-played` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/region-unavailable` | OK | OK | OK | OK | OK | OK | OK | OK | n/a |
| `/responsible-gaming` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/responsible-gaming/cooling-off` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/responsible-gaming/deposit-limits` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/responsible-gaming/participation-limits` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/responsible-gaming/reality-checks` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/responsible-gaming/self-exclusion` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/responsible-gaming/time-limits` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/restricted` | fixed | OK | fixed | fixed | fixed | fixed | fixed | fixed | n/a |
| `/restricted/[variant]` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/security` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/sign-in` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/sign-up` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/status` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/support` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/transactions` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/verify` | OK | n/a | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/vip` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/wallet` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/wallet/connected` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/wallet/deposit` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/wallet/deposit?step=address` | OK | OK | OK | OK | OK | OK | OK | OK | n/a |
| `/wallet/history` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | fixed |
| `/wallet/whitelist` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/wallet/withdraw` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/wallet/withdraw/[reference]` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |
| `/wallet/withdraw?step=address` | OK | OK | OK | OK | OK | OK | OK | OK | n/a |
| `/winners` | OK | OK | fixed | fixed | fixed | fixed | fixed | OK | n/a |

¹ `/admin/login` silent: the only request is the decorative system-status line of the policy panel, which is hidden below 1024 px; at 390 the sign-in form shows its own error on submit (1440 shows "Status check failed" + Try again).

### Validation scenarios

| Validation scenario | Width | Result | Messages shown |
| --- | --- | --- | --- |
| deposit limit: server answers 400 VALIDATION_FAILED | 390 | OK | Amount must be at most 1,000,000.00 |
| deposit limit: server answers 400 VALIDATION_FAILED | 1440 | OK | Amount must be at most 1,000,000.00 |
| onboarding: submit with nothing filled | 390 | OK | Enter your date of birth / Required. Real-money play is offered only where an applicable licence permits it. / Accept the Terms of Service a |
| onboarding: submit with nothing filled | 1440 | OK | Enter your date of birth / Required. Real-money play is offered only where an applicable licence permits it. / Accept the Terms of Service a |
| withdraw: malformed address | 390 | OK | Not a valid Arbitrum address — check the network before you continue. |
| withdraw: malformed address | 1440 | OK | Not a valid Arbitrum address — check the network before you continue. |

## What was fixed

Shared (every route):

- **Client timeout + readable transport errors** (`src/lib/api/transport.ts`): every `apiRequest()` / `apiGet()` has a
  20 s timeout (`NEXT_PUBLIC_API_TIMEOUT_MS`) and throws `ApiNetworkError` / `ApiTimeoutError`; envelope-less error
  pages (a proxy's "502 Bad Gateway" HTML) get `statusMessage()`; `Retry-After` is exposed. Before: a hung API kept
  skeletons forever and "Failed to fetch" / "502 Bad Gateway" reached the UI.
- **One error model** (`src/lib/api/errors.ts` `describeError`) + **`<ErrorState>`** (`src/components/ui/error-state.tsx`),
  used by every module wrapper (wallet `QueryError`, pool `QueryError`, rg-history `QueryError`, account
  `QueryState` + `DashboardPage failure`, admin-a `QueryErrorPanel`, admin-b `QueryError`).
- **Retry policy** (`shouldRetryQuery`): one retry for network / 5xx, none for 4xx, 429, 503 or timeouts (a timeout
  retry doubled the skeleton time to ~40 s).
- **Shell**: balance pill / pool tile / drawer show "—" ("couldn't be loaded") instead of an endless skeleton
  (`shellValue`); connection banner with Try again when the API can't be reached (`useApiConnectivity`).
- **Admin console**: a transient failure while restoring the session (API down, timeout, 5xx, 429) keeps the session
  and shows "Can't reach the admin API" + Try again instead of signing the admin out (`unreachable`).

Per route (state handling only):

| Route | Problem (baseline) | Fix |
| --- | --- | --- |
| `/restricted` | 3–4 skeletons forever for guests, on errors and for an account still onboarding (QA Q10) | sign-in prompt · `ErrorState` · "Finish setting up your account" link (`components/auth/restricted.tsx`) |
| `/restricted/[variant]` | raw `error.message`, no 429 wait | shared `ErrorState` |
| `/account/kyc/verify` | KYC dialog step content stuck on skeletons for guests and on errors (QA Q10) | sign-in prompt / `ErrorState` in the dialog (`kyc-flow/flow.tsx`) |
| `/account/anti-phishing` | failed profile shown as code "Not set" | `DashboardPage failure` → `ErrorState` |
| `/2fa/challenge` + every step-up dialog | 2FA status failure silent; anti-phishing code "Not set yet" when unknown; raw message on failure | inline `ErrorState`, "Couldn't load your code right now", `describeError` copy |
| withdrawal 2FA field | anti-phishing code "Not set" when the profile failed | "Couldn't load — check before you continue" |
| `/wallet/deposit` | step 1: failed status / limits silent; address step: generic error shown as a **security** alert with the raw message (QA Q17's error part); "Recent deposits" side card skeleton forever | inline `ErrorState` ("couldn't check your deposit status and limits"); address error = `ErrorState` (maintenance title for 503); side card `ErrorState` |
| `/wallet/withdraw` | step 1: balance skeleton forever + Continue disabled with no reason; address step: failed saved-address list silent (skeleton); amount step: failed balance / limit read as 0.00; review: fee quote failure = skeleton forever, platform fee shown as 0.00 while unknown; side card daily limit skeleton forever | `ErrorState` with Try again, "—" for unknown figures, fee "…" until quoted |
| `/wallet/history` | 10 lifetime-tile skeletons forever | inline `ErrorState` |
| `/notifications` | preferences rail skeleton forever | inline `ErrorState` |
| `/onboarding` | failed location check silent; save error said "Nothing was saved" even when the outcome was unknown | "We couldn't check your location right now — choose your country"; `describeError` copy + honest outcome-unknown sentence |
| `/` (homepage; also behind `/onboarding`) | snapshot failure with no server data = skeleton forever; failed live refresh kept a silent "LIVE" badge on stale figures; live entries feed skeleton forever | `ErrorState` (Try again); "Live pool updates are paused — figures below are from HH:MM UTC" inline notice; feed `ErrorState` |
| `/responsible-gaming/*` limit + break forms | validation errors showed "Request validation failed"; breaks / self-exclusion said "nothing was changed" for a timeout or dropped connection (it may have been applied) | `writeErrorText()`: field issue / API message, honest "couldn't confirm — check your status" when the outcome is unknown |
| `/region-unavailable` (gates page) | "We couldn't check your region — Try again in a moment" without a button | Try again (`geo.refetch`) |
| `/admin` overview | audit feed, approvals, networks and round panels: errors without Try again | `onRetry` on each `QueryErrorPanel` |
| `/provably-fair` | recent draws: error rendered as an empty list; no empty state | pool `QueryError`; "No completed draws yet" |
| `/admin/login` | "API unreachable" without retry (also for a 500) | "Status check failed" / "API unreachable" + Try again |
| `/admin/pool/prizes` | 11 skeletons forever when the overview failed or there was no round | skeleton → `QueryError` / "Choose a round" |
| `/admin/pool/participants`, `/admin/pool/settlement` | failed overview / history shown as "Choose a round" / "No settled round yet" | `QueryError` |
| admin tables (pool overview recent rounds, pool accounting rounds ledger, circuit-breaker history, winners) | empty `DataTable` rendered nothing | `EmptyState` |

## ERR-07 — security warnings inventory

Library: `SecurityWarning` (`src/components/ui/security-warning.tsx`, on `Alert` — security kinds are never
dismissible) with one copy set per kind (`securityWarningCopy()`); catalogue in `/design-system` → Feedback.
Every warning says what happened, what is still safe and the next step; none pushes a player past a protection,
fakes urgency or hints at VPN / geo bypass.

| Warning | Where it shows | Status |
| --- | --- | --- |
| Wrong network | Topbar "Wrong network · Switch to Arbitrum" (≥ 768) + full-width `SecurityWarning` banner (< 768) when the member's **own linked wallet** is connected to the site on another chain (`useInjectedWallet` + `isWrongNetwork`, prompt-free `eth_chainId` / `eth_accounts`); "Switch" calls `wallet_switchEthereumChain` (toast if the wallet refuses). Deposit address step (WAL-05) `SecurityWarning wrong-network` with the wallet's chain id + Switch. Connect wallet dialog (AUTH-09) "Switch network" step. Pool participation modal (GP-02, preview state). | **fixed** — the topbar state existed only in previews and its button did nothing; it is now driven by the real wallet. Deposit warning moved to the library copy. |
| New address cool-down | `/wallet/whitelist` (cooling-down banner with unlock time + "Remove it", per-row "Cooling down · unlocks …"), withdraw address step (a cooling address can't be chosen; unlock time; `ADDRESS_COOLDOWN` refusal → "Choose another address"), 24 h cool-down explained in the add-address modal. | OK (existing, server-enforced) — library kind `new-address` available for new surfaces. |
| New device | AUTH-21 `NewDeviceDialog` (`GET /auth/new-device-alerts`: device, location, time, "Yes, it was me" / "No, secure my account"), `/account/devices` + `/account/sessions` ("Not you? Revoke"), security notifications. | OK (existing). |
| Suspicious sign-in | `/account/login-history` flags unusual sign-ins ("Flagged entries are unusual for you"); library kind `suspicious-login`. | OK (existing). |
| Phishing | Sign-in dialog note (check the address bar; we never ask for seed phrase / 2FA codes), wallet dialogs "We never ask for your seed phrase", footer + `/official-channels`, `/account/security` "We will never ask for…", support page, admin login. Library kind `phishing`. | OK (existing). |
| Anti-phishing code | Step-up dialog (AUTH-08), withdrawal 2FA field (`AntiPhishingCode`), `/account/anti-phishing`, new-device dialog, emails (API). | **fixed** — when the profile failed to load the code was shown as "Not set" / "Not set yet" (wrong security information); it now says it couldn't be loaded and to check before continuing; `/account/anti-phishing` shows an error with Try again instead of "Not set". |
| Unverified (look-alike) token contract | Deposit address step: `SecurityWarning unverified-contract` — only the configured test-USDT contract on Arbitrum Sepolia is credited (the deposit watcher reads `Transfer` logs of that contract only); look-alike "USDT" tokens and airdrops are never credited and often scams. | **added** (no such warning before). |

Gaps / not built (no owner decision needed, recorded for the next batch): the pool contract address and its
explorer-verification status are not shown anywhere yet (the contract is not deployed on Arbitrum Sepolia — see
ARCHITECTURE "Not yet built"); the round page already says on-chain records appear once rounds are mirrored. The
Figma ERR-07 board is not started, so the copy follows the ledger and the module screens.

## ERR-01 / ERR-02 / ERR-03 coverage notes

- **ERR-01 empty states** — every list a fresh player reaches has an `EmptyState` with the next step (wallet
  history, transactions, deposits / withdrawals, pool entries, game history tabs, notifications, devices / sessions,
  login history, whitelist, documents, admin tables). The `empty` column is a fresh, onboarded DEV MOCK player.
  Admin empty tables are checked by code (`DataTable empty`), the DEMO database is never empty for admins.
- **ERR-02 error states** — `down` / `500` / `502` / `429` / `503` / `timeout` columns above; validation table
  below the matrix. Chain-level errors from the Figma ledger row (congestion, tx failed / dropped / replaced) are
  module states that already exist (`NetworkPill` congested · down, withdrawal timeline failed / refunded, deposit
  delayed) and are not forced by this audit (they need chain fixtures, see `wallet.spec.ts` / chain e2e).
- **ERR-03 loading** — `slow` column (early screenshot `_early` must show a skeleton or busy state, never a blank
  area; the page must finish). Progress: deposit confirmations ring / bar (n / 20), withdrawal status timeline,
  `toast({ type: 'tx' })` for pending transactions, `Button loading` on submits. **Optimistic UI is deliberately
  not used for money or RG** (balances, entries, deposits, withdrawals, limits, breaks): the server ledger is the
  authority, so these views wait for the confirmed response and then invalidate (`invalidatePlayerFinancials`).

## Tests

- `apps/web/test/states.test.tsx` (unit, 54 tests): transport timeouts / network errors / proxy pages / Retry-After,
  the `describeError` matrix, retry policy, `writeErrorText`, `ErrorState` + every module error panel, shell figures,
  the ERR-07 `SecurityWarning` kinds + `isWrongNetwork`, the shell wrong-network state, `/restricted` index states.
- `apps/web/e2e/states.spec.ts` (Playwright, fresh DEV MOCK players): wrong network on desktop (topbar + Switch) and
  mobile (banner), no warning for a foreign wallet, `/restricted` guest, deposit address 503, look-alike token
  warning, withdraw with balances failing, anti-phishing page with the profile failing.
- `apps/web/scripts/qa-states.mjs`: the route × state sweep above.

## Decisions

1. The geo gate request (`GET /compliance/geo`) is treated as bootstrap in the audit and the PUB-22 age gate is
   pre-confirmed in the audit browsers: both are owned and tested by the gates work (`e2e/gates.spec.ts`); the gate
   fails open on an error (the API enforces region / age), so pages are still measured in every state.
2. Timeouts are not retried automatically (20 s, then an error with Try again) — a retry doubled the skeleton time.
3. A failed write never says "nothing was saved / changed" unless the API gave a definite refusal
   (`isOutcomeUnknown`, `writeErrorText`).
4. The shell's wrong-network warning appears only when the member's **own linked wallet** is connected to the site
   on another chain (prompt-free reads), never just because a wallet extension is installed.
5. No owner decision was needed for this work.
