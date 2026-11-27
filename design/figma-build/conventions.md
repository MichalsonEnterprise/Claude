# GLOBAL POOL — Figma build conventions (brief for every build agent)

You are building part of the **GLOBAL POOL — Product Design** Figma file with the Figma MCP `use_figma` tool.
- fileKey: `QHF8iRUMFgGMcEn3bD25jl` · sessionId: `55ee4abe-3cf3-4b8a-9391-56f6bca3e3ce` (pass on EVERY Figma tool call)
- skillNames on every mutating use_figma call: `figma-use,figma-generate-library` (components) or `figma-use,figma-generate-design` (screens)
- Load the Figma tools in one ToolSearch call: `select:mcp__Figma__use_figma,mcp__Figma__get_screenshot,mcp__Figma__get_metadata`.
- If the Skill tool is available, load `figma:figma-use` before your first call (and `figma:figma-generate-library` for components / `figma:figma-generate-design` for screens). If not, follow the rules below — they are the essentials.
- Product brief + full scope: `/home/user/Claude/GLOBAL_POOL_FIGMA_MASTER_PROMPT.md` (read §1.1–1.3, §1.7 and the part relevant to your task).
- Demo data (exact numbers, handles, hashes): `/home/user/Claude/design/figma-build/demo-data.md` — use it, never invent conflicting numbers.
- Component registry (IDs + variant options): `/home/user/Claude/design/figma-build/registry.json` (+ any `registry-*.json` files next to it).

## 1. Script skeleton (every use_figma call)
1. Paste the ENTIRE content of `/home/user/Claude/design/figma-build/helpers.js` verbatim at the top of the script (it preloads variables, styles, fonts and defines helpers).
2. Switch page ONCE: `const page = figma.root.children.find(p => p.name === '<exact page name>'); await figma.setCurrentPageAsync(page);`
3. Get your section: `const sec = section('<your section name>', X, Y)` (creates it on first call at your assigned X,Y with dark fill).
4. Build, then `fitSection(sec)` and `return { ids..., notes }` — always return every created node/component ID.
5. Plain JS, top-level await, no IIFE, no `figma.notify`, no `console.log` for output. Max script size 50,000 chars — split big work across calls (e.g. one component family or one screen per call).

## 2. Helpers you get (see helpers.js for signatures)
`paint(var)`, `fill(node,var)`, `stroke(node,var,w,align)`, `strokeSides(node,var,{t,r,b,l})`, `gap(n,px)`, `pad(n,t,r,b,l)`, `radius(n,px)` (px ∈ 0,4,6,10,14,20,28,9999 → radius tokens), `AL(dir,{name,gap,p,fill,stroke,r,align,justify,w,h,wrap,cgap,clip})`, `add(parent,...kids)` (kid may be `[node,'FILL']` / `'FILLH'` / `'FILL_BOTH'`), `await T(text, textStyle, colorVar, {w, align, name})`, `await fx(node,'Elevation/2 — Raised')`, `await gfill(node,'Gradient/Gold Jackpot')`, `rect()`, `ellipse()`, `await I(componentOrSetId, {variant}, {Label:'..', 'Show leading icon':true, 'Leading icon': ICONS.plus})`, `tint(node,var)`, `await IC('wallet',20,'icon/muted')`, `await CHAIN('Arbitrum',16)`, `await DEMO('XS'|'S'|'M')`, `await DEMOBAR()`, `await BTN('Primary'|'Secondary'|'Ghost'|'Danger'|'Gold', 'Label', {size:'S'|'M'|'L', state, lead:'icon', trail:'icon'})`, `await BADGE('Pending'|'Confirmed'|..., 'S'|'M')`, `await screen(name, width, {x,y,grid:true})`, `put()`, `section()`, `fitSection()`, `nextX()`, `nextY()`.
Spacing values passed to gap/pad MUST be on the 4/8 scale: 0,2,4,6,8,12,16,20,24,28,32,40,48,56,64,80,96,128 (they bind to `space/*` variables).

## 3. Tokens (never raw hex — bind variables via helpers)
PALETTE UPDATED 27 Nov 2026 (user decision): **BC.GAME-style charcoal + mint green**, gold for jackpot only.
Backgrounds: `bg/base` (#232626 page), `bg/secondary` (#1E2121 sidebar, footer, table wrappers — darker), `surface/default` (#2B2F30 cards/panels), `surface/raised` (#323738 game tiles, inputs, raised cards), `surface/overlay` (#2B2F30 modals/popovers + border/subtle + Elevation/4), `surface/hover`, `surface/pressed`, `surface/selected` (mint tint). Borders: `border/subtle`, `border/default` (#3A4142), `border/strong` (#464E4F), `border/focus` (mint), `border/brand`, `border/gold`, `border/danger`, `border/success`.
Brand (mint): `brand/primary` (#2CD97D — CTAs, active nav, highlights), `brand/secondary` (#5BE89C), `brand/primary-strong` (button fill), `brand/tint`, `brand/tint-subtle`. **Text/icons on mint fills use `text/on-primary` (dark #151717)** — never white on mint. Gold: `accent/gold` (#F4C96C), `accent/gold-strong` (#E9A044), `accent/gold-soft`, `accent/gold-tint`, `accent/gold-tint-strong` — jackpot/prize moments only.
Status (+ `-tint` fills): `status/success|danger|warning|info|pending`. Balance: `balance/available` (green), `balance/locked` (neutral, lock icon), `balance/pending` (sky, clock icon), `balance/owed` (gold, coins icon).
Text: `text/primary` (#F5F6F6) `|secondary` (#B3BEC1) `|tertiary` (#98A1A3) `|disabled|on-primary (dark)|on-gold (dark)|on-danger|brand (mint)|gold|success|danger|warning|info`. Icons: `icon/default|muted|brand|gold`. Scrims: `scrim/overlay|strong`. Chains: `chain/bnb|polygon|arbitrum|ethereum|solana`, `token/usdt`. VIP: `vip/bronze|silver|gold|platinum|diamond`.
**Translucency**: a paint bound to a variable ignores paint opacity — use the alpha tokens above (tints/scrims/hover), never `opacity` on a bound paint.
Text styles: `Display/XL|L|M` (jackpot), `Heading/H1..H5`, `Body/L|M|M Strong|S|S Strong`, `Label/L|M|S`, `Caption`, `Overline`, `Mono/M|S` (addresses, hashes, seeds), `Number/XL|L|M|S` (all money/financial figures). Casino-style section titles: Heading/H4 or H5 (sentence case, e.g. "GLOBAL POOL Originals"), tile titles may be bold UPPERCASE (Label/L + textCase UPPER) over art.
Effect styles: `Elevation/1 — Card`, `Elevation/2 — Raised`, `Elevation/3 — Popover`, `Elevation/4 — Modal`, `Glow/Brand` (mint), `Glow/Gold`, `Inner/Hairline`, `Blur/Glass`. Paint styles (gradients): `Gradient/Brand Glow|Brand Solid|Gold Jackpot|Gold Tint|Surface Sheen|Hero Radial|Gold Radial|Skeleton` + game-tile backdrops `Gradient/Tile Mint|Tile Gold|Tile Violet|Tile Red|Tile Sky|Tile Amber`.
Radius usage: controls/buttons 10 (md), tiles/cards 14 (lg), hero banners 20 (xl), modals 20, pills 9999, small tags 4–6.

## 4. Visual direction (UPDATED 27 Nov 2026 — user decision)
Model the **layout architecture, density and feel of BC.GAME / HyperLucky-style crypto casino sites** (references were reviewed by the orchestrator): persistent **left sidebar** navigation (expanded 240 / collapsed 72) + slim **top bar** (logo, search, Sign in / Sign up, or balance + Deposit + notifications + avatar), hero **promo banner carousel**, **recent wins** strip, horizontal **carousels of portrait game tiles** (3:4, vivid original art, player-count badge, title over art) with "All" + ‹ › controls, **category tiles**, promo cards, a **draw-countdown card** (hh : mm : ss boxes), a **live bets / entries table with tabs**, trust/RG strip and a **mega footer** (columns, community icons, supported networks, licence, 18+). Charcoal surfaces, mint CTAs, gold jackpot. Bold, dense, energetic — but ORIGINAL: never copy their logos, mascots, photos, third-party game art, text or exact compositions.
**BANNED "AI-generated look" (user feedback 27 Nov 2026 — hard rule):** no thin concentric circles / orbit rings as decoration, no big blurry radial glow blobs behind content, no scattered floating dots, sparkles or particles, no centred "logo-in-a-halo" heroes, no glassy gradient cards floating in empty space, no generic abstract "network nodes". Gradient/Hero Radial and Gradient/Gold Radial may only be used INSIDE game-tile art, never as page or hero backgrounds. Heroes and banners instead use: concrete illustrated objects in casino-banner style (coins, tickets, chips, cards, dice, trophies) cropped by the banner edge, real product UI previews (tiles, draw-countdown card, bet slip), bold typography, solid charcoal surfaces, and diagonal/angled colour blocks. If it looks like a template from an AI landing-page generator, redo it.
**Promotions (user decision 27 Nov 2026): casino-style marketing is IN and prominent** — welcome offer, daily rewards, missions, rakeback, cashback, weekly tournaments with prize pools, VIP level-up rewards, big-win tickers, deposit CTAs everywhere, promo banners in hero/sidebar/lobby. Each promo shows its key terms or a "Terms apply" link. **Still NOT allowed** (deceptive or regulatory evasion): fake/looping countdowns not tied to a real event, fabricated wins presented as real, pre-checked consent, hidden fees/odds, obstructed withdrawals or self-exclusion, any VPN / geo-block bypass hint. Fees/odds disclosed, DEMO badges, 18+ and RG entry points stay.
**Game catalogue (user decision): adopt the reference sites' game genres under ORIGINAL names, icons and art** — see the "Game catalogue" table in demo-data.md. Never reuse their game titles, characters or thumbnails.
Player app (public site, lobby, games, Global Pool, dashboard, wallet, account) uses the casino shell; the admin panel keeps its own dense admin shell.

## 5. Components (page `02 — Components`)
- Build with `figma.createComponent()` + auto layout, then `figma.combineAsVariants(variants, sec)`; name sets `Category/Name`, variants `Prop=Value, Prop=Value`. Keep each set ≤ 30 variants (split otherwise).
- After combining, give the set auto layout (wrap) + `surface/default` fill + padding 24 + radius 14 so variants don't stack at (0,0). Position sets inside your section, stacked with 48px gaps; add an H2 title + Body/M subtitle at the top of your section.
- Interactive states where applicable: Default, Hover, Pressed, Focus, Disabled, Loading, Error, Success. **Focus = 2px `border/focus` stroke with `strokeAlign='OUTSIDE'`** (spread shadows don't render).
- TEXT component properties: one default is shared by ALL variants — only add a TEXT property when every variant shows the same text (e.g. a label); otherwise leave per-variant text unbound.
- Use INSTANCE_SWAP for icons (`set.addComponentProperty('Icon','INSTANCE_SWAP', ICONS.bell)` then `node.componentPropertyReferences = { mainComponent: key }`), BOOLEAN for optional parts.
- Reuse existing components as nested instances (buttons, badges, icons, DEMO) — never redraw lookalikes.
- Every set/component gets a `description` (usage, anatomy, do/don't, dev notes: states, data fields, real-time behaviour).
- Wrapping text: `await T(text, style, color, {w: 320})` then, inside auto layout, set `layoutSizingHorizontal='FILL'` if it should stretch. HUG/FILL only after appendChild into an auto-layout parent. Call `resize()` before setting sizing modes.

## 6. Screens (pages 03–12)
- Frame name: `[ScreenID] Name / Breakpoint / State`, e.g. `WAL-13 Withdraw — Step 4 Amount / 1440 / Over balance`.
- Create with `await screen(name, 1440|1280|768|390, {x, y})` → vertical auto-layout, fixed width, hug height, bg/base, Breakpoint + Color modes set. First child: `DEMOBAR()` (FILL width). Then shell (header/sidebar instances), then content.
- Use component **instances only** from the registry (no detached copies, no lookalikes). If a needed component doesn't exist yet, build the piece inline with tokens and note it in your return value.
- Place screens inside a Section per module/flow, left-to-right in flow order (x += width + 120), states stacked below (y += height + 160). Use `nextX(sec)` / `nextY(sec)`.
- Real, specific UX copy (no lorem, no "Title here"). Every illustrative number/name/address/hash/chart carries a DEMO badge. Fees always explicit (0.05 USDT platform fee per qualifying entry as its own line). "You can lose your stake" on every participation/bet confirmation. Licence/jurisdiction notice on gambling surfaces. Countdowns reflect the real close time. No pre-checked consent. No admin result-editing/winner-picking/arbitrary payouts.
- Mobile 390: true mobile patterns (bottom tab bar, bottom sheets, sticky CTA, 44px+ touch targets), not shrunk desktop.

## 7. Verification (mandatory)
After each component set / screen: take a screenshot (`await node.screenshot()` at the end of the build script, or `get_screenshot`). Check: no clipped/overlapping text, no empty frames, no default grey/white fills, correct tokens, DEMO badges present, spacing consistent. Fix with a targeted script, re-screenshot once. Only report something as VERIFIED if you saw a passing screenshot.

## 8. Errors & limits
- On a use_figma error read `safeToRetryWithoutCanvasRead`: true → fix and retry; false → read the canvas (get_metadata on your section) before changing anything. Never create duplicates — check by name first.
- If you hit a rate-limit error, do other preparation (write the next script), then retry; do not hammer.
- Stay inside your assigned page/section. Never delete or edit nodes you didn't create (except documented fixes you were asked to do).

## 9. Your final answer (return value)
Return a concise JSON-like report: `{ section: id, created: {"Name": "id", ...}, ledger: {"ID": "VERIFIED|BUILT|PARTIAL|NOT STARTED"}, issues: [...], notes: [...] }`. Also write your component IDs to `/home/user/Claude/design/figma-build/registry-<your-agent-key>.json` (same shape as registry.json: `{"Name": {"id": "..", "variants": {...}, "props": {...}}}`) so later agents can use them.
