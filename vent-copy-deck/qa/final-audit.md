# VENT Copy Deck — Final Quality & Compliance Audit

Performed on the complete deck (24 EN pages + 24 PL pages + brand/microcopy/disclaimer files, ~63,000 words) after all copy was written. Method: automated vocabulary sweeps (grep across the full tree), structural verification (section/marker/SEO parity between EN and PL), and manual spot-reads of compliance-critical pages (/sale, /ventures/ventures-i, /governance, /tokenomics, home, and their PL counterparts).

**Verdict: PASS on all 15 checks**, with the fixes listed in the change log applied during the audit.

---

## The 15 checks

**1. Does VENT have visible, real utility?** — **PASS.**
Utility is enumerated concretely in 13 functions (/vent Section 04) and expressed operationally everywhere else: research gating tiers, membership formula (locked VENT + Reputation), advisory governance weight, VENT Lock mechanics, founder services priced in VENT, rewards from named fixed pools. No page relies on "utility" as an abstract claim.

**2. Does the site read like a scam ICO?** — **PASS (it reads as the opposite).**
Zero countdowns, urgency mechanics, or hype vocabulary (automated sweep: no hits for revolutionary / game-changing / 100x / moon / once-in-a-lifetime / financial freedom / next Bitcoin / "don't miss" in either language). The sale page's hero is literally "A distribution, not a countdown" / "Dystrybucja, nie odliczanie", and its closing CTA tells the reader to take their time.

**3. Are utility token and STO consistently separated?** — **PASS.**
The separation appears structurally on every page where it could be confused: dedicated comparison tables (/vent Section 15, /ventures Section 03), the "in preparation / not an offer" status architecture of /ventures/ventures-i, disclaimer D2/D9, and use-of-proceeds language ("Every euro builds the ecosystem. None of it is fund capital."). Future holder benefits are consistently limited to ecosystem/platform/admin fee reductions with explicit negations of discounted securities and guaranteed allocations — in both languages.

**4. Do we promise profits anywhere?** — **PASS.**
Sweep results: every occurrence of "guaranteed/gwarantowan-", "returns", "yield", "dividend/dywidend-" in the deck is inside a negation or risk disclosure. Lock rewards are framed exclusively as ecosystem participation rewards from fixed pools with "working target" qualifiers and D5 disclaimers. The one non-financial use of "Guaranteed" (Transparency status legend) was rewritten to "Committed" during the audit.

**5. Is governance described as fund management?** — **PASS (explicitly not).**
/governance contains a dedicated "What holders do NOT control" section (kept equally blunt in PL: "POZA ZAKRESEM") listing fund decisions, portfolio control, investor capital, exits, and offering terms as outside scope. Advisory framing ("charakter doradczy") is attached to every voting surface, including ballot microcopy in /app.

**6. Does research sound like a real product?** — **PASS.**
Research has a named methodology (6-step process, 14 profile sections, 8 published scores = 7 dimensions + composite), editorial standards including a conflicts policy and published corrections, a risk methodology, access tiers, and a complete worked sample profile (fictional Kestrel Photonics, labelled as fictional in both languages). The scoring arithmetic was reconciled during the audit (see change log).

**7. Is PatentChain a natural part of the ecosystem?** — **PASS.**
PatentChain appears only as VENT's IP intelligence layer ("IP Intelligence powered by PatentChain" / "IP Intelligence oparte na PatentChain" — standardized in PL during the audit), integrated at every pipeline stage (screening flags → profile IP section → IP Score → Investment Ready gate) and in founder services. It is never presented as a separate side company.

**8. Does the copy sound institutional?** — **PASS.**
Register held across pages: declarative headlines, no exclamation marks (verified by sweep in both languages), measured claims, disclaimers written in confident plain language, and honesty used as positioning ("Empty by design, for now", "Measured, not marketed", "Publikujemy ludzi, kiedy są potwierdzeni — nie wcześniej").

**9. Are CTAs specific?** — **PASS.**
"Learn More" is banned and absent (sweep-verified). All CTAs follow the three-tier system in brand/cta-system.md with verb-first, destination-truthful labels, mirrored by canonical PL forms in the style guide.

**10. Are slogans repeated?** — **PASS (after fixes).**
Signature-phrase frequency was measured; two homepage preview sections that duplicated destination-page headlines verbatim were varied ("A utility token with real work to do", "Analysis with a methodology behind it"). Remaining echoes are deliberate preview→destination pairs or core category vocabulary ("venture intelligence ecosystem"), not slogans.

**11. Does every page have a concrete business function?** — **PASS.**
Each of the 24 routes has a distinct job: conversion (home, /sale), product explanation (/vent, /research, /ip-intelligence), trust (/transparency, /security, /documents), supply-side acquisition (/startups, /startups/apply), demand-side pipeline (/ventures, /ventures-i waitlist), retention (/app, /community, /reputation, /governance), and authority (/thesis, /intelligence). No page exists as filler; /portfolio's function is deliberate discipline signaling.

**12. Do founder, community member, and professional investor each understand what VENT gives them?** — **PASS.**
Each audience has: a homepage segmentation card (Section 21), a dedicated route (/startups; /community; /ventures + waitlist), a tailored description in brand/messaging-summary.md (H, I, J), and audience-mapped CTAs in the CTA system.

**13. Any invented partners, investments, clients, licenses, results, or statistics?** — **PASS (none).**
No partner, client, investor, license, metric, or historical claim appears anywhere. The only named company is the explicitly fictional sample (Kestrel Photonics, double-labelled in both languages). /portfolio ships empty by design; metrics sections ship as labelled pre-launch states; /team ships with a no-invented-people rule and pending-state cards; /about explicitly renounces backdated history.

**14. Is all non-existent data clearly marked?** — **PASS.**
Unknown facts are `[PLACEHOLDER: …]` (never invented values); pre-launch data uses the five-state status system (Live / Pending / Not yet deployed / Scheduled for publication / Coming before TGE) defined on /transparency with PL equivalents; compliance-sensitive wording carries `[LEGAL REVIEW REQUIRED]`. Marker parity EN↔PL was machine-verified per file by the localization pipeline.

**15. Is the language fit for a project aspiring to professional venture / private markets?** — **PASS.**
The deck borrows its register from institutional venture and market-intelligence communication: published methodology, scoped governance, disciplined sequencing ("intelligence first, capital second"), and disclosure treated as brand. PL localization holds the same register natively (premium fintech Polish, no calques), with a binding style guide for future writers.

---

## Change log (fixes applied during this audit)

1. `en/21-transparency.md` — status legend "Guaranteed to precede…" → "Committed to precede…"; PL aligned ("Zobowiązanie publikacji przed wygenerowaniem tokena").
2. `en/01-home.md` — two preview headlines varied to avoid verbatim slogan duplication with destination pages.
3. `en/11-reputation.md` — "Five ways in" → "Six ways in" (headline/count mismatch caught by the PL localization pass).
4. `en/07-research.md` + `pl/07-research.md` — score arithmetic reconciled: "eight published scores = seven scored dimensions + the VENT Score composite" (hero, scoring section, both languages).
5. `pl/brand/disclaimers.md`, `pl/24-app.md` — anglicism "yield" in negations unified to "oprocentowanie".
6. `pl/17-ip-intelligence.md` — brand phrase standardized to "IP Intelligence oparte na PatentChain" (matching the dominant form across PL pages).

## Residual items for humans (not copy defects)

- All `[LEGAL REVIEW REQUIRED]` blocks require counsel sign-off before publication (MiCA white paper alignment in particular).
- All `[PLACEHOLDER: …]` values (dates, thresholds, weights, jurisdictions, providers, entity names) must be filled from real decisions — the copy is written to fail visibly if they are not.
- Hard spaces (thousands separators, EUR amounts) in PL should be enforced as `&nbsp;`/U+00A0 at implementation; source files use regular spaces.
- Two localization judgment calls flagged for the deck owner's preference: PL "misselling" rendered descriptively in /governance (swap to the KNF anglicism if legal prefers); Reputation level names kept EN as system labels.
