# GLOBAL POOL — Demo data sheet (single source for ALL screens)

Every value below is DEMO and must carry a `Badge/DEMO` instance where shown (XS in table cells, S next to values/cards, M "DEMO DATA" in section headers). Use these exact numbers so Dashboard, Wallet, History, Pool and Admin screens agree. Format money as `1,234.56 USDT` (Number/* text styles), addresses as `0x12ab…9f3C` (Mono/*), dates `27 Nov 2026, 18:42 UTC`.

## Demo user
- Handle **@nova.k**, display name **Nova K.**, user ID **GP-48213**, email **n•••@example.com**
- KYC **Level 2 — Verified** (L1 basic, L2 full ID + liveness, L3 enhanced/source of funds)
- VIP **Gold** (tier 3 of 5: Bronze, Silver, Gold, Platinum, Diamond), 12,840 / 20,000 points to Platinum
- 2FA **on** (authenticator app), anti-phishing code **AURORA-27**
- Country **Portugal (permitted)**; restricted-region example: **United States (restricted)**
- Wallets: primary **0x12ab…9f3C** (BNB Chain, verified), **0x7c4e…a21D** (Arbitrum, whitelisted 14 Oct 2026), **7Hq3…Xk9P** (Solana, connected, not whitelisted)
- Devices: MacBook Pro · Chrome · Lisbon (current); iPhone 15 · Safari · Lisbon; Windows · Edge · Madrid (flagged new device, 25 Nov 2026)

## Balances (USDT) — must reconcile everywhere
| Bucket | Amount | Composition |
|---|---|---|
| **Total** | **12,480.50** | = Available + Locked + Pending + Owed |
| Available | 9,215.30 | usable / withdrawable now |
| Locked | 1,850.00 | 350.00 in 35 active entries (round #1,248) + 1,500.00 pending withdrawal WD-20931 |
| Pending | 1,000.00 | deposit DP-77412 on Ethereum, 7 / 12 confirmations |
| Owed | 415.20 | 300.00 refund (cancelled round #1,245, 30 entries) + 115.20 VIP Gold weekly reward |
Lifetime: deposits 24,600.00 · withdrawals 11,950.00 · entries 1,284 · platform fees paid 64.20 (= 1,284 × 0.05) · rewards 1,842.60

## Global Pool — current round
- **Round #1,248**, status **Open**, opened 27 Nov 2026 08:00 UTC, **closes 27 Nov 2026 20:00 UTC** (real close; countdown derived from it, e.g. "03:17:42")
- Entry price **10.00 USDT** per entry + **platform fee 0.05 USDT per qualifying entry** (shown as its own line) + network fee shown separately
- **3,412 participants**, **18,640 qualifying entries**
- **Pool balance 186,400.00 USDT** (= 18,640 × 10.00). Platform fees for the round **932.00 USDT** (= 18,640 × 0.05) are NOT part of the pool.
- Threshold: min 500 participants ✓, min pool 50,000.00 ✓ (round will draw)
- Prize distribution: 1st 50% = 93,200.00 · 2nd 20% = 37,280.00 · 3rd 10% = 18,640.00 · 10 × runner-up 2% = 3,728.00 each (37,280.00). Total 100%.
- Odds disclosure example: with 35 entries of 18,640 → chance of any prize ≈ 35 × 13 / 18,640 ≈ 2.44%; chance of 1st ≈ 0.188%
- My entries: 35 (350.00 USDT + 1.75 USDT fees), entry IDs E-1248-00981 … E-1248-01015
- Draw: Chainlink VRF on Arbitrum — request ID **0x9f2c…e71a**, requested 20:00:04 UTC, fulfilled 20:00:41 UTC (3 confirmations), settled 20:02:10 UTC
- Previous rounds: #1,247 pool 172,950.00 (winner @orbit_77), #1,246 pool 168,420.00 (winner @mira.sol), #1,245 **cancelled** (threshold not met → refunds owed), #1,244 pool 181,030.00 (winner @kestrel)
- Fictional handles for feeds/winners: @orbit_77, @mira.sol, @kestrel, @lumen.eth, @atlas_q, @nova.k, @juno88, @sable, @pixelfox, @tidewalker

## Chains & fees (typical, DEMO)
| Network | Token standard | Confirmations | Network fee (withdraw) | Status |
|---|---|---|---|---|
| BNB Chain | USDT (BEP-20) | 15 | 0.12 USDT | Operational |
| Polygon | USDT (PoS) | 64 | 0.02 USDT | Operational |
| Arbitrum | USDT (Arbitrum One) | 20 | 0.08 USDT | Operational |
| Ethereum | USDT (ERC-20) | 12 | 2.40 USDT | Congested (slower) |
| Solana | USDT (SPL) | 32 (finalized) | 0.01 USDT | Operational |
Min deposit 10.00 USDT · min withdrawal 20.00 USDT · daily withdrawal limit 25,000.00 USDT (KYC L2) · platform withdrawal fee 0.00 USDT · new-address cooldown 24 h

## Transactions
- Deposit **DP-77412**: 1,000.00 USDT, Ethereum, tx 0x5e1f…c0a8, 7/12 confirmations, est. 2 min
- Deposit DP-77380: 2,500.00 USDT, BNB Chain, tx 0x41aa…7d10, credited 24 Nov 2026
- Withdrawal **WD-20931**: 1,500.00 USDT → 0x7c4e…a21D (Arbitrum), network fee 0.08, platform fee 0.00, **you receive 1,499.92**, status Under review (AML screening, ETA < 4 h)
- Withdrawal WD-20877: 800.00 USDT → 0x12ab…9f3C (BNB Chain), tx 0x88d2…41bf, completed 20 Nov 2026
- Entry purchase: 35 entries round #1,248, 351.75 USDT (350.00 + 1.75 fees), tx 0x3a7c…9e02
- Failed example: WD-20850 rejected — destination flagged by sanctions screening; funds returned to Available

## Games (house edge / payout disclosure)
- Roulette (European, single zero): house edge 2.70%, straight 35:1, min 0.10 / max 1,000 USDT per spot, table max 5,000
- Crash: house edge 1.00%, max multiplier cap 1,000.00×, min 0.10 / max 1,000 USDT
- Dice (0–99.99): house edge 1.00%; e.g. roll over 50.50 → win chance 49.50%, payout 2.0000×
- Coinflip: payout 1.96× (house edge 2.00%)
- Blackjack: 6 decks, dealer stands on soft 17, blackjack pays 3:2, house edge ≈ 0.50% with basic strategy
- RG session bar example: session 00:42:18 · net −24.60 USDT · limit 200.00 USDT/day

## Admin (DEMO)
- Admins: **A. Marin** (Finance Lead), **K. Osei** (Compliance Officer), **R. Duarte** (Support L2), **S. Iyer** (Super Admin)
- KPIs (30 d): Total users 184,320 · Active users 41,206 · Total deposits 12,846,500.00 · Total withdrawals 10,932,140.00 · Platform fees 60,700.00 (1,214,000 entries × 0.05) · Pool liabilities 186,400.00 + owed prizes 52,310.40 · Active rounds 1 · Pending withdrawals 37 · KYC pending 214 · System health 99.97%
- Smart contracts (Arbitrum): GlobalPool v1.3.0 0x4b1d…77ce · VRFConsumer v1.1.2 0x9e07…2a5f · Treasury v1.0.4 0xd3c8…10b9 (all "Audited — DEMO placeholder")


## Game catalogue (original names — genres adopted from the reference casinos; DEMO player counts)
| Category | Game (display name) | Genre / mechanic | House edge / RTP | Icon |
|---|---|---|---|---|
| Jackpot | **Global Pool** | progressive pool rounds, Chainlink VRF | 0.05 USDT fee/entry | pool |
| Originals | **Orbit Rush** | crash multiplier (our Crash game) | 1.00% | crash |
| Originals | **Orbit Rush Duel** | two-line crash variant | 1.00% | crash-duel |
| Originals | **Vault Sweeper** | mines grid 5×5 | 1.00% | mines |
| Originals | **Skyline** | limbo target multiplier | 1.00% | limbo |
| Originals | **Pinfall** | plinko 8–16 rows | 1.00% | plinko |
| Originals | **Fortune Ring** | wheel, low/medium/high risk | 1.00% | wheel |
| Originals | **Pool Dice** | dice roll over/under (our Dice game) | 1.00% | dice |
| Originals | **Double Side** | coinflip (our Coinflip game) | 2.00% (1.96×) | coin |
| Originals | **High Card** | hi-lo card | 1.00% | hilo |
| Originals | **Ascend** | tower climb | 1.00% | tower |
| Originals | **Pool Keno** | keno 10/40 | 1.00% | keno |
| Table | **Pool Roulette** | European roulette (our Roulette game) | 2.70% | roulette |
| Table | **Twenty-One** | blackjack (our Blackjack game) | ≈0.50% | cards |
| Table | **Baccarat Lounge** | baccarat | 1.06% banker | baccarat |
| Table | **Sic Bo Triad** | sic bo | 2.78% | sicbo |
| Table | **Dragon & Phoenix** | two-card duel | 3.73% | duel |
| Slots (GP Studios) | **Neon Koi**, **Atlas Vault**, **Midnight Orchard**, **Comet Cascade**, **Desert Relics**, **Frost Wolves**, **Lucky Lanterns**, **Robo Heist** | 5×3 / cascade slots, original themes | RTP 96.0–96.7% | slots |
| Live (illustrated) | **Live Pool Roulette**, **Speed Twenty-One**, **Baccarat Lounge Live**, **Mega Ring Show** | live tables, illustrated (no real people) | as table | live |
| Draws | **Keno Express 20/80**, **Daily Draw 6/45** | lottery-style draws with real scheduled times | disclosed per draw | lottery |
| Bingo | **Bingo 75 Night**, **Bingo 90 Classic** | bingo rooms | disclosed | bingo |
Player counts for tiles (DEMO): Orbit Rush 1,062 · Vault Sweeper 146 · Skyline 206 · Pinfall 100 · Fortune Ring 34 · Pool Dice 66 · Global Pool 3,412.

## Promotions (DEMO terms — always show key terms + "Terms apply")
- Welcome offer: 100% match on first deposit up to 500 USDT, 30× wagering on bonus funds, 14 days to complete, min deposit 20 USDT
- Daily rewards: 7-day streak calendar (day 1 0.50 USDT … day 7 5.00 USDT in bonus funds), resets at 00:00 UTC (real reset time)
- Missions: e.g. "Play 50 rounds of Orbit Rush this week → 2.00 USDT", progress bars
- Rakeback: 5% of house edge returned, claimable anytime (claimable now 3.42 USDT)
- Cashback: weekly 10% of net losses, paid Mondays 10:00 UTC — next Mon 30 Nov 2026 (last: 12.80 USDT)
- Weekly tournament: Orbit Rush Sprint — prize pool 2,500.00 USDT, ends Sun 29 Nov 2026 23:59 UTC (27 Nov 2026 is a Friday), leaderboard top 20
- VIP Club: 29 levels across 5 tiers, level-up rewards

## Responsible-gaming limits (DEMO, @nova.k)
- Daily participation limit (Global Pool entries + game stakes): **500.00 USDT** — today used 351.75
- Daily loss limit: **200.00 USDT** — today net −24.60 (shown in RG/Session Bar)
- Deposit limit: **5,000.00 USDT / week** — pending increase to 7,500.00 takes effect after 24 h cool-down
- Session reminder (reality check): every 60 min
- Insufficient-funds examples use a separate DEMO account balance (e.g. Available 342.10 or 4.20 USDT) and must say so in the frame state name.

## Extra illustrative values already used in components (keep consistent)
- Prize example: runner-up in round #1,244 for @nova.k, +3,620.60 USDT (2% of 181,030.00) — settled
- USDT contract placeholder (truncated, DEMO): 0xFd08…Cbb9 — illustrative only, never present it as a real contract address
- New (non-whitelisted) withdrawal address example: 0x3f9a…c47E

## Catalogue / promotions extras (added by the catalogue kit — reuse, all DEMO)
- Tournament "Orbit Rush Sprint": Mon 23 – Sun 29 Nov 2026 23:59 UTC; prizes 1st 1,000.00 · 2nd 500.00 · 3rd 250.00 · 4th–10th 75.00 each · 11th–20th 22.50 each (= 2,500.00); 1 point per 1.00 USDT wagered
- Extra fictional handles: @quasar_9, @velvet.io, @ember_ray, @northwind, @cobalt.k, @zephyr21, @halcyon, @rook.eth, @lyra_v, @drift.sol
- Daily streak amounts (bonus funds): day 1 0.50 · 2 0.75 · 3 1.00 · 4 1.50 · 5 2.00 · 6 3.00 · 7 5.00 (total 13.75)
- Bonus balance: 50.00 USDT bonus funds, wagering 642.00 / 1,500.00 (30×), expires Fri 11 Dec 2026; max bet with bonus 5.00; contribution Originals/slots 100%, table games 10%, Global Pool 0%
- Live Pool Roulette example players: 412

## Admin — affiliates, marketing & system extras (added by the ADM-A/M/S agent — reuse, all DEMO)
- Extra admins: **L. Moreau** (Marketing Lead, 3 of 10 modules: Overview, Affiliate Management, Marketing), T. Brandt / Y. Haddad (Finance), M. Achebe / P. Novak (Compliance), J. Ortiz (Support L2 since 27 Nov 2026 18:20 UTC, AR-1046), E. Lindqvist (external read-only auditor, access to 31 Dec 2026). Roster: Super Admin 1 · Finance 3 · Compliance 4 · Support 12 · Marketing 3 · Read-only 2 = 25.
- Affiliates: 348 partners (312 active). Nov MTD commission 18,426.40 USDT (296 accruing). Plans: revenue share 25% (NGR ≤ 15,000.00) / 30% (≤ 50,000.00) / 35% (above), CPA 40.00 per qualified FTD, hybrid 15% + 20.00. Atlas Media AF-1021 NGR 21,640.00 → 6,492.00; Lumen Streams AF-1007 12,400.00 → 3,100.00; Juno Plays AF-1048 hybrid 2,407.00; Kestrel Reviews AF-1033 58 × 40.00 = 2,320.00; Pixelfox Media AF-1052 1,230.00; Tidewalker Crypto AF-1060 777.00 (review FR-0322); Northwind Gaming AF-1071 480.00; Sable Partners AF-1066 385.00 on hold (FR-0318); 288 others 1,235.40.
- Referral funnel 30 d: 128,460 clicks → 9,412 sign-ups → 5,236 KYC L2 → 4,862 first deposits → 2,918 active after 30 d.
- Payout batch PB-2026-10 (Oct 2026 commission, 25-day hold): PO-5521…5525 = 9,214.80 USDT, network fees 0.31 paid by treasury; PO-5526 Sable 412.50 on hold. Prepared by L. Moreau 26 Nov 10:14 UTC, second approver A. Marin.
- Marketing: promotions PR-201…PR-209 (PR-208 Black Friday reload = changes requested by K. Osei 27 Nov 18:31 UTC, audit #88,212). Banners BN-0398…0417. Announcements AN-84…88 (AN-88 maintenance 1 Dec 2026 02:00–02:30 UTC). Referral campaign RC-14: 642 qualified pairs × 2 × 5.00 = 6,420.00 of 15,000.00 budget. CMS-118 weekly cashback page v4 (in review), CMS-122 daily rewards page v3 (draft).
- Audit log: newest entry #88,214 (18:44:30 UTC), #88,213 = 18:42:07 A. Marin withdrawal.reject WD-20850; hourly Merkle anchor to Arbitrum.

## VIP & referrals extras (added by the usr-vip-ref agent — reuse, all DEMO)
- VIP levels: Bronze L1–5 (0), Silver L6–11 (2,500), Gold L12–17 (8,000; 2,000 pts per level), Platinum L18–23 (20,000), Diamond L24–29 (50,000). @nova.k = **Gold III, Level 14 of 29** (12,000 reached 25 Nov 2026 19:30 UTC); 840 / 2,000 into the level → **1,160 pts to Gold IV (L15, 14,000)**, 7,160 to Platinum. Status points are a rolling 365-day total; roll-off 1 Dec 2026 −410, 1 Jan 2027 −1,050, 1 Feb 2027 −920 (stays Gold at 10,460).
- Points: 1 pt per 1.00 USDT entered in Global Pool (0.05 fee excluded) or staked in Originals/table games; bonus funds and refunded entries earn 0 (round #1,245 = 0 pts). This week (Mon 23 Nov–) +1,286 · Nov 1–27 5,032. Weekly totals W/c 5 Oct–23 Nov: 980, 1,410, 860, 1,530, 1,240, 1,180, 1,326, 1,286.
- Level-up rewards (USDT to Available, no wagering): Gold I 2.00 (12 Oct) · Gold II 3.00 (2 Nov) · Gold III 5.00 (claimed 25 Nov 19:32) · Gold IV 8.00 · Gold V 10.00 · Gold VI 15.00 · Platinum I 25.00. Weekly reward cycle: calculated Mon 10:00 UTC, claimable for a week, then auto-settles (115.20 for 16–22 Nov auto-settles Mon 30 Nov 2026 10:00 UTC; 108.40 for 9–15 Nov auto-settled 23 Nov; 97.60 for 2–8 Nov claimed 12 Nov). Rakeback last claim 2.96 on 24 Nov 09:12.
- Referrals (20% of the 0.05 USDT platform fee on referred players' qualifying Global Pool entries, 12 months from sign-up): link globalpool.example/r/NOVAK27, code NOVAK27. Lifetime 1,904 clicks · 48 sign-ups · 31 verified (KYC L1+) · 19 active (30 d) · 14,250 referred entries → 712.50 fees → **142.50 earned = 90.00 paid out (PO-0388 40.00 on 5 Oct, PO-0412 50.00 on 2 Nov) + 48.60 available for payout + 3.90 pending (round #1,248: 390 referred entries)**. PO-0351 25.00 rejected 12 Sep (KYC L2 pending). Nov 1–27: 5,250 entries → 262.50 fees → 52.50. Last 30 d (29 Oct–27 Nov): 612 clicks, 9 sign-ups, 6 verified, 5 first entries, 58.80 earned; channels Copied link 268/4 · Telegram 196/3 · X 112/1 · Email 36/1. Minimum payout 20.00 USDT, KYC L2 + 2FA, paid to Available, fee 0.00.

## Withdrawal WD-20931 — steps 6–9 timeline (added by the wal-withdraw-b agent — reuse, all DEMO)
- Risk check 27 Nov 2026 18:43 UTC (6 checks in 2.4 s, result valid until 18:58 UTC); 2FA email code sent 18:43 UTC to n•••@example.com; submitted 18:44 UTC.
- Manual review reason: "Routine AML screening for new destinations — usually under 4 h" (first withdrawal to 0x7c4e…a21D since it was whitelisted 14 Oct 2026); decision expected by 22:44 UTC. Queued example: Arbitrum batch every 10 min, next 18:50 UTC, #4 of 9.
- 2FA lock example: 5 wrong codes → withdrawals paused 15 min, until 18:58 UTC.
- Success path: AML review cleared 20:31 UTC → sent 20:32 → confirmed 20:34 UTC (20 / 20), tx hash **0xb7d4…2c91**; Locked drops to 350.00 (entries only), Available stays 9,215.30.
- Failure examples (alternative outcomes of WD-20931): rejected by sanctions screening 20:12 UTC, appeal reference **AML-58214**; network failure = broadcast timed out 3× 18:49–18:59 UTC (Arbitrum degraded since 18:47). Both return 1,500.00 to Available (→ 10,715.30), no network fee charged.
- Level 1 account (KYC required state) is a separate DEMO scenario, named as such in the frame.
