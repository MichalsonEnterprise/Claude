# Test Report

## Unit tests (`npm test`, vitest)

All 54 tests pass as of this writing (`npx vitest run`):

```
✓ tests/claimVerifier.test.ts (9 tests)
✓ tests/safetyGate.test.ts (7 tests)
✓ tests/duplicateDetection.test.ts (7 tests)
✓ tests/llmProviderFactory.test.ts (3 tests)
✓ tests/scoring.test.ts (3 tests)
✓ tests/calendar.test.ts (4 tests)
✓ tests/blocklist.test.ts (9 tests)
✓ tests/llmJson.test.ts (4 tests)
✓ tests/fetcher.test.ts (3 tests)
✓ tests/postizClient.test.ts (5 tests)

Test Files  10 passed (10)
     Tests  54 passed (54)
```

No test ever calls a real Postiz endpoint or a real social platform — the
Postiz tests mock `global.fetch`; the pipeline tests run against
`AI_PROVIDER=mock` / `POSTIZ_MOCK=true`.

### Coverage against the brief's required test list (#32)

| Required | Covered by | Notes |
|---|---|---|
| duplicate detection | `duplicateDetection.test.ts` | normalization, keyword overlap, novelty scoring |
| scoring | `scoring.test.ts` | fresh/authoritative/relevant vs. stale/low-authority/irrelevant, missing-date handling |
| verifier output validation | `claimVerifier.test.ts` | invalid legalStatus/verification values are normalized/dropped, not trusted blindly |
| safety gate | `safetyGate.test.ts` | blocklist wins over LLM verdict, claim-status gating, duplicate escalation, LLM-failure fail-closed |
| scheduling | `calendar.test.ts` | slot count, no same-instant collisions, hour window, weekday-only platforms |
| PostizClient mock | `postizClient.test.ts` | mock mode forced when no API key, stable mock response shapes |
| retry | `postizClient.test.ts` | retries on 5xx, succeeds after transient failures |
| failed API responses | `postizClient.test.ts` | no retry on 4xx, throws after exhausting retries on repeated 5xx |
| missing credentials | `llmProviderFactory.test.ts`, `claimVerifier.test.ts` | provider factory falls back to mock; verifier fails closed to empty claims |
| invalid LLM JSON | `llmJson.test.ts`, `claimVerifier.test.ts` | `parseJsonResult` throws `InvalidLlmJsonError`; verifier catches it and fails closed |
| malformed source | `fetcher.test.ts` | 404 HTML source, garbage RSS URL, unsupported source kind — all return `[]`, never throw |
| publication date vs effective date | `claimVerifier.test.ts` (`aggregateClaimVerdict` cases) | draft/proposal vs signed/in-force is a distinct `legalStatus` enum value the verifier is prompted never to conflate with `verification` status |

## End-to-end dry run (`npm run dry-run:week`)

Run against a real local PostgreSQL instance (not mocked), with
`AI_PROVIDER=mock`, `POSTIZ_MOCK=true`, `DRY_RUN=true`,
`AUTOPILOT_MODE=DRAFT`:

1. `runResearchStage()` — hit the real `SOURCE_REGISTRY` RSS/HTML URLs over
   the network. In the sandbox this task was built in, outbound egress to
   most of those government/media domains is not on the allowlist, so 0
   new research items came back — this exercised the "no errors, just
   nothing found" path, not a crash.
2. `runPlanStage(7)` — with 0 scored news items available, correctly fell
   back to evergreen topics (brief #12) for all 7 slots, created `Topic`
   rows, ran (trivial, no-claim) verification for the evergreen kind, and
   generated a `ContentDraft` for every one of the 6 enabled platforms per
   topic (42 drafts total).
3. `runGenerateWeekStage()` — built a 28-slot weekly calendar (all 6
   platforms honor their configured per-week frequency except LinkedIn/X's
   higher counts weren't all filled since only 7 topics × drafts existed
   per platform — see `NOT FINISHED` in FINAL_STATUS.md), and correctly
   left every slot `waiting` rather than sending anything, because
   `AUTOPILOT_MODE=DRAFT` requires an explicit approval that a dry run
   never grants (this is correct behavior, not a bug).
4. All 42 drafts got Safety Gate verdict `ALLOW` (clean, hedged, evergreen
   educational content grounded in the knowledge base).

### Bug found and fixed during this dry run

The mock LLM provider originally dispatched its canned responses by
regex-matching keywords anywhere in the *entire* prompt — including the
full knowledge base, which is injected into every prompt. Because
`knowledge/forbidden-claims.md` contains the literal phrase "Claim Ledger
status is `PARTIALLY_VERIFIED`", every single mock call (including
platform-writer calls) matched the claim-verification branch first and
returned `{claims: [...]}` instead of the platform-appropriate shape. The
platform writer then failed to parse a `body` field, silently fell back to
`FALLBACK_DRAFT`, and Instagram/TikTok drafts ended up with `slideCount: 0`
(no branded cards ever generated) even though the rest of the pipeline
reported success.

Fixed in `src/llm/mockProvider.ts`: dispatch now keys off the trailing
`"Respond with JSON only: {...}"` instruction each prompt-builder appends
(call-site controlled, not influenced by knowledge-base content), with the
old whole-prompt heuristics kept only as a fallback for hand-written test
prompts that don't include that marker. Re-ran the full dry run afterward
and confirmed Instagram/TikTok drafts now carry real slide content and
non-zero `MediaAsset` rows with actual generated PNG files. This only
affects the offline mock provider — the real Anthropic/OpenAI providers
read natural-language instructions, not regexes, so they were never
subject to this specific failure mode, but it's a good reminder that the
knowledge base ends up in every prompt and any exact-phrase overlap with a
prompt's own instructions is worth checking for.

## What was NOT tested

- No test exercises a real Anthropic or OpenAI API call (no API key
  available in this environment) — the provider adapters
  (`anthropicProvider.ts`, `openaiProvider.ts`) are implemented against
  each SDK's documented interface but unverified against a live model.
- No test exercises a real Postiz instance (none was deployed in this
  environment — see `FINAL_STATUS.md`, `NEEDS CREDENTIALS`).
- No real social platform post was ever created — `DRY_RUN=true` for the
  entirety of this task, by design.
