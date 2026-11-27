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
- Cashback: weekly 10% of net losses, paid Mondays 10:00 UTC (last: 12.80 USDT)
- Weekly tournament: Orbit Rush Sprint — prize pool 2,500.00 USDT, ends Sun 30 Nov 2026 23:59 UTC, leaderboard top 20
- VIP Club: 29 levels across 5 tiers, level-up rewards
