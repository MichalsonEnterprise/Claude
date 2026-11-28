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
| `src/components/shell/nav-config.ts` | `ROUTES`, `PRIMARY_NAV`, `ACCOUNT_NAV`, `TAB_NAV` (planned URL map)                   |

## Auth — `@/lib/auth`

`useAuth()` → `{ mode: 'privy'|'mock', status: 'loading'|'guest'|'member', user, signIn(), signUp(), signOut(), getAccessToken() }`.
Privy (`@privy-io/react-auth`, email OTP + Google/Apple + wallets, Arbitrum Sepolia) when `NEXT_PUBLIC_PRIVY_APP_ID` is
set and `NEXT_PUBLIC_PRIVY_MOCK` ≠ `true`; otherwise the **DEV MOCK** dialog (email → any 6-digit code, or "Continue with
a wallet") signs in as DEMO `@nova.k` (localStorage `gp.devMockSession`). Mock `getAccessToken()` returns an UNSIGNED
`dev-mock.<base64url>` placeholder — the API defines the real dev-token exchange.

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
| `Table`(`density`), `TableContainer`, `TableHeader/Body/Row/Head`(`align`, `sort`, `onSort`)`/Cell`(`align`), `CellStack` |                                                                                                                                                                    |
| `Avatar`                                                                                                                  | `initials`, `size` xs·s·m·l·xl, `status`, `tone`, `label`                                                                                                          |
| `Separator`, `Label`                                                                                                      |                                                                                                                                                                    |

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
`DEMO_SHELL_MEMBER` (from `app-shell.tsx`) supplies @nova.k's DEMO balance until the API profile endpoint exists.

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
