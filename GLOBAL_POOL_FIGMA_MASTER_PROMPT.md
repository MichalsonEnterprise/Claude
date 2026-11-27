# GLOBAL POOL — MASTER DESIGN PROMPT PACKAGE (for Claude + Figma MCP)

**How to use:** paste this ENTIRE document into a new Claude session that has Figma MCP access. It contains four parts that must stay together, because Part 1 refers to the others:

1. FINAL MASTER PROMPT FOR CLAUDE + FIGMA MCP
2. SCREEN INVENTORY (the screen ledger, with IDs, priorities and sizes)
3. DESIGN EXECUTION PLAN (order of work, phases, gates, how not to skip screens)
4. QUALITY CHECKLIST (acceptance criteria and final QA)

---
---

# PART 1 — FINAL MASTER PROMPT FOR CLAUDE + FIGMA MCP

## 1.0 YOUR ROLE

You are a **Principal Product Designer, Senior UX/UI Architect, Web3 Product Strategist and Figma power user**. You have access to **Figma MCP**. Your job is to **actually build** the complete design of the product **GLOBAL POOL** inside a real Figma file, using Figma MCP tools — not to describe it, not to outline it, not to produce a plan instead of a design.

Everything below is a requirement, not a suggestion. Do not shorten it, merge modules, or replace screens with prose descriptions. The deliverable is a Figma file.

### Mandatory tool behaviour
- Use Figma MCP for every creation and edit. If the Figma tooling has companion skills or guides (for example a "figma-use" skill, a "figma-generate-library" skill for design systems/variables/components, and a "figma-generate-design" skill for composing screens), **load and follow them before the first write call** and before each new kind of task. Never call a write tool blind.
- If you must create the file, create a new Figma Design file named **"GLOBAL POOL — Product Design"**. If a file key or URL was supplied by the user, use that file instead and read its current structure first so you never overwrite existing work without looking at it.
- Work **incrementally**: one component, one section or one screen per tool call (or a small batch of tightly related items). After every meaningful write, **verify visually** (screenshot / read back the node tree) and fix problems before continuing.
- Do not stop to ask the user questions unless you are genuinely blocked (for example, no Figma access). Make sensible product decisions yourself and record them in the Cover page's "Decisions log".
- Never claim something is done unless you have created it in Figma and verified it. Report status honestly (see §1.12 and Part 3).

---

## 1.1 PRODUCT BRIEF

**Name:** GLOBAL POOL
**Type:** Premium Web3 Global Jackpot Platform / Crypto Gaming Platform.
**Model:** Global Progressive Pool — a shared prize pool with rounds, participation, draw and settlement. Additional casino-style games (Roulette, Crash, Dice, Coinflip, Blackjack) live in the same platform.
**Currency:** USDT (all balances, entries, prizes and fees are shown in USDT; show network fees separately and in the native gas token where relevant).
**Target platform fee:** **0.05 USDT per qualifying participation (entry)**. Always display this as an explicit, separate line item before the user confirms any participation. Never hide fees. Never imply guaranteed outcomes.
**Blockchains (multi-chain):** BNB Chain, Polygon, Arbitrum, Ethereum, Solana.
**Product technology context (informs realistic UI, naming, states and data shapes):** Next.js, React, TypeScript, Tailwind CSS, NestJS, PostgreSQL, Solidity, Foundry, WalletConnect, Chainlink VRF. Design so that components map cleanly to React components and Tailwind tokens (8px spacing scale, token names that translate to CSS variables).

**Quality bar:** an international, premium Web3 product with design quality comparable to the best fintech and premium crypto platforms. It must **not** look like a cheap casino template: no neon slot-machine clutter, no fake-urgency banners, no cartoon coins, no stock "AI-generated UI" look.

**Quality inspirations (do not copy any of them; create original GLOBAL POOL identity):** Binance, Coinbase, Stake, Rollbit, Revolut, Phantom, Linear.

---

## 1.2 NON-NEGOTIABLE COMPLIANCE, SAFETY AND ETHICS RULES

These apply to every screen and flow you design.

1. **Licensing & jurisdiction.** All gambling-type games and the Global Pool participation must be visibly marked as **requiring an applicable licence and available only in permitted jurisdictions**. Provide a persistent, tasteful licence/jurisdiction notice (footer, game pages, participation modal) and a full geo-restriction experience (state "Restricted region", the Restricted Countries page, and the blocked-access interstitial).
2. **No manipulation mechanisms.** Do **not** design any hidden mechanism that influences outcomes, any feature that bypasses regulation, any "rigged" logic, or any admin tool that can alter results. Outcomes are presented as determined by verifiable randomness (Chainlink VRF for Global Pool; verifiable seed commit/reveal or VRF for other games — design the *verification UI*, do not invent cryptography).
3. **Admin restrictions.** The admin panel must **never** offer: editing or choosing a draw result, choosing winners, arbitrary payout from the pool, editing ledger entries, or silent balance adjustments. Admins can only see statuses and perform **allowed, controlled, fully audited** operations (e.g., approve/reject a flagged withdrawal per policy with mandatory reason, place/lift account restrictions with reason, pause *new* round entries via a circuit-breaker with dual approval, trigger refund *as defined by contract rules* when a round is cancelled, export reports). Sensitive actions require reason + re-authentication (2FA) and, where marked, **four-eyes approval**. Every action shows an audit trail entry.
4. **Responsible gaming is a first-class feature**, not a footer link: limits, reality checks, cooling-off, self-exclusion, visible 18+ notice, help-organisation links, and session timers in game screens.
5. **No dark patterns:** no fake countdown pressure (timers must reflect real round data), no misleading "winner" toasts, no pre-checked consent, no auto re-entry enabled by default, no hiding of odds/fees/limits, no friction asymmetry for withdrawals vs deposits beyond genuine security checks.
6. **Odds & risk disclosure:** every participation/bet confirmation shows: amount, fee, potential payout where deterministic, probability or house edge where applicable, limits, and a "You can lose your stake" notice.
7. **Security UX:** anti-phishing code, address whitelisting, new-address cooldown, 2FA on withdrawals, device/session visibility, clear warnings about wrong network/token, address-format validation per chain, irreversible-transaction warnings.
8. **All demonstration data must be clearly marked `DEMO`** (a consistent DEMO badge component on every card, table, chart, winner list, jackpot value, address, tx hash and user). Never present fabricated data as real. Use obviously illustrative addresses/hashes (e.g., truncated, with a DEMO tag) and fictional names/handles.
9. **No real brand logos copied**; wallet providers may be represented by neutral, original placeholder marks labelled by name.
10. Include required legal surfaces: Terms, Privacy, Responsible Gaming, AML/KYC Policy, Restricted Countries, cookie consent, age gate.

---

## 1.3 VISUAL DIRECTION & DESIGN SYSTEM FOUNDATIONS

**Style:** Premium dark Web3. Minimalist, luxurious interface. Modern fintech. Elegant gaming. Subtle gradients. Large, highly legible financial figures. Gentle animations. High typographic quality. Clear information hierarchy. Generous whitespace. Precisely engineered cards and tables.

### Required colour palette (use exactly; derive supporting tokens)
| Token | Hex |
|---|---|
| bg/base (Background) | #09090F |
| bg/secondary | #11111B |
| surface/default | #191927 |
| brand/primary | #8B5CF6 |
| brand/secondary | #A78BFA |
| accent/gold | #D6B56D |
| status/success | #22C55E |
| status/danger | #EF4444 |
| text/primary | #F8FAFC |
| text/secondary | #9292A5 |

Derive and document (in Variables, with names): surface/raised, surface/overlay, border/subtle, border/default, border/strong, brand/primary hover/pressed/disabled, brand/tint (low-opacity fills), accent/gold tint, status/warning (amber), status/info (sky), status/pending, text/tertiary, text/disabled, text/on-primary, focus ring, scrim/overlay, chain colours (BNB, Polygon, Arbitrum, Ethereum, Solana — used only as small indicators), and semantic **balance colours** (available / locked / pending / owed). **Verify contrast** (WCAG AA 4.5:1 for body text, 3:1 for large text/UI). If white text on #8B5CF6 is below AA at a given size, use a documented darker fill shade or larger/bolder label — never silently change the brand hexes; log any adjustment in the Decisions log.

**Gradients (subtle):** brand glow (primary→secondary at low opacity), gold jackpot gradient (accent shades), surface sheen, hero radial glow. Define as Figma paint styles / variables where possible.

**Typography:** Inter (preferred, available in Figma) or Geist if available. Use a monospace face (Geist Mono / JetBrains Mono / Roboto Mono, whichever is available) for addresses, tx hashes and seeds. Use **tabular numerals** for money. Define text styles: Display XL/L/M (jackpot numbers), H1–H5, Body L/M/S, Label L/M/S, Caption, Overline, Mono M/S, Number XL/L/M/S (financial). Document type scale and line-heights.

**Spacing, radius, elevation, grid:** 4/8px base scale; radius tokens (xs, sm, md, lg, xl, full); elevation/shadow & glow styles; layout grids for 1440 (12 col), 1280 (12 col), 768 (8 col), 390 (4 col); documented container widths and gutters.

**Iconography:** one consistent icon family (single stroke weight, 24px grid, 16/20/24 sizes), drawn or built as components. No random mixed-style icons. Create chain icons, token icons (USDT), status icons, game icons (original), navigation icons.

**Motion spec (documented, plus prototype transitions where possible):** subtle animations — pool value tick-up, ticket entry shimmer, wheel spin ease, crash multiplier growth, coin flip, card deal, toast slide, skeleton shimmer. Document durations/easings as tokens.

**Variables:** create Figma Variables collections: Colour (with semantic aliases over primitives), Spacing, Radius, Typography, Elevation, Breakpoint, Motion. Bind component fills/strokes/spacing to variables. No raw hex in components or screens except inside the primitive collection.

**Theme:** Dark theme is the primary and required theme. Structure variables with modes so a Light mode could be added later; Light mode screens are out of scope unless everything else is complete.

---

## 1.4 FIGMA FILE STRUCTURE (create exactly these pages, in this order)

```
00 — Cover & Overview
01 — Design System
02 — Components
03 — Public Website
04 — Authentication
05 — User Dashboard
06 — Wallet & Transactions
07 — Global Pool
08 — Games
09 — Admin Panel
10 — Mobile Experience
11 — Prototypes
12 — Empty & Error States
```

**Page contents**
- **00 — Cover & Overview:** cover artwork (original GLOBAL POOL identity, DEMO notice), product summary, page index with links, **Screen Ledger** (see Part 2 — a status table, kept up to date), **Decisions log**, **Compliance notes**, naming conventions, handoff notes, changelog.
- **01 — Design System:** colour, gradients, typography, spacing, radius, elevation, grids, iconography, motion specs, logo & brand usage, data-viz style, token tables, DEMO-badge spec.
- **02 — Components:** the entire component library (see §1.5) organised in labelled sections with variants.
- **03 — Public Website:** all public pages (desktop 1440 as the master; laptop 1280 and tablet 768 where specified in the ledger). Mobile versions go on page 10 and are cross-referenced.
- **04 — Authentication:** all auth, wallet-connect, KYC and recovery flows.
- **05 — User Dashboard:** dashboard shell, overview, gaming, account, financial history, VIP, referrals, responsible gaming, notifications.
- **06 — Wallet & Transactions:** wallet overview, deposit and withdraw flows with all states, transaction history and details.
- **07 — Global Pool:** the Global Jackpot product surfaces end-to-end.
- **08 — Games:** Roulette, Crash, Dice, Coinflip, Blackjack — each as a separate, clearly labelled section with its own bespoke UX.
- **09 — Admin Panel:** separate product shell and every admin module.
- **10 — Mobile Experience:** dedicated mobile (390) layouts for all screens that the ledger marks "M", designed as true mobile patterns (bottom tab bar, bottom sheets, sticky action bars, thumb-reach), not shrunk desktop.
- **11 — Prototypes:** flows with connectors/reactions (see §1.9).
- **12 — Empty & Error States:** a systematic matrix of empty, error, loading, offline, maintenance, permission-denied and restricted states for every module.

**Naming conventions:** pages as above; frames as `[ScreenID] Name / Breakpoint / State` (e.g., `WAL-04 Withdraw — Step 4 Amount / 1440 / Default`); components as `Category/Name` with variant properties (`State=Default|Hover|Active|Disabled|Loading|Error|Success`, `Size=S|M|L`, `Type=...`); layers named meaningfully; no "Frame 1234". Place screens in labelled **Sections** on a clean grid with consistent spacing; flows run left-to-right with headings and numbering.

---

## 1.5 COMPONENT LIBRARY (page 02) — build before screens

Build with **Auto Layout, Components, Variants, Component Properties and Variables**. Every interactive component must have these states where applicable: **Default, Hover, Active/Pressed, Focus, Disabled, Loading, Error, Success.**

- **Buttons:** Primary, Secondary, Tertiary/Ghost, Danger, Gold/Jackpot CTA, Icon button, Button group, Wallet-connect button; sizes S/M/L; with/without icon; loading spinner.
- **Inputs:** text, password (with strength meter), email, amount input (with MAX, USDT suffix, fiat-equivalent hint), address input (chain-aware validation, paste, scan, whitelist badge), OTP/2FA code input, search, textarea, checkbox, radio, toggle, slider (limits), date range, file upload (KYC).
- **Selects & Dropdowns:** network selector, token selector, generic select, multi-select, filter menus, user menu, language/region menu.
- **Cards:** stat card, balance card (available/locked/pending/owed variants), jackpot card, game card, winner card, round card, plan/VIP-level card, network card, FAQ item, feature card, notification card, security-score card.
- **Tables:** header/row/cell types (text, number, status badge, address, amount, date, actions), sortable headers, row hover/selected, expandable rows, bulk-action bar, sticky headers, density options (comfortable/compact), table toolbar (filters, search, export), skeleton rows, empty state.
- **Modals & Drawers:** confirmation modal, danger modal, 2FA modal, connect-wallet modal, participation-preview modal, responsible-gaming-limit modal, detail drawer (right), filter drawer, mobile bottom sheet; with header/body/footer slots.
- **Tabs, Badges, Tooltips, Toasts, Alerts:** tab variants (underline, pill, segmented); status badges (Pending, Confirmed, Failed, Processing, Approved, Rejected, Under review, Restricted, VIP tiers, DEMO, LIVE, NEW); tooltip (info, definition); toasts (success, error, warning, info, tx-pending with progress); alert banners (info, warning, security, regional restriction, maintenance, regulatory notice).
- **Navigation:** public header (logged-out / logged-in / wallet-connected variants), mobile menu, dashboard sidebar (expanded/collapsed), breadcrumb, stepper (deposit/withdraw/KYC), mobile bottom tab bar, admin sidebar + topbar, command-palette (admin), pagination (numbered, load-more, cursor).
- **Header / Footer / Sidebar / Pagination:** full variants for desktop/tablet/mobile.
- **Charts (consistent data-viz style, DEMO-labelled):** line/area (pool balance), bar (revenue, deposits), donut (prize distribution), sparkline, multiplier curve (crash), histogram/heat strip (roulette history), gauge (system health), progress ring (VIP/KYC), timeline.
- **Wallet components:** wallet chip (address truncated + copy + chain), connected-wallet row, network-status pill, balance breakdown, deposit-address block with QR, token amount row, gas/fee estimator.
- **Transaction components:** tx row, tx status timeline (submitted → confirming n/N → confirmed/failed), tx hash with explorer link, fee breakdown block, receipt card.
- **Game components:** chip stack/bet chips, bet slip, odds/probability display, result banner (win/lose/push), history strip, provably-fair verifier block, seed/hash display, RG session bar (time + spend), playing card, dice, coin, wheel, multiplier readout.
- **Jackpot components:** jackpot counter (Display XL, gold), round header (round #, status, countdown to **real** close), participants counter, entry ticket, pool progress/threshold bar, VRF status stepper (Requested → Fulfilled → Settled), prize distribution list, winner reveal card.
- **User components:** avatar, VIP badge, KYC status chip, 2FA status, device row, session row, notification item, limit setter.
- **Admin components:** KPI tile with delta, queue card, risk-score meter, audit-log row, permission matrix cell, role chip, approval-request card (four-eyes), reconciliation row (match/mismatch), contract card (address, chain, version, status), event-stream row, filter bar with saved views, confirm-with-reason dialog.

Document each component (usage, anatomy, do/don't) on page 02. Publish the library so screens use **instances only** (no detached copies, no re-drawn lookalikes).

---

## 1.6 PRODUCT SURFACES — DETAILED REQUIREMENTS

Design **every** item below. The Screen Inventory in Part 2 assigns IDs, priorities and sizes. Do not collapse several items into one frame unless the inventory explicitly says "tab/section of".

### A. PUBLIC WEBSITE

**Header:** Logo GLOBAL POOL; nav items — Home, Global Pool, Games, Winners, How It Works, Provably Fair, VIP, Affiliates; actions — Login, Register, Connect Wallet. Variants: logged-out; logged-in (avatar menu, balance chip); wallet-disconnected; wallet-connected (chain pill + address chip); regional-restriction banner state; mobile menu.

**HomePage (build all sections as discrete, reusable section frames):**
1. Hero — marketing headline; Global Jackpot with current pool value (large gold number); participants count; active-round info (round #, status, real closing time); primary/secondary CTAs; **animated pool visual** (design keyframes or variants showing the motion: glowing pool, rising value, entering tickets); `DEMO` badge on all live numbers.
2. Global Pool Live — live pool balance chart, latest entries feed, round progress/threshold, participants, "Participate" CTA with fee disclosure (0.05 USDT).
3. Available Games — six game cards (Global Jackpot, Roulette, Crash, Dice, Coinflip, Blackjack), each with its own original illustration/iconography and licence note.
4. Recent Winners — table/cards with DEMO names, amounts, game, round, verification link.
5. How It Works — 4–5 clear steps, with visual diagrams.
6. Supported Networks — five chains with status and typical fees.
7. Provably Fair — explainer, verify teaser, link to verifier.
8. Security — custody, smart-contract audits placeholder (DEMO), 2FA, address whitelisting, VRF.
9. VIP Program — tiers preview.
10. Affiliate Program — commission teaser, calculator preview.
11. FAQ — accordion with real, thoughtful questions (fees, withdrawals, fairness, KYC, restrictions).
12. Footer — nav, legal links, licence/jurisdiction notice, 18+ and help-organisation links, network status, language selector, social placeholders.

**Required Home states (as separate frames or variant-controlled frames, all clearly labelled):** logged-out; logged-in; wallet not connected; wallet connected; insufficient funds; active round; no active round (next round countdown/notify me); restricted region (full content gating with explanation).

**All other public pages (each needs complete content, not placeholders):** Global Pool; Games Lobby; Game Details (per-game template instances with rules, limits, RTP/house-edge disclosure, provably-fair info, licence note); Winners Hall; Leaderboard; Provably Fair (with interactive-looking verifier: inputs, result, verified/failed states); How It Works; Supported Networks; VIP Program; Affiliate Program; About Us; Security Center; FAQ; Contact (form + states); Terms & Conditions; Privacy Policy; Responsible Gaming; AML/KYC Policy; Restricted Countries (searchable list); plus age gate, cookie consent, geo-block interstitial, 404, 500, maintenance. Legal pages must look like well-designed long-form documents (sticky table of contents, version/date, print-friendly layout, anchor links) with realistic section headings.

### B. AUTHENTICATION & ONBOARDING

Design every flow with form layouts, inline validation, error messages, loading and success states, and security messaging: Register (email + password; wallet-first option; age/jurisdiction/terms consent unchecked by default); Login; Email Verification (sent, enter code, resend cooldown, expired, success); Password Reset (request, email sent, set new password, success); Two-Factor Authentication (enrollment: scan QR → confirm code → backup codes; login challenge; recovery); Connect Wallet (provider list incl. WalletConnect QR, Solana wallet option, connecting, rejected, wrong network, success); Wallet Verification (sign-message request with human-readable message, success, rejected, expired nonce); KYC Verification (intro & levels, personal info, document upload with requirements/preview, liveness/selfie, submitted); KYC Pending; KYC Approved; KYC Rejected (reason categories, how to fix, resubmit); Restricted Account (suspended, under review, self-excluded, geo-restricted — each distinct and empathetic); Account Recovery (start, identity verification, wallet-based recovery, mandatory cooling-off notice for security, success); session-expired re-auth; new-device login alert.

### C. USER DASHBOARD (every module a full, functional sub-page)

Shell: sidebar (expanded/collapsed), topbar (balance chip, notifications, network switcher, user menu), breadcrumbs.

- **Dashboard Overview:** Total Balance, Available Balance, Pending Balance, (and Locked / Owed where applicable), Total Entries, Total Rewards, Recent Activity, Active Games, Active Pool (live round status + my entries), Notifications; first-run empty state and new-user checklist (verify email → 2FA → KYC → deposit).
- **Wallet:** Wallet Overview; Connected Wallets; Deposit; Withdraw; Transaction History; Network Selection; Token Selection; Deposit Address; QR Code; Withdrawal Confirmation; Withdrawal Status; Pending / Failed / Successful transaction states; address whitelist management.
- **Gaming:** My Games; My Entries; My Active Rounds; My Results; My Winnings (with claim/settlement status); Game History; Favorites.
- **Account:** Personal Information; Security Settings (security score); Two-Factor Authentication; KYC Status; Verification Documents; Login History; Connected Devices; Session Management; Notification Preferences; Anti-Phishing Code.
- **Financial History:** Deposits; Withdrawals; Fees; Rewards; Refunds; Complete Transaction History (filters, export CSV).
- **VIP:** Current Level; Progress; Points (+history); Rewards (claim states); Benefits (tier comparison).
- **Referrals:** Referral Link (copy/share); Statistics; Invited Users; Affiliate Earnings; Payout History (+ request payout).
- **Responsible Gaming:** Deposit Limits; Participation Limits; Time Limits; Reality Checks; Cooling-Off Period; Self-Exclusion (multi-step confirmation with consequences explained); pending-limit-change (cool-down for increases) states.
- **Notification Center.**

### D. FINANCIAL UX (design with maximum care)

**Balance semantics — distinguish clearly and consistently everywhere (colour, icon, label, tooltip, glossary):**
- **Available** — can be used or withdrawn now.
- **Locked** — reserved (active round entries, pending withdrawals, bonus restrictions, holds).
- **Pending** — incoming but not yet confirmed (deposits awaiting confirmations).
- **Owed / Receivable** — prizes, rewards or refunds that are due but not yet settled to Available.
Provide a "Balance breakdown" component and a one-screen glossary tooltip.

**Deposit flow:** 1 Select Network → 2 Select Token (USDT; show network-specific contract/standard) → 3 Show Deposit Address (copy, warnings: only send USDT on selected network, minimum deposit, confirmations required) → 4 QR Code → 5 Transaction Pending (detected, n/N confirmations, explorer link, estimated time) → 6 Confirmation (credited) → 7 Deposit Successful (receipt, next actions). Plus states: wrong network warning, below-minimum, delayed, failed/unrecognised, expired address session, empty (no deposits yet).

**Withdrawal flow:** 1 Select Asset → 2 Select Network → 3 Enter Address (validation per chain, whitelist, new-address cooldown warning, paste/scan) → 4 Enter Amount (Available balance, MAX, min/max, daily limit) → 5 Show Fees (network fee, platform fee if any, net receive amount) → 6 Risk Validation (KYC level check, limits, AML screening outcome, address risk) → 7 Two-Factor Confirmation (email code + authenticator, anti-phishing code shown) → 8 Withdrawal Pending (processing, queued, under manual review with plain-language reason and ETA) → 9 Withdrawal Successful / Failed (tx hash, receipt; failure reasons + what to do).

**Every financial process must include:** loading, success, error, pending, confirmation, empty states and security warnings. Provide a transaction detail drawer and a transaction timeline.

### E. GLOBAL POOL (page 07 — a full product vertical)

Global Pool hub (Pool Balance, Current Round, Participants, countdown-to-real-close, threshold/min-participants status); Participation Preview modal (amount, entries, **0.05 USDT platform fee**, network fee, odds disclosure, RG limit check, licence notice, "you can lose your stake", confirm); Participation Pending → Success; Round Drawing (Chainlink VRF requested / pending / fulfilled / settled stepper); Round Result (winner info, prize distribution, provably-fair result, on-chain links); Round History and Round Detail; Entry History; Prize Distribution breakdown; Provably-Fair verification; edge states (insufficient funds, round closed, VRF delayed, round cancelled → refunds owed, region restricted, limit reached, wallet not connected, wrong network, no active round).

### F. GAMES (page 08 — bespoke UX modules)

**IMPORTANT:** each game is a distinct UX module with its own layout, controls, feedback, history and result design. **Do not create one generic screen and rename it.** Each game must feel native to its mechanics, share only the design system and the RG/fairness components.

- **Global Jackpot (game module page):** Global Pool, Current Round, Pool Balance, Participants, Round History, Winner Information, Prize Distribution, Entry History, Provably Fair Result.
- **Roulette (European, single zero):** table/felt layout with number grid 0–36, inside bets (straight, split, street, corner, line), outside bets (Red/Black, Odd/Even, 1–18/19–36, dozens, columns), chip selector, bet slip with total stake, undo/clear/repeat, wheel/ball spin view, Result Screen (winning number, payouts), Bet History, rules & payouts, provably-fair verification.
- **Crash:** crash interface with multiplier curve, bet panel (amount, auto cash-out), pre-round betting window, active run, cash-out button states, crashed state, Round History strip, Game Statistics, result screen, provably-fair verification.
- **Dice:** dice interface with slider, roll over/under, target number selection, **probability/multiplier/payout display** (live-updating), bet panel, rolling state, Result Screen, history, provably-fair verification.
- **Coinflip:** Heads/Tails selection, bet interface, flip animation states, Result Screen, history, provably-fair verification.
- **Blackjack:** table with Player Hand and Dealer Hand (hole card hidden), betting interface, game controls (Hit, Stand, Double, Split, Insurance), dealing state, dealer turn, Result Screen variants (win, lose, push, blackjack, bust), rules, history, reconnect/recovery state for interrupted rounds.

Each game also needs: min/max bet, balance + RG session bar, loading/connection-lost/insufficient-balance/limit-reached/region-restricted states, sound toggle (UI only), responsible-gaming link, and mobile layout designed for one-thumb play.

### G. ADMIN PANEL (page 09 — a separate product with its own shell)

Distinct visual density (compact tables, dense filters) but same design language. Sidebar groups: Overview, User Management, Finance, Game Management, Global Pool Management, Blockchain Management, Compliance, Affiliate Management, Marketing, System. Include admin login, 2FA, session-timeout and role-based visibility (show "no permission" states).

- **Overview:** Total Users, Active Users, Total Deposits, Total Withdrawals, Gross Revenue, Platform Fees, Pool Liabilities, Active Rounds, Pending Withdrawals, KYC Statistics, System Health.
- **User Management:** Users List; User Profile; Account Details; Wallet Addresses; KYC Status; AML Risk; Transaction History; Account Restrictions (apply/lift with reason); Responsible Gaming Status; Audit History.
- **Finance:** Deposits; Withdrawals (queue, detail, controlled approve/reject with reason + 2FA + four-eyes where required); Platform Fees; Pool Accounting; Financial Ledger (read-only, append-only, hash-chained indicator); Reconciliation; Refunds; Revenue Reports; Export CSV.
- **Game Management:** Games List; Game Configuration (limits within regulatory bounds; changes versioned, dual-approved, effective from next round); Game Status; Game Statistics; Round Management (read-only monitoring + permitted controls); Game History; Provably Fair Logs.
- **Global Pool Management:** Pool Overview; Pool Balance; Active Round; Historical Rounds; Participant List; Prize Distribution; VRF Status; Settlement Status; Refund Status. **No result editing, no winner selection, no arbitrary payout** — statuses and contract-defined operations only; show an "Immutable by design" explanation panel.
- **Blockchain Management:** Supported Networks; Smart Contracts; Contract Addresses; Transaction Monitoring; Blockchain Events; Network Health; Failed Transactions; Gas Statistics.
- **Compliance:** KYC Queue (+ review detail); AML Alerts; Suspicious Transactions; Sanctions Screening; Restricted Countries; Self-Exclusion; Responsible Gaming Reports.
- **Affiliate Management:** Affiliates; Referral Statistics; Commissions; Payouts; Fraud Detection.
- **Marketing:** Banners; Promotions; Announcements; Notifications; Referral Campaigns; CMS (with compliance-review step for promotional content).
- **System:** Admin Roles; Permissions (matrix); Audit Logs; API Settings; Security; System Configuration.

### H. RESPONSIVE DESIGN

Breakpoints: **Desktop 1440, Laptop 1280, Tablet 768, Mobile 390.** Design genuine responsive behaviour, not scaled-down desktop: navigation transforms (sidebar → drawer → bottom tab bar), tables → stacked cards or horizontally scrollable with pinned key column, modals → bottom sheets, multi-column → single column, sticky primary CTAs on mobile.
Mobile must be fully usable, **especially**: Wallet, Deposit, Withdraw, Global Pool, Games, Account Security. Per-screen size requirements are in the ledger (Part 2). Admin: 1440 and 1280 required; 768 for P0 admin screens; 390 only for the approvals/alerts/overview subset noted in the ledger.

### I. PROTOTYPES (page 11)

Create interactive prototypes (Figma reactions: on click/tap, navigate/open overlay/swap/smart animate, with transitions) and also an annotated flow map (numbered, connected frames) for each:
1. Homepage → Register → Verification → Dashboard.
2. Dashboard → Connect Wallet.
3. Wallet → Deposit → Confirmation.
4. Wallet → Withdrawal → Confirmation.
5. Global Pool → Participation Preview → Result.
6. Games Lobby → Game → Result.
7. Profile → KYC.
8. Admin → User Management.
9. Admin → Finance.
10. Admin → Pool Monitoring.
Each prototype must show business logic: transitions, key states, **error branches** (validation fail, wrong network, insufficient funds, 2FA fail, restricted region, rejected KYC, delayed VRF) and alternate outcomes. If a prototyping capability is not available through the tooling, build the connected flow maps with explicit arrow connectors and labelled conditions, and record this limitation honestly in the Decisions log.

---

## 1.7 DATA & CONTENT RULES

- All numbers, names, addresses, hashes, balances, winners, rounds and charts are **DEMO** and marked as such via the DEMO badge component. A single page-level "DEMO DATA" notice on each page header is also required.
- Use realistic, internally consistent data (e.g., pool balance = sum of entries minus fees; fee = 0.05 USDT × qualifying entries; totals match across Dashboard, Wallet and History screens).
- Use real, well-written UX copy: no lorem ipsum, no "Title here", no placeholder buttons. Microcopy for errors, warnings and empty states must be specific and helpful.
- Currency formatting: `1,234.56 USDT`, tabular numerals; addresses truncated `0x12ab…9f3C` with copy affordance; dates ISO-like or localized consistently.

---

## 1.8 ACCESSIBILITY & ENGINEERING HANDOFF

- Contrast AA, minimum touch target 44×44 on mobile, visible focus states, do not rely on colour alone for status (icon + label).
- Text styles, effect styles and variables used everywhere; components use Auto Layout with resizing rules (hug/fill) so developers can map to flex/grid.
- Annotate key components with behaviour notes (validation rules, state transitions, loading/empty/error triggers, real-time updates, polling vs WebSocket where relevant, chain-confirmation counts).
- Put developer notes (data fields, API-shaped labels, states) in frame descriptions or annotation layers on the relevant pages.

---

## 1.9 WORKING METHOD (how you must operate)

1. **Initialise:** inspect Figma MCP tools available; load tool/skill guides; create or open the file; create the 13 pages; create the **Screen Ledger** on page 00 populated from Part 2 (every row `NOT STARTED`).
2. **Follow Part 3 (Design Execution Plan) in order.** Foundations → Components → P0 vertical slice → remaining P1 → P2 → Mobile → Prototypes → Empty/Error matrix → QA.
3. **After every screen or component set:** take a screenshot / read the node tree, check against the Quality Checklist (Part 4), fix defects, then update the ledger row (`NOT STARTED → IN PROGRESS → BUILT → VERIFIED`). Only `VERIFIED` counts as done.
4. **Progress checks:** at the end of each phase (and at least every ~10 screens), output a **Progress Report**: counts by status, the next 10 ledger rows, defects found/fixed, and open risks. Never silently drop or defer work; anything not done stays visibly `NOT STARTED` or `BLOCKED` with a reason.
5. **Do not end your turn after a plan.** Continue building until the ledger is complete or you are physically unable to continue; if you must stop (limits), finish by writing the up-to-date ledger into page 00 and a "RESUME HERE" note listing exactly which rows remain, so a new session can continue from the ledger alone.
6. **Be consistent, not repetitive:** reuse components, but tailor each screen's layout, content and hierarchy to its job. Repeating one template across different modules is a defect.
7. **Verification discipline:** no overlapping/clipped text, no default-grey placeholders, no unbound colours, no detached instances, no empty frames, no off-grid spacing.
8. **Escalation:** if a required capability (e.g., prototype reactions, variable modes, font availability) is unavailable, choose the closest available approach, document it in the Decisions log, and continue.

## 1.10 WHAT YOU MUST NOT ACCEPT (reject and redo)
Random spacing; inconsistent colours; inconsistent components; empty screens; unfinished sections; copy-pasted templates without adaptation; fake interactions without designed states; random icons; generic AI-generated look; fabricated data not marked DEMO; any admin capability that edits outcomes or pays out arbitrarily; any regulatory/safety requirement omitted.

## 1.11 FINAL DELIVERABLE
A complete, organised, developer-ready Figma file (13 pages, full library, all ledger screens VERIFIED at the required breakpoints, 10 prototypes, empty/error matrix), plus a final report: link to the file, ledger summary (counts by status), list of Decisions log entries, known limitations, and recommended next steps.

## 1.12 STATUS REPORTING FORMAT (use at every checkpoint)
```
PROGRESS REPORT — Phase <n>: <name>
Ledger: VERIFIED x / BUILT y / IN PROGRESS z / NOT STARTED n / BLOCKED b  (total T)
Completed this phase: <IDs>
Defects found & fixed: <list>
Open risks / blocked: <list with reasons>
Next up: <next 10 IDs>
```

---
---

# PART 2 — SCREEN INVENTORY (SCREEN LEDGER)

**Priority:** **P0** = MVP core (complete first; all breakpoints marked; all states) · **P1** = MVP-complete (needed for a launch-ready product) · **P2** = full-product breadth (still required in this engagement; built after P0/P1).
**Sizes:** D = Desktop 1440 · L = Laptop 1280 · T = Tablet 768 · M = Mobile 390. "D·M" means 1440 and 390 required. Where a row says "states", each listed state must exist as its own frame or an explicit variant frame.
**Status column (kept on page 00):** NOT STARTED / IN PROGRESS / BUILT / VERIFIED / BLOCKED.

## 2.1 DESIGN SYSTEM & COMPONENTS (pages 01–02)
| ID | Item | Pri |
|---|---|---|
| DS-01 | Brand / logo / cover | P0 |
| DS-02 | Colour primitives + semantic variables (incl. balance colours, chain colours) | P0 |
| DS-03 | Gradients and effects | P0 |
| DS-04 | Typography styles (incl. Number & Mono) | P0 |
| DS-05 | Spacing, radius, elevation, grids per breakpoint | P0 |
| DS-06 | Icon set (nav, status, chain, token, game) | P0 |
| DS-07 | Motion specs | P1 |
| DS-08 | Data-viz style guide | P1 |
| DS-09 | DEMO badge + compliance notice specs | P0 |
| CMP-01 | Buttons | P0 |
| CMP-02 | Inputs & form controls (incl. amount, address, OTP, upload) | P0 |
| CMP-03 | Selects / dropdowns (network, token) | P0 |
| CMP-04 | Cards (stat, balance, jackpot, game, winner, round, VIP, network, notification) | P0 |
| CMP-05 | Tables (all cell types, density, toolbar, skeleton) | P0 |
| CMP-06 | Modals, drawers, bottom sheets | P0 |
| CMP-07 | Tabs, badges, tooltips | P0 |
| CMP-08 | Toasts & alerts (incl. regulatory/region/security) | P0 |
| CMP-09 | Navigation (public header variants, dashboard sidebar, mobile tab bar, breadcrumb, stepper, pagination) | P0 |
| CMP-10 | Footer variants | P0 |
| CMP-11 | Charts | P1 |
| CMP-12 | Wallet components | P0 |
| CMP-13 | Transaction components | P0 |
| CMP-14 | Jackpot components | P0 |
| CMP-15 | Game components (per game sets: roulette, crash, dice, coin, cards) | P1 |
| CMP-16 | User components | P1 |
| CMP-17 | Admin components | P1 |
| CMP-18 | Responsible-gaming components (limit setter, session bar, reality-check modal) | P0 |

## 2.2 PUBLIC WEBSITE (page 03; mobile on page 10)
| ID | Screen | Variants / states | Pri | Sizes |
|---|---|---|---|---|
| PUB-01 | HomePage | sections H1–H12 as modular frames + states: logged-out, logged-in, wallet-disconnected, wallet-connected, insufficient funds, active round, no active round, restricted region | P0 | D·L·T·M |
| PUB-02 | Global Pool (public) | live, no round, restricted | P0 | D·L·T·M |
| PUB-03 | Games Lobby | filters, search, restricted games, empty | P0 | D·L·T·M |
| PUB-04 | Game Details (instances ×6) | per game | P1 | D·M |
| PUB-05 | Winners Hall | filters, empty | P1 | D·T·M |
| PUB-06 | Leaderboard | daily/weekly/monthly | P2 | D·M |
| PUB-07 | Provably Fair (explainer + verifier) | verified, failed, empty | P0 | D·T·M |
| PUB-08 | How It Works | — | P1 | D·M |
| PUB-09 | Supported Networks | per-chain details | P1 | D·M |
| PUB-10 | VIP Program | tiers | P2 | D·M |
| PUB-11 | Affiliate Program | calculator | P2 | D·M |
| PUB-12 | About Us | — | P2 | D·M |
| PUB-13 | Security Center | — | P1 | D·M |
| PUB-14 | FAQ | search, categories | P1 | D·M |
| PUB-15 | Contact | form states | P2 | D·M |
| PUB-16 | Terms & Conditions | long-form | P2 | D·M |
| PUB-17 | Privacy Policy | long-form | P2 | D·M |
| PUB-18 | Responsible Gaming | resources | P1 | D·M |
| PUB-19 | AML/KYC Policy | long-form | P2 | D·M |
| PUB-20 | Restricted Countries | search, list | P1 | D·M |
| PUB-21 | Geo-block interstitial | — | P0 | D·M |
| PUB-22 | Age gate + licence notice modal | — | P0 | D·M |
| PUB-23 | Cookie consent (banner + preferences) | — | P1 | D·M |
| PUB-24 | 404 | — | P1 | D·M |
| PUB-25 | 500 | — | P1 | D·M |
| PUB-26 | Maintenance | — | P1 | D·M |

## 2.3 AUTHENTICATION & ONBOARDING (page 04)
| ID | Screen | States | Pri | Sizes |
|---|---|---|---|---|
| AUTH-01 | Register (email + password) | validation, loading, error, success | P0 | D·M |
| AUTH-02 | Register — wallet-first | — | P1 | D·M |
| AUTH-03 | Login | error, locked, loading | P0 | D·M |
| AUTH-04 | Email Verification | sent, code entry, resend cooldown, expired, success | P0 | D·M |
| AUTH-05 | Forgot Password | sent, error | P1 | D·M |
| AUTH-06 | Reset Password | strength, expired link, success | P1 | D·M |
| AUTH-07 | 2FA Enrollment | scan → confirm → backup codes | P0 | D·M |
| AUTH-08 | 2FA Challenge (login / withdrawal) | wrong code, locked | P0 | D·M |
| AUTH-09 | Connect Wallet modal | list, WalletConnect QR, connecting, rejected, wrong network, success | P0 | D·M |
| AUTH-10 | Wallet Verification (sign message) | request, success, rejected, expired | P0 | D·M |
| AUTH-11 | KYC Intro & levels | — | P0 | D·M |
| AUTH-12 | KYC Personal Details | validation | P0 | D·M |
| AUTH-13 | KYC Document Upload | requirements, preview, error | P0 | D·M |
| AUTH-14 | KYC Liveness / Selfie | permission denied, retake | P1 | M·D |
| AUTH-15 | KYC Pending | — | P0 | D·M |
| AUTH-16 | KYC Approved | — | P0 | D·M |
| AUTH-17 | KYC Rejected | reasons, resubmit | P0 | D·M |
| AUTH-18 | Restricted Account | suspended, under review, self-excluded, geo-restricted | P0 | D·M |
| AUTH-19 | Account Recovery | start, verify identity, wallet recovery, cooling-off notice, success | P1 | D·M |
| AUTH-20 | Session expired / re-auth modal | — | P1 | D·M |
| AUTH-21 | New-device login alert | — | P2 | D·M |

## 2.4 USER DASHBOARD (page 05)
| ID | Screen | States | Pri | Sizes |
|---|---|---|---|---|
| USR-00 | Dashboard shell (sidebar expanded/collapsed, topbar) | — | P0 | D·L·T·M |
| USR-01 | Dashboard Overview | new user empty, active, restricted | P0 | D·L·T·M |
| USR-02 | Notification Center | empty, unread | P1 | D·M |
| **Gaming** | | | | |
| USR-G1 | My Games | — | P1 | D·M |
| USR-G2 | My Entries | empty, filters | P0 | D·M |
| USR-G3 | My Active Rounds | live, empty | P0 | D·M |
| USR-G4 | My Results | — | P1 | D·M |
| USR-G5 | My Winnings (claim/settlement) | owed, settled | P0 | D·M |
| USR-G6 | Game History | filters, export | P1 | D·M |
| USR-G7 | Favorites | empty | P2 | D·M |
| **Account** | | | | |
| USR-A1 | Personal Information | edit, saved | P1 | D·M |
| USR-A2 | Security Settings (security score) | — | P0 | D·M |
| USR-A3 | Two-Factor Authentication mgmt | enable/disable/reset | P0 | D·M |
| USR-A4 | KYC Status | all statuses | P0 | D·M |
| USR-A5 | Verification Documents | — | P1 | D·M |
| USR-A6 | Login History | suspicious flag | P1 | D·M |
| USR-A7 | Connected Devices | revoke | P1 | D·M |
| USR-A8 | Session Management | end all | P1 | D·M |
| USR-A9 | Notification Preferences | — | P2 | D·M |
| USR-A10 | Anti-Phishing Code | — | P1 | D·M |
| **Financial History** | | | | |
| USR-F1 | Deposits | empty, filters | P0 | D·M |
| USR-F2 | Withdrawals | — | P0 | D·M |
| USR-F3 | Fees | — | P1 | D·M |
| USR-F4 | Rewards | — | P1 | D·M |
| USR-F5 | Refunds | — | P1 | D·M |
| USR-F6 | Complete Transaction History + export | — | P0 | D·T·M |
| **VIP** | | | | |
| USR-V1 | Current Level & Progress | — | P2 | D·M |
| USR-V2 | Points & points history | — | P2 | D·M |
| USR-V3 | Rewards (claim states) | — | P2 | D·M |
| USR-V4 | Benefits / tier comparison | — | P2 | D·M |
| **Referrals** | | | | |
| USR-R1 | Referral Link & overview | — | P2 | D·M |
| USR-R2 | Referral Statistics | — | P2 | D·M |
| USR-R3 | Invited Users | — | P2 | D·M |
| USR-R4 | Affiliate Earnings | — | P2 | D·M |
| USR-R5 | Payout History (+ request payout) | — | P2 | D·M |
| **Responsible Gaming** | | | | |
| USR-RG1 | RG Hub / overview | — | P0 | D·M |
| USR-RG2 | Deposit Limits | pending increase cool-down | P0 | D·M |
| USR-RG3 | Participation Limits | — | P0 | D·M |
| USR-RG4 | Time Limits | — | P1 | D·M |
| USR-RG5 | Reality Checks (settings + popup) | — | P1 | D·M |
| USR-RG6 | Cooling-Off Period | confirm, active | P1 | D·M |
| USR-RG7 | Self-Exclusion | multi-step, active | P0 | D·M |

## 2.5 WALLET & TRANSACTIONS (page 06)
| ID | Screen | States | Pri | Sizes |
|---|---|---|---|---|
| WAL-01 | Wallet Overview (balance breakdown: available/locked/pending/owed) | empty, loading | P0 | D·L·T·M |
| WAL-02 | Connected Wallets | add, remove, primary, error | P0 | D·M |
| WAL-03 | Deposit — Step 1 Select Network | — | P0 | D·T·M |
| WAL-04 | Deposit — Step 2 Select Token | — | P0 | D·T·M |
| WAL-05 | Deposit — Step 3 Deposit Address | wrong-network warning, min deposit | P0 | D·T·M |
| WAL-06 | Deposit — Step 4 QR Code | — | P0 | D·T·M |
| WAL-07 | Deposit — Step 5 Transaction Pending (confirmations n/N) | delayed | P0 | D·T·M |
| WAL-08 | Deposit — Step 6 Confirmation | — | P0 | D·T·M |
| WAL-09 | Deposit — Step 7 Successful (receipt) | failed/unrecognised | P0 | D·T·M |
| WAL-10 | Withdraw — Step 1 Select Asset | — | P0 | D·T·M |
| WAL-11 | Withdraw — Step 2 Select Network | — | P0 | D·T·M |
| WAL-12 | Withdraw — Step 3 Enter Address | invalid, whitelisted, new-address cooldown | P0 | D·T·M |
| WAL-13 | Withdraw — Step 4 Enter Amount | min/max, over balance, limit reached | P0 | D·T·M |
| WAL-14 | Withdraw — Step 5 Fees & Summary | — | P0 | D·T·M |
| WAL-15 | Withdraw — Step 6 Risk Validation | pass, KYC required, flagged | P0 | D·T·M |
| WAL-16 | Withdraw — Step 7 Two-Factor Confirmation | wrong code, locked | P0 | D·T·M |
| WAL-17 | Withdraw — Step 8 Pending | processing, queued, manual review | P0 | D·T·M |
| WAL-18 | Withdraw — Step 9 Successful | — | P0 | D·T·M |
| WAL-19 | Withdraw — Step 9 Failed | reasons + actions | P0 | D·T·M |
| WAL-20 | Transaction History | filters, empty, loading | P0 | D·T·M |
| WAL-21 | Transaction Detail drawer | pending / failed / successful | P0 | D·M |
| WAL-22 | Withdrawal Status tracker | — | P0 | D·M |
| WAL-23 | Whitelisted Addresses | add (cooldown), remove | P1 | D·M |
| WAL-24 | Insufficient-funds / limit / maintenance banners & modals | — | P0 | D·M |

## 2.6 GLOBAL POOL (page 07)
| ID | Screen | States | Pri | Sizes |
|---|---|---|---|---|
| GP-01 | Global Pool Hub (pool balance, current round, participants, real countdown, threshold) | active, no round, restricted, wallet disconnected | P0 | D·L·T·M |
| GP-02 | Participation Preview modal (amount, entries, 0.05 USDT fee, network fee, odds disclosure, limit check, licence notice) | insufficient funds, limit reached, wrong network | P0 | D·M |
| GP-03 | Participation Pending | — | P0 | D·M |
| GP-04 | Participation Success (entry receipt) | — | P0 | D·M |
| GP-05 | Round Drawing (VRF stepper: requested → fulfilled → settled) | delayed | P0 | D·M |
| GP-06 | Round Result — winner view | win / not selected | P0 | D·M |
| GP-07 | Round Result — public view (winner info, prize distribution, PF result) | — | P0 | D·M |
| GP-08 | Round History | filters | P1 | D·M |
| GP-09 | Round Detail | cancelled → refunds | P1 | D·M |
| GP-10 | Entry History | — | P1 | D·M |
| GP-11 | Prize Distribution breakdown | — | P1 | D·M |
| GP-12 | Provably Fair Result verification | verified/failed | P0 | D·M |
| GP-13 | Edge states: round closed, round cancelled (refund owed), VRF delayed | — | P1 | D·M |

## 2.7 GAMES (page 08) — each game bespoke
| ID | Screen | Pri | Sizes |
|---|---|---|---|
| **Roulette** | | | |
| RL-01 | Table (felt + chips + bet slip) | P1 | D·T·M |
| RL-02 | Number selection (inside bets) | P1 | D·M |
| RL-03 | Outside bets (Red/Black, Odd/Even, dozens, columns, 1–18/19–36) | P1 | D·M |
| RL-04 | Spinning state | P1 | D·M |
| RL-05 | Result Screen (win/lose) | P1 | D·M |
| RL-06 | Bet History | P1 | D·M |
| RL-07 | Rules & payouts | P2 | D·M |
| RL-08 | Provably-fair verification | P1 | D·M |
| RL-09 | Error/limit/region states | P1 | D·M |
| **Crash** | | | |
| CR-01 | Pre-round betting | P1 | D·T·M |
| CR-02 | Active run (multiplier curve, cash-out) | P1 | D·T·M |
| CR-03 | Cashed-out state | P1 | D·M |
| CR-04 | Crashed / Result screen | P1 | D·M |
| CR-05 | Round History + Game Statistics | P1 | D·M |
| CR-06 | Auto cash-out settings | P2 | D·M |
| CR-07 | Provably-fair verification | P1 | D·M |
| CR-08 | Error/connection-lost/limit/region states | P1 | D·M |
| **Dice** | | | |
| DI-01 | Dice interface (slider, over/under, bet panel) | P1 | D·T·M |
| DI-02 | Number selection + live probability/payout display | P1 | D·M |
| DI-03 | Rolling state | P1 | D·M |
| DI-04 | Result Screen (win/lose) | P1 | D·M |
| DI-05 | History | P1 | D·M |
| DI-06 | Provably-fair verification | P1 | D·M |
| DI-07 | Error/limit/region states | P1 | D·M |
| **Coinflip** | | | |
| CF-01 | Bet interface (Heads/Tails) | P1 | D·T·M |
| CF-02 | Flipping state | P1 | D·M |
| CF-03 | Result Screen (win/lose) | P1 | D·M |
| CF-04 | History | P1 | D·M |
| CF-05 | Provably-fair verification | P1 | D·M |
| CF-06 | Error/limit/region states | P1 | D·M |
| **Blackjack** | | | |
| BJ-01 | Table + betting interface | P1 | D·T·M |
| BJ-02 | Dealing state | P1 | D·M |
| BJ-03 | Player decision (Hit/Stand/Double/Split/Insurance) | P1 | D·M |
| BJ-04 | Dealer turn | P1 | D·M |
| BJ-05 | Result Screen variants (win/lose/push/blackjack/bust) | P1 | D·M |
| BJ-06 | History | P1 | D·M |
| BJ-07 | Rules | P2 | D·M |
| BJ-08 | Provably-fair verification | P1 | D·M |
| BJ-09 | Reconnect/recovery, error/limit/region states | P1 | D·M |
| **Shared** | | | |
| GM-01 | Game session RG bar + reality-check popup (as designed within games) | P0 | D·M |

## 2.8 ADMIN PANEL (page 09)
Sizes: D·L required; T for P0; M only for rows marked (M).
| ID | Screen | Pri |
|---|---|---|
| ADM-00 | Admin shell (sidebar, topbar, command palette, role-based "no permission" state) | P0 |
| ADM-01 | Admin Login + 2FA + session timeout | P0 |
| ADM-02 | Overview (all KPIs + system health) (M) | P0 |
| **User Management** | | |
| ADM-U1 | Users List | P0 |
| ADM-U2 | User Profile (summary) | P0 |
| ADM-U3 | Account Details | P1 |
| ADM-U4 | Wallet Addresses | P1 |
| ADM-U5 | KYC Status | P1 |
| ADM-U6 | AML Risk | P1 |
| ADM-U7 | Transaction History | P1 |
| ADM-U8 | Account Restrictions (apply/lift with reason + 2FA) | P0 |
| ADM-U9 | Responsible Gaming Status | P1 |
| ADM-U10 | Audit History | P1 |
| **Finance** | | |
| ADM-F1 | Deposits | P0 |
| ADM-F2 | Withdrawals queue + detail (controlled approve/reject, four-eyes) (M) | P0 |
| ADM-F3 | Platform Fees | P1 |
| ADM-F4 | Pool Accounting | P0 |
| ADM-F5 | Financial Ledger (append-only) | P1 |
| ADM-F6 | Reconciliation (match/mismatch) | P1 |
| ADM-F7 | Refunds | P1 |
| ADM-F8 | Revenue Reports | P1 |
| ADM-F9 | Export CSV (modal + states) | P1 |
| **Game Management** | | |
| ADM-G1 | Games List | P1 |
| ADM-G2 | Game Configuration (versioned, dual-approved) | P1 |
| ADM-G3 | Game Status | P1 |
| ADM-G4 | Game Statistics | P1 |
| ADM-G5 | Round Management (monitor + permitted controls) | P1 |
| ADM-G6 | Game History | P2 |
| ADM-G7 | Provably Fair Logs | P1 |
| **Global Pool Management** | | |
| ADM-P1 | Pool Overview | P0 |
| ADM-P2 | Pool Balance | P0 |
| ADM-P3 | Active Round (monitoring) (M) | P0 |
| ADM-P4 | Historical Rounds | P1 |
| ADM-P5 | Participant List | P1 |
| ADM-P6 | Prize Distribution | P1 |
| ADM-P7 | VRF Status | P0 |
| ADM-P8 | Settlement Status | P0 |
| ADM-P9 | Refund Status | P1 |
| ADM-P10 | "Immutable by design" policy panel / circuit-breaker (dual approval) | P1 |
| **Blockchain Management** | | |
| ADM-B1 | Supported Networks | P1 |
| ADM-B2 | Smart Contracts | P1 |
| ADM-B3 | Contract Addresses | P1 |
| ADM-B4 | Transaction Monitoring | P1 |
| ADM-B5 | Blockchain Events | P1 |
| ADM-B6 | Network Health | P1 |
| ADM-B7 | Failed Transactions | P1 |
| ADM-B8 | Gas Statistics | P2 |
| **Compliance** | | |
| ADM-C1 | KYC Queue + review detail (M) | P0 |
| ADM-C2 | AML Alerts (M) | P0 |
| ADM-C3 | Suspicious Transactions | P1 |
| ADM-C4 | Sanctions Screening | P1 |
| ADM-C5 | Restricted Countries | P1 |
| ADM-C6 | Self-Exclusion | P1 |
| ADM-C7 | Responsible Gaming Reports | P2 |
| **Affiliate Management** | | |
| ADM-A1 | Affiliates | P2 |
| ADM-A2 | Referral Statistics | P2 |
| ADM-A3 | Commissions | P2 |
| ADM-A4 | Payouts | P2 |
| ADM-A5 | Fraud Detection | P2 |
| **Marketing** | | |
| ADM-M1 | Banners | P2 |
| ADM-M2 | Promotions | P2 |
| ADM-M3 | Announcements | P2 |
| ADM-M4 | Notifications | P2 |
| ADM-M5 | Referral Campaigns | P2 |
| ADM-M6 | CMS (with compliance review step) | P2 |
| **System** | | |
| ADM-S1 | Admin Roles | P1 |
| ADM-S2 | Permissions matrix | P1 |
| ADM-S3 | Audit Logs | P0 |
| ADM-S4 | API Settings | P2 |
| ADM-S5 | Security | P1 |
| ADM-S6 | System Configuration | P2 |
| ADM-X1 | Four-eyes approval modal + confirm-with-reason + re-auth pattern | P0 |

## 2.9 MOBILE EXPERIENCE (page 10)
Mobile (390) frames for every row with "M" in the sizes columns above. Additionally these mobile-specific pattern screens:
| ID | Item | Pri |
|---|---|---|
| MOB-01 | Mobile public header + full-screen menu | P0 |
| MOB-02 | Bottom tab bar (Home, Pool, Games, Wallet, Account) states | P0 |
| MOB-03 | Mobile Home — all sections stacked | P0 |
| MOB-04 | Mobile Global Pool hub + sticky participate bar | P0 |
| MOB-05 | Mobile Wallet overview + quick actions | P0 |
| MOB-06 | Mobile Deposit (bottom-sheet pattern, all steps) | P0 |
| MOB-07 | Mobile Withdraw (bottom-sheet pattern, all steps) | P0 |
| MOB-08 | Mobile Games lobby + game screens (thumb-reach controls) | P0 |
| MOB-09 | Mobile Account Security (2FA, devices, sessions) | P0 |
| MOB-10 | Mobile tables→cards patterns (transactions, entries) | P0 |
| MOB-11 | Mobile admin subset: overview, approvals, alerts | P1 |
| MOB-12 | Tablet (768) behaviour sheet: navigation, grids, tables | P1 |

## 2.10 PROTOTYPES (page 11)
| ID | Flow | Pri |
|---|---|---|
| PRO-01 | Homepage → Register → Verification → Dashboard | P0 |
| PRO-02 | Dashboard → Connect Wallet | P0 |
| PRO-03 | Wallet → Deposit → Confirmation | P0 |
| PRO-04 | Wallet → Withdrawal → Confirmation | P0 |
| PRO-05 | Global Pool → Participation Preview → Result | P0 |
| PRO-06 | Games Lobby → Game → Result | P1 |
| PRO-07 | Profile → KYC | P1 |
| PRO-08 | Admin → User Management | P1 |
| PRO-09 | Admin → Finance | P1 |
| PRO-10 | Admin → Pool Monitoring | P1 |

## 2.11 EMPTY & ERROR STATES (page 12)
| ID | Item | Pri |
|---|---|---|
| ERR-01 | Empty-state matrix per module (wallet, transactions, entries, winnings, referrals, notifications, devices, admin tables) | P0 |
| ERR-02 | Error matrix: network error, 4xx/5xx, timeout, validation, chain congestion, tx failed/dropped/replaced | P0 |
| ERR-03 | Loading matrix: skeletons, spinners, progress, optimistic UI | P0 |
| ERR-04 | Permission / role denied, session expired, offline | P1 |
| ERR-05 | Regulatory states: restricted region, licence required, self-excluded, age-gate fail | P0 |
| ERR-06 | Maintenance / degraded chain / VRF delayed / contract paused banners | P1 |
| ERR-07 | Security warnings library (wrong network, new address, phishing warning, suspicious login) | P0 |

> **MVP definition (P0):** a user can arrive, pass age/jurisdiction checks, register, verify email, enable 2FA, connect/verify a wallet, complete KYC, deposit, see the balance breakdown, preview and enter the Global Pool, watch the VRF draw and result, verify fairness, withdraw with full risk/2FA steps, set RG limits or self-exclude — and an admin can monitor users, withdrawals, KYC/AML queues, pool, VRF and settlement and read the audit log, all on desktop, tablet (key screens) and mobile, with every state designed.

---
---

# PART 3 — DESIGN EXECUTION PLAN

## 3.1 Order of work (do not reorder; do not skip phases)

**Phase 0 — Setup & ledger (must finish before any design)**
1. Inspect Figma MCP tools; load tool/skill guides.
2. Create/open the file "GLOBAL POOL — Product Design"; create pages 00–12 with exact names.
3. On page 00 create: cover, product summary, **Screen Ledger** (all rows from Part 2, status NOT STARTED), Decisions log, Compliance notes, naming conventions.
4. Gate G0: screenshot of page list + ledger.

**Phase 1 — Foundations (page 01)**
Variables (colour primitives → semantic, spacing, radius, typography, elevation, motion, breakpoints), text styles, effect/gradient styles, grids, icon set, logo, DEMO-badge spec, data-viz style.
Gate G1: every token documented; contrast table passes AA (or deviations logged).

**Phase 2 — Component library (page 02)**
Build in this order (each with all states, bound to variables): Buttons → Inputs → Selects → Badges/Tooltips/Tabs → Cards → Tables → Modals/Drawers/Sheets → Toasts/Alerts → Navigation → Wallet components → Transaction components → Jackpot components → RG components → Game components → User components → Admin components → Charts.
Gate G2: component audit — variants complete, no hardcoded values, naming consistent, doc notes present.

**Phase 3 — P0 vertical slice (desktop, then laptop/tablet/mobile as specified)**
Order: Dashboard/public shells → PUB-22/PUB-21 gating → PUB-01 Home (+ states) → AUTH P0 → WAL P0 (deposit, then withdraw, then history/detail) → GP P0 → USR P0 (overview, security, KYC, RG) → ADM P0 (shell, overview, users, withdrawals, KYC/AML, pool, VRF, settlement, audit) → GM-01.
Gate G3: click-through review of P0 slice for consistency (same data, same components, same copy tone). Progress report.

**Phase 4 — Remaining P1 screens**
Public P1 → Dashboard P1 → Global Pool P1 → Games (build each game in full, one module at a time: Roulette → Crash → Dice → Coinflip → Blackjack; do not template across games) → Admin P1.
Gate G4: Progress report; ledger audit (no P0/P1 row below VERIFIED).

**Phase 5 — P2 breadth**
Remaining public/legal, VIP, referrals, notification prefs, admin affiliate/marketing/system extras.
Gate G5.

**Phase 6 — Mobile & tablet pass (page 10)**
Build all ledger-required mobile/tablet frames as true responsive patterns; verify P0 first (Wallet, Deposit, Withdraw, Global Pool, Games, Account Security).
Gate G6.

**Phase 7 — Empty & error states (page 12)**
Fill the matrix; make sure every module referenced states exist as frames and are linked from the ledger.
Gate G7.

**Phase 8 — Prototypes (page 11)**
Wire PRO-01…PRO-10 with reactions/overlays/smart-animate, add error branches, add flow maps.
Gate G8: run through each prototype in order (step list recorded).

**Phase 9 — Final QA & handoff**
Run Part 4 end-to-end; fix defects; update page 00 (ledger final, changelog, decisions, known limitations); output final report (see §1.11).

## 3.2 Batching guidance
- One screen/section per call; verify with a screenshot after each. Assemble large screens section by section (hero, then pool, then games…), never in one giant call.
- Build reusable section frames once, then compose pages from instances.
- Group related work (e.g., all deposit steps) to keep copy, data and layout consistent, then verify as a set.
- Keep data consistent via a "Demo data sheet" on page 00 (user, balances, rounds, tx hashes) that all screens reference.

## 3.3 HOW TO AVOID SKIPPING SCREENS (instructions for the executing Claude)

1. **The ledger is the contract.** Part 2 is the complete scope. Copy it into page 00 as a table. Never remove, merge or rename a row without logging a justification in the Decisions log.
2. **Count, don't guess.** At every checkpoint compute and print counts per status and per page. If total rows ≠ ledger total, find the discrepancy.
3. **Frame-to-row mapping.** Every frame name starts with its ledger ID. At each gate, list ledger IDs without a matching frame — those are NOT STARTED, regardless of how finished the file "feels".
4. **State coverage.** For each row, the "States" column is a checklist. A row is VERIFIED only when all listed states and all listed sizes exist.
5. **Sweep per page.** Before leaving a page, run a sweep: list all top-level frames on the page, compare with the ledger rows for that page, fix mismatches.
6. **No placeholder screens.** A frame containing only a title, a grey box or "coming soon" counts as NOT STARTED.
7. **Forbidden shortcuts:** describing a screen in text instead of building it; one generic frame covering multiple rows; renaming a game template for each game; leaving mobile for "later" without a ledger entry; ending the turn with only a plan.
8. **Resumability.** Keep page 00's ledger current after each batch so any new session can resume by reading it. Before context runs out, update the ledger and write "RESUME HERE" with exact next IDs.
9. **Honesty rule.** If something is not done, say so and keep it visible. Never mark BUILT/VERIFIED without having viewed the result.
10. **Final reconciliation.** In Phase 9, print the full ledger grouped by status. Any row not VERIFIED must be listed in the final report with the reason.

---
---

# PART 4 — QUALITY CHECKLIST (ACCEPTANCE CRITERIA)

Run per screen (quick) and per phase gate (full). A row is VERIFIED only if every applicable item passes.

## 4.1 Design system integrity
- [ ] All colours come from Variables/styles; no raw hex outside the primitives collection.
- [ ] All text uses defined text styles (Inter/Geist + mono + tabular numerals for money).
- [ ] Spacing follows the 4/8px scale; radii and shadows come from tokens; layouts sit on documented grids.
- [ ] One icon family, one stroke weight, correct sizes; no mismatched icons.
- [ ] Brand palette matches the brief exactly; any derived tokens documented; contrast AA verified.
- [ ] DEMO badge present on every demonstration number/table/chart/winner/address/hash; page-level DEMO notice present.

## 4.2 Components
- [ ] Every library component has Default/Hover/Active/Focus/Disabled/Loading/Error/Success where applicable.
- [ ] Auto Layout used; resizing rules sensible (hug/fill); no manual-position hacks.
- [ ] Screens use instances (no detached/duplicated lookalikes).
- [ ] Naming: `Category/Name` + variant properties; layers named; no default "Frame N".
- [ ] Component docs (usage, anatomy, do/don't) exist.

## 4.3 Screens & content
- [ ] Every ledger row has frames at the required sizes and states.
- [ ] No empty/placeholder frames; no lorem ipsum; realistic, specific UX copy; helpful error/empty-state text.
- [ ] Visual hierarchy clear: key financial values large and legible; secondary info subdued; plenty of whitespace; precise cards/tables.
- [ ] No clipped/overlapping text; no off-canvas elements; no misaligned items.
- [ ] Data consistent across screens (balances, fees = 0.05 USDT × entries, round numbers, totals).
- [ ] Each screen looks tailored to its purpose — not a repeated template.

## 4.4 Financial & security UX
- [ ] Available / Locked / Pending / Owed distinguished consistently (colour + icon + label + tooltip).
- [ ] Deposit flow: 7 steps + all states (pending, confirmations, wrong network, below min, failed, empty).
- [ ] Withdraw flow: 9 steps + all states (invalid address, new-address cooldown, limits, risk validation outcomes, 2FA fail, pending/manual review, success, failure).
- [ ] Fees fully transparent: platform fee (0.05 USDT per qualifying entry) and network fee shown separately; net amounts shown.
- [ ] Security warnings present at irreversible steps; anti-phishing code shown on confirmation steps.
- [ ] Each financial process has loading, success, error, pending, confirmation and empty states.

## 4.5 Compliance, fairness & responsible gaming
- [ ] Licence/jurisdiction notice present on gambling surfaces; restricted-region experiences complete (state, interstitial, Restricted Countries page).
- [ ] Age gate, cookie consent, legal pages present; consent checkboxes unchecked by default.
- [ ] Odds/house-edge/limits/fees displayed before every participation or bet; "you can lose your stake" notice.
- [ ] RG tools complete (deposit/participation/time limits, reality checks, cooling-off, self-exclusion) + RG bar inside every game.
- [ ] No dark patterns (no fake urgency; real countdowns only; no auto re-entry by default).
- [ ] Provably-fair verification UI exists for Global Pool and every game; VRF lifecycle states shown.
- [ ] **Admin cannot** edit results, choose winners, pay out arbitrarily, edit ledger entries or adjust balances silently; sensitive actions require reason + 2FA (+ four-eyes where marked); audit trail visible.

## 4.6 Responsive & accessibility
- [ ] 1440 / 1280 / 768 / 390 delivered as specified per ledger row; behaviour genuinely adapts (nav transforms, tables→cards, modals→sheets).
- [ ] Mobile Wallet, Deposit, Withdraw, Global Pool, Games, Account Security fully usable; touch targets ≥ 44px; sticky CTAs appropriate.
- [ ] Status never conveyed by colour alone; focus states visible; text legible at all sizes.

## 4.7 Games
- [ ] Roulette, Crash, Dice, Coinflip, Blackjack each have their own bespoke layout, controls, feedback, history, result and PF screens.
- [ ] Each game has loading, connection-lost, insufficient-balance, limit-reached, region-restricted states.

## 4.8 Prototypes
- [ ] All 10 flows wired (or fully mapped if reactions unavailable — noted in Decisions log) with transitions and error branches.
- [ ] Each prototype can be played start-to-finish without dead ends.

## 4.9 File organisation & handoff
- [ ] 13 pages with exact names and order; frames in labelled sections on a clean grid; consistent spacing between screens.
- [ ] Page 00 contains cover, index, ledger (final), decisions log, compliance notes, changelog, known limitations.
- [ ] Developer annotations on key components/flows (validation, states, data fields, real-time behaviour).
- [ ] Final report delivered (file link, ledger counts by status, decisions, limitations, next steps).

## 4.10 Final acceptance gate
The project is accepted only when: (a) all P0 and P1 rows are VERIFIED, (b) all P2 rows are VERIFIED or explicitly listed as incomplete with reasons, (c) every 4.x section above passes, (d) a final reconciliation of the ledger has been printed. Anything else is reported as incomplete — never as finished.

---

**END OF PACKAGE — paste everything above into the new Claude + Figma MCP session and instruct it: "Begin with Phase 0 now and continue autonomously through all phases, reporting at each gate."**
