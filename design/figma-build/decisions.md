# Decisions log (seed — keep appending)
1. Typeface: Inter for all UI text and financial numbers; Geist Mono for addresses, tx hashes and seeds (both verified available in Figma).
2. Tabular numerals: the Figma Plugin API cannot set OpenType features, so Number/* styles document `font-variant-numeric: tabular-nums` for engineering; design uses Inter default figures.
3. Contrast: white on brand #8B5CF6 is 4.05:1 (below AA for small text). Primary button fills therefore use the derived token brand/primary-strong #7C3AED (5.5:1); #8B5CF6 stays unchanged for accents, icons, focus, links and glows. Danger fills use #DC2626 (4.6:1), hover #B91C1C.
4. text/tertiary derived as #82829A (4.6:1 on surface/default); text/secondary #9292A5 = 6.5:1 on bg/base.
5. status/pending = violet-300 (distinct from amber warning). Balance semantics: Available = green + check icon, Locked = neutral lavender-grey + lock icon, Pending = sky + clock icon, Owed = gold + coins icon.
6. Focus ring = 2px border/focus outside stroke (spread shadows do not render on unclipped auto-layout frames). Dev: outline 2px + 2px offset.
7. Translucent fills use alpha colour variables (alpha/*), because a variable-bound paint ignores paint opacity.
8. Variable modes: Color = Dark (primary) + Light (structure only, screens out of scope); Breakpoint = Desktop 1440 / Laptop 1280 / Tablet 768 / Mobile 390, set explicitly on every screen frame.
9. Chain, token and wallet-provider marks are original neutral glyphs labelled by name — no official logos copied.
10. Pool entry pricing: 10.00 USDT per entry + 0.05 USDT platform fee per qualifying entry (separate line). Pool balance = Σ entry amounts; platform fees are excluded from the pool.
11. Entries are paid from the platform balance, so the participation preview shows "Network fee 0.00 USDT — no on-chain transaction for entries"; deposits and withdrawals show real network fees per chain.
12. Button variant matrices are split per type (Primary/Secondary/Ghost/Danger/Gold/Icon/Wallet/Group) to keep each set ≤ 30 variants.
13. TEXT component properties are only used where all variants share a label (Figma shares one default across variants).
14. Gold (accent/gold, Button/Gold) is reserved for jackpot/prize moments; never for generic CTAs.
15. Demo data is centralised in one sheet (round #1,248, @nova.k balances) so all screens reconcile.
