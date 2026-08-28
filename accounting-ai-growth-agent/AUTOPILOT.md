# Autopilot Modes

Controlled by `AUTOPILOT_MODE` in `.env` (`OFF` / `DRAFT` / `FULL_AUTO`,
default `DRAFT`) and the independent runtime kill switch (`PAUSE` /
`RESUME` — see below).

## OFF

- Cron loop does not start (`src/cron/loop.ts`).
- `POST /agent/*` endpoints still work if called manually, but topic
  planning short-circuits to a no-op wherever it would otherwise create
  content (`isPaused`/`AUTOPILOT_MODE` checks in `pipeline/orchestrator.ts`).
- Nothing is generated, nothing is sent to Postiz.

## DRAFT (default after install)

- Research runs on schedule (every `RESEARCH_INTERVAL_HOURS`).
- Topics are planned, verified, briefed, written, media-generated, and
  safety-checked automatically.
- Every `ContentDraft` gets a `PENDING` `Approval` row. It will **not** be
  scheduled or sent to Postiz until you call `POST /drafts/:id/approve`
  (or click APPROVE in the panel).
- `POST /drafts/:id/reject` marks it rejected instead; it is never sent.

## FULL_AUTO

- Same pipeline as DRAFT, but drafts whose Safety Gate verdict is exactly
  `ALLOW` are scheduled and sent to Postiz (or logged as `WOULD_PUBLISH`
  under `DRY_RUN=true`) without waiting for a human.
- `ALLOW_WITH_CAUTION`, `REQUIRE_APPROVAL`, and `BLOCK` verdicts are never
  auto-published, even in `FULL_AUTO` — see `CONTENT_POLICY.md`. In
  practice this means FULL_AUTO mode still accumulates an approval queue
  for anything the Safety Gate isn't fully confident about.

## The kill switch (independent of AUTOPILOT_MODE)

`POST /autopilot/pause` sets a persisted flag checked at the top of every
content-generating and publish-triggering pipeline stage
(`src/pipeline/pauseState.ts`). While paused:

- No new topics are planned, no new drafts generated.
- Nothing new is sent to Postiz.
- Already-scheduled posts already accepted by Postiz are **not** cancelled
  — Postiz owns final execution of anything already handed to it, by
  design (see `ARCHITECTURE.md`). Check `GET /scheduled` to see what's
  still queued there.

`POST /autopilot/resume` clears the flag. The panel's PAUSE/RESUME buttons
call these same endpoints.

## DRY_RUN

Independent of `AUTOPILOT_MODE`. When `DRY_RUN=true` (the default), the
pipeline runs all the way through scheduling — it builds the real Postiz
payload, "uploads" media (against the mock client if `POSTIZ_MOCK=true`,
or a dry-run stub id otherwise) — but the final publish call is replaced
with a `WOULD_PUBLISH` log line containing the full payload
(`src/pipeline/publishPipeline.ts`). Nothing is ever sent to Postiz while
`DRY_RUN=true`, regardless of `AUTOPILOT_MODE`.

Leave `DRY_RUN=true` for as long as you want to review what the system
*would* do before it does it for real.
