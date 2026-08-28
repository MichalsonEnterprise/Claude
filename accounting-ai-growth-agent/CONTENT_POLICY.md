# Content Policy

## Grounding

Every generated piece of content is produced with the full contents of
`knowledge/*.md` in the prompt (`src/knowledge/knowledgeBase.ts`,
re-read on every access so edits take effect on the next run without a
restart). Writers and the Content Strategist are explicitly instructed
never to state a product feature, statistic, or capability that isn't in
that knowledge base. See `knowledge/forbidden-claims.md` and
`knowledge/product-features.md` for the authoritative list of what can and
cannot be claimed today.

## Weekly content mix (editable via `.env`)

| Pillar | Default % | Env var |
|---|---|---|
| Education | 30 | `MIX_EDUCATION` |
| News / newsjacking | 25 | `MIX_NEWS` |
| Product-led | 20 | `MIX_PRODUCT` |
| Problems przedsiębiorców | 10 | `MIX_PROBLEMS` |
| Case/problem/solution | 10 | `MIX_CASE_STUDY` |
| Direct marketing | 5 | `MIX_DIRECT_MARKETING` |

The current pipeline (`src/pipeline/topicPipeline.ts`) selects news topics
that clear `TOPIC_MIN_SCORE` first and fills any remaining slots with
evergreen education topics, so the agent is never blocked by a slow news
day (brief #12). Enforcing the exact weekly percentage mix across all six
pillars end-to-end is one of the `NOT FINISHED` items in
`FINAL_STATUS.md` — today `contentPillar` is tracked per topic and
visible in the panel/API, but the scheduler does not yet hard-quota
against the configured percentages.

## Fact verification (Claim Ledger)

News-based topics go through `src/verification/claimVerifier.ts`, which
extracts claims and assigns each a `legalStatus` (draft / consultation /
proposal / signed law / in force / unknown) and a `verification` status:

- **VERIFIED** — a Tier-1 primary source supports it alone, or 2+
  independent sources agree with no contradiction. Can publish
  autonomously.
- **PARTIALLY_VERIFIED** — one non-primary source only. Requires human
  approval (Safety Gate forces `REQUIRE_APPROVAL`).
- **UNVERIFIED** / **CONFLICTING** — never published, in any autopilot
  mode (Safety Gate forces `BLOCK`).

A legislative draft/proposal/consultation is never described as being in
force — the verifier is explicitly instructed on this distinction, and the
`legalStatus` enum makes "SIGNED_LAW"/"IN_FORCE" a deliberate, separate
choice from "DRAFT"/"PROPOSAL"/"CONSULTATION".

## Safety Gate verdicts

`src/safety/safetyGate.ts` combines, worst-wins:

1. **Hard blocklist** (`src/safety/blocklist.ts`) — deterministic regex
   rules. Always wins; an LLM can never override a blocklist hit.
2. **Claim verification status** for news-based content.
3. **Duplicate detection** — `REQUIRE_APPROVAL` if the topic overlaps
   ≥55% (Jaccard on keywords) with anything selected/published in the
   last `DUPLICATE_WINDOW_DAYS` (default 60).
4. **LLM risk read** — clickbait severity, offensive content, accidental
   competitor attack, stale-sounding claims, wrong-looking dates. Can only
   escalate up to `REQUIRE_APPROVAL`, never to `BLOCK` on its own (only
   deterministic rules can BLOCK), and fails closed to
   `REQUIRE_APPROVAL` if the LLM call itself fails.

`FULL_AUTO` autopilot only auto-publishes verdict `ALLOW`.
`ALLOW_WITH_CAUTION` and `REQUIRE_APPROVAL` always sit in the approval
queue; `BLOCK` is never published in any mode.

## Hard blocklist (never published autonomously, brief #20)

- Individual tax/legal advice ("zrób X żeby uniknąć podatku Y").
- Guaranteed tax savings or guaranteed legal compliance claims.
- Claiming Accounting AI replaces a licensed accountant/tax advisor.
- Unsourced competitor claims.
- Invented statistics not present in `knowledge/product-features.md`.
- Personal data of an identifiable third party (e.g. a bare PESEL pattern).
- Anything that looks like a leaked API key/secret/token.
- Absolute language ("zawsze", "nigdy", "w 100%", "całkowicie
  automatycznie", "bez wysiłku").

See `knowledge/forbidden-claims.md` for the full, human-readable version of
this list and `src/safety/blocklist.ts` for the exact regex rules.

## Duplicate / anti-repetition policy

Default: no substantially similar topic republished within 60 days
(`DUPLICATE_WINDOW_DAYS`). A topic can be revisited sooner if new facts
genuinely change it — the overlap check compares keyword sets, so a
follow-up with materially different content (new deadline, new module,
new numbers) scores lower overlap and is treated as a fresh topic rather
than being auto-blocked; borderline cases land in the approval queue
rather than being silently skipped.
