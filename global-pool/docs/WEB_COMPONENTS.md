# apps/web — components & shell (quick reference)

Package `@gp/web` (Next.js 15 App Router · React 19 · Tailwind CSS v4 · Radix via `radix-ui` · lucide-react ·
TanStack Query · react-hook-form + zod · sonner). Visual catalogue of every component and state:
**`/design-system`**; live responsive shell: **`/design-system/shell?auth=guest|member&state=default|wrong-network|restricted`**.

```bash
pnpm build:packages                      # tokens + shared dist (once after install)
pnpm --filter @gp/web dev                # http://localhost:3000
pnpm --filter @gp/web typecheck | lint | test | build | start
pnpm --filter @gp/web visual             # Playwright screenshots → apps/web/test-results/visual/ (server must run)
```

## Conventions

- Imports use `@/…` (`src/`). `cn()` (`@/lib/utils`) is a token-aware tailwind-merge — use it for every className merge.
- Only token classes exist (`bg-surface-default`, `text-text-secondary`, `text-h3`, `text-number-m`, `rounded-lg`, …).
  Breakpoints: `tablet:` 768 · `lg:` 1024 (Tailwind default) · `laptop:` 1280 · `desktop:` 1440. `rail:` = sidebar is
  in its 72 px rail (forced or automatic 1024–1279).
- Money: pass **decimal strings** (`'9215.30'`) — formatting goes through `@gp/shared/money` (`formatUSDT`), never floats.
- DEMO: every DEMO value carries `<DemoBadge>`; pages inside the shell get the pinned `<DemoBar>` automatically
  (`NEXT_PUBLIC_DEMO_MODE` ≠ `false`). Countdowns derive from absolute ISO times; `demoNow` only for DEMO clocks.
- Server vs client: files under `components/ui` without `'use client'` (Button, Badge, Card, Table, Skeleton, Avatar,
  EmptyState, DemoBadge) work in Server Components. Don't pass event handlers from server components.

## Layout & routes

| Path                                 | Purpose                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`                 | html/body, Inter (`@fontsource-variable/inter`) + Geist Mono (`geist`), `<Providers>` |
| `src/app/providers.tsx`              | QueryClient, `AuthProvider`, `TooltipProvider`, `Toaster`                             |
| `src/app/(app)/layout.tsx`           | casino shell for all player pages — put new pages in `(app)/…`                        |
| `src/app/(app)/page.tsx`             | **Homepage / public lobby (PUB-01, MOB-03)** — see “Homepage” below                   |
| `src/app/(auth)/layout.tsx`          | focused pages without the shell (onboarding, 2FA, admin sign-in)                      |
| `src/app/design-system/…`            | kitchen sink + shell preview (noindex)                                                |
| `src/components/shell/nav-config.ts` | `ROUTES`, `PRIMARY_NAV`, `ACCOUNT_NAV`, `TAB_NAV` — every href is a built page (unit-tested) |
| `src/app/(app)/legal/[doc]`, `/support`, `/promotions` | DEMO summaries behind consent / KYC / footer / bonus links (`components/legal/*`) |
| `/winners` `/vip` `/affiliates` `/about` `/official-channels` `/status` `/security` | honest "not in this build yet" pages (`ComingSoonPage`) |

## Auth — `@/lib/auth` + `@/components/auth/*`

`useAuth()` → `{ mode: 'privy'|'mock', status: 'loading'|'guest'|'member', user, profile, syncing, signIn(), signUp(),
signOut(), openAuth(view?, { next }), getAccessToken() }`. `profile` is the API `GET /me` view (`MeProfile` in
`@/lib/api/auth`: handle, emailMasked, `onboardingRequired`, `security.antiPhishingCode`, `isDemo`, …).

- **One GLOBAL POOL flow for sign-in and sign-up** (owner decision #3): `<AuthDialog>` (split dialog over the dimmed
  lobby ≥ 1024, single pane 768–1023, full-height bottom sheet with sticky CTA < 768) drives Privy **headlessly**
  (`useLoginWithEmail` email → 6-digit code, `useLoginWithOAuth` Google / Apple, `useLoginWithSiwe` browser wallet;
  WalletConnect-style wallets open Privy's themed modal). Routes: `/sign-in`, `/sign-up`, `/verify` (lobby behind,
  `?next=` honoured, URL follows the step). Open it from anywhere with `useAuth().signIn()` / `openAuth('sign-up', { next })`.
- **DEV MOCK** (no `NEXT_PUBLIC_PRIVY_APP_ID` or `NEXT_PUBLIC_PRIVY_MOCK=true`): the same dialog; no email is sent — any
  6 digits work (`000000` simulates a wrong code). `nova.k@example.com`, Google, Apple and wallets sign in as the seeded
  DEMO player **@nova.k** (`did:privy:demo-nova-k`); any other email is a NEW player (deterministic DID) who must
  onboard. `getAccessToken()` exchanges the mock session for a real DEV token via `POST /auth/dev/token` (cached in
  localStorage `gp.devMockToken`, so one browser = one API session). Session: localStorage `gp.devMockSession`.
- **Session layer** (mounted by `AuthProvider`, nothing to add in pages): registers the player token provider for
  `apiRequest()`, runs `POST /auth/session` once per login then `GET /me`, redirects members with
  `onboardingRequired` to `/onboarding?next=…` (exempt: `/onboarding`, `/restricted/*`, `/legal/*`, `/sign-*`, `/verify`,
  `/2fa/*`, `/responsible-gaming`, `/support`, `/admin`, `/design-system`), signs out after
  `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` (default 30, `0` = off) or when any player query/mutation fails with 401
  `UNAUTHENTICATED`, then shows **AUTH-20** `<SessionExpiredDialog>` ("Sign in again" returns to the same page), and
  shows **AUTH-21** `<NewDeviceDialog>` for `GET /auth/new-device-alerts` (never auto-opens for seeded DEMO accounts).
- **Player caches** (`src/lib/api/player-cache.ts`): player query keys are not scoped by user, so sign-out / expiry /
  sign-out in another tab removes every player prefix (`clearPlayerData`), and every financial or RG write calls
  `invalidatePlayerFinancials()` (wallet, pool/me, account, history, rg, me, auth balances + account-status). Admin
  sign-out / idle expiry removes `['admin']` and `['admin-b']` (`clearAdminData`). `?next=` goes through `safeNext()`
  (`safeAdminNext()` in the admin console): no control characters / whitespace / backslashes, same origin only.
  Writes whose response is lost (`isOutcomeUnknown()`) are shown as "couldn't confirm" and retried with the same key.
- **Onboarding** `/onboarding` (`<OnboardingScreen>`): handle, country (prefilled from `GET /compliance/region`), date of
  birth (18+), consents never pre-checked (Terms + Privacy · 18+ + jurisdiction · optional marketing) →
  `POST /auth/onboarding`. Errors: taken handle, `GEO_RESTRICTED` (no bypass hints).

### Step-up 2FA — `useStepUp()` / `<StepUpDialog>` (`@/components/auth/step-up`)

```tsx
const { requestStepUp } = useStepUp();
const step = await requestStepUp({
  purpose: 'withdrawal',                       // 'withdrawal' | 'whitelist_change' | 'security_settings'
  title: 'Confirm withdrawal WD-20931',        // optional
  description: 'Enter the code to send 1,500.00 USDT.', // optional
  summary: <KeyValueBox>…</KeyValueBox>,       // optional — what is being confirmed (amount, address, fees)
  confirmLabel: 'Confirm withdrawal',          // optional
});
if (!step) return;                             // cancelled
await apiRequest('/withdrawals', { method: 'POST', body, stepUpToken: step.stepUpToken });
```

AUTH-08 states: anti-phishing code (from `/me`), authenticator code or backup code, wrong code (attempts left from the
API), 15-minute lock with a countdown to the real `lockedUntil`, "Set up two-step sign-in first" (links to
`/2fa/setup?next=<this page>`) when 2FA is off. The token is single-use, 5 min, bound to session + purpose.
Pages: **`/2fa/setup`** (AUTH-07: QR + setup key → TOTP confirm → 10 backup codes, Finish disabled until "I've saved my
backup codes" is ticked; `?next=` returns to the caller) and **`/2fa/challenge?purpose=…&next=…`** (page version;
the next page reads the token once with `consumeStoredStepUp(purpose)`).

### Wallet connect & verification — `useWalletConnect()` (`@/components/auth/wallet-dialogs`)

`const { openConnect, openVerify } = useWalletConnect()` — **AUTH-09** `<ConnectWalletDialog>` (list · WalletConnect
QR · connecting · rejected · wrong network → "Switch to Arbitrum" · success) then **AUTH-10** `<VerifyWalletDialog>`
(human-readable message, "No transaction / No gas · 0.00 / Can't move funds", 10-minute nonce with live countdown,
success record · rejected · expired nonce). Privy: browser wallets via EIP-1193 + `useLinkWithSiwe`; other wallets
via Privy's link-wallet modal. After a successful link the session is re-synced (`POST /auth/session`) and `auth`,
`me`, `wallet`, `wallets` queries are invalidated. DEV MOCK uses a DEMO wallet and a neutral "Mock wallet" pop-up.

### Account gate & restricted pages (AUTH-18)

`GET /auth/account-status` (`authApi.accountStatus()`) → `{ gate: ok|onboarding|suspended|self_excluded|region|
under_review, restrictions[{type, since, reference}], paused{gaming,deposits,withdrawals}, selfExclusion, region }`.
`routeForGate(gate)` and `restrictedRouteFor(apiError)` map to **`/restricted/suspended · under-review ·
self-excluded · region`** (`/restricted` picks the right one). Withdrawals stay available unless an AML freeze applies
(`withdrawals_frozen` → gate `under_review`: the page lists withdrawals as paused and leads with Contact support).

QA: `/auth-preview?show=<state>` (dev / `NEXT_PUBLIC_STATE_PREVIEW=true` only) renders every dialog state with DEMO
fixtures; `node scripts/auth-qa.mjs` screenshots them at 1440 / 390; e2e: `e2e/auth.spec.ts`.

### Compliance gates — PUB-21 · PUB-22 · ERR-05 (`@/components/compliance/*`)

A courtesy layer over the server-side rules: the API decides the location (`GET /compliance/region` · `/compliance/geo`)
and refuses every gaming / deposit request from a restricted country (451 `GEO_RESTRICTED`), so the web never is the
control. No VPN / proxy / bypass hints anywhere (Figma decision #26 keeps one explicit "please don't use a VPN or proxy").

- **`<ComplianceGate>` + `<GateContent>`** (mounted in `app/(app)/layout.tsx` around / inside `AppShell`) — per render
  `gateView()` (pure, unit-tested) picks: `geo` → **PUB-21 `<GeoBlockInterstitial>`** INSTEAD of shell + page (no
  sidebar / tab bar) on gaming & financial pages (`isGeoGated`: `/games`, `/pool`, `/promotions`, `/favourites`,
  `/recently-played`, `/wallet/deposit` — NEW deposits only: the `?ref=DP-…` tracker of a deposit already sent stays open,
  read from the query string by a Suspense-wrapped probe); `hold` → skeleton while the decision loads on such a page (no gaming UI first;
  an unreachable API shows the page — the server still refuses); `age` → **PUB-22 `<AgeGateDialog>`** (modal ≥ 768,
  bottom sheet < 768; no close icon, Esc / outside ignored) for guests on gambling surfaces (`isAgeGated` = `/` + the
  geo-gated pages) without a valid confirmation; `exit` → `/age-restricted` after "I am under 18" (this browser session).
  Always open: withdraw, wallet, history, account, RG, legal, support, sign-in/up, onboarding, `/restricted/*`, admin.
- **Members** never get the browser age gate: the onboarding `ageConfirmed` consent is authoritative (a member who still
  needs consents is sent to `/onboarding` by the session layer). The age question waits while the sign-in dialog is open.
- **Memory** (`storage.ts`, every access in try/catch — blocked storage means "ask again", never "skip"): first-party
  cookie `gp_age_ok=<epoch s>.<country>` (30 days, SameSite=Lax, Secure on https) mirrored in localStorage `gp.ageGate`;
  "under 18" in sessionStorage `gp.ageGate.under18`. QA scripts that screenshot guest gambling pages pre-set the cookie
  (`context.addCookies([{ name: 'gp_age_ok', value: '<epoch>.PT', url }])`) — the same state a visitor has after Enter.
- **PUB-22 form** `<AgeGateForm>`: Yes / No radios (neither selected), country of residence prefilled with the detected
  country and checked by the API (`?declared=`), jurisdiction checkbox (never pre-checked), licence notice, Terms /
  Privacy / RG / Restricted countries, Leave + Enter (`ageGateAction()`: Enter only after Yes + the box for a permitted
  country; No → Continue → exit page). Exit page `<AgeRestrictedPage>` (`/age-restricted`): help organisations, note for
  parents and carers, "Leave GLOBAL POOL", no casino navigation.
- **PUB-21** `<GeoBlockInterstitial decision>`: region banner, focused top bar (Sign up disabled), detected region (+ DEMO
  badge for a DEV override, "Checked at … UTC", "Wrong location? Tell support"), what still works (guest: "Log in to
  withdraw" → sign-in dialog → `/wallet/withdraw`; member: "Withdraw funds", entries & history), support, restricted
  countries, licence information, locked-tiles preview, sticky withdraw CTA < 768. Page version: `/region-unavailable`.
- **ERR-05** one set for every regulatory block — `regulatoryCopy(kind, ctx)` (`region · licence · kyc_required ·
  self_excluded · cooling_off · age`: what happened, what still works, what is paused, actions with withdraw first where
  money is held, note), `regulatoryFromError(err)` (451 / `GEO_RESTRICTED` with the country's name, `SELF_EXCLUDED` →
  self-exclusion or cooling-off by `details.kind`, `KYC_REQUIRED`, `REAL_MONEY_DISABLED` → licence),
  `<RegulatoryState kind ctx layout="page|card">`, `<RegulatoryNotice>` (inline Alert), **`<RegulatoryGuard error>`**
  (module guard: the card instead of the module for a regulatory refusal, else its children — used by the deposit
  address step), `<HelpOrganisations>`, `<RegulatoryFooter>` (18+ · licence · RG). The AUTH-18 `/restricted/self-excluded`
  page uses the ERR-05 cooling-off copy for a break.
- Routes: `app/(gates)/region-unavailable`, `app/(gates)/age-restricted` (outside `(app)`: no shell);
  dev / `NEXT_PUBLIC_STATE_PREVIEW=true` only: `/compliance-preview?kind=<kind|age-gate>&layout=page|card|notice`.
  DEV QA location (state-preview builds + an API with NODE_ENV=development): `?devCountry=US` (kept for the tab).

QA: `BASE_URL=http://localhost:3313 API_URL=http://localhost:4313 node scripts/gates-qa.mjs` →
`test-results/visual/gates/*.png` (API with `TRUST_PROXY=true GEO_COUNTRY_HEADER=x-country`; the script adds the CDN
header per shot); e2e: `E2E_BASE_URL=http://localhost:3313 E2E_API_URL=http://localhost:4313 pnpm --filter @gp/web
test:e2e -- e2e/gates.spec.ts`; unit: `test/gates.test.tsx`.

## UI primitives — `@/components/ui/*`

| Component                                                                                                                 | Key props                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                                                                                                                  | `variant` primary·secondary·ghost·danger·gold·link, `size` s(32)·m(40)·l(48), `loading`, `leadingIcon`, `trailingIcon`, `block`, `asChild` (wrap `<Link>`)         |
| `IconButton`                                                                                                              | `label` (required a11y name), `variant` ghost·secondary, `size` s·m·l, `asChild`                                                                                   |
| `StatusBadge`                                                                                                             | `status` pending·processing·confirmed·approved·failed·rejected·under_review·restricted·live·new·expired·neutral, `size` s·m, `label`, `uppercase`                  |
| `CountBadge` / `VipBadge` / `AgeBadge` / `Tag`                                                                            | `count,max,tone` / `tier` / — / `tone` neutral·brand·gold·danger                                                                                                   |
| `DemoBadge` / `DemoBar`                                                                                                   | `size` xs·s·m (`m` = "DEMO DATA"), `label` / `message`, `shortMessage` (< 768)                                                                                     |
| `Card` (+`CardHeader/Title/Description/Action/Content/Footer`, `Overline`)                                                | `variant` default·raised·outline·sunken·gold·interactive, `radius` lg·xl, `padding` none·s·m·l                                                                     |
| `Field`                                                                                                                   | `label`, `labelAside`, `helper`, `error`, `success`, `disabled`, `hideLabel` — wires id/aria to the control inside                                                 |
| `Input` / `InputGroup` + `InputControl` / `Textarea`                                                                      | `size` s·m·l, `state` default·error·success, `leadingIcon`, `trailing`                                                                                             |
| `PasswordInput`                                                                                                           | `showStrength` (+ exported `passwordStrength()`) — admins only; players have no passwords                                                                          |
| `OtpInput`                                                                                                                | `value`, `onChange`, `onComplete`, `length`=6, `invalid`, `disabled`, `focusOnMount` (one real input, `autocomplete=one-time-code`)                                |
| `SearchInput`                                                                                                             | `size` s·m, `shortcut` (⌘K / Ctrl K focuses), `onClear`                                                                                                            |
| `Select`, `SelectTrigger`(`size`), `SelectContent`, `SelectItem`(`description`, `aside`), `SelectValue`                   | Radix select styled as Select/Field                                                                                                                                |
| `Checkbox` / `CheckboxField`                                                                                              | consents are never pre-checked (`label`, `description`)                                                                                                            |
| `Switch` / `SwitchField`                                                                                                  | never default ON for spend/risk settings                                                                                                                           |
| `Tabs`, `TabsList`(`variant` underline·pill·segmented), `TabsTrigger`(`count`), `TabsContent`                             |                                                                                                                                                                    |
| `Tooltip`… / `InfoTooltip`(`label`) / `DefinitionTooltip`(`term`, `definition`)                                           |                                                                                                                                                                    |
| `Dialog`, `DialogContent`(`size` s 400·m 560·l 720, `showClose`), `DialogHeader/Body/Footer/Title/Description`            |                                                                                                                                                                    |
| `Sheet`, `SheetContent`(`side` bottom·right·left), `SheetHeader/Body/Footer/Title/Description`                            | bottom = mobile sheet with grabber                                                                                                                                 |
| `DropdownMenu*` (`DropdownMenuItem destructive`), `Popover*`                                                              |                                                                                                                                                                    |
| `toast({ type, title, description?, progress?, action? })`, `ToastCard`                                                   | types success·error·warning·info·tx (tx = pending with progress, no auto-dismiss)                                                                                  |
| `Alert`                                                                                                                   | `type` info·warning·security·restricted·maintenance·regulatory, `layout` inline·full, `title`, `actions`, `onDismiss` (ignored for security/restricted/regulatory) |
| `Skeleton`, `LoadingLabel`                                                                                                | shimmer stops under reduced motion                                                                                                                                 |
| `EmptyState`                                                                                                              | `type` no-data·no-results·error, `title`, `description`, `actions`, `reference`                                                                                    |
| `ErrorState` (+ `useRetryCountdown`)                                                                                      | ERR-02. `error` (whatever the query threw), `onRetry`, `retrying`, `what`, `title`/`description` overrides, `note`, `actions`, `variant` panel·inline — see "States" |
| `SecurityWarning` (+ `securityWarningCopy()`)                                                                             | ERR-07. `kind` wrong-network·new-address·new-device·suspicious-login·phishing·anti-phishing·unverified-contract + context props, `actions`, `layout` — never dismissible |
| `Table`(`density`), `TableContainer`, `TableHeader/Body/Row/Head`(`align`, `sort`, `onSort`)`/Cell`(`align`), `CellStack` |                                                                                                                                                                    |
| `Avatar`                                                                                                                  | `initials`, `size` xs·s·m·l·xl, `status`, `tone`, `label`                                                                                                          |
| `Separator`, `Label`                                                                                                      |                                                                                                                                                                    |

### States — empty · error · loading · security (ERR-01 / 02 / 03 / 07)

Audit + route × state matrix: **`docs/STATES.md`** (`scripts/qa-states.mjs`). Rules for every query-backed view:

1. **Loading (ERR-03)** — `Skeleton` blocks shaped like the content (+ `LoadingLabel` or `aria-busy`) **only while the
   request is pending**. A failed request is never "still loading": render an error instead. Buttons use `loading`.
2. **Error (ERR-02)** — `<ErrorState error={q.error} onRetry={() => void q.refetch()} what="your balances" />`
   (module wrappers `QueryError` / `QueryErrorPanel` / `QueryState` / `DashboardPage failure` already use it).
   `describeError(err, what)` (`@/lib/api/errors`) maps every error to one readable title + next step per kind:
   `network` (offline / API down) · `timeout` · `rate-limited` (429, Try again disabled for `Retry-After` seconds,
   default 10 s) · `maintenance` (503, keeps the API's "… is temporarily paused" message) · `server` (5xx, request id
   as "Ref …") · `not-found` · `forbidden` · `unauthenticated` · `validation` (field issues) · `client` (the API's own
   business message). Raw transport text ("Failed to fetch", "502 Bad Gateway", HTML, "signal is aborted") never
   reaches the UI. Several queries on one page: `failedQueries(a, b, …)` → `{ failed, error, retry, retrying }`
   (only queries that failed **with nothing cached**). Writes: `isOutcomeUnknown(err)` → never say "nothing was
   saved / charged" for a timeout, a dropped connection or a 5xx; retry with the same idempotency key.
   `writeErrorText(err, unknownOutcome, what?)` gives the player text for a failed write (field issue / API message,
   plus your honest "we couldn't confirm…" sentence when the outcome is unknown) — used by the RG limit and break forms.
3. **Empty (ERR-01)** — `EmptyState` (`no-data` with the next action, `no-results` with "Clear filters"). A failed
   request is never an empty state ("No transactions yet", "Choose a round", "Not set" for an unknown value).
4. **Security (ERR-07)** — `SecurityWarning` (copy library, consistent next steps, no dark patterns / bypass hints).

Plumbing: every request has a timeout (`apiRequest` / `apiGet` → `fetchText()` in `@/lib/api/transport`, 20 s,
`NEXT_PUBLIC_API_TIMEOUT_MS`) and throws `ApiNetworkError` / `ApiTimeoutError` with readable messages; envelope-less
error responses get `statusMessage(status)`; `Retry-After` is parsed into `details.retryAfterSeconds`. Queries retry
once for network / 5xx and never for 4xx, 429, 503 or a timeout (`shouldRetryQuery`, set in `providers.tsx`). The
player shell shows a connection banner with Try again when the API can't be reached (`useApiConnectivity()`), and
its own figures show "—" instead of an endless skeleton (`shellValue()`); the admin console keeps the session and shows
"Can't reach the admin API" + Try again on a transient failure (`AdminSessionStatus` `unreachable`).
Wrong network: `useInjectedWallet()` + `isWrongNetwork()` (`@/lib/wallet/injected`, prompt-free `eth_chainId` /
`eth_accounts`) drive the topbar "Wrong network" button (≥ 768) and a `SecurityWarning` banner (< 768) only when the
member's own linked wallet is connected on another chain; `switchToMvpChain()` asks the wallet to switch.
Catalogue: `/design-system` → Feedback (ErrorState per kind, SecurityWarning kinds). Tests: `test/states.test.tsx`.

## Brand — `@/components/brand/*`

| Component                 | Props                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Logo` / `LogoMark`       | `variant` full·mark, `height` (px), `title` ('' = decorative) — inline SVG, gold "$" over each letter                                                                                   |
| `ChainMark` / `TokenMark` | `chain` (ChainKey), `size`, `label`; `CHAIN_NAMES`                                                                                                                                      |
| `GameArt`                 | `game`: global-pool·orbit-rush·pool-dice·double-side·pool-roulette·twenty-one·vault-sweeper·skyline·pinfall·fortune-ring; `GAME_TILE_GRADIENT`, `TILE_GRADIENT_CLASS`, `isGameArtKey()` |

## Domain — `@/components/domain/*`

| Component                    | Props                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Amount`                     | `value` (decimal string), `tone` neutral·signed·gold·brand·muted, `unit`, `decimals`                                                                             |
| `StatCard`                   | `label`, `value` (pre-formatted), `unit`, `delta {value, trend up·down·neutral, context}`, `series`, `icon`, `size` m·l, `demo`                                  |
| `BalanceCard`                | `type` total·available·locked·pending·owed, `amount`, `total` (share bar), `composition`, `updatedLabel`, `demo`; `BALANCE_SPEC` holds colours/icons/definitions |
| `NetworkPill`                | `chain`, `status` operational·degraded·congested·down, `showStatusLabel`, `showChevron`, `size`                                                                  |
| `AddressChip`                | `address` (full or `0x12ab…9f3C`), `chain`, `size`, `demo`, `copyable`, `copyValue`                                                                              |
| `AmountInput`                | `value`, `onChange`, `available`, `min`, `max`, `decimals`, `limitsLabel`, `error`, `demo` (+ `sanitizeAmount()`)                                                |
| `AddressInput`               | `chain`, `value`, `onChange`, `addressStatus` whitelisted·new, `cooldownHours`, `onScanRequest`, `showNetwork` (+ `isValidAddress()`)                            |
| `NetworkSelect`              | `value`, `onValueChange`, `showFee`, `allowDisabledChains` (only enabled chains selectable — MVP Arbitrum Sepolia)                                               |
| `Countdown` / `useCountdown` | `closesAt` (ISO), `demoNow`, `size` s·m·l, `caption`, `doneLabel`                                                                                                |
| `JackpotMeter`               | `amount`, `size` m·l·xl (capped by container width), `live`, `demo`, `caption`, `bare`, `label` — fills its container width                                      |
| `GameTile`                   | `game`, `name`, `subtitle`, `href`, `edgeLabel`, `players`, `demo`, `tag` live·hot·new, `restricted`, `size` m(160×213)·s(100×133)                               |

## Shell — `@/components/shell/*`

| Component                                                                                               | Notes                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`                                                                                              | wired to `useAuth` + router; props `wrongNetwork`, `restricted`                                                                                                 |
| `AppShellFrame`                                                                                         | presentational shell: `auth`, `member: ShellMember`, `pathname`, handlers, `wrongNetwork`, `restricted`, `demoBar`, `poolAmount`                                |
| `Sidebar`                                                                                               | `auth`, `mode` auto·expanded·collapsed, `activeHref`, `counts {entries, notifications}`, `poolAmount`, `hidePromos`, `embedded`                                 |
| `SidebarNav`, `SidebarPromoTiles`, `resolveActiveHref()`                                                | shared by sidebar + drawer                                                                                                                                      |
| `Topbar`                                                                                                | guest (Sign in/Sign up/language) · member (balance pill + Deposit, network pill or Wrong network, bell, avatar menu) · `restricted` · `auth="loading"` skeleton |
| `MobileTopbar`, `MobileTabBar`, `MobileDrawer`                                                          | < 768 chrome; drawer below 1024                                                                                                                                 |
| `FooterMega`                                                                                            | desktop columns / mobile accordions                                                                                                                             |
| `BalancePill`, `NotificationsButton`, `WrongNetworkButton`, `UserMenu`, `LanguageMenu`, `LicenceNotice` | building blocks (`shell-parts.tsx`)                                                                                                                             |

Responsive: ≥ 1280 sidebar 240 (burger collapses to 72, saved in localStorage `gp.sidebar`) · 1024–1279 rail 72
(burger expands) · < 1024 burger opens the drawer · < 768 mobile top bar 56 + tab bar 56 (+ safe area).
Shell member data: with `NEXT_PUBLIC_DATA_SOURCE=api` a signed-in member sees their own Available (`walletKeys.balances`),
entries in the open round (`poolKeys.myRound`), unread notifications and the live pool amount (skeletons while loading);
`DEMO_SHELL_MEMBER` is only the mock data source / `?state=member` preview. The region banner names the country only
when the page passes `<ShellOverride restricted regionName=… />`.

## Homepage (PUB-01) — `src/components/home/*`

Route `/` (`app/(app)/page.tsx`, dynamic): the server page parses the dev preview, prefetches every query with
`prefetchHome()` and hydrates `<HomePage>` through TanStack `HydrationBoundary`. Sections (each its own file):

| Section                                       | Component (file)                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| H1 hero carousel + side promos + draw card    | `HeroSection` (`hero.tsx`, art in `art.tsx`)                             |
| H2 Global Pool live                           | `PoolLiveSection` (`pool-live.tsx`, chart `pool-chart.tsx`)              |
| H3 Originals / Table & live rails, categories | `GamesSection` (`games.tsx`)                                             |
| H4 recent wins + live bets                    | `ActivitySection` (`activity.tsx`)                                       |
| H5 How it works · H6 networks · H8 security   | `info-sections.tsx`                                                      |
| H7 Provably fair (real in-browser verifier)   | `FairnessSection` (`fairness.tsx`, algorithm `src/lib/fairness/dice.ts`) |
| H9 VIP · H10 Affiliate calculator             | `programs.tsx`                                                           |
| H11 FAQ + support/RG + SEO text               | `faq.tsx`                                                                |
| H12 footer                                    | shell `FooterMega`                                                       |

Shared view state comes from `useHomeView()` (`home-context.tsx`): `viewer` guest/member, `restricted`, `scenario`,
pool `snapshot`, `demoNow` (DEMO clock anchor), `myEntries`, `balance`. Pages tell the shell about region gating /
preview viewer with `<ShellOverride restricted previewMember previewGuest />` (`shell/shell-overrides.tsx`).

**Dev-only state preview** (`src/lib/home-preview.ts`; enabled in `next dev` or builds with
`NEXT_PUBLIC_STATE_PREVIEW=true`): `/?state=member`, `restricted`, `no-round`, `guest`, combinable
(`/?state=member,no-round`). A dev switcher is rendered at the end of the page when enabled.

## Data layer — `src/lib/data/*`

- `types.ts` view models (shapes follow the API views + `@gp/shared/types`; money = decimal strings, `isDemo` flags).
- `queries.ts` (server-safe): `queryKeys`, query-option factories (`poolSnapshotQuery`, `poolHistoryQuery`,
  `entriesFeedQuery`, `gamesQuery`, `liveBetsQuery`, `networksQuery`, `regionQuery`, …) and `prefetchHome()`.
- `hooks.ts` (client): `usePoolSnapshot`, `useEntriesFeed`, `useGames`, `useLiveBets`, `useRegion`, … and
  `useServerNow(serverNow, dataUpdatedAt)` — countdowns / “x s ago” derive from the snapshot's server clock, never a
  fake timer.
- `source.ts`: `NEXT_PUBLIC_DATA_SOURCE=api` switches fetchers that have an API endpoint (`/pool/rounds/current`,
  `/pool/rounds/:n/feed`, `/games`, `/compliance/region`); everything else stays on the mock (marked
  `api: not yet`). Default `mock` = `@gp/shared/demo` + homepage extras in `mock-home.ts` (all `isDemo: true`).

QA: `NEXT_PUBLIC_STATE_PREVIEW=true pnpm --filter @gp/web build && pnpm --filter @gp/web start`, then
`pnpm --filter @gp/web visual:home` → `test-results/visual/home-<state>_<1440|390>.png` (fails on horizontal overflow
or console errors).

## Admin console (admin-a) — `src/components/admin-a/*`, routes `src/app/admin/*`

Separate product shell (owner decision #3: admins never use Privy). Routes: `/admin/login` (ADM-01, no shell) and the
`app/admin/(console)/` group (session guard + shell): `/admin` overview (ADM-02), `/admin/approvals` (ADM-00 inbox,
ADM-X1), `/admin/alerts` (MOB-11), `/admin/users` (U1), `/admin/users/[id]` + `/account` `/wallets` `/kyc` `/aml`
`/transactions` `/restrictions` `/responsible-gaming` `/audit` (U2–U10), `/admin/audit` (S3), `/admin/roles` (S1),
`/admin/permissions` (S2), `/admin/no-access` (ADM-00 no-permission). Unknown `/admin/*` paths render an honest
"not in this build" state via `[...slug]`; static module routes (e.g. admin-b's `/admin/finance/*`) take precedence.

| Export (`@/components/admin-a/…`)                                    | Notes                                                                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session`: `AdminSessionProvider`, `useAdminSession()`               | `{status, admin, can(p), canAny(ps), login(), logout(), staySignedIn(), idleDeadline, expired}`; registers `setAdminTokenProvider`; access JWT in memory, rotating refresh token in sessionStorage; 15-min idle timeout with a 2-min warning (only "Stay signed in" extends it) |
| `shell`: `AdminShell`, `AdminSidebar`, `AdminTopbar`, `SessionTimeoutDialog` | sidebar 248 (≥ 1280) / drawer (< 1280) / mobile top bar + Admin Tab Bar (< 768); env badge, ⌘K, approvals + alerts counts                       |
| `nav-config`: `ADMIN_NAV`, `resolveAdminNav()`                       | the 10 groups; access = any of the group's permissions (lock state otherwise). Other modules add children additively                                   |
| `command-palette`: `CommandPalette`                                  | pages (permission-aware) + player search (`/admin/users?q=`)                                                                                             |
| `four-eyes`: `ConfirmWithReasonDialog`, `ApprovalReviewDialog`, `actionErrorMessage()` | ADM-X1: reason category + reason + fresh 2FA (+ four-eyes notice → AR reference); second-approver review / self-approval blocked / decision trail |
| `primitives`: `AdminPageHeader`, `Panel`, `KeyValue`, `KpiTile`, `RoleChip`, `KycChip`, `RiskChip`, `Meter`, `NoPermission`, `QueryErrorPanel`, `Pagination` | admin density building blocks                                                       |
| `hooks`: `useAdminQuery()` + per-endpoint hooks, `adminKeys`         | queries run only while signed in; all keys start with `'admin'`                                                                                          |

API wrappers: `src/lib/api/admin-a.ts` (all `auth: 'admin'`). QA: `BASE_URL=http://localhost:3106 API_URL=http://localhost:4106
node scripts/admin-a-qa.mjs` (env `ADMIN`, `WIDTHS`, `PAGES`) → `test-results/visual/admin-a/*.png`; e2e: `e2e/admin-a.spec.ts`.
Dev-only login states: `/admin/login?state=error|locked|blocked|expired|2fa` (dev or `NEXT_PUBLIC_STATE_PREVIEW=true`).

## Account module (USR-00/01/02, USR-A1…A10, AUTH-11…17) — `src/components/account/*`

Routes (all inside the casino shell, member-only — guests get a sign-in prompt): `/dashboard` (USR-01 overview:
Active · New user checklist · Restricted from `GET /auth/account-status`; dev preview `/dashboard?state=restricted`),
`/notifications` (USR-02), `/account` (A1), `/account/security` (A2), `/account/2fa` (A3), `/account/kyc` (A4),
`/account/kyc/verify` (AUTH-11…17 dialog over A4; full screen on mobile), `/account/documents` (A5),
`/account/login-history` (A6), `/account/devices` (A7), `/account/sessions` (A8), `/account/notifications` (A9),
`/account/anti-phishing` (A10). Data: `src/lib/api/account.ts` (`accountApi`, `accountKeys`, `use*` hooks; member
queries only run when signed in).

| Component (file)                                | Notes                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `DashboardPage` (`page-shell.tsx`)              | USR-00 frame: breadcrumb, title + chips + actions, dashboard sub-nav (underline tabs), Account & security pills (`accountTab`), mobile "Dashboard sections" bottom sheet, sign-in gate |
| `DASHBOARD_TABS`, `ACCOUNT_TABS`, `ACCOUNT_ROUTES`, `HISTORY_ROUTES` (`nav.ts`) | in-page navigation config                                                         |
| `Demo`, `IconTile`, `ToneChip`, `CheckLine`, `SettingRow`, `KeyValue`, `Meter`, `ScoreRing`, `NoteBox`, `QueryState`, `CardSkeleton` (`primitives.tsx`) | account building blocks (tone = success·warning·danger·info·pending·brand·neutral·gold) |
| `ConfirmSurface` (`confirm.tsx`)                | confirmation as a modal ≥ 768 and a bottom sheet on mobile (MOB-09)                                            |
| `dashboard/*`                                   | `BalancesSection` (+ mobile compact breakdown), `ActivePoolSection`, `VipStrip`, `SetupChecklist`, `WelcomeOfferCard` (info only), `GamesPreview`, `NotificationsPreview`, `RecentActivity`, `RgModule` |
| `kyc-flow/*`                                    | `KycFlowDialog` (stepper, context panel, DEMO decision controls on the pending screen), `DetailsStep` (RHF + `kycDetailsSchema`), `DocumentStep` (SHA-256 in the browser, metadata only), `LivenessStep` (camera or DEMO capture), `KycArt` |

Step-up 2FA uses the auth module's `useStepUp().requestStepUp({ purpose: 'security_settings' })` (A3 disable /
reset / backup codes, A10). Enabling 2FA links to the auth module's `/2fa/setup?next=/account/2fa`.

## Responsible gaming + history (rg-history) — `src/components/rg-history/*`

Routes: `/responsible-gaming` (USR-RG1 hub) · `/deposit-limits` (RG2) · `/participation-limits` (RG3) · `/time-limits`
(RG4) · `/reality-checks` (RG5) · `/cooling-off` (RG6) · `/self-exclusion` (RG7, 4 steps); `/history/transactions`
(F6, filters + CSV export) · `/deposits` · `/withdrawals` · `/fees` · `/rewards` · `/refunds` (F1–F5);
`/history/games` (G1) · `/entries` · `/active` · `/results` · `/winnings` · `/rounds` · `/favourites` (G2–G7).
API wrappers + TanStack hooks: `src/lib/api/rg-history.ts` (`rgApi`, `historyApi`, `useRgState`, `useHistoryTransactions`, …).

| File                    | Exports                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `reality-check.tsx`     | `RealityCheckHost` (mounted in `app/(app)/layout.tsx`: play heartbeat + reminder when due), `RealityCheckCard`, RG5 page |
| `limit-setter.tsx`      | `LimitSetter` (RG/Limit Setter: period, input, usage meter, pending increase / removal, cancel)                            |
| `session-bar.tsx`       | `SessionBar` (RG/Session Bar), `useElapsed(startedAt)` — real clock from an absolute time                                  |
| `help-resources.tsx`    | `HelpResources` (RG/Help Resources — real help organisations, self-check, support)                                         |
| `self-check.tsx`        | `SelfCheckDialog` (9 PGSI questions, answers never leave the dialog)                                                       |
| `page-shell.tsx`        | `PageShell` (breadcrumb, title, desktop tabs / mobile pills), `MemberOnly`, `PageSkeleton`, `QueryError`                   |
| `history-common.tsx`    | `FinancePage`, `GamingPage`, `Kpi`, `TxTable` (≥1024), `TxCards` (<1024), `txStatus/txTitle/txAmount`, `Pager`            |
| `export-dialog.tsx`     | `ExportDialog` (period, types, separator, hashes → `GET /history/transactions/export`; dialog ≥768, bottom sheet <768)     |
| `ui.tsx`                | `IconTile`, `Meter`, `Chip`, `KV`, `Bullet`, `NoteBox`, `Columns`, `CardHead`, `SectionHead`                                |

The reality-check host only runs with `NEXT_PUBLIC_DATA_SOURCE=api`; play time counts on `/pool`, `/games`, `/casino`,
`/originals` with real input in the last 90 s (idle tabs and browsing do not count). QA: `node scripts/rg-history-qa.mjs`;
e2e: `pnpm --filter @gp/web test:e2e -- e2e/rg-history.spec.ts`.

## Global Pool (pool) — `src/components/pool/*`

Routes: `/pool` (GP-01 hub · MOB-04 mobile with sticky participate bar · PUB-02 signed-out variant) ·
`/pool/rounds/[number]` (status-driven: GP-05 drawing / VRF delayed, GP-06 your result, GP-07 public results, GP-09
round detail, cancelled → refunds, GP-13) · `/pool/rounds/[number]/verify` (GP-12) · `/pool/history` (GP-08) ·
`/pool/entries` (GP-10) · `/pool/prizes` (GP-11) · `/provably-fair` (PUB-07). API wrappers: `src/lib/api/pool.ts`
(mock fallback = shifted `@gp/shared/demo`; buying entries always needs the API).

| File                     | Exports                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `use-pool.ts`            | `poolKeys`, `useCurrentRound`, `useRound`, `useRounds`, `useRoundFeed`, `useVerification`, `useMyRoundEntries`, `useEntryHistory`, `useViewerBalances`, `useViewerRg`, `useNow` (real clock), `useLivePool` (socket.io `/pool`: patches round + feed caches) |
| `logic.ts`               | `checkParticipation` (balance + RG participation/loss limits → insufficient / limit reached / max entries), `oddsAfter`, `roundPhase` (incl. `not_open_yet`, `delayed`), `relativeTime`, `verifyDraw` (re-derives winners + prizes in the browser with `@gp/contracts/verify`) |
| `parts.tsx`              | `PoolPageHeader`, `PoolTabs`, `CardHeading`, `Meter`, `KV`, `RiskLine`, `LicenceCard`, `RoundStatusBadge`, `Steps`, `PrizeDistributionCard`, `ThresholdCard`, `VrfExplainerCard`, `QueryError`, `Callout`, `POOL_ROUTES` |
| `participate-flow.tsx`   | `ParticipateFlow` — GP-02 preview (RHF + zod `enterRoundSchema`, unchecked consent, fee lines, odds, RG check, licence) → GP-03 pending → GP-04 receipt, GP-13 "round closed" outcome; dialog ≥ 768 / bottom sheet < 768; one idempotency key per intent |
| `pool-hub.tsx`           | `PoolHub`, `RoundCard`                                                                                                          |
| `round-page.tsx` · `verify-page.tsx` · `history-page.tsx` · `entries-page.tsx` · `prizes-page.tsx` · `provably-fair-page.tsx` | one page component each |
| `preview.ts`             | dev `?state=` flags for `/pool`: `guest`, `restricted`, `no-round`, `wrong-network`, `participate`                              |

Countdowns run on the real clock against the round's real `closesAt` (the mock is shifted by whole days to the next
20:00 UTC — `src/lib/data/demo-clock.ts`; the homepage uses the same clock. The API seed shifts onto the latest window
that has already opened: between rounds #1,248 is `closed` and #1,249 `scheduled` for 08:00 — docs/API.md → DEMO seed). e2e:
`E2E_BASE_URL=http://localhost:3105 E2E_API_URL=http://localhost:4105 pnpm --filter @gp/web test:e2e -- e2e/pool.spec.ts`
(needs a round that is open right now).

## Wallet (wallet) — `src/components/wallet/*`

Routes: `/wallet` (WAL-01 overview · MOB-05 mobile tiles) · `/wallet/deposit` (WAL-03…09, `?step=` + `?ref=DP-…`) ·
`/wallet/withdraw` (WAL-10…19, `?step=` + `?ref=WD-…`; unsent draft in `sessionStorage gp.withdrawDraft`) ·
`/wallet/withdraw/[reference]` (WAL-22 tracker) · `/wallet/history` (WAL-20, filters in the URL, `?tx=` opens the WAL-21
drawer) · `/wallet/connected` (WAL-02) · `/wallet/whitelist` (WAL-23). Below 768 px the deposit / withdraw flows open as a
bottom sheet over the wallet page (MOB-06 / MOB-07). API wrappers + TanStack hooks: `src/lib/api/wallet.ts`.

| File                       | Exports                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `wallet-ui.tsx`            | `WALLET_ROUTES`, `WalletTabs`, `WalletPageHeader`, `TxStatusBadge`, `TxIcon`, `KeyValueList`, `QueryError`, `MemberGate`, `SectionTitle`, `ConfirmationRing`, `ConfirmationBar` |
| `balance-breakdown.tsx`    | `BalanceBreakdown` (total + share bar + 4 buckets, `compact`), `BalanceGlossary`, `composition()`                               |
| `flow-shell.tsx`           | `FlowShell` (page ≥ 768 / bottom sheet < 768), `FlowStepper`, `FlowFooter`, `NextButton`, `FlowHeading`, `OptionRow` (radio row) |
| `deposit-flow.tsx`         | `DepositFlow` — network → token → address (+ session re-check, wrong-network via EIP-1193 `eth_chainId`) → QR (`qr-code.tsx`, client-side `qrcode`) → pending n / 20 (polled) → confirmation → receipt; DEMO controls "Simulate testnet deposit" + "Add 5 confirmations" |
| `withdraw-flow.tsx`        | `WithdrawFlow` — asset → network → address (whitelist / new, format checks) → amount (quote every 15 s) → fees + unchecked confirmation → risk check (`GET /withdrawals/precheck`) → 2FA (authenticator `totpCode`, anti-phishing code) → pending / done |
| `withdrawal-status.tsx`    | `WithdrawalOutcome` (WAL-17/18/19), `WithdrawalTracker` (WAL-22), `phaseOf`, `withdrawalTimeline`                               |
| `history.tsx` · `tx-list.tsx` · `tx-detail.tsx` | `WalletHistory` (table ≥ 1280, cards below, CSV export of the page), `TxList`, `TxDetailDrawer` (right drawer / bottom sheet), `TxHash` |
| `addresses.tsx`            | `WhitelistPage`, `AddAddressModal` (24 h cool-down, unchecked ownership box, 2FA), `ConnectedWalletsPage`                       |
| `banners.tsx`              | WAL-24 `WalletStatusBanners`, `InsufficientFundsModal`, `DepositLimitModal`, `MaintenanceModal`                                  |
| `two-factor.tsx` · `timeline.tsx` · `responsive-modal.tsx` | `TwoFactorField`, `AntiPhishingCode`, `stepUpError`; `StatusTimeline`; `ResponsiveModal` (dialog / drawer ≥ 768, bottom sheet < 768) |

Dev-only previews (`next dev` or `NEXT_PUBLIC_STATE_PREVIEW=true`): `/wallet/deposit?step=address&preview=wrong-network|expired`,
`?step=pending&ref=…&preview=delayed`. e2e: `E2E_BASE_URL=http://localhost:3104 E2E_API_URL=http://localhost:4104
pnpm --filter @gp/web test:e2e -- e2e/wallet.spec.ts`. `Button asChild` now renders `leadingIcon` / `trailingIcon` inside the
child (Radix `Slottable`); without icons it is unchanged.

## Games kit (P1) — `src/components/games/kit/*` (import from `@/components/games/kit`)

**NON-MONETARY SIMULATION.** Every game uses **DEMO credits only** (label `CREDITS_LABEL` = "DEMO credits · no cash value",
unit `DEMO`), never USDT; bet panels always show **"Fees 0.00"** and **"You can lose your stake"**. Outcomes come only from
the server (commit–reveal seeds); the browser verifier re-derives them with `verifyBet()` from `@gp/shared/fair`.
API wrappers + hooks: **`src/lib/api/games.ts`** (`gamesApi`, `gameKeys`, `useGameCatalogue`, `useCatalogueGame`,
`useDemoCredits`, `useSeeds`, `useGameBets`, `useBetVerification`, `usePlaceBet`, `useResetCredits`, `useRotateSeed`,
`applySettledBet(qc, slug, bet)` for stateful games, `classifyGameError(err)` → `{ kind, message, details }`).

Routes: `/games` lobby (PUB-03 + GM-02 catalogue, `?category=`), `/games/<slug>` = the game's **static play route**
(pool-dice, double-side, pool-roulette, orbit-rush, twenty-one) — any other slug falls through to the details page
(PUB-04) via `app/(app)/games/[slug]`; **`/games/<slug>/details`** is the details page for every game (link "Rules &
payouts" there). When your play page lands, keep its slug in `PLAY_SCREENS` (`registry.ts`).

| Export | What it does |
| --- | --- |
| `GameLayout` | Whole game screen: `ShellOverride collapseSidebar` (72 px rail ≥ 1024, burger expands for the visit), `GameHeader` (breadcrumb, title, mechanic / Provably fair / House edge chips, favourite, Provably fair, Rules & payouts), `DemoCreditsChip`, `[panel 340 \| stage]` card, **GM-01** `GameSessionBar`, `below` / `aside` columns, `children` (history, seeds, rail), licence line, `mobileBar`. Props: `slug, title, mechanic, icon, gate, busy, notice, panel, stage, mobileBar, below, aside, onFairness`. Blocking states render `GameNotice` over the dimmed, `inert` stage. |
| `useGameGate()` | `{ gate: loading·guest·onboarding·region·self_excluded·blocked·time_limit·loss_limit·offline·ok, credits, lossLimit (DEMO, daily used from /games/credits), regionName, exclusionEndsAt, online, refetch }` — mirrors the server's GAMING_POLICY (server re-checks every bet). |
| `useBetRunner(send, { maxAttempts, onSettled, onError })` | One idempotency key per intent; network/5xx failures **retry with the same key** (DI-07 "Connection lost — bet held on the server"; `phase` placing·reconnecting·settled·failed, `attempt`, `retryNow`); holds the reality check while in flight; a `409 REALITY_CHECK_DUE` refusal asks the RG host to show the reminder. |
| `BetPanel` (Manual/Auto radiogroup) · `BetAmountField` (½ · 2× · Min · Max; Max ≤ balance and table max) · `BeforeYouBet` (house edge, rows, **Fees 0.00 DEMO**, `StakeRiskNote`) · `AutoPlayPanel` + `useAutoPlay(placeOne)` | Auto-play: required stop-loss, **unticked** confirmation, constant stake (never raised after a loss), stops on stop-loss / profit / count / error / reality check / tab hidden (`autoplay.ts` pure rules, unit-tested). |
| `amount.ts` | `sanitizeStakeInput`, `parseStake`, `applyPreset`, `stakeCeiling`, `stakeProblem` + `stakeProblemMessage`, `payoutPreview`, `profitPreview` (decimal.js via @gp/shared/money). |
| `DemoCreditsChip` | Balance + "DEMO credits · no cash value" + Reset dialog (once per hour, audited server-side; disabled while `busy`). |
| `GameSessionBar` | GM-01: session time (real clock), net this session + loss-limit meter in DEMO credits, normal / approaching (≥ 80 %) / reached, 18+, Responsible gaming, Take a break, Session details popover (desktop) / bottom sheet (mobile). |
| `SeedDisplay` · `SeedsDialog` · `SeedLine` · `CopyValue` · `shortHash` | Commitment (server seed hash), client seed, next nonce; change client seed / rotate (reveals the server seed); revealed pairs. |
| `VerifyDrawer` (`betId, open, onOpenChange, describeOutcome, formula, noun`) · `verifyInBrowser()` | DI-06: commitment → revealed seed → inputs → result recomputed **in the browser** with `@gp/shared/fair` (editable seeds show the mismatch state; "Rotate seeds & reveal" while the seed is secret). Right drawer ≥ 768, bottom sheet below. |
| `BetHistory` (`slug, columns, summary, onVerify, noun`) · `RecentResults` | DI-05: KPIs (bets / wagered / returned / net), All·Wins·Losses, table ≥ 1024 / cards below, pagination, Verify per row; pill strip of the last 10 results. Give the section `id="my-bets"` via a wrapper `div`. |
| `ResultBanner` · `HowItWorksCard` · `MoreGamesRail` | Win/lose banner (icon + label, ref, nonce, Verify) from the settled bet only; published rules/edge/limits; tile rail. |
| `GameNotice` · `PromptCard` · `PanelNotice` · `GameSkeleton` · `insufficientCopy` | guest, onboarding, region (no bypass hints; withdraw stays primary), self-excluded, blocked, time limit, loss limit, offline, reconnecting; insufficient DEMO credits / bet limits in the panel. |
| `MobileBetBar` | < 768 sticky bar above the tab bar: summary + "You can lose your stake" + CTA (render the panel CTA with `hidden tablet:flex`). |
| `registry.ts` | `PLAY_SCREENS`, `GAMES_ROUTES`, `playStateOf(slug)`, `GAME_MOTION` (wheel-spin 4500, coin-flip 1600, card-deal 350, crash-frame 100 from `@gp/tokens`), `GAME_COPY`. |

Reality checks: `holdRealityCheck()` / `requestRealityCheck()` were added (additively) to
`components/rg-history/reality-check.tsx` — hold the reminder while a round is in progress (stateful games: hold from deal
to settle) so it only appears between bets. Reduced motion: the kit's `useReducedMotion()` → show the result instantly
(no roll / spin / flip animation).

### Lobby, details and Pool Dice (key "kit") — `src/components/games/lobby/*`, `src/components/games/dice/*`

| Route | Component | Notes |
| --- | --- | --- |
| `/games` | `GamesLobby` (`lobby/games-lobby.tsx`) | PUB-03 + GM-02: banner (angled block + fanned tile art), category tabs (All · Jackpot · Originals · Table · Slots · Live · Draws & bingo, counts from the catalogue), search (debounced into `?q=`), chips Provably fair · House edge ≤ 1% · Playable now · Favourites (members), sort, Global Pool spotlight (live round from the pool module, gold CTA), DEMO-credits card, sections (≥ 768 grid `minmax(168px,1fr)`; < 768 originals 2-col + "Show all", other sections swipe rails), filters bottom sheet < 768, empty state with matches in other categories, region-restricted tiles (no bypass hints). URL state: `?category=&q=&fair=1&edge=1&playable=1&fav=1&sort=az|edge`. |
| `/games/<slug>/details` · `/games/<slug>` (no play screen) | `GameDetails` (`lobby/game-details.tsx`) | PUB-04: hero (copy + angled art), at a glance, how to play, **payouts computed with `@gp/shared/fair`** (`game-content.ts`), rules (published `FAIR_GAMES` lines), PF explainer, play / limits rail (Fees 0.00 DEMO), RG card, related rail. "Play (DEMO credits)" only when the game has a play screen; otherwise "Play screen coming soon" / "Coming soon" (disabled). Global Pool links to `/pool` (USDT, 0.05 fee line). |
| `/games/pool-dice` | `DiceGame` (`dice/dice-game.tsx`) | DI-01…07 on the kit: `DiceStage` (readout, `DiceSlider` role="slider" ←→/↑↓ ±1.00, Shift ±0.01, PageUp/Down ±10, Home/End; roll marker eases to the REAL result in 800 ms, instant under reduced motion), linked Target ↔ Win chance ↔ Multiplier inputs (`dice-math.ts`, integer hundredths + the server's `dice.diceMultiplier`), Roll over/under radios, Space to roll, Manual/Auto, result banner, recent results, My rolls, seeds, verify drawer, states (loading, out of range, above max with "Set to 1,000.00", insufficient DEMO credits with "Bet X instead" / reset, reconnecting, loss limit, time limit, self-excluded, region, guest). |

`GameTile` (domain) gained additive props: `art` + `gradient` for titles without a GameArt key (`lobby/tile-art.tsx` draws
reels / balls / bingo card / cards / tower / duel curves) and `comingSoon` (tag "Soon", hover "Coming soon · Details", "Coming
soon" in the accessible name). `ShellOverride` gained `collapseSidebar` (used by `GameLayout`).

QA: `BASE_URL=http://localhost:3112 API_URL=http://localhost:4212 node scripts/games-kit-qa.mjs [screen-prefix…]` (fresh DEV
MOCK players per run; fails on horizontal overflow / console errors) → `test-results/visual/games/kit/*.png`; e2e:
`E2E_BASE_URL=http://localhost:3112 E2E_API_URL=http://localhost:4212 pnpm --filter @gp/web test:e2e -- e2e/games-kit.spec.ts`
(lobby → dice → roll → balance = 1,000.00 ± net, USDT wallet unchanged → verify drawer (rotate & reveal, browser
re-derivation, mismatch state) → dropped response replayed with the same idempotency key → auto-play (constant stake) →
details; plus `403 REAL_MONEY_DISABLED` for a non-DEMO currency). Unit tests: `test/games-kit.test.ts`.

### Pool Roulette (key "roulette") — `src/components/games/roulette/*`

European single zero on the kit (decision #35), DEMO credits only (no cash value), Fees 0.00. What a bet covers and pays
always comes from `roulette.coveredNumbers` / `ROULETTE_PAYOUTS` in `@gp/shared/fair` (the server's rule module).

| Route | Component | Notes |
| --- | --- | --- |
| `/games/pool-roulette` | `RouletteGame` (`roulette-game.tsx`) | RL-01…05 + RL-09. Own layout built from kit parts (`GameHeader` + `chips`, `GameSessionBar` above the table, `GameNotice` over the dimmed table, `DemoCreditsChip`, `BeforeYouBet`, `SeedDisplay`, `BetHistory`, `VerifyDrawer`, `useBetRunner`, `useGameGate`): [stage \| 340 px slip] ≥ 1280, stacked below. `RouletteWheel` (SVG, wheel order, 4 500 ms `wheel-spin` token with `--ease-wheel`, ball drops at 71 %, lands exactly on the server's pocket; reduced motion = instant). `RouletteFelt` (≥ 768): 0 · 1–36 · 2:1 · dozens · even-money; pointer targets on lines / edges / crossings (`feltZones()` = 60 splits, 14 streets incl. trios, 23 corners incl. first four, 11 lines); keyboard: roving arrows, Enter = straight, B = bet-type chooser, Delete = take a chip off, Space = spin, Backspace / Ctrl+Z = undo; right-click removes. `RouletteFeltVertical` + `OutsidePanel` (< 768, "Numbers \| Outside bets"), `BetTypeSheet` (bottom sheet on mobile, dialog on desktop), sticky chip tray + Undo / Clear / Repeat + Spin above the tab bar, slip in a bottom sheet. `BetSlip` (Empty · Filled · Over limit · Locked), outcome preview ("If the ball lands on…", expected return), locked card while spinning, per-bet settlement + result banner (win / even / lose) from the server's outcome. Limits are flagged, never auto-changed ("Set Straight · 19 to 1,000.00"). Everything shown while a spin is in flight comes from a snapshot taken when Spin is pressed (`LockedSpin`: pre-spin balance minus the stake, loss-limit meter, gate, slip pre-checks, nonce + commitment) — `/games/credits` keeps polling and the RG heartbeat refetches it after a bet, so live values would already carry the settled spin (a spin that reaches the loss limit would flip the gate early); the e2e asserts the snapshot survives a mid-spin refetch; the reality check is held until the wheel stops. "Repeat" only loads the last bets onto the felt — the player still presses Spin. |
| `/games/pool-roulette/my-bets` | `RouletteHistoryPage` (`roulette-pages.tsx`) | RL-06: period (Today / 7 / 30 days / All, UTC) + result filters sent to `GET /games/pool-roulette/bets?from&result` (KPIs follow the filters), table ≥ 1024 / cards below, row details (per-bet settlement, seeds, Verify, "Repeat these bets" → `/games/pool-roulette?repeat=1`), your last 50 pockets with the independence note, session & limits card. |
| `/games/pool-roulette/rules` | `RouletteRulesPage` | RL-07: "Where each bet goes" (static felt with example chips), inside / outside pay tables computed from the shared rules, how a spin works, limits (largest single win = 1,000.00 × 35), RG card. |
| `/games/pool-roulette/fairness` | `RouletteFairnessPage` | RL-08: choose a spin (`?bet=<id>`), rotate & reveal, editable seeds, five steps recomputed in the browser with `verifyInBrowser()` (HMAC block 0 → f → × 37 → pocket → per-bet sum), "check it yourself" pseudo-code. |

Kit fix (shared, layout only): `GameSessionBar` (desktop) renders the "New bets are paused" line as a full-width row under the stats — as a sibling flex item it squeezed the stats into a column at ≥ 1280 in the Limit reached state.

Kit fix (shared, behaviour-preserving): `verifyInBrowser` compared outcome values with `JSON.stringify`, which is key-order
sensitive — a roulette outcome (nested `bets[]`) read back from JSONB therefore showed a false "doesn't match"; it now
compares key-sorted JSON (`test/games-roulette.test.ts` covers it).

QA: `BASE_URL=http://localhost:3114 API_URL=http://localhost:4214 node scripts/games-roulette-qa.mjs [RL-0x…]` →
`test-results/visual/games/roulette/*.png` (+ `_vp` viewport shots on mobile); e2e:
`E2E_BASE_URL=http://localhost:3114 E2E_API_URL=http://localhost:4214 pnpm --filter @gp/web exec playwright test e2e/games-roulette.spec.ts`.
Unit tests: `test/games-roulette.test.ts`.

### Double Side (key "dice-coinflip") — `src/components/games/coinflip/*`

DEMO credits only ("DEMO credits · no cash value"); the side always comes from the server's commit–reveal seeds and the
browser re-derives it with `verifyBet()` (`@gp/shared/fair`). Fees 0.00 on every bet panel.

| Route | Component | Notes |
| --- | --- | --- |
| `/games/double-side` | `CoinflipGame` (`coinflip-game.tsx`) | CF-01…03 + CF-06 on `GameLayout arrangement="stacked" sessionBarPosition="above" panelCredits={false} headerChips` (CF frames: one card, Heads card \| coin \| Tails card ≥ 1024, coin + compact picks below; full-width bet bar with Manual/Auto + DEMO credits chip, Bet amount, "This flip" tiles, Fees 0.00 line, `StakeRiskNote`, CTA "Flip for Heads · 10.00 DEMO"). `CoinflipStage` (`coinflip-stage.tsx`, `role="radiogroup"` "Your pick", ←→ / H / T, Space flips), `FlipCoin` (`coin.tsx`: CSS 3D + Web Animations, `coin-flip` 1 600 ms token, ≥ 6 half-turns to the SERVER's side via `landingAngle()` — spin length never depends on win/lose; instant under reduced motion; reality check held until the coin lands), `CoinFace` (Heads mint + logo medallion, Tails silver + pool glyph, never gold), `SideDisc` (H/T). States: loading skeleton, guest, insufficient DEMO credits ("Bet X instead" / reset), above max ("Set to 1,000.00"), connection lost (CF-06 inline banner above the picks — same idempotency key, Retry now, the stage stays visible), DEMO credits failed to load (server error: "Couldn’t load your DEMO credits" + Try again, flipping paused), loss / time limit, self-excluded, region, offline (kit `GameNotice`). **No early reveal:** bets go through `gamesApi.placeBet` and `applySettledBet` runs only when the coin lands (or on unmount), so the balance chip, session bar, recent strip and nonce never show the outcome before the animation does; while a flip is in flight they show the pre-flip balance minus the locked stake. Recent results (last 12 landed sides, counts, `#my-bets`) + "How Double Side works" + `SeedDisplay` + `MoreGamesRail`. |
| `/games/double-side/my-flips` | `MyFlipsPage` (`my-flips.tsx`) | CF-04: period (Today · 7 days · 30 days · All, UTC) + Picked Heads/Tails + Wins/Losses + search (flip ID or nonce) → `GET /games/double-side/bets?from&pick&result&search` (KPIs follow the filters: flips, wagered, net, landed Heads/Tails), table ≥ 1024 with expandable detail row (hash, client seed, nonce, `0.2288 → below 0.5000 → Heads`, Verify this flip, Copy details) / cards below, rows per page + pagination, Export CSV (`/history/game-rounds/export?game=double-side`). |
| `/games/double-side/fairness` | `CoinflipFairnessPage` (`fairness.tsx`) | CF-05: load a flip (`?bet=<id>` or flip ID / nonce), secret seed → "Rotate seeds & reveal", editable server seed / client seed / nonce re-derived with `verifyInBrowser()` (verified / failed — e.g. a 63-char seed), "Verify with your own tools" with the flip's real HMAC values, "Your seeds" (previous pair revealed, new commitment, client seed, rotate), "How a flip is decided" (commit → combine → scale `u32 ÷ 2³²` → map → pay). |

Shared: `CoinflipSubpage` + `CoinflipTabs` (`coinflip-pages.tsx`: breadcrumb, session bar, Play · My flips · Fairness · Rules
& payouts — "All flips" is left out, there is no all-player feed), `coinflip-math.ts` (pure helpers, unit-tested),
`routes.ts` (`COINFLIP_ROUTES`). Kit additions (additive): `GameLayout` props `arrangement`, `sessionBarPosition`,
`panelCredits`, `headerChips`; `GameHeader` `chips` (second row); `BetHistory` `actions` (Pool Dice now has DI-05 "Export
CSV"); `useGameBets(slug, page, pageSize, filters?)` / `gamesApi.bets(…, filters?)` + `GameBetsFilters`.

QA: `BASE_URL=http://localhost:3113 API_URL=http://localhost:4213 [WIDTHS=1440,390] node scripts/games-coinflip-qa.mjs [CF-0x…]` (includes `CF-01_loading`, `CF-02_flipping-motion` — a real flip captured mid-turn with motion on — and `CF-06_credits-error`) →
`test-results/visual/games/dice-coinflip/*.png` (fresh DEV MOCK players; fails on overflow / console errors); e2e:
`E2E_BASE_URL=http://localhost:3113 E2E_API_URL=http://localhost:4213 pnpm --filter @gp/web exec playwright test e2e/games-dice-coinflip.spec.ts`.
Unit tests: `test/games-coinflip.test.tsx`.

### Orbit Rush (key "crash") — `src/components/games/crash/*`

Live crash rounds (decision #42) over socket.io **`/crash`**, DEMO credits only ("DEMO credits · no cash value"), Fees
0.00, house edge 1.00 % at every target. Everything live comes from the server: phases, 100 ms multiplier frames
(`crash-frame` token), crash points and the bets other players really placed — nothing is simulated or fabricated
client-side, and every countdown is the server's `startedAt` / `nextRoundAt` corrected by the measured clock offset.
API wrappers + hooks: **`src/lib/api/orbit-rush.ts`** (`orbitRushApi`, `orbitRushKeys`, `useCrashRounds`,
`useCrashStats`, `useCrashVerification`, `useCrashMyBets`; player keys live under `['games-kit', …]` so sign-out clears them).

| Route | Component | Notes |
| --- | --- | --- |
| `/games/orbit-rush` | `CrashGame` (`crash-game.tsx`) | CR-01…04, CR-06, CR-08. [bet panel 320 \| stage \| live bets 340] ≥ 1280, [panel \| stage] + live bets below at 1024, stacked below. Kit parts: `GameHeader` (+ Max / Bet chips), `DemoCreditsChip`, `BetPanel` Manual/Auto, `BetAmountField`, `GameSessionBar`, `GameNotice` (guest is not blocked — watching is public), `StakeRiskNote`, `LicenceLine`, `useBetRunner` (one idempotency key per bet, retried with the same key), `useAutoPlay`, `useGameGate`. `ReadoutCard` + `CrashCurve` (SVG in real pixels; samples `crash.multiplierAt` on server frames up to the last frame received, auto cash-out line, my cash-out marker + callout, red once crashed) + `RoundFooter` (seed hash, Verify). Bet panel summary per state (If the round reaches T · Your bet · Your position at m with "Chance to reach T" = m ÷ T · Cashed out · Result), CTA Place bet / Bet placed / Cash out · value / Cash out unavailable offline / Bet next round (queued, cancellable) / Not enough DEMO credits; Space = primary action. `ResultCard` from MY settled bet only. A round in progress is never interrupted: with my bet in the air no gate notice covers the stage, and the reality check is held until the bet settles. Mobile: recent strip, compact readout + curve, 3 summary tiles, sticky bet bar above the tab bar. |
| (dialog) | `AutoPlayDialog` (`autoplay-dialog.tsx`) | CR-06: fixed bet (never raised after a loss), REQUIRED auto cash-out target + stop-loss, optional profit stop, ≤ 100 rounds, UNTICKED "I understand I can lose my stake in every auto round" every time it opens; dialog ≥ 768, bottom sheet below. Auto-play places one ordinary bet per betting window and stops on stop-loss / profit / count / refusal / reality check / tab hidden / lost connection. |
| `/games/orbit-rush/rounds` | `RoundHistoryPage` (`crash-pages.tsx`) | CR-05: Last 50 · Today · 7 days + round search, table ≥ 1024 / cards below (players, wagered, paid out in DEMO credits, ended, Verify), rows per page; `#statistics` Game statistics (24h/7d/30d KPIs vs expected, distribution bars with the published 0.99 ÷ m marker, independence note) + "Your session · Orbit Rush" (my bets since the RG session start). |
| `/games/orbit-rush/my-bets` | `MyCrashBetsPage` | My crash bets + summary (All · Cashed out · Lost), Verify per round. |
| `/games/orbit-rush/fairness?round=N` | `CrashFairnessPage` | CR-07: recomputes the round in the browser with `verifyRoundInBrowser()` (`crash-math.ts` → `crash.crashCommitment`, `crash.verifyChainSeed`, `crash.crashPointOf` from `@gp/shared/fair`): commitment, hash-chain position, crash point vs recorded; editable seed shows the mismatch; "seed still secret" for a live round; verify another round; report. |

`live-client.ts` = `CrashLiveClient` (external store: snapshot / phase / tick / bet / cashout / crashed, my bet merged
from events, ack errors → `ApiRequestError`, lost acks → `ApiNetworkError` so callers retry with the same key, REST
fallback for bets while the socket is down, `waitFor()` for auto-play, reconnect attempts 1…5 then offline + Retry now);
`use-crash-live.ts` = `useCrashLive()` (one connection per screen, re-auth on sign-in/out) + `useServerNow()`.
`crash-math.ts` = pure helpers (win chance 99 ÷ T, conditional chance, payout/profit with decimal.js, targets, ticks,
curve samples, median, pill tones, browser verification).

QA: `BASE_URL=http://localhost:3115 API_URL=http://localhost:4215 node scripts/games-crash-qa.mjs [CR-0x…]` against an
API with `CRASH_LOOP_ENABLED=true` (real rounds; fresh DEV MOCK players) → `test-results/visual/games/crash/*.png`;
e2e: `E2E_BASE_URL=http://localhost:3115 E2E_API_URL=http://localhost:4215 pnpm --filter @gp/web exec playwright test e2e/games-crash.spec.ts`.
Unit tests: `test/games-crash.test.ts`.

### Twenty-One (key "blackjack") — `src/components/games/blackjack/*`

Blackjack against the dealer on the kit, DEMO credits only ("DEMO credits · no cash value"), Fees 0.00, house edge ≈ 0.50 %
with basic strategy. The hand lives on the server (`POST /games/twenty-one/hands`, `…/hands/:id/action`,
`GET …/hands/current`): every deal and every decision is ONE request with ONE idempotency key (kit `useBetRunner`,
retried with the same key after a dropped connection), only the server's `allowedActions` are enabled, the dealer's
hole card stays `null` until the server settles the hand, and every result shown is the server's. Totals, the shoe and
the verifier use `blackjack` / `verifyBet()` from `@gp/shared/fair` (no duplicated maths). API wrappers + hooks:
**`src/lib/api/twenty-one.ts`** (`twentyOneApi`, `twentyOneKeys`, `useBjCurrent`, `useBjHands` — history keys live
under `gameKeys.bets('twenty-one')` so `applySettledBet` refreshes them).

| Route | Component | Notes |
| --- | --- | --- |
| `/games/twenty-one` | `TwentyOneGame` (`bj-game.tsx`) | BJ-01 … BJ-05, BJ-09. `BjHeader` (art, breadcrumb, chips, Play · My hands · Rules · Fairness tabs, favourite) · [340 px panel \| felt] ≥ 1024. Panel: `DemoCreditsChip`, kit `BetAmountField`, `ChipTray` (1 · 5 · 10 · 25 · 100, roving arrows) + "tap the bet spot to add", Undo / Clear / Rebet, Deal · Hit / Stand / Double · +x / Split · +x ("Split again" disabled after a split) · Rebet & deal / Change bet / Verify hand, "If you win this hand" (decimal.js `payoutTable`), Fees 0.00, `StakeRiskNote`, keyboard Space · H · S · D · P. `BjTable` (`bj-table.tsx`): table-limits placard, shoe, dealer zone, "Blackjack pays 3 to 2" print, hands with totals (gold only for a paid 3:2), bet pills, status line, overlay. Cards (`cards.tsx`, `PlayingCard` / `CardBack` / `MiniCard`) land one per beat in shoe order (`revealPlan` — card-deal 350 ms + fast 150 ms; hole card turns over before the dealer draws); reduced motion = instant. Balance, session bar and history only move when the last card is down (frozen credits snapshot while a request / reveal is in flight). Overlays: insurance card (≥ 768) / bottom sheet (< 768) with stake, 2:1 return and the ≈ 7.4 % insurance edge; result card (`ResultCard`, real settled hand, ref + time + Verify); connection lost ("your hand is safe", attempt n of 5, Retry now); gate notices (guest, onboarding, region, self-excluded, blocked, limits, offline) only when NO hand is open — an open hand can always be finished (self-exclusion pauses Double / Split / Insurance only). Recovery: an open hand from `GET …/hands/current` is restored with a "Reconnected — hand BJ-x restored" banner; a hand finished in another tab is loaded as settled. Reality checks are held from deal to the last card. Mobile: sticky bar above the tab bar (Deal / 2 × 2 actions / Rebet & deal), result card under the felt, `GameSessionBar`, bet card. Lower row: `RecentHands`, `TableRulesCard`, kit `SeedDisplay`. |
| `/games/twenty-one/my-hands` | `MyHandsPage` (`bj-pages.tsx`) | BJ-06: KPIs (hands, wagered incl. doubles/splits/insurance, net, W · L · P by net), result chips → server `outcome` filter (All · Wins · Losses · Pushes · Blackjacks · Busts · Splits & doubles), period (Today / 7 / 30 days / All, UTC), search (hand ID or nonce), table ≥ 1024 (hand, bet, your hand, dealer, decisions, result, net, Verify) / cards below, expandable "What happened" (`handTimeline`) + seed pair + Verify / Copy hand data, pagination, Export CSV. |
| `/games/twenty-one/rules` | `BjRulesPage` | BJ-07: how to play, table rules, payouts (computed for a 10.00 bet), basic strategy hard-totals chart (6 decks, S17, DAS), "Play within your limits". Public. |
| `/games/twenty-one/fairness` | `BjFairnessPage` (`bj-fairness.tsx`) | BJ-08: load a hand (`?bet=<id>` or hand ID / nonce), rotate & reveal while secret, editable seeds re-derived with kit `verifyInBrowser()` (commitment, computed vs recorded result; edited seed = failed), shoe order (first dealt cards + 2 not dealt, labelled You / Dealer up / Dealer hole / hits / dealer draws via `shoeSlots`), how the shoe is built, download hand data (JSON). |

API addition (additive, engine module): `GET /games/:slug/bets` accepts `outcome=win|lose|push|blackjack|bust|split_double`
and its summary adds `outcomes { win, lose, push }` (by net) — `apps/api/test/games-twenty-one-history.e2e-spec.ts`.

QA: `BASE_URL=http://localhost:3116 API_URL=http://localhost:4216 node scripts/games-blackjack-qa.mjs [BJ-0x…]` (real hands;
result variants are played from the UI until each comes up) → `test-results/visual/games/blackjack/*.png`; e2e:
`E2E_BASE_URL=http://localhost:3116 E2E_API_URL=http://localhost:4216 pnpm --filter @gp/web exec playwright test e2e/games-blackjack.spec.ts`.
Unit tests: `test/games-blackjack.test.ts`.
