# Final Status

Built against the full brief in one continuous session, prioritizing P0
(must work) and P1 (media, safety, dedup, full autopilot) over P2
(analytics, strategy optimization, a nicer UI) — P2 was deliberately not
attempted, per the brief's own instruction to drop it if time runs short.

## WORKING

- **Postiz research** — verified current self-hosting requirements, public
  API surface (`/integrations`, `/upload`, `/posts`, `/integration-settings`),
  auth model, and provider-settings shapes from the `gitroomhq/postiz-app`
  README and `gitroomhq/postiz-docs`' `openapi.json` (docs.postiz.com itself
  was unreachable from this environment's network egress). See
  `ARCHITECTURE.md`.
- **Full pipeline, end to end, against a real PostgreSQL database**:
  research → dedup → scoring → topic selection (with evergreen fallback
  when news is thin) → claim verification → TopicBrief → per-platform
  writers (LinkedIn, LinkedIn Page, X, Facebook, Instagram, TikTok) →
  branded SVG→PNG media cards for Instagram/TikTok → Safety Gate → weekly
  calendar → PostizClient (mock or real) → `DRY_RUN` `WOULD_PUBLISH`
  logging with the full payload.
- **Knowledge base** (`knowledge/*.md`, 9 files) loaded fresh on every
  pipeline run (mtime-checked, no restart needed) and injected into every
  LLM prompt — writers are explicitly instructed never to claim a feature,
  statistic, or capability not present in it.
- **LLM provider abstraction** — Anthropic, OpenAI, and an offline mock,
  selected by `AI_PROVIDER`, with per-stage model overrides
  (`AI_RESEARCH_MODEL`/`AI_WRITER_MODEL`/`AI_VERIFIER_MODEL`). Falls back
  to mock with a logged warning if the configured provider's API key is
  missing, rather than crashing.
- **Research engine** — a curated Tier 1/2/3 source registry
  (`src/research/sources.ts`), RSS + minimal HTML fallback fetchers,
  content-hash dedup so nothing is re-fetched/re-scored twice.
- **Topic scoring** (0-100, freshness/authority/accounting relevance/
  product relevance/novelty), configurable `TOPIC_MIN_SCORE`.
- **Claim Ledger / fact verification** — VERIFIED / PARTIALLY_VERIFIED /
  UNVERIFIED / CONFLICTING, a separate `legalStatus` enum (draft /
  consultation / proposal / signed law / in force) so a bill in progress is
  never described as being in force, fails closed (empty claims →
  UNVERIFIED → BLOCK) on any LLM error or invalid JSON.
- **Content Strategist + platform writers** — one TopicBrief per topic,
  distinct per-platform drafts (not copy-pasted across platforms), each
  grounded in the knowledge base.
- **Media generator** — hand-laid-out SVG rendered to PNG via `sharp`,
  1080×1350 (Instagram) / 1080×1920 (TikTok), 1-7 slides.
- **Safety Gate** — deterministic hard blocklist (always wins) + claim
  status gating + duplicate escalation + an LLM risk read that can only
  escalate the verdict, never de-escalate it, and fails closed to
  `REQUIRE_APPROVAL` if the LLM call itself fails.
- **Duplicate detection** — normalized text + keyword (Jaccard) overlap,
  60-day window (configurable), no embeddings needed for the MVP.
- **PostizClient** — the only module that talks to Postiz, full
  `POSTIZ_MOCK` mode, retry-with-backoff on 5xx/429, no retry on 4xx.
- **Scheduler** — weekly calendar builder, per-platform frequency
  (`POSTS_PER_WEEK_*`), spread within a configurable publishing-hour
  window so nothing fires in the same second, weekday-only heuristic for
  LinkedIn/Facebook.
- **Autopilot modes** — OFF / DRAFT (default) / FULL_AUTO, plus an
  independent runtime PAUSE/RESUME kill switch
  (`POST /autopilot/pause` / `/resume`) checked at the top of every
  content-generating and publish-triggering stage.
- **DRY_RUN** — the entire pipeline runs to completion; the final publish
  step logs `WOULD_PUBLISH` with the full Postiz payload instead of
  calling out.
- **HTTP API** — every endpoint from brief #28 implemented
  (`/health`, `/status`, `/agent/run`, `/agent/research`,
  `/agent/generate-week`, `/autopilot/pause`, `/autopilot/resume`,
  `/research`, `/topics`, `/drafts`, `/scheduled`, `/published`,
  `/failures`, `/drafts/:id/approve`, `/drafts/:id/reject`), plus
  `/runs` for the observability log.
- **Panel** — single static HTML/JS dashboard (no build step) showing
  autopilot/Postiz/AI status, today's counts, upcoming posts, failed jobs,
  a drafts-pending-approval queue with APPROVE/REJECT, recent research,
  recent published posts, and recent run logs. Verified working against a
  live server (`curl`'d `/health`, `/status`, and `/` during this task).
- **Observability** — every pipeline invocation is an `AgentRun` with an
  ordered JSON stage log (researchStarted → ... → published/failed);
  errors in one platform/source never abort the whole run.
- **Locking** — a DB-backed lock (`SystemSetting` row with a 30-minute
  TTL) prevents overlapping cron runs.
- **Tests** — 54 vitest unit tests, all passing, covering every item in
  brief #32's required list (see `TEST_REPORT.md` for the mapping).
- **Docker** — `Dockerfile` + `docker-compose.yml` for this service and
  its own Postgres. Does not reimplement Postiz's compose, per the brief.

## TESTED

- 54/54 unit tests passing (`npm test`), including PostizClient
  retry/error-handling against a mocked `fetch`, invalid-LLM-JSON
  handling, missing-credentials fallback, and malformed-source handling.
  See `TEST_REPORT.md`.
- Full pipeline run against a **real local PostgreSQL 16** instance (not
  mocked): `npm run dry-run:week` completed successfully, producing 42
  content drafts (7 topics × 6 platforms) with all Instagram/TikTok drafts
  carrying real 3-slide branded PNG carousels, all with Safety Gate
  verdict `ALLOW`, written to `artifacts/sample-week/`.
- One real bug was found and fixed during this dry run (the mock LLM
  provider's dispatch heuristic was misrouting every call because the
  injected knowledge base happened to contain a phrase the dispatcher was
  keying on) and a second one (the "replaces a licensed accountant"
  blocklist rule was flagging the correct, hedged "nie zastępuje
  księgowego" — does NOT replace — the same as the actual violation). Both
  are documented with root cause in `TEST_REPORT.md`, fixed, covered by a
  new regression test, and re-verified with a clean re-run. This is the
  kind of thing that's genuinely useful to have caught before it shipped.
- `npx tsc --noEmit` passes with zero errors.
- API server smoke-tested directly: started against the real database,
  `curl`'d `/health` → 200 with a timestamp, `/status` → correct
  `db: CONNECTED`, `ai: mock`, `postiz: MOCK`, and today's counts matching
  what was actually in the database; `/` (the panel) → 200.

## NEEDS CREDENTIALS (from you)

- **`ANTHROPIC_API_KEY`** (or `OPENAI_API_KEY`) — without one, the system
  runs entirely on the mock LLM provider. The pipeline logic is fully
  exercised either way; only real prose/JSON quality is unverified.
- **A running Postiz instance** — none was deployed in this session (see
  `NOT FINISHED` below for why). `SETUP.md` documents exactly how to stand
  one up from Postiz's own compose.
- **`POSTIZ_API_KEY`** — from that Postiz instance, once deployed.
- **Social platform developer apps + OAuth** — LinkedIn (personal +
  Company Page), X, Facebook Page, Instagram, TikTok. `SOCIAL_SETUP.md`
  documents what to create and where; several of these (Facebook,
  Instagram, LinkedIn Company Page, TikTok) require a platform app-review
  process outside this agent's control.

## NOT FINISHED

- **Postiz itself was not actually deployed** in this sandboxed
  environment — Docker's daemon isn't running here (`docker` CLI is
  present but `/var/run/docker.sock` doesn't exist), and self-hosting
  Postiz requires its own Postgres/Redis/Temporal stack which wasn't
  feasible to stand up without Docker in the time available. `PostizClient`
  was therefore validated against its documented API contract and a mocked
  `fetch` (retry/4xx/5xx behavior), not against a live instance. This
  service's *own* Postgres was validated for real (installed locally,
  migrated, and used for the full dry run).
- **Weekly content-mix quota is not hard-enforced.** `MIX_EDUCATION` /
  `MIX_NEWS` / `MIX_PRODUCT` / `MIX_PROBLEMS` / `MIX_CASE_STUDY` /
  `MIX_DIRECT_MARKETING` exist in config and `contentPillar` is tracked per
  topic, but `planTopics()` currently only distinguishes "verified news"
  vs. "evergreen education" when filling the week — it doesn't yet select
  across all six pillars in the configured proportions. Product-led,
  problems-focused, case-study, and direct-marketing evergreen topic seeds
  would need to be added to `topicPipeline.ts`'s evergreen list and the
  selection loop taught to quota against `config.mix`.
- **Real Anthropic/OpenAI calls are unverified** — implemented against
  each SDK's documented interface, never exercised against a live API (no
  key available here).
- **Analytics and the weekly Strategy Optimizer (brief #31, explicitly
  P2)** — not implemented. `PublishedContent` has the analytics columns
  ready (`impressions`, `likes`, `comments`, `shares`, `engagementRate`)
  but nothing populates them yet; that would mean polling Postiz's
  analytics public-API endpoints once real posts exist to measure.
- **`GET /posts` monitoring loop** (brief #30 step 17, "monitor status")
  — `PostizClient.listPosts()` exists but nothing polls it periodically to
  reconcile `ScheduledContent`/`PublishedContent` status against Postiz's
  own record of what actually went out.
- **TikTok/Instagram carousel `settings` payload is minimal** —
  `publishPipeline.ts` sends `{__type: platform}` only; provider-specific
  fields (carousel mode, privacy level, collaborators, etc., documented in
  `ARCHITECTURE.md`) aren't wired up yet since there's no live integration
  to test them against.
- **The panel has no auth by default** (`PANEL_TOKEN` is opt-in) — fine
  for a private, single-operator deployment behind your own network
  controls, but worth setting before exposing the port publicly.

## NEXT 5 ACTIONS (yours)

1. Stand up Postiz from its own official docker-compose (see `SETUP.md`),
   connect at least LinkedIn and X (the platforms with the least review
   friction), and get a `POSTIZ_API_KEY`.
2. Get an `ANTHROPIC_API_KEY` and set `AI_PROVIDER=anthropic` — this is
   the single highest-leverage step for actual content quality; everything
   downstream already works against the mock provider's stand-in text.
3. Read through `knowledge/product-features.md` and
   `knowledge/forbidden-claims.md` and replace the placeholder feature
   table with your real, current feature/beta/planned status — the agent
   will only ever claim what's written there.
4. Run `npm run dry-run:week` again with real credentials, read the
   output in `artifacts/sample-week/`, and sanity-check it in your own
   voice before ever setting `DRY_RUN=false`.
5. Start Facebook/Instagram/TikTok's app-review processes now
   (`SOCIAL_SETUP.md`) — they're the long pole (days to weeks) and gate
   nothing else in this system while they're pending.
